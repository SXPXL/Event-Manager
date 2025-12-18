from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlmodel import Session, select
from database import get_session
from models import Event, User
from schemas.event_schemas import EventDisplay, BulkRegisterRequest, TeamValidationRequest
from services import event_service, payment_service

router = APIRouter()

@router.get("/events", response_model=List[EventDisplay])
def get_events(session: Session = Depends(get_session)):
    return session.exec(select(Event)).all()

@router.post("/events/validate-team", tags=["Events"])
def validate_team(req: TeamValidationRequest, session: Session = Depends(get_session)):
    # 1. Fetch Leader to check for Self-Add
    leader = session.exec(select(User).where(User.uid == req.leader_uid)).first()
    
    if not leader:
        # Should not happen if frontend is working right, but good safety
        return {"valid": False, "detail": "Invalid Leader UID"}

    # --- FIX: Check if leader added themselves ---
    if leader.email in req.emails:
        return {
            "valid": False, 
            "detail": "You cannot add yourself as a teammate."
        }

    # 2. Check for Database Conflicts (Existing Logic)
    # We pass the request to your service helper as before
    conflicts = event_service.check_conflicts(req, session)
    
    if conflicts:
        return {"valid": False, "detail": f"Already registered: {', '.join(conflicts)}"}
        
    return {"valid": True, "detail": "All clear"}

@router.post("/events/register-bulk", tags=["Payment"])
def register_bulk(req: BulkRegisterRequest, session: Session = Depends(get_session)):
    # 1. Calculate Total
    total_fee = 0
    for item in req.items:
        evt = session.get(Event, item.event_id)
        if evt: total_fee += evt.fee

    # 2. Verify Payment
    if req.payment_mode == 'ONLINE':
        if not req.razorpay_payment_id:
             raise HTTPException(400, detail="Missing Payment ID")
        print(f"ONLINE PAYMENT MOCKED: {req.razorpay_payment_id}")
            
    elif req.payment_mode == 'CASH':
        payment_service.verify_cash_token_logic(req.cash_token, total_fee, session)
    
    # 3. Register
    msg = event_service.register_bulk_logic(req, session)
    return {"status": "success", "message": msg}