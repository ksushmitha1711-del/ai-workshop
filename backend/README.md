# Events API

Flask API for the Supabase `events`, `registrations`, and `users` tables.

## Deploy on Render

1. Push this folder to a Git repository and connect that repository to Render.
2. Create a Blueprint deployment from `render.yaml` (or create a Python web service with the same build and start commands).
3. In the Render service's Environment settings, set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from your Supabase project.
4. Deploy. Render uses `GET /` as the health check.

The app reads the listening port from Render's `PORT` environment variable. `gunicorn` serves the Flask app in production; Flask debug mode is off.

## Run locally

Requires Python 3.10 or newer.

```sh
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Fill in `.env` with your Supabase project URL and publishable key, then start the API:

```sh
flask --app app run --debug
```

The API is available at `http://127.0.0.1:5000`. The `.env` file is ignored by Git.

## Routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/events` | List events |
| GET | `/api/events/<id>` | Get event details |
| POST | `/api/registrations` | Create a registration |
| GET | `/api/me/registrations?user_id=<uuid>` | List registrations for a user ID |
| GET | `/api/events/<id>/registrations` | List registrations and attendee details for an event |

Create a registration with JSON such as `{"user_id":"...","event_id":"..."}`.

API routes allow cross-origin requests from any origin and do not require authentication. The `/api/me/registrations` route uses the supplied `user_id` as a filter; it does not verify the caller's identity. Supabase must expose the three tables through its Data API and grant the required operations to the role used by the publishable key. Configure database policies to match this public access model before deploying.
