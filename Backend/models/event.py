from typing import Optional
from sqlmodel import SQLModel, Field
from .enums import EventType
from .enums import PaymentStatus

class Event(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    type: EventType
    fee: float
    max_team_size: int

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
    attended: bool = Field(default=False)
    # Ideally we add payment_status here too, but for now we follow your current schema
    # If you want to add it later, add: payment_status: PaymentStatus = Field(...)
    payment_status: PaymentStatus = Field(default=PaymentStatus.UNPAID)