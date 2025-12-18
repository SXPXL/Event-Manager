from pydantic import BaseModel, EmailStr
from typing import Optional, List, Literal
from models.enums import EventType, PaymentStatus

# --- Display Schemas ---
class EventDisplay(BaseModel):
    id: int
    name: str
    type: EventType
    fee: float
    max_team_size: int
    # payment_status: PaymentStatus = PaymentStatus.UNPAID # (Optional: Add this if you want specific event status in UI)

class CheckUIDResponse(BaseModel):
    exists: bool
    user: Optional["UserDetails"] = None # Forward ref
    registered_events: List[EventDisplay] = [] 
    message: str

# --- Registration Inputs ---
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

# --- Bulk / Cart Schemas ---
class BulkItem(BaseModel):
    event_id: int
    team_name: Optional[str] = None
    teammates: List[TeammateInput] = []

class BulkRegisterRequest(BaseModel):
    leader_uid: str
    items: List[BulkItem]
    payment_mode: Literal['ONLINE', 'CASH']
    razorpay_payment_id: Optional[str] = None
    cash_token: Optional[str] = None

class TeamValidationRequest(BaseModel):
    event_id: int
    emails: List[str]
    leader_uid: str

# Need to update imports for forward refs
from .user_schemas import UserDetails
CheckUIDResponse.update_forward_refs()