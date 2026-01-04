from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select
from database import get_session
from models import Volunteer
from utils.security import decode_access_token

# This tells FastAPI that the token comes from the "Authorization: Bearer <token>" header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/admin/login")

def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    # 1. Decode Token
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 2. Get User from DB
    username: str = payload.get("sub")
    user = session.exec(select(Volunteer).where(Volunteer.username == username)).first()
    
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
        
    return user

# Specific Requirement: Must be ADMIN
def require_admin(current_user: Volunteer = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized (Admins only)")
    return current_user