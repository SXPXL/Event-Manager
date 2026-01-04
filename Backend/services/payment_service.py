import hmac
import hashlib
import base64
import json
import logging
import os
import requests
import uuid
from datetime import datetime
from sqlmodel import Session, select
from fastapi import HTTPException
from dotenv import load_dotenv

from models.payment import PaymentOrder, PaymentStatus
from models.event import Registration
from models.enums import PaymentStatus as RegStatus
from models.user import User

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("PaymentService")

load_dotenv()

# CONFIGURATION

CASHFREE_ENV = os.getenv("CASHFREE_ENV", "SANDBOX") # SANDBOX or PRODUCTION

if CASHFREE_ENV == "PRODUCTION":
    CASHFREE_APP_ID = os.getenv("CASHFREE_APP_ID_PROD")
    CASHFREE_SECRET_KEY = os.getenv("CASHFREE_SECRET_KEY_PROD")
    BASE_URL = "https://api.cashfree.com/pg"
else:
    CASHFREE_APP_ID = os.getenv("CASHFREE_APP_ID_TEST")
    CASHFREE_SECRET_KEY = os.getenv("CASHFREE_SECRET_KEY_TEST")
    BASE_URL = "https://sandbox.cashfree.com/pg"

HEADERS = {
    "x-client-id": CASHFREE_APP_ID,
    "x-client-secret": CASHFREE_SECRET_KEY,
    "x-api-version": "2023-08-01",
    "Content-Type": "application/json"
}

def create_order(session: Session, user: User, amount: float, event_ids: list[int], return_url: str):
    """
    1. Creates PaymentOrder in DB (PENDING)
    2. Calls Cashfree API
    3. Updates PaymentOrder with session_id
    """
    try:
        # 1. Generate Order ID
        order_id = f"ORD_{uuid.uuid4().hex[:12]}"
        
        # 2. Save Initial State to DB (The "Pre-Commit")
        # We save BEFORE calling the gateway to ensure audit trail
        new_order = PaymentOrder(
            order_id=order_id,
            user_id=user.id,
            amount=amount,
            status=PaymentStatus.PENDING,
            event_ids_json=json.dumps(event_ids)
        )
        session.add(new_order)
        session.commit()
        session.refresh(new_order)

        # 3. Call Cashfree
        payload = {
            "order_amount": amount,
            "order_currency": "INR",
            "order_id": order_id,
            "customer_details": {
                "customer_id": user.uid,
                "customer_name": user.name,
                "customer_email": user.email,
                "customer_phone": user.phone or "9999999999"
            },
            "order_meta": {
                "return_url": return_url,
                "notify_url": os.getenv("WEBHOOK_URL") # Critical for callbacks
            },
            "order_tags": {
                "event_ids": str(event_ids) # Helpful for debugging on dashboard
            }
        }

        response = requests.post(
            f"{BASE_URL}/orders", 
            json=payload, 
            headers=HEADERS, 
            timeout=10 # Security timeout
        )
        data = response.json()

        if response.status_code in [200, 201]:
            # 4. Update DB with Session ID
            new_order.payment_session_id = data.get("payment_session_id")
            session.add(new_order)
            session.commit()
            
            logger.info(f"Order Created: {order_id} for User: {user.uid}")
            return {
                "payment_session_id": new_order.payment_session_id,
                "order_id": order_id
            }
        else:
            logger.error(f"Cashfree Creation Failed: {data}")
            new_order.status = PaymentStatus.FAILED
            session.add(new_order)
            session.commit()
            raise HTTPException(status_code=502, detail="Payment Gateway Error")

    except Exception as e:
        logger.error(f"Create Order Exception: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Payment Error")

def verify_webhook_signature(timestamp: str, raw_body: str, signature: str) -> bool:
    """
    Verifies that the webhook actually came from Cashfree.
    """
    payload = timestamp + raw_body
    generated_signature = base64.b64encode(
        hmac.new(
            CASHFREE_SECRET_KEY.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).digest()
    ).decode('utf-8')
    
    return generated_signature == signature

def process_webhook(session: Session, payload: dict):
    """
    Idempotent Webhook Handler.
    Updates PaymentOrder -> Updates Registrations.
    """
    data = payload.get("data", {})
    order_data = data.get("order", {})
    payment_data = data.get("payment", {})
    
    order_id = order_data.get("order_id")
    cf_payment_id = payment_data.get("cf_payment_id")
    payment_status = payment_data.get("payment_status") # SUCCESS, FAILED, USER_DROPPED
    
    logger.info(f"Webhook Received for {order_id}: {payment_status}")

    # 1. Fetch Order
    order = session.get(PaymentOrder, order_id)
    if not order:
        logger.error(f"Order {order_id} not found in DB")
        return # Do not raise error, or Cashfree will retry indefinitely
    
    # 2. Idempotency Check (If already PAID, ignore)
    if order.status == PaymentStatus.PAID:
        logger.info(f"Order {order_id} already processed. Skipping.")
        return

    # 3. Map Status
    # Cashfree Webhook Statuses: SUCCESS, FAILED, USER_DROPPED, CANCELLED
    if payment_status == "SUCCESS":
        new_status = PaymentStatus.PAID
    elif payment_status == "FAILED":
        new_status = PaymentStatus.FAILED
    elif payment_status == "USER_DROPPED":
        new_status = PaymentStatus.CANCELLED
    else:
        new_status = PaymentStatus.PENDING

    # 4. Update Order
    order.status = new_status
    order.gateway_reference_id = str(cf_payment_id)
    order.gateway_response = json.dumps(payload) # Audit Log
    order.updated_at = datetime.utcnow()
    session.add(order)
    
    # 5. Trigger Business Logic (Unlock Registrations)
    if new_status == PaymentStatus.PAID:
        _unlock_registrations(session, order)

    session.commit()
    logger.info(f"Order {order_id} updated to {new_status}")

def _unlock_registrations(session: Session, order: PaymentOrder):
    """
    Updates ALL registrations linked to this order_id to PAID.
    This fixes the issue where teammates remained PENDING.
    """
    try:
        # MNC-Quality Logic:
        # We ignore user_id here. Anyone holding this order_id ticket gets unlocked.
        statement = (
            select(Registration)
            .where(Registration.order_id == order.order_id)
        )
        
        registrations = session.exec(statement).all()
        
        if not registrations:
            logger.warning(f"No registrations found for Paid Order {order.order_id}")
            return

        for reg in registrations:
            reg.payment_status = RegStatus.PAID
            session.add(reg)
            logger.info(f"Unlocked Event {reg.event_id} for User {reg.user_id} (Team Member)")
            
        session.commit()
            
    except Exception as e:
        logger.error(f"Error unlocking registrations for {order.order_id}: {e}")