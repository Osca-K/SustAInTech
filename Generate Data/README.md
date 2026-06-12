# SustAInTech Synthetic Municipal Statement Generator

This folder generates fictional, clearly marked two-page municipal statement PDFs for SustAInTech testing and demonstrations.

## Generate the PDF

```powershell
python scripts/render_statement.py
```

The renderer reads `data/sample_statement.json`, renders `templates/municipal_statement.tex.j2`, runs `pdflatex`, and writes:

- `output/generated_tex/municipal_statement.tex`
- `output/pdf/municipal_statement.pdf`

## Requirements

- Python package: `jinja2`
- System executable: `pdflatex`

No dashboard, API, database, batch generation, PDF overlay, screenshot background, barcode library, ReportLab, or HTML renderer is used.

## Star Village / New Protea pilot

The first pilot batch covers synthetic households for:

- Star Village / New Protea
- Protea Glen Extension 28
- Soweto
- City of Johannesburg
- Region D
- Ward 53

All household, account, meter, invoice, and billing records are synthetic. They are intended for development and dashboard testing only. Coordinates are deliberately blank and every generated record is marked `needs_geocoding = true`; mapping must wait for manual coordinate verification.

Generate the full first pilot batch:

```powershell
python scripts\generate_first_pilot_batch.py
```

This writes:

- `data/generated/households.csv`
- `data/generated/households.json`
- `data/generated/monthly_water_readings.csv`
- `data/generated/monthly_water_readings.json`
- `data/generated/monthly_statement_records.csv`
- `data/generated/monthly_statement_records.json`
- `data/render_inputs/*.json`
- `output/pdf/SV-H*_2026-*.pdf`

Validate the generated data and PDFs:

```powershell
python scripts\validate_generated_data.py
```

The synthetic tariff file is `data/tariffs/synthetic_tariffs_2026.json`. It is not an official municipal tariff and must be replaced with verified official tariffs before production use.
