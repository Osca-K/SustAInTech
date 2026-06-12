from fastapi import FastAPI

from .config import APP_NAME, APP_VERSION
from .routes import dashboard, health, households


app = FastAPI(title=APP_NAME, version=APP_VERSION)
app.include_router(health.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(households.router, prefix="/api")
