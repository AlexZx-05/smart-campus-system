from datetime import datetime, timedelta, timezone
import base64
import json
import smtplib
import uuid
from email.message import EmailMessage
from urllib import error as url_error
from urllib import parse as url_parse
from urllib import request as url_request

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import create_access_token
from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db
from app.models import User


auth_bp = Blueprint("auth", __name__)


def _normalize_email(email):
    return (email or "").strip().lower()


def _normalize_phone(phone):
    value = (phone or "").strip()
    if not value:
        return ""

    digits = "".join(ch for ch in value if ch.isdigit())
    if not digits:
        return ""

    if value.startswith("+"):
        return f"+{digits}"

    # Local India number without country code.
    if len(digits) == 10:
        return f"+91{digits}"

    # Fallback: treat as already including country code but missing '+'.
    return f"+{digits}"


def _is_admin_email_allowed(email):
    allowed = set(current_app.config.get("ADMIN_ALLOWED_EMAILS", []))
    return _normalize_email(email) in allowed


def _mask_email(email):
    value = _normalize_email(email)
    if "@" not in value:
        return value
    local, domain = value.split("@", 1)
    if len(local) <= 2:
        masked_local = local[0] + "*"
    else:
        masked_local = local[:2] + "*" * max(2, len(local) - 2)
    return f"{masked_local}@{domain}"


def _mask_phone(phone):
    value = _normalize_phone(phone)
    if len(value) <= 4:
        return "****"
    return f"{value[:3]}{'*' * max(4, len(value) - 7)}{value[-4:]}"


def _send_reset_email(to_email, token):
    smtp_host = current_app.config.get("MAIL_SMTP_HOST")
    smtp_port = current_app.config.get("MAIL_SMTP_PORT")
    smtp_user = current_app.config.get("MAIL_SMTP_USERNAME")
    smtp_pass = (current_app.config.get("MAIL_SMTP_PASSWORD") or "").replace(" ", "")
    from_email = current_app.config.get("MAIL_FROM_EMAIL") or smtp_user
    use_tls = current_app.config.get("MAIL_USE_TLS", True)
    frontend_url = current_app.config.get("FRONTEND_URL", "http://127.0.0.1:3000")

    if not smtp_host or not smtp_port or not smtp_user or not smtp_pass or not from_email:
        raise RuntimeError("Email service is not configured. Set MAIL_SMTP_* and MAIL_FROM_EMAIL.")

    msg = EmailMessage()
    msg["Subject"] = "Smart Campus Password Reset Token"
    msg["From"] = from_email
    msg["To"] = to_email
    msg.set_content(
        "You requested a password reset for Smart Campus.\n\n"
        f"Reset token: {token}\n\n"
        f"Use this token on: {frontend_url}/reset-password\n\n"
        "If you did not request this reset, please ignore this email."
    )

    with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
        if use_tls:
            server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)


def _verify_google_id_token(id_token):
    token_info_url = "https://oauth2.googleapis.com/tokeninfo"
    query = url_parse.urlencode({"id_token": id_token})
    full_url = f"{token_info_url}?{query}"

    try:
        with url_request.urlopen(full_url, timeout=10) as response:
            payload = response.read().decode("utf-8")
            token_data = json.loads(payload)
    except url_error.HTTPError as err:
        detail = err.read().decode("utf-8", errors="ignore") if err.fp else ""
        raise ValueError(f"Invalid Google token. {detail}".strip()) from err
    except Exception as err:
        raise RuntimeError(f"Google token verification failed: {err}") from err

    configured_client_id = (current_app.config.get("GOOGLE_CLIENT_ID") or "").strip()
    if not configured_client_id:
        raise RuntimeError("Google OAuth is not configured. Set GOOGLE_CLIENT_ID.")

    token_aud = (token_data.get("aud") or "").strip()
    if token_aud != configured_client_id:
        raise ValueError("Google token audience mismatch.")

    email = _normalize_email(token_data.get("email"))
    if not email:
        raise ValueError("Google token does not contain email.")

    email_verified = str(token_data.get("email_verified", "false")).lower() == "true"
    if not email_verified:
        raise ValueError("Google email is not verified.")

    domain_restriction = (current_app.config.get("GOOGLE_ALLOWED_DOMAIN") or "").strip().lower()
    if domain_restriction and not email.endswith(f"@{domain_restriction}"):
        raise ValueError(f"Only {domain_restriction} emails are allowed.")

    exp = token_data.get("exp")
    if exp:
        expiry = datetime.fromtimestamp(int(exp), tz=timezone.utc)
        if datetime.now(timezone.utc) > expiry:
            raise ValueError("Google token is expired.")

    return email, token_data


