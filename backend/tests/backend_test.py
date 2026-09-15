"""Plotto Navigator backend tests: plotto data, auth (captcha), library (bookmarks/plots)."""
import os
import re
import uuid

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@plotto.app")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "PlottoAdmin123")


# ---------- helpers / fixtures ----------
@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def solve_captcha(api):
    return solve_captcha_at(BASE_URL, api)


def solve_captcha_at(base, api=requests):
    r = api.get(f"{base}/api/auth/captcha")
    assert r.status_code == 200, r.text
    d = r.json()
    assert "captcha_id" in d and "question" in d
    nums = re.findall(r"\d+", d["question"])
    assert len(nums) == 2, f"unexpected question: {d['question']}"
    return d["captcha_id"], str(int(nums[0]) + int(nums[1]))


def login(api, email, password):
    cid, ans = solve_captcha(api)
    return api.post(f"{BASE_URL}/api/auth/login", json={
        "email": email, "password": password, "captcha_id": cid, "captcha_answer": ans})


def register(api, name, email, password):
    cid, ans = solve_captcha(api)
    return api.post(f"{BASE_URL}/api/auth/register", json={
        "name": name, "email": email, "password": password,
        "captcha_id": cid, "captcha_answer": ans})


@pytest.fixture(scope="session")
def user_a(api):
    email = f"TEST_writer_{uuid.uuid4().hex[:8]}@plotto.app"
    r = register(requests.Session(), "TEST Writer A", email, "writer123")
    assert r.status_code == 200, r.text
    return {"email": email, "password": "writer123", "token": r.json()["access_token"],
            "id": r.json()["user"]["id"]}


@pytest.fixture(scope="session")
def user_b(api):
    email = f"TEST_writer_{uuid.uuid4().hex[:8]}@plotto.app"
    r = register(requests.Session(), "TEST Writer B", email, "writer123")
    assert r.status_code == 200, r.text
    return {"email": email, "password": "writer123", "token": r.json()["access_token"]}


def hdr(u):
    return {"Authorization": f"Bearer {u['token']}", "Content-Type": "application/json"}


# ---------- module: health ----------
class TestHealth:
    def test_root(self, api):
        r = api.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        assert "message" in r.json()


