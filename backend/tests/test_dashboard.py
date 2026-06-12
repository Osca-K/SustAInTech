def test_dashboard_summary_returns_seeded_counts(client):
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["household_count"] == 3
    assert data["water_meter_count"] == 3
    assert data["monthly_reading_count"] == 3
    assert data["monthly_statement_count"] == 3
    assert data["statement_upload_count"] == 3
    assert data["ingestion_batch_count"] == 1
    assert data["latest_statement_month"] == "2026-06"


def test_monthly_water_usage_is_chronologically_ordered(client):
    response = client.get("/api/dashboard/monthly-water-usage")
    assert response.status_code == 200
    data = response.json()
    assert [item["statement_month"] for item in data] == sorted(item["statement_month"] for item in data)
    assert data[0]["statement_month"] == "2026-04"
    assert data[1]["statement_month"] == "2026-06"
    assert data[1]["total_consumption_kL"] == 67.0
    assert data[1]["household_count"] == 2


def test_upload_statuses_group_processing_statuses(client):
    response = client.get("/api/dashboard/upload-statuses")
    assert response.status_code == 200
    assert response.json() == [{"processing_status": "import_ready", "count": 3}]
