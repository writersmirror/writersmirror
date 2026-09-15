import json
from pathlib import Path

DATA_PATH = Path(__file__).parent / "data" / "plotto.json"

with open(DATA_PATH, encoding="utf-8") as f:
    DATA = json.load(f)

CHARACTERS = DATA["characters"]
SUBJECTS = DATA["subjects"]      # A clauses
PREDICATES = DATA["predicates"]  # B clauses
OUTCOMES = DATA["outcomes"]      # C clauses
CONFLICTS = DATA["conflicts"]

# id -> conflict
CONFLICTS_BY_ID = {c["id"]: c for c in CONFLICTS}

# short one-line label for cross-reference previews
CONFLICT_LABEL = {}
for c in CONFLICTS:
    first = c["permutations"][0]["description"] if c["permutations"] else ""
    CONFLICT_LABEL[c["id"]] = first

# 3-level tree: category -> subcategory (classification) -> b_heading (masterplot B-clause)
_tree = {}
_cat_order = []
for c in CONFLICTS:
    cat, sub = c["category"], c["subcategory"]
    bh = c.get("b_heading") or "(General)"
    if cat not in _tree:
        _tree[cat] = {}
        _cat_order.append(cat)
    if sub not in _tree[cat]:
        _tree[cat][sub] = {}
    _tree[cat][sub][bh] = _tree[cat][sub].get(bh, 0) + 1

CATEGORY_TREE = [
    {
        "category": cat,
        "count": sum(sum(bhs.values()) for bhs in _tree[cat].values()),
        "subcategories": [
            {
                "name": sub,
                "count": sum(bhs.values()),
                "headings": [{"name": h, "count": n} for h, n in bhs.items()],
            }
            for sub, bhs in _tree[cat].items()
        ],
    }
    for cat in _cat_order
]


def label_for(ref: str) -> str:
    return CONFLICT_LABEL.get(ref, "")


# lead-up / carry-on counts per conflict, to flag story beginnings and endings
def _count_links(groups):
    return sum(len(g["links"]) for g in groups)


LEAD_COUNT = {c["id"]: _count_links(c["lead_ups"]) for c in CONFLICTS}
CARRY_COUNT = {c["id"]: _count_links(c["carry_ons"]) for c in CONFLICTS}


# Curated (algorithmic) cross-links Cook did not list himself — surfaced by the
# connection hunt in /plotto_connections.md. Each: (a, b, score, shared_chars, shared_themes).
# These are review candidates, not authoritative Plotto links.
_CONNECTION_PAIRS = [
    ("844b", "94b", 20.3, ["B-2", "B-3"], ["designing", "fiance", "friend", "restore", "save", "seeks", "wiles", "woman"]),
    ("238", "844b", 14.2, ["B-2", "B-3"], ["designing", "restore", "seeks", "wiles", "woman"]),
    ("284", "73", 12.0, ["F-B", "M-B"], ["love", "marry", "parents"]),
    ("350", "77", 11.0, ["A-3", "F-B"], ["father", "love", "secret"]),
    ("238", "94b", 10.8, ["B-2", "B-3"], ["designing", "restore", "seeks", "wiles", "woman"]),
    ("301a", "350", 10.4, ["A-3", "F-B"], ["father", "love"]),
    ("301a", "77", 10.0, ["A-3", "F-B"], ["father", "love"]),
    ("284", "334b", 9.6, ["F-B", "M-B"], ["love", "parents"]),
    ("269", "301a", 9.3, ["A-3", "F-B"], ["father", "love"]),
    ("284", "353", 9.3, ["F-B", "M-B"], ["parents"]),
    ("180", "301a", 9.0, ["A-3", "F-B"], ["father", "love", "rival"]),
    ("1160", "1182", 8.9, ["F-A", "M-A"], ["parents"]),
    ("284", "301a", 8.9, ["A-3", "F-B"], ["love"]),
    ("123", "283", 8.7, ["F-A", "F-B"], ["father", "loves"]),
    ("269", "350", 8.7, ["A-3", "F-B"], ["father", "love"]),
    ("269", "313", 8.5, ["A-3", "F-B"], ["father", "marriage"]),
    ("269", "77", 8.5, ["A-3", "F-B"], ["father", "love"]),
    ("311", "353", 8.5, ["F-B", "M-B"], ["parents"]),
]

# id -> [ {ref, score, shared_characters, shared_themes, cross_category} ] (bidirectional)
SUGGESTED_CONNECTIONS = {}
for a, b, score, chars, themes in _CONNECTION_PAIRS:
    ca, cb = CONFLICTS_BY_ID.get(a), CONFLICTS_BY_ID.get(b)
    cross = bool(ca and cb and ca["category"] != cb["category"])
    for src, dst in ((a, b), (b, a)):
        SUGGESTED_CONNECTIONS.setdefault(src, []).append({
            "ref": dst,
            "score": score,
            "shared_characters": chars,
            "shared_themes": themes,
            "cross_category": cross,
        })
for k in SUGGESTED_CONNECTIONS:
    SUGGESTED_CONNECTIONS[k].sort(key=lambda x: x["score"], reverse=True)


def suggested_for(conflict_id: str):
    out = []
    for s in SUGGESTED_CONNECTIONS.get(conflict_id, []):
        out.append({**s, "label": label_for(s["ref"])})
    return out
