from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime
from models.enums import PaymentStatus
from sqlalchemy.dialects.postgresql import JSON


class PaymentOrder(SQLModel, table=True):
    __tablename__ = "payment_orders"

    order_id: str = Field(primary_key=True, index=True) # Our internal ID (e.g., ORD_123)
    user_id: int = Field(index=True, foreign_key="user.id")
    
    amount: float
    currency: str = "INR"
    status: PaymentStatus = Field(default=PaymentStatus.CREATED)
    
    # Store IDs of events included in this order so we know what to unlock
    event_ids_json: str = Field(default="[]") # stored as JSON string "[1, 2]"
    
    payment_session_id: Optional[str] = None
    gateway_reference_id: Optional[str] = None # Cashfree's CFPaymentID
    gateway_response: Optional[str] = Field(default=None, sa_type=JSON) # Raw log
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class CashToken(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    token: str = Field(index=True, unique=True)
    amount: float
    created_by_id: int 
    is_used: bool = Field(default=False)
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())