from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import User, Volunteer, Event, VolunteerRole
from schemas.staff_schemas import VolunteerCreate
from schemas.event_schemas import EventCreate

router = APIRouter()

@router.post("/admin/seed", tags=["Admin"])
def seed_admin(session: Session = Depends(get_session)):
    if session.exec(select(Volunteer).where(Volunteer.username == "admin")).first():
        return {"message": "Admin exists."}
    session.add(Volunteer(username="admin", password="1234", role=VolunteerRole.ADMIN))
    session.commit()
    return {"message": "Admin created (admin/1234)"}

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
    session.add(Event(name=evt.name, type=evt.type, fee=evt.fee, max_team_size=evt.max_team_size))
    session.commit()
    return {"message": "Event created"}

@router.delete("/events/{event_id}", tags=["Admin"])
def delete_event(event_id: int, session: Session = Depends(get_session)):
    evt = session.get(Event, event_id)
    if evt:
        session.delete(evt)
        session.commit()
    return {"message": "Deleted"}