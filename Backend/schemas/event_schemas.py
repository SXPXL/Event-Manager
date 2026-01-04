from pydantic import BaseModel, EmailStr
from typing import Optional, List, Literal
from models.enums import EventType
import datetime

# --- Display Schemas ---
class EventDisplay(BaseModel):
    id: int
    name: str
    type: EventType
    fee: float
    max_team_size: int
    min_team_size: int = 2
    total_registrations: int = 0
    total_attended: int = 0
    revenue: float = 0.0
    payment_status: Optional[str] = "PENDING"
    team_name: Optional[str] = None
    is_leader: bool = False
    description: Optional[str] = None
    date: Optional[datetime.date] = None
    start_time: Optional[datetime.time] = None
    end_time: Optional[datetime.time] = None

# ... [Keep the rest of the file exactly as it was] ...
class CheckUIDResponse(BaseModel):
    exists: bool
    user: Optional["UserDetails"] = None 
    registered_events: List[EventDisplay] = [] 
    message: str

class TeammateInput(BaseModel):
    name: str
    email: EmailStr

class EventRegistrationRequest(BaseModel):
    leader_uid: str
    event_id: int
    team_name: Optional[str] = None
    teammates: List[TeammateInput] = [] 

class EventRegistrationResponse(BaseModel):
    registration_id: int
    amount_due: float
    message: str

class EventCreate(BaseModel):
    name: str
    type: EventType
    fee: float
    max_team_size: int
    min_team_size: int = 2
    description: Optional[str] = None
    date: Optional[datetime.date] = None
    start_time: Optional[datetime.time] = None
    end_time: Optional[datetime.time] = None

class BulkItem(BaseModel):
    event_id: int
    team_name: Optional[str] = None
    teammates: List[TeammateInput] = []

class BulkRegisterRequest(BaseModel):
    leader_uid: str
    items: List[BulkItem]
    payment_mode: Literal['ONLINE', 'CASH']
    order_id: Optional[str] = None
    cash_token: Optional[str] = None

class TeamValidationRequest(BaseModel):
    event_id: int
    emails: List[str]
    leader_uid: str

class WalkInRequest(BaseModel):
    name: str
    email: str
    phone: str
    college: str
    event_ids: List[int]
    volunteer_id: int

from .user_schemas import UserDetails
CheckUIDResponse.update_forward_refs()