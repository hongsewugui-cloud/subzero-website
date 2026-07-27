import argparse
import json
import os
import threading
import uuid
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
CONTENT_FILE = DATA_DIR / "content.json"
SUBMISSIONS_FILE = DATA_DIR / "submissions.json"
DATA_LOCK = threading.Lock()
ADMIN_KEY = os.getenv("SUBZERO_ADMIN_KEY", "subzero-local-admin")


DEFAULT_CONTENT = {
    "releases": [
        {
            "title": "地下频段 / 发布筹备",
            "summary": "整理首批公开页面内容，包含音乐、视觉和项目文案。",
            "meta": ["音乐", "视觉", "进行中"],
        },
        {
            "title": "冰层之下 / 项目推进",
            "summary": "以音乐、插画、海报设计和概念设定同步构建虚拟世界。",
            "meta": ["项目", "世界观", "持续更新"],
        },
    ],
    "members": [
        {
            "id": "contact-window",
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


def ensure_files() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not CONTENT_FILE.exists():
        CONTENT_FILE.write_text(json.dumps(DEFAULT_CONTENT, ensure_ascii=False, indent=2), encoding="utf-8")
    if not SUBMISSIONS_FILE.exists():
        SUBMISSIONS_FILE.write_text("[]", encoding="utf-8")


def load_json(path: Path):
    with path.open("r", encoding="utf-8-sig") as handle:
        return json.load(handle)


def save_json(path: Path, data) -> None:
    with path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


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
        if parsed.path == "/api/content":
            self._send_json(load_json(CONTENT_FILE))
            return
        if parsed.path == "/api/admin/submissions":
            if not self._is_admin(parsed):
                self._send_json({"error": "forbidden"}, HTTPStatus.FORBIDDEN)
                return
            submissions = load_json(SUBMISSIONS_FILE)
            submissions.sort(key=lambda item: item.get("created_at", ""), reverse=True)
            content = load_json(CONTENT_FILE)
            published_members = [item for item in content.get("members", []) if item.get("id") != "contact-window"]
            self._send_json({"submissions": submissions, "published_members": published_members})
            return
        if parsed.path == "/":
            self.path = "/index.html"
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/applications":
            self._handle_application()
            return
        if parsed.path == "/api/admin/review":
            if not self._is_admin(parsed):
                self._send_json({"error": "forbidden"}, HTTPStatus.FORBIDDEN)
                return
            self._handle_review()
            return
        if parsed.path == "/api/admin/remove-member":
            if not self._is_admin(parsed):
                self._send_json({"error": "forbidden"}, HTTPStatus.FORBIDDEN)
                return
            self._handle_remove_member()
            return
        self._send_json({"error": "not found"}, HTTPStatus.NOT_FOUND)

    def _handle_application(self):
        payload = self._read_json()
        name = str(payload.get("name", "")).strip()
        focus = str(payload.get("focus", "")).strip()
        contact = str(payload.get("contact", "")).strip()
        bio = str(payload.get("bio", "")).strip()
        if not all([name, focus, contact, bio]):
            self._send_json({"error": "missing fields"}, HTTPStatus.BAD_REQUEST)
            return
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
        self._send_json({"ok": True, "id": entry["id"]}, HTTPStatus.CREATED)

    def _handle_review(self):
        payload = self._read_json()
        target_id = str(payload.get("id", "")).strip()
        decision = str(payload.get("decision", "")).strip()
        publish = bool(payload.get("publish", False))
        if decision not in {"approved", "rejected"} or not target_id:
            self._send_json({"error": "invalid payload"}, HTTPStatus.BAD_REQUEST)
            return
        with DATA_LOCK:
            submissions = load_json(SUBMISSIONS_FILE)
            content = load_json(CONTENT_FILE)
            target = next((item for item in submissions if item["id"] == target_id), None)
            if not target:
                self._send_json({"error": "submission not found"}, HTTPStatus.NOT_FOUND)
                return
            target["status"] = decision
            target["reviewed_at"] = utc_now()
            if decision == "approved" and publish and not target.get("published_member_id"):
                member_id = f"member-{target['id']}"
                content.setdefault("members", []).append(
                    {
                        "id": member_id,
                        "name": target["name"],
                        "role": target["focus"],
                        "bio": target["bio"],
                        "contact": target["contact"],
                    }
                )
                target["published_member_id"] = member_id
                save_json(CONTENT_FILE, content)
            save_json(SUBMISSIONS_FILE, submissions)
        self._send_json({"ok": True})

    def _handle_remove_member(self):
        payload = self._read_json()
        member_id = str(payload.get("id", "")).strip()
        if not member_id or member_id == "contact-window":
            self._send_json({"error": "invalid member id"}, HTTPStatus.BAD_REQUEST)
            return
        with DATA_LOCK:
            submissions = load_json(SUBMISSIONS_FILE)
            content = load_json(CONTENT_FILE)
            content["members"] = [item for item in content.get("members", []) if item.get("id") != member_id]
            for submission in submissions:
                if submission.get("published_member_id") == member_id:
                    submission["published_member_id"] = None
                    if submission.get("status") == "approved":
                        submission["status"] = "removed"
            save_json(CONTENT_FILE, content)
            save_json(SUBMISSIONS_FILE, submissions)
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
    ensure_files()
    parser = argparse.ArgumentParser(description="Run the SUBZERO local site and admin API.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.host, args.port), SubzeroHandler)
    print(f"SUBZERO server running at http://{args.host}:{args.port}")
    print("Admin key:", ADMIN_KEY)
    server.serve_forever()


if __name__ == "__main__":
    main()