# ---------- module: plotto reference data ----------
class TestPlottoData:
    def test_categories(self, api):
        r = api.get(f"{BASE_URL}/api/plotto/categories")
        assert r.status_code == 200
        data = r.json()
        names = [c["category"] for c in data]
        assert names == ["Love and Courtship", "Married Life", "Enterprise"]
        for c in data:
            assert isinstance(c["count"], int) and c["count"] > 0
            assert len(c["subcategories"]) > 0
            for s in c["subcategories"]:
                assert "name" in s and isinstance(s["count"], int)
        assert sum(c["count"] for c in data) == 1852

    def test_clauses(self, api):
        r = api.get(f"{BASE_URL}/api/plotto/clauses")
        assert r.status_code == 200
        d = r.json()
        assert len(d["a"]) == 15, len(d["a"])
        assert len(d["b"]) == 62, len(d["b"])
        assert len(d["c"]) == 15, len(d["c"])
        assert "number" in d["a"][0] and "description" in d["a"][0]

    def test_characters(self, api):
        r = api.get(f"{BASE_URL}/api/plotto/characters")
        assert r.status_code == 200
        d = r.json()
        # 54 original symbols + 12 generic symbols added in the Normalise Symbols round
        assert len(d) == 66, len(d)
        assert "designation" in d[0] and "description" in d[0]

    def test_conflicts_default_pagination(self, api):
        r = api.get(f"{BASE_URL}/api/plotto/conflicts")
        assert r.status_code == 200
        d = r.json()
        assert d["total"] == 1852
        assert d["page"] == 1
        assert len(d["items"]) == 24
        assert d["pages"] == (1852 + 23) // 24
        it = d["items"][0]
        for k in ("id", "summary", "lead_up_count", "carry_on_count", "category", "subcategory"):
            assert k in it

    def test_conflicts_page_2_differs(self, api):
        p1 = api.get(f"{BASE_URL}/api/plotto/conflicts?page=1&limit=10").json()
        p2 = api.get(f"{BASE_URL}/api/plotto/conflicts?page=2&limit=10").json()
        assert p2["page"] == 2
        assert {i["id"] for i in p1["items"]}.isdisjoint({i["id"] for i in p2["items"]})

    def test_conflicts_search(self, api):
        r = api.get(f"{BASE_URL}/api/plotto/conflicts", params={"search": "love"})
        assert r.status_code == 200
        d = r.json()
        assert 0 < d["total"] < 1852
        assert any("love" in i["summary"].lower() or "love" in i["id"].lower() for i in d["items"])

    def test_conflicts_category_filter(self, api):
        r = api.get(f"{BASE_URL}/api/plotto/conflicts", params={"category": "Married Life", "limit": 5})
        assert r.status_code == 200
        d = r.json()
        assert d["total"] == 290
        assert all(i["category"] == "Married Life" for i in d["items"])

    def test_conflicts_subcategory_filter(self, api):
        cats = api.get(f"{BASE_URL}/api/plotto/categories").json()
        sub = cats[0]["subcategories"][0]
        r = api.get(f"{BASE_URL}/api/plotto/conflicts",
                    params={"category": cats[0]["category"], "subcategory": sub["name"], "limit": 5})
        assert r.status_code == 200
        d = r.json()
        assert d["total"] == sub["count"]
        assert all(i["subcategory"] == sub["name"] for i in d["items"])

    def test_conflicts_invalid_limit(self, api):
        assert api.get(f"{BASE_URL}/api/plotto/conflicts?limit=500").status_code == 422
        assert api.get(f"{BASE_URL}/api/plotto/conflicts?page=0").status_code == 422

    def test_conflict_detail(self, api):
        r = api.get(f"{BASE_URL}/api/plotto/conflicts/1a")
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == "1a"
        assert len(d["permutations"]) >= 1
        assert "description" in d["permutations"][0]
        groups = d["lead_ups"] + d["carry_ons"]
        assert len(groups) > 0
        for g in groups:
            assert "mode" in g
            for link in g["links"]:
                assert "ref" in link
                assert "label" in link, f"link missing label: {link}"

    def test_conflict_detail_404(self, api):
        r = api.get(f"{BASE_URL}/api/plotto/conflicts/does-not-exist")
        assert r.status_code == 404

    def test_cross_reference_links_resolve(self, api):
        d = api.get(f"{BASE_URL}/api/plotto/conflicts/1a").json()
        refs = [l["ref"] for g in d["lead_ups"] + d["carry_ons"] for l in g["links"]]
        assert refs
        checked = 0
        for ref in refs[:5]:
            rr = api.get(f"{BASE_URL}/api/plotto/conflicts/{ref}")
            assert rr.status_code == 200, f"ref {ref} -> {rr.status_code}"
            checked += 1
        assert checked > 0


