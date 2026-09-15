import os
import uuid
import secrets
from datetime import datetime, timezone, timedelta

import bcrypt
import jwt
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from pydantic import BaseModel, EmailStr, Field

from db import db

JWT_ALGORITHM = "HS256"
router = APIRouter(prefix="/api/auth", tags=["auth"])


# ---------- helpers ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(minutes=60), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id,
               "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True,
                        samesite="none", max_age=3600, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True,
                        samesite="none", max_age=604800, path="/")


def public_user(u: dict) -> dict:
    return {"id": str(u["_id"]), "email": u["email"], "name": u.get("name", ""),
            "role": u.get("role", "user")}


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        header = request.headers.get("Authorization", "")
        if header.startswith("Bearer "):
            token = header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return public_user(user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def verify_captcha(captcha_id: str, answer: str):
    doc = await db.captchas.find_one({"captcha_id": captcha_id})
    if not doc:
        raise HTTPException(status_code=400, detail="Captcha expired. Please refresh it.")
    await db.captchas.delete_one({"captcha_id": captcha_id})
    try:
        ok = int(str(answer).strip()) == doc["answer"]
    except (ValueError, TypeError):
        ok = False
    if not ok:
        raise HTTPException(status_code=400, detail="Incorrect captcha answer.")


# ---------- schemas ----------
class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    captcha_id: str
    captcha_answer: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str
    captcha_id: str
    captcha_answer: str


# ---------- routes ----------
@router.get("/captcha")
async def get_captcha():
    a, b = secrets.randbelow(8) + 2, secrets.randbelow(8) + 2
    cid = str(uuid.uuid4())
    await db.captchas.insert_one({
        "captcha_id": cid, "answer": a + b,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10),
    })
    return {"captcha_id": cid, "question": f"What is {a} + {b}?"}


@router.post("/register")
async def register(payload: RegisterIn, response: Response):
    await verify_captcha(payload.captcha_id, payload.captcha_answer)
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    doc = {"email": email, "password_hash": hash_password(payload.password),
           "name": payload.name, "role": "user", "created_at": datetime.now(timezone.utc)}
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
    access, refresh = create_access_token(uid, email), create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    doc["_id"] = res.inserted_id
    return {"user": public_user(doc), "access_token": access}


@router.post("/login")
async def login(payload: LoginIn, request: Request, response: Response):
    await verify_captcha(payload.captcha_id, payload.captcha_answer)
    email = payload.email.lower()
    ip = request.client.host if request.client else "unknown"
    ident = f"{ip}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": ident})
    if attempt and attempt.get("count", 0) >= 5:
        locked_until = attempt.get("locked_until")
        if locked_until is not None and locked_until.tzinfo is None:
            # MongoDB returns naive UTC datetimes
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        if locked_until and locked_until > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Too many attempts. Try again in a few minutes.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": ident},
            {"$inc": {"count": 1},
             "$set": {"locked_until": datetime.now(timezone.utc) + timedelta(minutes=15)}},
            upsert=True)
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    await db.login_attempts.delete_one({"identifier": ident})
    uid = str(user["_id"])
    access, refresh = create_access_token(uid, email), create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    return {"user": public_user(user), "access_token": access}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    access = create_access_token(str(user["_id"]), user["email"])
    response.set_cookie("access_token", access, httponly=True, secure=True,
                        samesite="none", max_age=3600, path="/")
    return {"access_token": access}


async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({"email": admin_email, "password_hash": hash_password(admin_password),
                                   "name": "Admin", "role": "admin",
                                   "created_at": datetime.now(timezone.utc)})
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_password)}})
