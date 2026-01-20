from sqlmodel import Session, select, col
from sqlalchemy import func
from fastapi import HTTPException
from models import Registration, User, PaymentStatus, Team, Event, CashToken, Volunteer
from schemas import WalkInBulkRequest
from utils.cashToken import generate_cash_token_logic
from models import EventType
from models.payment import PaymentOrder

def mark_attendance_logic(user_uid: str, event_id: int, session: Session):
    statement = select(Registration).join(User).where(User.uid == user_uid).where(Registration.event_id == event_id)
    reg = session.exec(statement).first()

    if not reg: raise HTTPException(404, detail="Not registered for this event.")
    if reg.payment_status != PaymentStatus.PAID: raise HTTPException(400, detail="ACCESS DENIED: Payment Pending")
    
    if reg.attended: return "Already checked in", None

    reg.attended = True
    session.add(reg)
    session.commit()
    
    # Get user name for display
    user = session.exec(select(User).where(User.uid == user_uid)).first()
    return "ACCESS GRANTED", user.name

def search_users_logic(query: str, session: Session):
    """
    The Detective Lens: Finds users by Name, Email, or UID.
    Case-insensitive search.
    """
    q = query.strip().lower()
    search_pattern = f"%{q}%"
    
    # Search logic: (Name contains Q) OR (Email contains Q) OR (UID contains Q)
    statement = select(User).where(
        (col(User.name).ilike(search_pattern)) | 
        (col(User.email).ilike(search_pattern)) | 
        (col(User.uid).ilike(search_pattern))
    )
    
    results = session.exec(statement).all()
    return results

def get_user_full_profile(uid: str, session: Session):
    """
    The Dossier: Fetches User + All Events + Team Details + Payment Status
    """
    # 1. Find User
    user = session.exec(select(User).where(User.uid == uid)).first()
    if not user:
        return None

    # 2. Find All Registrations for this user
    regs = session.exec(select(Registration).where(Registration.user_id == user.id)).all()
    
    events_data = []
    
    # 3. Compile the Dossier
    for reg in regs:
        event = session.get(Event, reg.event_id)
        if not event: continue

        team_info = None
        is_leader = False
        
        # Check Team Details if applicable
        if reg.team_id:
            team = session.get(Team, reg.team_id)
            if team:
                leader = session.get(User, team.leader_id)
                is_leader = (team.leader_id == user.id)
                team_info = {
                    "name": team.name,
                    "leader_name": leader.name if leader else "Unknown",
                    "is_user_leader": is_leader
                }
        
        events_data.append({
            "event_name": event.name,
            "event_type": event.type,
            "fee": event.fee,
            "attended": reg.attended,
            "payment_status": reg.payment_status, # "PAID" or "UNPAID"
            "team": team_info
        })
        
    # 4. Return the structured data
    return {
        "user": user,
        "events": events_data
    }

