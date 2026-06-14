# SustAInTech Backend

This backend reads the local operational SQLite database and exposes municipal-dashboard API endpoints.

It currently has no authentication. Supabase migration and AI insights will come later. Hidden evaluation labels are never exposed.

The uploads API accepts municipal statement PDFs, saves each upload into a unique ingestion batch folder, runs the existing extraction and validation pipeline, deduplicates processed statements, and imports only import-ready records into the operational database.

The insights API infers unusual water-usage patterns dynamically from operational monthly readings in SQLite. It does not read hidden ground-truth labels, does not persist anomaly tables, and does not confirm leaks. Future AI agents can add explanation layers on top of these deterministic rules without replacing the baseline validation logic.

The meter-submissions API accepts resident-confirmed water-meter photos and manual readings. It stores images on the filesystem, records only image paths in SQLite, checks duplicate image hashes, evaluates image freshness metadata, and validates readings against trusted historical readings.

The meter photo extraction API adds an AI-ready resident confirmation flow. The default development mock adapter is selected by `SUSTAINTECH_METER_EXTRACTION_PROVIDER=mock`, returns deterministic placeholder values, and records that no real image analysis was performed.

An optional OpenAI vision adapter is available with `SUSTAINTECH_METER_EXTRACTION_PROVIDER=openai_vision`. It uses the OpenAI Responses API with structured output to suggest visible meter details from the uploaded image. It never sends the API key to the frontend, does not validate plausibility, does not classify leaks, and does not create trusted readings without resident confirmation.

The waste API provides a deterministic household waste-sorting baseline. It uses a local manual rule engine only, stores household waste queries in SQLite, and returns disposal guidance with preparation steps. It does not use external AI or image recognition yet. Household history is scoped to the selected household; municipal waste endpoints return aggregate trends and recent query summaries.

The impact API combines water and waste summary data for municipal/community reporting. It uses existing operational tables only. Water metrics are based on municipal readings and resident meter submissions. Waste metrics are based on household sorting guidance queries; the diversion percentage is awareness potential, not confirmed physical diversion. No new AI is added by this endpoint.

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
POST http://127.0.0.1:8000/api/households/{household_id}/meter-photo-extractions
POST http://127.0.0.1:8000/api/households/{household_id}/meter-photo-extractions/{extraction_id}/confirm
POST http://127.0.0.1:8000/api/households/{household_id}/meter-submissions
GET http://127.0.0.1:8000/api/households/{household_id}/meter-submissions
GET http://127.0.0.1:8000/api/households/{household_id}/meter-tracking-summary
GET http://127.0.0.1:8000/api/meter-submissions
```

Waste sorting:

```text
POST http://127.0.0.1:8000/api/households/{household_id}/waste-sort
GET http://127.0.0.1:8000/api/households/{household_id}/waste-queries
GET http://127.0.0.1:8000/api/waste/summary
```

Impact summary:

```text
GET http://127.0.0.1:8000/api/impact/summary
```

Environment:

```env
OPENAI_API_KEY=
SUSTAINTECH_METER_EXTRACTION_PROVIDER=mock
SUSTAINTECH_OPENAI_VISION_MODEL=gpt-5.5
```

Use `SUSTAINTECH_METER_EXTRACTION_PROVIDER=openai_vision` only when `OPENAI_API_KEY` is configured locally or in deployment. Missing keys raise a configuration error rather than silently falling back to the mock adapter.

Resident confirmation remains mandatory. Confirmed extraction values are passed through the same deterministic freshness, duplicate-image, and plausibility checks as manual submissions.

Optional live smoke test:

```powershell
python backend\scripts\test_openai_meter_extraction.py --image "path\to\meter-photo.jpg"
```

The smoke test requires `OPENAI_API_KEY`, does not write to the database, and prints only the structured extraction fields. Automated tests mock the OpenAI SDK and do not make live API requests.

## Tests

```powershell
pytest
```