# ---------- module: plotto parent/child tree enrichment (new feature) ----------
class TestConflictTreeEnrichment:
    def test_detail_has_beginning_ending_flags(self, api):
        d = api.get(f"{BASE_URL}/api/plotto/conflicts/1b").json()
        assert isinstance(d["is_beginning"], bool)
        assert isinstance(d["is_ending"], bool)
        # 1b has lead_ups and carry_ons per source text
        assert (len(d["lead_ups"]) == 0) == d["is_beginning"]
        assert (len(d["carry_ons"]) == 0) == d["is_ending"]

    def test_links_enriched_with_flags_and_modifiers(self, api):
        d = api.get(f"{BASE_URL}/api/plotto/conflicts/1b").json()
        links = [l for g in d["lead_ups"] + d["carry_ons"] for l in g["links"]]
        assert links, "1b should expose lead-ups/carry-ons"
        for l in links:
            assert isinstance(l["ref"], str) and l["ref"]
            assert isinstance(l["label"], str) and l["label"]
            assert isinstance(l["starts_story"], bool)
            assert isinstance(l["leads_to_end"], bool)
            assert isinstance(l.get("modifiers", []), list)

    def test_at_least_one_modifier_transform_exists(self, api):
        found = []
        for cid in ("1b", "1a", "2a", "3a", "5a"):
            r = api.get(f"{BASE_URL}/api/plotto/conflicts/{cid}")
            if r.status_code != 200:
                continue
            d = r.json()
            for g in d["lead_ups"] + d["carry_ons"]:
                for l in g["links"]:
                    found.extend(l.get("modifiers") or [])
        assert found, "no character-change modifiers found on any sampled conflict"
        assert any(m.startswith("change ") for m in found), found[:5]

    def test_no_mongo_id_leak(self, api):
        d = api.get(f"{BASE_URL}/api/plotto/conflicts/1b").json()
        assert "_id" not in d

    def test_list_exposes_link_counts(self, api):
        items = api.get(f"{BASE_URL}/api/plotto/conflicts?limit=5").json()["items"]
        for i in items:
            assert isinstance(i["lead_up_count"], int)
            assert isinstance(i["carry_on_count"], int)

    def test_beginning_and_ending_conflicts_exist(self, api):
        """There must exist conflicts flagged as story beginnings and conclusions."""
        # from the dataset: 5 conflicts have no lead-ups, 44 have no carry-ons
        begin, end = "259", "94a"
        b = api.get(f"{BASE_URL}/api/plotto/conflicts/{begin}").json()
        e = api.get(f"{BASE_URL}/api/plotto/conflicts/{end}").json()
        assert b["is_beginning"] is True and b["lead_ups"] == []
        assert e["is_ending"] is True and e["carry_ons"] == []

    def test_characters_have_english_descriptions(self, api):
        chars = api.get(f"{BASE_URL}/api/plotto/characters").json()
        by_sym = {c["designation"]: c["description"] for c in chars}
        for sym in ("A", "B"):
            assert sym in by_sym, f"missing symbol {sym}"
            assert by_sym[sym].strip()
        # modifier-style symbols such as A-3 / A-5 should be described too
        dashed = [s for s in by_sym if "-" in s]
        assert dashed, "no dashed symbols (e.g. A-3) in character list"


# ---------- module: suggested connections (new feature) ----------
class TestSuggestedConnections:
    def _get(self, api, cid):
        r = api.get(f"{BASE_URL}/api/plotto/conflicts/{cid}")
        assert r.status_code == 200, r.text
        return r.json()

    def test_844b_suggests_94b_and_238(self, api):
        d = self._get(api, "844b")
        assert "suggested_connections" in d
        refs = [s["ref"] for s in d["suggested_connections"]]
        assert "94b" in refs and "238" in refs, refs
        top = d["suggested_connections"][0]
        assert top["ref"] == "94b" and top["score"] == 20.3
        assert isinstance(top["label"], str) and top["label"].strip()
        assert isinstance(top["shared_characters"], list) and top["shared_characters"]
        assert isinstance(top["cross_category"], bool)

    def test_bidirectional_links(self, api):
        d = self._get(api, "94b")
        refs = [s["ref"] for s in d["suggested_connections"]]
        assert "844b" in refs and "238" in refs, refs

    def test_269_has_multiple_suggestions(self, api):
        d = self._get(api, "269")
        refs = [s["ref"] for s in d["suggested_connections"]]
        for expected in ("301a", "350", "313", "77"):
            assert expected in refs, (expected, refs)
        scores = [s["score"] for s in d["suggested_connections"]]
        assert scores == sorted(scores, reverse=True), scores

    def test_suggestions_never_self_reference(self, api):
        for cid in ("269", "844b", "284", "301a", "353"):
            d = self._get(api, cid)
            assert cid not in [s["ref"] for s in d["suggested_connections"]]

    def test_all_suggested_refs_resolve(self, api):
        d = self._get(api, "284")
        assert d["suggested_connections"]
        for s in d["suggested_connections"]:
            r = api.get(f"{BASE_URL}/api/plotto/conflicts/{s['ref']}")
            assert r.status_code == 200, f"dangling suggested ref {s['ref']}"

    def test_conflict_without_suggestions_returns_empty_list(self, api):
        d = self._get(api, "1b")
        assert d["suggested_connections"] == []


