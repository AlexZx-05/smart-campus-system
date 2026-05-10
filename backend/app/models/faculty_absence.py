from datetime import datetime
from app.extensions import db


class FacultyAbsence(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    faculty_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    absent_date = db.Column(db.Date, nullable=False, index=True)
    start_time = db.Column(db.String(5), nullable=True)
    end_time = db.Column(db.String(5), nullable=True)
    substitute_faculty_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True, index=True)
    replacement_room = db.Column(db.String(30), nullable=True)
    reason = db.Column(db.String(300), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

