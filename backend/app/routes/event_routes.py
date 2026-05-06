from datetime import datetime
from urllib.request import urlopen
from urllib.error import URLError, HTTPError

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from app.extensions import db
from app.models import Event, User

event_bp = Blueprint("events", __name__)
GOOGLE_INDIA_HOLIDAY_ICS_URL = (
    "https://calendar.google.com/calendar/ical/"
    "en.indian%23holiday%40group.v.calendar.google.com/public/basic.ics"
)


def _get_current_user():
    user_id = get_jwt_identity()
    return User.query.get(int(user_id))


def _serialize_event(event):
    creator = User.query.get(event.created_by)
    creator_role = creator.role if creator else None
    return {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "date": event.date,
        "created_by": event.created_by,
        "creator_name": creator.name if creator else None,
        "creator_role": creator_role,
        "audience": "private" if creator_role == "student" else "campus",
        "created_at": event.created_at.isoformat() if event.created_at else None,
    }


def _expand_ics_lines(raw_text):
    lines = raw_text.splitlines()
    unfolded = []
    for line in lines:
        if not line:
            unfolded.append("")
            continue
        if line.startswith((" ", "\t")) and unfolded:
            unfolded[-1] += line[1:]
        else:
            unfolded.append(line)
    return unfolded


def _parse_ics_holidays(raw_text, start_year, end_year):
    lines = _expand_ics_lines(raw_text)
    holidays = []
    in_event = False
    current_date = None
    current_title = None

    for line in lines:
        if line == "BEGIN:VEVENT":
            in_event = True
            current_date = None
            current_title = None
            continue
        if line == "END:VEVENT":
            if in_event and current_date and current_title:
                try:
                    event_date = datetime.strptime(current_date, "%Y%m%d").date()
                    if start_year <= event_date.year <= end_year:
                        holidays.append(
                            {
                                "id": f"gov-{event_date.isoformat()}-{current_title.strip().lower().replace(' ', '-')}",
                                "title": current_title.strip(),
                                "date": event_date.isoformat(),
                                "audience": "government",
                                "creator_name": "Govt. of India",
                                "creator_role": "government",
                                "description": "Government holiday",
                            }
                        )
                except ValueError:
                    pass
            in_event = False
            continue

        if not in_event:
            continue

        if line.startswith("DTSTART"):
            parts = line.split(":", 1)
            if len(parts) == 2:
                current_date = parts[1].strip()[:8]
        elif line.startswith("SUMMARY:"):
            current_title = line.split(":", 1)[1]

    # Deduplicate by date+title and sort
    dedup = {}
    for item in holidays:
        key = f"{item['date']}|{item['title'].lower()}"
        dedup[key] = item
    return sorted(dedup.values(), key=lambda row: (row["date"], row["title"].lower()))