# ---------- module: normalise symbols / generic characters ----------
class TestGenericSymbols:
    def test_generic_symbols_present_in_legend(self, api):
        chars = api.get(f"{BASE_URL}/api/plotto/characters").json()
        by_sym = {c["designation"]: c["description"].lower() for c in chars}
        expected = {
            "SN": "son", "D": "daughter", "U": "uncle", "CN": "cousin",
            "NW": "nephew", "GCH": "grandchild", "SR": "sister", "AUX": "aunt",
        }
        for sym, word in expected.items():
            assert sym in by_sym, f"missing generic symbol {sym}"
            assert word in by_sym[sym], (sym, by_sym[sym])

    def test_numbered_generic_symbols(self, api):
        chars = api.get(f"{BASE_URL}/api/plotto/characters").json()
        syms = {c["designation"] for c in chars}
        for s in ("CH-1", "CH-2", "X-1", "X-2"):
            assert s in syms, f"missing {s}"

    def test_1108_contains_bare_sn_token(self, api):
        d = api.get(f"{BASE_URL}/api/plotto/conflicts/1108").json()
        text = " ".join(p["description"] for p in d["permutations"])
        assert re.search(r"\bSN\b", text), text[:300]

    def test_673_us_mail_fixed(self, api):
        d = api.get(f"{BASE_URL}/api/plotto/conflicts/673").json()
        text = " ".join(p["description"] for p in d["permutations"])
        assert "United States mail" in text, text[:400]
        assert "U. S. mail" not in text and "U.S. mail" not in text



# ---------- module: auth ----------
class TestAuth:
    def test_captcha_format(self, api):
        r = api.get(f"{BASE_URL}/api/auth/captcha")
        assert r.status_code == 200
        d = r.json()
        assert re.match(r"What is \d+ \+ \d+\?", d["question"]), d["question"]

    def test_admin_login_and_me(self, api):
        s = requests.Session()
        r = login(s, ADMIN_EMAIL, ADMIN_PASSWORD)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user"]["email"] == ADMIN_EMAIL
        assert d["user"]["role"] == "admin"
        assert isinstance(d["access_token"], str) and len(d["access_token"]) > 10
        # httpOnly cookie set
        cookie_hdrs = r.headers.get("set-cookie", "")
        assert "access_token" in cookie_hdrs and "HttpOnly" in cookie_hdrs, cookie_hdrs
        me = requests.get(f"{BASE_URL}/api/auth/me",
                          headers={"Authorization": f"Bearer {d['access_token']}"})
        assert me.status_code == 200
        assert me.json()["email"] == ADMIN_EMAIL

    def test_register_flow(self, user_a):
        me = requests.get(f"{BASE_URL}/api/auth/me", headers=hdr(user_a))
        assert me.status_code == 200
        assert me.json()["email"] == user_a["email"].lower()
        assert me.json()["role"] == "user"

    def test_duplicate_register_rejected(self, api, user_a):
        r = register(requests.Session(), "dup", user_a["email"], "writer123")
        assert r.status_code == 400
        assert "already exists" in r.json()["detail"]

    def test_wrong_captcha_rejected(self, api):
        cid, ans = solve_captcha(api)
        r = api.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD,
            "captcha_id": cid, "captcha_answer": str(int(ans) + 3)})
        assert r.status_code == 400
        assert "captcha" in r.json()["detail"].lower()

    def test_captcha_single_use(self, api):
        cid, ans = solve_captcha(api)
        r1 = api.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD,
            "captcha_id": cid, "captcha_answer": ans})
        assert r1.status_code == 200
        r2 = api.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD,
            "captcha_id": cid, "captcha_answer": ans})
        assert r2.status_code == 400

    def test_wrong_password_rejected(self, api):
        r = login(requests.Session(), ADMIN_EMAIL, "totally-wrong-pass")
        assert r.status_code == 401
        assert "Invalid email or password" in r.json()["detail"]

    def test_me_requires_auth(self, api):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_me_invalid_token(self, api):
        r = requests.get(f"{BASE_URL}/api/auth/me",
                         headers={"Authorization": "Bearer not.a.token"})
        assert r.status_code == 401

    def test_bcrypt_hash_format(self):
        import asyncio
        import sys
        sys.path.insert(0, "/app/backend")
        from motor.motor_asyncio import AsyncIOMotorClient
        from dotenv import dotenv_values as dv
        env = dv("/app/backend/.env")

        async def go():
            c = AsyncIOMotorClient(env["MONGO_URL"])
            u = await c[env["DB_NAME"]].users.find_one({"email": ADMIN_EMAIL})
            c.close()
            return u
        u = asyncio.get_event_loop().run_until_complete(go()) if False else asyncio.run(go())
        assert u is not None, "admin not seeded"
        assert u["password_hash"].startswith("$2b$"), u["password_hash"][:10]

    def test_logout_and_refresh(self, api):
        s = requests.Session()
        r = login(s, ADMIN_EMAIL, ADMIN_PASSWORD)
        assert r.status_code == 200
        rf = s.post(f"{BASE_URL}/api/auth/refresh")
        assert rf.status_code == 200, rf.text
        assert "access_token" in rf.json()
        lo = s.post(f"{BASE_URL}/api/auth/logout")
        assert lo.status_code == 200
        s.cookies.clear()
        assert s.post(f"{BASE_URL}/api/auth/refresh").status_code == 401

    def test_brute_force_lockout(self, api):
        email = f"TEST_lock_{uuid.uuid4().hex[:8]}@plotto.app"
        r = register(requests.Session(), "TEST Lock", email, "writer123")
        assert r.status_code == 200
        # Use direct localhost so the client IP is stable (public ingress rotates source IPs)
        local = "http://localhost:8001"
        codes = []
        for _ in range(7):
            cid, ans = solve_captcha_at(local)
            codes.append(requests.post(f"{local}/api/auth/login", json={
                "email": email, "password": "bad-password",
                "captcha_id": cid, "captcha_answer": ans}).status_code)
        assert 500 not in codes, (
            f"BUG: lockout path raises 500 (naive vs aware datetime compare): {codes}")
        assert 429 in codes, f"no lockout observed: {codes}"


