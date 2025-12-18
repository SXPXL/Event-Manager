from pydantic import BaseModel
from typing import Optional
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
    role: str
    message: str

class TokenRequest(BaseModel):
    amount: float
    volunteer_id: int