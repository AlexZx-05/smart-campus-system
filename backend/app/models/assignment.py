from datetime import datetime
from app.extensions import db


class Assignment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    created_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    subject = db.Column(db.String(120), nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)
    semester = db.Column(db.String(60), nullable=True, index=True)
    department = db.Column(db.String(50), nullable=True, index=True)
    year = db.Column(db.Integer, nullable=True, index=True)
    section = db.Column(db.String(10), nullable=True, index=True)
    due_at = db.Column(db.DateTime, nullable=False, index=True)
    reminder_days_before = db.Column(db.Integer, nullable=False, default=1)
    reminder_enabled = db.Column(db.Boolean, nullable=False, default=True)
    resource_links = db.Column(db.Text, nullable=True)  # JSON array of links
    attachment_path = db.Column(db.String(255), nullable=True)
    attachment_name = db.Column(db.String(255), nullable=True)
    attachment_mime = db.Column(db.String(120), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

