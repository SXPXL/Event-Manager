from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import User, Volunteer, Event, VolunteerRole, Registration, Team
from services import staff_service
from schemas.staff_schemas import VolunteerCreate
from schemas.event_schemas import EventCreate

router = APIRouter()


@router.get("/admin/users", tags=["Admin"])
def list_users(session: Session = Depends(get_session)):
    return session.exec(select(User)).all()

@router.get("/admin/volunteers", tags=["Admin"])
def list_volunteers(session: Session = Depends(get_session)):
    return session.exec(select(Volunteer)).all()

@router.post("/admin/volunteers", tags=["Admin"])
def create_volunteer(vol: VolunteerCreate, session: Session = Depends(get_session)):
    if session.exec(select(Volunteer).where(Volunteer.username == vol.username)).first():
        raise HTTPException(400, detail="Username taken")
    session.add(Volunteer(username=vol.username, password=vol.password, role=vol.role, assigned_event_id=vol.assigned_event_id))
    session.commit()
    return {"message": "Volunteer created"}

@router.post("/events", tags=["Admin"])
def create_event(evt: EventCreate, session: Session = Depends(get_session)):
    session.add(Event(name=evt.name, type=evt.type, fee=evt.fee, max_team_size=evt.max_team_size,min_team_size=evt.min_team_size))
    session.commit()
    return {"message": "Event created"}

@router.delete("/events/{event_id}", tags=["Admin"])
def delete_event(event_id: int, session: Session = Depends(get_session)):
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
def delete_user(uid: str, session: Session = Depends(get_session)):
    # Call the logic we added to staff_service
    msg = staff_service.delete_user_logic(uid, session)
    return {"status": "success", "message": msg}

@router.delete("/admin/volunteers/{vol_id}")
def delete_volunteer(vol_id: int, session: Session = Depends(get_session)):
    # Call the logic we added to staff_service
    msg = staff_service.delete_volunteer_logic(vol_id, session)
    return {"status": "success", "message": msg}