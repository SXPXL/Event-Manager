from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_db_and_tables
from api import auth_routes, event_routes, admin_routes, staff_routes

app = FastAPI()

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- STARTUP ---
@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# --- ROUTERS ---
app.include_router(auth_routes.router)
app.include_router(event_routes.router)
app.include_router(admin_routes.router)
app.include_router(staff_routes.router)