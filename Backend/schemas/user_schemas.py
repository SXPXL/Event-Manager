from pydantic import BaseModel, EmailStr
from typing import Optional, List
# Note: We import EventDisplay as a string forward reference if needed, 
# or just keep CheckUIDResponse simple.

class UserDetails(BaseModel):
    uid: str
    name: str
    email: str
    phone: Optional[str]
    college: Optional[str]

class UserCreateUpdate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    college: Optional[str] = None

class UserResponse(BaseModel):
    uid: str
    name: str
    email: str
    is_shadow: bool
    message: str