# SustAInTech Backend

This backend reads the local operational SQLite database and exposes municipal-dashboard API endpoints.

It currently has no authentication. Supabase migration and AI insights will come later. Hidden evaluation labels are never exposed.

The uploads API accepts municipal statement PDFs, saves each upload into a unique ingestion batch folder, runs the existing extraction and validation pipeline, deduplicates processed statements, and imports only import-ready records into the operational database.

The insights API infers unusual water-usage patterns dynamically from operational monthly readings in SQLite. It does not read hidden ground-truth labels, does not persist anomaly tables, and does not confirm leaks. Future AI agents can add explanation layers on top of these deterministic rules without replacing the baseline validation logic.

## Setup

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Run

```powershell
cd backend
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

Open:

```text
http://127.0.0.1:8000/docs
```

Upload endpoint:

```text
POST http://127.0.0.1:8000/api/uploads/statements
```

Recent upload batches:

```text
GET http://127.0.0.1:8000/api/uploads/batches
```

Insights:

```text
GET http://127.0.0.1:8000/api/insights/summary
GET http://127.0.0.1:8000/api/insights
GET http://127.0.0.1:8000/api/households/{household_id}/insights
```

## Tests

```powershell
pytest
```
