from dotenv import load_dotenv
from .base import *  # noqa: F401, F403

load_dotenv(BASE_DIR / ".env")  # noqa: F405

DEBUG = True

ALLOWED_HOSTS = ["*"]

CORS_ALLOW_ALL_ORIGINS = True

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}
