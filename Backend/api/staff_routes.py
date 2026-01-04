from fastapi import APIRouter, Depends, Query,Request
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from database import get_session
from services import staff_service, export_service , payment_service
from schemas.staff_schemas import * 
from utils.cashToken import generate_cash_token_logic
from models import User, Volunteer, Event, Registration, Team
from utils.limiter import limiter


router = APIRouter()

@router.post("/staff/walk-in-register", tags=["Staff"])
@limiter.limit("10/minute")
def walk_in_register(request: Request, req: WalkInBulkRequest, session: Session = Depends(get_session)):
    result = staff_service.walk_in_bulk_registration_logic(req, session)
    return {"status": "success", "data": result}

@router.get("/staff/search", tags=["Staff"])
def search_user(q: str, session: Session = Depends(get_session)):
    return staff_service.search_users_logic(q, session)

@router.post("/staff/mark-attendance", tags=["Staff"])
def mark_attendance(req: MarkAttendanceRequest, session: Session = Depends(get_session)):
    return staff_service.mark_attendance_logic(req.user_uid, req.event_id, session)

@router.post("/staff/generate-token", tags=["Staff"])
def generate_token(req: TokenRequest, session: Session = Depends(get_session)):
    # Fix: Ensure args match service definition order
    return generate_cash_token_logic(req.amount, req.volunteer_id, session)

@router.get("/staff/user-profile/{uid}", tags=["Staff"])
def get_user_profile(uid: str, session: Session = Depends(get_session)):
    return staff_service.get_user_full_profile(uid, session)

@router.get("/staff/export/event/{event_id}")
def export_event_data(
    event_id: int, 
    filter_status: str = Query("ALL", alias="filter"), # <--- Fix: alias="filter" keeps URL ?filter=... working
    sort: str = "NAME",
    session: Session = Depends(get_session)
):
    """
    Export event data with Filtering AND Sorting.
    """
    csv_file = export_service.generate_csv_logic(
        session, 
        event_id=event_id, 
        filter_status=filter_status, 
        sort_by=sort 
    )
    
    return StreamingResponse(
        csv_file,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=event_{event_id}_{sort}.csv"}
    )

@router.get("/admin/users", tags=["Admin"])
def list_users(session: Session = Depends(get_session)):
    return session.exec(select(User)).all()

@router.get("/admin/export/master")
def export_master_data(session: Session = Depends(get_session)):
    """
    Export ALL data (Default Sort: Name).
    """
    # Fix: Correctly passing named arguments
    csv_file = export_service.generate_csv_logic(session, event_id=None, filter_status="ALL", sort_by="NAME")
    
    return StreamingResponse(
        csv_file,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=master_export.csv"}
    )


@router.get("/staff/all-registrations", tags=["Staff"])
def get_all_registrations(session: Session = Depends(get_session)):
    # We join 4 tables to get the complete picture
    statement = (
        select(Registration, User, Team, Event)
        .join(User, Registration.user_id == User.id)
        .join(Event, Registration.event_id == Event.id)
        .outerjoin(Team, Registration.team_id == Team.id) # Outer join because some people are Solo (no team)
        .where(Registration.payment_status == "PAID")    # Only show valid tickets
    )
    
    results = session.exec(statement).all()
    
    # Format the data for the Frontend
    data = []
    for reg, user, team, event in results:
        data.append({
            "reg_id": reg.id,
            "user_uid": user.uid,
            "user_name": user.name,
            "event_id": event.id,          # Needed for filtering
            "team_name": team.name if team else "Individual", # Needed for Grouping
            "attended": reg.attended
        })
        
    return data