from datetime import datetime
from app.extensions import db


class Classroom(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    faculty_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    subject = db.Column(db.String(120), nullable=False, index=True)
    semester = db.Column(db.String(60), nullable=True, index=True)
    department = db.Column(db.String(50), nullable=True, index=True)
    year = db.Column(db.Integer, nullable=True, index=True)
    section = db.Column(db.String(10), nullable=True, index=True)
    description = db.Column(db.Text, nullable=True)
    join_link = db.Column(db.String(500), nullable=False)
    drive_link = db.Column(db.String(500), nullable=True)
    meet_link = db.Column(db.String(500), nullable=True)
    cover_image_path = db.Column(db.String(255), nullable=True)
    cover_image_name = db.Column(db.String(255), nullable=True)
    cover_image_mime = db.Column(db.String(120), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
