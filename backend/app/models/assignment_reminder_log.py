from datetime import datetime, date
from sqlalchemy import UniqueConstraint
from app.extensions import db


class AssignmentReminderLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    assignment_id = db.Column(db.Integer, db.ForeignKey("assignment.id"), nullable=False, index=True)
    student_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    reminder_date = db.Column(db.Date, nullable=False, default=date.today, index=True)
    email_sent_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("assignment_id", "student_id", "reminder_date", name="uq_assignment_student_reminder_day"),
    )