def _twilio_auth_header(account_sid, auth_token):
    raw = f"{account_sid}:{auth_token}".encode("utf-8")
    return f"Basic {base64.b64encode(raw).decode('utf-8')}"


def _twilio_post(path, form_data):
    account_sid = (current_app.config.get("TWILIO_ACCOUNT_SID") or "").strip()
    auth_token = (current_app.config.get("TWILIO_AUTH_TOKEN") or "").strip()
    service_sid = (current_app.config.get("TWILIO_VERIFY_SERVICE_SID") or "").strip()

    if not account_sid or not auth_token or not service_sid:
        raise RuntimeError("Twilio Verify is not configured.")

    url = f"https://verify.twilio.com/v2/Services/{service_sid}/{path}"
    body = url_parse.urlencode(form_data).encode("utf-8")
    req = url_request.Request(url, data=body, method="POST")
    req.add_header("Authorization", _twilio_auth_header(account_sid, auth_token))
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    try:
        with url_request.urlopen(req, timeout=15) as response:
            payload = response.read().decode("utf-8")
            return json.loads(payload)
    except url_error.HTTPError as err:
        detail = err.read().decode("utf-8", errors="ignore") if err.fp else ""
        raise ValueError(f"Twilio Verify request failed. {detail}".strip()) from err
    except Exception as err:
        raise RuntimeError(f"Twilio Verify request failed: {err}") from err


def _otp_window_reset_if_required(user, now):
    window_start = user.otp_window_started_at
    if not window_start or (now - window_start) >= timedelta(hours=1):
        user.otp_window_started_at = now
        user.otp_request_count_hour = 0


# ---------------- REGISTER ----------------
@auth_bp.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()

    if not data:
        return jsonify({"message": "No data provided"}), 400

    email = _normalize_email(data.get("email"))
    password = data.get("password")
    role = (data.get("role", "student") or "student").strip().lower()
    phone_number = _normalize_phone(data.get("phone_number"))

    if not email or not password or not phone_number:
        return jsonify({"message": "Email, password and phone number are required"}), 400

    if role not in ["student", "faculty", "admin"]:
        return jsonify({"message": "Invalid role"}), 400

    if role == "admin" and not _is_admin_email_allowed(email):
        return jsonify({"message": "Admin registration is restricted by developer allowlist"}), 403

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already exists"}), 400

    if phone_number and User.query.filter_by(phone_number=phone_number).first():
        return jsonify({"message": "Phone number already exists"}), 400

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
        phone_number=phone_number or None,
        password=hashed_password,
        roll_number=roll_number,
        department=data.get("department"),
        year=data.get("year", 0),
        section=data.get("section", ""),
        role=role,
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        "message": f"{role.capitalize()} registered successfully"
    }), 201


# ---------------- LOGIN (PASSWORD) ----------------
@auth_bp.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data:
        return jsonify({"message": "No data provided"}), 400

    email = _normalize_email(data.get("email"))
    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password, data.get("password")):
        return jsonify({"message": "Invalid credentials"}), 401

    if user.role == "admin" and not _is_admin_email_allowed(user.email):
        return jsonify({"message": "This admin account is not authorized in allowlist"}), 403

    access_token = create_access_token(identity=str(user.id))

    return jsonify({
        "access_token": access_token,
        "role": user.role,
    }), 200


