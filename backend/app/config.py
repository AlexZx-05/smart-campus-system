import os


BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def _load_local_env():
    env_path = os.path.join(BASE_DIR, ".env")
    if not os.path.exists(env_path):
        return

    with open(env_path, "r", encoding="utf-8") as env_file:
        for raw_line in env_file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip()
            if not key:
                continue

            if (value.startswith('"') and value.endswith('"')) or (
                value.startswith("'") and value.endswith("'")
            ):
                value = value[1:-1]

            os.environ.setdefault(key, value)


_load_local_env()


class Config:
    SQLALCHEMY_DATABASE_URI = 'sqlite:///smartcampus.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv("FLASK_SECRET_KEY", 'super-secret-key')
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
    MAIL_SMTP_HOST = os.getenv("MAIL_SMTP_HOST", "")
    MAIL_SMTP_PORT = int(os.getenv("MAIL_SMTP_PORT", "587"))
    MAIL_SMTP_USERNAME = os.getenv("MAIL_SMTP_USERNAME", "")
    MAIL_SMTP_PASSWORD = os.getenv("MAIL_SMTP_PASSWORD", "")
    MAIL_FROM_EMAIL = os.getenv("MAIL_FROM_EMAIL", "")
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "true").strip().lower() in {"1", "true", "yes", "on"}
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:3000")

    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "")
    GOOGLE_ALLOWED_DOMAIN = os.getenv("GOOGLE_ALLOWED_DOMAIN", "").strip().lower()

    TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_VERIFY_SERVICE_SID = os.getenv("TWILIO_VERIFY_SERVICE_SID", "")
    DEFAULT_TEST_PHONE = os.getenv("DEFAULT_TEST_PHONE", "")

    OTP_EXPIRY_SECONDS = int(os.getenv("OTP_EXPIRY_SECONDS", "300"))
    OTP_MAX_ATTEMPTS = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))
    OTP_RESEND_COOLDOWN_SECONDS = int(os.getenv("OTP_RESEND_COOLDOWN_SECONDS", "30"))
    OTP_MAX_REQUESTS_PER_HOUR = int(os.getenv("OTP_MAX_REQUESTS_PER_HOUR", "5"))
