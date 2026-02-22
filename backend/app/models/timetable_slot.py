from datetime import datetime
from app.extensions import db


class TimetableSlot(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    semester = db.Column(db.String(30), nullable=False, index=True)
    day = db.Column(db.String(20), nullable=False, index=True)
    subject = db.Column(db.String(120), nullable=False)
    faculty_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    department = db.Column(db.String(50), nullable=True, index=True)
    year = db.Column(db.Integer, nullable=True, index=True)
    section = db.Column(db.String(10), nullable=True, index=True)
    student_count = db.Column(db.Integer, nullable=True)
    start_time = db.Column(db.String(10), nullable=False, index=True)
    end_time = db.Column(db.String(10), nullable=False)
    room = db.Column(db.String(30), nullable=False)
    room_capacity = db.Column(db.Integer, nullable=True)
    source_preference_id = db.Column(db.Integer, db.ForeignKey("faculty_preference.id"), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
