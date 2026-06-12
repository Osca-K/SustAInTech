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

Residents upload a recent water-meter photo, enter the visible reading manually, and confirm the value. The backend performs deterministic freshness, duplicate-image, and reading-plausibility checks. Municipal staff can review recent resident submissions at:

```text
http://localhost:3000/municipal/meter-submissions
```

AI extraction fields are reserved in the database for a later phase; OCR and external AI APIs are not used yet.
