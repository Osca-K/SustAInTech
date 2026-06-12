# SustAInTech Frontend

This Next.js dashboard reads the local FastAPI API and displays municipal resource workflows.

Authentication, AI insights, and maps will come later.

## Install Dependencies

```powershell
cd frontend
npm install
```

## Start Backend In Another Terminal

```powershell
cd backend
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

## Start Frontend

```powershell
cd frontend
npm run dev
```

## Open Dashboard

```text
http://localhost:3000/municipal/dashboard
```

## Open Statement Uploads

```text
http://localhost:3000/municipal/uploads
```

Uploaded PDFs flow through the existing backend extraction, validation, deduplication, and database-import pipeline. Validated records are added to the operational SQLite database automatically.

## Open Households

```text
http://localhost:3000/municipal/households
```

The Households section supports search by account number, customer name, or address. Municipal users can review the household list, open a household details page, inspect profile and meter details, view a monthly usage chart, and scan the billing-history table.

## Open Insights

```text
http://localhost:3000/municipal/insights
```

The Insights section shows deterministic water-usage patterns inferred dynamically from operational readings. Hidden ground-truth labels are not used. Insights identify accounts that may require municipal review, but they do not confirm leaks. Future AI agents may add explanations and richer recommendations on top of these baseline rules.

## Open Household Portal

```text
http://localhost:3000/household
```

The household portal currently uses demo household selection rather than real authentication. Residents can select a household profile, view monthly municipal water usage, review the latest bill summary, and see resident-friendly usage insights. Daily meter-photo uploads are visible as a coming-soon workflow and will be added later.

Resident meter-photo tracking is now available from each household dashboard:

```text
http://localhost:3000/household/{household_id}/meter-upload
```

Residents upload a recent water-meter photo, click `Analyse meter photo`, review the suggested meter details, and confirm or correct the visible reading before submission. The current analysis step uses a backend development mock adapter only; no OCR or external AI model is connected yet. The mock keeps the interface ready for a future OCR or vision adapter without changing the resident flow.

The backend performs deterministic freshness, duplicate-image, and reading-plausibility checks after resident confirmation. The original manual submission route remains available as a fallback when extraction is unavailable, low-confidence, or the resident prefers manual entry. Municipal staff can review recent resident submissions at:

```text
http://localhost:3000/municipal/meter-submissions
```

Set the extraction provider with:

```env
SUSTAINTECH_METER_EXTRACTION_PROVIDER=mock
```

Resident confirmation remains required before any reading becomes trusted operational data.
