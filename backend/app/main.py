from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import APP_NAME, APP_VERSION
from .routes import dashboard, health, households, insights, meter_submissions, uploads


app = FastAPI(title=APP_NAME, version=APP_VERSION)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(households.router, prefix="/api")
app.include_router(insights.router, prefix="/api")
app.include_router(meter_submissions.router, prefix="/api")
app.include_router(uploads.router, prefix="/api")
