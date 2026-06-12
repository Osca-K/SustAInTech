def test_health_returns_200(client):
    response = client.get("/api/health")
    assert response.status_code == 200


def test_health_response_matches_expected_values(client):
    assert client.get("/api/health").json() == {
        "status": "healthy",
        "application": "SustAInTech API",
        "version": "0.1.0",
    }
