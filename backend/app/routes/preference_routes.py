import os
import uuid
import json
import smtplib
from datetime import datetime, timedelta
from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from werkzeug.utils import secure_filename
from sqlalchemy import func, or_
from email.message import EmailMessage
from app.extensions import db
from app.models import (
    AdminActivityLog,
    AdminMessage,
    Assignment,
    AssignmentReminderLog,
    AssignmentSubmission,
    ConflictRequest,
    CourseEnrollment,
    Classroom,
    ClassroomMembership,
    Event,
    FacultyPreference,
    FacultyPeerMessage,
    Room,
    SupportQuery,
    StudentSetting,
    TimetableSlot,
    User,
)

preference_bp = Blueprint("preferences", __name__)

DEFAULT_STUDENT_SETTINGS = {
    "email_notifications": True,
    "exam_alerts": True,
    "assignment_reminders": True,
    "show_attendance_widget": True,
    "dashboard_density": "comfortable",
    "language": "English",
    "week_start": "Monday",
}

DEFAULT_ROOMS = [
    {"name": "A-101", "capacity": 40},
    {"name": "A-102", "capacity": 60},
    {"name": "B-201", "capacity": 80},
    {"name": "B-202", "capacity": 100},
    {"name": "C-301", "capacity": 120},
    {"name": "Lab-1", "capacity": 45},
]


def _get_current_user():
    user_id = get_jwt_identity()
    try:
        user_id_int = int(user_id)
    except (TypeError, ValueError):
        return None
    return User.query.get(user_id_int)


def _normalize_day(value):
    day = (value or "").strip().capitalize()
    valid = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"}
    if day not in valid:
        return None
    return day


def _parse_int(value):
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _select_room(student_count):
    count = student_count or 0
    db_rooms = Room.query.filter_by(is_active=True).all()
    rooms = [{"name": r.name, "capacity": r.capacity} for r in db_rooms] if db_rooms else DEFAULT_ROOMS
    rooms = sorted(rooms, key=lambda r: (r["capacity"], r["name"]))
    for room in rooms:
        if room["capacity"] >= count:
            return room
    return rooms[-1]


def _serialize_room(room):
    return {
        "id": room.id,
        "name": room.name,
        "capacity": room.capacity,
        "is_active": room.is_active,
    }


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
        "department": pref.department,
        "year": pref.year,
        "section": pref.section,
        "details": pref.details,
        "status": pref.status,
        "created_at": pref.created_at.isoformat() if pref.created_at else None,
    }


def _serialize_timetable_slot(slot):
    faculty = User.query.get(slot.faculty_id)
    return {
        "id": slot.id,
        "semester": slot.semester,
        "day": slot.day,
        "subject": slot.subject,
        "faculty_id": slot.faculty_id,
        "faculty_name": faculty.name if faculty else "Faculty",
        "faculty_email": faculty.email if faculty else None,
        "department": slot.department,
        "year": slot.year,
        "section": slot.section,
        "student_count": slot.student_count,
        "start_time": slot.start_time,
        "end_time": slot.end_time,
        "room": slot.room,
        "room_capacity": slot.room_capacity,
        "source_preference_id": slot.source_preference_id,
    }


def _build_timetable_slot_from_preference(pref, room_name=None, room_capacity=None):
    room = _select_room(pref.student_count)
    resolved_room = room_name or room["name"]
    resolved_capacity = room_capacity if room_capacity is not None else room["capacity"]
    faculty = User.query.get(pref.faculty_id)

    return {
        "semester": pref.semester,
        "day": pref.day,
        "subject": pref.subject,
        "faculty_id": pref.faculty_id,
        "faculty_name": faculty.name if faculty else "Faculty",
        "department": pref.department,
        "year": pref.year,
        "section": pref.section,
        "student_count": pref.student_count,
        "start_time": pref.start_time,
        "end_time": pref.end_time,
        "room": resolved_room,
        "room_capacity": resolved_capacity,
        "source_preference_id": pref.id,
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


def _serialize_student_profile(user):
    payload = _serialize_faculty_profile(user)
    payload["year"] = user.year
    payload["section"] = user.section
    return payload


def _serialize_student_settings(setting):
    return {
        "email_notifications": setting.email_notifications,
        "exam_alerts": setting.exam_alerts,
        "assignment_reminders": setting.assignment_reminders,
        "show_attendance_widget": setting.show_attendance_widget,
        "dashboard_density": setting.dashboard_density,
        "language": setting.language,
        "week_start": setting.week_start,
    }


def _serialize_admin_user(user):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "roll_number": user.roll_number,
        "department": user.department,
        "year": user.year,
        "section": user.section,
    }


def _serialize_admin_message(message):
    sender = User.query.get(message.sender_id)
    return {
        "id": message.id,
        "sender_id": message.sender_id,
        "sender_name": sender.name if sender else "Admin",
        "recipient_role": message.recipient_role,
        "subject": message.subject,
        "body": message.body,
        "created_at": message.created_at.isoformat() if message.created_at else None,
    }


def _serialize_faculty_directory_user(user):
    image_url = None
    if user.profile_image:
        image_url = f"{request.host_url.rstrip('/')}{user.profile_image}"

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "department": user.department,
        "roll_number": user.roll_number,
        "profile_image_url": image_url,
    }


