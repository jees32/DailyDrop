"""Put backend/ on sys.path so `python scripts/foo.py` can import app modules."""

from pathlib import Path
import sys

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
_root = str(_BACKEND_ROOT)
if _root not in sys.path:
    sys.path.insert(0, _root)
