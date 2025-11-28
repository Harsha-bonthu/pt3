import pytest
from fastapi.testclient import TestClient
from backend.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_register_login_and_item_flow(client):
    username = "testuser"
    password = "testpass"
    # register (ignore if already exists)
    r = client.post('/api/register', json={"username": username, "password": password})
    assert r.status_code in (200, 400)

    # login
    r = client.post('/api/login', json={"username": username, "password": password})
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    token = data['access_token']

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    # add item
    r = client.post('/api/items', json={"title": "T1", "category": "unit", "description": "d"}, headers=headers)
    assert r.status_code == 200
    item = r.json()
    assert item['title'] == 'T1'

    # list items
    r = client.get('/api/items', headers=headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
