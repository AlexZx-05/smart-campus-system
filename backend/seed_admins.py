from werkzeug.security import generate_password_hash

from app import create_app, db
from app.models import User


ADMIN_CREDENTIALS = [
    {"email": "admin1@iiitr.ac.in", "password": "Campus@Admin1#2026", "name": "Admin One", "roll_number": "ADMIN001"},
    {"email": "admin2@iiitr.ac.in", "password": "Campus@Admin2#2026", "name": "Admin Two", "roll_number": "ADMIN002"},
    {"email": "admin3@iiitr.ac.in", "password": "Campus@Admin3#2026", "name": "Admin Three", "roll_number": "ADMIN003"},
    {"email": "admin4@iiitr.ac.in", "password": "Campus@Admin4#2026", "name": "Admin Four", "roll_number": "ADMIN004"},
]


def _get_unique_roll_number(base_roll, email):
    normalized_email = (email or "").strip().lower()
    candidate = base_roll
    suffix = 1
    while True:
        existing = User.query.filter_by(roll_number=candidate).first()
        if not existing or existing.email == normalized_email:
            return candidate
        candidate = f"{base_roll}_{suffix}"
        suffix += 1


def upsert_admin_users():
    app = create_app()
    with app.app_context():
        for item in ADMIN_CREDENTIALS:
            email = item["email"].strip().lower()
            password = item["password"]
            name = item["name"]
            roll_number = _get_unique_roll_number(item["roll_number"], email)

            user = User.query.filter_by(email=email).first()
            if user:
                user.name = name
                user.role = "admin"
                user.password = generate_password_hash(password)
                user.roll_number = roll_number
                if not user.department:
                    user.department = "ADMIN"
            else:
                user = User(
                    name=name,
                    email=email,
                    password=generate_password_hash(password),
                    role="admin",
                    roll_number=roll_number,
                    department="ADMIN",
                    year=0,
                    section="",
                )
                db.session.add(user)

        db.session.commit()
        print("Admin accounts are ready.")


if __name__ == "__main__":
    upsert_admin_users()
