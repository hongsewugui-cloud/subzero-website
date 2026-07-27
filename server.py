import argparse
import copy
import hashlib
import json
import os
import threading
import uuid
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError:
    psycopg = None
    dict_row = None


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
CONTENT_FILE = DATA_DIR / "content.json"
SUBMISSIONS_FILE = DATA_DIR / "submissions.json"
PUBLISHED_MEMBERS_FILE = DATA_DIR / "published_members.json"
RELEASES_FILE = DATA_DIR / "releases.json"
DATA_LOCK = threading.Lock()
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
ADMIN_KEY = os.getenv("SUBZERO_ADMIN_KEY", "subzero-local-admin")
UPLOAD_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "").strip()
UPLOAD_API_KEY = os.getenv("CLOUDINARY_API_KEY", "").strip()
UPLOAD_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "").strip()
CONTACT_MEMBER_ID = "contact-window"


DEFAULT_CONTENT = {
    "releases": [
        {
            "title": "地下频段 / 发布筹备",
            "summary": "整理首批公开页面内容，包含音乐、视觉和项目文案。",
            "meta": ["音乐", "视觉", "进行中"],
            "section": "music",
        },
        {
            "title": "冰层之下 / 项目推进",
            "summary": "以音乐、插画、海报设计和概念设定同步构建虚拟世界。",
            "meta": ["项目", "世界观", "持续更新"],
            "section": "visual",
        },
    ],
    "members": [
        {
            "id": CONTACT_MEMBER_ID,
            "name": "SUBZERO 主理窗口",
            "role": "联络 / 审核 / 发布",
            "bio": "负责查看申请、沟通合作并决定哪些成员信息公开到网站。",
            "contact": "微信 CH_576",
        }
    ],
    "events": [
        {
            "title": "线下碰头 / 预备中",
            "summary": "优先从交流学习、小范围讨论和共创练习开始。",
            "meta": ["社群", "线下", "筹备中"],
        }
    ],
    "archives": [
        {
            "title": "资料归档 / 新人友好",
            "summary": "把视觉板、学习笔记、制作记录和参考链接集中整理。",
            "meta": ["学习", "归档", "持续更新"],
        }
    ],
}


def load_json(path: Path):
    with path.open("r", encoding="utf-8-sig") as handle:
        return json.load(handle)


def save_json(path: Path, data) -> None:
    with path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def clone_default_content():
    return copy.deepcopy(DEFAULT_CONTENT)


def build_public_content(published_members, uploaded_releases):
    content = clone_default_content()
    approved_releases = [item for item in uploaded_releases if item.get("status", "approved") == "approved"]
    content["releases"] = approved_releases + content["releases"]
    content["members"] = content["members"] + list(published_members)
    return content


def infer_release_section(category: str) -> str:
    music_tokens = ("音乐", "单曲", "demo", "beat", "制作", "mixtape", "说唱", "dj")
    lowered = category.lower()
    return "music" if any(token in lowered for token in music_tokens) else "visual"


def is_upload_ready() -> bool:
    return all([UPLOAD_CLOUD_NAME, UPLOAD_API_KEY, UPLOAD_API_SECRET])


def make_upload_signature(params: dict[str, str]) -> str:
    payload = "&".join(f"{key}={params[key]}" for key in sorted(params))
    return hashlib.sha1(f"{payload}{UPLOAD_API_SECRET}".encode("utf-8")).hexdigest()


def build_upload_signature(filename: str, asset_kind: str) -> dict[str, str]:
    now = int(datetime.now(timezone.utc).timestamp())
    safe_name = Path(filename or "asset").stem[:48] or "asset"
    public_id = f"{safe_name}-{uuid.uuid4().hex[:8]}"
    folder = f"subzero/{'audio' if asset_kind == 'audio' else 'images'}"
    params = {
        "folder": folder,
        "public_id": public_id,
        "timestamp": str(now),
    }
    return {
        "cloud_name": UPLOAD_CLOUD_NAME,
        "api_key": UPLOAD_API_KEY,
        "folder": folder,
        "public_id": public_id,
        "timestamp": str(now),
        "signature": make_upload_signature(params),
    }


