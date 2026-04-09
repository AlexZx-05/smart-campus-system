from datetime import datetime
from sqlalchemy import UniqueConstraint
from app.extensions import db


class ClassroomAccessEmail(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    classroom_id = db.Column(db.Integer, db.ForeignKey("classroom.id"), nullable=False, index=True)
    student_email = db.Column(db.String(120), nullable=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)

    __table_args__ = (
        UniqueConstraint("classroom_id", "student_email", name="uq_classroom_access_email"),
    )
