import os

from flask import Flask, jsonify, request
from flask_cors import CORS
from postgrest import APIError
from supabase import Client, create_client
from dotenv import load_dotenv

load_dotenv()

required_environment = ("SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY")
missing_environment = [name for name in required_environment if not os.environ.get(name)]
if missing_environment:
    raise RuntimeError(
        "Missing required environment variable(s): " + ", ".join(missing_environment)
    )

app = Flask(__name__)
# Public API: allow browser clients from any origin, with no credentials.
CORS(
    app,
    resources={r"/api/*": {"origins": "*"}},
    methods=["GET", "POST", "OPTIONS"],
    allow_headers="*",
)

supabase: Client = create_client(
    os.environ["SUPABASE_URL"], os.environ["SUPABASE_PUBLISHABLE_KEY"]
)


def database_error(error):
    return jsonify({"error": str(getattr(error, "message", error))}), 500


@app.get("/")
def index():
    return jsonify({"service": "events-api"})


@app.get("/api/events")
def list_events():
    try:
        response = supabase.table("events").select("*").execute()
    except APIError as error:
        return database_error(error)
    return jsonify(response.data)


@app.get("/api/events/<event_id>")
def get_event(event_id):
    try:
        response = supabase.table("events").select("*").eq("id", event_id).maybe_single().execute()
    except APIError as error:
        return database_error(error)
    if not response.data:
        return jsonify({"error": "Event not found"}), 404
    return jsonify(response.data)


@app.post("/api/registrations")
def create_registration():
    body = request.get_json(silent=True) or {}
    user_id, event_id = body.get("user_id"), body.get("event_id")
    if not user_id or not event_id:
        return jsonify({"error": "user_id and event_id are required"}), 400
    try:
        result = supabase.table("registrations").insert(
            {"user_id": user_id, "event_id": event_id}
        ).execute()
    except APIError as error:
        # Duplicate pair (when constrained by the database) is a conflict.
        code = getattr(error, "code", None)
        return jsonify({"error": str(getattr(error, "message", error))}), 409 if code == "23505" else 400
    return jsonify(result.data[0] if result.data else {}), 201


@app.get("/api/me/registrations")
def my_registrations():
    # With authentication intentionally disabled, callers identify themselves by user_id.
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id query parameter is required"}), 400
    try:
        response = supabase.table("registrations").select("*, events(*)").eq("user_id", user_id).execute()
    except APIError as error:
        return database_error(error)
    return jsonify(response.data)


@app.get("/api/events/<event_id>/registrations")
def event_registrations(event_id):
    try:
        event = supabase.table("events").select("id").eq("id", event_id).maybe_single().execute()
        if not event.data:
            return jsonify({"error": "Event not found"}), 404
        response = supabase.table("registrations").select("*, users(id, email)").eq("event_id", event_id).execute()
    except APIError as error:
        return database_error(error)
    return jsonify(response.data)


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "5000")),
        debug=os.environ.get("FLASK_DEBUG", "false").lower() == "true",
    )
