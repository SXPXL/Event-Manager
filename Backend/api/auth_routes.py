from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from database import get_session
from schemas.user_schemas import UserCreateUpdate, UserResponse,  UserDetails
from schemas.event_schemas import EventDisplay, CheckUIDResponse
from schemas.staff_schemas import AdminLoginRequest, AdminLoginResponse
from services import auth_service
from models import Registration, Event

router = APIRouter()

@router.get("/check-uid/{uid}", response_model=CheckUIDResponse)
def check_uid(uid: str, session: Session = Depends(get_session)):
    user = auth_service.check_uid_logic(uid, session)
    
    if user:
        # Fetch events logic (kept simple here)
        statement = select(Event).join(Registration).where(Registration.user_id == user.id)
        user_events = session.exec(statement).all()
        
        event_list = [
            EventDisplay(
                id=e.id, name=e.name, type=e.type, 
                fee=e.fee, max_team_size=e.max_team_size
            ) for e in user_events
        ]

        return CheckUIDResponse(
            exists=True,
            user=UserDetails(uid=user.uid, name=user.name, email=user.email, phone=user.phone, college=user.college),
            registered_events=event_list,
            message="User found."
        )
    else:
        return CheckUIDResponse(exists=False, message="UID not valid.")

@router.post("/users", response_model=UserResponse)
def register_user(user_data: UserCreateUpdate, session: Session = Depends(get_session)):
    user, msg = auth_service.register_user_logic(user_data, session)
    return UserResponse(uid=user.uid, name=user.name, email=user.email, is_shadow=user.is_shadow, message=msg)

@router.post("/admin/login", response_model=AdminLoginResponse, tags=["Admin"])
def admin_login(creds: AdminLoginRequest, session: Session = Depends(get_session)):
    volunteer = auth_service.admin_login_logic(creds, session)
    return AdminLoginResponse(success=True, role=volunteer.role, message=f"Welcome {volunteer.username}!")