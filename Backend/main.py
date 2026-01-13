from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_db_and_tables, get_session
from api import auth_routes, event_routes, admin_routes, staff_routes, payment_routes
from sqlmodel import Session, select
from models import Volunteer, VolunteerRole
import os
from dotenv import load_dotenv
from sqlmodel import select, Session
from utils.security import get_password_hash as hash_password
from database import engine
from slowapi import _rate_limit_exceeded_handler 
from slowapi.errors import RateLimitExceeded     
from utils.limiter import limiter
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

load_dotenv()
ad_user=os.getenv("ADMIN_USERNAME")
ad_pass=os.getenv("ADMIN_PASSWORD")

app = FastAPI(lifespan=lifespan)

# 1. ATTACH LIMITER STATE TO APP
app.state.limiter = limiter

# 2. ADD EXCEPTION HANDLER (So users get a nice error message)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
    with Session(engine) as session:
        admin = session.exec(
            select(Volunteer).where(Volunteer.username == ad_user)
        ).first()

        if not admin:
            admin = Volunteer(
                username=ad_user,
                password=hash_password(ad_pass),
                role="ADMIN"
            )
            session.add(admin)
            session.commit()

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Enik Jeevan ind"}

@app.get("/")
def read_root():
    return {"Machan": "ON aaneeee"}           

# --- ROUTERS ---
app.include_router(auth_routes.router)
app.include_router(event_routes.router)
app.include_router(admin_routes.router)
app.include_router(staff_routes.router)
app.include_router(payment_routes.router)