class JsonStorage:
    def ensure(self) -> None:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        if not CONTENT_FILE.exists():
            save_json(CONTENT_FILE, clone_default_content())
        if not SUBMISSIONS_FILE.exists():
            save_json(SUBMISSIONS_FILE, [])

        content = load_json(CONTENT_FILE)
        contact_member = next(
            (item for item in content.get("members", []) if item.get("id") == CONTACT_MEMBER_ID),
            DEFAULT_CONTENT["members"][0],
        )
        static_published_members = [item for item in content.get("members", []) if item.get("id") != CONTACT_MEMBER_ID]

        if not PUBLISHED_MEMBERS_FILE.exists():
            save_json(PUBLISHED_MEMBERS_FILE, static_published_members)
        if not RELEASES_FILE.exists():
            save_json(RELEASES_FILE, [])

        if static_published_members or content.get("members", []) != [contact_member]:
            content["members"] = [contact_member]
            save_json(CONTENT_FILE, content)

    def public_content(self):
        published_members = load_json(PUBLISHED_MEMBERS_FILE)
        uploaded_releases = load_json(RELEASES_FILE)
        return build_public_content(published_members, uploaded_releases)

    def list_releases(self):
        releases = load_json(RELEASES_FILE)
        releases.sort(key=lambda item: item.get("created_at", ""), reverse=True)
        return releases

    def list_submissions(self):
        submissions = load_json(SUBMISSIONS_FILE)
        submissions.sort(key=lambda item: item.get("created_at", ""), reverse=True)
        return submissions

    def list_published_members(self):
        return load_json(PUBLISHED_MEMBERS_FILE)

    def create_submission(self, name, focus, contact, bio):
        entry = {
            "id": uuid.uuid4().hex[:10],
            "name": name,
            "focus": focus,
            "contact": contact,
            "bio": bio,
            "status": "pending",
            "created_at": utc_now(),
            "published_member_id": None,
            "reviewed_at": None,
        }
        with DATA_LOCK:
            submissions = load_json(SUBMISSIONS_FILE)
            submissions.append(entry)
            save_json(SUBMISSIONS_FILE, submissions)
        return entry

    def create_release(self, title, creator, category, summary, contact, cover_url="", media_url="", media_kind="", media_name=""):
        entry = {
            "id": uuid.uuid4().hex[:10],
            "title": title,
            "summary": summary,
            "meta": [creator, category, "成员投稿"],
            "section": infer_release_section(category),
            "contact": contact,
            "cover_url": cover_url,
            "media_url": media_url,
            "media_kind": media_kind,
            "media_name": media_name,
            "created_at": utc_now(),
            "status": "pending",
            "reviewed_at": None,
            "published_at": None,
        }
        with DATA_LOCK:
            releases = load_json(RELEASES_FILE)
            releases.insert(0, entry)
            save_json(RELEASES_FILE, releases)
        return entry

    def review_release(self, target_id, decision):
        with DATA_LOCK:
            releases = load_json(RELEASES_FILE)
            target = next((item for item in releases if item["id"] == target_id), None)
            if not target:
                return None
            reviewed_at = utc_now()
            target["status"] = decision
            target["reviewed_at"] = reviewed_at
            target["published_at"] = reviewed_at if decision == "approved" else None
            save_json(RELEASES_FILE, releases)
        return target

    def review_submission(self, target_id, decision, publish):
        with DATA_LOCK:
            submissions = load_json(SUBMISSIONS_FILE)
            published_members = load_json(PUBLISHED_MEMBERS_FILE)
            target = next((item for item in submissions if item["id"] == target_id), None)
            if not target:
                return None

            target["status"] = decision
            target["reviewed_at"] = utc_now()

            if decision == "approved" and publish and not target.get("published_member_id"):
                member_id = f"member-{target['id']}"
                published_members.append(
                    {
                        "id": member_id,
                        "submission_id": target["id"],
                        "name": target["name"],
                        "role": target["focus"],
                        "bio": target["bio"],
                        "contact": target["contact"],
                    }
                )
                target["published_member_id"] = member_id
                save_json(PUBLISHED_MEMBERS_FILE, published_members)

            save_json(SUBMISSIONS_FILE, submissions)
        return target

    def remove_member(self, member_id):
        with DATA_LOCK:
            submissions = load_json(SUBMISSIONS_FILE)
            published_members = load_json(PUBLISHED_MEMBERS_FILE)
            target = next((item for item in published_members if item.get("id") == member_id), None)
            if not target:
                return False

            published_members = [item for item in published_members if item.get("id") != member_id]
            for submission in submissions:
                if submission.get("published_member_id") == member_id:
                    submission["published_member_id"] = None
                    if submission.get("status") == "approved":
                        submission["status"] = "removed"

            save_json(PUBLISHED_MEMBERS_FILE, published_members)
            save_json(SUBMISSIONS_FILE, submissions)
        return True