# ---------- module: library (bookmarks) ----------
class TestBookmarks:
    def test_requires_auth(self, api):
        assert requests.get(f"{BASE_URL}/api/library/bookmarks").status_code == 401
        assert requests.post(f"{BASE_URL}/api/library/bookmarks",
                             json={"conflict_id": "1a"}).status_code == 401

    def test_add_list_delete(self, user_a):
        h = hdr(user_a)
        r = requests.post(f"{BASE_URL}/api/library/bookmarks", json={"conflict_id": "1a"}, headers=h)
        assert r.status_code == 200, r.text
        assert r.json()["conflict_id"] == "1a"
        lst = requests.get(f"{BASE_URL}/api/library/bookmarks", headers=h)
        assert lst.status_code == 200
        items = lst.json()
        assert any(b["conflict_id"] == "1a" for b in items)
        b = next(b for b in items if b["conflict_id"] == "1a")
        assert b.get("summary"), "bookmark not enriched with summary"
        assert b.get("category")
        assert "_id" not in b
        # idempotent
        r2 = requests.post(f"{BASE_URL}/api/library/bookmarks", json={"conflict_id": "1a"}, headers=h)
        assert r2.status_code == 200
        assert len([x for x in requests.get(f"{BASE_URL}/api/library/bookmarks", headers=h).json()
                    if x["conflict_id"] == "1a"]) == 1
        d = requests.delete(f"{BASE_URL}/api/library/bookmarks/1a", headers=h)
        assert d.status_code == 200
        assert not any(x["conflict_id"] == "1a" for x in
                       requests.get(f"{BASE_URL}/api/library/bookmarks", headers=h).json())

    def test_invalid_conflict_404(self, user_a):
        r = requests.post(f"{BASE_URL}/api/library/bookmarks",
                          json={"conflict_id": "nope"}, headers=hdr(user_a))
        assert r.status_code == 404

    def test_bookmarks_are_user_scoped(self, user_a, user_b):
        requests.post(f"{BASE_URL}/api/library/bookmarks", json={"conflict_id": "2a"}, headers=hdr(user_a))
        b_list = requests.get(f"{BASE_URL}/api/library/bookmarks", headers=hdr(user_b)).json()
        assert not any(x["conflict_id"] == "2a" for x in b_list)
        requests.delete(f"{BASE_URL}/api/library/bookmarks/2a", headers=hdr(user_a))


