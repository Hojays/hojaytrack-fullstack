"""
HojayTrack backend — Flask + SQLite.

Security features:
  - Passwords hashed with werkzeug's PBKDF2 (never stored or returned in plaintext)
  - Session-based auth via a secure, HTTP-only cookie (Flask's signed session,
    backed by a server-side secret key) — no tokens floating around in JS
  - Input validation on every route (type/shape/length checks before touching the DB)
  - CORS locked to the frontend's exact origin, with credentials allowed
  - Parameterized SQL everywhere (no string-built queries)

Run with:
    python app.py
Requires:
    pip install flask flask-cors
"""

from __future__ import annotations

import os
import re
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from functools import wraps
from pathlib import Path

from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = Flask(__name__)

# The session cookie is signed with this key — without it, no one can forge
# a valid session. In production, set HOJAYTRACK_SECRET_KEY as a real env var
# instead of relying on the random fallback (which changes every restart and
# would log everyone out).
app.config["SECRET_KEY"] = os.environ.get("HOJAYTRACK_SECRET_KEY", secrets.token_hex(32))

# Cookie hardening
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,      # JS on the page can't read the cookie
    SESSION_COOKIE_SAMESITE="None",    # allows cross-origin cookie sending (required for ngrok/proxy setups)
    SESSION_COOKIE_SECURE=True,        # required when SameSite=None — only sent over HTTPS
)

# Origins allowed to call the API, with credentials (cookies) enabled.
# Supports multiple comma-separated origins so you can use the app from
# your PC (localhost) and your phone (ngrok/LAN IP) at the same time, e.g.:
#   FRONTEND_ORIGIN=http://localhost:3000,https://abc123.ngrok-free.app
FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000")
ALLOWED_ORIGINS = [origin.strip() for origin in FRONTEND_ORIGIN.split(",") if origin.strip()]
CORS(app, supports_credentials=True, origins=ALLOWED_ORIGINS, allow_headers=["Content-Type"], methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

DB_PATH = Path(__file__).resolve().parent / "hojaytrack.db"

def parse_timestamp(value: str) -> datetime:
    """
    Parses a stored ISO timestamp into a timezone-aware UTC datetime.
    Handles both the new format (with a +00:00/Z offset) and any older rows
    that were written before this fix, which were naive UTC strings with no
    offset at all — those get treated as UTC rather than crashing or, worse,
    being silently misinterpreted as local time.
    """
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
VALID_ROLES = {"employee", "manager", "admin"}
VALID_BREAK_TYPES = {"short", "lunch"}

# Unpaid allowance per break type. Minutes within this allowance cost the
# employee nothing; minutes beyond it are deducted from paid time.
BREAK_ALLOWANCE_MINUTES = {"short": 20, "lunch": 30}

# Safety ceiling so a forgotten, never-ended break doesn't silently erase an
# entire shift's pay if a manager looks at it days later. Anything beyond
# this is treated as the cap for deduction purposes (the raw start/end times
# are still stored as-is for transparency).
MAX_BREAK_DEDUCTION_MINUTES = 240


def compute_shift_hours(clock_in_dt: datetime, clock_out_dt: datetime, breaks: list[dict], daily_threshold: float) -> dict:
    """
    Given a shift's clock-in/out and its breaks, returns the billable hour
    breakdown. Break minutes beyond each break's unpaid allowance are
    deducted from paid time before regular/overtime is split.
    """
    raw_hours = (clock_out_dt - clock_in_dt).total_seconds() / 3600

    break_minutes_total = 0.0
    unpaid_deduction_minutes = 0.0
    for b in breaks:
        if b["end_time"] is None:
            continue  # still active; ignore for a completed-shift calculation
        start = parse_timestamp(b["start_time"])
        end = parse_timestamp(b["end_time"])
        duration_minutes = max(0.0, (end - start).total_seconds() / 60)
        break_minutes_total += duration_minutes

        allowance = BREAK_ALLOWANCE_MINUTES.get(b["break_type"], 0)
        excess = max(0.0, duration_minutes - allowance)
        excess = min(excess, MAX_BREAK_DEDUCTION_MINUTES)
        unpaid_deduction_minutes += excess

    paid_hours = max(0.0, raw_hours - (unpaid_deduction_minutes / 60))
    regular_hours = round(min(paid_hours, daily_threshold), 2)
    overtime_hours = round(max(0.0, paid_hours - daily_threshold), 2)

    return {
        "rawHours": round(raw_hours, 2),
        "breakMinutes": round(break_minutes_total, 1),
        "unpaidBreakMinutes": round(unpaid_deduction_minutes, 1),
        "regularHours": regular_hours,
        "overtimeHours": overtime_hours,
        "totalHours": round(regular_hours + overtime_hours, 2),
    }


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with get_db_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                email TEXT PRIMARY KEY,
                password_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                department TEXT NOT NULL DEFAULT '',
                employee_id TEXT NOT NULL DEFAULT ''
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS admin_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                daily_threshold INTEGER NOT NULL,
                weekly_threshold INTEGER NOT NULL,
                overtime_multiplier REAL NOT NULL,
                double_time_threshold INTEGER NOT NULL,
                double_time_multiplier REAL NOT NULL,
                enable_weekend_overtime INTEGER NOT NULL,
                enable_holiday_overtime INTEGER NOT NULL,
                auto_approve_regular_hours INTEGER NOT NULL,
                require_manager_approval INTEGER NOT NULL,
                max_weekly_hours INTEGER NOT NULL,
                break_deduction_minutes INTEGER NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS clock_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                clock_in_time TEXT NOT NULL,
                clock_out_time TEXT,
                status TEXT NOT NULL,
                approval_status TEXT NOT NULL DEFAULT 'pending',
                auto_capped INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (email) REFERENCES users(email)
            )
            """
        )
        # Migration safety net: if an older DB already has this table without
        # a given column, add it rather than crashing on startup.
        existing_cols = {row["name"] for row in conn.execute("PRAGMA table_info(clock_records)")}
        if "approval_status" not in existing_cols:
            conn.execute(
                "ALTER TABLE clock_records ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'pending'"
            )
        if "auto_capped" not in existing_cols:
            conn.execute(
                "ALTER TABLE clock_records ADD COLUMN auto_capped INTEGER NOT NULL DEFAULT 0"
            )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS breaks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                clock_record_id INTEGER NOT NULL,
                break_type TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT,
                status TEXT NOT NULL DEFAULT 'active',
                FOREIGN KEY (clock_record_id) REFERENCES clock_records(id)
            )
            """
        )
        conn.commit()
    seed_default_data()


