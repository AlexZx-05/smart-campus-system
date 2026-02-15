import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from app.config import Config
from app.extensions import db, jwt
from app.routes.auth_routes import auth_bp
from app.routes.dashboard_routes import dashboard_bp
from app.routes.preference_routes import preference_bp
from app.routes.event_routes import event_bp
from sqlalchemy import text


def _ensure_user_profile_image_column():
    columns = db.session.execute(text("PRAGMA table_info(user)")).fetchall()
    column_names = [col[1] for col in columns]
    if "profile_image" not in column_names:
        db.session.execute(text("ALTER TABLE user ADD COLUMN profile_image VARCHAR(255)"))
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
        _ensure_faculty_preference_columns()

    return app
