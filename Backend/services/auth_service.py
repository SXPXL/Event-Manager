from sqlmodel import Session, select
from fastapi import HTTPException
from models.user import User, Volunteer
from schemas.user_schemas import UserCreateUpdate
from utils.email import generate_uid, mock_send_email

def check_uid_logic(uid: str, session: Session):
    user = session.exec(select(User).where(User.uid == uid)).first()
    return user

def register_user_logic(user_data: UserCreateUpdate, session: Session):
    # Check if email exists
    existing_user = session.exec(select(User).where(User.email == user_data.email)).first()

    if existing_user:
        # STRICT BLOCK: No email sent. Just an error message.
        raise HTTPException(
            status_code=400, 
            detail="Email already registered. Please search your inbox for your UID."
        )

    # Brand New User (Only send email here)
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
    
    # Send UID only for brand new registrations
    mock_send_email(user.email, user.uid, user.name)
    
    return user, "Registration successful!"

def admin_login_logic(creds, session: Session):
    volunteer = session.exec(select(Volunteer).where(Volunteer.username == creds.username)).first()
    if not volunteer or volunteer.password != creds.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return volunteer