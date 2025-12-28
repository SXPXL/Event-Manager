from fastapi import APIRouter, Request, Depends, HTTPException, BackgroundTasks, Header
from sqlmodel import Session, select
from database import get_session
from services import payment_service
from models.payment import PaymentOrder
from models import User, Registration

router = APIRouter()

@router.post("/webhooks/cashfree")
async def cashfree_webhook(
    request: Request, 
    x_webhook_signature: str = Header(None),
    x_webhook_timestamp: str = Header(None),
    session: Session = Depends(get_session)
):
    """
    Public Endpoint for Cashfree to notify us.
    MUST be accessible via public URL (ngrok).
    """
    try:
        raw_body = await request.body()
        body_str = raw_body.decode("utf-8")
        
        # 1. Security: Verify Signature
        if not payment_service.verify_webhook_signature(x_webhook_timestamp, body_str, x_webhook_signature):
            print("Warning: Invalid Webhook Signature")
            raise HTTPException(403, "Invalid Signature")
            
        # 2. Parse Data
        payload = await request.json()
        
        # 3. Process (Idempotent)
        payment_service.process_webhook(session, payload)
        
        return {"status": "ok"}
        
    except Exception as e:
        # We catch everything so Cashfree doesn't keep retrying if it's a logic bug
        print(f"Webhook Error: {e}")
        return {"status": "error", "detail": str(e)}

@router.get("/payment/status/{order_id}")
def check_payment_status(order_id: str, session: Session = Depends(get_session)):
    """
    Frontend Polling Endpoint.
    Read-Only. Does NOT trigger payment gateway calls.
    """
    order = session.get(PaymentOrder, order_id)
    if not order:
        raise HTTPException(404, "Order not found")

    statement = select(Registration).where(Registration.order_id == order_id)
    registration = session.exec(statement).first()

    
    user_uid =  None

    if registration:
        # 3. Use the INTEGER user_id from the registration to find the User
        user = session.get(User, registration.user_id)
        if user:
            user_uid = user.uid
        
    return {
        "order_id": order.order_id,
        "status": order.status, # PAID, PENDING, FAILED
        "amount": order.amount,
        "uid": user_uid # Return User ID so frontend can redirect
    }