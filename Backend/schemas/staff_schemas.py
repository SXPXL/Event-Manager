from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from models.enums import VolunteerRole

class VolunteerCreate(BaseModel):
    username: str
    password: str
    role: VolunteerRole
    assigned_event_id: Optional[int] = None

class MarkPaymentRequest(BaseModel):
    user_uid: str
    amount_collected: float 

class MarkAttendanceRequest(BaseModel):
    user_uid: str
    event_id: int
    
class AdminLoginRequest(BaseModel):
    username: str
    password: str

class AdminLoginResponse(BaseModel):
    success: bool
    message: str
    role: str
    access_token: str       # <--- Matches your route return
    token_type: str         # <--- Matches your route return
    user: Dict[str, Any]

class TokenRequest(BaseModel):
    amount: float
    volunteer_id: int

class WalkInMemberInput(BaseModel):
    name: str
    email: EmailStr

class WalkInBulkRequest(BaseModel):
    # Leader / Solo Details
    name: str
    email: EmailStr
    phone: str
    college: str
    
    # Event & Staff Info
    event_id: int
    volunteer_id: int
    
    # Optional Teammates (Only Name + Email)
    members: List[WalkInMemberInput] = []