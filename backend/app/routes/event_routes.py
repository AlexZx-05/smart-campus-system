from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from app.extensions import db
from app.models import Event, User

event_bp = Blueprint("events", __name__)


def _get_current_user():
    user_id = get_jwt_identity()
    return User.query.get(int(user_id))


def _serialize_event(event):
    creator = User.query.get(event.created_by)
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


@event_bp.route("/api/events", methods=["GET"])
@jwt_required()
def list_events():
    events = Event.query.order_by(Event.date.asc(), Event.created_at.desc()).all()
    return jsonify([_serialize_event(event) for event in events]), 200


@event_bp.route("/api/events", methods=["POST"])
@jwt_required()
def create_event():
    user = _get_current_user()
    if not user or user.role not in {"faculty", "admin"}:
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
    if not user or user.role not in {"faculty", "admin"}:
        return jsonify({"message": "Forbidden"}), 403

    event = Event.query.get(event_id)
    if not event:
        return jsonify({"message": "Event not found"}), 404

    if event.created_by != user.id:
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
    if not user or user.role not in {"faculty", "admin"}:
        return jsonify({"message": "Forbidden"}), 403

    event = Event.query.get(event_id)
    if not event:
        return jsonify({"message": "Event not found"}), 404

    if event.created_by != user.id:
        return jsonify({"message": "Only event creator can delete"}), 403

    db.session.delete(event)
    db.session.commit()
    return jsonify({"message": "Event deleted successfully"}), 200

