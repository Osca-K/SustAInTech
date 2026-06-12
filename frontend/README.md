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
