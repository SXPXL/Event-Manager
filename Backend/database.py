from sqlmodel import SQLModel, create_engine, Session

DATABASE_URL = "sqlite:///./eventflow.db"
# check_same_thread=False is needed for SQLite
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

def get_session():
    with Session(engine) as session:
        yield session

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)