class PostgresStorage:
    def __init__(self, dsn: str):
        if not psycopg:
            raise RuntimeError("psycopg is required when DATABASE_URL is configured.")
        self.dsn = dsn

    def _connect(self):
        return psycopg.connect(self.dsn)

    def ensure(self) -> None:
        with self._connect() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    create table if not exists submissions (
                        id text primary key,
                        name text not null,
                        focus text not null,
                        contact text not null,
                        bio text not null,
                        status text not null,
                        created_at text not null,
                        published_member_id text,
                        reviewed_at text
                    )
                    """
                )
                cursor.execute(
                    """
                    create table if not exists published_members (
                        id text primary key,
                        submission_id text unique,
                        name text not null,
                        role text not null,
                        bio text not null,
                        contact text not null,
                        created_at text not null
                    )
                    """
                )
                cursor.execute(
                    """
                    create table if not exists releases (
                        id text primary key,
                        title text not null,
                        summary text not null,
                        meta text not null,
                        section text not null default 'visual',
                        contact text not null,
                        cover_url text,
                        media_url text,
                        media_kind text,
                        media_name text,
                        created_at text not null,
                        status text not null default 'pending',
                        reviewed_at text,
                        published_at text
                    )
                    """
                )
                cursor.execute("alter table releases add column if not exists section text not null default 'visual'")
                cursor.execute("alter table releases add column if not exists status text not null default 'pending'")
                cursor.execute("alter table releases add column if not exists reviewed_at text")
                cursor.execute("alter table releases add column if not exists published_at text")
                cursor.execute("alter table releases add column if not exists cover_url text")
                cursor.execute("alter table releases add column if not exists media_url text")
                cursor.execute("alter table releases add column if not exists media_kind text")
                cursor.execute("alter table releases add column if not exists media_name text")
            conn.commit()

    def public_content(self):
        return build_public_content(self.list_published_members(), self.list_releases())

    def list_releases(self):
        with self._connect() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    "select id, title, summary, meta, section, contact, cover_url, media_url, media_kind, media_name, created_at, status, reviewed_at, published_at "
                    "from releases order by created_at desc"
                )
                rows = [dict(row) for row in cursor.fetchall()]
        for row in rows:
            try:
                row["meta"] = json.loads(row.get("meta", "[]"))
            except json.JSONDecodeError:
                row["meta"] = []
            row["section"] = row.get("section") or infer_release_section(" ".join(row["meta"]))
            row["status"] = row.get("status") or "approved"
        return rows

    def list_submissions(self):
        with self._connect() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute("select * from submissions order by created_at desc")
                return [dict(row) for row in cursor.fetchall()]

    def list_published_members(self):
        with self._connect() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute("select id, submission_id, name, role, bio, contact from published_members order by created_at desc")
                return [dict(row) for row in cursor.fetchall()]

    def create_submission(self, name, focus, contact, bio):
        entry = {
            "id": uuid.uuid4().hex[:10],
            "name": name,
            "focus": focus,
            "contact": contact,
            "bio": bio,
            "status": "pending",
            "created_at": utc_now(),
            "published_member_id": None,
            "reviewed_at": None,
        }
        with self._connect() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    insert into submissions (id, name, focus, contact, bio, status, created_at, published_member_id, reviewed_at)
                    values (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        entry["id"],
                        entry["name"],
                        entry["focus"],
                        entry["contact"],
                        entry["bio"],
                        entry["status"],
                        entry["created_at"],
                        entry["published_member_id"],
                        entry["reviewed_at"],
                    ),
                )
            conn.commit()
        return entry

    def create_release(self, title, creator, category, summary, contact, cover_url="", media_url="", media_kind="", media_name=""):
        entry = {
            "id": uuid.uuid4().hex[:10],
            "title": title,
            "summary": summary,
            "meta": [creator, category, "成员投稿"],
            "section": infer_release_section(category),
            "contact": contact,
            "cover_url": cover_url,
            "media_url": media_url,
            "media_kind": media_kind,
            "media_name": media_name,
            "created_at": utc_now(),
            "status": "pending",
            "reviewed_at": None,
            "published_at": None,
        }
        with self._connect() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    insert into releases (id, title, summary, meta, section, contact, cover_url, media_url, media_kind, media_name, created_at, status, reviewed_at, published_at)
                    values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        entry["id"],
                        entry["title"],
                        entry["summary"],
                        json.dumps(entry["meta"], ensure_ascii=False),
                        entry["section"],
                        entry["contact"],
                        entry["cover_url"],
                        entry["media_url"],
                        entry["media_kind"],
                        entry["media_name"],
                        entry["created_at"],
                        entry["status"],
                        entry["reviewed_at"],
                        entry["published_at"],
                    ),
                )
            conn.commit()
        return entry

    def review_release(self, target_id, decision):
        with self._connect() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute("select * from releases where id = %s for update", (target_id,))
                target = cursor.fetchone()
                if not target:
                    conn.rollback()
                    return None
                reviewed_at = utc_now()
                published_at = reviewed_at if decision == "approved" else None
                cursor.execute(
                    """
                    update releases
                    set status = %s, reviewed_at = %s, published_at = %s
                    where id = %s
                    """,
                    (decision, reviewed_at, published_at, target_id),
                )
            conn.commit()
        updated = dict(target)
        updated["status"] = decision
        updated["reviewed_at"] = reviewed_at
        updated["published_at"] = published_at
        try:
            updated["meta"] = json.loads(updated.get("meta", "[]"))
        except json.JSONDecodeError:
            updated["meta"] = []
        return updated

    def review_submission(self, target_id, decision, publish):
        with self._connect() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute("select * from submissions where id = %s for update", (target_id,))
                target = cursor.fetchone()
                if not target:
                    conn.rollback()
                    return None

                reviewed_at = utc_now()
                published_member_id = target.get("published_member_id")

                if decision == "approved" and publish and not published_member_id:
                    published_member_id = f"member-{target_id}"
                    cursor.execute(
                        """
                        insert into published_members (id, submission_id, name, role, bio, contact, created_at)
                        values (%s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            published_member_id,
                            target_id,
                            target["name"],
                            target["focus"],
                            target["bio"],
                            target["contact"],
                            reviewed_at,
                        ),
                    )

                cursor.execute(
                    """
                    update submissions
                    set status = %s, reviewed_at = %s, published_member_id = %s
                    where id = %s
                    """,
                    (decision, reviewed_at, published_member_id, target_id),
                )
            conn.commit()

        updated = dict(target)
        updated["status"] = decision
        updated["reviewed_at"] = reviewed_at
        updated["published_member_id"] = published_member_id
        return updated

    def remove_member(self, member_id):
        with self._connect() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute("select submission_id from published_members where id = %s for update", (member_id,))
                target = cursor.fetchone()
                if not target:
                    conn.rollback()
                    return False

                cursor.execute("delete from published_members where id = %s", (member_id,))
                cursor.execute(
                    """
                    update submissions
                    set published_member_id = null,
                        status = case when status = 'approved' then 'removed' else status end
                    where id = %s
                    """,
                    (target["submission_id"],),
                )
            conn.commit()
        return True


