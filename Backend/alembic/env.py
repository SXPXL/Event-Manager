from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from dotenv import load_dotenv
import os

# Load .env
load_dotenv()

# Import your models
from models import SQLModel  # Adjust import if needed
from database import engine  # Use your existing engine

config = context.config
config.set_main_option("sqlalchemy.url", os.getenv("DATABASE_URL"))

target_metadata = SQLModel.metadata

def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    connectable = engine  # Use your engine from database.py
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()