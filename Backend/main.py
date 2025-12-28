from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_db_and_tables, get_session
from api import auth_routes, event_routes, admin_routes, staff_routes, payment_routes
from sqlmodel import Session, select
from models import Volunteer, VolunteerRole
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# --- CORS ---
origins_str = os.getenv("FRONTEND_URL", "")
origins = [o.strip() for o in origins_str.split(",") if o.strip()] if origins_str else []
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- STARTUP ---
@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    # Seed admin if not exists
    session = next(get_session())
    if not session.get(Volunteer, 1):  # Check if admin with id=1 exists
        admin_username = os.getenv("ADMIN_USERNAME")
        admin_password = os.getenv("ADMIN_PASSWORD")
        session.add(Volunteer(username=admin_username, password=admin_password, role=VolunteerRole.ADMIN))
        print("Admin user created.")
        session.commit()
    session.close()

# --- ROUTERS ---
app.include_router(auth_routes.router)
app.include_router(event_routes.router)
app.include_router(admin_routes.router)
app.include_router(staff_routes.router)
app.include_router(payment_routes.router)