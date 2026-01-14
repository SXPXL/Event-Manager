import uuid
import json
from sqlmodel import Session, select
from fastapi import HTTPException
from models.payment import CashToken, PaymentOrder, PaymentStatus

def generate_cash_token_logic(amount: float, vol_id: int, session: Session):
    code = str(uuid.uuid4())[:5].upper()
    # Ensure no collision (optional but good practice for short codes)
    while session.exec(select(CashToken).where(CashToken.token == code)).first():
        code = str(uuid.uuid4())[:5].upper()

    token = CashToken(token=code, amount=amount, created_by_id=vol_id)
    session.add(token)
    session.commit()
    return {"token": code, "amount": amount}

def verify_cash_token_logic(
    token_str: str, 
    required_amount: float, 
    user_id: int,           # 👈 Added: Needed to create the PaymentOrder
    event_ids: list[int],   # 👈 Added: To track what was paid for
    session: Session
):
    # 1. Find Token
    token = session.exec(select(CashToken).where(CashToken.token == token_str)).first()
    
    if not token: 
        raise HTTPException(400, detail="Invalid Token")
    if token.is_used: 
        raise HTTPException(400, detail="Token already used")
    if token.amount != required_amount: 
        raise HTTPException(400, detail="Token amount does not match total fee")
    
    # 2. Mark Token as Used
    token.is_used = True
    session.add(token)

    # 3. Create the PaymentOrder (FIXES THE ERROR)
    # We must create this record so the Registrations have a valid 'order_id' to point to.
    cash_order = PaymentOrder(
        order_id=token_str,             # The Cash Token becomes the Order ID
        user_id=user_id,
        amount=required_amount,
        status=PaymentStatus.PAID,      # Cash is instantly successful
        event_ids_json=json.dumps(event_ids),
        payment_session_id="CASH_VERIFIED", # Placeholder for the system
        gateway_reference_id=f"TOKEN_{token.id}" 
    )
    session.add(cash_order)

    # 4. Commit Both (Token Update + New Order)
    session.commit()
    
    return True