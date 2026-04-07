from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User
from app.extensions import db

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/api/dashboard", methods=["GET"])
@jwt_required()
def dashboard():

    user_id = get_jwt_identity()
    try:
        user_id_int = int(user_id)
    except (TypeError, ValueError):
        return jsonify({"message": "Invalid authentication token"}), 401

    user = User.query.get(user_id_int)

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
