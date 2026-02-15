from app import create_app, db
from app.models import User
from werkzeug.security import generate_password_hash

app = create_app()
with app.app_context():
    email = "deepak@gmail.com"
    user = User.query.filter_by(email=email).first()
    
    if user:
        print(f"User found: {user.name} ({user.role})")
        # Reset password
        user.password = generate_password_hash("password123")
        db.session.commit()
        print(f"Password for {email} has been reset to: password123")
    else:
        print(f"User {email} not found. Creating new student user...")
        new_user = User(
            name="Deepak",
            email=email,
            password=generate_password_hash("password123"),
            role="student",
            roll_number="STU101",
            department="CS"
        )
        db.session.add(new_user)
        db.session.commit()
        print(f"User {email} created with password: password123")
