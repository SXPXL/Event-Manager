from sqlmodel import Session, select
from fastapi import HTTPException
from models import User, Event, Registration, Team, EventType, PaymentStatus
from schemas.event_schemas import BulkRegisterRequest
from utils.email import generate_uid, mock_send_team_email

def register_bulk_logic(req: BulkRegisterRequest, session: Session):
    # 1. Update Leader Status
    leader = session.exec(select(User).where(User.uid == req.leader_uid)).first()
    if not leader: raise HTTPException(404, detail="Leader not found")
    
    leader.payment_status = PaymentStatus.PAID
    session.add(leader)

    for item in req.items:
        event = session.get(Event, item.event_id)
        if not event: continue

        # Check Duplicate Leader
        existing = session.exec(select(Registration).where(Registration.user_id==leader.id, Registration.event_id==event.id)).first()
        if existing: continue 

        team_id = None
        
        # GROUP LOGIC
        if event.type == EventType.GROUP:
            new_team = Team(name=item.team_name or "Unnamed Team", leader_id=leader.id, event_id=event.id)
            session.add(new_team)
            session.commit()
            session.refresh(new_team)
            team_id = new_team.id
            
            for tm in item.teammates:    
                tm_user = session.exec(select(User).where(User.email == tm.email)).first()
                
                if not tm_user:
                    # --- NEW LOGIC: Create & Notify Immediately ---
                    shadow_uid = generate_uid()
                    tm_user = User(
                        uid=shadow_uid, 
                        email=tm.email, 
                        name=tm.name, 
                        is_shadow=True, # Still marked shadow until they log in (optional)
                        payment_status=PaymentStatus.PAID
                    )
                    session.add(tm_user)
                    session.commit()
                    session.refresh(tm_user)
                    
                    # SEND EMAIL NOW saying "Added by Leader"
                    mock_send_team_email(tm_user.email, tm_user.uid, tm_user.name, leader.name)
                    # ----------------------------------------------

                # Ensure Teammate is marked PAID globally
                if tm_user.payment_status != PaymentStatus.PAID:
                    tm_user.payment_status = PaymentStatus.PAID
                    session.add(tm_user)

                # Check Teammate Duplicate
                tm_existing = session.exec(select(Registration).where(Registration.user_id==tm_user.id, Registration.event_id==event.id)).first()
                if tm_existing: continue

                tm_reg = Registration(user_id=tm_user.id, event_id=event.id, team_id=team_id, payment_status=PaymentStatus.PAID)
                session.add(tm_reg)

        # Register Leader
        leader_reg = Registration(user_id=leader.id, event_id=event.id, team_id=team_id, payment_status=PaymentStatus.PAID)
        session.add(leader_reg)

    session.commit()
    return "Bulk Registration Successful"

def check_conflicts(req, session: Session):
    conflicts = []
    for email in req.emails:
        user = session.exec(select(User).where(User.email == email)).first()
        if user:
            existing = session.exec(select(Registration).where(Registration.user_id==user.id, Registration.event_id==req.event_id)).first()
            if existing: conflicts.append(email)
    return conflicts