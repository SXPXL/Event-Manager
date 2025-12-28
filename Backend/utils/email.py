import smtplib
import ssl
import os
import uuid
import qrcode
from io import BytesIO
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from dotenv import load_dotenv

# Load credentials from .env
load_dotenv()

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 465
SENDER_EMAIL = os.getenv("EMAIL_USER")
SENDER_PASSWORD = os.getenv("EMAIL_PASS")

def generate_uid():
    """Generates a short, unique 5-char code."""
    return str(uuid.uuid4())[:5].upper()

def generate_qr_image(uid):
    """Generates a QR code image in memory (bytes)"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=2, # Smaller border for email aesthetics
    )
    qr.add_data(uid)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    
    # Save to memory buffer
    img_buffer = BytesIO()
    img.save(img_buffer, format="PNG")
    img_buffer.seek(0)
    return img_buffer.getvalue()

def send_email_background(to_email: str, name: str, uid: str, is_shadow_notification: bool = False, leader_name: str = None):
    """
    Sends an HTML email with the QR Code EMBEDDED (Inline).
    """
    if not SENDER_EMAIL or not SENDER_PASSWORD:
        print("❌ EMAIL CONFIG MISSING: Check .env file")
        return

    try:
        # 'multipart/related' is required for inline images
        msg = MIMEMultipart("related")
        msg["From"] = SENDER_EMAIL
        msg["To"] = to_email
        
        # Define the Image Content-ID
        image_cid = f"qr_{uid}@srishti"

        # --- EMAIL CONTENT ---
        if is_shadow_notification:
            msg["Subject"] = f"Action Required: You've been added to a Team - Srishti 2.6"
            
            # Note the <img src="cid:..."> tag below
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
                        
                        <p style="text-align: center; font-size: 0.9rem; color: #555;">Please present this QR code at the gate for entry.</p>
                    </div>
                </body>
            </html>
            """
        else:
            msg["Subject"] = "Your Srishti 2.6 Ticket & Access Code"
            
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
                        
                        <p style="text-align: center; font-size: 0.9rem; color: #555;">Please present this QR code at the gate for entry.</p>
                    </div>
                </body>
            </html>
            """

        # Attach HTML Part
        msg.attach(MIMEText(html_content, "html"))

        # --- ATTACH IMAGE WITH CONTENT-ID ---
        qr_bytes = generate_qr_image(uid)
        
        img_part = MIMEImage(qr_bytes)
        
        # The Critical Step: Linking the CID to the HTML <img> tag
        # Use angle brackets <...> for the header value
        img_part.add_header('Content-ID', f"<{image_cid}>") 
        img_part.add_header('Content-Disposition', 'inline', filename=f"Srishti_QR_{uid}.png")
        
        msg.attach(img_part)

        # Send
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, context=context) as server:
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
        
        print(f"✅ Email sent to {to_email} with Inline QR.")

    except Exception as e:
        print(f"❌ Failed to send email: {e}")