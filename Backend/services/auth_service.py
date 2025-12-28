from sqlmodel import Session, select
from fastapi import HTTPException
from models.user import User, Volunteer
from schemas.user_schemas import UserCreateUpdate
from utils.email import generate_uid 
# Removed mock_send_email import here, as the Route handles it now

def check_uid_logic(uid: str, session: Session):
    user = session.exec(select(User).where(User.uid == uid)).first()
    return user

def register_user_logic(user_data: UserCreateUpdate, session: Session):
    # Check if email exists
    existing_user = session.exec(select(User).where(User.email == user_data.email)).first()

    if existing_user:
        raise HTTPException(
            status_code=400, 
            detail="Email already registered. Please search your inbox for your UID."
        )

    # Brand New User
    new_uid = generate_uid()
    while session.exec(select(User).where(User.uid == new_uid)).first():
        new_uid = generate_uid()
        
    user = User(
        uid=new_uid, 
        name=user_data.name, 
        email=user_data.email,
        phone=user_data.phone, 
        college=user_data.college, 
        is_shadow=False
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    
    # NOTE: We do NOT send email here anymore. 
    # We return the user, and the Route adds the BackgroundTask.
    
    return user, "Registration successful!"

def admin_login_logic(creds, session: Session):
    volunteer = session.exec(select(Volunteer).where(Volunteer.username == creds.username)).first()
    if not volunteer or volunteer.password != creds.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return volunteer