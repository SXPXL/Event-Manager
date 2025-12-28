from typing import Optional
from sqlmodel import SQLModel, Field
from .enums import PaymentStatus, VolunteerRole

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    uid: str = Field(index=True, unique=True)
    email: str = Field(unique=True, index=True)
    name: str 
    phone: Optional[str] = None
    college: Optional[str] = None
    is_shadow: bool = Field(default=False)
    payment_status: PaymentStatus = Field(default=PaymentStatus.PENDING)

class Volunteer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    password: str 
    role: VolunteerRole
    assigned_event_id: Optional[int] = Field(default=None, foreign_key="event.id")