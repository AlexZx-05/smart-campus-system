from datetime import datetime
from app.extensions import db


class AssignmentSubmission(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    assignment_id = db.Column(db.Integer, db.ForeignKey("assignment.id"), nullable=False, index=True)
    student_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    submission_text = db.Column(db.Text, nullable=True)
    resource_links = db.Column(db.Text, nullable=True)  # JSON array of links
    attachment_path = db.Column(db.String(255), nullable=True)
    attachment_name = db.Column(db.String(255), nullable=True)
    attachment_mime = db.Column(db.String(120), nullable=True)
    status = db.Column(db.String(30), nullable=False, default="submitted", index=True)
    teacher_feedback = db.Column(db.Text, nullable=True)
    grade = db.Column(db.String(20), nullable=True)
    section_grades = db.Column(db.Text, nullable=True)  # JSON array: [{section, marks_awarded, marks_out_of}]
    total_marks_awarded = db.Column(db.Float, nullable=True)
    total_marks_out_of = db.Column(db.Float, nullable=True)
    admin_review_status = db.Column(db.String(20), nullable=False, default="pending", index=True)
    admin_reviewed_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True, index=True)
    admin_reviewed_at = db.Column(db.DateTime, nullable=True)
    submitted_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