def walk_in_bulk_registration_logic(req: WalkInBulkRequest, session: Session):
    """
    Handles Solo OR Group Walk-in.
    - Auto-generates Team Name (Team #X).
    - Inherits College for members.
    - One Cash Token for Total Amount.
    """
    
    # 1. Fetch Event
    event = session.get(Event, req.event_id)
    if not event: raise HTTPException(404, "Event not found")


     #already registered check for leader
    existing_user = session.exec(select(User).where(User.email == req.email)).first()
    if existing_user:
        existing_reg = session.exec(
            select(Registration)
            .where(
                Registration.user_id == existing_user.id,
                Registration.event_id == event.id
            )
        ).first()
        if existing_reg:
            raise HTTPException(
                status_code=400,
                detail=f"User with email '{req.email}' is already registered for this event."
            )

            #Already registered check for members
    for mem in req.members:
        member_user = session.exec(select(User).where(User.email == mem.email)).first()
        if member_user:
            duplicate_mem_reg = session.exec(
                select(Registration)
                .where(
                    Registration.user_id == member_user.id,
                    Registration.event_id == event.id
                )
            ).first()
            if duplicate_mem_reg:
                raise HTTPException(
                    status_code=400,
                    detail=f"Group member with email '{mem.email}' is already registered for this event."
                )        

    # 2. Process Leader (Full Details)
    leader = session.exec(select(User).where(User.email == req.email)).first()
    if not leader:
        # Register new Leader
        leader = User(
            uid=None, # Will be generated by DB/Service default if logic exists, or use generate_uid() import
            name=req.name, email=req.email, phone=req.phone, 
            college=req.college, is_shadow=False, payment_status=PaymentStatus.PAID
        )
        # Note: If you rely on auth_service to generate UID, verify User model defaults. 
        # Assuming we create manually here similar to your event_service logic:
        from utils.email import generate_uid
        leader.uid = generate_uid()
        session.add(leader)
        session.commit()
        session.refresh(leader)
    else:
        # Update details if missing
        if not leader.phone: leader.phone = req.phone
        if not leader.college: leader.college = req.college
        leader.payment_status = PaymentStatus.PAID
        session.add(leader)

    all_participants = [{"user": leader, "role": "Leader"}]
    team_obj = None

    # 3. Handle Group Logic
    is_group = (len(req.members) > 0) or (event.type == EventType.GROUP)
    
    if is_group:
        total_participants = 1 + len(req.members) # Leader + Members
        
        # --- START CHANGES: CONFIRMED VALIDATION LOGIC ---
        if event.type == EventType.GROUP:
             if total_participants < event.min_team_size:
                 raise HTTPException(400, f"This event requires a minimum of {event.min_team_size} participants (You have {total_participants}).")
             if total_participants > event.max_team_size:
                 raise HTTPException(400, f"Max team size is {event.max_team_size}. You provided {total_participants}.")
        
        if event.type != EventType.GROUP and len(req.members) > 0:
             raise HTTPException(400, "Cannot add members to a SOLO event.")

        # A. Auto-Generate Team Name
        # Count existing teams for this event to generate "Team #5"
        count_stmt = select(func.count(Team.id)).where(Team.event_id == event.id)
        team_count = session.exec(count_stmt).one() or 0
        team_name_gen = f"Team #{team_count + 1}"

        # B. Create Team
        team_obj = Team(name=team_name_gen, leader_id=leader.id, event_id=event.id)
        session.add(team_obj)
        session.commit()
        session.refresh(team_obj)

        # C. Process Members
        from utils.email import generate_uid # Ensure import
        
        for mem in req.members:
            # Check if user exists
            m_user = session.exec(select(User).where(User.email == mem.email)).first()
            if not m_user:
                m_user = User(
                    uid=generate_uid(),
                    name=mem.name,
                    email=mem.email,
                    phone="Pending",       # Placeholder
                    college=leader.college, # Inherit Leader's College
                    is_shadow=True,
                    payment_status=PaymentStatus.PAID
                )
                session.add(m_user)
                session.commit()
                session.refresh(m_user)
            else:
                m_user.payment_status = PaymentStatus.PAID
                session.add(m_user)
            
            all_participants.append({"user": m_user, "role": "Member"})

    # 4. Financials (One Token for All)
    total_fee = event.fee 
    
    # generate_cash_token_logic returns a DICT: {'token': '...', 'amount': ...}
    token_data = generate_cash_token_logic(total_fee, req.volunteer_id, session)
    
    # FIX: Extract just the token string for the DB query
    token_str = token_data['token'] 
    
    # Query using the string, NOT the dictionary
    token = session.exec(select(CashToken).where(CashToken.token == token_str)).first()
    
    if token:
        token.is_used = True
        session.add(token)

    # 5. Create Registrations
    success_list = []
    
    for p in all_participants:
        usr = p["user"]
        # Check duplicate
        existing = session.exec(select(Registration).where(
            Registration.user_id == usr.id, Registration.event_id == event.id
        )).first()

        if not existing:
            new_reg = Registration(
                user_id=usr.id,
                event_id=event.id,
                team_id=team_obj.id if team_obj else None,
                payment_status=PaymentStatus.PAID,
                attended=False
            )
            session.add(new_reg)
        
        success_list.append({
            "name": usr.name,
            "uid": usr.uid,
            "role": p["role"]
        })

    session.commit()

    return {
        "event": event.name,
        "team": team_obj.name if team_obj else "Solo",
        "total_paid": total_fee,
        "participants": success_list
    }

def delete_volunteer_logic(vol_id: int, session: Session):
    """
    Deletes a volunteer/staff member.
    PREVENTS deleting the Root Admin (ID 1).
    """
    # 1. SAFETY LOCK: Cannot delete the Root Admin
    if vol_id == 1:
        raise HTTPException(400, "Cannot delete the Root Admin (ID 1).")

    # 2. Find Volunteer
    vol = session.get(Volunteer, vol_id)
    if not vol:
        raise HTTPException(404, "Volunteer not found")

    # 3. Delete
    session.delete(vol)
    session.commit()
    return f"Staff member '{vol.username}' deleted."
def delete_user_logic(uid: str, session: Session):
    """
    Deletes a user and cascades the deletion to their data:
    1. Deletes their Registrations.
    2. Deletes Teams they lead.
    3. Deletes Payment Orders (CRITICAL FIX).
    4. Deletes the User record.
    """
    # 1. Find User
    user = session.exec(select(User).where(User.uid == uid)).first()
    if not user:
        raise HTTPException(404, "User not found")

    # 2. CASCADE DELETE: Registrations
    registrations = session.exec(select(Registration).where(Registration.user_id == user.id)).all()
    for reg in registrations:
        session.delete(reg)
    
    # 3. CASCADE DELETE: Teams (Led by this user)
    teams_leading = session.exec(select(Team).where(Team.leader_id == user.id)).all()
    for team in teams_leading:
        session.delete(team)

    # ---------------------------------------------------------
    # ✅ NEW STEP: DELETE PAYMENT ORDERS
    # ---------------------------------------------------------
    payment_orders = session.exec(select(PaymentOrder).where(PaymentOrder.user_id == user.id)).all()
    for order in payment_orders:
        session.delete(order)
    # ---------------------------------------------------------

    # 5. Delete User
    session.delete(user)
    session.commit()
    
    return f"User {user.name} ({uid}) and all associated data deleted."