def _serialize_faculty_peer_message(row):
    sender = User.query.get(row.sender_id)
    recipient = User.query.get(row.recipient_id)
    return {
        "id": row.id,
        "sender_id": row.sender_id,
        "sender_name": sender.name if sender else "Faculty",
        "sender_email": sender.email if sender else None,
        "recipient_id": row.recipient_id,
        "recipient_name": recipient.name if recipient else "Faculty",
        "recipient_email": recipient.email if recipient else None,
        "subject": row.subject,
        "body": row.body,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def _serialize_support_query(row):
    sender = User.query.get(row.sender_id)
    attachment_url = None
    if row.attachment_path:
        attachment_url = f"{request.host_url.rstrip('/')}{row.attachment_path}"
    return {
        "id": row.id,
        "sender_id": row.sender_id,
        "sender_name": sender.name if sender else "User",
        "sender_email": sender.email if sender else None,
        "sender_role": row.sender_role,
        "subject": row.subject,
        "body": row.body,
        "category": row.category,
        "priority": row.priority,
        "status": row.status,
        "admin_note": row.admin_note,
        "attachment_path": row.attachment_path,
        "attachment_name": row.attachment_name,
        "attachment_mime": row.attachment_mime,
        "attachment_url": attachment_url,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        "resolved_at": row.resolved_at.isoformat() if row.resolved_at else None,
    }


def _serialize_conflict(conflict):
    creator = User.query.get(conflict.created_by) if conflict.created_by else None
    return {
        "id": conflict.id,
        "title": conflict.title,
        "description": conflict.description,
        "status": conflict.status,
        "created_by": conflict.created_by,
        "created_by_name": creator.name if creator else None,
        "created_at": conflict.created_at.isoformat() if conflict.created_at else None,
        "resolved_at": conflict.resolved_at.isoformat() if conflict.resolved_at else None,
    }


def _serialize_activity(activity):
    actor = User.query.get(activity.actor_id) if activity.actor_id else None
    return {
        "id": activity.id,
        "action_type": activity.action_type,
        "message": activity.message,
        "actor_id": activity.actor_id,
        "actor_name": actor.name if actor else "System",
        "created_at": activity.created_at.isoformat() if activity.created_at else None,
    }


def _serialize_event(event):
    creator = User.query.get(event.created_by) if event.created_by else None
    return {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "date": event.date,
        "created_by": event.created_by,
        "creator_name": creator.name if creator else None,
        "creator_role": creator.role if creator else None,
        "created_at": event.created_at.isoformat() if event.created_at else None,
    }


def _log_admin_activity(actor_id, action_type, message):
    row = AdminActivityLog(
        actor_id=actor_id,
        action_type=action_type,
        message=message[:255],
    )
    db.session.add(row)


def _is_admin_email_allowed(email):
    allowed = set(current_app.config.get("ADMIN_ALLOWED_EMAILS", []))
    return (email or "").strip().lower() in allowed


def _get_or_create_student_settings(student_id):
    settings = StudentSetting.query.filter_by(student_id=student_id).first()
    if settings:
        return settings

    settings = StudentSetting(student_id=student_id, **DEFAULT_STUDENT_SETTINGS)
    db.session.add(settings)
    db.session.commit()
    return settings


def _to_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        value = value.strip().lower()
        if value in {"true", "1", "yes", "on"}:
            return True
        if value in {"false", "0", "no", "off"}:
            return False
    raise ValueError("invalid boolean")


def _parse_iso_datetime(value):
    text = (value or "").strip()
    if not text:
        return None
    try:
        if text.endswith("Z"):
            text = text.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(text)
        if parsed.tzinfo:
            return parsed.astimezone().replace(tzinfo=None)
        return parsed
    except ValueError:
        return None


def _build_room_live_status_payload(semester=""):
    now = datetime.now()
    day = now.strftime("%A")
    current_time = now.strftime("%H:%M")

    query = TimetableSlot.query.filter(TimetableSlot.day == day)
    if semester:
        query = query.filter(TimetableSlot.semester == semester)
    slots = query.order_by(TimetableSlot.room.asc(), TimetableSlot.start_time.asc()).all()

    room_rows = {
        r.name: {"room": r.name, "capacity": r.capacity, "status": "idle"}
        for r in Room.query.filter_by(is_active=True).all()
    }
    running_count = 0
    next_start = None

    for slot in slots:
        room_rows.setdefault(slot.room, {"room": slot.room, "capacity": slot.room_capacity, "status": "idle"})
        if slot.start_time <= current_time < slot.end_time:
            running_count += 1
            room_rows[slot.room]["status"] = "running"
            room_rows[slot.room]["running_class"] = _serialize_timetable_slot(slot)
        elif slot.start_time > current_time:
            existing = room_rows[slot.room].get("next_class")
            if not existing or slot.start_time < existing["start_time"]:
                room_rows[slot.room]["next_class"] = _serialize_timetable_slot(slot)
            if next_start is None or slot.start_time < next_start:
                next_start = slot.start_time

    return {
        "semester": semester,
        "day": day,
        "current_time": current_time,
        "running_classes_count": running_count,
        "next_slot_time": next_start,
        "rooms": list(room_rows.values()),
    }


def _parse_links_input(value):
    if value is None:
        return []
    if isinstance(value, list):
        raw_links = value
    else:
        text = str(value).strip()
        if not text:
            return []
        if text.startswith("["):
            try:
                parsed = json.loads(text)
                raw_links = parsed if isinstance(parsed, list) else [text]
            except json.JSONDecodeError:
                raw_links = text.splitlines()
        else:
            raw_links = text.splitlines()

    cleaned = []
    for raw in raw_links:
        link = str(raw or "").strip()
        if not link:
            continue
        if not (link.startswith("http://") or link.startswith("https://")):
            raise ValueError("All resource links must start with http:// or https://")
        cleaned.append(link)
    return cleaned


def _serialize_links(value):
    if not value:
        return []
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return [str(item) for item in parsed if str(item).strip()]
    except json.JSONDecodeError:
        pass
    return []


def _serialize_submission_for_student(submission):
    if not submission:
        return None
    file_url = None
    if submission.attachment_path:
        file_url = f"{request.host_url.rstrip('/')}{submission.attachment_path}"
    return {
        "id": submission.id,
        "assignment_id": submission.assignment_id,
        "student_id": submission.student_id,
        "submission_text": submission.submission_text,
        "resource_links": _serialize_links(submission.resource_links),
        "attachment_path": submission.attachment_path,
        "attachment_name": submission.attachment_name,
        "attachment_mime": submission.attachment_mime,
        "attachment_url": file_url,
        "status": submission.status,
        "teacher_feedback": submission.teacher_feedback,
        "grade": submission.grade,
        "submitted_at": submission.submitted_at.isoformat() if submission.submitted_at else None,
        "updated_at": submission.updated_at.isoformat() if submission.updated_at else None,
    }


def _serialize_assignment(row, student=None):
    faculty = User.query.get(row.created_by)
    file_url = None
    if row.attachment_path:
        file_url = f"{request.host_url.rstrip('/')}{row.attachment_path}"

    payload = {
        "id": row.id,
        "title": row.title,
        "subject": row.subject,
        "description": row.description,
        "semester": row.semester,
        "department": row.department,
        "year": row.year,
        "section": row.section,
        "due_at": row.due_at.isoformat() if row.due_at else None,
        "reminder_days_before": row.reminder_days_before,
        "reminder_enabled": row.reminder_enabled,
        "resource_links": _serialize_links(row.resource_links),
        "attachment_path": row.attachment_path,
        "attachment_name": row.attachment_name,
        "attachment_mime": row.attachment_mime,
        "attachment_url": file_url,
        "created_by": row.created_by,
        "created_by_name": faculty.name if faculty else "Faculty",
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }

    if student:
        submission = AssignmentSubmission.query.filter_by(
            assignment_id=row.id,
            student_id=student.id,
        ).first()
        payload["my_submission"] = _serialize_submission_for_student(submission)
    return payload


def _serialize_submission_for_faculty(submission):
    student = User.query.get(submission.student_id)
    file_url = None
    if submission.attachment_path:
        file_url = f"{request.host_url.rstrip('/')}{submission.attachment_path}"
    return {
        "id": submission.id,
        "assignment_id": submission.assignment_id,
        "student_id": submission.student_id,
        "student_name": student.name if student else "Student",
        "student_email": student.email if student else None,
        "roll_number": student.roll_number if student else None,
        "department": student.department if student else None,
        "year": student.year if student else None,
        "section": student.section if student else None,
        "submission_text": submission.submission_text,
        "resource_links": _serialize_links(submission.resource_links),
        "attachment_path": submission.attachment_path,
        "attachment_name": submission.attachment_name,
        "attachment_mime": submission.attachment_mime,
        "attachment_url": file_url,
        "status": submission.status,
        "teacher_feedback": submission.teacher_feedback,
        "grade": submission.grade,
        "submitted_at": submission.submitted_at.isoformat() if submission.submitted_at else None,
        "updated_at": submission.updated_at.isoformat() if submission.updated_at else None,
    }


def _serialize_course_enrollment(row):
    student = User.query.get(row.student_id)
    faculty = User.query.get(row.faculty_id)
    return {
        "id": row.id,
        "student_id": row.student_id,
        "student_name": student.name if student else None,
        "student_email": student.email if student else None,
        "faculty_id": row.faculty_id,
        "faculty_name": faculty.name if faculty else None,
        "faculty_email": faculty.email if faculty else None,
        "subject": row.subject,
        "semester": row.semester,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def _serialize_classroom(row):
    faculty = User.query.get(row.faculty_id)
    cover_image_url = None
    if row.cover_image_path:
        cover_image_url = f"{request.host_url.rstrip('/')}{row.cover_image_path}"

    return {
        "id": row.id,
        "faculty_id": row.faculty_id,
        "faculty_name": faculty.name if faculty else "Faculty",
        "faculty_email": faculty.email if faculty else None,
        "title": row.title,
        "subject": row.subject,
        "semester": row.semester,
        "department": row.department,
        "year": row.year,
        "section": row.section,
        "description": row.description,
        "join_link": row.join_link,
        "cover_image_path": row.cover_image_path,
        "cover_image_name": row.cover_image_name,
        "cover_image_mime": row.cover_image_mime,
        "cover_image_url": cover_image_url,
        "is_active": row.is_active,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _is_classroom_targeted_to_student(classroom, student):
    if classroom.department and (student.department or "").strip().lower() != classroom.department.strip().lower():
        return False
    if classroom.year and student.year != classroom.year:
        return False
    if classroom.section and (student.section or "").strip().upper() != classroom.section.strip().upper():
        return False
    return True


def _normalize_text_key(value):
    return (value or "").strip().lower()


def _is_student_enrolled_for_assignment(student_id, assignment):
    if not student_id or not assignment:
        return False

    query = CourseEnrollment.query.filter(
        CourseEnrollment.student_id == student_id,
        CourseEnrollment.faculty_id == assignment.created_by,
        func.lower(CourseEnrollment.subject) == _normalize_text_key(assignment.subject),
    )
    if assignment.semester:
        query = query.filter(
            or_(
                CourseEnrollment.semester == assignment.semester,
                CourseEnrollment.semester.is_(None),
            )
        )
    return query.first() is not None


def _get_enrolled_students_for_assignment(assignment):
    if not assignment:
        return []
    query = CourseEnrollment.query.filter(
        CourseEnrollment.faculty_id == assignment.created_by,
        func.lower(CourseEnrollment.subject) == _normalize_text_key(assignment.subject),
    )
    if assignment.semester:
        query = query.filter(
            or_(
                CourseEnrollment.semester == assignment.semester,
                CourseEnrollment.semester.is_(None),
            )
        )
    enrollments = query.all()
    if not enrollments:
        return []
    student_ids = sorted({row.student_id for row in enrollments})
    return User.query.filter(User.id.in_(student_ids), User.role == "student").all()


def _is_assignment_visible_to_student(assignment, student):
    if not student:
        return False
    return _is_student_enrolled_for_assignment(student.id, assignment)


def _send_assignment_reminder_email(student, faculty, assignment):
    smtp_host = current_app.config.get("MAIL_SMTP_HOST")
    smtp_port = current_app.config.get("MAIL_SMTP_PORT")
    smtp_user = current_app.config.get("MAIL_SMTP_USERNAME")
    smtp_pass = (current_app.config.get("MAIL_SMTP_PASSWORD") or "").replace(" ", "")
    from_email = current_app.config.get("MAIL_FROM_EMAIL") or smtp_user
    use_tls = current_app.config.get("MAIL_USE_TLS", True)

    if not smtp_host or not smtp_port or not smtp_user or not smtp_pass or not from_email:
        return False

    faculty_name = faculty.name if faculty else "Faculty"
    faculty_email = faculty.email if faculty else "N/A"
    due_text = assignment.due_at.strftime("%Y-%m-%d %H:%M") if assignment.due_at else "N/A"
    class_scope = " / ".join(
        [
            assignment.department or "-",
            str(assignment.year or "-"),
            assignment.section or "-",
        ]
    )

    msg = EmailMessage()
    msg["Subject"] = f"Assignment Reminder: {assignment.subject} - {assignment.title}"
    msg["From"] = from_email
    msg["To"] = student.email
    if faculty and faculty.email:
        msg["Reply-To"] = faculty.email
    msg.set_content(
        f"Hello {student.name},\n\n"
        "This is an assignment reminder.\n\n"
        f"Subject: {assignment.subject}\n"
        f"Title: {assignment.title}\n"
        f"Due: {due_text}\n"
        f"Class: {class_scope}\n\n"
        f"Teacher: {faculty_name}\n"
        f"Teacher Email: {faculty_email}\n\n"
        "Please submit your work before the deadline in the Smart Campus portal."
    )

    with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
        if use_tls:
            server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
    return True


def _is_valid_time_range(start_time, end_time):
    if not start_time or not end_time:
        return False
    return start_time < end_time


def _times_overlap(start_a, end_a, start_b, end_b):
    return start_a < end_b and end_a > start_b


def _active_rooms_sorted():
    rooms = Room.query.filter_by(is_active=True).all()
    if rooms:
        return sorted(
            [{"name": r.name, "capacity": r.capacity} for r in rooms],
            key=lambda r: (r["capacity"], r["name"]),
        )
    return sorted(DEFAULT_ROOMS, key=lambda r: (r["capacity"], r["name"]))


def _auto_assign_rooms_for_slots(slot_like_items):
    rooms = _active_rooms_sorted()
    occupied = {}
    assigned = []
    unassigned = []

    ordered = sorted(
        slot_like_items,
        key=lambda s: (
            s.get("day") or "",
            s.get("start_time") or "",
            -int(s.get("student_count") or 0),
            s.get("faculty_name") or "",
        ),
    )

    for item in ordered:
        day = item.get("day")
        start_time = item.get("start_time")
        end_time = item.get("end_time")
        student_count = int(item.get("student_count") or 0)
        chosen = None

        for room in rooms:
            if room["capacity"] < student_count:
                continue
            has_conflict = False
            for booked in occupied.get(room["name"], []):
                if booked["day"] != day:
                    continue
                if _times_overlap(start_time, end_time, booked["start_time"], booked["end_time"]):
                    has_conflict = True
                    break
            if not has_conflict:
                chosen = room
                break

        if chosen:
            occupied.setdefault(chosen["name"], []).append(
                {"day": day, "start_time": start_time, "end_time": end_time}
            )
            slot = dict(item)
            slot["room"] = chosen["name"]
            slot["room_capacity"] = chosen["capacity"]
            assigned.append(slot)
        else:
            unassigned.append(
                {
                    "source_preference_id": item.get("source_preference_id"),
                    "faculty_name": item.get("faculty_name"),
                    "subject": item.get("subject"),
                    "day": day,
                    "start_time": start_time,
                    "end_time": end_time,
                    "student_count": student_count,
                    "reason": "No vacant room with enough capacity for this time slot",
                }
            )

    return assigned, unassigned


@preference_bp.route("/api/faculty/preferences", methods=["POST"])
@jwt_required()
def create_preference():
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json() or {}
    required_fields = ["subject", "student_count", "semester"]
    missing = [field for field in required_fields if not data.get(field)]
    if missing:
        return jsonify({"message": f"Missing fields: {', '.join(missing)}"}), 400

    try:
        student_count = int(data["student_count"])
    except (TypeError, ValueError):
        return jsonify({"message": "student_count must be a number"}), 400

    if student_count <= 0:
        return jsonify({"message": "student_count must be greater than 0"}), 400

    year = _parse_int(data.get("year"))
    section = (data.get("section") or "").strip() or None
    department = (data.get("department") or user.department or "").strip() or None
    if section:
        section = section.upper()
    if department:
        department = department.upper()
    semester = (data.get("semester") or "").strip()

    incoming_slots = data.get("slots")
    slots = []
    if isinstance(incoming_slots, list) and len(incoming_slots) > 0:
        for raw in incoming_slots:
            day = _normalize_day((raw or {}).get("day"))
            start_time = ((raw or {}).get("start_time") or "").strip()
            end_time = ((raw or {}).get("end_time") or "").strip()
            if not day:
                return jsonify({"message": "Each slot must have a valid day"}), 400
            if not _is_valid_time_range(start_time, end_time):
                return jsonify({"message": "Each slot must have valid start_time and end_time"}), 400
            slots.append({"day": day, "start_time": start_time, "end_time": end_time})
    else:
        day = _normalize_day(data.get("day"))
        start_time = (data.get("start_time") or "").strip()
        end_time = (data.get("end_time") or "").strip()
        if not day:
            return jsonify({"message": "Invalid day"}), 400
        if not _is_valid_time_range(start_time, end_time):
            return jsonify({"message": "start_time must be earlier than end_time"}), 400
        slots.append({"day": day, "start_time": start_time, "end_time": end_time})

    if len(slots) > 4:
        return jsonify({"message": "Maximum 4 classes per week are allowed"}), 400

    existing_count = FacultyPreference.query.filter(
        FacultyPreference.faculty_id == user.id,
        FacultyPreference.semester == semester,
        FacultyPreference.status != "rejected",
    ).count()
    if existing_count + len(slots) > 4:
        return jsonify({"message": f"Maximum 4 classes per week are allowed. You already have {existing_count} submitted."}), 400

    created = []
    subject = (data.get("subject") or "").strip()
    details = (data.get("details") or "").strip()

    for slot in slots:
        clash = FacultyPreference.query.filter(
            FacultyPreference.faculty_id == user.id,
            FacultyPreference.semester == semester,
            FacultyPreference.day == slot["day"],
            FacultyPreference.start_time == slot["start_time"],
            FacultyPreference.end_time == slot["end_time"],
            FacultyPreference.status != "rejected",
        ).first()
        if clash:
            return jsonify({"message": f"Duplicate slot found for {slot['day']} {slot['start_time']}-{slot['end_time']}"}), 400

        pref = FacultyPreference(
            faculty_id=user.id,
            day=slot["day"],
            subject=subject,
            student_count=student_count,
            start_time=slot["start_time"],
            end_time=slot["end_time"],
            semester=semester,
            department=department,
            year=year,
            section=section,
            details=details,
            status="pending",
        )
        db.session.add(pref)
        created.append(pref)

    db.session.commit()

    return jsonify({
        "message": "Preference submitted successfully",
        "count": len(created),
        "preferences": [_serialize_preference(pref) for pref in created],
    }), 201


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

    semester = (request.args.get("semester") or "").strip()
    query = FacultyPreference.query
    if semester:
        query = query.filter(FacultyPreference.semester == semester)
    prefs = query.order_by(FacultyPreference.created_at.desc()).all()
    return jsonify([_serialize_preference(pref) for pref in prefs]), 200


@preference_bp.route("/api/admin/preferences/<int:preference_id>", methods=["PATCH"])
@jwt_required()
def update_preference_status(preference_id):
    user = _get_current_user()
    if not user or user.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    pref = FacultyPreference.query.get(preference_id)
    if not pref:
        return jsonify({"message": "Preference not found"}), 404

    data = request.get_json() or {}

    if "status" in data:
        status = (data.get("status") or "").strip().lower()
        if status not in {"pending", "approved", "rejected"}:
            return jsonify({"message": "Invalid status"}), 400
        pref.status = status

    if "day" in data:
        day = _normalize_day(data.get("day"))
        if not day:
            return jsonify({"message": "Invalid day"}), 400
        pref.day = day
    if "subject" in data:
        subject = (data.get("subject") or "").strip()
        if not subject:
            return jsonify({"message": "Subject is required"}), 400
        pref.subject = subject
    if "student_count" in data:
        student_count = _parse_int(data.get("student_count"))
        if not student_count or student_count <= 0:
            return jsonify({"message": "student_count must be greater than 0"}), 400
        pref.student_count = student_count
    if "start_time" in data:
        start_time = (data.get("start_time") or "").strip()
        if not start_time:
            return jsonify({"message": "start_time is required"}), 400
        pref.start_time = start_time
    if "end_time" in data:
        end_time = (data.get("end_time") or "").strip()
        if not end_time:
            return jsonify({"message": "end_time is required"}), 400
        pref.end_time = end_time
    if "semester" in data:
        semester = (data.get("semester") or "").strip()
        if not semester:
            return jsonify({"message": "semester is required"}), 400
        pref.semester = semester
    if "department" in data:
        department = (data.get("department") or "").strip() or None
        pref.department = department.upper() if department else None
    if "year" in data:
        year = _parse_int(data.get("year"))
        pref.year = year
    if "section" in data:
        section = (data.get("section") or "").strip()
        pref.section = section.upper() if section else None
    if "details" in data:
        pref.details = (data.get("details") or "").strip()

    db.session.commit()
    _log_admin_activity(user.id, "preference_update", f"Preference #{pref.id} updated to {pref.status}")
    db.session.commit()
    return jsonify({"message": "Preference updated", "preference": _serialize_preference(pref)}), 200


@preference_bp.route("/api/admin/timetable/generate", methods=["POST"])
@jwt_required()
def generate_timetable_from_preferences():
    user = _get_current_user()
    if not user or user.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json(silent=True) or {}
    semester = (data.get("semester") or request.args.get("semester") or "").strip()

    query = FacultyPreference.query.filter_by(status="approved")
    if semester:
        query = query.filter(FacultyPreference.semester == semester)

    approved = query.order_by(
        FacultyPreference.day.asc(),
        FacultyPreference.start_time.asc(),
        FacultyPreference.student_count.desc(),
    ).all()
    if not approved:
        return jsonify({"message": "No approved preferences found", "timetable": []}), 200

    draft_slots = [_build_timetable_slot_from_preference(pref) for pref in approved]
    timetable, unassigned = _auto_assign_rooms_for_slots(draft_slots)
    if not semester and timetable:
        semester = timetable[0]["semester"]

    faculty_summary = {}
    for slot in timetable:
        faculty_id = slot.get("faculty_id")
        if faculty_id is None:
            continue
        key = str(faculty_id)
        if key not in faculty_summary:
            faculty_summary[key] = {
                "faculty_id": faculty_id,
                "faculty_name": slot.get("faculty_name") or "Faculty",
                "total_slots": 0,
            }
        faculty_summary[key]["total_slots"] += 1

    return jsonify({
        "message": "Timetable draft generated with clash-free auto room allocation",
        "semester": semester,
        "total_requested": len(draft_slots),
        "total_slots": len(timetable),
        "total_unassigned": len(unassigned),
        "unassigned": unassigned,
        "faculty_summary": list(faculty_summary.values()),
        "timetable": timetable,
    }), 200


@preference_bp.route("/api/admin/timetable/publish", methods=["POST"])
@jwt_required()
def publish_timetable():
    user = _get_current_user()
    if not user or user.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json() or {}
    semester = (data.get("semester") or "").strip()
    slots = data.get("slots") or []

    if not semester:
        return jsonify({"message": "semester is required"}), 400

    if not isinstance(slots, list) or len(slots) == 0:
        return jsonify({"message": "slots must be a non-empty array"}), 400

    room_map = {r.name: r for r in Room.query.filter_by(is_active=True).all()}
    occupancy = {}
    prepared = []

    for slot in slots:
        pref_id = _parse_int(slot.get("source_preference_id"))
        if not pref_id:
            return jsonify({"message": "Each slot must include source_preference_id"}), 400

        pref = FacultyPreference.query.get(pref_id)
        if not pref:
            return jsonify({"message": f"Preference {pref_id} not found"}), 404

        room_name = (slot.get("room") or "").strip()
        if not room_name:
            return jsonify({"message": f"Room is required for preference {pref_id}"}), 400

        room_meta = room_map.get(room_name)
        if not room_meta:
            return jsonify({"message": f"Room {room_name} is not active or does not exist"}), 400

        if pref.student_count and room_meta.capacity < pref.student_count:
            return jsonify({
                "message": f"Room {room_name} capacity is less than student count for preference {pref_id}"
            }), 400

        for booked in occupancy.get(room_name, []):
            if booked["day"] != pref.day:
                continue
            if _times_overlap(pref.start_time, pref.end_time, booked["start_time"], booked["end_time"]):
                return jsonify({
                    "message": (
                        f"Room conflict in {room_name}: "
                        f"{pref.day} {pref.start_time}-{pref.end_time}"
                    )
                }), 400

        occupancy.setdefault(room_name, []).append(
            {"day": pref.day, "start_time": pref.start_time, "end_time": pref.end_time}
        )
        prepared.append((pref, room_name, room_meta.capacity))

    TimetableSlot.query.filter_by(semester=semester).delete()

    created = []
    for pref, room_name, room_capacity in prepared:
        built = _build_timetable_slot_from_preference(
            pref,
            room_name=room_name,
            room_capacity=room_capacity,
        )

        timetable_slot = TimetableSlot(
            semester=semester,
            day=built["day"],
            subject=built["subject"],
            faculty_id=built["faculty_id"],
            department=built["department"],
            year=built["year"],
            section=built["section"],
            student_count=built["student_count"],
            start_time=built["start_time"],
            end_time=built["end_time"],
            room=built["room"],
            room_capacity=built["room_capacity"],
            source_preference_id=built["source_preference_id"],
        )
        db.session.add(timetable_slot)
        created.append(timetable_slot)

    db.session.commit()
    _log_admin_activity(user.id, "timetable_publish", f"Published timetable for {semester} ({len(created)} slots)")
    db.session.commit()
    return jsonify({
        "message": "Timetable published successfully",
        "semester": semester,
        "total_slots": len(created),
        "timetable": [_serialize_timetable_slot(slot) for slot in created],
    }), 200


@preference_bp.route("/api/admin/timetable", methods=["GET"])
@jwt_required()
def get_admin_timetable():
    user = _get_current_user()
    if not user or user.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    semester = (request.args.get("semester") or "").strip()
    query = TimetableSlot.query
    if semester:
        query = query.filter(TimetableSlot.semester == semester)
    slots = query.order_by(TimetableSlot.day.asc(), TimetableSlot.start_time.asc()).all()
    return jsonify([_serialize_timetable_slot(slot) for slot in slots]), 200


@preference_bp.route("/api/admin/rooms", methods=["GET"])
@jwt_required()
def get_rooms():
    user = _get_current_user()
    if not user or user.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    include_inactive = (request.args.get("include_inactive") or "").strip().lower() == "true"
    query = Room.query
    if not include_inactive:
        query = query.filter(Room.is_active == True)  # noqa: E712
    rooms = query.order_by(Room.name.asc()).all()
    return jsonify([_serialize_room(room) for room in rooms]), 200


@preference_bp.route("/api/admin/rooms", methods=["POST"])
@jwt_required()
def create_room():
    user = _get_current_user()
    if not user or user.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json() or {}
    name = (data.get("name") or "").strip().upper()
    capacity = _parse_int(data.get("capacity"))
    if not name:
        return jsonify({"message": "Room name is required"}), 400
    if not capacity or capacity <= 0:
        return jsonify({"message": "capacity must be greater than 0"}), 400

    existing = Room.query.filter(Room.name.ilike(name)).first()
    if existing:
        return jsonify({"message": "Room already exists"}), 400

    room = Room(name=name, capacity=capacity, is_active=True)
    db.session.add(room)
    db.session.commit()
    _log_admin_activity(user.id, "room_create", f"Created room {room.name} (capacity {room.capacity})")
    db.session.commit()
    return jsonify({"message": "Room created", "room": _serialize_room(room)}), 201


@preference_bp.route("/api/admin/rooms/<int:room_id>", methods=["PATCH"])
@jwt_required()
def update_room(room_id):
    user = _get_current_user()
    if not user or user.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    room = Room.query.get(room_id)
    if not room:
        return jsonify({"message": "Room not found"}), 404

    data = request.get_json() or {}
    if "name" in data:
        name = (data.get("name") or "").strip().upper()
        if not name:
            return jsonify({"message": "Room name cannot be empty"}), 400
        duplicate = Room.query.filter(Room.name.ilike(name), Room.id != room.id).first()
        if duplicate:
            return jsonify({"message": "Room name already exists"}), 400
        room.name = name
    if "capacity" in data:
        capacity = _parse_int(data.get("capacity"))
        if not capacity or capacity <= 0:
            return jsonify({"message": "capacity must be greater than 0"}), 400
        room.capacity = capacity
    if "is_active" in data:
        try:
            room.is_active = _to_bool(data.get("is_active"))
        except ValueError:
            return jsonify({"message": "is_active must be true or false"}), 400

    db.session.commit()
    _log_admin_activity(user.id, "room_update", f"Updated room {room.name}")
    db.session.commit()
    return jsonify({"message": "Room updated", "room": _serialize_room(room)}), 200


@preference_bp.route("/api/admin/rooms/<int:room_id>", methods=["DELETE"])
@jwt_required()
def delete_room(room_id):
    user = _get_current_user()
    if not user or user.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    room = Room.query.get(room_id)
    if not room:
        return jsonify({"message": "Room not found"}), 404

    in_use = TimetableSlot.query.filter(TimetableSlot.room == room.name).first()
    if in_use:
        return jsonify({"message": "Room is used in published timetable. Mark inactive instead."}), 400

    deleted_name = room.name
    db.session.delete(room)
    db.session.commit()
    _log_admin_activity(user.id, "room_delete", f"Deleted room {deleted_name}")
    db.session.commit()
    return jsonify({"message": "Room deleted"}), 200


@preference_bp.route("/api/admin/rooms/availability", methods=["GET"])
@jwt_required()
def get_room_availability():
    user = _get_current_user()
    if not user or user.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    day = _normalize_day(request.args.get("day"))
    start_time = (request.args.get("start_time") or "").strip()
    end_time = (request.args.get("end_time") or "").strip()
    semester = (request.args.get("semester") or "").strip()

    if not day:
        return jsonify({"message": "Valid day is required"}), 400
    if not _is_valid_time_range(start_time, end_time):
        return jsonify({"message": "start_time and end_time are required and start_time must be earlier"}), 400

    rooms = Room.query.filter_by(is_active=True).order_by(Room.name.asc()).all()
    query = TimetableSlot.query.filter(TimetableSlot.day == day)
    if semester:
        query = query.filter(TimetableSlot.semester == semester)
    slots = query.all()

    result = []
    for room in rooms:
        overlaps = []
        for slot in slots:
            if slot.room != room.name:
                continue
            if slot.start_time < end_time and slot.end_time > start_time:
                overlaps.append(_serialize_timetable_slot(slot))
        result.append({
            "room": _serialize_room(room),
            "is_vacant": len(overlaps) == 0,
            "occupied_slots": overlaps,
        })

    return jsonify({
        "day": day,
        "start_time": start_time,
        "end_time": end_time,
        "semester": semester,
        "rooms": result,
    }), 200


@preference_bp.route("/api/admin/rooms/occupancy", methods=["GET"])
@jwt_required()
def get_room_occupancy():
    user = _get_current_user()
    if not user or user.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    semester = (request.args.get("semester") or "").strip()
    query = TimetableSlot.query
    if semester:
        query = query.filter(TimetableSlot.semester == semester)
    slots = query.order_by(TimetableSlot.day.asc(), TimetableSlot.start_time.asc()).all()

    occupancy = {}
    for slot in slots:
        occupancy.setdefault(slot.room, []).append(_serialize_timetable_slot(slot))

    return jsonify({
        "semester": semester,
        "occupancy": occupancy,
    }), 200


@preference_bp.route("/api/admin/rooms/live-status", methods=["GET"])
@jwt_required()
def get_room_live_status():
    user = _get_current_user()
    if not user or user.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    semester = (request.args.get("semester") or "").strip()
    return jsonify(_build_room_live_status_payload(semester)), 200


@preference_bp.route("/api/faculty/rooms/live-status", methods=["GET"])
@jwt_required()
def get_faculty_room_live_status():
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    semester = (request.args.get("semester") or "").strip()
    return jsonify(_build_room_live_status_payload(semester)), 200


@preference_bp.route("/api/faculty/timetable/me", methods=["GET"])
@jwt_required()
def get_faculty_timetable():
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    semester = (request.args.get("semester") or "").strip()
    query = TimetableSlot.query.filter(TimetableSlot.faculty_id == user.id)
    if semester:
        query = query.filter(TimetableSlot.semester == semester)
    slots = query.order_by(TimetableSlot.day.asc(), TimetableSlot.start_time.asc()).all()
    return jsonify([_serialize_timetable_slot(slot) for slot in slots]), 200


@preference_bp.route("/api/faculty/timetable/today", methods=["GET"])
@jwt_required()
def get_faculty_timetable_today():
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    day = _normalize_day(request.args.get("day")) or datetime.utcnow().strftime("%A")
    semester = (request.args.get("semester") or "").strip()
    query = TimetableSlot.query.filter(
        TimetableSlot.faculty_id == user.id,
        TimetableSlot.day == day,
    )
    if semester:
        query = query.filter(TimetableSlot.semester == semester)
    slots = query.order_by(TimetableSlot.start_time.asc()).all()
    return jsonify({"day": day, "slots": [_serialize_timetable_slot(slot) for slot in slots]}), 200


@preference_bp.route("/api/faculty/timetable/institute", methods=["GET"])
@jwt_required()
def get_faculty_institute_timetable():
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    semester = (request.args.get("semester") or "").strip()
    query = TimetableSlot.query
    if semester:
        query = query.filter(TimetableSlot.semester == semester)
    slots = query.order_by(
        TimetableSlot.department.asc(),
        TimetableSlot.year.asc(),
        TimetableSlot.section.asc(),
        TimetableSlot.day.asc(),
        TimetableSlot.start_time.asc(),
    ).all()
    return jsonify([_serialize_timetable_slot(slot) for slot in slots]), 200


@preference_bp.route("/api/student/timetable/my", methods=["GET"])
@jwt_required()
def get_student_timetable():
    user = _get_current_user()
    if not user or user.role != "student":
        return jsonify({"message": "Forbidden"}), 403

    semester = (request.args.get("semester") or "").strip()
    query = TimetableSlot.query
    if user.department:
        query = query.filter(TimetableSlot.department.ilike(user.department))
    if user.year:
        query = query.filter(TimetableSlot.year == user.year)
    if user.section:
        query = query.filter(TimetableSlot.section == user.section)
    if semester:
        query = query.filter(TimetableSlot.semester == semester)

    slots = query.order_by(TimetableSlot.day.asc(), TimetableSlot.start_time.asc()).all()
    return jsonify({
        "student": {
            "department": user.department,
            "year": user.year,
            "section": user.section,
        },
        "timetable": [_serialize_timetable_slot(slot) for slot in slots],
    }), 200


@preference_bp.route("/api/student/timetable/institute", methods=["GET"])
@jwt_required()
def get_institute_timetable():
    user = _get_current_user()
    if not user or user.role != "student":
        return jsonify({"message": "Forbidden"}), 403

    semester = (request.args.get("semester") or "").strip()
    query = TimetableSlot.query
    if semester:
        query = query.filter(TimetableSlot.semester == semester)
    slots = query.order_by(
        TimetableSlot.department.asc(),
        TimetableSlot.year.asc(),
        TimetableSlot.section.asc(),
        TimetableSlot.day.asc(),
        TimetableSlot.start_time.asc(),
    ).all()
    return jsonify([_serialize_timetable_slot(slot) for slot in slots]), 200


@preference_bp.route("/api/student/rooms/live-status", methods=["GET"])
@jwt_required()
def get_student_room_live_status():
    user = _get_current_user()
    if not user or user.role != "student":
        return jsonify({"message": "Forbidden"}), 403

    semester = (request.args.get("semester") or "").strip()
    return jsonify(_build_room_live_status_payload(semester)), 200


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


@preference_bp.route("/api/student/profile", methods=["GET"])
@jwt_required()
def get_student_profile():
    user = _get_current_user()
    if not user or user.role != "student":
        return jsonify({"message": "Forbidden"}), 403
    return jsonify(_serialize_student_profile(user)), 200


@preference_bp.route("/api/student/profile", methods=["PATCH"])
@jwt_required()
def update_student_profile():
    user = _get_current_user()
    if not user or user.role != "student":
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    department = (data.get("department") or "").strip()
    roll_number = (data.get("roll_number") or "").strip()
    year = _parse_int(data.get("year"))
    section = (data.get("section") or "").strip()

    if not name:
        return jsonify({"message": "name is required"}), 400
    if len(name) > 100:
        return jsonify({"message": "name must be 100 characters or fewer"}), 400
    if not department:
        return jsonify({"message": "department is required"}), 400
    if len(department) > 50:
        return jsonify({"message": "department must be 50 characters or fewer"}), 400
    if not roll_number:
        return jsonify({"message": "roll_number is required"}), 400
    duplicate = User.query.filter(User.roll_number == roll_number, User.id != user.id).first()
    if duplicate:
        return jsonify({"message": "roll_number already exists"}), 400
    if year is not None and year <= 0:
        return jsonify({"message": "year must be a positive number"}), 400

    user.name = name
    user.department = department
    user.roll_number = roll_number
    user.year = year
    user.section = section.upper() if section else None
    db.session.commit()
    return jsonify({"message": "Profile updated successfully", "profile": _serialize_student_profile(user)}), 200


@preference_bp.route("/api/student/profile/photo", methods=["POST"])
@jwt_required()
def upload_student_profile_photo():
    user = _get_current_user()
    if not user or user.role != "student":
        return jsonify({"message": "Forbidden"}), 403

    file = request.files.get("file") or request.files.get("photo")
    if not file or not file.filename:
        return jsonify({"message": "file is required"}), 400

    filename = secure_filename(file.filename)
    if not filename:
        return jsonify({"message": "Invalid filename"}), 400

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in {"png", "jpg", "jpeg", "webp"}:
        return jsonify({"message": "Photo must be PNG/JPG/JPEG/WEBP"}), 400

    # Enforce a reasonable upload limit (5 MB) for profile pictures.
    file.stream.seek(0, os.SEEK_END)
    size = file.stream.tell()
    file.stream.seek(0)
    if size > 5 * 1024 * 1024:
        return jsonify({"message": "Photo must be 5 MB or smaller"}), 400

    unique_name = f"{uuid.uuid4().hex}_{filename}"
    upload_path = os.path.join(current_app.config["UPLOAD_FOLDER"], unique_name)
    file.save(upload_path)

    user.profile_image = f"/uploads/{unique_name}"
    db.session.commit()

    return jsonify({
        "message": "Profile photo uploaded successfully",
        "profile": _serialize_student_profile(user)
    }), 200


@preference_bp.route("/api/student/profile/photo", methods=["DELETE"])
@jwt_required()
def delete_student_profile_photo():
    user = _get_current_user()
    if not user or user.role != "student":
        return jsonify({"message": "Forbidden"}), 403

    if not user.profile_image:
        return jsonify({"message": "No profile photo to remove", "profile": _serialize_student_profile(user)}), 200

    old_path = user.profile_image
    user.profile_image = None
    db.session.commit()

    try:
        filename = os.path.basename(old_path)
        file_path = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
        if os.path.isfile(file_path):
            os.remove(file_path)
    except OSError:
        pass

    return jsonify({
        "message": "Profile photo removed successfully",
        "profile": _serialize_student_profile(user)
    }), 200


@preference_bp.route("/api/student/settings", methods=["GET"])
@jwt_required()
def get_student_settings():
    user = _get_current_user()
    if not user or user.role != "student":
        return jsonify({"message": "Forbidden"}), 403

    settings = _get_or_create_student_settings(user.id)
    return jsonify({"settings": _serialize_student_settings(settings)}), 200


@preference_bp.route("/api/student/settings", methods=["PUT"])
@jwt_required()
def update_student_settings():
    user = _get_current_user()
    if not user or user.role != "student":
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json() or {}
    settings = _get_or_create_student_settings(user.id)

    try:
        if "email_notifications" in data:
            settings.email_notifications = _to_bool(data["email_notifications"])
        if "exam_alerts" in data:
            settings.exam_alerts = _to_bool(data["exam_alerts"])
        if "assignment_reminders" in data:
            settings.assignment_reminders = _to_bool(data["assignment_reminders"])
        if "show_attendance_widget" in data:
            settings.show_attendance_widget = _to_bool(data["show_attendance_widget"])
    except ValueError:
        return jsonify({"message": "Boolean settings must be true or false"}), 400

    if "dashboard_density" in data:
        density = (data.get("dashboard_density") or "").strip().lower()
        if density not in {"comfortable", "compact"}:
            return jsonify({"message": "Invalid dashboard_density"}), 400
        settings.dashboard_density = density

    if "language" in data:
        language = (data.get("language") or "").strip()
        if language not in {"English", "Hindi"}:
            return jsonify({"message": "Invalid language"}), 400
        settings.language = language

    if "week_start" in data:
        week_start = (data.get("week_start") or "").strip()
        if week_start not in {"Monday", "Sunday"}:
            return jsonify({"message": "Invalid week_start"}), 400
        settings.week_start = week_start

    db.session.commit()
    return jsonify({
        "message": "Settings updated successfully",
        "settings": _serialize_student_settings(settings),
    }), 200


@preference_bp.route("/api/student/settings/reset", methods=["POST"])
@jwt_required()
def reset_student_settings():
    user = _get_current_user()
    if not user or user.role != "student":
        return jsonify({"message": "Forbidden"}), 403

    settings = _get_or_create_student_settings(user.id)
    for key, value in DEFAULT_STUDENT_SETTINGS.items():
        setattr(settings, key, value)

    db.session.commit()
    return jsonify({
        "message": "Settings reset to defaults",
        "settings": _serialize_student_settings(settings),
    }), 200


@preference_bp.route("/api/admin/users", methods=["GET"])
@jwt_required()
def get_admin_users():
    user = _get_current_user()
    if not user or user.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    role_filter = (request.args.get("role") or "").strip().lower()
    q = (request.args.get("q") or "").strip().lower()

    query = User.query
    if role_filter in {"student", "faculty", "admin"}:
        query = query.filter(User.role == role_filter)

    users = query.order_by(User.role.asc(), User.name.asc()).all()
    rows = [_serialize_admin_user(u) for u in users]

    if q:
        rows = [
            row for row in rows
            if q in (row.get("name") or "").lower()
            or q in (row.get("email") or "").lower()
            or q in (row.get("department") or "").lower()
            or q in (row.get("roll_number") or "").lower()
        ]

    return jsonify(rows), 200


@preference_bp.route("/api/admin/messages", methods=["GET"])
@jwt_required()
def get_admin_messages():
    user = _get_current_user()
    if not user or user.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    recipient_role = (request.args.get("recipient_role") or "").strip().lower()
    query = AdminMessage.query
    if recipient_role in {"student", "faculty", "all"}:
        query = query.filter(AdminMessage.recipient_role == recipient_role)

    rows = query.order_by(AdminMessage.created_at.desc()).all()
    return jsonify([_serialize_admin_message(row) for row in rows]), 200


@preference_bp.route("/api/admin/messages", methods=["POST"])
@jwt_required()
def create_admin_message():
    user = _get_current_user()
    if not user or user.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json() or {}
    recipient_role = (data.get("recipient_role") or "").strip().lower()
    subject = (data.get("subject") or "").strip()
    body = (data.get("body") or "").strip()

    if recipient_role not in {"student", "faculty", "all"}:
        return jsonify({"message": "recipient_role must be student, faculty, or all"}), 400
    if not subject:
        return jsonify({"message": "subject is required"}), 400
    if not body:
        return jsonify({"message": "body is required"}), 400

    row = AdminMessage(
        sender_id=user.id,
        recipient_role=recipient_role,
        subject=subject,
        body=body,
    )
    db.session.add(row)
    db.session.commit()
    _log_admin_activity(user.id, "announcement_send", f"Sent announcement to {recipient_role}: {subject}")
    db.session.commit()
    return jsonify({"message": "Announcement sent", "data": _serialize_admin_message(row)}), 201


@preference_bp.route("/api/messages/inbox", methods=["GET"])
@jwt_required()
def get_role_inbox_messages():
    user = _get_current_user()
    if not user:
        return jsonify({"message": "Unauthorized"}), 401
    if user.role not in {"student", "faculty", "admin"}:
        return jsonify({"message": "Forbidden"}), 403

    query = AdminMessage.query
    if user.role == "admin":
        query = query.filter(AdminMessage.recipient_role == "all")
    else:
        query = query.filter(
            AdminMessage.recipient_role.in_([user.role, "all"])
        )

    rows = query.order_by(AdminMessage.created_at.desc()).all()
    return jsonify([_serialize_admin_message(row) for row in rows]), 200


@preference_bp.route("/api/faculty/directory", methods=["GET"])
@jwt_required()
def get_faculty_directory():
    user = _get_current_user()
    if not user:
        return jsonify({"message": "Unauthorized"}), 401
    if user.role not in {"faculty", "student"}:
        return jsonify({"message": "Forbidden"}), 403

    q = (request.args.get("q") or "").strip().lower()
    query = User.query.filter(User.role == "faculty")
    if user.role == "faculty":
        query = query.filter(User.id != user.id)
    rows = query.order_by(User.name.asc()).all()
    items = [_serialize_faculty_directory_user(row) for row in rows]
    if q:
        items = [
            row for row in items
            if q in (row.get("name") or "").lower()
            or q in (row.get("email") or "").lower()
            or q in (row.get("department") or "").lower()
        ]
    return jsonify(items), 200


@preference_bp.route("/api/faculty/messages", methods=["POST"])
@jwt_required()
def create_faculty_peer_message():
    user = _get_current_user()
    if not user:
        return jsonify({"message": "Unauthorized"}), 401
    if user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json() or {}
    recipient_id = _parse_int(data.get("recipient_id"))
    subject = (data.get("subject") or "").strip()
    body = (data.get("body") or "").strip()

    if not recipient_id:
        return jsonify({"message": "recipient_id is required"}), 400
    if recipient_id == user.id:
        return jsonify({"message": "You cannot message yourself"}), 400
    if not subject:
        return jsonify({"message": "subject is required"}), 400
    if len(subject) > 160:
        return jsonify({"message": "subject must be 160 characters or fewer"}), 400
    if not body:
        return jsonify({"message": "body is required"}), 400

    recipient = User.query.get(recipient_id)
    if not recipient or recipient.role != "faculty":
        return jsonify({"message": "Recipient faculty not found"}), 404

    row = FacultyPeerMessage(
        sender_id=user.id,
        recipient_id=recipient.id,
        subject=subject,
        body=body,
    )
    db.session.add(row)
    db.session.commit()
    return jsonify({"message": "Message sent to faculty.", "data": _serialize_faculty_peer_message(row)}), 201


@preference_bp.route("/api/faculty/messages/inbox", methods=["GET"])
@jwt_required()
def get_faculty_peer_inbox():
    user = _get_current_user()
    if not user:
        return jsonify({"message": "Unauthorized"}), 401
    if user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    rows = (
        FacultyPeerMessage.query
        .filter(FacultyPeerMessage.recipient_id == user.id)
        .order_by(FacultyPeerMessage.created_at.desc())
        .all()
    )
    return jsonify([_serialize_faculty_peer_message(row) for row in rows]), 200


@preference_bp.route("/api/messages/queries", methods=["POST"])
@jwt_required()
def create_support_query():
    user = _get_current_user()
    if not user:
        return jsonify({"message": "Unauthorized"}), 401
    if user.role not in {"student", "faculty"}:
        return jsonify({"message": "Only students and faculty can raise queries"}), 403

    data = request.form if request.form else (request.get_json() or {})
    subject = (data.get("subject") or "").strip()
    body = (data.get("body") or "").strip()
    category = (data.get("category") or "general").strip().lower()
    priority = (data.get("priority") or "normal").strip().lower()
    valid_categories = {"general", "academic", "technical", "administrative"}
    valid_priorities = {"low", "normal", "high"}

    if not subject:
        return jsonify({"message": "subject is required"}), 400
    if len(subject) > 160:
        return jsonify({"message": "subject must be 160 characters or fewer"}), 400
    if not body:
        return jsonify({"message": "body is required"}), 400
    if category not in valid_categories:
        return jsonify({"message": "category must be general, academic, technical, or administrative"}), 400
    if priority not in valid_priorities:
        return jsonify({"message": "priority must be low, normal, or high"}), 400

    attachment = request.files.get("attachment")
    attachment_path = None
    attachment_name = None
    attachment_mime = None
    if attachment and attachment.filename:
        safe_name = secure_filename(attachment.filename)
        if not safe_name:
            return jsonify({"message": "Invalid attachment filename"}), 400

        allowed_ext = {"png", "jpg", "jpeg", "webp"}
        ext = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else ""
        if ext not in allowed_ext:
            return jsonify({"message": "Only PNG, JPG, JPEG, and WEBP images are allowed"}), 400

        mime = (attachment.mimetype or "").lower()
        if not mime.startswith("image/"):
            return jsonify({"message": "Attachment must be an image file"}), 400

        # 5 MB max for query screenshots.
        attachment.stream.seek(0, os.SEEK_END)
        size_bytes = attachment.stream.tell()
        attachment.stream.seek(0)
        if size_bytes > 5 * 1024 * 1024:
            return jsonify({"message": "Image size must be 5 MB or less"}), 400

        unique_name = f"query_{uuid.uuid4().hex}_{safe_name}"
        upload_path = os.path.join(current_app.config["UPLOAD_FOLDER"], unique_name)
        attachment.save(upload_path)
        attachment_path = f"/uploads/{unique_name}"
        attachment_name = safe_name
        attachment_mime = mime

    row = SupportQuery(
        sender_id=user.id,
        sender_role=user.role,
        subject=subject,
        body=body,
        category=category,
        priority=priority,
        status="open",
        attachment_path=attachment_path,
        attachment_name=attachment_name,
        attachment_mime=attachment_mime,
    )
    db.session.add(row)
    db.session.commit()
    return jsonify({"message": "Your query has been sent to admin.", "data": _serialize_support_query(row)}), 201


@preference_bp.route("/api/messages/queries/me", methods=["GET"])
@jwt_required()
def get_my_support_queries():
    user = _get_current_user()
    if not user:
        return jsonify({"message": "Unauthorized"}), 401
    if user.role not in {"student", "faculty"}:
        return jsonify({"message": "Forbidden"}), 403

    rows = (
        SupportQuery.query
        .filter(SupportQuery.sender_id == user.id)
        .order_by(SupportQuery.created_at.desc())
        .all()
    )
    return jsonify([_serialize_support_query(row) for row in rows]), 200


@preference_bp.route("/api/admin/messages/queries", methods=["GET"])
@jwt_required()
def get_admin_support_queries():
    user = _get_current_user()
    if not user or user.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    status = (request.args.get("status") or "").strip().lower()
    sender_role = (request.args.get("sender_role") or "").strip().lower()
    priority = (request.args.get("priority") or "").strip().lower()

    query = SupportQuery.query
    if status in {"open", "in_progress", "resolved", "closed"}:
        query = query.filter(SupportQuery.status == status)
    if sender_role in {"student", "faculty"}:
        query = query.filter(SupportQuery.sender_role == sender_role)
    if priority in {"low", "normal", "high"}:
        query = query.filter(SupportQuery.priority == priority)

    rows = query.order_by(SupportQuery.created_at.desc()).all()
    return jsonify([_serialize_support_query(row) for row in rows]), 200


@preference_bp.route("/api/admin/messages/queries/<int:query_id>", methods=["PATCH"])
@jwt_required()
def update_admin_support_query(query_id):
    user = _get_current_user()
    if not user or user.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    row = SupportQuery.query.get(query_id)
    if not row:
        return jsonify({"message": "Query not found"}), 404

    data = request.get_json() or {}
    status = data.get("status")
    admin_note = data.get("admin_note")
    valid_statuses = {"open", "in_progress", "resolved", "closed"}

    if status is not None:
        status = str(status).strip().lower()
        if status not in valid_statuses:
            return jsonify({"message": "status must be open, in_progress, resolved, or closed"}), 400
        row.status = status
        if status == "resolved":
            row.resolved_at = datetime.utcnow()
        elif status in {"open", "in_progress"}:
            row.resolved_at = None

    if admin_note is not None:
        row.admin_note = str(admin_note).strip() or None

    db.session.commit()
    _log_admin_activity(user.id, "query_update", f"Updated support query #{row.id} to {row.status}")
    db.session.commit()
    return jsonify({"message": "Query updated", "data": _serialize_support_query(row)}), 200


@preference_bp.route("/api/admin/conflicts", methods=["GET"])
@jwt_required()
def get_admin_conflicts():
    user = _get_current_user()
    if not user or user.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    status = (request.args.get("status") or "").strip().lower()
    query = ConflictRequest.query
    if status in {"pending", "resolved"}:
        query = query.filter(ConflictRequest.status == status)
    rows = query.order_by(ConflictRequest.created_at.desc()).all()
    return jsonify([_serialize_conflict(row) for row in rows]), 200


@preference_bp.route("/api/faculty/conflicts", methods=["GET"])
@jwt_required()
def get_faculty_conflicts():
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    rows = (
        ConflictRequest.query
        .filter(ConflictRequest.created_by == user.id)
        .order_by(ConflictRequest.created_at.desc())
        .all()
    )
    return jsonify([_serialize_conflict(row) for row in rows]), 200


@preference_bp.route("/api/faculty/conflicts", methods=["POST"])
@jwt_required()
def create_faculty_conflict():
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    if not title:
        return jsonify({"message": "title is required"}), 400

    row = ConflictRequest(
        title=title[:160],
        description=description or None,
        status="pending",
        created_by=user.id,
    )
    db.session.add(row)
    db.session.commit()
    return jsonify({"message": "Conflict request submitted successfully.", "data": _serialize_conflict(row)}), 201


@preference_bp.route("/api/admin/conflicts", methods=["POST"])
@jwt_required()
def create_admin_conflict():
    user = _get_current_user()
    if not user or user.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    if not title:
        return jsonify({"message": "title is required"}), 400

    row = ConflictRequest(
        title=title,
        description=description or None,
        status="pending",
        created_by=user.id,
    )
    db.session.add(row)
    db.session.commit()
    _log_admin_activity(user.id, "conflict_create", f"Opened conflict: {title}")
    db.session.commit()
    return jsonify({"message": "Conflict created", "data": _serialize_conflict(row)}), 201


@preference_bp.route("/api/admin/conflicts/<int:conflict_id>/resolve", methods=["PATCH"])
@jwt_required()
def resolve_admin_conflict(conflict_id):
    user = _get_current_user()
    if not user or user.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    row = ConflictRequest.query.get(conflict_id)
    if not row:
        return jsonify({"message": "Conflict not found"}), 404

    row.status = "resolved"
    row.resolved_at = datetime.utcnow()
    db.session.commit()
    _log_admin_activity(user.id, "conflict_resolve", f"Resolved conflict #{row.id}: {row.title}")
    db.session.commit()
    return jsonify({"message": "Conflict resolved", "data": _serialize_conflict(row)}), 200


@preference_bp.route("/api/student/course-enrollments", methods=["GET"])
@jwt_required()
def get_student_course_enrollments():
    user = _get_current_user()
    if not user or user.role != "student":
        return jsonify({"message": "Forbidden"}), 403

    rows = (
        CourseEnrollment.query
        .filter(CourseEnrollment.student_id == user.id)
        .order_by(CourseEnrollment.created_at.desc())
        .all()
    )
    return jsonify([_serialize_course_enrollment(row) for row in rows]), 200


@preference_bp.route("/api/student/course-enrollments", methods=["POST"])
@jwt_required()
def create_student_course_enrollment():
    user = _get_current_user()
    if not user or user.role != "student":
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json() or {}
    faculty_id = _parse_int(data.get("faculty_id"))
    subject = (data.get("subject") or "").strip()
    semester = (data.get("semester") or "").strip() or None

    if not faculty_id:
        return jsonify({"message": "faculty_id is required"}), 400
    if not subject:
        return jsonify({"message": "subject is required"}), 400

    faculty = User.query.get(faculty_id)
    if not faculty or faculty.role != "faculty":
        return jsonify({"message": "Faculty not found"}), 404

    query = CourseEnrollment.query.filter(
        CourseEnrollment.student_id == user.id,
        CourseEnrollment.faculty_id == faculty_id,
        func.lower(CourseEnrollment.subject) == _normalize_text_key(subject),
    )
    if semester:
        query = query.filter(CourseEnrollment.semester == semester)
    else:
        query = query.filter(CourseEnrollment.semester.is_(None))

    if query.first():
        return jsonify({"message": "You are already enrolled in this course."}), 400

    row = CourseEnrollment(
        student_id=user.id,
        faculty_id=faculty_id,
        subject=subject,
        semester=semester,
    )
    db.session.add(row)
    db.session.commit()
    return jsonify({"message": "Course enrollment created.", "data": _serialize_course_enrollment(row)}), 201


@preference_bp.route("/api/student/course-enrollments/<int:enrollment_id>", methods=["DELETE"])
@jwt_required()
def delete_student_course_enrollment(enrollment_id):
    user = _get_current_user()
    if not user or user.role != "student":
        return jsonify({"message": "Forbidden"}), 403

    row = CourseEnrollment.query.get(enrollment_id)
    if not row:
        return jsonify({"message": "Enrollment not found"}), 404
    if row.student_id != user.id:
        return jsonify({"message": "Forbidden"}), 403

    db.session.delete(row)
    db.session.commit()
    return jsonify({"message": "Enrollment removed."}), 200


@preference_bp.route("/api/faculty/classrooms", methods=["POST"])
@jwt_required()
def create_faculty_classroom():
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    data = request.form if request.form else (request.get_json() or {})
    title = (data.get("title") or "").strip()
    subject = (data.get("subject") or "").strip()
    join_link = (data.get("join_link") or "").strip()
    semester = (data.get("semester") or "").strip() or None
    department = (data.get("department") or user.department or "").strip() or None
    year = _parse_int(data.get("year"))
    section = (data.get("section") or "").strip() or None
    description = (data.get("description") or "").strip() or None

    if not title:
        return jsonify({"message": "title is required"}), 400
    if len(title) > 200:
        return jsonify({"message": "title must be 200 characters or fewer"}), 400
    if not subject:
        return jsonify({"message": "subject is required"}), 400
    if not join_link:
        join_link = "https://classroom.google.com"
    elif not (join_link.startswith("http://") or join_link.startswith("https://")):
        return jsonify({"message": "join_link must start with http:// or https://"}), 400
    if year is not None and (year < 1 or year > 8):
        return jsonify({"message": "year must be between 1 and 8"}), 400

    cover = request.files.get("cover_image")
    cover_image_path = None
    cover_image_name = None
    cover_image_mime = None
    if cover and cover.filename:
        safe_name = secure_filename(cover.filename)
        if not safe_name:
            return jsonify({"message": "Invalid cover image filename"}), 400
        ext = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else ""
        if ext not in {"png", "jpg", "jpeg", "webp"}:
            return jsonify({"message": "Cover image must be png/jpg/jpeg/webp"}), 400
        if not (cover.mimetype or "").lower().startswith("image/"):
            return jsonify({"message": "Cover must be an image"}), 400
        unique_name = f"classroom_{uuid.uuid4().hex}_{safe_name}"
        upload_path = os.path.join(current_app.config["UPLOAD_FOLDER"], unique_name)
        cover.save(upload_path)
        cover_image_path = f"/uploads/{unique_name}"
        cover_image_name = safe_name
        cover_image_mime = cover.mimetype

    row = Classroom(
        faculty_id=user.id,
        title=title,
        subject=subject,
        semester=semester,
        department=department,
        year=year,
        section=section,
        description=description,
        join_link=join_link,
        cover_image_path=cover_image_path,
        cover_image_name=cover_image_name,
        cover_image_mime=cover_image_mime,
        is_active=True,
    )
    db.session.add(row)
    db.session.commit()
    return jsonify({"message": "Classroom created successfully.", "data": _serialize_classroom(row)}), 201


@preference_bp.route("/api/faculty/classrooms", methods=["GET"])
@jwt_required()
def get_faculty_classrooms():
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    rows = (
        Classroom.query
        .filter(Classroom.faculty_id == user.id)
        .order_by(Classroom.created_at.desc())
        .all()
    )
    return jsonify([_serialize_classroom(row) for row in rows]), 200


@preference_bp.route("/api/student/classrooms/invites", methods=["GET"])
@jwt_required()
def get_student_classroom_invites():
    user = _get_current_user()
    if not user or user.role != "student":
        return jsonify({"message": "Forbidden"}), 403

    joined_ids = {
        row.classroom_id
        for row in ClassroomMembership.query.filter(ClassroomMembership.student_id == user.id).all()
    }

    rows = (
        Classroom.query
        .filter(Classroom.is_active == True)  # noqa: E712
        .order_by(Classroom.created_at.desc())
        .all()
    )

    invites = []
    for row in rows:
        if row.id in joined_ids:
            continue
        if not _is_classroom_targeted_to_student(row, user):
            continue
        payload = _serialize_classroom(row)
        payload["notification_message"] = (
            f"{payload['faculty_name']} created classroom for {payload['subject']}. "
            "Join now to access assignments and updates."
        )
        invites.append(payload)

    return jsonify(invites), 200


@preference_bp.route("/api/student/classrooms/joined", methods=["GET"])
@jwt_required()
def get_student_joined_classrooms():
    user = _get_current_user()
    if not user or user.role != "student":
        return jsonify({"message": "Forbidden"}), 403

    rows = (
        ClassroomMembership.query
        .filter(ClassroomMembership.student_id == user.id)
        .order_by(ClassroomMembership.joined_at.desc())
        .all()
    )
    payload = []
    for row in rows:
        classroom = Classroom.query.get(row.classroom_id)
        if not classroom:
            continue
        item = _serialize_classroom(classroom)
        item["joined_at"] = row.joined_at.isoformat() if row.joined_at else None
        payload.append(item)
    return jsonify(payload), 200


@preference_bp.route("/api/student/classrooms/<int:classroom_id>/join", methods=["POST"])
@jwt_required()
def join_student_classroom(classroom_id):
    user = _get_current_user()
    if not user or user.role != "student":
        return jsonify({"message": "Forbidden"}), 403

    classroom = Classroom.query.get(classroom_id)
    if not classroom or not classroom.is_active:
        return jsonify({"message": "Classroom not found"}), 404
    if not _is_classroom_targeted_to_student(classroom, user):
        return jsonify({"message": "This classroom is not targeted for your class."}), 403

    existing = ClassroomMembership.query.filter(
        ClassroomMembership.classroom_id == classroom_id,
        ClassroomMembership.student_id == user.id,
    ).first()
    if existing:
        return jsonify({"message": "You already joined this classroom."}), 200

    membership = ClassroomMembership(classroom_id=classroom_id, student_id=user.id)
    db.session.add(membership)

    enrollment_query = CourseEnrollment.query.filter(
        CourseEnrollment.student_id == user.id,
        CourseEnrollment.faculty_id == classroom.faculty_id,
        func.lower(CourseEnrollment.subject) == _normalize_text_key(classroom.subject),
    )
    if classroom.semester:
        enrollment_query = enrollment_query.filter(CourseEnrollment.semester == classroom.semester)
    else:
        enrollment_query = enrollment_query.filter(CourseEnrollment.semester.is_(None))

    if not enrollment_query.first():
        db.session.add(
            CourseEnrollment(
                student_id=user.id,
                faculty_id=classroom.faculty_id,
                subject=classroom.subject,
                semester=classroom.semester,
            )
        )

    db.session.commit()
    return jsonify({"message": "Joined classroom successfully.", "data": _serialize_classroom(classroom)}), 201


@preference_bp.route("/api/faculty/course-enrollments", methods=["GET"])
@jwt_required()
def get_faculty_course_enrollments():
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    subject = (request.args.get("subject") or "").strip()
    semester = (request.args.get("semester") or "").strip()

    query = CourseEnrollment.query.filter(CourseEnrollment.faculty_id == user.id)
    if subject:
        query = query.filter(func.lower(CourseEnrollment.subject) == _normalize_text_key(subject))
    if semester:
        query = query.filter(CourseEnrollment.semester == semester)

    rows = query.order_by(CourseEnrollment.created_at.desc()).all()
    return jsonify([_serialize_course_enrollment(row) for row in rows]), 200


@preference_bp.route("/api/faculty/assignments", methods=["POST"])
@jwt_required()
def create_faculty_assignment():
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    data = request.form if request.form else (request.get_json() or {})
    title = (data.get("title") or "").strip()
    subject = (data.get("subject") or "").strip()
    description = (data.get("description") or "").strip() or None
    semester = (data.get("semester") or "").strip() or None
    department = (data.get("department") or user.department or "").strip() or None
    year = _parse_int(data.get("year"))
    section = (data.get("section") or "").strip() or None
    due_at = _parse_iso_datetime(data.get("due_at"))
    reminder_enabled = True
    try:
        reminder_enabled = _to_bool(data.get("reminder_enabled", True))
    except ValueError:
        return jsonify({"message": "reminder_enabled must be true or false"}), 400
    reminder_days_before = _parse_int(data.get("reminder_days_before"))
    reminder_days_before = reminder_days_before if reminder_days_before is not None else 1

    if not title:
        return jsonify({"message": "title is required"}), 400
    if len(title) > 200:
        return jsonify({"message": "title must be 200 characters or fewer"}), 400
    if not subject:
        return jsonify({"message": "subject is required"}), 400
    if len(subject) > 120:
        return jsonify({"message": "subject must be 120 characters or fewer"}), 400
    if not due_at:
        return jsonify({"message": "due_at must be a valid ISO datetime"}), 400
    if due_at <= datetime.utcnow():
        return jsonify({"message": "due_at must be in the future"}), 400
    if reminder_days_before < 0 or reminder_days_before > 14:
        return jsonify({"message": "reminder_days_before must be between 0 and 14"}), 400

    try:
        links = _parse_links_input(data.get("resource_links"))
    except ValueError as err:
        return jsonify({"message": str(err)}), 400

    attachment = request.files.get("attachment")
    attachment_path = None
    attachment_name = None
    attachment_mime = None
    if attachment and attachment.filename:
        safe_name = secure_filename(attachment.filename)
        if not safe_name:
            return jsonify({"message": "Invalid attachment filename"}), 400
        unique_name = f"{uuid.uuid4().hex}_{safe_name}"
        upload_path = os.path.join(current_app.config["UPLOAD_FOLDER"], unique_name)
        attachment.save(upload_path)
        attachment_path = f"/uploads/{unique_name}"
        attachment_name = safe_name
        attachment_mime = attachment.mimetype

    row = Assignment(
        created_by=user.id,
        title=title,
        subject=subject,
        description=description,
        semester=semester,
        department=department.upper() if department else None,
        year=year,
        section=section.upper() if section else None,
        due_at=due_at,
        reminder_days_before=reminder_days_before,
        reminder_enabled=reminder_enabled,
        resource_links=json.dumps(links) if links else None,
        attachment_path=attachment_path,
        attachment_name=attachment_name,
        attachment_mime=attachment_mime,
    )
    db.session.add(row)
    db.session.commit()
    return jsonify({"message": "Assignment posted successfully.", "data": _serialize_assignment(row)}), 201


@preference_bp.route("/api/faculty/assignments", methods=["GET"])
@jwt_required()
def get_faculty_assignments():
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    rows = (
        Assignment.query
        .filter(Assignment.created_by == user.id)
        .order_by(Assignment.created_at.desc())
        .all()
    )
    payload = []
    for row in rows:
        item = _serialize_assignment(row)
        item["submission_count"] = AssignmentSubmission.query.filter_by(assignment_id=row.id).count()
        payload.append(item)
    return jsonify(payload), 200


@preference_bp.route("/api/faculty/assignments/<int:assignment_id>/submissions", methods=["GET"])
@jwt_required()
def get_faculty_assignment_submissions(assignment_id):
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    assignment = Assignment.query.get(assignment_id)
    if not assignment:
        return jsonify({"message": "Assignment not found"}), 404
    if assignment.created_by != user.id:
        return jsonify({"message": "Forbidden"}), 403

    rows = (
        AssignmentSubmission.query
        .filter(AssignmentSubmission.assignment_id == assignment_id)
        .order_by(AssignmentSubmission.submitted_at.desc())
        .all()
    )
    return jsonify([_serialize_submission_for_faculty(row) for row in rows]), 200


@preference_bp.route("/api/faculty/assignments/submissions/<int:submission_id>", methods=["PATCH"])
@jwt_required()
def review_faculty_assignment_submission(submission_id):
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    submission = AssignmentSubmission.query.get(submission_id)
    if not submission:
        return jsonify({"message": "Submission not found"}), 404

    assignment = Assignment.query.get(submission.assignment_id)
    if not assignment or assignment.created_by != user.id:
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json() or {}
    if "status" in data:
        status = (data.get("status") or "").strip().lower()
        if status not in {"submitted", "reviewed", "needs_revision"}:
            return jsonify({"message": "status must be submitted, reviewed, or needs_revision"}), 400
        submission.status = status
    if "teacher_feedback" in data:
        feedback = str(data.get("teacher_feedback") or "").strip()
        submission.teacher_feedback = feedback or None
    if "grade" in data:
        grade = str(data.get("grade") or "").strip()
        if len(grade) > 20:
            return jsonify({"message": "grade must be 20 characters or fewer"}), 400
        submission.grade = grade or None

    db.session.commit()
    return jsonify({"message": "Submission review updated.", "data": _serialize_submission_for_faculty(submission)}), 200


@preference_bp.route("/api/student/assignments", methods=["GET"])
@jwt_required()
def get_student_assignments():
    user = _get_current_user()
    if not user or user.role != "student":
        return jsonify({"message": "Forbidden"}), 403

    rows = Assignment.query.order_by(Assignment.due_at.asc(), Assignment.created_at.desc()).all()
    visible = [row for row in rows if _is_assignment_visible_to_student(row, user)]
    return jsonify([_serialize_assignment(row, student=user) for row in visible]), 200


@preference_bp.route("/api/student/assignments/reminders", methods=["GET"])
@jwt_required()
def get_student_assignment_reminders():
    user = _get_current_user()
    if not user or user.role != "student":
        return jsonify({"message": "Forbidden"}), 403

    settings = _get_or_create_student_settings(user.id)
    if not settings.assignment_reminders:
        return jsonify([]), 200

    today = datetime.utcnow().date()
    rows = Assignment.query.order_by(Assignment.due_at.asc()).all()

    reminders = []
    has_db_changes = False
    for row in rows:
        if not row.reminder_enabled or not _is_assignment_visible_to_student(row, user):
            continue
        reminder_day = (row.due_at - timedelta(days=max(row.reminder_days_before, 0))).date()
        if reminder_day == today:
            reminders.append(_serialize_assignment(row, student=user))
            existing_log = AssignmentReminderLog.query.filter_by(
                assignment_id=row.id,
                student_id=user.id,
                reminder_date=today,
            ).first()
            if existing_log:
                continue
            faculty = User.query.get(row.created_by) if row.created_by else None
            email_sent = False
            try:
                email_sent = _send_assignment_reminder_email(user, faculty, row)
            except Exception:
                current_app.logger.exception("Failed to send assignment reminder email")
            db.session.add(
                AssignmentReminderLog(
                    assignment_id=row.id,
                    student_id=user.id,
                    reminder_date=today,
                    email_sent_at=datetime.utcnow() if email_sent else None,
                )
            )
            has_db_changes = True
    if has_db_changes:
        db.session.commit()
    return jsonify(reminders), 200


@preference_bp.route("/api/student/assignments/<int:assignment_id>/submission", methods=["POST"])
@jwt_required()
def submit_student_assignment(assignment_id):
    user = _get_current_user()
    if not user or user.role != "student":
        return jsonify({"message": "Forbidden"}), 403

    assignment = Assignment.query.get(assignment_id)
    if not assignment:
        return jsonify({"message": "Assignment not found"}), 404
    if not _is_assignment_visible_to_student(assignment, user):
        return jsonify({"message": "This assignment is not assigned to your class."}), 403

    data = request.form if request.form else (request.get_json() or {})
    submission_text = (data.get("submission_text") or "").strip() or None
    try:
        links = _parse_links_input(data.get("resource_links"))
    except ValueError as err:
        return jsonify({"message": str(err)}), 400

    attachment = request.files.get("attachment")
    existing = AssignmentSubmission.query.filter_by(
        assignment_id=assignment_id,
        student_id=user.id,
    ).first()

    if not submission_text and not links and not (attachment and attachment.filename) and not existing:
        return jsonify({"message": "Provide submission text, links, or an attachment."}), 400

    if not existing:
        existing = AssignmentSubmission(
            assignment_id=assignment_id,
            student_id=user.id,
            status="submitted",
        )
        db.session.add(existing)

    existing.submission_text = submission_text
    existing.resource_links = json.dumps(links) if links else None
    existing.status = "submitted"

    if attachment and attachment.filename:
        safe_name = secure_filename(attachment.filename)
        if not safe_name:
            return jsonify({"message": "Invalid attachment filename"}), 400
        unique_name = f"{uuid.uuid4().hex}_{safe_name}"
        upload_path = os.path.join(current_app.config["UPLOAD_FOLDER"], unique_name)
        attachment.save(upload_path)
        existing.attachment_path = f"/uploads/{unique_name}"
        existing.attachment_name = safe_name
        existing.attachment_mime = attachment.mimetype

    db.session.commit()
    return jsonify({"message": "Assignment submitted successfully.", "data": _serialize_submission_for_student(existing)}), 201


@preference_bp.route("/api/admin/dashboard/overview", methods=["GET"])
@jwt_required()
def get_admin_dashboard_overview():
    user = _get_current_user()
    if not user or user.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    semester = (request.args.get("semester") or "").strip()
    now = datetime.now()
    today_day = now.strftime("%A")
    current_time = now.strftime("%H:%M")
    week_ago = now - timedelta(days=7)
    today_start = datetime(now.year, now.month, now.day)

    total_students = User.query.filter(User.role == "student").count()
    total_faculty = User.query.filter(User.role == "faculty").count()
    pending_preferences_count = FacultyPreference.query.filter(FacultyPreference.status == "pending").count()
    conflicts_pending_count = ConflictRequest.query.filter(ConflictRequest.status == "pending").count()
    messages_sent_today = AdminMessage.query.filter(AdminMessage.created_at >= today_start).count()

    pref_query = FacultyPreference.query
    if semester:
        pref_query = pref_query.filter(FacultyPreference.semester == semester)
    all_preferences = pref_query.order_by(FacultyPreference.created_at.desc()).all()
    pending_preferences = [p for p in all_preferences if p.status == "pending"][:8]
    approved_preferences = [p for p in all_preferences if p.status == "approved"]

    slot_query = TimetableSlot.query
    if semester:
        slot_query = slot_query.filter(TimetableSlot.semester == semester)
    published_slots = slot_query.all()
    published_status = "Published" if len(published_slots) > 0 else "Draft"

    room_conflicts = []
    grouped = {}
    for slot in published_slots:
        key = f"{slot.room}|{slot.day}"
        grouped.setdefault(key, []).append(slot)
    for _, slots in grouped.items():
        slots = sorted(slots, key=lambda s: (s.start_time, s.end_time))
        for i in range(len(slots)):
            for j in range(i + 1, len(slots)):
                a = slots[i]
                b = slots[j]
                if _times_overlap(a.start_time, a.end_time, b.start_time, b.end_time):
                    room_conflicts.append(
                        {
                            "room": a.room,
                            "day": a.day,
                            "slot_a": _serialize_timetable_slot(a),
                            "slot_b": _serialize_timetable_slot(b),
                        }
                    )

    published_pref_ids = {slot.source_preference_id for slot in published_slots if slot.source_preference_id}
    approved_pref_ids = {pref.id for pref in approved_preferences}
    missing_assignments_count = len(approved_pref_ids - published_pref_ids)

    pending_pref_rows = [_serialize_preference(pref) for pref in pending_preferences]

    running_slots = []
    for slot in published_slots:
        if slot.day == today_day and slot.start_time <= current_time < slot.end_time:
            running_slots.append(slot)
    rooms_occupied_now = len({slot.room for slot in running_slots})
    free_rooms_now = max(Room.query.filter_by(is_active=True).count() - rooms_occupied_now, 0)
    next_slots = [slot for slot in published_slots if slot.day == today_day and slot.start_time > current_time]
    next_slot_time = min((slot.start_time for slot in next_slots), default=None)

    faculty_queue = []
    faculty_bucket = {}
    for pref in all_preferences:
        key = str(pref.faculty_id)
        if key not in faculty_bucket:
            faculty = User.query.get(pref.faculty_id)
            faculty_bucket[key] = {
                "faculty_id": pref.faculty_id,
                "faculty_name": faculty.name if faculty else "Faculty",
                "approved": 0,
                "pending": 0,
                "rejected": 0,
                "total": 0,
            }
        faculty_bucket[key]["total"] += 1
        if pref.status == "approved":
            faculty_bucket[key]["approved"] += 1
        elif pref.status == "rejected":
            faculty_bucket[key]["rejected"] += 1
        else:
            faculty_bucket[key]["pending"] += 1
    faculty_queue = sorted(faculty_bucket.values(), key=lambda f: (-f["pending"], f["faculty_name"]))[:10]

    recent_messages = AdminMessage.query.order_by(AdminMessage.created_at.desc()).limit(5).all()
    message_counts = {
        "faculty": AdminMessage.query.filter(AdminMessage.recipient_role == "faculty").count(),
        "student": AdminMessage.query.filter(AdminMessage.recipient_role == "student").count(),
        "all": AdminMessage.query.filter(AdminMessage.recipient_role == "all").count(),
    }

    new_accounts_week = User.query.filter(User.created_at >= week_ago).count()
    role_breakdown = {
        "student": total_students,
        "faculty": total_faculty,
        "admin": User.query.filter(User.role == "admin").count(),
    }
    incomplete_profiles = User.query.filter(
        User.role.in_(["student", "faculty"]),
        or_(User.name.is_(None), User.department.is_(None), User.roll_number.is_(None))
    ).count()

    oldest_pending = ConflictRequest.query.filter(ConflictRequest.status == "pending").order_by(ConflictRequest.created_at.asc()).first()
    oldest_pending_age_days = None
    if oldest_pending and oldest_pending.created_at:
        oldest_pending_age_days = (now - oldest_pending.created_at).days
    conflict_rows = ConflictRequest.query.filter(ConflictRequest.status == "pending").order_by(ConflictRequest.created_at.desc()).limit(5).all()

    today_events = Event.query.filter(Event.date == now.strftime("%Y-%m-%d")).order_by(Event.created_at.desc()).all()
    upcoming_events = Event.query.filter(Event.date >= now.strftime("%Y-%m-%d")).order_by(Event.date.asc()).limit(5).all()

    recent_activity = AdminActivityLog.query.order_by(AdminActivityLog.created_at.desc()).limit(12).all()

    return jsonify({
        "semester": semester,
        "kpis": {
            "total_students": total_students,
            "total_faculty": total_faculty,
            "pending_faculty_preferences": pending_preferences_count,
            "rooms_occupied_now": rooms_occupied_now,
            "conflicts_pending": conflicts_pending_count,
            "messages_sent_today": messages_sent_today,
        },
        "action_center": {
            "preferences_awaiting_approval": pending_pref_rows,
            "timetable_published": published_status == "Published",
            "room_conflicts": room_conflicts[:5],
            "unassigned_slots_count": missing_assignments_count,
        },
        "timetable_health": {
            "status": published_status,
            "approved_slots": len(approved_preferences),
            "total_requested_slots": len(all_preferences),
            "missing_assignments_count": missing_assignments_count,
        },
        "live_room_status": {
            "day": today_day,
            "current_time": current_time,
            "running_classes_count": len(running_slots),
            "rooms_occupied_now": rooms_occupied_now,
            "free_rooms_now": free_rooms_now,
            "next_slot_time": next_slot_time,
            "running_slots": [_serialize_timetable_slot(slot) for slot in running_slots],
        },
        "faculty_approval_queue": faculty_queue,
        "announcements_snapshot": {
            "recent": [_serialize_admin_message(m) for m in recent_messages],
            "audience_breakdown": message_counts,
        },
        "user_management_snapshot": {
            "new_accounts_this_week": new_accounts_week,
            "role_breakdown": role_breakdown,
            "incomplete_profiles_count": incomplete_profiles,
        },
        "conflict_resolution_snapshot": {
            "open_conflicts_count": conflicts_pending_count,
            "oldest_pending_age_days": oldest_pending_age_days,
            "open_conflicts": [_serialize_conflict(c) for c in conflict_rows],
        },
        "calendar_deadlines": {
            "today": [_serialize_event(event) for event in today_events],
            "upcoming": [_serialize_event(event) for event in upcoming_events],
        },
        "recent_activity_feed": [_serialize_activity(a) for a in recent_activity],
    }), 200


@preference_bp.route("/api/admin/users/<int:user_id>", methods=["PATCH"])
@jwt_required()
def update_admin_user(user_id):
    admin = _get_current_user()
    if not admin or admin.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    data = request.get_json() or {}
    allowed_roles = {"student", "faculty", "admin"}

    if "name" in data:
        name = (data.get("name") or "").strip()
        if not name:
            return jsonify({"message": "Name is required"}), 400
        user.name = name

    if "email" in data:
        email = (data.get("email") or "").strip().lower()
        if not email:
            return jsonify({"message": "Email is required"}), 400
        duplicate = User.query.filter(User.email == email, User.id != user.id).first()
        if duplicate:
            return jsonify({"message": "Email already exists"}), 400
        user.email = email

    if "role" in data:
        role = (data.get("role") or "").strip().lower()
        if role not in allowed_roles:
            return jsonify({"message": "Invalid role"}), 400
        if role == "admin" and not _is_admin_email_allowed(user.email):
            return jsonify({"message": "This email is not allowed for admin role"}), 403
        if user.id == admin.id and role != "admin":
            return jsonify({"message": "You cannot remove your own admin role"}), 400
        user.role = role

    if "department" in data:
        department = (data.get("department") or "").strip() or None
        user.department = department

    if "roll_number" in data:
        roll_number = (data.get("roll_number") or "").strip() or None
        if roll_number:
            duplicate = User.query.filter(User.roll_number == roll_number, User.id != user.id).first()
            if duplicate:
                return jsonify({"message": "Roll/Employee number already exists"}), 400
        user.roll_number = roll_number

    if "year" in data:
        year = _parse_int(data.get("year"))
        if data.get("year") not in (None, "") and (year is None or year <= 0):
            return jsonify({"message": "year must be a positive number"}), 400
        user.year = year

    if "section" in data:
        section = (data.get("section") or "").strip() or None
        user.section = section.upper() if section else None

    if user.role in {"student", "faculty"} and not user.roll_number:
        return jsonify({"message": "Roll/Employee number is required for student/faculty"}), 400

    db.session.commit()
    _log_admin_activity(admin.id, "user_update", f"Updated user {user.email} ({user.role})")
    db.session.commit()
    return jsonify({"message": "User updated", "user": _serialize_admin_user(user)}), 200


@preference_bp.route("/api/admin/users/<int:user_id>", methods=["DELETE"])
@jwt_required()
def delete_admin_user(user_id):
    admin = _get_current_user()
    if not admin or admin.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
    if user.id == admin.id:
        return jsonify({"message": "You cannot delete your own account"}), 400

    deleted_email = user.email
    db.session.delete(user)
    db.session.commit()
    _log_admin_activity(admin.id, "user_delete", f"Deleted user {deleted_email}")
    db.session.commit()
    return jsonify({"message": "User deleted"}), 200
