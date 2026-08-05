from __future__ import annotations

import argparse
import json
import re
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from generate_cms_workflows import generate_workflows

ROOT = Path(__file__).resolve().parents[1]
CMS_FILE = ROOT / "cms" / "content.json"
OUTPUT_FILE = ROOT / "data" / "content.js"
INDEX_FILE = ROOT / "cms" / "INDEX.md"

CATEGORIES = {"INFO", "MUSIC", "GOODS", "EVENT", "LIVE"}
GOODS_STATUSES = {"COMING SOON", "ON SALE", "SOLD OUT", "販売終了"}
MEMBERS = {"ALROD", "CHROM", "VI-LAIN"}


def load() -> dict:
    return json.loads(CMS_FILE.read_text(encoding="utf-8"))


def save(data: dict) -> None:
    CMS_FILE.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def uid(prefix: str) -> str:
    now = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return f"{prefix}-{now}-{uuid.uuid4().hex[:6]}"


def bool_value(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "yes", "on", "公開"}


def normalize_date(value: str) -> str:
    value = value.strip()
    if not value:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).date().isoformat()
    except ValueError:
        raise SystemExit("日付は YYYY-MM-DD 形式で入力してください。")


def youtube_id(url: str) -> str:
    parsed = urlparse(url.strip())
    host = parsed.netloc.lower().replace("www.", "")
    if host == "youtu.be":
        result = parsed.path.strip("/").split("/")[0]
    elif "youtube.com" in host:
        if parsed.path == "/watch":
            result = parse_qs(parsed.query).get("v", [""])[0]
        elif parsed.path.startswith("/shorts/") or parsed.path.startswith("/live/") or parsed.path.startswith("/embed/"):
            result = parsed.path.strip("/").split("/")[1]
        else:
            result = ""
    else:
        result = ""
    if not re.fullmatch(r"[A-Za-z0-9_-]{6,20}", result):
        raise SystemExit("正しいYouTube動画URLを入力してください。")
    return result


def is_visible(item: dict, now: datetime) -> bool:
    if not item.get("published", True):
        return False
    scheduled = str(item.get("publishAt") or "").strip()
    if not scheduled:
        return True
    try:
        publish_time = datetime.fromisoformat(scheduled.replace("Z", "+00:00"))
        if publish_time.tzinfo is None:
            publish_time = publish_time.replace(tzinfo=timezone.utc)
    except ValueError:
        return False
    return publish_time <= now


