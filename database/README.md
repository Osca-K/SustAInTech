# Operational Database Prototype

This folder contains the local operational database prototype for SustAInTech.

SQLite is used for local development and testing. A PostgreSQL-compatible schema is included in `database/schemas/schema.postgres.sql` for a future Supabase migration, but this prototype does not connect to Supabase yet.

Only validated ingestion records marked `import_ready` enter the database. Hidden evaluation labels are intentionally excluded; the database stores observable household, meter, reading, and statement data only.

## Initialise Local Database

```powershell
python database\scripts\init_database.py --reset
```

## Import One Batch

```powershell
python database\scripts\import_ready_batch.py --batch-summary "ingestion\output\batches\batch_001_summary_20260612_134249.json"
```

## Inspect Database

```powershell
python database\scripts\inspect_database.py
```

## Apply Meter-Submission Migration

Existing local SQLite databases can be upgraded without resetting:

```powershell
python database\scripts\migrate_add_household_meter_submissions.py
```

The migration adds resident water-meter photo submissions, storing image paths and metadata only. Raw image bytes are not stored in SQLite.

## Run Tests

```powershell
pytest ingestion\tests database\tests
```
