from pathlib import Path

from dotenv import load_dotenv

# Load .env BEFORE importing base so its module-level os.environ reads see the values.
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

from .base import *  # noqa: E402, F401, F403

DEBUG = True

ALLOWED_HOSTS = ["*"]

CORS_ALLOW_ALL_ORIGINS = True
