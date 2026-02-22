from datetime import datetime
from app.extensions import db


class FacultyPreference(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    faculty_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    day = db.Column(db.String(20), nullable=False)
    subject = db.Column(db.String(120), nullable=True)
    student_count = db.Column(db.Integer, nullable=True)
    start_time = db.Column(db.String(10), nullable=False)
    end_time = db.Column(db.String(10), nullable=False)
    semester = db.Column(db.String(30), nullable=False)
    department = db.Column(db.String(50), nullable=True)
    year = db.Column(db.Integer, nullable=True)
    section = db.Column(db.String(10), nullable=True)
    details = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False, default="pending")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
