import requests
import os
import uuid
from dotenv import load_dotenv

# Load credentials
load_dotenv()

BREVO_URL = "https://api.brevo.com/v3/smtp/email"
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
SENDER_EMAIL = os.getenv("EMAIL_USER") 
SENDER_NAME = "Srishti Team"
WEBSITE_URL = os.getenv("FRONTEND_URL") # 👈 REPLACE THIS with your actual link

# ✅ ADDED BACK: Your backend needs this function
def generate_uid():
    """Generates a short, unique 5-char code."""
    return str(uuid.uuid4())[:5].upper()

def get_qr_url(uid):
    """
    Returns a public URL that generates the QR code on the fly.
    """
    return f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={uid}&color=000000"

def get_email_template(name: str, uid: str, is_shadow: bool, leader_name: str = None):
    """
    Generates the HTML string. 
    """
    qr_url = get_qr_url(uid)

    # Common Styles
    style_card = "max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; font-family: 'Helvetica', sans-serif;"
    style_btn = "background: #f3f4f6; padding: 15px; text-align: center; margin: 20px 0; border-radius: 8px; border: 1px solid #d1d5db;"
    style_code = "margin: 5px 0; letter-spacing: 3px; font-size: 24px; font-weight: bold; color: #111;"
    style_link = "text-decoration: none; font-weight: bold;"

    if is_shadow:
        # --- TEAM MEMBER MESSAGE ---
        header_color = "#4F46E5" # Indigo
        title = "You have been added to a Team"
        
        # Specific instructions for team members
        message = (
            f"Hi {name},<br><br>"
            f"<strong>{leader_name}</strong> has added you to their team.<br><br>"
            f"Please visit <a href='{WEBSITE_URL}' style='color: {header_color}; {style_link}'>our website</a> "
            f"and enter your UID to see your profile.<br>"
            f"<span style='color: #ef4444;'><strong>Important:</strong> If your profile is incomplete, please fill in all details immediately.</span>"
        )
    else:
        # --- LEADER / NEW REGISTRATION MESSAGE ---
        header_color = "#10B981" # Emerald
        title = "Registration Confirmed"
        
        # Specific instructions for new registrants
        message = (
            f"Hi {name},<br><br>"
            f"You are officially registered for <strong>Srishti 2.6</strong>.<br><br>"
            f"<strong>Keep this QR code safe.</strong> You must show this at the reception desk to gain entry.<br>"
            f"To register for events, visit <a href='{WEBSITE_URL}' style='color: {header_color}; {style_link}'>our website</a> "
            f"and login with the UID below."
        )

    return f"""
    <html>
        <body style="background-color: #f9fafb; padding: 20px;">
            <div style="{style_card} background-color: #ffffff;">
                <h2 style="color: {header_color}; text-align: center; margin-top: 0;">{title}</h2>
                <p style="color: #374151; font-size: 16px; line-height: 1.5;">{message}</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <p style="margin-bottom: 10px; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Entry Pass</p>
                    <img src="{qr_url}" alt="QR Code: {uid}" width="180" height="180" style="border: 4px solid #fff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border-radius: 8px;">
                </div>

                <div style="{style_btn}">
                    <p style="margin:0; font-size:12px; color:#6b7280; text-transform: uppercase;">UID</p>
                    <h2 style="{style_code}">{uid}</h2>
                </div>

                <div style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 20px;">
                    <p>Present this QR code at the event desk for entry.</p>
                </div>

                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;">

                <div style="text-align: center; font-size: 14px; color: #4b5563;">
                    <p style="margin-bottom: 10px;"><strong>Need Support?</strong></p>
                    <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
                        <a href="tel:+919847113128" style="text-decoration: none; color: #374151;">📞 Call Us</a>
                        <span style="color: #d1d5db;">|</span>
                        <a href="https://wa.me/919497269128" style="text-decoration: none; color: #25D366; font-weight: bold;">💬 WhatsApp</a>
                        <span style="color: #d1d5db;">|</span>
                        <a href="https://instagram.com/srishti__2.6" style="text-decoration: none; color: #E1306C; font-weight: bold;">📸 Instagram</a>
                    </div>
                </div>
            </div>
        </body>
    </html>
    """

def send_email_background(to_email: str, name: str, uid: str, is_shadow_notification: bool = False, leader_name: str = None):
    if not BREVO_API_KEY:
        print("❌ EMAIL ERROR: BREVO_API_KEY is missing.")
        return

    try:
        # 1. Generate Content
        html_content = get_email_template(name, uid, is_shadow_notification, leader_name)
        
        subject = "Action Required: Team Invite" if is_shadow_notification else "Your Srishti 2.6 Ticket"

        # 2. Build Payload
        payload = {
            "sender": {"name": SENDER_NAME, "email": SENDER_EMAIL},
            "to": [{"email": to_email, "name": name}],
            "subject": subject,
            "htmlContent": html_content
        }

        # 3. Send
        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "api-key": BREVO_API_KEY
        }

        response = requests.post(BREVO_URL, json=payload, headers=headers)

        if response.status_code == 201:
            print(f"✅ Email sent to {to_email}")
        else:
            print(f"❌ Brevo Error: {response.status_code} - {response.text}")

    except Exception as e:
        print(f"❌ Email Logic Failed: {e}")