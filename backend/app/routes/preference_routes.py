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
    ClassroomAccessEmail,
    ClassroomMembership,
    Event,
    FacultyPreference,
    FacultyChatGroup,
    FacultyChatGroupMember,
    FacultyChatGroupMessage,
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


def _time_to_minutes(value):
    text = str(value or "").strip()
    if ":" not in text:
        return None
    parts = text.split(":")
    if len(parts) < 2:
        return None
    try:
        hh = int(parts[0])
        mm = int(parts[1])
    except (TypeError, ValueError):
        return None
    if hh < 0 or hh > 23 or mm < 0 or mm > 59:
        return None
    return hh * 60 + mm


def _day_rank(day):
    order = {
        "Monday": 0,
        "Tuesday": 1,
        "Wednesday": 2,
        "Thursday": 3,
        "Friday": 4,
        "Saturday": 5,
        "Sunday": 6,
    }
    return order.get(day, 99)


def _minutes_until_slot(now, slot_day, slot_start_time):
    start_minutes = _time_to_minutes(slot_start_time)
    if start_minutes is None:
        return None
    now_day_rank = now.weekday()
    slot_day_rank = _day_rank(slot_day)
    if slot_day_rank == 99:
        return None
    day_delta = (slot_day_rank - now_day_rank) % 7
    now_minutes = now.hour * 60 + now.minute
    delta = day_delta * 24 * 60 + (start_minutes - now_minutes)
    if delta < 0:
        delta += 7 * 24 * 60
    return delta


def _parse_int(value):
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _normalize_email(value):
    return (value or "").strip().lower()


def _normalize_join_link(value):
    raw = (value or "").strip()
    if not raw:
        return "https://classroom.google.com"
    if raw.startswith("http://") or raw.startswith("https://"):
        return raw
    return f"https://{raw}"


def _normalize_optional_link(value):
    raw = (value or "").strip()
    if not raw:
        return None
    if raw.startswith("http://") or raw.startswith("https://"):
        return raw
    return f"https://{raw}"


def _clean_classroom_description(value):
    text = (value or "").strip()
    if not text:
        return None
    stop_markers = [
        "\nIf you want, I can also update",
        "\nUser attachment",
        "\nWorked for",
        "\nWhat I fixed",
        "\nUpdated files",
        "\nValidation",
        "\nImportant",
        "\ncd backend",
    ]
    cleaned = text
    for marker in stop_markers:
        idx = cleaned.find(marker)
        if idx != -1:
            cleaned = cleaned[:idx].strip()
    return cleaned or None


def _save_chat_attachment(file_obj):
    if not file_obj or not file_obj.filename:
        return None, None, None
    safe_name = secure_filename(file_obj.filename)
    if not safe_name:
        raise ValueError("Invalid attachment filename")

    ext = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else ""
    allowed_doc_ext = {"pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt", "zip", "rar"}
    allowed_image_ext = {"png", "jpg", "jpeg", "webp", "gif"}
    allowed_video_ext = {"mp4", "mov", "webm", "avi", "mkv", "m4v"}
    allowed_ext = allowed_doc_ext | allowed_image_ext | allowed_video_ext
    if ext not in allowed_ext:
        raise ValueError("Attachment must be a document, image, or video file")

    mime = (file_obj.mimetype or "").lower()
    allowed_mime_prefix = ("application/", "image/", "video/", "text/")
    if mime and not mime.startswith(allowed_mime_prefix):
        raise ValueError("Unsupported attachment type")

    file_obj.stream.seek(0, os.SEEK_END)
    size_bytes = file_obj.stream.tell()
    file_obj.stream.seek(0)
    if size_bytes > 25 * 1024 * 1024:
        raise ValueError("Attachment size must be 25 MB or less")

    unique_name = f"chat_{uuid.uuid4().hex}_{safe_name}"
    upload_path = os.path.join(current_app.config["UPLOAD_FOLDER"], unique_name)
    file_obj.save(upload_path)
    return f"/uploads/{unique_name}", safe_name, mime or None


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
        "faculty_mail_sender_email": user.faculty_mail_sender_email,
        "faculty_mail_notifications_enabled": bool(user.faculty_mail_notifications_enabled),
        "faculty_mail_connected": bool(user.faculty_mail_sender_email and user.faculty_mail_app_password),
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
        "is_active": bool(user.is_active) if user.is_active is not None else True,
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


