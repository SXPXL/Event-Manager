import csv
import io
from sqlmodel import Session, select
from models import User, Registration, Event, Team

def generate_csv_logic(session: Session, event_id: int = None, filter_status: str = "ALL", sort_by: str = "NAME"):
    """
    Generates a CSV.
    - filter_status: 'ALL', 'PRESENT', 'ABSENT'
    - sort_by: 'NAME', 'TEAM'
    """
    
    # 1. Base Query
    query = (
        select(Registration, User, Event, Team)
        .join(User, Registration.user_id == User.id)
        .join(Event, Registration.event_id == Event.id)
        .outerjoin(Team, Registration.team_id == Team.id)
    )

    # 2. Filter by Event
    if event_id:
        query = query.where(Registration.event_id == event_id)

    # 3. Filter by Status
    if filter_status == 'PRESENT':
        query = query.where(Registration.attended == True)
    elif filter_status == 'ABSENT':
        query = query.where(Registration.attended == False)
    
    # 4. Sorting / Grouping
    if sort_by == 'TEAM':
        # Sort by Team Name first, then Participant Name
        # Null team names (Solos) will usually appear first or last depending on DB defaults
        query = query.order_by(Team.name, User.name)
    else:
        # Default: Sort by Name (A-Z)
        query = query.order_by(User.name)

    results = session.exec(query).all()

    # 5. Generate CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    headers = [
        "UID", "Name", "Email", "Phone", "College", 
        "Event Name", "Event Type", "Team Name", 
        "Payment Status", "Check-in Status"
    ]
    writer.writerow(headers)

    for reg, user, event, team in results:
        writer.writerow([
            user.uid,
            user.name,
            user.email,
            user.phone,
            user.college or "N/A",
            event.name,
            event.type,
            team.name if team else ("Solo" if event.type == "SOLO" else "N/A"),
            reg.payment_status,
            "PRESENT" if reg.attended else "ABSENT"
        ])
    
    output.seek(0)
    return output