def _fallback_core_holidays(start_year, end_year):
    movable_holiday_map = {
        2025: [
            ("Maha Shivaratri", "2025-02-26"),
            ("Holi", "2025-03-14"),
            ("Eid al-Fitr", "2025-03-31"),
            ("Ram Navami", "2025-04-06"),
            ("Mahavir Jayanti", "2025-04-10"),
            ("Good Friday", "2025-04-18"),
            ("Buddha Purnima", "2025-05-12"),
            ("Bakrid / Eid al-Adha", "2025-06-07"),
            ("Muharram", "2025-07-06"),
            ("Raksha Bandhan", "2025-08-09"),
            ("Janmashtami", "2025-08-16"),
            ("Milad-un-Nabi", "2025-09-05"),
            ("Navratri Begins", "2025-09-22"),
            ("Dussehra", "2025-10-02"),
            ("Diwali", "2025-10-20"),
            ("Guru Nanak Jayanti", "2025-11-05"),
        ],
        2026: [
            ("Maha Shivaratri", "2026-02-15"),
            ("Holi", "2026-03-03"),
            ("Eid al-Fitr", "2026-03-20"),
            ("Ram Navami", "2026-03-27"),
            ("Mahavir Jayanti", "2026-04-02"),
            ("Good Friday", "2026-04-03"),
            ("Buddha Purnima", "2026-05-01"),
            ("Bakrid / Eid al-Adha", "2026-05-27"),
            ("Muharram", "2026-06-26"),
            ("Raksha Bandhan", "2026-08-28"),
            ("Janmashtami", "2026-09-04"),
            ("Milad-un-Nabi", "2026-08-25"),
            ("Navratri Begins", "2026-10-09"),
            ("Dussehra", "2026-10-18"),
            ("Diwali", "2026-11-08"),
            ("Guru Nanak Jayanti", "2026-11-24"),
        ],
        2027: [
            ("Maha Shivaratri", "2027-03-06"),
            ("Holi", "2027-03-22"),
            ("Eid al-Fitr", "2027-03-10"),
            ("Ram Navami", "2027-04-16"),
            ("Mahavir Jayanti", "2027-04-21"),
            ("Good Friday", "2027-03-26"),
            ("Buddha Purnima", "2027-05-20"),
            ("Bakrid / Eid al-Adha", "2027-05-17"),
            ("Muharram", "2027-06-16"),
            ("Raksha Bandhan", "2027-08-17"),
            ("Janmashtami", "2027-08-24"),
            ("Milad-un-Nabi", "2027-08-15"),
            ("Navratri Begins", "2027-09-29"),
            ("Dussehra", "2027-10-08"),
            ("Diwali", "2027-10-29"),
            ("Guru Nanak Jayanti", "2027-11-13"),
        ],
        2028: [
            ("Maha Shivaratri", "2028-02-23"),
            ("Holi", "2028-03-11"),
            ("Eid al-Fitr", "2028-02-27"),
            ("Ram Navami", "2028-04-04"),
            ("Mahavir Jayanti", "2028-04-09"),
            ("Good Friday", "2028-04-14"),
            ("Buddha Purnima", "2028-05-09"),
            ("Bakrid / Eid al-Adha", "2028-05-05"),
            ("Muharram", "2028-06-04"),
            ("Raksha Bandhan", "2028-08-05"),
            ("Janmashtami", "2028-08-12"),
            ("Milad-un-Nabi", "2028-08-03"),
            ("Navratri Begins", "2028-09-17"),
            ("Dussehra", "2028-09-26"),
            ("Diwali", "2028-10-17"),
            ("Guru Nanak Jayanti", "2028-11-01"),
        ],
        2029: [
            ("Maha Shivaratri", "2029-03-11"),
            ("Holi", "2029-03-28"),
            ("Eid al-Fitr", "2029-02-15"),
            ("Ram Navami", "2029-03-24"),
            ("Mahavir Jayanti", "2029-03-29"),
            ("Good Friday", "2029-03-30"),
            ("Buddha Purnima", "2029-04-27"),
            ("Bakrid / Eid al-Adha", "2029-04-24"),
            ("Muharram", "2029-05-24"),
            ("Raksha Bandhan", "2029-08-23"),
            ("Janmashtami", "2029-08-30"),
            ("Milad-un-Nabi", "2029-07-24"),
            ("Navratri Begins", "2029-10-06"),
            ("Dussehra", "2029-10-15"),
            ("Diwali", "2029-11-05"),
            ("Guru Nanak Jayanti", "2029-11-20"),
        ],
        2030: [
            ("Maha Shivaratri", "2030-03-01"),
            ("Holi", "2030-03-17"),
            ("Eid al-Fitr", "2030-02-05"),
            ("Ram Navami", "2030-04-13"),
            ("Mahavir Jayanti", "2030-04-18"),
            ("Good Friday", "2030-04-19"),
            ("Buddha Purnima", "2030-05-16"),
            ("Bakrid / Eid al-Adha", "2030-04-13"),
            ("Muharram", "2030-05-13"),
            ("Raksha Bandhan", "2030-08-12"),
            ("Janmashtami", "2030-08-19"),
            ("Milad-un-Nabi", "2030-07-13"),
            ("Navratri Begins", "2030-09-26"),
            ("Dussehra", "2030-10-05"),
            ("Diwali", "2030-10-26"),
            ("Guru Nanak Jayanti", "2030-11-09"),
        ],
    }

    rows = []
    for year in range(start_year, end_year + 1):
        rows.extend(
            [
                {
                    "id": f"gov-{year}-01-14-makar-sankranti",
                    "title": "Makar Sankranti",
                    "date": f"{year:04d}-01-14",
                    "audience": "government",
                    "creator_name": "Govt. of India",
                    "creator_role": "government",
                    "description": "Government holiday",
                },
                {
                    "id": f"gov-{year}-01-26-republic-day",
                    "title": "Republic Day",
                    "date": f"{year:04d}-01-26",
                    "audience": "government",
                    "creator_name": "Govt. of India",
                    "creator_role": "government",
                    "description": "Government holiday",
                },
                {
                    "id": f"gov-{year}-04-14-dr-ambedkar-jayanti",
                    "title": "Dr. Ambedkar Jayanti",
                    "date": f"{year:04d}-04-14",
                    "audience": "government",
                    "creator_name": "Govt. of India",
                    "creator_role": "government",
                    "description": "Government holiday",
                },
                {
                    "id": f"gov-{year}-05-01-labour-day",
                    "title": "Labour Day",
                    "date": f"{year:04d}-05-01",
                    "audience": "government",
                    "creator_name": "Govt. of India",
                    "creator_role": "government",
                    "description": "Government holiday",
                },
                {
                    "id": f"gov-{year}-08-15-independence-day",
                    "title": "Independence Day",
                    "date": f"{year:04d}-08-15",
                    "audience": "government",
                    "creator_name": "Govt. of India",
                    "creator_role": "government",
                    "description": "Government holiday",
                },
                {
                    "id": f"gov-{year}-10-02-gandhi-jayanti",
                    "title": "Gandhi Jayanti",
                    "date": f"{year:04d}-10-02",
                    "audience": "government",
                    "creator_name": "Govt. of India",
                    "creator_role": "government",
                    "description": "Government holiday",
                },
                {
                    "id": f"gov-{year}-12-25-christmas-day",
                    "title": "Christmas Day",
                    "date": f"{year:04d}-12-25",
                    "audience": "government",
                    "creator_name": "Govt. of India",
                    "creator_role": "government",
                    "description": "Government holiday",
                },
            ]
        )
        for title, iso_date in movable_holiday_map.get(year, []):
            rows.append(
                {
                    "id": f"gov-{iso_date}-{title.strip().lower().replace(' ', '-')}",
                    "title": title,
                    "date": iso_date,
                    "audience": "government",
                    "creator_name": "Govt. of India",
                    "creator_role": "government",
                    "description": "Government holiday",
                }
            )

    dedup = {}
    for row in rows:
        dedup[f"{row['date']}|{row['title'].lower()}"] = row
    return sorted(dedup.values(), key=lambda item: (item["date"], item["title"].lower()))


