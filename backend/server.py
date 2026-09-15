from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from db import db, client
from auth import router as auth_router, seed_admin
from plotto_router import router as plotto_router
from library_router import router as library_router

app = FastAPI(title="Plotto Navigator")

app.include_router(auth_router)
app.include_router(plotto_router)
app.include_router(library_router)


@app.get("/api/")
async def root():
    return {"message": "Plotto Navigator API"}


origins = os.environ.get("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.captchas.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")
    await db.bookmarks.create_index([("user_id", 1), ("conflict_id", 1)])
    await db.plots.create_index("user_id")
    await seed_admin()
    logger.info("Plotto Navigator started")


@app.on_event("shutdown")
async def shutdown():
    client.close()
