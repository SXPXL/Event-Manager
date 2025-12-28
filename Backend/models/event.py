from typing import Optional
from sqlmodel import SQLModel, Field
from .enums import EventType
from .enums import PaymentStatus as RegPaymentStatus

class Event(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    type: EventType
    fee: float
    max_team_size: int
    min_team_size: int = Field(default=2)

class Team(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    leader_id: int = Field(foreign_key="user.id")
    event_id: int = Field(foreign_key="event.id")

class Registration(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    event_id: int = Field(foreign_key="event.id")
    team_id: Optional[int] = Field(default=None, foreign_key="team.id")
    
    # Link to the Payment Order (New Field)
    order_id: Optional[str] = Field(default=None, foreign_key="payment_orders.order_id")
    
    payment_status: RegPaymentStatus = Field(default=RegPaymentStatus.PENDING)
    attended: bool = False