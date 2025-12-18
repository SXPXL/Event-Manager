# Backend/utils/email.py
import random
import string

def generate_uid():
    """Generates a random string like 'EVT-8X29A'"""
    chars = string.ascii_uppercase + string.digits
    random_str = ''.join(random.choices(chars, k=5))
    return f"EVT-{random_str}"

def mock_send_email(to_email: str, uid: str, name: str):
    """Standard Registration Email"""
    print(f"\n[EMAIL SERVICE] --------------------------------------")
    print(f"To: {to_email}")
    print(f"Subject: Your EventFlow Access Code")
    print(f"Body: Hi {name}, your UID is: {uid}. Use this to login.")
    print(f"------------------------------------------------------\n")

def mock_send_team_email(to_email: str, uid: str, name: str, leader_name: str):
    """
    NEW: Sent when a user is added by a Team Leader.
    """
    print(f"\n[EMAIL SERVICE - TEAM ADD] ---------------------------")
    print(f"To: {to_email}")
    print(f"Subject: You have been registered for an Event!")
    print(f"Body: Hi {name}, you were added to a team by {leader_name}.")
    print(f"Body: Your Login UID is: {uid}")
    print(f"------------------------------------------------------\n")