def _serialize_classroom_invite_notification(classroom, faculty, created_at_override=None):
    class_scope = " / ".join(
        [
            classroom.department or "-",
            str(classroom.year or "-"),
            classroom.section or "-",
        ]
    )
    semester_text = classroom.semester or "Current Semester"
    return {
        "id": f"classroom-invite-{classroom.id}",
        "sender_id": faculty.id if faculty else classroom.faculty_id,
        "sender_name": faculty.name if faculty else "Faculty",
        "recipient_role": "student",
        "subject": f"New Classroom Invite: {classroom.subject}",
        "body": (
            f"You have been invited to join '{classroom.title}'.\n"
            f"Subject: {classroom.subject}\n"
            f"Class: {class_scope}\n"
            f"Semester: {semester_text}\n"
            f"Join Link: {classroom.join_link}"
        ),
        "created_at": (
            created_at_override.isoformat()
            if created_at_override
            else (classroom.created_at.isoformat() if classroom.created_at else None)
        ),
        "kind": "classroom_invite",
        "classroom_id": classroom.id,
        "join_link": classroom.join_link,
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
    attachment_url = None
    if row.attachment_path:
        attachment_url = f"{request.host_url.rstrip('/')}{row.attachment_path}"
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
        "attachment_path": row.attachment_path,
        "attachment_name": row.attachment_name,
        "attachment_mime": row.attachment_mime,
        "attachment_url": attachment_url,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def _serialize_faculty_group_message(row):
    sender = User.query.get(row.sender_id)
    attachment_url = None
    if row.attachment_path:
        attachment_url = f"{request.host_url.rstrip('/')}{row.attachment_path}"
    return {
        "id": row.id,
        "group_id": row.group_id,
        "sender_id": row.sender_id,
        "sender_name": sender.name if sender else "Faculty",
        "sender_email": sender.email if sender else None,
        "body": row.body,
        "attachment_path": row.attachment_path,
        "attachment_name": row.attachment_name,
        "attachment_mime": row.attachment_mime,
        "attachment_url": attachment_url,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def _serialize_faculty_group(row):
    members = (
        FacultyChatGroupMember.query
        .filter(FacultyChatGroupMember.group_id == row.id)
        .all()
    )
    member_ids = [m.faculty_id for m in members]
    member_users = User.query.filter(User.id.in_(member_ids)).all() if member_ids else []
    latest = (
        FacultyChatGroupMessage.query
        .filter(FacultyChatGroupMessage.group_id == row.id)
        .order_by(FacultyChatGroupMessage.created_at.desc())
        .first()
    )
    creator = User.query.get(row.created_by)
    return {
        "id": row.id,
        "name": row.name,
        "created_by": row.created_by,
        "created_by_name": creator.name if creator else "Faculty",
        "members": [
            {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "department": user.department,
                "profile_image_url": (
                    f"{request.host_url.rstrip('/')}{user.profile_image}"
                    if user.profile_image
                    else None
                ),
            }
            for user in member_users
        ],
        "latest_message": _serialize_faculty_group_message(latest) if latest else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
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


def _serialize_section_grades(value):
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    payload = []
    for item in parsed:
        if not isinstance(item, dict):
            continue
        section = str(item.get("section") or "").strip()
        if not section:
            continue
        marks_awarded = item.get("marks_awarded")
        marks_out_of = item.get("marks_out_of")
        try:
            marks_awarded_num = float(marks_awarded)
            marks_out_of_num = float(marks_out_of)
        except (TypeError, ValueError):
            continue
        payload.append({
            "section": section,
            "marks_awarded": round(marks_awarded_num, 2),
            "marks_out_of": round(marks_out_of_num, 2),
        })
    return payload


def _clean_section_grades(value):
    if value is None:
        return []
    items = value
    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return []
        try:
            items = json.loads(raw)
        except json.JSONDecodeError:
            raise ValueError("section_grades must be valid JSON")
    if not isinstance(items, list):
        raise ValueError("section_grades must be an array")

    cleaned = []
    for idx, item in enumerate(items):
        if not isinstance(item, dict):
            raise ValueError(f"section_grades[{idx}] must be an object")
        section = str(item.get("section") or "").strip()
        if not section:
            raise ValueError(f"section_grades[{idx}].section is required")
        marks_awarded = item.get("marks_awarded")
        marks_out_of = item.get("marks_out_of")
        try:
            marks_awarded = float(marks_awarded)
            marks_out_of = float(marks_out_of)
        except (TypeError, ValueError):
            raise ValueError(f"section_grades[{idx}] marks must be numeric")
        if marks_awarded < 0 or marks_out_of <= 0:
            raise ValueError(f"section_grades[{idx}] marks must be non-negative and out_of > 0")
        if marks_awarded > marks_out_of:
            raise ValueError(f"section_grades[{idx}] awarded marks cannot exceed out_of")
        cleaned.append({
            "section": section[:80],
            "marks_awarded": round(marks_awarded, 2),
            "marks_out_of": round(marks_out_of, 2),
        })
    return cleaned


def _serialize_submission_for_student(submission):
    if not submission:
        return None
    file_url = None
    if submission.attachment_path:
        file_url = f"{request.host_url.rstrip('/')}{submission.attachment_path}"
    is_approved = (submission.admin_review_status or "pending") == "approved"
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
        "teacher_feedback": submission.teacher_feedback if is_approved else None,
        "grade": submission.grade if is_approved else None,
        "section_grades": _serialize_section_grades(submission.section_grades) if is_approved else [],
        "total_marks_awarded": submission.total_marks_awarded if is_approved else None,
        "total_marks_out_of": submission.total_marks_out_of if is_approved else None,
        "admin_review_status": submission.admin_review_status or "pending",
        "grade_visible_to_student": is_approved,
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
        "section_grades": _serialize_section_grades(submission.section_grades),
        "total_marks_awarded": submission.total_marks_awarded,
        "total_marks_out_of": submission.total_marks_out_of,
        "admin_review_status": submission.admin_review_status or "pending",
        "admin_reviewed_by": submission.admin_reviewed_by,
        "admin_reviewed_at": submission.admin_reviewed_at.isoformat() if submission.admin_reviewed_at else None,
        "submitted_at": submission.submitted_at.isoformat() if submission.submitted_at else None,
        "updated_at": submission.updated_at.isoformat() if submission.updated_at else None,
    }


def _serialize_course_enrollment(row):
    student = User.query.get(row.student_id)
    faculty = User.query.get(row.faculty_id)
    student_image_url = None
    faculty_image_url = None
    if student and student.profile_image:
        student_image_url = f"{request.host_url.rstrip('/')}{student.profile_image}"
    if faculty and faculty.profile_image:
        faculty_image_url = f"{request.host_url.rstrip('/')}{faculty.profile_image}"
    return {
        "id": row.id,
        "student_id": row.student_id,
        "student_name": student.name if student else None,
        "student_email": student.email if student else None,
        "student_profile_image_url": student_image_url,
        "faculty_id": row.faculty_id,
        "faculty_name": faculty.name if faculty else None,
        "faculty_email": faculty.email if faculty else None,
        "faculty_profile_image_url": faculty_image_url,
        "subject": row.subject,
        "semester": row.semester,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def _serialize_classroom(row):
    faculty = User.query.get(row.faculty_id)
    cover_image_url = None
    faculty_image_url = None
    if row.cover_image_path:
        cover_image_url = f"{request.host_url.rstrip('/')}{row.cover_image_path}"
    if faculty and faculty.profile_image:
        faculty_image_url = f"{request.host_url.rstrip('/')}{faculty.profile_image}"

    return {
        "id": row.id,
        "faculty_id": row.faculty_id,
        "faculty_name": faculty.name if faculty else "Faculty",
        "faculty_email": faculty.email if faculty else None,
        "faculty_profile_image_url": faculty_image_url,
        "title": row.title,
        "subject": row.subject,
        "semester": row.semester,
        "department": row.department,
        "year": row.year,
        "section": row.section,
        "description": _clean_classroom_description(row.description),
        "join_link": row.join_link,
        "drive_link": row.drive_link,
        "meet_link": row.meet_link,
        "cover_image_path": row.cover_image_path,
        "cover_image_name": row.cover_image_name,
        "cover_image_mime": row.cover_image_mime,
        "cover_image_url": cover_image_url,
        "is_active": row.is_active,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _serialize_classroom_member(row):
    student = User.query.get(row.student_id)
    student_image_url = None
    if student and student.profile_image:
        student_image_url = f"{request.host_url.rstrip('/')}{student.profile_image}"

    return {
        "id": row.id,
        "student_id": row.student_id,
        "student_name": student.name if student else "Student",
        "student_email": student.email if student else None,
        "student_profile_image_url": student_image_url,
        "roll_number": student.roll_number if student else None,
        "department": student.department if student else None,
        "year": student.year if student else None,
        "section": student.section if student else None,
        "joined_at": row.joined_at.isoformat() if row.joined_at else None,
    }


def _is_classroom_targeted_to_student(classroom, student):
    if classroom.department and (student.department or "").strip().lower() != classroom.department.strip().lower():
        return False
    if classroom.year and student.year != classroom.year:
        return False
    if classroom.section and (student.section or "").strip().upper() != classroom.section.strip().upper():
        return False
    return True


def _is_student_email_invited_for_classroom(classroom_id, email):
    normalized = _normalize_email(email)
    if not normalized:
        return False
    row = ClassroomAccessEmail.query.filter(
        ClassroomAccessEmail.classroom_id == classroom_id,
        ClassroomAccessEmail.student_email == normalized,
    ).first()
    return row is not None


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


def _is_student_joined_relevant_classroom(student_id, assignment):
    if not student_id or not assignment:
        return False

    query = (
        ClassroomMembership.query
        .join(Classroom, ClassroomMembership.classroom_id == Classroom.id)
        .filter(
            ClassroomMembership.student_id == student_id,
            Classroom.is_active == True,  # noqa: E712
            Classroom.faculty_id == assignment.created_by,
            func.lower(Classroom.subject) == _normalize_text_key(assignment.subject),
        )
    )

    if assignment.semester:
        query = query.filter(Classroom.semester == assignment.semester)
    else:
        query = query.filter(Classroom.semester.is_(None))

    if assignment.department:
        query = query.filter(func.lower(Classroom.department) == _normalize_text_key(assignment.department))
    if assignment.year is not None:
        query = query.filter(Classroom.year == assignment.year)
    if assignment.section:
        query = query.filter(func.upper(Classroom.section) == (assignment.section or "").strip().upper())

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
    return _is_student_joined_relevant_classroom(student.id, assignment)


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


def _parse_selected_student_emails(raw_value):
    if raw_value is None:
        return []
    if isinstance(raw_value, str):
        text = raw_value.strip()
        if not text:
            return []
        try:
            parsed = json.loads(text)
        except ValueError:
            parsed = [part.strip() for part in text.split(",") if part.strip()]
    elif isinstance(raw_value, list):
        parsed = raw_value
    else:
        parsed = []

    result = []
    for item in parsed:
        email = _normalize_email(item)
        if email and "@" in email and "." in email.split("@")[-1]:
            result.append(email)
    return sorted(set(result))


def _get_target_students_for_classroom(classroom, selected_emails=None):
    selected_set = set(selected_emails or [])
    targeted_ids = set()
    selected_ids = set()

    query = User.query.filter(User.role == "student")
    if classroom.department:
        query = query.filter(func.lower(User.department) == _normalize_text_key(classroom.department))
    if classroom.year is not None:
        query = query.filter(User.year == classroom.year)
    if classroom.section:
        query = query.filter(func.upper(User.section) == classroom.section.strip().upper())
    for row in query.all():
        targeted_ids.add(row.id)

    if selected_set:
        selected_rows = User.query.filter(User.role == "student", func.lower(User.email).in_(selected_set)).all()
        for row in selected_rows:
            selected_ids.add(row.id)

    final_ids = sorted(targeted_ids.union(selected_ids))
    students = User.query.filter(User.role == "student", User.id.in_(final_ids)).all() if final_ids else []
    return students, len(targeted_ids), len(selected_ids)


def _resolve_outbound_mail_config(faculty):
    if (
        faculty
        and faculty.faculty_mail_notifications_enabled
        and faculty.faculty_mail_sender_email
        and faculty.faculty_mail_app_password
    ):
        return {
            "smtp_host": current_app.config.get("FACULTY_MAIL_SMTP_HOST", "smtp.gmail.com"),
            "smtp_port": current_app.config.get("FACULTY_MAIL_SMTP_PORT", 587),
            "smtp_user": faculty.faculty_mail_sender_email,
            "smtp_pass": (faculty.faculty_mail_app_password or "").replace(" ", ""),
            "from_email": faculty.faculty_mail_sender_email,
            "use_tls": current_app.config.get("FACULTY_MAIL_USE_TLS", True),
            "sender_type": "faculty",
        }

    smtp_user = current_app.config.get("MAIL_SMTP_USERNAME")
    return {
        "smtp_host": current_app.config.get("MAIL_SMTP_HOST"),
        "smtp_port": current_app.config.get("MAIL_SMTP_PORT"),
        "smtp_user": smtp_user,
        "smtp_pass": (current_app.config.get("MAIL_SMTP_PASSWORD") or "").replace(" ", ""),
        "from_email": current_app.config.get("MAIL_FROM_EMAIL") or smtp_user,
        "use_tls": current_app.config.get("MAIL_USE_TLS", True),
        "sender_type": "platform",
    }


def _send_classroom_invitation_email(student, faculty, classroom):
    mail_cfg = _resolve_outbound_mail_config(faculty)
    smtp_host = mail_cfg.get("smtp_host")
    smtp_port = mail_cfg.get("smtp_port")
    smtp_user = mail_cfg.get("smtp_user")
    smtp_pass = mail_cfg.get("smtp_pass")
    from_email = mail_cfg.get("from_email")
    use_tls = mail_cfg.get("use_tls")

    if not smtp_host or not smtp_port or not smtp_user or not smtp_pass or not from_email:
        return False, mail_cfg.get("sender_type")

    faculty_name = faculty.name if faculty else "Faculty"
    class_scope = " / ".join(
        [
            classroom.department or "-",
            str(classroom.year or "-"),
            classroom.section or "-",
        ]
    )
    semester_text = classroom.semester or "Current Semester"

    msg = EmailMessage()
    msg["Subject"] = f"Classroom Invite: {classroom.subject} - {classroom.title}"
    msg["From"] = from_email
    msg["To"] = student.email
    if faculty and faculty.email:
        msg["Reply-To"] = faculty.email
    msg.set_content(
        f"Hello {student.name},\n\n"
        "A new classroom has been created for your class.\n\n"
        f"Title: {classroom.title}\n"
        f"Subject: {classroom.subject}\n"
        f"Class: {class_scope}\n"
        f"Semester: {semester_text}\n"
        f"Teacher: {faculty_name}\n"
        f"Join Link: {classroom.join_link}\n\n"
        "Please use the join link to access the classroom in Smart Campus."
    )

    with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
        if use_tls:
            server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
    return True, mail_cfg.get("sender_type")


def _is_valid_time_range(start_time, end_time):
    if not start_time or not end_time:
        return False
    return start_time < end_time


def _times_overlap(start_a, end_a, start_b, end_b):
    return start_a < end_b and end_a > start_b


def _time_to_minutes(value):
    text = (value or "").strip()
    if ":" not in text:
        return None
    try:
        hh, mm = text.split(":", 1)
        hh_int = int(hh)
        mm_int = int(mm)
    except (TypeError, ValueError):
        return None
    if hh_int < 0 or hh_int > 23 or mm_int < 0 or mm_int > 59:
        return None
    return hh_int * 60 + mm_int


def _minutes_to_time(value):
    hh = int(value // 60)
    mm = int(value % 60)
    return f"{hh:02d}:{mm:02d}"


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
                    "faculty_id": item.get("faculty_id"),
                    "faculty_name": item.get("faculty_name"),
                    "subject": item.get("subject"),
                    "semester": item.get("semester"),
                    "department": item.get("department"),
                    "year": item.get("year"),
                    "section": item.get("section"),
                    "day": day,
                    "start_time": start_time,
                    "end_time": end_time,
                    "student_count": student_count,
                    "reason": "No vacant room with enough capacity for this time slot",
                }
            )

    return assigned, unassigned


def _build_conflict_suggestion_for_unassigned(item, assigned_slots):
    day = item.get("day")
    start_time = item.get("start_time")
    end_time = item.get("end_time")
    faculty_id = item.get("faculty_id")
    student_count = int(item.get("student_count") or 0)
    start_min = _time_to_minutes(start_time)
    end_min = _time_to_minutes(end_time)
    if start_min is None or end_min is None or end_min <= start_min:
        return None

    duration = end_min - start_min
    rooms = _active_rooms_sorted()
    day_slots = [slot for slot in assigned_slots if slot.get("day") == day]

    def room_free(room_name, cand_start, cand_end):
        for slot in day_slots:
            if slot.get("room") != room_name:
                continue
            slot_start = _time_to_minutes(slot.get("start_time"))
            slot_end = _time_to_minutes(slot.get("end_time"))
            if slot_start is None or slot_end is None:
                continue
            if cand_start < slot_end and cand_end > slot_start:
                return False
        return True

    def faculty_free(cand_start, cand_end):
        for slot in day_slots:
            if slot.get("faculty_id") != faculty_id:
                continue
            slot_start = _time_to_minutes(slot.get("start_time"))
            slot_end = _time_to_minutes(slot.get("end_time"))
            if slot_start is None or slot_end is None:
                continue
            if cand_start < slot_end and cand_end > slot_start:
                return False
        return True

    for offset in range(1, 5):
        for direction in (-1, 1):
            cand_start = start_min + direction * offset * 60
            cand_end = cand_start + duration
            if cand_start < 8 * 60 or cand_end > 20 * 60:
                continue
            if not faculty_free(cand_start, cand_end):
                continue
            for room in rooms:
                if room["capacity"] < student_count:
                    continue
                if room_free(room["name"], cand_start, cand_end):
                    return {
                        "type": "time_shift",
                        "day": day,
                        "start_time": _minutes_to_time(cand_start),
                        "end_time": _minutes_to_time(cand_end),
                        "room": room["name"],
                        "room_capacity": room["capacity"],
                        "reason": "Nearest available slot with sufficient room capacity",
                    }
    return None


def _notify_impacted_faculty_conflicts(admin_user_id, semester, unassigned, assigned_slots):
    if not admin_user_id or not unassigned:
        return

    grouped = {}
    for item in unassigned:
        fid = item.get("faculty_id")
        if not fid:
            continue
        grouped.setdefault(int(fid), []).append(item)

    for faculty_id, items in grouped.items():
        faculty_user = User.query.get(faculty_id)
        if not faculty_user or faculty_user.role != "faculty":
            continue

        lines = []
        for item in items[:5]:
            suggestion = item.get("suggestion") or _build_conflict_suggestion_for_unassigned(item, assigned_slots)
            base = (
                f"- {item.get('subject') or 'Subject'} | {item.get('day')} "
                f"{item.get('start_time')}-{item.get('end_time')} | "
                f"{item.get('department') or '-'} / {item.get('year') or '-'} / {item.get('section') or '-'}"
            )
            if suggestion:
                base += (
                    f"\n  Suggestion: {suggestion.get('day')} {suggestion.get('start_time')}-{suggestion.get('end_time')} "
                    f"in room {suggestion.get('room')} ({suggestion.get('reason')})"
                )
            lines.append(base)

        subject = f"Timetable Conflict Alert - {semester or 'Current Semester'}"
        body = (
            "Some of your approved preferences could not be assigned during draft generation.\n\n"
            f"Unassigned slots: {len(items)}\n\n"
            f"{chr(10).join(lines)}\n\n"
            "Action: Open Conflict Requests and either accept suggested fix or request manual admin review."
        )

        conflict_title = f"Auto conflict: {semester or 'Timetable draft'}"
        open_statuses = ["open", "pending", "in_review"]

        existing_conflict = (
            ConflictRequest.query
            .filter(
                ConflictRequest.created_by == faculty_id,
                ConflictRequest.title == conflict_title,
                ConflictRequest.status.in_(open_statuses),
            )
            .order_by(ConflictRequest.created_at.desc())
            .first()
        )
        if existing_conflict:
            existing_conflict.description = body
            if existing_conflict.status != "open":
                existing_conflict.status = "open"
                existing_conflict.resolved_at = None
        else:
            db.session.add(
                ConflictRequest(
                    title=conflict_title,
                    description=body,
                    status="open",
                    created_by=faculty_id,
                )
            )

        latest_msg = (
            FacultyPeerMessage.query
            .filter(
                FacultyPeerMessage.sender_id == admin_user_id,
                FacultyPeerMessage.recipient_id == faculty_id,
                FacultyPeerMessage.subject == subject,
            )
            .order_by(FacultyPeerMessage.created_at.desc())
            .first()
        )
        should_send_new_message = not latest_msg or (latest_msg.body or "").strip() != body.strip()
        if should_send_new_message:
            db.session.add(
                FacultyPeerMessage(
                    sender_id=admin_user_id,
                    recipient_id=faculty_id,
                    subject=subject,
                    body=body,
                )
            )


def _cleanup_duplicate_auto_conflicts():
    rows = (
        ConflictRequest.query
        .filter(ConflictRequest.title.like("Auto conflict:%"))
        .order_by(
            ConflictRequest.created_by.asc(),
            ConflictRequest.title.asc(),
            ConflictRequest.created_at.desc(),
        )
        .all()
    )
    grouped = {}
    for row in rows:
        key = (row.created_by, (row.title or "").strip().lower())
        grouped.setdefault(key, []).append(row)

    removed = 0
    for _, items in grouped.items():
        if len(items) <= 1:
            continue
        keeper = items[0]
        for dup in items[1:]:
            # Keep historical resolved rows only if they are materially different.
            same_status = (dup.status or "").strip().lower() == (keeper.status or "").strip().lower()
            same_desc = (dup.description or "").strip() == (keeper.description or "").strip()
            if same_status or same_desc or (dup.status or "").strip().lower() in {"open", "pending", "in_review"}:
                db.session.delete(dup)
                removed += 1
    return removed


def _notify_faculty_timetable_conflicts(admin_user_id, semester, total_requested, total_assigned, unassigned):
    if not admin_user_id or not unassigned:
        return

    impacted_names = sorted(
        {
            (item.get("faculty_name") or "").strip()
            for item in (unassigned or [])
            if (item.get("faculty_name") or "").strip()
        }
    )
    impacted_preview = ", ".join(impacted_names[:8]) if impacted_names else "Faculty members"
    if len(impacted_names) > 8:
        impacted_preview += f", +{len(impacted_names) - 8} more"

    semester_text = semester or "Current Semester"
    subject = f"Timetable Conflict Alert - {semester_text}"
    body = (
        f"Auto-generation detected timetable conflicts for {semester_text}.\n\n"
        f"Requested slots: {total_requested}\n"
        f"Assigned slots: {total_assigned}\n"
        f"Unassigned slots: {len(unassigned)}\n"
        f"Impacted faculty: {impacted_preview}\n\n"
        "Please review your timetable preferences and submit a conflict request if adjustment is needed."
    )

    row = AdminMessage(
        sender_id=admin_user_id,
        recipient_role="faculty",
        subject=subject,
        body=body,
    )
    db.session.add(row)


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


@preference_bp.route("/api/faculty/preferences/<int:preference_id>", methods=["PATCH"])
@jwt_required()
def update_my_preference(preference_id):
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    pref = FacultyPreference.query.get(preference_id)
    if not pref:
        return jsonify({"message": "Preference not found"}), 404
    if pref.faculty_id != user.id:
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json() or {}
    old_snapshot = _serialize_preference(pref)

    if "day" in data:
        day = _normalize_day(data.get("day"))
        if not day:
            return jsonify({"message": "Invalid day"}), 400
        pref.day = day

    if "start_time" in data or "end_time" in data:
        next_start = (data.get("start_time") if "start_time" in data else pref.start_time) or ""
        next_end = (data.get("end_time") if "end_time" in data else pref.end_time) or ""
        next_start = str(next_start).strip()
        next_end = str(next_end).strip()
        if not _is_valid_time_range(next_start, next_end):
            return jsonify({"message": "start_time must be earlier than end_time"}), 400
        pref.start_time = next_start
        pref.end_time = next_end

    if "subject" in data:
        subject = (data.get("subject") or "").strip()
        if not subject:
            return jsonify({"message": "Subject is required"}), 400
        pref.subject = subject

    if "student_count" in data:
        try:
            student_count = int(data.get("student_count"))
        except (TypeError, ValueError):
            return jsonify({"message": "student_count must be a number"}), 400
        if student_count <= 0:
            return jsonify({"message": "student_count must be greater than 0"}), 400
        pref.student_count = student_count

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
        if data.get("year") not in (None, "") and (year is None or year <= 0):
            return jsonify({"message": "year must be a positive number"}), 400
        pref.year = year
    if "section" in data:
        section = (data.get("section") or "").strip() or None
        pref.section = section.upper() if section else None
    if "details" in data:
        pref.details = (data.get("details") or "").strip()

    duplicate = FacultyPreference.query.filter(
        FacultyPreference.id != pref.id,
        FacultyPreference.faculty_id == user.id,
        FacultyPreference.semester == pref.semester,
        FacultyPreference.day == pref.day,
        FacultyPreference.start_time == pref.start_time,
        FacultyPreference.end_time == pref.end_time,
        FacultyPreference.status != "rejected",
    ).first()
    if duplicate:
        return jsonify({"message": "Another preference already exists for this slot"}), 400

    # Faculty edits must go through admin approval again.
    pref.status = "pending"
    db.session.commit()

    old_slot = f"{old_snapshot.get('day')} {old_snapshot.get('start_time')}-{old_snapshot.get('end_time')}"
    new_slot = f"{pref.day} {pref.start_time}-{pref.end_time}"
    notify_title = f"Faculty preference updated (review required) - {pref.semester or 'Current Semester'}"
    notify_description = (
        f"[PreferenceID:{pref.id}]\n"
        f"Faculty: {user.name} ({user.email})\n"
        f"Subject: {pref.subject}\n"
        f"Class: {pref.department or '-'} / {pref.year or '-'} / {pref.section or '-'}\n"
        f"Old slot: {old_slot}\n"
        f"New slot: {new_slot}\n\n"
        "Admin action required: review and approve this updated preference, then regenerate/publish timetable."
    )

    existing = (
        SupportQuery.query
        .filter(
            SupportQuery.sender_id == user.id,
            SupportQuery.sender_role == "faculty",
            SupportQuery.subject == notify_title,
            SupportQuery.status.in_(["open", "in_progress"]),
            SupportQuery.body.contains(f"[PreferenceID:{pref.id}]"),
        )
        .order_by(SupportQuery.created_at.desc())
        .first()
    )
    if existing:
        existing.body = notify_description
        existing.priority = "high"
        existing.category = "timetable"
        existing.status = "open"
        existing.updated_at = datetime.utcnow()
    else:
        db.session.add(
            SupportQuery(
                sender_id=user.id,
                sender_role="faculty",
                subject=notify_title,
                body=notify_description,
                category="timetable",
                priority="high",
                status="open",
            )
        )

    db.session.commit()
    return jsonify({
        "message": "Preference updated. Admin has been notified to review and update timetable.",
        "preference": _serialize_preference(pref),
    }), 200


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
    unassigned_with_suggestions = []
    for item in unassigned:
        enriched = dict(item)
        enriched["suggestion"] = _build_conflict_suggestion_for_unassigned(item, timetable)
        unassigned_with_suggestions.append(enriched)

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

    # Notify only impacted faculty members via direct messages.
    _notify_impacted_faculty_conflicts(
        admin_user_id=user.id,
        semester=semester,
        unassigned=unassigned_with_suggestions,
        assigned_slots=timetable,
    )
    _cleanup_duplicate_auto_conflicts()
    db.session.commit()

    return jsonify({
        "message": "Timetable draft generated with clash-free auto room allocation",
        "semester": semester,
        "total_requested": len(draft_slots),
        "total_slots": len(timetable),
        "total_unassigned": len(unassigned_with_suggestions),
        "unassigned": unassigned_with_suggestions,
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


@preference_bp.route("/api/faculty/timetable/pulse", methods=["GET"])
@jwt_required()
def get_faculty_timetable_pulse():
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    now = datetime.now()
    day = _normalize_day(request.args.get("day")) or now.strftime("%A")
    semester = (request.args.get("semester") or "").strip()
    current_minutes = now.hour * 60 + now.minute

    query = TimetableSlot.query.filter(
        TimetableSlot.faculty_id == user.id,
        TimetableSlot.day == day,
    )
    if semester:
        query = query.filter(TimetableSlot.semester == semester)
    rows = query.order_by(TimetableSlot.start_time.asc()).all()

    serialized = [_serialize_timetable_slot(slot) for slot in rows]
    current_slot = None
    next_slot = None

    for row in serialized:
        start_minutes = _time_to_minutes(row.get("start_time"))
        end_minutes = _time_to_minutes(row.get("end_time"))
        if start_minutes is None or end_minutes is None:
            continue
        if start_minutes <= current_minutes < end_minutes:
            current_slot = row
        elif start_minutes > current_minutes and next_slot is None:
            next_slot = row

    return jsonify({
        "day": day,
        "server_time": now.strftime("%H:%M:%S"),
        "slots": serialized,
        "current_slot": current_slot,
        "next_slot": next_slot,
    }), 200


@preference_bp.route("/api/faculty/timetable/upcoming-queue", methods=["GET"])
@jwt_required()
def get_faculty_upcoming_queue():
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    semester = (request.args.get("semester") or "").strip()
    limit = request.args.get("limit", default=8, type=int) or 8
    limit = max(1, min(limit, 20))
    now = datetime.now()

    query = TimetableSlot.query
    if semester:
        query = query.filter(TimetableSlot.semester == semester)
    rows = query.all()

    upcoming = []
    for slot in rows:
        minutes_until = _minutes_until_slot(now, slot.day, slot.start_time)
        if minutes_until is None:
            continue
        if minutes_until == 0:
            continue
        item = _serialize_timetable_slot(slot)
        item["minutes_until"] = minutes_until
        upcoming.append(item)

    upcoming = sorted(upcoming, key=lambda item: (item["minutes_until"], item.get("room") or "", item.get("subject") or ""))
    trimmed = upcoming[:limit]

    return jsonify({
        "generated_at": now.isoformat(),
        "semester": semester,
        "count": len(trimmed),
        "items": trimmed,
    }), 200


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

    if "faculty_mail_sender_email" in data:
        sender_email = _normalize_email(data.get("faculty_mail_sender_email"))
        if sender_email and ("@" not in sender_email or "." not in sender_email.split("@")[-1]):
            return jsonify({"message": "Enter a valid faculty mail sender email"}), 400
        user.faculty_mail_sender_email = sender_email or None

    if "faculty_mail_app_password" in data:
        raw_pass = (data.get("faculty_mail_app_password") or "").strip()
        user.faculty_mail_app_password = raw_pass or None

    if "faculty_mail_notifications_enabled" in data:
        try:
            user.faculty_mail_notifications_enabled = _to_bool(data.get("faculty_mail_notifications_enabled"))
        except ValueError:
            return jsonify({"message": "faculty_mail_notifications_enabled must be a boolean"}), 400

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


@preference_bp.route("/api/faculty/profile/photo", methods=["DELETE"])
@jwt_required()
def delete_faculty_profile_photo():
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    if not user.profile_image:
        return jsonify({"message": "No profile photo to remove", "profile": _serialize_faculty_profile(user)}), 200

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


@preference_bp.route("/api/admin/classrooms", methods=["GET"])
@jwt_required()
def get_admin_classrooms():
    user = _get_current_user()
    if not user or user.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    rows = (
        Classroom.query
        .filter(Classroom.is_active == True)  # noqa: E712
        .order_by(Classroom.created_at.desc())
        .all()
    )
    return jsonify([_serialize_classroom(row) for row in rows]), 200


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
    payload = [_serialize_admin_message(row) for row in rows]

    if user.role == "student":
        classroom_rows = (
            Classroom.query
            .filter(Classroom.is_active == True)  # noqa: E712
            .order_by(Classroom.created_at.desc())
            .all()
        )
        user_email = (user.email or "").strip().lower()
        for classroom in classroom_rows:
            targeted = _is_classroom_targeted_to_student(classroom, user)
            invited = _is_student_email_invited_for_classroom(classroom.id, user_email) if user_email else False
            if not targeted and not invited:
                continue
            faculty = User.query.get(classroom.faculty_id)
            invite_row = None
            if user_email:
                invite_row = ClassroomAccessEmail.query.filter(
                    ClassroomAccessEmail.classroom_id == classroom.id,
                    ClassroomAccessEmail.student_email == user_email,
                ).first()
            created_at = invite_row.created_at if invite_row and invite_row.created_at else classroom.created_at
            payload.append(_serialize_classroom_invite_notification(classroom, faculty, created_at))
        payload.sort(key=lambda item: item.get("created_at") or "", reverse=True)

    return jsonify(payload), 200


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

    data = request.form if request.form else (request.get_json() or {})
    recipient_id = _parse_int(data.get("recipient_id"))
    subject = (data.get("subject") or "").strip()
    body = (data.get("body") or "").strip()
    attachment = request.files.get("attachment")

    if not recipient_id:
        return jsonify({"message": "recipient_id is required"}), 400
    if recipient_id == user.id:
        return jsonify({"message": "You cannot message yourself"}), 400
    if not subject:
        return jsonify({"message": "subject is required"}), 400
    if len(subject) > 160:
        return jsonify({"message": "subject must be 160 characters or fewer"}), 400
    attachment_path = None
    attachment_name = None
    attachment_mime = None
    if attachment and attachment.filename:
        try:
            attachment_path, attachment_name, attachment_mime = _save_chat_attachment(attachment)
        except ValueError as exc:
            return jsonify({"message": str(exc)}), 400
    if not body and not attachment_path:
        return jsonify({"message": "body or attachment is required"}), 400

    recipient = User.query.get(recipient_id)
    if not recipient or recipient.role != "faculty":
        return jsonify({"message": "Recipient faculty not found"}), 404

    row = FacultyPeerMessage(
        sender_id=user.id,
        recipient_id=recipient.id,
        subject=subject,
        body=body or "[Attachment]",
        attachment_path=attachment_path,
        attachment_name=attachment_name,
        attachment_mime=attachment_mime,
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
        .filter(
            or_(
                FacultyPeerMessage.recipient_id == user.id,
                FacultyPeerMessage.sender_id == user.id,
            )
        )
        .order_by(FacultyPeerMessage.created_at.desc())
        .all()
    )
    return jsonify([_serialize_faculty_peer_message(row) for row in rows]), 200


@preference_bp.route("/api/faculty/messages/groups", methods=["POST"])
@jwt_required()
def create_faculty_chat_group():
    user = _get_current_user()
    if not user:
        return jsonify({"message": "Unauthorized"}), 401
    if user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    member_ids = data.get("member_ids") or []
    if not name:
        return jsonify({"message": "name is required"}), 400
    if len(name) > 160:
        return jsonify({"message": "name must be 160 characters or fewer"}), 400
    if not isinstance(member_ids, list):
        return jsonify({"message": "member_ids must be an array"}), 400

    normalized_ids = set()
    for raw_id in member_ids:
        member_id = _parse_int(raw_id)
        if member_id:
            normalized_ids.add(member_id)
    normalized_ids.add(user.id)

    faculty_members = User.query.filter(
        User.id.in_(list(normalized_ids)),
        User.role == "faculty",
    ).all()
    valid_member_ids = {row.id for row in faculty_members}
    if user.id not in valid_member_ids:
        return jsonify({"message": "Group creator must be a faculty member"}), 400
    if len(valid_member_ids) < 2:
        return jsonify({"message": "Select at least one additional teacher"}), 400

    group = FacultyChatGroup(name=name, created_by=user.id)
    db.session.add(group)
    db.session.flush()

    for faculty_id in valid_member_ids:
        db.session.add(FacultyChatGroupMember(group_id=group.id, faculty_id=faculty_id))
    db.session.commit()
    return jsonify({"message": "Group created successfully.", "data": _serialize_faculty_group(group)}), 201


@preference_bp.route("/api/faculty/messages/groups", methods=["GET"])
@jwt_required()
def get_faculty_chat_groups():
    user = _get_current_user()
    if not user:
        return jsonify({"message": "Unauthorized"}), 401
    if user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    memberships = (
        FacultyChatGroupMember.query
        .filter(FacultyChatGroupMember.faculty_id == user.id)
        .all()
    )
    group_ids = [m.group_id for m in memberships]
    if not group_ids:
        return jsonify([]), 200
    rows = (
        FacultyChatGroup.query
        .filter(FacultyChatGroup.id.in_(group_ids))
        .order_by(FacultyChatGroup.updated_at.desc())
        .all()
    )
    return jsonify([_serialize_faculty_group(row) for row in rows]), 200


@preference_bp.route("/api/faculty/messages/groups/<int:group_id>/messages", methods=["GET"])
@jwt_required()
def get_faculty_chat_group_messages(group_id):
    user = _get_current_user()
    if not user:
        return jsonify({"message": "Unauthorized"}), 401
    if user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    member = FacultyChatGroupMember.query.filter_by(group_id=group_id, faculty_id=user.id).first()
    if not member:
        return jsonify({"message": "Forbidden"}), 403
    rows = (
        FacultyChatGroupMessage.query
        .filter(FacultyChatGroupMessage.group_id == group_id)
        .order_by(FacultyChatGroupMessage.created_at.asc())
        .all()
    )
    return jsonify([_serialize_faculty_group_message(row) for row in rows]), 200


@preference_bp.route("/api/faculty/messages/groups/<int:group_id>/messages", methods=["POST"])
@jwt_required()
def send_faculty_chat_group_message(group_id):
    user = _get_current_user()
    if not user:
        return jsonify({"message": "Unauthorized"}), 401
    if user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    member = FacultyChatGroupMember.query.filter_by(group_id=group_id, faculty_id=user.id).first()
    if not member:
        return jsonify({"message": "Forbidden"}), 403
    group = FacultyChatGroup.query.get(group_id)
    if not group:
        return jsonify({"message": "Group not found"}), 404

    data = request.form if request.form else (request.get_json() or {})
    body = (data.get("body") or "").strip()
    attachment = request.files.get("attachment")
    attachment_path = None
    attachment_name = None
    attachment_mime = None
    if attachment and attachment.filename:
        try:
            attachment_path, attachment_name, attachment_mime = _save_chat_attachment(attachment)
        except ValueError as exc:
            return jsonify({"message": str(exc)}), 400
    if not body and not attachment_path:
        return jsonify({"message": "body or attachment is required"}), 400

    row = FacultyChatGroupMessage(
        group_id=group_id,
        sender_id=user.id,
        body=body or "[Attachment]",
        attachment_path=attachment_path,
        attachment_name=attachment_name,
        attachment_mime=attachment_mime,
    )
    db.session.add(row)
    group.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Message sent.", "data": _serialize_faculty_group_message(row)}), 201


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

    _cleanup_duplicate_auto_conflicts()
    db.session.commit()

    status = (request.args.get("status") or "").strip().lower()
    query = ConflictRequest.query
    if status in {"open", "in_review", "resolved", "closed", "pending"}:
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
        status="open",
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
        status="open",
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
    impacted_user = User.query.get(row.created_by) if row.created_by else None
    if impacted_user and impacted_user.role == "faculty":
        db.session.add(
            FacultyPeerMessage(
                sender_id=user.id,
                recipient_id=impacted_user.id,
                subject=f"Conflict Resolved - {row.title}",
                body=(
                    "Your conflict request has been marked as resolved by Admin.\n\n"
                    f"Title: {row.title}\n"
                    f"Details: {(row.description or '').strip() or '-'}\n\n"
                    "If this does not match your expectation, raise a new conflict request."
                ),
            )
        )
    db.session.commit()
    _log_admin_activity(user.id, "conflict_resolve", f"Resolved conflict #{row.id}: {row.title}")
    db.session.commit()
    return jsonify({"message": "Conflict resolved", "data": _serialize_conflict(row)}), 200


@preference_bp.route("/api/admin/conflicts/<int:conflict_id>/review", methods=["PATCH"])
@jwt_required()
def review_admin_conflict(conflict_id):
    user = _get_current_user()
    if not user or user.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    row = ConflictRequest.query.get(conflict_id)
    if not row:
        return jsonify({"message": "Conflict not found"}), 404

    row.status = "in_review"
    impacted_user = User.query.get(row.created_by) if row.created_by else None
    if impacted_user and impacted_user.role == "faculty":
        db.session.add(
            FacultyPeerMessage(
                sender_id=user.id,
                recipient_id=impacted_user.id,
                subject=f"Conflict In Review - {row.title}",
                body=(
                    "Your conflict request is now in review by Admin.\n\n"
                    f"Title: {row.title}\n"
                    f"Details: {(row.description or '').strip() or '-'}\n\n"
                    "You will be notified once resolution is finalized."
                ),
            )
        )
    db.session.commit()
    _log_admin_activity(user.id, "conflict_review", f"Marked conflict #{row.id} as in_review")
    db.session.commit()
    return jsonify({"message": "Conflict moved to in_review", "data": _serialize_conflict(row)}), 200


@preference_bp.route("/api/faculty/conflicts/<int:conflict_id>/accept-fix", methods=["PATCH"])
@jwt_required()
def accept_faculty_conflict_fix(conflict_id):
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    row = ConflictRequest.query.get(conflict_id)
    if not row:
        return jsonify({"message": "Conflict not found"}), 404
    if row.created_by != user.id:
        return jsonify({"message": "Forbidden"}), 403

    row.status = "resolved"
    row.resolved_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Fix accepted and conflict resolved.", "data": _serialize_conflict(row)}), 200


@preference_bp.route("/api/faculty/conflicts/<int:conflict_id>/request-manual", methods=["PATCH"])
@jwt_required()
def request_manual_faculty_conflict_resolution(conflict_id):
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    row = ConflictRequest.query.get(conflict_id)
    if not row:
        return jsonify({"message": "Conflict not found"}), 404
    if row.created_by != user.id:
        return jsonify({"message": "Forbidden"}), 403

    row.status = "in_review"
    db.session.commit()
    return jsonify({"message": "Manual review requested from admin.", "data": _serialize_conflict(row)}), 200


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
    join_link = _normalize_join_link(data.get("join_link"))
    drive_link = _normalize_optional_link(data.get("drive_link"))
    meet_link = _normalize_optional_link(data.get("meet_link"))
    semester = (data.get("semester") or "").strip() or None
    department = (data.get("department") or user.department or "").strip() or None
    year = _parse_int(data.get("year"))
    section = (data.get("section") or "").strip() or None
    description = _clean_classroom_description(data.get("description"))
    selected_student_emails = _parse_selected_student_emails(data.get("selected_student_emails"))

    if not title:
        return jsonify({"message": "title is required"}), 400
    if len(title) > 200:
        return jsonify({"message": "title must be 200 characters or fewer"}), 400
    if not subject:
        return jsonify({"message": "subject is required"}), 400
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
        drive_link=drive_link,
        meet_link=meet_link,
        cover_image_path=cover_image_path,
        cover_image_name=cover_image_name,
        cover_image_mime=cover_image_mime,
        is_active=True,
    )
    db.session.add(row)
    db.session.commit()

    invited_email_count = 0
    for email in selected_student_emails:
        exists = ClassroomAccessEmail.query.filter(
            ClassroomAccessEmail.classroom_id == row.id,
            ClassroomAccessEmail.student_email == email,
        ).first()
        if exists:
            continue
        db.session.add(ClassroomAccessEmail(classroom_id=row.id, student_email=email))
        invited_email_count += 1
    if invited_email_count:
        db.session.commit()

    target_students, targeted_scope_count, selected_scope_count = _get_target_students_for_classroom(
        row, selected_student_emails
    )
    email_sent_count = 0
    faculty_sender_count = 0
    platform_sender_count = 0
    for student in target_students:
        if not student.email:
            continue
        try:
            email_sent, sender_type = _send_classroom_invitation_email(student, user, row)
            if email_sent:
                email_sent_count += 1
                if sender_type == "faculty":
                    faculty_sender_count += 1
                else:
                    platform_sender_count += 1
        except Exception:
            current_app.logger.exception(
                "Failed to send classroom invite email",
                extra={"student_id": student.id, "classroom_id": row.id},
            )

    return jsonify({
        "message": "Classroom created successfully.",
        "data": _serialize_classroom(row),
        "notification_summary": {
            "target_students_count": len(target_students),
            "targeted_scope_count": targeted_scope_count,
            "selected_scope_count": selected_scope_count,
            "invited_emails_saved_count": invited_email_count,
            "emails_sent_count": email_sent_count,
            "emails_sent_by_faculty_identity_count": faculty_sender_count,
            "emails_sent_by_platform_count": platform_sender_count,
        },
    }), 201


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


@preference_bp.route("/api/faculty/classrooms/<int:classroom_id>", methods=["PATCH"])
@jwt_required()
def update_faculty_classroom(classroom_id):
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    row = Classroom.query.get(classroom_id)
    if not row:
        return jsonify({"message": "Classroom not found"}), 404
    if row.faculty_id != user.id:
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json() or {}

    if "title" in data:
        title = (data.get("title") or "").strip()
        if not title:
            return jsonify({"message": "title is required"}), 400
        if len(title) > 200:
            return jsonify({"message": "title must be 200 characters or fewer"}), 400
        row.title = title

    if "subject" in data:
        subject = (data.get("subject") or "").strip()
        if not subject:
            return jsonify({"message": "subject is required"}), 400
        row.subject = subject

    if "semester" in data:
        row.semester = (data.get("semester") or "").strip() or None

    if "department" in data:
        row.department = (data.get("department") or "").strip() or None

    if "section" in data:
        row.section = (data.get("section") or "").strip() or None

    if "description" in data:
        row.description = _clean_classroom_description(data.get("description"))

    if "join_link" in data:
        row.join_link = _normalize_join_link(data.get("join_link"))
    if "drive_link" in data:
        row.drive_link = _normalize_optional_link(data.get("drive_link"))
    if "meet_link" in data:
        row.meet_link = _normalize_optional_link(data.get("meet_link"))

    if "year" in data:
        year = _parse_int(data.get("year"))
        if year is not None and (year < 1 or year > 8):
            return jsonify({"message": "year must be between 1 and 8"}), 400
        row.year = year

    db.session.commit()
    return jsonify({"message": "Classroom updated successfully.", "data": _serialize_classroom(row)}), 200


@preference_bp.route("/api/faculty/classrooms/<int:classroom_id>/access-emails", methods=["GET"])
@jwt_required()
def get_faculty_classroom_access_emails(classroom_id):
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    classroom = Classroom.query.get(classroom_id)
    if not classroom:
        return jsonify({"message": "Classroom not found"}), 404
    if classroom.faculty_id != user.id:
        return jsonify({"message": "Forbidden"}), 403

    rows = (
        ClassroomAccessEmail.query
        .filter(ClassroomAccessEmail.classroom_id == classroom_id)
        .order_by(ClassroomAccessEmail.created_at.desc())
        .all()
    )
    payload = [
        {
            "id": row.id,
            "student_email": row.student_email,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]
    return jsonify(payload), 200


@preference_bp.route("/api/faculty/classrooms/<int:classroom_id>/access-emails", methods=["POST"])
@jwt_required()
def add_faculty_classroom_access_email(classroom_id):
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    classroom = Classroom.query.get(classroom_id)
    if not classroom:
        return jsonify({"message": "Classroom not found"}), 404
    if classroom.faculty_id != user.id:
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json() or {}
    email = _normalize_email(data.get("student_email"))
    if not email:
        return jsonify({"message": "student_email is required"}), 400
    if "@" not in email or "." not in email.split("@")[-1]:
        return jsonify({"message": "Enter a valid student email"}), 400

    student = User.query.filter(func.lower(User.email) == email).first()
    if not student or student.role != "student":
        return jsonify({"message": "No student account found with this email."}), 400

    existing = ClassroomAccessEmail.query.filter(
        ClassroomAccessEmail.classroom_id == classroom_id,
        ClassroomAccessEmail.student_email == email,
    ).first()
    if existing:
        return jsonify({
            "message": "Email already added.",
            "data": {
                "id": existing.id,
                "student_email": existing.student_email,
                "created_at": existing.created_at.isoformat() if existing.created_at else None,
            },
        }), 200

    row = ClassroomAccessEmail(
        classroom_id=classroom_id,
        student_email=email,
    )
    db.session.add(row)
    db.session.commit()

    email_sent = False
    sender_type = None
    try:
        email_sent, sender_type = _send_classroom_invitation_email(student, user, classroom)
    except Exception:
        current_app.logger.exception(
            "Failed to send classroom invite email after access invite",
            extra={"student_id": student.id, "classroom_id": classroom.id},
        )

    return jsonify({
        "message": "Student access email added and invite notification processed.",
        "data": {
            "id": row.id,
            "student_email": row.student_email,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        },
        "delivery": {
            "email_sent": bool(email_sent),
            "sender_type": sender_type or "unavailable",
        },
    }), 201


@preference_bp.route("/api/faculty/classrooms/<int:classroom_id>/access-emails/<int:access_email_id>", methods=["DELETE"])
@jwt_required()
def delete_faculty_classroom_access_email(classroom_id, access_email_id):
    user = _get_current_user()
    if not user or user.role != "faculty":
        return jsonify({"message": "Forbidden"}), 403

    classroom = Classroom.query.get(classroom_id)
    if not classroom:
        return jsonify({"message": "Classroom not found"}), 404
    if classroom.faculty_id != user.id:
        return jsonify({"message": "Forbidden"}), 403

    row = ClassroomAccessEmail.query.get(access_email_id)
    if not row or row.classroom_id != classroom_id:
        return jsonify({"message": "Access email not found"}), 404

    db.session.delete(row)
    db.session.commit()
    return jsonify({"message": "Student access email removed."}), 200


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

    invited_classroom_ids = {
        row.classroom_id
        for row in ClassroomAccessEmail.query.filter(
            ClassroomAccessEmail.student_email == _normalize_email(user.email)
        ).all()
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
        has_target_match = _is_classroom_targeted_to_student(row, user)
        has_email_access = row.id in invited_classroom_ids
        if not has_target_match and not has_email_access:
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
    has_target_match = _is_classroom_targeted_to_student(classroom, user)
    has_email_access = _is_student_email_invited_for_classroom(classroom.id, user.email)
    if not has_target_match and not has_email_access:
        return jsonify({"message": "This classroom is not targeted for your class or invited email."}), 403

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


@preference_bp.route("/api/student/classrooms/<int:classroom_id>/people", methods=["GET"])
@jwt_required()
def get_student_classroom_people(classroom_id):
    user = _get_current_user()
    if not user or user.role != "student":
        return jsonify({"message": "Forbidden"}), 403

    classroom = Classroom.query.get(classroom_id)
    if not classroom or not classroom.is_active:
        return jsonify({"message": "Classroom not found"}), 404

    membership = ClassroomMembership.query.filter(
        ClassroomMembership.classroom_id == classroom_id,
        ClassroomMembership.student_id == user.id,
    ).first()
    if not membership:
        return jsonify({"message": "Forbidden"}), 403

    rows = (
        ClassroomMembership.query
        .filter(ClassroomMembership.classroom_id == classroom_id)
        .order_by(ClassroomMembership.joined_at.asc())
        .all()
    )
    return jsonify([_serialize_classroom_member(row) for row in rows]), 200


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
    review_content_changed = False
    if "status" in data:
        status = (data.get("status") or "").strip().lower()
        if status not in {"submitted", "reviewed", "needs_revision"}:
            return jsonify({"message": "status must be submitted, reviewed, or needs_revision"}), 400
        submission.status = status
    if "teacher_feedback" in data:
        feedback = str(data.get("teacher_feedback") or "").strip()
        submission.teacher_feedback = feedback or None
        review_content_changed = True
    if "grade" in data:
        grade = str(data.get("grade") or "").strip()
        if len(grade) > 20:
            return jsonify({"message": "grade must be 20 characters or fewer"}), 400
        submission.grade = grade or None
        review_content_changed = True
    if "section_grades" in data:
        try:
            section_grades = _clean_section_grades(data.get("section_grades"))
        except ValueError as exc:
            return jsonify({"message": str(exc)}), 400
        submission.section_grades = json.dumps(section_grades) if section_grades else None
        review_content_changed = True
    if "total_marks_awarded" in data:
        raw = data.get("total_marks_awarded")
        if raw in (None, ""):
            submission.total_marks_awarded = None
        else:
            try:
                total_awarded = float(raw)
            except (TypeError, ValueError):
                return jsonify({"message": "total_marks_awarded must be numeric"}), 400
            if total_awarded < 0:
                return jsonify({"message": "total_marks_awarded must be non-negative"}), 400
            submission.total_marks_awarded = round(total_awarded, 2)
        review_content_changed = True
    if "total_marks_out_of" in data:
        raw = data.get("total_marks_out_of")
        if raw in (None, ""):
            submission.total_marks_out_of = None
        else:
            try:
                total_out_of = float(raw)
            except (TypeError, ValueError):
                return jsonify({"message": "total_marks_out_of must be numeric"}), 400
            if total_out_of <= 0:
                return jsonify({"message": "total_marks_out_of must be greater than 0"}), 400
            submission.total_marks_out_of = round(total_out_of, 2)
        review_content_changed = True

    if (
        submission.total_marks_awarded is not None
        and submission.total_marks_out_of is not None
        and submission.total_marks_awarded > submission.total_marks_out_of
    ):
        return jsonify({"message": "total_marks_awarded cannot exceed total_marks_out_of"}), 400

    if review_content_changed:
        submission.admin_review_status = "pending"
        submission.admin_reviewed_by = None
        submission.admin_reviewed_at = None

    db.session.commit()
    return jsonify({"message": "Submission review updated.", "data": _serialize_submission_for_faculty(submission)}), 200


@preference_bp.route("/api/admin/assignments/submissions/reviews", methods=["GET"])
@jwt_required()
def get_admin_assignment_submission_reviews():
    user = _get_current_user()
    if not user or user.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    status_filter = (request.args.get("status") or "pending").strip().lower()
    allowed_status = {"pending", "approved", "rejected", "all"}
    if status_filter not in allowed_status:
        return jsonify({"message": "status must be pending, approved, rejected, or all"}), 400

    query = AssignmentSubmission.query
    if status_filter != "all":
        query = query.filter(AssignmentSubmission.admin_review_status == status_filter)

    rows = query.order_by(AssignmentSubmission.updated_at.desc()).all()

    # Map submissions to actual faculty-created classrooms so admin reviews are classroom-wise.
    def _review_classroom_key(faculty_id, subject, semester, department, year, section):
        return (
            int(faculty_id) if faculty_id is not None else None,
            _normalize_text_key(subject),
            (semester or "").strip().lower(),
            _normalize_text_key(department),
            int(year) if year is not None else None,
            (section or "").strip().upper(),
        )

    classroom_rows = (
        Classroom.query
        .filter(Classroom.is_active == True)  # noqa: E712
        .order_by(Classroom.created_at.desc())
        .all()
    )
    classroom_map = {}
    for room in classroom_rows:
        key = _review_classroom_key(
            room.faculty_id,
            room.subject,
            room.semester,
            room.department,
            room.year,
            room.section,
        )
        # Keep the latest created classroom for a given academic scope.
        if key not in classroom_map:
            classroom_map[key] = room

    payload = []
    for row in rows:
        item = _serialize_submission_for_faculty(row)
        assignment = Assignment.query.get(row.assignment_id)
        item["assignment"] = _serialize_assignment(assignment) if assignment else None
        if assignment:
            room_key = _review_classroom_key(
                assignment.created_by,
                assignment.subject,
                assignment.semester,
                assignment.department,
                assignment.year,
                assignment.section,
            )
            classroom = classroom_map.get(room_key)
            item["classroom"] = _serialize_classroom(classroom) if classroom else None
        else:
            item["classroom"] = None
        payload.append(item)
    return jsonify(payload), 200


@preference_bp.route("/api/admin/assignments/submissions/<int:submission_id>/review", methods=["PATCH"])
@jwt_required()
def review_admin_assignment_submission(submission_id):
    user = _get_current_user()
    if not user or user.role != "admin":
        return jsonify({"message": "Forbidden"}), 403

    submission = AssignmentSubmission.query.get(submission_id)
    if not submission:
        return jsonify({"message": "Submission not found"}), 404

    data = request.get_json() or {}
    status = (data.get("status") or "").strip().lower()
    if status not in {"approved", "rejected"}:
        return jsonify({"message": "status must be approved or rejected"}), 400

    submission.admin_review_status = status
    submission.admin_reviewed_by = user.id
    submission.admin_reviewed_at = datetime.utcnow()
    db.session.commit()
    _log_admin_activity(user.id, "assignment_review", f"Marked submission #{submission.id} as {status}")
    db.session.commit()

    return jsonify({"message": f"Submission marked as {status}.", "data": _serialize_submission_for_faculty(submission)}), 200


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

    if "is_active" in data:
        try:
            next_active = _to_bool(data.get("is_active"))
        except ValueError:
            return jsonify({"message": "is_active must be true or false"}), 400
        if user.id == admin.id and next_active is False:
            return jsonify({"message": "You cannot disable your own account"}), 400
        user.is_active = next_active

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
