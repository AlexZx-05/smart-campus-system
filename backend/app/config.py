import os


BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


class Config:
    SQLALCHEMY_DATABASE_URI = 'sqlite:///smartcampus.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = 'super-secret-key'
    UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
    # Comma-separated allowlist of admin emails (set by developer/deployment owner).
    # Example env: ADMIN_ALLOWED_EMAILS=admin1@campus.edu,admin2@campus.edu
    ADMIN_ALLOWED_EMAILS = [
        email.strip().lower()
        for email in os.getenv(
            "ADMIN_ALLOWED_EMAILS",
            "admin1@iiitr.ac.in,admin2@iiitr.ac.in,admin3@iiitr.ac.in,admin4@iiitr.ac.in",
        ).split(",")
        if email.strip()
    ]
