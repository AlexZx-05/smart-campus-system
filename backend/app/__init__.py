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
    if "faculty_mail_sender_email" not in column_names:
        db.session.execute(text("ALTER TABLE user ADD COLUMN faculty_mail_sender_email VARCHAR(120)"))
        db.session.commit()
    if "faculty_mail_app_password" not in column_names:
        db.session.execute(text("ALTER TABLE user ADD COLUMN faculty_mail_app_password VARCHAR(255)"))
        db.session.commit()
    if "faculty_mail_notifications_enabled" not in column_names:
        db.session.execute(text("ALTER TABLE user ADD COLUMN faculty_mail_notifications_enabled BOOLEAN DEFAULT 0"))
        db.session.execute(
            text(
                "UPDATE user SET faculty_mail_notifications_enabled = 0 "
                "WHERE faculty_mail_notifications_enabled IS NULL"
            )
        )
        db.session.commit()
    if "is_active" not in column_names:
        db.session.execute(text("ALTER TABLE user ADD COLUMN is_active BOOLEAN DEFAULT 1"))
        db.session.execute(text("UPDATE user SET is_active = 1 WHERE is_active IS NULL"))
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


def _ensure_support_query_attachment_columns():
    table = db.session.execute(
        text("SELECT name FROM sqlite_master WHERE type='table' AND name='support_query'")
    ).fetchone()
    if not table:
        return

    columns = db.session.execute(text("PRAGMA table_info(support_query)")).fetchall()
    column_names = [col[1] for col in columns]

    if "attachment_path" not in column_names:
        db.session.execute(text("ALTER TABLE support_query ADD COLUMN attachment_path VARCHAR(255)"))
        db.session.commit()
    if "attachment_name" not in column_names:
        db.session.execute(text("ALTER TABLE support_query ADD COLUMN attachment_name VARCHAR(255)"))
        db.session.commit()
    if "attachment_mime" not in column_names:
        db.session.execute(text("ALTER TABLE support_query ADD COLUMN attachment_mime VARCHAR(120)"))
        db.session.commit()


def _ensure_assignment_submission_review_columns():
    table = db.session.execute(
        text("SELECT name FROM sqlite_master WHERE type='table' AND name='assignment_submission'")
    ).fetchone()
    if not table:
        return

    columns = db.session.execute(text("PRAGMA table_info(assignment_submission)")).fetchall()
    column_names = [col[1] for col in columns]

    if "admin_review_status" not in column_names:
        db.session.execute(text("ALTER TABLE assignment_submission ADD COLUMN admin_review_status VARCHAR(20) DEFAULT 'pending'"))
        db.session.execute(
            text(
                "UPDATE assignment_submission SET admin_review_status = 'pending' "
                "WHERE admin_review_status IS NULL OR admin_review_status = ''"
            )
        )
        db.session.commit()
    if "admin_reviewed_by" not in column_names:
        db.session.execute(text("ALTER TABLE assignment_submission ADD COLUMN admin_reviewed_by INTEGER"))
        db.session.commit()
    if "admin_reviewed_at" not in column_names:
        db.session.execute(text("ALTER TABLE assignment_submission ADD COLUMN admin_reviewed_at DATETIME"))
        db.session.commit()
    if "section_grades" not in column_names:
        db.session.execute(text("ALTER TABLE assignment_submission ADD COLUMN section_grades TEXT"))
        db.session.commit()
    if "total_marks_awarded" not in column_names:
        db.session.execute(text("ALTER TABLE assignment_submission ADD COLUMN total_marks_awarded FLOAT"))
        db.session.commit()
    if "total_marks_out_of" not in column_names:
        db.session.execute(text("ALTER TABLE assignment_submission ADD COLUMN total_marks_out_of FLOAT"))
        db.session.commit()


def _ensure_classroom_link_columns():
    table = db.session.execute(
        text("SELECT name FROM sqlite_master WHERE type='table' AND name='classroom'")
    ).fetchone()
    if not table:
        return

    columns = db.session.execute(text("PRAGMA table_info(classroom)")).fetchall()
    column_names = [col[1] for col in columns]

    if "drive_link" not in column_names:
        db.session.execute(text("ALTER TABLE classroom ADD COLUMN drive_link VARCHAR(500)"))
        db.session.commit()
    if "meet_link" not in column_names:
        db.session.execute(text("ALTER TABLE classroom ADD COLUMN meet_link VARCHAR(500)"))
        db.session.commit()


def _ensure_faculty_message_attachment_columns():
    peer_table = db.session.execute(
        text("SELECT name FROM sqlite_master WHERE type='table' AND name='faculty_peer_message'")
    ).fetchone()
    if peer_table:
        columns = db.session.execute(text("PRAGMA table_info(faculty_peer_message)")).fetchall()
        column_names = [col[1] for col in columns]
        if "attachment_path" not in column_names:
            db.session.execute(text("ALTER TABLE faculty_peer_message ADD COLUMN attachment_path VARCHAR(255)"))
            db.session.commit()
        if "attachment_name" not in column_names:
            db.session.execute(text("ALTER TABLE faculty_peer_message ADD COLUMN attachment_name VARCHAR(255)"))
            db.session.commit()
        if "attachment_mime" not in column_names:
            db.session.execute(text("ALTER TABLE faculty_peer_message ADD COLUMN attachment_mime VARCHAR(120)"))
            db.session.commit()

    group_table = db.session.execute(
        text("SELECT name FROM sqlite_master WHERE type='table' AND name='faculty_chat_group_message'")
    ).fetchone()
    if group_table:
        columns = db.session.execute(text("PRAGMA table_info(faculty_chat_group_message)")).fetchall()
        column_names = [col[1] for col in columns]
        if "attachment_path" not in column_names:
            db.session.execute(text("ALTER TABLE faculty_chat_group_message ADD COLUMN attachment_path VARCHAR(255)"))
            db.session.commit()
        if "attachment_name" not in column_names:
            db.session.execute(text("ALTER TABLE faculty_chat_group_message ADD COLUMN attachment_name VARCHAR(255)"))
            db.session.commit()
        if "attachment_mime" not in column_names:
            db.session.execute(text("ALTER TABLE faculty_chat_group_message ADD COLUMN attachment_mime VARCHAR(120)"))
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
        _ensure_support_query_attachment_columns()
        _ensure_assignment_submission_review_columns()
        _ensure_classroom_link_columns()
        _ensure_faculty_message_attachment_columns()
        _ensure_default_rooms()

    return app
