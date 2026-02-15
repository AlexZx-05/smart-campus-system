import os
import uuid
from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from werkzeug.utils import secure_filename
from app.extensions import db
from app.models import FacultyPreference, User

preference_bp = Blueprint("preferences", __name__)


def _get_current_user():
    user_id = get_jwt_identity()
    return User.query.get(int(user_id))


def _serialize_preference(pref):
    faculty = User.query.get(pref.faculty_id)
    return {
        "id": pref.id,
        "faculty_id": pref.faculty_id,
        "faculty_name": faculty.name if faculty else None,
        "faculty_email": faculty.email if faculty else None,
        "day": pref.day,
        "subject": pref.subject,
        "student_count": pref.student_count,
        "start_time": pref.start_time,
        "end_time": pref.end_time,
        "semester": pref.semester,
        "details": pref.details,
        "status": pref.status,
        "created_at": pref.created_at.isoformat() if pref.created_at else None,
    }


def _serialize_faculty_profile(user):
    image_url = None
    if user.profile_image:
        image_url = f"{request.host_url.rstrip('/')}{user.profile_image}"

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "roll_number": user.roll_number,
        "department": user.department,
        "profile_image": user.profile_image,
        "profile_image_url": image_url,
    }


@preference_bp.route("/api/faculty/preferences", methods=["POST"])
@jwt_required()
def create_preference():
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json() or {}
    required_fields = ["day", "subject", "student_count", "start_time", "end_time", "semester"]
    missing = [field for field in required_fields if not data.get(field)]
    if missing:
        return jsonify({"message": f"Missing fields: {', '.join(missing)}"}), 400

    try:
        student_count = int(data["student_count"])
    except (TypeError, ValueError):
        return jsonify({"message": "student_count must be a number"}), 400

    if student_count <= 0:
        return jsonify({"message": "student_count must be greater than 0"}), 400

    preference = FacultyPreference(
        faculty_id=user.id,
        day=data["day"],
        subject=data["subject"],
        student_count=student_count,
        start_time=data["start_time"],
        end_time=data["end_time"],
        semester=data["semester"],
        details=data.get("details", ""),
        status="pending",
    )
    db.session.add(preference)
    db.session.commit()

    return jsonify({"message": "Preference submitted successfully", "preference": _serialize_preference(preference)}), 201


@preference_bp.route("/api/faculty/preferences/me", methods=["GET"])
@jwt_required()
def get_my_preferences():
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    prefs = (
        FacultyPreference.query.filter_by(faculty_id=user.id)
        .order_by(FacultyPreference.created_at.desc())
        .all()
    )
    return jsonify([_serialize_preference(pref) for pref in prefs]), 200


@preference_bp.route("/api/admin/preferences", methods=["GET"])
@jwt_required()
def get_all_preferences():
    user = _get_current_user()
    if not user or user.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    prefs = FacultyPreference.query.order_by(FacultyPreference.created_at.desc()).all()
    return jsonify([_serialize_preference(pref) for pref in prefs]), 200


@preference_bp.route("/api/admin/preferences/<int:preference_id>", methods=["PATCH"])
@jwt_required()
def update_preference_status(preference_id):
    user = _get_current_user()
    if not user or user.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json() or {}
    status = (data.get("status") or "").lower()
    if status not in {"pending", "approved", "rejected"}:
        return jsonify({"message": "Invalid status"}), 400

    pref = FacultyPreference.query.get(preference_id)
    if not pref:
        return jsonify({"message": "Preference not found"}), 404

    pref.status = status
    db.session.commit()
    return jsonify({"message": "Preference status updated", "preference": _serialize_preference(pref)}), 200


@preference_bp.route("/api/admin/timetable/generate", methods=["POST"])
@jwt_required()
def generate_timetable_from_preferences():
    user = _get_current_user()
    if not user or user.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    approved = (
        FacultyPreference.query.filter_by(status="approved")
        .order_by(FacultyPreference.day.asc(), FacultyPreference.start_time.asc())
        .all()
    )

    if not approved:
        return jsonify({"message": "No approved preferences found", "timetable": []}), 200

    rooms = [
        {"name": "A-101", "capacity": 40},
        {"name": "A-102", "capacity": 60},
        {"name": "B-201", "capacity": 80},
        {"name": "B-202", "capacity": 100},
        {"name": "C-301", "capacity": 120},
        {"name": "Lab-1", "capacity": 45},
    ]
    sections = ["A", "B", "C"]
    timetable = []

    for idx, pref in enumerate(approved):
        faculty = User.query.get(pref.faculty_id)
        required_capacity = pref.student_count or 0
        suitable_room = next((room for room in rooms if room["capacity"] >= required_capacity), None)
        assigned_room = suitable_room if suitable_room else rooms[-1]
        timetable.append({
            "day": pref.day,
            "subject": pref.subject,
            "faculty_name": faculty.name if faculty else "Faculty",
            "student_count": pref.student_count,
            "start_time": pref.start_time,
            "end_time": pref.end_time,
            "semester": pref.semester,
            "room": assigned_room["name"],
            "room_capacity": assigned_room["capacity"],
            "section": sections[idx % len(sections)],
            "source_preference_id": pref.id,
        })

    return jsonify({
        "message": "Timetable draft generated from approved preferences",
        "total_slots": len(timetable),
        "timetable": timetable,
    }), 200


@preference_bp.route("/api/faculty/profile", methods=["GET"])
@jwt_required()
def get_faculty_profile():
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    return jsonify(_serialize_faculty_profile(user)), 200


@preference_bp.route("/api/faculty/profile", methods=["PATCH"])
@jwt_required()
def update_faculty_profile():
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    department = (data.get("department") or "").strip()
    roll_number = (data.get("roll_number") or "").strip()

    if not name:
        return jsonify({"message": "Name is required"}), 400
    if not department:
        return jsonify({"message": "Department is required"}), 400
    if not roll_number:
        return jsonify({"message": "Employee number is required"}), 400

    duplicate = User.query.filter(
        User.roll_number == roll_number,
        User.id != user.id
    ).first()
    if duplicate:
        return jsonify({"message": "Employee number already exists"}), 400

    user.name = name
    user.department = department
    user.roll_number = roll_number
    db.session.commit()

    return jsonify({"message": "Profile updated successfully", "profile": _serialize_faculty_profile(user)}), 200


@preference_bp.route("/api/faculty/profile/photo", methods=["POST"])
@jwt_required()
def upload_faculty_profile_photo():
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    if "photo" not in request.files:
        return jsonify({"message": "Photo file is required"}), 400

    file = request.files["photo"]
    if not file or not file.filename:
        return jsonify({"message": "Invalid file"}), 400

    allowed_ext = {"png", "jpg", "jpeg", "webp"}
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in allowed_ext:
        return jsonify({"message": "Only png, jpg, jpeg, webp files are allowed"}), 400

    safe_name = secure_filename(file.filename)
    unique_name = f"{uuid.uuid4().hex}_{safe_name}"
    upload_path = os.path.join(current_app.config["UPLOAD_FOLDER"], unique_name)
    file.save(upload_path)

    user.profile_image = f"/uploads/{unique_name}"
    db.session.commit()

    return jsonify({
        "message": "Profile photo uploaded successfully",
        "profile": _serialize_faculty_profile(user)
    }), 200
