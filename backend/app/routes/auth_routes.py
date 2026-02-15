from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token
from app.extensions import db
from app.models import User
import uuid

auth_bp = Blueprint("auth", __name__)

# ---------------- REGISTER ----------------
@auth_bp.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()

    if not data:
        return jsonify({"message": "No data provided"}), 400

    email = data.get("email")
    password = data.get("password")
    role = data.get("role", "student")  # default role

    if not email or not password:
        return jsonify({"message": "Email and password required"}), 400

    if role not in ["student", "faculty", "admin"]:
        return jsonify({"message": "Invalid role"}), 400

    # Check if email already exists
    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already exists"}), 400

    # For student & faculty → roll_number required
    roll_number = data.get("roll_number")

    if role in ["student", "faculty"]:
        if not roll_number:
            return jsonify({"message": "Roll/Employee number required"}), 400

        if User.query.filter_by(roll_number=roll_number).first():
            return jsonify({"message": "Roll/Employee number already exists"}), 400

    hashed_password = generate_password_hash(password)

    new_user = User(
        name=data.get("name"),
        email=email,
        password=hashed_password,
        roll_number=roll_number,
        department=data.get("department"),
        year=data.get("year", 0),
        section=data.get("section", ""),
        role=role
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        "message": f"{role.capitalize()} registered successfully"
    }), 201


# ---------------- LOGIN ----------------
# ---------------- LOGIN ----------------
@auth_bp.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data:
        return jsonify({"message": "No data provided"}), 400

    user = User.query.filter_by(email=data.get("email")).first()

    if not user or not check_password_hash(user.password, data.get("password")):
        return jsonify({"message": "Invalid credentials"}), 401

    # ✅ FIXED HERE
    access_token = create_access_token(identity=str(user.id))

    return jsonify({
        "access_token": access_token,
        "role": user.role
    }), 200

# ---------------- FORGOT PASSWORD ----------------
@auth_bp.route("/api/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json()

    if not data:
        return jsonify({"message": "No data provided"}), 400

    user = User.query.filter_by(email=data.get("email")).first()

    if not user:
        return jsonify({"message": "User not found"}), 404

    token = str(uuid.uuid4())
    user.reset_token = token
    db.session.commit()

    return jsonify({
        "message": "Reset token generated",
        "reset_token": token
    }), 200


# ---------------- RESET PASSWORD ----------------
@auth_bp.route("/api/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json()

    if not data:
        return jsonify({"message": "No data provided"}), 400

    user = User.query.filter_by(reset_token=data.get("token")).first()

    if not user:
        return jsonify({"message": "Invalid or expired token"}), 400

    user.password = generate_password_hash(data.get("new_password"))
    user.reset_token = None
    db.session.commit()

    return jsonify({"message": "Password reset successful"}), 200