def seed_default_data() -> None:
    with get_db_connection() as conn:
        user_count = conn.execute("SELECT COUNT(*) AS cnt FROM users").fetchone()["cnt"]
        if user_count == 0:
            seed_users = [
                ("admin@company.com", "adminpassword", "Hojay Admin", "admin", "IT", "EMP-0001"),
                ("jane@company.com", "managerpassword", "Jane Smith", "manager", "Operations", "EMP-0089"),
                ("jerry@company.com", "mysecurepassword", "Jerry", "employee", "Engineering", "EMP-1042"),
            ]
            conn.executemany(
                """
                INSERT INTO users (email, password_hash, name, role, department, employee_id)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                [
                    (email, generate_password_hash(pw), name, role, dept, emp_id)
                    for email, pw, name, role, dept, emp_id in seed_users
                ],
            )

        settings_count = conn.execute("SELECT COUNT(*) AS cnt FROM admin_settings").fetchone()["cnt"]
        if settings_count == 0:
            conn.execute(
                """
                INSERT INTO admin_settings (
                    id, daily_threshold, weekly_threshold, overtime_multiplier,
                    double_time_threshold, double_time_multiplier,
                    enable_weekend_overtime, enable_holiday_overtime,
                    auto_approve_regular_hours, require_manager_approval,
                    max_weekly_hours, break_deduction_minutes
                ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (8, 40, 1.5, 12, 2.0, 1, 1, 0, 1, 60, 30),
            )
        conn.commit()


def fetch_admin_settings() -> dict:
    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM admin_settings WHERE id = 1").fetchone()
        if not row:
            seed_default_data()
            row = conn.execute("SELECT * FROM admin_settings WHERE id = 1").fetchone()
    return {
        "dailyThreshold": row["daily_threshold"],
        "weeklyThreshold": row["weekly_threshold"],
        "overtimeMultiplier": row["overtime_multiplier"],
        "doubleTimeThreshold": row["double_time_threshold"],
        "doubleTimeMultiplier": row["double_time_multiplier"],
        "enableWeekendOvertime": bool(row["enable_weekend_overtime"]),
        "enableHolidayOvertime": bool(row["enable_holiday_overtime"]),
        "autoApproveRegularHours": bool(row["auto_approve_regular_hours"]),
        "requireManagerApproval": bool(row["require_manager_approval"]),
        "maxWeeklyHours": row["max_weekly_hours"],
        "breakDeductionMinutes": row["break_deduction_minutes"],
    }


def fetch_breaks_for_record(conn: sqlite3.Connection, clock_record_id: int) -> list[dict]:
    rows = conn.execute(
        "SELECT id, break_type, start_time, end_time, status FROM breaks WHERE clock_record_id = ? ORDER BY id",
        (clock_record_id,),
    ).fetchall()
    return [dict(r) for r in rows]


def get_active_clock_record(conn: sqlite3.Connection, email: str) -> sqlite3.Row | None:
    return conn.execute(
        "SELECT id, clock_in_time FROM clock_records WHERE email = ? AND status = 'active' ORDER BY id DESC LIMIT 1",
        (email,),
    ).fetchone()


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

def validation_error(message: str, field: str | None = None):
    body = {"success": False, "error": message}
    if field:
        body["field"] = field
    return jsonify(body), 400


def is_valid_email(value) -> bool:
    return isinstance(value, str) and 1 <= len(value) <= 254 and bool(EMAIL_RE.match(value))


def is_valid_password(value) -> bool:
    return isinstance(value, str) and 8 <= len(value) <= 128


def is_valid_name(value) -> bool:
    return isinstance(value, str) and 1 <= len(value.strip()) <= 100


def enforce_auto_clock_out_guardrail(conn: sqlite3.Connection) -> None:
    """
    Closes out any active shift that has run longer than the admin's
    configured "Max Daily Hours" guardrail. This runs opportunistically (on
    login, clock-status checks, and history fetches) rather than via a
    background scheduler, since plain Flask dev mode has no task runner.
    It's cheap and idempotent, so calling it often is fine.
    """
    settings = fetch_admin_settings()
    max_hours = settings["dailyThreshold"]  # "Max Daily Hours" guardrail ceiling
    now = datetime.now(timezone.utc)

    active_shifts = conn.execute(
        "SELECT id, email, clock_in_time FROM clock_records WHERE status = 'active'"
    ).fetchall()

    for shift in active_shifts:
        clock_in_dt = parse_timestamp(shift["clock_in_time"])
        elapsed_hours = (now - clock_in_dt).total_seconds() / 3600
        if elapsed_hours > max_hours:
            capped_clock_out = clock_in_dt + timedelta(hours=max_hours)
            conn.execute(
                """
                UPDATE clock_records
                SET status = 'completed', clock_out_time = ?, auto_capped = 1
                WHERE id = ?
                """,
                (capped_clock_out.isoformat(), shift["id"]),
            )
            # Also close out any break that got left open on this shift, at
            # the same capped timestamp, so totals don't include a dangling
            # active break.
            conn.execute(
                """
                UPDATE breaks SET end_time = ?, status = 'completed'
                WHERE clock_record_id = ? AND status = 'active'
                """,
                (capped_clock_out.isoformat(), shift["id"]),
            )
    if active_shifts:
        conn.commit()


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if "user_email" not in session:
            return jsonify({"success": False, "error": "Not authenticated"}), 401
        return f(*args, **kwargs)
    return wrapper


def role_required(*allowed_roles: str):
    def decorator(f):
        @wraps(f)
        @login_required
        def wrapper(*args, **kwargs):
            if session.get("user_role") not in allowed_roles:
                return jsonify({"success": False, "error": "Insufficient permissions"}), 403
            return f(*args, **kwargs)
        return wrapper
    return decorator


def current_user_row(conn: sqlite3.Connection) -> sqlite3.Row | None:
    return conn.execute(
        "SELECT email, name, role, department, employee_id FROM users WHERE email = ?",
        (session.get("user_email"),),
    ).fetchone()


def user_to_dict(row: sqlite3.Row) -> dict:
    return {
        "email": row["email"],
        "name": row["name"],
        "role": row["role"],
        "department": row["department"],
        "employeeId": row["employee_id"],
    }


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    password = data.get("password")

    if not is_valid_email(email):
        return validation_error("A valid email is required.", "email")
    if not isinstance(password, str) or not password:
        return validation_error("Password is required.", "password")

    email = email.strip().lower()

    with get_db_connection() as conn:
        row = conn.execute(
            "SELECT email, password_hash, name, role, department, employee_id FROM users WHERE email = ?",
            (email,),
        ).fetchone()

    # Same generic message whether the email doesn't exist or the password is
    # wrong — this avoids leaking which emails are registered.
    if not row or not check_password_hash(row["password_hash"], password):
        return jsonify({"success": False, "error": "Invalid email or password."}), 401

    session.clear()
    session["user_email"] = row["email"]
    session["user_role"] = row["role"]
    session.permanent = True

    return jsonify({"success": True, "user": user_to_dict(row)}), 200


@app.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    name = data.get("name")
    password = data.get("password")
    role = data.get("role", "employee")
    department = data.get("department", "")
    employee_id = data.get("employeeId", "")

    if not is_valid_email(email):
        return validation_error("A valid email is required.", "email")
    if not is_valid_name(name):
        return validation_error("Name must be between 1 and 100 characters.", "name")
    if not is_valid_password(password):
        return validation_error("Password must be 8–128 characters.", "password")
    if not isinstance(role, str) or role.lower() not in VALID_ROLES:
        return validation_error("Role must be employee, manager, or admin.", "role")
    if not isinstance(department, str) or len(department) > 100:
        return validation_error("Department must be 100 characters or fewer.", "department")
    if not isinstance(employee_id, str) or len(employee_id) > 50:
        return validation_error("Employee ID must be 50 characters or fewer.", "employeeId")

    email = email.strip().lower()
    role = role.lower()

    with get_db_connection() as conn:
        existing = conn.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            return jsonify({"success": False, "error": "An account with that email already exists."}), 409

        conn.execute(
            """
            INSERT INTO users (email, password_hash, name, role, department, employee_id)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (email, generate_password_hash(password), name.strip(), role, department.strip(), employee_id.strip()),
        )
        conn.commit()

    return jsonify({"success": True, "message": "Account created successfully."}), 201


@app.route("/logout", methods=["POST"])
@login_required
def logout():
    session.clear()
    return jsonify({"success": True}), 200


@app.route("/me", methods=["GET"])
@login_required
def me():
    with get_db_connection() as conn:
        row = current_user_row(conn)
    if not row:
        session.clear()
        return jsonify({"success": False, "error": "User no longer exists."}), 401
    return jsonify({"success": True, "user": user_to_dict(row)}), 200


# ---------------------------------------------------------------------------
# Clock in / out routes — all scoped to the logged-in user via the session,
# never to an email passed in by the client. This stops user A from clocking
# user B in or out by guessing their email.
# ---------------------------------------------------------------------------

@app.route("/clock-in", methods=["POST"])
@login_required
def clock_in():
    email = session["user_email"]
    now = datetime.now(timezone.utc).isoformat()

    with get_db_connection() as conn:
        enforce_auto_clock_out_guardrail(conn)

        active = get_active_clock_record(conn, email)
        if active:
            return jsonify({"success": False, "error": "You're already clocked in."}), 409

        conn.execute(
            "INSERT INTO clock_records (email, clock_in_time, status) VALUES (?, ?, 'active')",
            (email, now),
        )
        conn.commit()

    return jsonify({"success": True, "clockInTime": now}), 201


@app.route("/clock-out", methods=["POST"])
@login_required
def clock_out():
    email = session["user_email"]
    now = datetime.now(timezone.utc).isoformat()

    with get_db_connection() as conn:
        enforce_auto_clock_out_guardrail(conn)

        active = get_active_clock_record(conn, email)
        if not active:
            return jsonify({"success": False, "error": "No active clock-in found. Your shift may have already been auto-ended by the daily hours guardrail."}), 404

        # Close out any break the employee forgot to end before clocking out.
        conn.execute(
            "UPDATE breaks SET end_time = ?, status = 'completed' WHERE clock_record_id = ? AND status = 'active'",
            (now, active["id"]),
        )

        conn.execute(
            "UPDATE clock_records SET clock_out_time = ?, status = 'completed' WHERE id = ?",
            (now, active["id"]),
        )
        conn.commit()

    return jsonify({"success": True, "clockOutTime": now}), 200


@app.route("/clock-status", methods=["GET"])
@login_required
def clock_status():
    email = session["user_email"]
    with get_db_connection() as conn:
        enforce_auto_clock_out_guardrail(conn)

        active = get_active_clock_record(conn, email)
        if not active:
            return jsonify({"success": True, "active": False}), 200

        active_break_row = conn.execute(
            "SELECT id, break_type, start_time FROM breaks WHERE clock_record_id = ? AND status = 'active'",
            (active["id"],),
        ).fetchone()
        active_break = (
            {"id": active_break_row["id"], "type": active_break_row["break_type"], "startTime": active_break_row["start_time"]}
            if active_break_row else None
        )

    return jsonify({
        "success": True,
        "active": True,
        "clockInTime": active["clock_in_time"],
        "activeBreak": active_break,
    }), 200


@app.route("/start-break", methods=["POST"])
@login_required
def start_break():
    email = session["user_email"]
    data = request.get_json(silent=True) or {}
    break_type = data.get("type")

    if break_type not in VALID_BREAK_TYPES:
        return validation_error("type must be 'short' or 'lunch'.", "type")

    now = datetime.now(timezone.utc).isoformat()

    with get_db_connection() as conn:
        enforce_auto_clock_out_guardrail(conn)

        active = get_active_clock_record(conn, email)
        if not active:
            return jsonify({"success": False, "error": "You must be clocked in to start a break."}), 409

        existing_break = conn.execute(
            "SELECT id FROM breaks WHERE clock_record_id = ? AND status = 'active'",
            (active["id"],),
        ).fetchone()
        if existing_break:
            return jsonify({"success": False, "error": "A break is already in progress."}), 409

        conn.execute(
            "INSERT INTO breaks (clock_record_id, break_type, start_time, status) VALUES (?, ?, ?, 'active')",
            (active["id"], break_type, now),
        )
        conn.commit()

    return jsonify({"success": True, "type": break_type, "startTime": now}), 201


@app.route("/end-break", methods=["POST"])
@login_required
def end_break():
    email = session["user_email"]
    now = datetime.now(timezone.utc).isoformat()

    with get_db_connection() as conn:
        active = get_active_clock_record(conn, email)
        if not active:
            return jsonify({"success": False, "error": "You are not currently clocked in."}), 409

        active_break = conn.execute(
            "SELECT id, break_type, start_time FROM breaks WHERE clock_record_id = ? AND status = 'active'",
            (active["id"],),
        ).fetchone()
        if not active_break:
            return jsonify({"success": False, "error": "No break is currently in progress."}), 404

        conn.execute(
            "UPDATE breaks SET end_time = ?, status = 'completed' WHERE id = ?",
            (now, active_break["id"]),
        )
        conn.commit()

        start = parse_timestamp(active_break["start_time"])
        end = parse_timestamp(now)
        duration_minutes = round((end - start).total_seconds() / 60, 1)
        allowance = BREAK_ALLOWANCE_MINUTES.get(active_break["break_type"], 0)
        unpaid_minutes = min(max(0.0, duration_minutes - allowance), MAX_BREAK_DEDUCTION_MINUTES)

    return jsonify({
        "success": True,
        "type": active_break["break_type"],
        "startTime": active_break["start_time"],
        "endTime": now,
        "durationMinutes": duration_minutes,
        "unpaidMinutes": unpaid_minutes,
    }), 200


@app.route("/clock-history", methods=["GET"])
@login_required
def clock_history():
    """
    Returns completed shifts for the logged-in user, most recent first, with
    regular/overtime hours computed using the admin-configured daily
    threshold and break deductions applied. Active (still clocked-in)
    shifts are excluded — they show up via /clock-status instead, since
    they don't have a total yet.
    """
    email = session["user_email"]
    settings = fetch_admin_settings()
    daily_threshold = settings["dailyThreshold"]

    with get_db_connection() as conn:
        enforce_auto_clock_out_guardrail(conn)

        rows = conn.execute(
            """
            SELECT id, clock_in_time, clock_out_time, auto_capped
            FROM clock_records
            WHERE email = ? AND status = 'completed' AND clock_out_time IS NOT NULL
            ORDER BY id DESC
            """,
            (email,),
        ).fetchall()

        history = []
        for row in rows:
            clock_in_dt = parse_timestamp(row["clock_in_time"])
            clock_out_dt = parse_timestamp(row["clock_out_time"])
            breaks = fetch_breaks_for_record(conn, row["id"])
            hours = compute_shift_hours(clock_in_dt, clock_out_dt, breaks, daily_threshold)

            history.append({
                "id": row["id"],
                "date": clock_in_dt.strftime("%Y-%m-%d"),
                # Send raw UTC ISO timestamps instead of pre-formatted UTC
                # strings — the server doesn't know the viewer's timezone,
                # so formatting here was rendering everyone's history an
                # hour (or more) off from what they actually saw on the
                # live clock-in screen. The frontend converts these to the
                # browser's local time, exactly like the live clock does.
                "clockIn": clock_in_dt.isoformat(),
                "clockOut": clock_out_dt.isoformat(),
                "regularHours": hours["regularHours"],
                "overtimeHours": hours["overtimeHours"],
                "totalHours": hours["totalHours"],
                "breakMinutes": hours["breakMinutes"],
                "unpaidBreakMinutes": hours["unpaidBreakMinutes"],
                "autoCapped": bool(row["auto_capped"]),
            })

    return jsonify({"success": True, "history": history}), 200


@app.route("/weekly-summary", methods=["GET"])
@login_required
def weekly_summary():
    """
    Live numbers for the "Weekly Target / Logged This Week / Remaining"
    stats shown on the clock-in screen. "This week" is Monday 00:00 through
    now, in UTC. Only completed shifts count toward "logged" — an
    in-progress shift isn't finished, so it isn't counted here (it shows up
    live via /clock-status instead).
    """
    email = session["user_email"]
    settings = fetch_admin_settings()
    daily_threshold = settings["dailyThreshold"]
    weekly_target = settings["weeklyThreshold"]  # defaults to 40 in admin_settings

    now = datetime.now(timezone.utc)
    week_start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)

    with get_db_connection() as conn:
        enforce_auto_clock_out_guardrail(conn)

        rows = conn.execute(
            """
            SELECT id, clock_in_time, clock_out_time
            FROM clock_records
            WHERE email = ? AND status = 'completed' AND clock_out_time IS NOT NULL
            """,
            (email,),
        ).fetchall()

        logged_hours = 0.0
        for row in rows:
            clock_in_dt = parse_timestamp(row["clock_in_time"])
            if clock_in_dt < week_start:
                continue
            clock_out_dt = parse_timestamp(row["clock_out_time"])
            breaks = fetch_breaks_for_record(conn, row["id"])
            hours = compute_shift_hours(clock_in_dt, clock_out_dt, breaks, daily_threshold)
            logged_hours += hours["totalHours"]

    logged_hours = round(logged_hours, 2)
    remaining_hours = round(max(0.0, weekly_target - logged_hours), 1)

    return jsonify({
        "success": True,
        "weeklyTarget": weekly_target,
        "loggedThisWeek": logged_hours,
        "remaining": remaining_hours,
    }), 200


# ---------------------------------------------------------------------------
# Manager / admin: cross-employee timesheet review.
# Every completed shift, from every employee, surfaces here so a manager can
# approve or reject it. This is the aggregation the employee's own
# /clock-history route deliberately doesn't do (that one is scoped to "me").
# ---------------------------------------------------------------------------

@app.route("/admin/timecards", methods=["GET"])
@role_required("manager", "admin")
def admin_timecards():
    """
    Every clock record across every employee — both completed shifts and
    shifts still in progress right now — with computed hours and break
    deductions, plus whether the auto-clock-out guardrail capped it.
    """
    settings = fetch_admin_settings()
    daily_threshold = settings["dailyThreshold"]

    with get_db_connection() as conn:
        enforce_auto_clock_out_guardrail(conn)

        rows = conn.execute(
            """
            SELECT
                cr.id, cr.email, cr.clock_in_time, cr.clock_out_time, cr.status,
                cr.approval_status, cr.auto_capped,
                u.name, u.department, u.employee_id
            FROM clock_records cr
            JOIN users u ON u.email = cr.email
            ORDER BY cr.id DESC
            """
        ).fetchall()

        timecards = []
        now = datetime.now(timezone.utc)
        for row in rows:
            clock_in_dt = parse_timestamp(row["clock_in_time"])
            breaks = fetch_breaks_for_record(conn, row["id"])
            is_active = row["status"] == "active"

            if is_active:
                # Shift still running — show a live, provisional total using
                # "now" as a stand-in clock-out, but don't count it as final.
                clock_out_dt = now
                clock_out_display = None
            else:
                clock_out_dt = parse_timestamp(row["clock_out_time"])
                clock_out_display = clock_out_dt.isoformat()

            hours = compute_shift_hours(clock_in_dt, clock_out_dt, breaks, daily_threshold)
            active_break = next((b for b in breaks if b["status"] == "active"), None)

            timecards.append({
                "id": row["id"],
                "employeeId": row["employee_id"] or row["email"],
                "employeeName": row["name"],
                "department": row["department"] or "—",
                "date": clock_in_dt.strftime("%Y-%m-%d"),
                "clockIn": clock_in_dt.isoformat(),
                "clockOut": clock_out_display,
                "isActive": is_active,
                "onBreak": active_break is not None,
                "regularHours": hours["regularHours"],
                "overtimeHours": hours["overtimeHours"],
                "totalHours": hours["totalHours"],
                "breakMinutes": hours["breakMinutes"],
                "unpaidBreakMinutes": hours["unpaidBreakMinutes"],
                "autoCapped": bool(row["auto_capped"]),
                "approvalStatus": row["approval_status"],
            })

    return jsonify({"success": True, "timecards": timecards}), 200


@app.route("/timesheet-submissions", methods=["GET"])
@role_required("manager", "admin")
def timesheet_submissions():
    settings = fetch_admin_settings()
    daily_threshold = settings["dailyThreshold"]

    with get_db_connection() as conn:
        rows = conn.execute(
            """
            SELECT
                cr.id, cr.email, cr.clock_in_time, cr.clock_out_time, cr.approval_status,
                u.name, u.department, u.employee_id
            FROM clock_records cr
            JOIN users u ON u.email = cr.email
            WHERE cr.status = 'completed' AND cr.clock_out_time IS NOT NULL
            ORDER BY cr.id DESC
            """
        ).fetchall()

    submissions = []
    for row in rows:
        clock_in_dt = parse_timestamp(row["clock_in_time"])
        clock_out_dt = parse_timestamp(row["clock_out_time"])
        total_hours = round((clock_out_dt - clock_in_dt).total_seconds() / 3600, 2)
        regular_hours = round(min(total_hours, daily_threshold), 2)
        overtime_hours = round(max(0.0, total_hours - daily_threshold), 2)

        submissions.append({
            "id": str(row["id"]),
            "employeeId": row["employee_id"] or row["email"],
            "employeeName": row["name"],
            "department": row["department"] or "—",
            "period": clock_in_dt.strftime("%Y-%m-%d"),
            "regularHours": regular_hours,
            "overtimeHours": overtime_hours,
            "totalHours": total_hours,
            "status": row["approval_status"],
            "submittedAt": row["clock_out_time"],
        })

    return jsonify({"success": True, "submissions": submissions}), 200


@app.route("/timesheet-submissions/<int:record_id>/approve", methods=["POST"])
@role_required("manager", "admin")
def approve_submission(record_id: int):
    return _set_approval_status(record_id, "approved")


@app.route("/timesheet-submissions/<int:record_id>/reject", methods=["POST"])
@role_required("manager", "admin")
def reject_submission(record_id: int):
    return _set_approval_status(record_id, "rejected")


def _set_approval_status(record_id: int, new_status: str):
    with get_db_connection() as conn:
        existing = conn.execute(
            "SELECT id FROM clock_records WHERE id = ? AND status = 'completed'",
            (record_id,),
        ).fetchone()
        if not existing:
            return jsonify({"success": False, "error": "Submission not found."}), 404

        conn.execute(
            "UPDATE clock_records SET approval_status = ? WHERE id = ?",
            (new_status, record_id),
        )
        conn.commit()

    return jsonify({"success": True, "status": new_status}), 200


# ---------------------------------------------------------------------------
# Admin settings — manager/admin only
# ---------------------------------------------------------------------------

@app.route("/admin-settings", methods=["GET"])
@role_required("admin", "manager")
def get_admin_settings_route():
    return jsonify({"success": True, "settings": fetch_admin_settings()}), 200


@app.route("/admin-settings", methods=["POST"])
@role_required("admin")
def update_admin_settings_route():
    data = request.get_json(silent=True) or {}
    current = fetch_admin_settings()

    def as_int(key: str, lo: int, hi: int):
        value = data.get(key, current[key])
        if not isinstance(value, (int, float)) or isinstance(value, bool) or not (lo <= value <= hi):
            raise ValueError(f"{key} must be a number between {lo} and {hi}.")
        return int(value)

    def as_float(key: str, lo: float, hi: float):
        value = data.get(key, current[key])
        if not isinstance(value, (int, float)) or isinstance(value, bool) or not (lo <= value <= hi):
            raise ValueError(f"{key} must be a number between {lo} and {hi}.")
        return float(value)

    def as_bool(key: str):
        value = data.get(key, current[key])
        if not isinstance(value, bool):
            raise ValueError(f"{key} must be true or false.")
        return value

    try:
        update_values = {
            "daily_threshold": as_int("dailyThreshold", 1, 24),
            "weekly_threshold": as_int("weeklyThreshold", 1, 168),
            "overtime_multiplier": as_float("overtimeMultiplier", 1.0, 5.0),
            "double_time_threshold": as_int("doubleTimeThreshold", 1, 24),
            "double_time_multiplier": as_float("doubleTimeMultiplier", 1.0, 5.0),
            "enable_weekend_overtime": 1 if as_bool("enableWeekendOvertime") else 0,
            "enable_holiday_overtime": 1 if as_bool("enableHolidayOvertime") else 0,
            "auto_approve_regular_hours": 1 if as_bool("autoApproveRegularHours") else 0,
            "require_manager_approval": 1 if as_bool("requireManagerApproval") else 0,
            "max_weekly_hours": as_int("maxWeeklyHours", 1, 168),
            "break_deduction_minutes": as_int("breakDeductionMinutes", 0, 240),
        }
    except ValueError as exc:
        return validation_error(str(exc))

    with get_db_connection() as conn:
        conn.execute(
            """
            UPDATE admin_settings SET
                daily_threshold = :daily_threshold,
                weekly_threshold = :weekly_threshold,
                overtime_multiplier = :overtime_multiplier,
                double_time_threshold = :double_time_threshold,
                double_time_multiplier = :double_time_multiplier,
                enable_weekend_overtime = :enable_weekend_overtime,
                enable_holiday_overtime = :enable_holiday_overtime,
                auto_approve_regular_hours = :auto_approve_regular_hours,
                require_manager_approval = :require_manager_approval,
                max_weekly_hours = :max_weekly_hours,
                break_deduction_minutes = :break_deduction_minutes
            WHERE id = 1
            """,
            update_values,
        )
        conn.commit()

    return jsonify({"success": True, "settings": fetch_admin_settings()}), 200


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    init_db()
    # host="0.0.0.0" makes this reachable from other devices on your local
    # network (e.g. your phone) at http://<your-pc-LAN-ip>:5050, not just
    # from this machine. Set FRONTEND_ORIGIN below to match.
    app.run(host="0.0.0.0", port=5050, debug=True)
