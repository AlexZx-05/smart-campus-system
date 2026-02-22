from app import create_app
from app.models import User


TARGET_EMAILS = [
    "admin1@iiitr.ac.in",
    "admin2@iiitr.ac.in",
    "admin3@iiitr.ac.in",
    "admin4@iiitr.ac.in",
]


def main():
    app = create_app()
    with app.app_context():
        rows = (
            User.query.filter(User.email.in_(TARGET_EMAILS))
            .order_by(User.email.asc())
            .all()
        )
        for user in rows:
            print(f"{user.email}|{user.role}|{user.roll_number}")


if __name__ == "__main__":
    main()
