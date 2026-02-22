from datetime import datetime
from app.extensions import db


class StudentSetting(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, unique=True, index=True)

    email_notifications = db.Column(db.Boolean, nullable=False, default=True)
    exam_alerts = db.Column(db.Boolean, nullable=False, default=True)
    assignment_reminders = db.Column(db.Boolean, nullable=False, default=True)
    show_attendance_widget = db.Column(db.Boolean, nullable=False, default=True)
    dashboard_density = db.Column(db.String(20), nullable=False, default="comfortable")
    language = db.Column(db.String(20), nullable=False, default="English")
    week_start = db.Column(db.String(20), nullable=False, default="Monday")

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