STORAGE = PostgresStorage(DATABASE_URL) if DATABASE_URL else JsonStorage()


class SubzeroHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Admin-Key")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self._send_json({"ok": True, "time": utc_now()})
            return
        if parsed.path == "/api/content":
            self._send_json(STORAGE.public_content())
            return
        if parsed.path == "/api/admin/submissions":
            if not self._is_admin(parsed):
                self._send_json({"error": "forbidden"}, HTTPStatus.FORBIDDEN)
                return
            self._send_json(
                {
                    "submissions": STORAGE.list_submissions(),
                    "release_submissions": STORAGE.list_releases(),
                    "published_members": STORAGE.list_published_members(),
                }
            )
            return
        if parsed.path == "/":
            self.path = "/index.html"
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/applications":
            self._handle_application()
            return
        if parsed.path == "/api/uploads/sign":
            self._handle_upload_signature()
            return
        if parsed.path == "/api/releases":
            self._handle_release_submit()
            return
        if parsed.path == "/api/admin/review":
            if not self._is_admin(parsed):
                self._send_json({"error": "forbidden"}, HTTPStatus.FORBIDDEN)
                return
            self._handle_review()
            return
        if parsed.path == "/api/admin/review-release":
            if not self._is_admin(parsed):
                self._send_json({"error": "forbidden"}, HTTPStatus.FORBIDDEN)
                return
            self._handle_release_review()
            return
        if parsed.path == "/api/admin/remove-member":
            if not self._is_admin(parsed):
                self._send_json({"error": "forbidden"}, HTTPStatus.FORBIDDEN)
                return
            self._handle_remove_member()
            return
        self._send_json({"error": "not found"}, HTTPStatus.NOT_FOUND)

    def _handle_upload_signature(self):
        if not is_upload_ready():
            self._send_json({"error": "upload service not configured"}, HTTPStatus.SERVICE_UNAVAILABLE)
            return
        payload = self._read_json()
        filename = str(payload.get("filename", "")).strip()
        asset_kind = str(payload.get("asset_kind", "image")).strip().lower()
        if asset_kind not in {"image", "audio"}:
            asset_kind = "image"
        if not filename:
            self._send_json({"error": "missing filename"}, HTTPStatus.BAD_REQUEST)
            return
        self._send_json({"ok": True, **build_upload_signature(filename, asset_kind)})

    def _handle_application(self):
        payload = self._read_json()
        name = str(payload.get("name", "")).strip()
        focus = str(payload.get("focus", "")).strip()
        contact = str(payload.get("contact", "")).strip()
        bio = str(payload.get("bio", "")).strip()
        if not all([name, focus, contact, bio]):
            self._send_json({"error": "missing fields"}, HTTPStatus.BAD_REQUEST)
            return
        entry = STORAGE.create_submission(name, focus, contact, bio)
        self._send_json({"ok": True, "id": entry["id"]}, HTTPStatus.CREATED)

    def _handle_release_submit(self):
        payload = self._read_json()
        title = str(payload.get("title", "")).strip()
        creator = str(payload.get("creator", "")).strip()
        category = str(payload.get("category", "")).strip()
        summary = str(payload.get("summary", "")).strip()
        contact = str(payload.get("contact", "")).strip()
        cover_url = str(payload.get("cover_url", "")).strip()
        media_url = str(payload.get("media_url", "")).strip()
        media_kind = str(payload.get("media_kind", "")).strip()
        media_name = str(payload.get("media_name", "")).strip()
        if not all([title, creator, category, summary, contact]):
            self._send_json({"error": "missing fields"}, HTTPStatus.BAD_REQUEST)
            return
        if not cover_url and not media_url:
            self._send_json({"error": "missing uploaded media"}, HTTPStatus.BAD_REQUEST)
            return
        entry = STORAGE.create_release(title, creator, category, summary, contact, cover_url, media_url, media_kind, media_name)
        self._send_json({"ok": True, "id": entry["id"]}, HTTPStatus.CREATED)

    def _handle_release_review(self):
        payload = self._read_json()
        target_id = str(payload.get("id", "")).strip()
        decision = str(payload.get("decision", "")).strip()
        if decision not in {"approved", "rejected"} or not target_id:
            self._send_json({"error": "invalid payload"}, HTTPStatus.BAD_REQUEST)
            return
        target = STORAGE.review_release(target_id, decision)
        if not target:
            self._send_json({"error": "release not found"}, HTTPStatus.NOT_FOUND)
            return
        self._send_json({"ok": True})

    def _handle_review(self):
        payload = self._read_json()
        target_id = str(payload.get("id", "")).strip()
        decision = str(payload.get("decision", "")).strip()
        publish = bool(payload.get("publish", False))
        if decision not in {"approved", "rejected"} or not target_id:
            self._send_json({"error": "invalid payload"}, HTTPStatus.BAD_REQUEST)
            return
        target = STORAGE.review_submission(target_id, decision, publish)
        if not target:
            self._send_json({"error": "submission not found"}, HTTPStatus.NOT_FOUND)
            return
        self._send_json({"ok": True})

    def _handle_remove_member(self):
        payload = self._read_json()
        member_id = str(payload.get("id", "")).strip()
        if not member_id or member_id == CONTACT_MEMBER_ID:
            self._send_json({"error": "invalid member id"}, HTTPStatus.BAD_REQUEST)
            return
        if not STORAGE.remove_member(member_id):
            self._send_json({"error": "member not found"}, HTTPStatus.NOT_FOUND)
            return
        self._send_json({"ok": True})

    def _is_admin(self, parsed) -> bool:
        query = parse_qs(parsed.query)
        header_key = self.headers.get("X-Admin-Key", "")
        query_key = query.get("key", [""])[0]
        return header_key == ADMIN_KEY or query_key == ADMIN_KEY

    def _read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            return json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            return {}

    def _send_json(self, payload, status=HTTPStatus.OK):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    STORAGE.ensure()
    parser = argparse.ArgumentParser(description="Run the SUBZERO site and admin API.")
    parser.add_argument("--host", default=os.getenv("SUBZERO_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.getenv("PORT", "8765")))
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.host, args.port), SubzeroHandler)
    print(f"SUBZERO server running at http://{args.host}:{args.port}")
    print("Admin key:", ADMIN_KEY)
    if DATABASE_URL:
        print("Storage: postgres")
    else:
        print("Storage: json")
    server.serve_forever()


if __name__ == "__main__":
    main()
