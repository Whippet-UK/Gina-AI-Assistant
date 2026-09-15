"""
Gina Motion Physics Engine — Root Import Forwarder
Proxies execution to scripts/gina_motion_physics_engine.py
"""
import sys
import os

scripts_dir = os.path.join(os.path.dirname(__file__), "scripts")
if scripts_dir not in sys.path:
    sys.path.insert(0, scripts_dir)

from scripts.gina_motion_physics_engine import *
from scripts.gina_motion_physics_engine import GINA_MOTION_PHYSICS_ENGINE_METADATA
