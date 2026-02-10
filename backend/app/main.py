from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.nws.client import nws


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await nws.close()


app = FastAPI(
    title="Weather Modeling API",
    description="NWS data and glossary for weather modeling app",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api", tags=["api"])


@app.get("/")
async def root():
    return {"service": "weather-modeling-api", "docs": "/docs"}
