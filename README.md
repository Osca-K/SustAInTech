# SustAInTech

This repository separates synthetic document generation from application-layer statement ingestion.

`Generate Data/` creates synthetic household records and renders clearly marked municipal statement PDFs through the approved LaTeX template.

`ingestion/` processes uploaded municipal statement PDFs into structured application data. It currently contains a single-PDF deterministic parser and validator for the controlled synthetic statement layout.

## Architecture

`Generate Data/` creates synthetic municipal statements for testing.

`ingestion/` extracts and validates municipality-uploaded PDF statements.

`database/` stores only validated operational records from ingestion outputs.

`backend/` exposes municipal-dashboard API endpoints over validated operational records.

`frontend/` displays the municipal dashboard and statement-upload workflow using the backend API.

Current municipal frontend workflows include:

- dashboard overview for household, meter, reading, statement, and upload counts;
- statement uploads with extraction, validation, deduplication, and database import;
- household search, list view, profile details, meter details, monthly usage chart, and billing-history table.
- municipal insights inferred dynamically from operational water readings to identify accounts requiring review.
- household portal demo with resident profile selection, monthly water usage, latest bill summary, and resident-friendly usage insights.
- household water meter-photo tracking with resident-confirmed readings, deterministic freshness checks, duplicate-image checks, optional OpenAI vision suggestions, mock photo-analysis fallback, and municipal submission review.
- household waste-sorting assistant with deterministic guidance, household-private query history, and simple municipal aggregate trends.

Insights do not read hidden ground-truth labels and do not confirm leaks. They provide a deterministic baseline for future AI explanation agents.

The household portal uses demo access for now. Real authentication will come later.

Meter-photo tracking stores uploaded images on the filesystem and stores only image paths and metadata in SQLite. The resident upload page supports a two-step photo-analysis and confirmation flow. The default adapter is a development mock selected with `SUSTAINTECH_METER_EXTRACTION_PROVIDER=mock`; it does not perform OCR, does not call an external AI API, and does not claim to understand the image.

Real OpenAI vision extraction is optional. Configure `SUSTAINTECH_METER_EXTRACTION_PROVIDER=openai_vision`, `OPENAI_API_KEY`, and `SUSTAINTECH_OPENAI_VISION_MODEL=gpt-5.5` to request structured meter suggestions through the backend only. Resident confirmation is still required, and deterministic freshness and plausibility checks still run before any trusted operational reading is created.

Waste sorting starts with a deterministic manual-rule baseline. Residents enter an item name, optional description, or selected category and receive guidance for recyclable, general waste, organic, hazardous, e-waste, reuse/donation, or unknown items. No external AI or image recognition is used for waste yet. Household waste query history is private to that household, while municipal tools show aggregate trends only.

## Run Locally

Start the backend:

```powershell
cd backend
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

Start the frontend:

```powershell
cd frontend
npm run dev
```

Open the upload page:

```text
http://localhost:3000/municipal/uploads
```

Uploaded PDFs flow through extraction, validation, deduplication, and database import before appearing in municipal dashboard data.
