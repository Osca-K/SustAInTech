# Municipal Statement Ingestion Prototype

This folder belongs to the application layer. It processes municipality-uploaded statement PDFs into clean structured JSON records for SustAInTech.

The first workflow processes one controlled synthetic PDF:

```powershell
python ingestion\scripts\process_one_statement.py --input "Generate Data\output\pdf\SV-H001_2026-04.pdf"
```

The workflow extracts text with PyMuPDF, parses only SustAInTech-relevant statement identity, household identity, water-meter, water-charge, and statement-total fields, validates readings and charges, and writes structured JSON to:

```text
ingestion/output/SV-H001_2026-04_extracted.json
```

Install dependencies with:

```powershell
pip install -r ingestion\requirements.txt
```

Run tests with:

```powershell
pytest ingestion\tests
```

## Process a Folder of Statements

For development testing, sample PDFs may be copied into `ingestion/input/batch_001/`. The batch command can process that folder:

```powershell
python ingestion\scripts\process_statement_batch.py --input-folder "ingestion\input\batch_001"
```

Each PDF produces one structured JSON file in:

```text
ingestion/output/extracted/
```

Each run also writes one batch-summary JSON file in:

```text
ingestion/output/batches/
```

Duplicate PDFs are skipped using SHA-256 hashes and recorded in `ingestion/output/processed_files_registry.json`. Duplicate invoice numbers are also skipped so a previously extracted statement is not overwritten. Invalid PDFs and incomplete statements are reported as failed or review-required while the remaining files continue processing.

This first version intentionally ignores PDF fields that are not needed for the application record, including payment references, fake barcode values, footer notices, logos, contact details, watermark text, bank details, postal address, PIN code, VAT registration numbers, ageing buckets, and property valuation details.

Normal ingestion outputs must not contain anomaly labels.

Deterministic parsing is used because the synthetic statements follow a controlled LaTeX layout. A later version can add an AI extraction agent for less predictable real-world municipal documents.
