FORBIDDEN_RESPONSE_TOKENS = (
    "pin_code",
    "possible_leak",
    "sustained_high_usage",
    "anomaly_type",
    "anomaly_notes",
    "expected_classification",
    "scenario_notes",
)


def test_households_lists_seeded_households(client):
    response = client.get("/api/households")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    assert data[0]["account_number"] == "810240000"


def test_household_search_filters_correctly(client):
    response = client.get("/api/households", params={"search": "810240411"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["account_number"] == "810240411"


def test_household_details_returns_details(client, household_ids):
    household_id = household_ids["810240000"]
    response = client.get(f"/api/households/{household_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["account_number"] == "810240000"
    assert data["meter_number"] == "650200"
    assert data["resource_type"] == "water"
    assert data["unit"] == "kL"


def test_unknown_household_returns_404(client):
    response = client.get("/api/households/household_missing")
    assert response.status_code == 404


def test_household_monthly_usage_returns_chronological_records(client, household_ids):
    household_id = household_ids["810240000"]
    response = client.get(f"/api/households/{household_id}/monthly-usage")
    assert response.status_code == 200
    data = response.json()
    assert [item["statement_month"] for item in data] == sorted(item["statement_month"] for item in data)
    assert data[0]["statement_month"] == "2026-04"


def test_household_usage_records_include_water_and_statement_totals(client, household_ids):
    household_id = household_ids["810240411"]
    response = client.get(f"/api/households/{household_id}/monthly-usage")
    data = response.json()
    assert data[0]["consumption_kL"] == 36.0
    assert data[0]["water_total_including_vat"] == 1403.24
    assert data[0]["current_charges_including_vat"] == 1616.79
    assert data[0]["total_due"] == 1616.79
    assert data[0]["invoice_number"]


def test_responses_do_not_expose_pin_codes(client, household_ids):
    responses = [
        client.get("/api/dashboard/summary"),
        client.get("/api/dashboard/monthly-water-usage"),
        client.get("/api/dashboard/upload-statuses"),
        client.get("/api/households"),
        client.get(f"/api/households/{household_ids['810240000']}"),
        client.get(f"/api/households/{household_ids['810240000']}/monthly-usage"),
    ]
    combined = " ".join(response.text.lower() for response in responses)
    assert "pin_code" not in combined
    assert "pin code" not in combined


def test_responses_do_not_expose_hidden_evaluation_labels(client, household_ids):
    responses = [
        client.get("/api/dashboard/summary"),
        client.get("/api/dashboard/monthly-water-usage"),
        client.get("/api/dashboard/upload-statuses"),
        client.get("/api/households"),
        client.get(f"/api/households/{household_ids['810240411']}"),
        client.get(f"/api/households/{household_ids['810240411']}/monthly-usage"),
    ]
    combined = " ".join(response.text.lower() for response in responses)
    assert not any(token in combined for token in FORBIDDEN_RESPONSE_TOKENS)
