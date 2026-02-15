import os


BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


class Config:
    SQLALCHEMY_DATABASE_URI = 'sqlite:///smartcampus.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = 'super-secret-key'
    UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
