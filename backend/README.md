# SustAInTech Backend

This backend reads the local operational SQLite database and exposes municipal-dashboard API endpoints.

It currently has no authentication. Supabase migration and AI insights will come later. Hidden evaluation labels are never exposed.

## Setup

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Run

```powershell
uvicorn app.main:app --reload
```

Open:

```text
http://127.0.0.1:8000/docs
```

## Tests

```powershell
pytest
```
