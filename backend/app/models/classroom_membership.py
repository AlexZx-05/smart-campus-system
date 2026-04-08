from datetime import datetime
from sqlalchemy import UniqueConstraint
from app.extensions import db


class ClassroomMembership(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    classroom_id = db.Column(db.Integer, db.ForeignKey("classroom.id"), nullable=False, index=True)
    student_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    joined_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)

    __table_args__ = (
        UniqueConstraint("classroom_id", "student_id", name="uq_classroom_student_membership"),
    )
