from datetime import datetime
from app.extensions import db


class User(db.Model):

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(100), nullable=False)

    email = db.Column(db.String(120), unique=True, nullable=False)

    password = db.Column(db.String(200), nullable=False)

    role = db.Column(db.String(20), nullable=False)

    # Student specific fields (optional for admin/faculty)
    roll_number = db.Column(db.String(20), unique=True, nullable=True)
    department = db.Column(db.String(50), nullable=True)
    year = db.Column(db.Integer, nullable=True)
    section = db.Column(db.String(10), nullable=True)

    profile_image = db.Column(db.String(255), nullable=True)

    reset_token = db.Column(db.String(200), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
