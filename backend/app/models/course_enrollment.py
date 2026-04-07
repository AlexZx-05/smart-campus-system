from datetime import datetime
from sqlalchemy import UniqueConstraint
from app.extensions import db


class CourseEnrollment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    faculty_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    subject = db.Column(db.String(120), nullable=False, index=True)
    semester = db.Column(db.String(60), nullable=True, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint(
            "student_id",
            "faculty_id",
            "subject",
            "semester",
            name="uq_student_faculty_subject_semester",
        ),
    )