@event_bp.route("/api/holidays/india", methods=["GET"])
@jwt_required()
def get_india_holidays():
    now = datetime.now()
    start_year = request.args.get("start_year", default=now.year, type=int)
    end_year = request.args.get("end_year", default=now.year + 1, type=int)

    if start_year < 1970 or end_year > 2200 or start_year > end_year:
        return jsonify({"message": "Invalid start_year/end_year"}), 400

    try:
        with urlopen(GOOGLE_INDIA_HOLIDAY_ICS_URL, timeout=8) as response:
            raw = response.read().decode("utf-8", errors="replace")
        holidays = _parse_ics_holidays(raw, start_year, end_year)
        if holidays:
            return jsonify(holidays), 200
    except (URLError, HTTPError, TimeoutError):
        pass

    return jsonify(_fallback_core_holidays(start_year, end_year)), 200


@event_bp.route("/api/events", methods=["GET"])
@jwt_required()
def list_events():
    user = _get_current_user()
    if not user:
        return jsonify({"message": "Unauthorized"}), 401

    month = request.args.get("month", type=int)
    year = request.args.get("year", type=int)

    query = Event.query
    if month is not None or year is not None:
        if month is None or year is None:
            return jsonify({"message": "Both month and year are required for month filtering"}), 400
        if month < 1 or month > 12 or year < 1970 or year > 2200:
            return jsonify({"message": "Invalid month or year"}), 400

        start_date = f"{year:04d}-{month:02d}-01"
        if month == 12:
            end_date = f"{year + 1:04d}-01-01"
        else:
            end_date = f"{year:04d}-{month + 1:02d}-01"
        query = query.filter(Event.date >= start_date, Event.date < end_date)

    all_events = query.order_by(Event.date.asc(), Event.created_at.desc()).all()
    if user.role == "student":
        filtered = []
        for event in all_events:
            creator = User.query.get(event.created_by)
            creator_role = creator.role if creator else None
            # Students see campus events (faculty/admin) + their own private events.
            if creator_role in {"faculty", "admin"} or event.created_by == user.id:
                filtered.append(event)
        events = filtered
    else:
        events = all_events
    return jsonify([_serialize_event(event) for event in events]), 200


