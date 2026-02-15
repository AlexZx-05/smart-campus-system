from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User
from app.extensions import db

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/api/dashboard", methods=["GET"])
@jwt_required()
def dashboard():

    # Get user ID from JWT (stored as string)
    user_id = get_jwt_identity()

    # Convert to int and fetch user from database
    user = User.query.get(int(user_id))

    if not user:
        return jsonify({"message": "User not found"}), 404

    return jsonify({
        "message": "Dashboard Data",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        },
        "total_classes_today": 4,
        "attendance_percentage": 85,
        "upcoming_exams": 2
    }), 200