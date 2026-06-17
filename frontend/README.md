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

Residents upload a recent water-meter photo, click `Analyse meter photo`, review the suggested meter details, and confirm or correct the visible reading before submission. The backend defaults to a development mock adapter. It can optionally use OpenAI vision extraction when the backend is configured with `SUSTAINTECH_METER_EXTRACTION_PROVIDER=openai_vision` and `OPENAI_API_KEY`.

The frontend never receives `OPENAI_API_KEY`. It only displays backend extraction suggestions, confidence, image quality, and notes. The resident can edit the values, and confirmation remains required. The backend performs deterministic freshness, duplicate-image, and reading-plausibility checks after resident confirmation. The original manual submission route remains available as a fallback when extraction is unavailable, low-confidence, or the resident prefers manual entry. Municipal staff can review recent resident submissions at:

```text
http://localhost:3000/municipal/meter-submissions
```

Set the extraction provider in backend/server environment only:

```env
OPENAI_API_KEY=
SUSTAINTECH_METER_EXTRACTION_PROVIDER=mock
SUSTAINTECH_OPENAI_VISION_MODEL=gpt-5.5
```

Use `SUSTAINTECH_METER_EXTRACTION_PROVIDER=openai_vision` only when the backend has `OPENAI_API_KEY` configured.

Resident confirmation remains required before any reading becomes trusted operational data.

## Open Waste Sorting Assistant

```text
http://localhost:3000/household/{household_id}/waste
```

Residents can enter a waste item, optional description, or selected category and receive deterministic sorting guidance. This first milestone does not use external AI or image recognition. Query history is private to the selected household.

Municipal users can review aggregate waste-query trends at:

```text
http://localhost:3000/municipal/waste
```

The municipal waste page shows total queries, classification counts, common selected categories, and recent query summaries.

## Open Prepaid Electricity Tracker

```text
http://localhost:3000/household/{household_id}/electricity
```

Residents can enter prepaid electricity purchases, purchased units, optional balance, supplier, and notes. The form warns residents not to enter a full prepaid token; only the last 4 characters may be saved for reference. Household estimates are based only on resident-entered values and do not use external AI.

Municipal users can review aggregate prepaid electricity trends at:

```text
http://localhost:3000/municipal/electricity
```

The municipal electricity page shows aggregate top-up counts, spend, units, average cost per kWh, and low-balance households. It does not expose household notes or token references.

## Open Recommendations

Household dashboards show practical recommendations generated from that household's water, prepaid electricity, and waste activity. These recommendations are rule-based and do not use external AI.

Municipal users can review aggregate community recommendations at:

```text
http://localhost:3000/municipal/recommendations
```

Municipal recommendations are grouped by water, electricity, waste, and combined signals. They are generated from existing operational data and do not expose private image paths, image hashes, household notes, or token references.

## Open Demo Scenario

```text
http://localhost:3000/municipal/demo
```

Demo Scenario Mode provides a guided presentation path through the existing water, recommendations, waste, prepaid electricity, and impact pages. It uses operational data from the backend to select a demo household and summary metrics. It does not add new AI, store demo records, or change module logic.

## Open Impact Dashboard

```text
http://localhost:3000/municipal/impact
```

The Impact Dashboard combines water monitoring, waste-sorting awareness, and prepaid electricity awareness metrics. Water metrics come from municipal readings and resident meter submissions. Waste metrics come from household sorting guidance queries. Electricity metrics come from resident-entered prepaid top-ups and low-balance balances. The waste diversion metric is labelled as awareness potential, not actual waste diverted. No new AI feature is added on this page.
