import sys
from pathlib import Path

# Allow imports of sibling modules (server.py, db.py, auth.py, etc.)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from server import app  # noqa: E402

# Vercel's Python runtime auto-detects the ASGI `app` object below.
