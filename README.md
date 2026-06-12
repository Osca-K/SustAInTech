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

Insights do not read hidden ground-truth labels and do not confirm leaks. They provide a deterministic baseline for future AI explanation agents.

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
