import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from app.config import Config
from app.extensions import db, jwt
from app.routes.auth_routes import auth_bp
from app.routes.dashboard_routes import dashboard_bp
from app.routes.preference_routes import preference_bp
from app.routes.event_routes import event_bp
from app.models import Room
from sqlalchemy import text


def _ensure_user_profile_image_column():
    columns = db.session.execute(text("PRAGMA table_info(user)")).fetchall()
    column_names = [col[1] for col in columns]
    if "profile_image" not in column_names:
        db.session.execute(text("ALTER TABLE user ADD COLUMN profile_image VARCHAR(255)"))
        db.session.commit()
    if "created_at" not in column_names:
        db.session.execute(text("ALTER TABLE user ADD COLUMN created_at DATETIME"))
        db.session.execute(text("UPDATE user SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))
        db.session.commit()


def _ensure_user_auth_columns():
    columns = db.session.execute(text("PRAGMA table_info(user)")).fetchall()
    column_names = [col[1] for col in columns]

    if "phone_number" not in column_names:
        db.session.execute(text("ALTER TABLE user ADD COLUMN phone_number VARCHAR(20)"))
        db.session.commit()
    if "otp_window_started_at" not in column_names:
        db.session.execute(text("ALTER TABLE user ADD COLUMN otp_window_started_at DATETIME"))
        db.session.commit()
    if "otp_request_count_hour" not in column_names:
        db.session.execute(text("ALTER TABLE user ADD COLUMN otp_request_count_hour INTEGER DEFAULT 0"))
        db.session.execute(
            text(
                "UPDATE user SET otp_request_count_hour = 0 "
                "WHERE otp_request_count_hour IS NULL"
            )
        )
        db.session.commit()
    if "otp_last_requested_at" not in column_names:
        db.session.execute(text("ALTER TABLE user ADD COLUMN otp_last_requested_at DATETIME"))
        db.session.commit()
    if "otp_failed_attempts" not in column_names:
        db.session.execute(text("ALTER TABLE user ADD COLUMN otp_failed_attempts INTEGER DEFAULT 0"))
        db.session.execute(
            text("UPDATE user SET otp_failed_attempts = 0 WHERE otp_failed_attempts IS NULL")
        )
        db.session.commit()
    if "otp_last_verified_at" not in column_names:
        db.session.execute(text("ALTER TABLE user ADD COLUMN otp_last_verified_at DATETIME"))
        db.session.commit()


def _ensure_faculty_preference_columns():
    table = db.session.execute(
        text("SELECT name FROM sqlite_master WHERE type='table' AND name='faculty_preference'")
    ).fetchone()
    if not table:
        return

    columns = db.session.execute(text("PRAGMA table_info(faculty_preference)")).fetchall()
    column_names = [col[1] for col in columns]
    if "subject" not in column_names:
        db.session.execute(text("ALTER TABLE faculty_preference ADD COLUMN subject VARCHAR(120)"))
        db.session.commit()
    if "student_count" not in column_names:
        db.session.execute(text("ALTER TABLE faculty_preference ADD COLUMN student_count INTEGER"))
        db.session.commit()
    if "department" not in column_names:
        db.session.execute(text("ALTER TABLE faculty_preference ADD COLUMN department VARCHAR(50)"))
        db.session.commit()
    if "year" not in column_names:
        db.session.execute(text("ALTER TABLE faculty_preference ADD COLUMN year INTEGER"))
        db.session.commit()
    if "section" not in column_names:
        db.session.execute(text("ALTER TABLE faculty_preference ADD COLUMN section VARCHAR(10)"))
        db.session.commit()
    if "created_at" not in column_names:
        db.session.execute(text("ALTER TABLE faculty_preference ADD COLUMN created_at DATETIME"))
        db.session.execute(
            text("UPDATE faculty_preference SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL")
        )
        db.session.commit()


def _ensure_default_rooms():
    if Room.query.count() > 0:
        return

    defaults = [
        ("A-101", 40),
        ("A-102", 60),
        ("B-201", 80),
        ("B-202", 100),
        ("C-301", 120),
        ("Lab-1", 45),
    ]
    for name, capacity in defaults:
        db.session.add(Room(name=name, capacity=capacity, is_active=True))
    db.session.commit()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    CORS(app)

    db.init_app(app)
    jwt.init_app(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(preference_bp)
    app.register_blueprint(event_bp)

    @app.route("/uploads/<path:filename>")
    def uploaded_file(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    @app.route("/")
    def home():
        return jsonify({"message": "Backend is running 🚀"})

    with app.app_context():
        db.create_all()
        _ensure_user_profile_image_column()
        _ensure_user_auth_columns()
        _ensure_faculty_preference_columns()
        _ensure_default_rooms()

    return app
