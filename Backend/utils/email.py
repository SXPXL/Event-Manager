import requests
import os
import uuid
import qrcode
import base64
from io import BytesIO
from dotenv import load_dotenv

# Load credentials
load_dotenv()

# Brevo API Endpoint
BREVO_URL = "https://api.brevo.com/v3/smtp/email"
BREVO_API_KEY = os.getenv("BREVO_API_KEY")

# Use a verified sender email from your Brevo account
SENDER_EMAIL = os.getenv("SENDER_EMAIL") 
SENDER_NAME = "Srishti Team"

def generate_uid():
    """Generates a short, unique 5-char code."""
    return str(uuid.uuid4())[:5].upper()

def generate_qr_image(uid):
    """Generates a QR code image in memory (bytes)"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=2,
    )
    qr.add_data(uid)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    
    img_buffer = BytesIO()
    img.save(img_buffer, format="PNG")
    img_buffer.seek(0)
    return img_buffer.getvalue()

def send_email_background(to_email: str, name: str, uid: str, is_shadow_notification: bool = False, leader_name: str = None):
    """
    Sends an email using Brevo API (Port 443) with an INLINE QR Code.
    """
    if not BREVO_API_KEY:
        print("❌ EMAIL ERROR: BREVO_API_KEY is missing in environment variables.")
        return

    try:
        # 1. Generate QR Code & Convert to Base64
        qr_bytes = generate_qr_image(uid)
        qr_base64 = base64.b64encode(qr_bytes).decode('utf-8')
        
        # 2. Define Content-ID for Inline Image
        # Brevo uses this ID to map the attachment to the HTML <img> tag
        image_cid = f"qr_{uid}" 

        # 3. Construct HTML Content
        if is_shadow_notification:
            subject = "Action Required: You've been added to a Team - Srishti 2.6"
            html_content = f"""
            <html>
                <body style="font-family: Arial, sans-serif; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #4F46E5; text-align: center;">Welcome to Srishti 2.6!</h2>
                        <p>Hi {name},</p>
                        <p><strong>{leader_name}</strong> has added you to their team.</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <p style="margin-bottom: 5px; color: #666; font-size: 0.9rem;">Your Entry QR Code</p>
                            <img src="cid:{image_cid}" alt="QR Code" width="200" height="200" style="border: 1px solid #ddd; padding: 5px; border-radius: 5px;">
                        </div>

                        <div style="background: #f3f4f6; padding: 10px; text-align: center; margin: 20px 0; border-radius: 8px;">
                            <p style="margin:0; font-size:0.8rem; color:#666">Access Code (Manual Entry)</p>
                            <h2 style="margin: 5px 0; letter-spacing: 2px; color: #111;">{uid}</h2>
                        </div>
                    </div>
                </body>
            </html>
            """
        else:
            subject = "Your Srishti 2.6 Ticket & Access Code"
            html_content = f"""
            <html>
                <body style="font-family: Arial, sans-serif; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #10B981; text-align: center;">Registration Confirmed!</h2>
                        <p>Hi {name},</p>
                        <p>You are officially registered for <strong>Srishti 2.6</strong>.</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <p style="margin-bottom: 5px; color: #666; font-size: 0.9rem;">Your Entry QR Code</p>
                            <img src="cid:{image_cid}" alt="QR Code" width="200" height="200" style="border: 1px solid #ddd; padding: 5px; border-radius: 5px;">
                        </div>

                        <div style="background: #ecfdf5; padding: 10px; text-align: center; margin: 20px 0; border-radius: 8px; border: 1px solid #10B981;">
                            <p style="margin:0; font-size:0.8rem; color:#065F46">Access Code (Manual Entry)</p>
                            <h2 style="margin: 5px 0; letter-spacing: 2px; color: #065F46;">{uid}</h2>
                        </div>
                    </div>
                </body>
            </html>
            """

        # 4. Prepare the API Payload
        payload = {
            "sender": {"name": SENDER_NAME, "email": SENDER_EMAIL},
            "to": [{"email": to_email, "name": name}],
            "subject": subject,
            "htmlContent": html_content,
            "attachment": [
                {
                    "content": qr_base64,
                    "name": f"Srishti_QR_{uid}.png",
                    "contentId": image_cid  # <--- MAGIC LINK: Connects JSON to HTML <img src='cid:'>
                }
            ]
        }

        # 5. Send Request (HTTP POST)
        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "api-key": BREVO_API_KEY
        }

        response = requests.post(BREVO_URL, json=payload, headers=headers)

        # 6. Check Response
        if response.status_code == 201: # 201 Created = Success
            print(f"✅ Email sent via Brevo to {to_email}")
        else:
            print(f"❌ Brevo Error: {response.status_code} - {response.text}")

    except Exception as e:
        print(f"❌ Email Logic Failed: {e}")