# ---------------- LOGIN (REGISTERED GOOGLE ACCOUNT) ----------------
@auth_bp.route("/api/login/google", methods=["POST"])
def login_google():
    data = request.get_json()
    if not data:
        return jsonify({"message": "No data provided"}), 400

    id_token = (data.get("id_token") or "").strip()
    if not id_token:
        return jsonify({"message": "Google token is required"}), 400

    try:
        email, token_data = _verify_google_id_token(id_token)
    except ValueError as err:
        return jsonify({"message": str(err)}), 401
    except Exception as err:
        current_app.logger.exception("Google login verification failed")
        return jsonify({"message": str(err)}), 503

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "This Google email is not registered. Please register first."}), 404

    if user.role == "admin" and not _is_admin_email_allowed(user.email):
        return jsonify({"message": "This admin account is not authorized in allowlist"}), 403

    # Keep user profile name fresh from Google when available.
    google_name = (token_data.get("name") or "").strip()
    if google_name and user.name != google_name:
        user.name = google_name
        db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": access_token, "role": user.role}), 200


# ---------------- LOGIN (OTP REQUEST) ----------------
@auth_bp.route("/api/login/otp/request", methods=["POST"])
def request_login_otp():
    data = request.get_json()
    if not data:
        return jsonify({"message": "No data provided"}), 400

    email = _normalize_email(data.get("email"))
    if not email:
        return jsonify({"message": "Registered email is required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "User not found"}), 404

    if user.role == "admin" and not _is_admin_email_allowed(user.email):
        return jsonify({"message": "This admin account is not authorized in allowlist"}), 403

    phone = _normalize_phone(user.phone_number)
    provided_phone = _normalize_phone(data.get("phone_number"))
    if not phone and provided_phone:
        existing_owner = User.query.filter(
            User.phone_number == provided_phone,
            User.id != user.id,
        ).first()
        if existing_owner:
            return jsonify({"message": "This phone number is already linked to another account."}), 400
        user.phone_number = provided_phone
        phone = provided_phone
        db.session.commit()
    if not phone:
        return jsonify({"message": "No phone number found for this account. Enter your mobile number and try again."}), 400

    now = datetime.utcnow()
    _otp_window_reset_if_required(user, now)

    cooldown_seconds = max(0, int(current_app.config.get("OTP_RESEND_COOLDOWN_SECONDS", 30)))
    if user.otp_last_requested_at and (now - user.otp_last_requested_at) < timedelta(seconds=cooldown_seconds):
        remaining = cooldown_seconds - int((now - user.otp_last_requested_at).total_seconds())
        return jsonify({
            "message": f"Please wait {max(1, remaining)} seconds before requesting another OTP.",
            "retry_after_seconds": max(1, remaining),
        }), 429

    max_requests = max(1, int(current_app.config.get("OTP_MAX_REQUESTS_PER_HOUR", 5)))
    if user.otp_request_count_hour >= max_requests:
        return jsonify({"message": "OTP request limit reached. Try again after 1 hour."}), 429

    channel = (data.get("channel") or "sms").strip().lower()
    if channel not in {"sms", "call"}:
        return jsonify({"message": "Invalid OTP channel. Use 'sms' or 'call'."}), 400

    try:
        result = _twilio_post("Verifications", {"To": phone, "Channel": channel})
    except ValueError as err:
        return jsonify({"message": str(err)}), 400
    except Exception as err:
        current_app.logger.exception("Failed to request OTP")
        return jsonify({"message": str(err)}), 503

    user.otp_request_count_hour += 1
    user.otp_last_requested_at = now
    user.otp_failed_attempts = 0
    db.session.commit()

    return jsonify({
        "message": f"OTP sent to {_mask_phone(phone)}.",
        "destination": _mask_phone(phone),
        "status": result.get("status", "pending"),
        "channel": channel,
    }), 200


# ---------------- LOGIN (OTP VERIFY) ----------------
@auth_bp.route("/api/login/otp/verify", methods=["POST"])
def verify_login_otp():
    data = request.get_json()
    if not data:
        return jsonify({"message": "No data provided"}), 400

    email = _normalize_email(data.get("email"))
    code = (data.get("code") or "").strip()

    if not email or not code:
        return jsonify({"message": "Registered email and OTP code are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "User not found"}), 404

    if user.role == "admin" and not _is_admin_email_allowed(user.email):
        return jsonify({"message": "This admin account is not authorized in allowlist"}), 403

    phone = _normalize_phone(user.phone_number)
    if not phone:
        return jsonify({"message": "No phone number found for this account"}), 400

    max_attempts = max(1, int(current_app.config.get("OTP_MAX_ATTEMPTS", 5)))
    if user.otp_failed_attempts >= max_attempts:
        return jsonify({
            "message": "Maximum OTP verification attempts reached. Request a new OTP.",
            "max_attempts": max_attempts,
        }), 429

    try:
        result = _twilio_post("VerificationCheck", {"To": phone, "Code": code})
    except ValueError as err:
        return jsonify({"message": str(err)}), 400
    except Exception as err:
        current_app.logger.exception("Failed to verify OTP")
        return jsonify({"message": str(err)}), 503

    status = (result.get("status") or "").lower()
    if status != "approved":
        user.otp_failed_attempts += 1
        db.session.commit()
        attempts_left = max(0, max_attempts - user.otp_failed_attempts)
        return jsonify({
            "message": "Invalid or expired OTP code.",
            "attempts_remaining": attempts_left,
        }), 401

    user.otp_failed_attempts = 0
    user.otp_last_verified_at = datetime.utcnow()
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": access_token, "role": user.role}), 200


# ---------------- FORGOT PASSWORD ----------------
@auth_bp.route("/api/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json()

    if not data:
        return jsonify({"message": "No data provided"}), 400

    email = _normalize_email(data.get("email"))
    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"message": "User not found"}), 404

    token = str(uuid.uuid4())
    try:
        _send_reset_email(user.email, token)
    except Exception as err:
        err_text = str(err or "")
        if "Email service is not configured" in err_text:
            if current_app.debug:
                user.reset_token = token
                db.session.commit()
                current_app.logger.warning(
                    "SMTP not configured; exposing development reset token for %s",
                    user.email,
                )
                return jsonify({
                    "message": "Email service is not configured. Development reset token is shown below.",
                    "email_sent": False,
                    "delivery_mode": "dev_token",
                    "reset_token": token,
                    "recipient": _mask_email(user.email),
                }), 200

            current_app.logger.warning(
                "Reset token request blocked for %s because SMTP is not configured.",
                user.email,
            )
            return jsonify({
                "message": "Email service is not configured. Reset token could not be sent. Contact admin.",
                "email_sent": False,
                "recipient": _mask_email(user.email),
            }), 503
        if current_app.debug:
            user.reset_token = token
            db.session.commit()
            current_app.logger.warning(
                "SMTP send failed in debug mode; exposing development reset token for %s. Error: %s",
                user.email,
                err_text,
            )
            return jsonify({
                "message": "Email delivery failed in development mode. Use the development reset token below.",
                "email_sent": False,
                "delivery_mode": "dev_token",
                "reset_token": token,
                "recipient": _mask_email(user.email),
            }), 200
        current_app.logger.exception("Failed to send reset email")
        return jsonify({
            "message": "Unable to send reset email right now. Please try again shortly.",
            "email_sent": False,
            "recipient": _mask_email(user.email),
        }), 500

    user.reset_token = token
    db.session.commit()

    return jsonify({
        "message": f"Reset token sent to {_mask_email(user.email)}.",
        "email_sent": True,
        "recipient": _mask_email(user.email),
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
