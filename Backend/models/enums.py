from enum import Enum

class EventType(str, Enum):
    SOLO = "SOLO"
    GROUP = "GROUP"

class PaymentStatus(str, Enum):
    UNPAID = "UNPAID"
    PENDING = "PENDING"
    PAID = "PAID"

class VolunteerRole(str, Enum):
    ADMIN = "ADMIN"
    CASHIER = "CASHIER"
    GUARD = "GUARD"

class PaymentStatus(str, Enum):
    CREATED = "CREATED"
    PENDING = "PENDING"
    PAID = "PAID"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"