# Smart Campus System

Smart Campus System is a full-stack ERP-style project for a college/university.
It has 3 roles:

- `Student`
- `Faculty`
- `Admin`

The app helps manage timetable preferences, room allocation, admin announcements, calendar events, user management, and profile data.

## Tech Stack

- Frontend: `React + Vite + Tailwind`
- Backend: `Flask + SQLAlchemy + JWT`
- Database: `SQLite` (`backend/instance/smartcampus.db`)

## Main Features

- Secure login by role
- Student and faculty dashboards
- Admin control center dashboard
- Faculty preference submission
- Timetable draft generation and publish flow
- Room management + live room status
- Admin announcements/messages to faculty/student/all
- User management (list/edit/delete)
- Conflict tracking and resolution
- Calendar events

## Prerequisites

- Node.js (v18+ recommended)
- Python (3.10+ recommended)
- `npm`

## Project Structure

```text
smart-campus-system/
  backend/
    app/
      config.py
      __init__.py
      extensions.py
      models/
      routes/
    instance/
      smartcampus.db
    run.py
    seed_admins.py
    verify_admins.py
  frontend/
    src/
      components/
      layouts/
      pages/
      services/
    package.json
```

## First-Time Setup

### 1) Backend setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

If `requirements.txt` is not available in your copy, install the packages you already use in this backend (Flask, Flask-JWT-Extended, Flask-SQLAlchemy, Flask-CORS, Werkzeug, etc.).

### 2) Frontend setup

```bash
cd frontend
npm install
```

## Admin Security (Important)

Public registration does **not** allow admin role.
Admin access is protected by developer allowlist.

Allowed admin emails are controlled by:

- Env var: `ADMIN_ALLOWED_EMAILS`
- Default in `backend/app/config.py`:
  - `admin1@iiitr.ac.in`
  - `admin2@iiitr.ac.in`
  - `admin3@iiitr.ac.in`
  - `admin4@iiitr.ac.in`

## Create Admin Accounts

Use the helper script:

```bash
cd backend
venv\Scripts\python.exe seed_admins.py
```

Verify admin accounts:

```bash
venv\Scripts\python.exe verify_admins.py
```

Default seeded admin credentials:

1. `admin1@iiitr.ac.in` / `Campus@Admin1#2026`
2. `admin2@iiitr.ac.in` / `Campus@Admin2#2026`
3. `admin3@iiitr.ac.in` / `Campus@Admin3#2026`
4. `admin4@iiitr.ac.in` / `Campus@Admin4#2026`

Change these passwords after first login.

## Run the Project

Open 2 terminals.

### Terminal A (Backend)

```bash
cd backend
set ADMIN_ALLOWED_EMAILS=admin1@iiitr.ac.in,admin2@iiitr.ac.in,admin3@iiitr.ac.in,admin4@iiitr.ac.in
venv\Scripts\python.exe run.py
```

Backend runs on: `http://127.0.0.1:5001`

### Terminal B (Frontend)

```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 3000
```

Frontend runs on: `http://127.0.0.1:3000`

## How to Login

- Student/Faculty: register from UI, then login.
- Admin: use seeded admin account credentials and login directly.

## Useful Files

- Backend config: `backend/app/config.py`
- Auth routes: `backend/app/routes/auth_routes.py`
- Admin + timetable + rooms + messages routes: `backend/app/routes/preference_routes.py`
- Frontend API client: `frontend/src/services/api.js`
- Main admin dashboard page: `frontend/src/pages/admin/AdminDashboard.jsx`
- Register page: `frontend/src/pages/Register.jsx`

## Troubleshooting

- If login fails after changes:
  - restart backend
  - clear browser localStorage:
    - `localStorage.removeItem("token")`
    - `localStorage.removeItem("role")`
- If admin login says not authorized:
  - check `ADMIN_ALLOWED_EMAILS` value
  - ensure email is in allowlist
- If UI looks old after updates:
  - hard refresh browser (`Ctrl + F5`)

## Notes

- This project currently uses SQLite for easy local development.
- For production, use stronger secrets, secure password rotation, and a production DB.
