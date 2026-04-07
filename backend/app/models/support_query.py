from datetime import datetime
from app.extensions import db


class SupportQuery(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    sender_role = db.Column(db.String(20), nullable=False, index=True)  # student, faculty
    subject = db.Column(db.String(160), nullable=False)
    body = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(40), nullable=False, default="general", index=True)
    priority = db.Column(db.String(20), nullable=False, default="normal", index=True)
    status = db.Column(db.String(20), nullable=False, default="open", index=True)
    admin_note = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True, index=True)