# ---------- module: library (plots) ----------
class TestPlots:
    def test_requires_auth(self):
        assert requests.get(f"{BASE_URL}/api/library/plots").status_code == 401

    def test_plot_crud_and_persistence(self, user_a):
        h = hdr(user_a)
        payload = {
            "title": "TEST_Plot One",
            "a_clause": {"number": 1, "description": "A, a person of..."},
            "b_clause": {"number": 5, "description": "Becoming involved..."},
            "c_clause": {"number": 3, "description": "Emerges from the tangle..."},
            "conflicts": [{"id": "1a", "summary": "s1", "note": "n1"},
                          {"id": "2a", "summary": "s2", "note": ""}],
            "notes": "initial notes",
        }
        c = requests.post(f"{BASE_URL}/api/library/plots", json=payload, headers=h)
        assert c.status_code == 200, c.text
        created = c.json()
        assert "id" in created and "_id" not in created
        assert created["title"] == payload["title"]
        assert len(created["conflicts"]) == 2
        pid = created["id"]

        g = requests.get(f"{BASE_URL}/api/library/plots/{pid}", headers=h)
        assert g.status_code == 200
        got = g.json()
        assert got["title"] == payload["title"]
        assert got["a_clause"]["number"] == 1
        assert got["conflicts"][0]["id"] == "1a"

        lst = requests.get(f"{BASE_URL}/api/library/plots", headers=h).json()
        assert any(p["id"] == pid for p in lst)
        assert all("_id" not in p for p in lst)

        upd = dict(payload, title="TEST_Plot Updated", notes="changed")
        u = requests.put(f"{BASE_URL}/api/library/plots/{pid}", json=upd, headers=h)
        assert u.status_code == 200, u.text
        assert u.json()["title"] == "TEST_Plot Updated"
        g2 = requests.get(f"{BASE_URL}/api/library/plots/{pid}", headers=h).json()
        assert g2["title"] == "TEST_Plot Updated"
        assert g2["notes"] == "changed"

        d = requests.delete(f"{BASE_URL}/api/library/plots/{pid}", headers=h)
        assert d.status_code == 200
        assert requests.get(f"{BASE_URL}/api/library/plots/{pid}", headers=h).status_code == 404
        assert requests.delete(f"{BASE_URL}/api/library/plots/{pid}", headers=h).status_code == 404

    def test_validation_empty_title(self, user_a):
        r = requests.post(f"{BASE_URL}/api/library/plots", json={"title": ""}, headers=hdr(user_a))
        assert r.status_code == 422

    def test_user_cannot_access_other_users_plot(self, user_a, user_b):
        h = hdr(user_a)
        c = requests.post(f"{BASE_URL}/api/library/plots",
                          json={"title": "TEST_Private Plot"}, headers=h)
        assert c.status_code == 200
        pid = c.json()["id"]
        hb = hdr(user_b)
        assert requests.get(f"{BASE_URL}/api/library/plots/{pid}", headers=hb).status_code == 404
        assert requests.put(f"{BASE_URL}/api/library/plots/{pid}",
                            json={"title": "hacked"}, headers=hb).status_code == 404
        assert requests.delete(f"{BASE_URL}/api/library/plots/{pid}", headers=hb).status_code == 404
        assert not any(p["id"] == pid for p in
                       requests.get(f"{BASE_URL}/api/library/plots", headers=hb).json())
        requests.delete(f"{BASE_URL}/api/library/plots/{pid}", headers=h)
