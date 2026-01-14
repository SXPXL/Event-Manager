from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks,Request
from sqlmodel import Session, select
from database import get_session
from schemas.user_schemas import UserCreateUpdate, UserResponse, UserDetails, UserUpdateProfile
from schemas.event_schemas import EventDisplay, CheckUIDResponse
from schemas.staff_schemas import AdminLoginRequest, AdminLoginResponse
from services import auth_service
from models import Registration, Event, User, Team
from utils.email import send_email_background 
from utils.security import verify_password, create_access_token
from models import Volunteer
from utils.limiter import limiter


router = APIRouter()

# ... (check_uid remains unchanged) ...
@router.get("/check-uid/{uid}", response_model=CheckUIDResponse)
@limiter.limit("30/minute")
def check_uid(request: Request, uid: str, session: Session = Depends(get_session)):
    # 1. Fetch User DIRECTLY (Bypassing service to ensure we find them)
    user = session.exec(select(User).where(User.uid == uid)).first()
    
    if not user:
        return CheckUIDResponse(exists=False, message="UID not valid.")

    # 2. Fetch Events (Outer Join ensures we don't lose data if Team is missing)
    statement = (
        select(Event, Registration, Team)
        .join(Registration, Registration.event_id == Event.id)
        .outerjoin(Team, Registration.team_id == Team.id)
        .where(Registration.user_id == user.id)
    )
    
    results = session.exec(statement).all()
    
    # 3. Map Results
    event_list = []
    for event, reg, team in results:
        event_list.append({
            "id": event.id,
            "name": event.name,
            "type": event.type,
            "fee": event.fee,
            "max_team_size": event.max_team_size,
            "min_team_size": event.min_team_size,
            "payment_status": reg.payment_status,
            "attended": reg.attended,
            "team_name": team.name if team else None,
            "is_leader": (team.leader_id == user.id) if team else False
        })

    # 4. Return Response (Even if event_list is empty, user exists!)
    return CheckUIDResponse(
        exists=True,
        user=UserDetails(
            uid=user.uid, 
            name=user.name, 
            email=user.email, 
            phone=user.phone, 
            college=user.college, 
            is_shadow=user.is_shadow
            
        ),
        registered_events=event_list,
        message="User found.",
    )


# --- UPDATED REGISTER ROUTE WITH EMAIL ---
@router.post("/users", response_model=UserResponse)
@limiter.limit("10/minute")
def register_user(
    request: Request,
    user_data: UserCreateUpdate, 
    background_tasks: BackgroundTasks,  # <--- INJECT THIS
    session: Session = Depends(get_session)
):
    user, msg = auth_service.register_user_logic(user_data, session)
    
    # Queue the email task (Non-blocking)
    background_tasks.add_task(send_email_background, user.email, user.name, user.uid)
    
    return UserResponse(uid=user.uid, name=user.name, email=user.email, is_shadow=user.is_shadow, message=msg)

@router.post("/admin/login", response_model=AdminLoginResponse, tags=["Admin"])
@limiter.limit("5/minute")
def admin_login_logic(
    request: Request,
    creds: AdminLoginRequest,
    session: Session = Depends(get_session)
):
    volunteer = session.exec(
        select(Volunteer).where(Volunteer.username == creds.username)
    ).first()

    if not volunteer or not verify_password(creds.password, volunteer.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(
        data={"sub": volunteer.username, "role": volunteer.role, "id": volunteer.id}
    )

    return {
        "success": True,
        "message": "Admin login successful",
        "role": volunteer.role,
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": volunteer.id,
            "username": volunteer.username,
            "role": volunteer.role,
            "assigned_event_id": volunteer.assigned_event_id
        }
    }


@router.put("/users/{uid}", response_model=UserResponse)
def update_user_profile(uid: str, req: UserUpdateProfile, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.uid == uid)).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    user.name = req.name
    user.phone = req.phone
    user.college = req.college
    
    if user.is_shadow:
        user.is_shadow = False
    
    session.add(user)
    session.commit()
    session.refresh(user)
    
    return UserResponse(
        uid=user.uid, name=user.name, email=user.email, 
        is_shadow=user.is_shadow, message="Profile updated successfully"
    )