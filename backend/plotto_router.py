from fastapi import APIRouter, HTTPException, Query
import secrets
import plotto_store as store

router = APIRouter(prefix="/api/plotto", tags=["plotto"])


@router.get("/characters")
async def get_characters():
    return store.CHARACTERS


@router.get("/clauses")
async def get_clauses():
    return {"a": store.SUBJECTS, "b": store.PREDICATES, "c": store.OUTCOMES}


@router.get("/categories")
async def get_categories():
    return store.CATEGORY_TREE


@router.get("/random")
async def random_plot():
    a = secrets.choice(store.SUBJECTS)
    b = secrets.choice(store.PREDICATES)
    c = secrets.choice(store.OUTCOMES)

    # Prefer a conflict that the chosen B clause actually suggests, for coherence.
    conflict = None
    links = list(b.get("conflict_links") or [])
    secrets.SystemRandom().shuffle(links)
    for l in links:
        cf = store.CONFLICTS_BY_ID.get(l["ref"])
        if cf:
            conflict = cf
            break
    if conflict is None:
        conflict = secrets.choice(store.CONFLICTS)

    return {
        "a_clause": {"number": a["number"], "description": a["description"]},
        "b_clause": {"number": b["number"], "description": b["description"]},
        "c_clause": {"number": c["number"], "description": c["description"]},
        "conflict": {
            "id": conflict["id"],
            "category": conflict["category"],
            "subcategory": conflict["subcategory"],
            "summary": conflict["permutations"][0]["description"] if conflict["permutations"] else "",
        },
    }


def _enrich_group(groups):
    out = []
    for g in groups:
        links = []
        for l in g["links"]:
            ref = l["ref"]
            links.append({
                **l,
                "label": store.label_for(ref),
                "starts_story": store.LEAD_COUNT.get(ref, 0) == 0,
                "leads_to_end": store.CARRY_COUNT.get(ref, 0) == 0,
            })
        out.append({"mode": g["mode"], "links": links})
    return out


def _filter_conflicts(items, category, subcategory, heading, search):
    if category:
        items = [c for c in items if c["category"] == category]
    if subcategory:
        items = [c for c in items if c["subcategory"] == subcategory]
    if heading:
        items = [c for c in items if (c.get("b_heading") or "(General)") == heading]
    if search:
        q = search.lower()
        items = [c for c in items if _matches_search(c, q)]
    return items


def _matches_search(c, q):
    if q in c["id"].lower():
        return True
    return any(q in p["description"].lower() for p in c["permutations"])


def _list_item(c):
    return {
        "id": c["id"],
        "category": c["category"],
        "subcategory": c["subcategory"],
        "b_heading": c.get("b_heading"),
        "summary": c["permutations"][0]["description"] if c["permutations"] else "",
        "permutation_count": len(c["permutations"]),
        "lead_up_count": sum(len(g["links"]) for g in c["lead_ups"]),
        "carry_on_count": sum(len(g["links"]) for g in c["carry_ons"]),
    }


@router.get("/conflicts")
async def list_conflicts(
    search: str = "",
    category: str = "",
    subcategory: str = "",
    heading: str = "",
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=100),
):
    items = _filter_conflicts(store.CONFLICTS, category, subcategory, heading, search)
    total = len(items)
    start = (page - 1) * limit
    results = [_list_item(c) for c in items[start:start + limit]]
    return {"items": results, "total": total, "page": page,
            "pages": (total + limit - 1) // limit}


@router.get("/conflicts/{conflict_id}")
async def get_conflict(conflict_id: str):
    c = store.CONFLICTS_BY_ID.get(conflict_id)
    if not c:
        raise HTTPException(status_code=404, detail="Conflict not found")
    return {
        "id": c["id"],
        "category": c["category"],
        "subcategory": c["subcategory"],
        "b_heading": c.get("b_heading"),
        "permutations": c["permutations"],
        "lead_ups": _enrich_group(c["lead_ups"]),
        "carry_ons": _enrich_group(c["carry_ons"]),
        "suggested_connections": store.suggested_for(conflict_id),
        "is_beginning": store.LEAD_COUNT.get(conflict_id, 0) == 0,
        "is_ending": store.CARRY_COUNT.get(conflict_id, 0) == 0,
    }
