from sqlmodel import Session, select
from sqlalchemy import func
from fastapi import HTTPException, BackgroundTasks 
from models import User, Event, Registration, Team, EventType, PaymentStatus
from schemas.event_schemas import BulkRegisterRequest
from utils.email import generate_uid, send_email_background

# 1. ADD 'initial_status' ARGUMENT
def register_bulk_logic(req: BulkRegisterRequest, session: Session, background_tasks: BackgroundTasks, initial_status: PaymentStatus,order_id: str = None):
    
    leader = session.exec(select(User).where(User.uid == req.leader_uid)).first()
    if not leader: raise HTTPException(404, detail="Leader not found")
    
    if initial_status == PaymentStatus.PAID:
        leader.payment_status = PaymentStatus.PAID
        session.add(leader)

    for item in req.items:
        event = session.get(Event, item.event_id)
        if not event: continue

        for tm in item.teammates:    
                if tm.email.strip().lower() == leader.email.strip().lower():
                    raise HTTPException(
                status_code=400, 
                detail=f"Error in Event '{event.name}': The Team Leader ({leader.email}) cannot be added as a teammate. You are already included automatically."
            )

        # --- VALIDATION ---
        total_participants = 1 + len(item.teammates)
        if event.type == EventType.GROUP:
            if total_participants < event.min_team_size:
                raise HTTPException(400, detail=f"Event '{event.name}' requires a minimum of {event.min_team_size} participants.")
            if total_participants > event.max_team_size:
                raise HTTPException(400, detail=f"Event '{event.name}' allows a maximum of {event.max_team_size} participants.")
        elif len(item.teammates) > 0:
            raise HTTPException(400, detail=f"Event '{event.name}' is a SOLO event. Cannot add teammates.")

        # --- DUPLICATE CHECK (UPDATED) ---
        existing = session.exec(select(Registration).where(Registration.user_id==leader.id, Registration.event_id==event.id)).first()
        if existing: 
            if existing.payment_status == PaymentStatus.PAID:
                continue # Already paid, skip this item
            else:
                # Previous attempt failed/pending. Delete it to allow retry.
                session.delete(existing)
                session.commit()

        team_id = None
        
        # GROUP LOGIC
        if event.type == EventType.GROUP:
            count_stmt = select(func.count(Team.id)).where(Team.event_id == event.id)
            team_count = session.exec(count_stmt).one() or 0
            generated_name = f"Team #{team_count + 1}"

            new_team = Team(name=generated_name, leader_id=leader.id, event_id=event.id)
            session.add(new_team)
            session.commit()
            session.refresh(new_team)
            team_id = new_team.id
            
            for tm in item.teammates:    

                tm_user = session.exec(select(User).where(User.email == tm.email)).first()
                if not tm_user:
                    # Create Shadow User
                    shadow_uid = generate_uid()
                    tm_user = User(
                        uid=shadow_uid, email=tm.email, name=tm.name, 
                        is_shadow=True, payment_status=initial_status 
                    )
                    session.add(tm_user)
                    session.commit()
                    session.refresh(tm_user)
                    
                    background_tasks.add_task(send_email_background, to_email=tm_user.email, name=tm_user.name, uid=tm_user.uid, is_shadow_notification=True, leader_name=leader.name)

                if initial_status == PaymentStatus.PAID and tm_user.payment_status != PaymentStatus.PAID:
                    tm_user.payment_status = PaymentStatus.PAID
                    session.add(tm_user)

                # --- TEAMMATE DUPLICATE CHECK (UPDATED) ---
                tm_existing = session.exec(select(Registration).where(Registration.user_id==tm_user.id, Registration.event_id==event.id)).first()
                if tm_existing: 
                    if tm_existing.payment_status == PaymentStatus.PAID:
                        continue
                    else:
                        # Delete failed teammate registration to re-add to new team
                        session.delete(tm_existing)
                        session.commit()

                tm_reg = Registration(user_id=tm_user.id, event_id=event.id, team_id=team_id, payment_status=initial_status,order_id=order_id)
                session.add(tm_reg)

        # Register Leader
        leader_reg = Registration(user_id=leader.id, event_id=event.id, team_id=team_id, payment_status=initial_status,order_id=order_id)
        session.add(leader_reg)

    session.commit()
    return "Registration Initiated"
def check_conflicts(req, session: Session):
    conflicts = []
    for email in req.emails:
        user = session.exec(select(User).where(User.email == email)).first()
        if user:
            existing = session.exec(select(Registration).where(Registration.user_id==user.id, Registration.event_id==req.event_id)).first()
            if existing: conflicts.append(email)
    return conflicts