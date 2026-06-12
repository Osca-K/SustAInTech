# SustAInTech Backend

This backend reads the local operational SQLite database and exposes municipal-dashboard API endpoints.

It currently has no authentication. Supabase migration and AI insights will come later. Hidden evaluation labels are never exposed.

The uploads API accepts municipal statement PDFs, saves each upload into a unique ingestion batch folder, runs the existing extraction and validation pipeline, deduplicates processed statements, and imports only import-ready records into the operational database.

The insights API infers unusual water-usage patterns dynamically from operational monthly readings in SQLite. It does not read hidden ground-truth labels, does not persist anomaly tables, and does not confirm leaks. Future AI agents can add explanation layers on top of these deterministic rules without replacing the baseline validation logic.

The meter-submissions API accepts resident-confirmed water-meter photos and manual readings. It stores images on the filesystem, records only image paths in SQLite, checks duplicate image hashes, evaluates image freshness metadata, validates readings against trusted historical readings, and reserves AI extraction fields for a later phase. OCR and external AI APIs are not used yet.

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

Meter submissions:

```text
POST http://127.0.0.1:8000/api/households/{household_id}/meter-submissions
GET http://127.0.0.1:8000/api/households/{household_id}/meter-submissions
GET http://127.0.0.1:8000/api/households/{household_id}/meter-tracking-summary
GET http://127.0.0.1:8000/api/meter-submissions
```

## Tests

```powershell
pytest
```
