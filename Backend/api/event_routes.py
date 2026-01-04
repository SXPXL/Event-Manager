from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List
from sqlmodel import Session, select, func
from database import get_session
from models import Event, User, Registration, PaymentStatus
from models.enums import EventType
from schemas.event_schemas import EventDisplay, BulkRegisterRequest, TeamValidationRequest
from services import event_service, payment_service
from utils.cashToken import verify_cash_token_logic
from dotenv import load_dotenv
import os
from api.dependencies import require_admin

load_dotenv()

FRONTEND_URL = os.getenv("FRONTEND_URL")

router = APIRouter()

@router.get("/events", response_model=List[EventDisplay])
def get_events(session: Session = Depends(get_session)):
    events = session.exec(select(Event)).all()
    results = []
    
    for event in events:
        reg_count = session.exec(
            select(func.count(Registration.id))
            .where(Registration.event_id == event.id)
        ).one()
        
        att_count = session.exec(
            select(func.count(Registration.id))
            .where(Registration.event_id == event.id)
            .where(Registration.attended == True)
        ).one()

        if event.type == EventType.SOLO:
            paid_count = session.exec(
                select(func.count(Registration.id))
                .where(Registration.event_id == event.id)
                .where(Registration.payment_status == PaymentStatus.PAID)
            ).one()
            revenue = paid_count * event.fee
            
        else: 
            paid_teams_count = session.exec(
                select(func.count(func.distinct(Registration.team_id)))
                .where(Registration.event_id == event.id)
                .where(Registration.payment_status == PaymentStatus.PAID)
            ).one()
            revenue = paid_teams_count * event.fee

        results.append(EventDisplay(
            id=event.id,
            name=event.name,
            type=event.type,
            fee=event.fee,
            max_team_size=event.max_team_size,
            min_team_size=event.min_team_size,
            description=event.description,
            date=event.date,
            start_time=event.start_time,
            end_time=event.end_time,
            total_registrations=reg_count,
            total_attended=att_count,
            revenue=revenue
        ))
    
    return results

@router.post("/events/validate-team", tags=["Events"])
def validate_team(req: TeamValidationRequest, session: Session = Depends(get_session)):
    leader = session.exec(select(User).where(User.uid == req.leader_uid)).first()
    if not leader: return {"valid": False, "detail": "Invalid Leader UID"}
    
    if leader.email in req.emails:
        return {"valid": False, "detail": "You cannot add yourself as a teammate."}

    conflicts = event_service.check_conflicts(req, session)
    if conflicts: return {"valid": False, "detail": f"Already registered: {', '.join(conflicts)}"}
    return {"valid": True, "detail": "All clear"}

@router.post("/events/register-bulk", tags=["Payment"])
def register_bulk(
    req: BulkRegisterRequest, 
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session)
):
    # ... (Keep existing validation logic) ...

    # 1. Calculate Fee & Collect IDs
    total_fee = 0
    event_ids = []
    for item in req.items:
        evt = session.get(Event, item.event_id)
        if evt: 
            total_fee += evt.fee
            event_ids.append(evt.id)

    # 2. Get Leader
    leader = session.exec(select(User).where(User.uid == req.leader_uid)).first()
    if not leader: raise HTTPException(404, detail="Leader not found")

    final_order_id = None
    payment_response = {}
    status_to_save = PaymentStatus.PENDING

    # 3. Handle Payment Modes
    if req.payment_mode == 'ONLINE':
        # --- NEW FLOW ---
        # Calls the secure payment service
        return_url = FRONTEND_URL+"/payment-status?order_id={order_id}"
        
        order_data = payment_service.create_order(
            session=session,
            user=leader,
            amount=total_fee,
            event_ids=event_ids,
            return_url=return_url
        )
        payment_response = order_data
        status_to_save = PaymentStatus.PENDING
        final_order_id = order_data["order_id"]
        
    elif req.payment_mode == 'CASH':
        # (Keep existing Cash Logic)
        verify_cash_token_logic(req.cash_token, total_fee, session)
        status_to_save = PaymentStatus.PAID
        final_order_id = f"CASH_{req.cash_token}"

    # 4. Register in DB (as PENDING)
    msg = event_service.register_bulk_logic(req, session, background_tasks, status_to_save,order_id=final_order_id)
    
    return {
        "status": "success", 
        "message": msg, 
        "payment_data": payment_response
    }
