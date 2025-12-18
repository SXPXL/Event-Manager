from fastapi import APIRouter, Depends
from sqlmodel import Session
from database import get_session
from schemas.staff_schemas import TokenRequest, MarkAttendanceRequest, MarkPaymentRequest
from services import payment_service, staff_service

router = APIRouter()

@router.post("/staff/generate-token", tags=["Cashier"])
def generate_token(req: TokenRequest, session: Session = Depends(get_session)):
    code = payment_service.generate_cash_token_logic(req.amount, req.volunteer_id, session)
    return {"token": code, "amount": req.amount}

@router.post("/staff/mark-attendance", tags=["Guard"])
def mark_attendance(req: MarkAttendanceRequest, session: Session = Depends(get_session)):
    msg, name = staff_service.mark_attendance_logic(req.user_uid, req.event_id, session)
    return {"message": msg, "user_name": name}

# Mark Paid (Optional, if you still want manual payment)
# @router.post("/staff/mark-paid") ...