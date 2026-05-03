from datetime import datetime
from sqlalchemy import UniqueConstraint
from app.extensions import db


class FacultyChatGroupMember(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey("faculty_chat_group.id"), nullable=False, index=True)
    faculty_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)

    __table_args__ = (
        UniqueConstraint("group_id", "faculty_id", name="uq_faculty_chat_group_member"),
    )
