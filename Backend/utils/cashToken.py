import uuid
from sqlmodel import Session, select
from fastapi import HTTPException
from models.payment import CashToken
def generate_cash_token_logic(amount: float, vol_id: int, session: Session):
    code = str(uuid.uuid4())[:5].upper()
    token = CashToken(token=code, amount=amount, created_by_id=vol_id)
    session.add(token)
    session.commit()
    return {"token": code, "amount": amount}

def verify_cash_token_logic(token_str: str, required_amount: float, session: Session):
    token = session.exec(select(CashToken).where(CashToken.token == token_str)).first()
    if not token: raise HTTPException(400, detail="Invalid Token")
    if token.is_used: raise HTTPException(400, detail="Token used")
    if token.amount < required_amount: raise HTTPException(400, detail="Insufficient Token Amount")
    
    token.is_used = True
    session.add(token)
    session.commit()
    return True