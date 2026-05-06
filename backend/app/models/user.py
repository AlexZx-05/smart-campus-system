from datetime import datetime
from app.extensions import db


class User(db.Model):

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(100), nullable=False)

    email = db.Column(db.String(120), unique=True, nullable=False)
    phone_number = db.Column(db.String(20), unique=True, nullable=True)

    password = db.Column(db.String(200), nullable=False)

    role = db.Column(db.String(20), nullable=False)

    # Student specific fields (optional for admin/faculty)
    roll_number = db.Column(db.String(20), unique=True, nullable=True)
    department = db.Column(db.String(50), nullable=True)
    year = db.Column(db.Integer, nullable=True)
    section = db.Column(db.String(10), nullable=True)

    profile_image = db.Column(db.String(255), nullable=True)

    reset_token = db.Column(db.String(200), nullable=True)
    otp_window_started_at = db.Column(db.DateTime, nullable=True)
    otp_request_count_hour = db.Column(db.Integer, nullable=False, default=0)
    otp_last_requested_at = db.Column(db.DateTime, nullable=True)
    otp_failed_attempts = db.Column(db.Integer, nullable=False, default=0)
    otp_last_verified_at = db.Column(db.DateTime, nullable=True)
    faculty_mail_sender_email = db.Column(db.String(120), nullable=True)
    faculty_mail_app_password = db.Column(db.String(255), nullable=True)
    faculty_mail_notifications_enabled = db.Column(db.Boolean, nullable=False, default=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