@event_bp.route("/api/events", methods=["POST"])
@jwt_required()
def create_event():
    user = _get_current_user()
    if not user or user.role not in {"faculty", "admin", "student"}:
        return jsonify({"message": "Forbidden"}), 403

    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    date = (data.get("date") or "").strip()
    description = (data.get("description") or "").strip()

    if not title:
        return jsonify({"message": "Title is required"}), 400
    if not date:
        return jsonify({"message": "Date is required"}), 400

    event = Event(
        title=title,
        description=description,
        date=date,
        created_by=user.id,
    )
    db.session.add(event)
    db.session.commit()

    return jsonify({"message": "Event created successfully", "event": _serialize_event(event)}), 201


@event_bp.route("/api/events/<int:event_id>", methods=["PATCH"])
@jwt_required()
def update_event(event_id):
    user = _get_current_user()
    if not user or user.role not in {"faculty", "admin", "student"}:
        return jsonify({"message": "Forbidden"}), 403

    event = Event.query.get(event_id)
    if not event:
        return jsonify({"message": "Event not found"}), 404

    creator = User.query.get(event.created_by)
    creator_role = creator.role if creator else None
    if user.role == "student":
        if event.created_by != user.id or creator_role != "student":
            return jsonify({"message": "Students can edit only their private events"}), 403
    elif user.role != "admin" and event.created_by != user.id:
        return jsonify({"message": "Only event creator can edit"}), 403

    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    date = (data.get("date") or "").strip()
    description = (data.get("description") or "").strip()

    if not title:
        return jsonify({"message": "Title is required"}), 400
    if not date:
        return jsonify({"message": "Date is required"}), 400

    event.title = title
    event.date = date
    event.description = description
    db.session.commit()

    return jsonify({"message": "Event updated successfully", "event": _serialize_event(event)}), 200


@event_bp.route("/api/events/<int:event_id>", methods=["DELETE"])
@jwt_required()
def delete_event(event_id):
    user = _get_current_user()
    if not user or user.role not in {"faculty", "admin", "student"}:
        return jsonify({"message": "Forbidden"}), 403

    event = Event.query.get(event_id)
    if not event:
        return jsonify({"message": "Event not found"}), 404

    creator = User.query.get(event.created_by)
    creator_role = creator.role if creator else None
    if user.role == "student":
        if event.created_by != user.id or creator_role != "student":
            return jsonify({"message": "Students can delete only their private events"}), 403
    elif user.role != "admin" and event.created_by != user.id:
        return jsonify({"message": "Only event creator can delete"}), 403

    db.session.delete(event)
    db.session.commit()
    return jsonify({"message": "Event deleted successfully"}), 200