def build(data: dict) -> None:
    now = datetime.now(timezone.utc)

    news = [x for x in data.get("news", []) if is_visible(x, now)]
    music = [x for x in data.get("music", []) if is_visible(x, now)]
    goods = [x for x in data.get("goods", []) if is_visible(x, now)]
    events = [x for x in data.get("events", []) if is_visible(x, now)]

    news.sort(key=lambda x: (x.get("date", ""), x.get("id", "")), reverse=True)
    music.sort(key=lambda x: (x.get("date", ""), x.get("id", "")), reverse=True)
    goods.sort(key=lambda x: (x.get("sort", 0), x.get("id", "")), reverse=True)
    events.sort(key=lambda x: (x.get("date", ""), x.get("id", "")), reverse=True)

    public = {
        "news": [
            {
                "id": x["id"],
                "date": str(x.get("date", "")).replace("-", "."),
                "category": x.get("category", "INFO"),
                "title": x.get("title", ""),
                "url": x.get("url", ""),
            }
            for x in news
        ],
        "music": [
            {
                "id": x["id"],
                "title": x.get("title", ""),
                "artist": x.get("artist", "VI-LAIN"),
                "youtubeId": x.get("youtubeId", ""),
                "url": x.get("url", ""),
                "date": x.get("date", ""),
            }
            for x in music
        ],
        "goods": [
            {
                "id": x["id"],
                "title": x.get("title", ""),
                "status": x.get("status", "ON SALE"),
                "image": x.get("image", ""),
                "description": x.get("description", ""),
                "url": x.get("url", ""),
                "price": x.get("price", ""),
            }
            for x in goods
        ],
        "events": [
            {
                "id": x["id"],
                "title": x.get("title", ""),
                "date": x.get("date", ""),
                "description": x.get("description", ""),
                "url": x.get("url", ""),
                "image": x.get("image", ""),
            }
            for x in events
        ],
    }

    OUTPUT_FILE.write_text(
        "const SITE_DATA=" + json.dumps(public, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )


def add_news(args: argparse.Namespace, data: dict) -> None:
    category = args.category.upper()
    if category not in CATEGORIES:
        raise SystemExit(f"categoryは {', '.join(sorted(CATEGORIES))} から選択してください。")
    data["news"].append({
        "id": uid("news"),
        "date": normalize_date(args.date),
        "category": category,
        "title": args.title.strip(),
        "url": args.url.strip(),
        "published": bool_value(args.published),
        "publishAt": args.publish_at.strip(),
    })


def add_music(args: argparse.Namespace, data: dict) -> None:
    artist = args.artist.upper()
    if artist not in MEMBERS:
        raise SystemExit("artistは ALROD / CHROM / VI-LAIN から選択してください。")
    video_id = youtube_id(args.youtube_url)
    data["music"].append({
        "id": uid("music"),
        "title": args.title.strip(),
        "artist": artist,
        "youtubeId": video_id,
        "url": f"https://www.youtube.com/watch?v={video_id}",
        "date": normalize_date(args.date),
        "published": bool_value(args.published),
        "publishAt": args.publish_at.strip(),
    })


def add_goods(args: argparse.Namespace, data: dict) -> None:
    status = args.status.strip()
    if status not in GOODS_STATUSES:
        raise SystemExit(f"statusは {', '.join(sorted(GOODS_STATUSES))} から選択してください。")
    data["goods"].append({
        "id": uid("goods"),
        "title": args.title.strip(),
        "status": status,
        "image": args.image.strip(),
        "description": args.description.strip(),
        "url": args.url.strip(),
        "price": args.price.strip(),
        "sort": int(args.sort),
        "published": bool_value(args.published),
        "publishAt": args.publish_at.strip(),
    })


def add_event(args: argparse.Namespace, data: dict) -> None:
    event = {
        "id": uid("event"),
        "title": args.title.strip(),
        "date": args.date.strip(),
        "description": args.description.strip(),
        "url": args.url.strip(),
        "image": args.image.strip(),
        "published": bool_value(args.published),
        "publishAt": args.publish_at.strip(),
    }
    data["events"].append(event)
    if bool_value(args.add_to_news):
        data["news"].append({
            "id": uid("news"),
            "date": normalize_date(args.news_date),
            "category": "EVENT",
            "title": args.title.strip(),
            "url": args.url.strip(),
            "published": bool_value(args.published),
            "publishAt": args.publish_at.strip(),
        })


def manage(args: argparse.Namespace, data: dict) -> None:
    collection = args.collection.lower()
    if collection not in {"news", "music", "goods", "events"}:
        raise SystemExit("collectionが不正です。")
    items = data[collection]
    item = next((x for x in items if x.get("id") == args.id), None)
    if not item:
        raise SystemExit(f"IDが見つかりません: {args.id}")

    if args.action == "delete":
        items.remove(item)
        return
    if args.action == "publish":
        item["published"] = True
    elif args.action == "hide":
        item["published"] = False
    elif args.action == "update":
        updates = json.loads(args.updates)
        protected = {"id"}
        for key, value in updates.items():
            if key not in protected:
                item[key] = value


def list_items(data: dict) -> None:
    for collection in ("news", "music", "goods", "events"):
        print(f"\n[{collection.upper()}]")
        for item in data.get(collection, []):
            print(
                item.get("id"),
                "|",
                "公開" if item.get("published", True) else "非表示",
                "|",
                item.get("title", ""),
            )



def write_index(data: dict) -> None:
    lines = [
        "# Vi-Lain CMS 登録一覧",
        "",
        "編集・非表示・削除をするときは、対象項目の `ID` をGitHub Actionsへ入力します。",
        "",
    ]

    for collection, title in (
        ("news", "NEWS"),
        ("music", "MUSIC"),
        ("goods", "GOODS"),
        ("events", "EVENT"),
    ):
        lines.extend([f"## {title}", ""])
        items = data.get(collection, [])

        if not items:
            lines.extend(["登録なし", ""])
            continue

        lines.extend([
            "| ID | 状態 | タイトル |",
            "|---|---|---|",
        ])

        for item in items:
            state = "公開" if item.get("published", True) else "非表示"
            title_value = str(item.get("title", "")).replace("|", "｜")
            lines.append(f"| `{item.get('id', '')}` | {state} | {title_value} |")

        lines.append("")

    INDEX_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")


def edit_item(args: argparse.Namespace, data: dict) -> None:
    collection = args.collection.lower()
    if collection not in {"news", "music", "goods", "events"}:
        raise SystemExit("対象種類が不正です。")

    item = next(
        (x for x in data.get(collection, []) if x.get("id") == args.id),
        None,
    )
    if not item:
        raise SystemExit(f"IDが見つかりません: {args.id}")

    updates = {
        "title": args.title,
        "date": args.date,
        "category": args.category,
        "artist": args.artist,
        "url": args.url,
        "image": args.image,
        "status": args.status,
        "price": args.price,
        "description": args.description,
        "publishAt": args.publish_at,
    }

    for key, value in updates.items():
        if value != "":
            item[key] = value

    if args.published != "keep":
        item["published"] = args.published == "true"

    if collection == "music" and args.url:
        video_id = youtube_id(args.url)
        item["youtubeId"] = video_id
        item["url"] = f"https://www.youtube.com/watch?v={video_id}"


def delete_item(args: argparse.Namespace, data: dict) -> None:
    collection = args.collection.lower()
    if collection not in {"news", "music", "goods", "events"}:
        raise SystemExit("対象種類が不正です。")

    items = data.get(collection, [])
    item = next((x for x in items if x.get("id") == args.id), None)
    if not item:
        raise SystemExit(f"IDが見つかりません: {args.id}")

    items.remove(item)


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="command", required=True)

    news = sub.add_parser("add-news")
    news.add_argument("--title", required=True)
    news.add_argument("--date", default="")
    news.add_argument("--category", default="INFO")
    news.add_argument("--url", default="")
    news.add_argument("--published", default="true")
    news.add_argument("--publish-at", default="")

    music = sub.add_parser("add-music")
    music.add_argument("--title", required=True)
    music.add_argument("--artist", required=True)
    music.add_argument("--youtube-url", required=True)
    music.add_argument("--date", default="")
    music.add_argument("--published", default="true")
    music.add_argument("--publish-at", default="")

    goods = sub.add_parser("add-goods")
    goods.add_argument("--title", required=True)
    goods.add_argument("--status", default="ON SALE")
    goods.add_argument("--image", required=True)
    goods.add_argument("--description", default="")
    goods.add_argument("--url", required=True)
    goods.add_argument("--price", default="")
    goods.add_argument("--sort", default="0")
    goods.add_argument("--published", default="true")
    goods.add_argument("--publish-at", default="")

    event = sub.add_parser("add-event")
    event.add_argument("--title", required=True)
    event.add_argument("--date", required=True)
    event.add_argument("--description", default="")
    event.add_argument("--url", default="")
    event.add_argument("--image", default="")
    event.add_argument("--published", default="true")
    event.add_argument("--publish-at", default="")
    event.add_argument("--add-to-news", default="true")
    event.add_argument("--news-date", default="")

    manage_p = sub.add_parser("manage")
    manage_p.add_argument("--collection", required=True)
    manage_p.add_argument("--id", required=True)
    manage_p.add_argument("--action", required=True, choices=["publish", "hide", "delete", "update"])
    manage_p.add_argument("--updates", default="{}")

    edit = sub.add_parser("edit")
    edit.add_argument("--collection", required=True)
    edit.add_argument("--id", required=True)
    edit.add_argument("--title", default="")
    edit.add_argument("--date", default="")
    edit.add_argument("--category", default="")
    edit.add_argument("--artist", default="")
    edit.add_argument("--url", default="")
    edit.add_argument("--image", default="")
    edit.add_argument("--status", default="")
    edit.add_argument("--price", default="")
    edit.add_argument("--description", default="")
    edit.add_argument("--published", default="keep", choices=["keep", "true", "false"])
    edit.add_argument("--publish-at", default="")

    delete = sub.add_parser("delete")
    delete.add_argument("--collection", required=True)
    delete.add_argument("--id", required=True)

    sub.add_parser("build")
    sub.add_parser("list")
    return p


def main() -> None:
    args = parser().parse_args()
    data = load()

    if args.command == "add-news":
        add_news(args, data)
    elif args.command == "add-music":
        add_music(args, data)
    elif args.command == "add-goods":
        add_goods(args, data)
    elif args.command == "add-event":
        add_event(args, data)
    elif args.command == "manage":
        manage(args, data)
    elif args.command == "edit":
        edit_item(args, data)
    elif args.command == "delete":
        delete_item(args, data)
    elif args.command == "list":
        list_items(data)
        return

    if args.command != "build":
        save(data)
    build(data)
    write_index(data)
    generate_workflows(data)


if __name__ == "__main__":
    main()
