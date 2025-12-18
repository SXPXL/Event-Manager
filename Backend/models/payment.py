from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime

class CashToken(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    token: str = Field(index=True, unique=True)
    amount: float
    created_by_id: int 
    is_used: bool = Field(default=False)
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())