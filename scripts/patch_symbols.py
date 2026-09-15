import json
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "backend" / "data" / "plotto.json"
d = json.load(open(DATA, encoding="utf-8"))

# Generic / derived Plotto symbols that appear in conflict prose but were missing
# from the parsed legend, so they render as plain text instead of translated chips.
GENERICS = [
    {"designation": "SN", "sex": "male", "description": "a son"},
    {"designation": "D", "sex": "female", "description": "a daughter"},
    {"designation": "SR", "sex": "female", "description": "a sister"},
    {"designation": "U", "sex": "male", "description": "an uncle"},
    {"designation": "CN", "sex": "any", "description": "a cousin"},
    {"designation": "NW", "sex": "male", "description": "a nephew"},
    {"designation": "GCH", "sex": "any", "description": "a grandchild"},
    {"designation": "AUX", "sex": "female", "description": "a mysterious aunt"},
    {"designation": "CH-1", "sex": "any", "description": "a child (first)"},
    {"designation": "CH-2", "sex": "any", "description": "a child (second)"},
    {"designation": "X-1", "sex": "none", "description": "an object of mystery, an uncertain quantity"},
    {"designation": "X-2", "sex": "none", "description": "an object of mystery, an uncertain quantity"},
]

existing = {c["designation"] for c in d["characters"]}
added = []
for g in GENERICS:
    if g["designation"] not in existing:
        d["characters"].append(g)
        added.append(g["designation"])

# Fix "U. S. mail" abbreviation in #673 so bare "U" is not misread as the uncle symbol.
fixed = []
for c in d["conflicts"]:
    if c["id"] == "673":
        for p in c["permutations"]:
            if "U. S. mail" in p["description"]:
                p["description"] = p["description"].replace("U. S. mail", "United States mail")
                fixed.append("673")

json.dump(d, open(DATA, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("added symbols:", added)
print("fixed conflicts:", fixed)
print("total characters:", len(d["characters"]))
