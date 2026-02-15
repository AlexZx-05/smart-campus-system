from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User

student_bp = Blueprint("student", __name__)

@student_bp.route("/api/student/dashboard", methods=["GET"])
@jwt_required()
def student_dashboard():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))

    if not user or user.role != "student":
        return jsonify({"message": "Unauthorized"}), 403

    return jsonify({
        "message": "Student Dashboard",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        }
    })