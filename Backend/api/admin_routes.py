from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select
from database import get_session
from models import User, Volunteer, Event, VolunteerRole, Registration, Team
from services import staff_service
from schemas.staff_schemas import VolunteerCreate
from schemas.event_schemas import EventCreate
from utils.security import get_password_hash as hasher
from api.dependencies import require_admin
from utils.limiter import limiter
from dotenv import load_dotenv
import os


load_dotenv()
ADMIN_NAME = os.getenv("ADMIN_USERNAME")


router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("/admin/volunteers", tags=["Admin"])
def list_volunteers(session: Session = Depends(get_session)):
    return session.exec(select(Volunteer)).all()

@router.post("/admin/volunteers", tags=["Admin"])
@limiter.limit("5/minute")
def create_volunteer(request: Request,vol: VolunteerCreate, session: Session = Depends(get_session)):
    if session.exec(select(Volunteer).where(Volunteer.username == vol.username)).first():
        raise HTTPException(400, detail="Username taken")
    hashed_pw = hasher(vol.password)
    session.add(Volunteer(username=vol.username, password=hashed_pw, role=vol.role, assigned_event_id=vol.assigned_event_id))
    session.commit()
    return {"message": "Volunteer created"}

@router.post("/events", tags=["Admin"])
@limiter.limit("10/minute")
def create_event(request: Request,evt: EventCreate, session: Session = Depends(get_session)):
    session.add(Event(name=evt.name, type=evt.type, fee=evt.fee, max_team_size=evt.max_team_size,min_team_size=evt.min_team_size, description=evt.description, date=evt.date, start_time=evt.start_time, end_time=evt.end_time))
    session.commit()
    return {"message": "Event created"}

@router.delete("/events/{event_id}", tags=["Admin"])
@limiter.limit("5/minute")
def delete_event(request: Request, event_id: int, session: Session = Depends(get_session)):
    evt = session.get(Event, event_id)
    if not evt:
        raise HTTPException(404, detail="Event not found")
    
    # 1. Delete all Registrations for this event
    # This prevents them from linking to a future event with the same ID
    registrations = session.exec(select(Registration).where(Registration.event_id == event_id)).all()
    for reg in registrations:
        session.delete(reg)
        
    # 2. Delete all Teams for this event
    teams = session.exec(select(Team).where(Team.event_id == event_id)).all()
    for team in teams:
        session.delete(team)

    # 3. Finally, delete the Event itself
    session.delete(evt)
    session.commit()
    
    return {"message": "Event and its data deleted successfully"}

@router.delete("/admin/users/{uid}")
@limiter.limit("5/minute")
def delete_user(request: Request,uid: str, session: Session = Depends(get_session)):
    # Call the logic we added to staff_service
    msg = staff_service.delete_user_logic(uid, session)
    return {"status": "success", "message": msg}

@router.delete("/admin/volunteers/{vol_id}")
@limiter.limit("5/minute")
def delete_volunteer(request: Request,vol_id: int, session: Session = Depends(get_session)):
    
    # 1. Fetch the actual volunteer from the DB so we can inspect it
    volunteer = session.get(Volunteer, vol_id)
    
    if not volunteer:
        raise HTTPException(status_code=404, detail="Volunteer not found")

    # 2. Check if it is the Protected Admin
    if volunteer.username == ADMIN_NAME:
        raise HTTPException(
            status_code=403, 
            detail="⚠️ SECURITY ALERT: You cannot delete the Root Admin account."
        )

    # 3. If safe, proceed to delete
    msg = staff_service.delete_volunteer_logic(vol_id, session)
    return {"status": "success", "message": msg}