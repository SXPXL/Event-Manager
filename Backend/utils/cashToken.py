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

def validate_cash_token(token_str: str, required_amount: float, session: Session):
    """
    Checks if token exists, is unused, and has correct amount.
    Does NOT modify the database.
    """
    token = session.exec(select(CashToken).where(CashToken.token == token_str)).first()
    
    if not token: 
        raise HTTPException(400, detail="Invalid Cash Token")
    if token.is_used: 
        raise HTTPException(400, detail="Token has already been used")
    if token.amount != required_amount: 
        raise HTTPException(400, detail=f"Token value (₹{token.amount}) does not match Total Fee (₹{required_amount})")
    
    return token

# ✅ NEW FUNCTION: Call this BEFORE registration logic
def create_cash_order(
    token_str: str, 
    amount: float, 
    user_id: int, 
    event_ids: list[int], 
    session: Session
):
    """
    Creates the PaymentOrder so Foreign Keys don't fail during registration.
    Safe to call multiple times (checks if exists first).
    """
    # Check if order already exists (from a previous failed attempt)
    existing_order = session.get(PaymentOrder, token_str)
    if existing_order:
        return # Order already exists, we can proceed to use it

    # Create new order if not exists
    token = session.exec(select(CashToken).where(CashToken.token == token_str)).first()
    
    cash_order = PaymentOrder(
        order_id=token_str,              
        user_id=user_id,
        amount=amount,
        status=PaymentStatus.PAID,       
        event_ids_json=json.dumps(event_ids),
        payment_session_id="CASH_VERIFIED",
        gateway_reference_id=f"TOKEN_{token.id}" 
    )
    session.add(cash_order)
    session.commit()

# ✅ UPDATED: Call this AFTER registration success
def consume_cash_token(token_str: str, session: Session):
    """
    Marks token as used.
    Now simplified because the Order is created in the previous step.
    """
    token = session.exec(select(CashToken).where(CashToken.token == token_str)).first()
    
    if token:
        token.is_used = True
        session.add(token)
        session.commit()
    
    return True