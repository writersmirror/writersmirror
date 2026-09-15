import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from db import db
from auth import get_current_user
import plotto_store as store

router = APIRouter(prefix="/api/library", tags=["library"])


# ---------- schemas ----------
class ClauseRef(BaseModel):
    number: int
    description: str


class PlotConflict(BaseModel):
    id: str
    summary: str = ""
    note: str = ""
    transforms: List[dict] = []


class PlotIn(BaseModel):
    title: str = Field(min_length=1, max_length=140)
    folder: str = "Unfiled"
    a_clause: Optional[ClauseRef] = None
    b_clause: Optional[ClauseRef] = None
    c_clause: Optional[ClauseRef] = None
    conflicts: List[PlotConflict] = []
    notes: str = ""


class BookmarkIn(BaseModel):
    conflict_id: str


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ---------- bookmarks ----------
@router.get("/bookmarks")
async def list_bookmarks(user: dict = Depends(get_current_user)):
    docs = await db.bookmarks.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for d in docs:
        c = store.CONFLICTS_BY_ID.get(d["conflict_id"])
        if c:
            d["category"] = c["category"]
            d["subcategory"] = c["subcategory"]
            d["summary"] = c["permutations"][0]["description"] if c["permutations"] else ""
    return docs


@router.post("/bookmarks")
async def add_bookmark(payload: BookmarkIn, user: dict = Depends(get_current_user)):
    if payload.conflict_id not in store.CONFLICTS_BY_ID:
        raise HTTPException(status_code=404, detail="Conflict not found")
    existing = await db.bookmarks.find_one({"user_id": user["id"], "conflict_id": payload.conflict_id})
    if existing:
        return {"id": existing["id"], "conflict_id": payload.conflict_id}
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"],
           "conflict_id": payload.conflict_id, "created_at": now_iso()}
    await db.bookmarks.insert_one(doc)
    return {"id": doc["id"], "conflict_id": payload.conflict_id}


@router.delete("/bookmarks/{conflict_id}")
async def remove_bookmark(conflict_id: str, user: dict = Depends(get_current_user)):
    await db.bookmarks.delete_one({"user_id": user["id"], "conflict_id": conflict_id})
    return {"ok": True}


# ---------- saved plots ----------
@router.get("/plots")
async def list_plots(user: dict = Depends(get_current_user)):
    return await db.plots.find({"user_id": user["id"]}, {"_id": 0}).sort("updated_at", -1).to_list(1000)


@router.post("/plots")
async def create_plot(payload: PlotIn, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc.update({"id": str(uuid.uuid4()), "user_id": user["id"],
                "created_at": now_iso(), "updated_at": now_iso()})
    await db.plots.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/plots/{plot_id}")
async def get_plot(plot_id: str, user: dict = Depends(get_current_user)):
    doc = await db.plots.find_one({"id": plot_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Plot not found")
    return doc


@router.put("/plots/{plot_id}")
async def update_plot(plot_id: str, payload: PlotIn, user: dict = Depends(get_current_user)):
    existing = await db.plots.find_one({"id": plot_id, "user_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Plot not found")
    update = payload.model_dump()
    update["updated_at"] = now_iso()
    await db.plots.update_one({"id": plot_id, "user_id": user["id"]}, {"$set": update})
    doc = await db.plots.find_one({"id": plot_id, "user_id": user["id"]}, {"_id": 0})
    return doc


@router.delete("/plots/{plot_id}")
async def delete_plot(plot_id: str, user: dict = Depends(get_current_user)):
    res = await db.plots.delete_one({"id": plot_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plot not found")
    return {"ok": True}


# ---------- folders ----------
class FolderRename(BaseModel):
    old_name: str
    new_name: str = Field(min_length=1, max_length=80)


class PlotMove(BaseModel):
    folder: str = Field(min_length=1, max_length=80)


@router.patch("/folders/rename")
async def rename_folder(payload: FolderRename, user: dict = Depends(get_current_user)):
    new = payload.new_name.strip() or "Unfiled"
    res = await db.plots.update_many(
        {"user_id": user["id"], "folder": payload.old_name},
        {"$set": {"folder": new, "updated_at": now_iso()}},
    )
    return {"ok": True, "moved": res.modified_count, "folder": new}


@router.patch("/plots/{plot_id}/move")
async def move_plot(plot_id: str, payload: PlotMove, user: dict = Depends(get_current_user)):
    new = payload.folder.strip() or "Unfiled"
    res = await db.plots.update_one(
        {"id": plot_id, "user_id": user["id"]},
        {"$set": {"folder": new, "updated_at": now_iso()}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plot not found")
    return {"ok": True, "folder": new}


# ---------- working draft (session save, synced across devices) ----------
@router.get("/draft")
async def get_draft(user: dict = Depends(get_current_user)):
    doc = await db.drafts.find_one({"user_id": user["id"]}, {"_id": 0, "user_id": 0})
    return doc or {"draft": None}


@router.put("/draft")
async def put_draft(payload: dict, user: dict = Depends(get_current_user)):
    draft = payload.get("draft")
    await db.drafts.update_one(
        {"user_id": user["id"]},
        {"$set": {"draft": draft, "updated_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True}
