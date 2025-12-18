from sqlmodel import Session, select
from fastapi import HTTPException
from models import Registration, User, PaymentStatus

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