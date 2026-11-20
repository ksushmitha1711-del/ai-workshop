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

## React frontend

The CampusPulse React app is in `frontend/` and uses the supplied design in `../design/stitch_campus_event_hub/` as its visual reference. It loads events from `GET /api/events`, loads the entered user's registrations from `GET /api/me/registrations`, and creates registrations with `POST /api/registrations`. It has no sign-in or authorization flow. To run it locally:

```sh
cd frontend
npm install
```

Set `VITE_API_BASE_URL` in `frontend/local.env` and `frontend/.env.local` to the deployed backend origin (for example, `https://your-service.onrender.com`). The `.env.local` file is read by Vite and ignored by Git; `local.env` is included as the requested editable configuration template. Restart Vite after changing the URL, then run:

```sh
npm run dev
```

The event and course policy is included in the frontend. Registration requires an existing database `user_id`; this is a plain identifier, not an account or verified identity. Event creation and admin metrics are not exposed by the current backend API, so the frontend does not pretend those actions are persisted.

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
