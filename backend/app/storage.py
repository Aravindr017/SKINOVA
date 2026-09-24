# ==========================================
# SKINOVA - Persistent Data Storage & Multi-Device Sync Engine
# Automatically synchronizes user activity, scans, consultations,
# appointments, and health logs across multiple devices.
# ==========================================

import os
import json
import threading
from typing import Dict, Any, List, Optional

_LOCK = threading.Lock()
_DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
_DATA_FILE = os.path.join(_DATA_DIR, "skinova_store.json")

def _init_store() -> None:
    os.makedirs(_DATA_DIR, exist_ok=True)
    if not os.path.exists(_DATA_FILE):
        initial = {
            "users": {},
            "activities": {},
            "profiles": {},
            "health_logs": {},
            "appointments": []
        }
        with open(_DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(initial, f, indent=2)

def load_store() -> Dict[str, Any]:
    _init_store()
    with _LOCK:
        try:
            with open(_DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"users": {}, "activities": {}, "profiles": {}, "health_logs": {}, "appointments": []}

def save_store(data: Dict[str, Any]) -> None:
    _init_store()
    temp_file = f"{_DATA_FILE}.tmp"
    with _LOCK:
        try:
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            os.replace(temp_file, _DATA_FILE)
        except Exception as e:
            print(f"[Storage] Error writing store: {e}")

# ==========================================
# User Account Persistence
# ==========================================

def get_all_users() -> Dict[str, Any]:
    store = load_store()
    return store.get("users", {})

def save_user_record(email: str, record: Dict[str, Any]) -> None:
    store = load_store()
    email_clean = email.strip().lower()
    store.setdefault("users", {})[email_clean] = record
    save_store(store)

def find_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    store = load_store()
    return store.get("users", {}).get(email.strip().lower())

# ==========================================
# Multi-Device User Activity Sync Engine
# ==========================================

def sync_user_activity(
    user_id: str,
    email: Optional[str] = None,
    scans: Optional[List[Dict[str, Any]]] = None,
    searches: Optional[List[Dict[str, Any]]] = None,
    appointments: Optional[List[Dict[str, Any]]] = None,
    health_logs: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Bi-directional merge of user scans, chat history, and appointments.
    Guarantees cross-device consistency across Google accounts on iPhone, Mac, Android & PC.
    """
    store = load_store()
    activities = store.setdefault("activities", {})

    email_clean = email.strip().lower() if email else ""
    user_key = user_id or email_clean or "anonymous"

    # Check if this user exists under email or user_id
    existing_entry = None
    match_key = None
    if user_key in activities:
        existing_entry = activities[user_key]
        match_key = user_key
    elif email_clean:
        for k, v in activities.items():
            if v.get("email") and v.get("email").strip().lower() == email_clean:
                existing_entry = v
                match_key = k
                break

    if not existing_entry:
        existing_entry = {
            "user_id": user_id,
            "email": email_clean,
            "scans": [],
            "searches": [],
            "appointments": [],
            "health_logs": []
        }
        match_key = user_key

    # 1. Merge Scans (deduplicate by scan ID or date+prediction)
    scan_dict = {}
    for s in existing_entry.get("scans", []):
        sid = str(s.get("id") or f"{s.get('date')}_{s.get('prediction')}")
        scan_dict[sid] = s
    for s in (scans or []):
        sid = str(s.get("id") or f"{s.get('date')}_{s.get('prediction')}")
        scan_dict[sid] = s
    merged_scans = sorted(
        scan_dict.values(),
        key=lambda x: str(x.get("date") or ""),
        reverse=True
    )[:100]

    # 2. Merge Searches & Chat Consultations (deduplicate by search ID or query+date)
    search_dict = {}
    for s in existing_entry.get("searches", []):
        sid = str(s.get("id") or f"{s.get('query')}_{s.get('type')}_{s.get('date')}")
        search_dict[sid] = s
    for s in (searches or []):
        sid = str(s.get("id") or f"{s.get('query')}_{s.get('type')}_{s.get('date')}")
        # If incoming has answer, update it
        if sid in search_dict and not search_dict[sid].get("answer") and s.get("answer"):
            search_dict[sid] = s
        elif sid not in search_dict:
            search_dict[sid] = s
    merged_searches = sorted(
        search_dict.values(),
        key=lambda x: str(x.get("date") or ""),
        reverse=True
    )[:100]

    # 3. Merge Booked Appointments (deduplicate by appointment ID or hospital+date)
    appt_dict = {}
    for a in existing_entry.get("appointments", []):
        aid = str(a.get("id") or f"{a.get('hospital_name')}_{a.get('preferred_date')}")
        appt_dict[aid] = a
    for a in (appointments or []):
        aid = str(a.get("id") or f"{a.get('hospital_name')}_{a.get('preferred_date')}")
        appt_dict[aid] = a
    merged_appts = sorted(
        appt_dict.values(),
        key=lambda x: str(x.get("created_at") or x.get("preferred_date") or ""),
        reverse=True
    )

    # 4. Merge Health Logs (deduplicate by date)
    health_dict = {}
    for l in existing_entry.get("health_logs", []):
        if l.get("date"):
            health_dict[l["date"]] = l
    for l in (health_logs or []):
        if l.get("date"):
            health_dict[l["date"]] = l
    merged_logs = sorted(
        health_dict.values(),
        key=lambda x: str(x.get("date") or ""),
        reverse=True
    )[:60]

    # Update active record
    existing_entry["user_id"] = user_id
    if email_clean:
        existing_entry["email"] = email_clean
    existing_entry["scans"] = merged_scans
    existing_entry["searches"] = merged_searches
    existing_entry["appointments"] = merged_appts
    existing_entry["health_logs"] = merged_logs

    activities[match_key] = existing_entry
    # Also index under email_clean if not matching
    if email_clean and match_key != email_clean:
        activities[email_clean] = existing_entry

    save_store(store)
    return existing_entry

def get_user_activity(user_id: str, email: Optional[str] = None) -> Dict[str, Any]:
    store = load_store()
    activities = store.get("activities", {})

    if user_id and user_id in activities:
        return activities[user_id]
    if email:
        email_clean = email.strip().lower()
        if email_clean in activities:
            return activities[email_clean]
        for v in activities.values():
            if v.get("email") and v.get("email").strip().lower() == email_clean:
                return v

    return {
        "user_id": user_id,
        "email": email or "",
        "scans": [],
        "searches": [],
        "appointments": [],
        "health_logs": []
    }
