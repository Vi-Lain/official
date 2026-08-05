from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
STATE_FILE = ROOT / "data" / "live-state.json"
PUBLIC_FILE = ROOT / "data" / "live.js"

MEMBERS: dict[str, dict[str, str]] = {
    "ALROD": {
        "youtube_handle": "@AlrodRVince",
        "youtube_url": "https://www.youtube.com/@AlrodRVince",
        "twitch_login": "alrod_vtuber",
        "twitch_url": "https://www.twitch.tv/alrod_vtuber",
    },
    "CHROM": {
        "youtube_handle": "@chromvlovely8752",
        "youtube_url": "https://www.youtube.com/@chromvlovely8752",
        "twitch_login": "chromvl",
        "twitch_url": "https://www.twitch.tv/chromvl",
    },
}


def fetch_json(
    url: str,
    *,
    method: str = "GET",
    headers: dict[str, str] | None = None,
) -> dict[str, Any]:
    request = Request(url, method=method, headers=headers or {})
    try:
        with urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {error.code}: {url}\n{body}") from error
    except URLError as error:
        raise RuntimeError(f"Request failed: {url}\n{error}") from error


def default_state() -> dict[str, Any]:
    return {
        "updatedAt": None,
        "platforms": {
            "youtube": {"ALROD": None, "CHROM": None},
            "twitch": {"ALROD": None, "CHROM": None},
        },
    }


def load_state() -> dict[str, Any]:
    if not STATE_FILE.exists():
        return default_state()
    try:
        data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default_state()

    data.setdefault("platforms", {})
    data["platforms"].setdefault("youtube", {})
    data["platforms"].setdefault("twitch", {})
    for member in MEMBERS:
        data["platforms"]["youtube"].setdefault(member, None)
        data["platforms"]["twitch"].setdefault(member, None)
    return data


def youtube_channel_id(api_key: str, handle: str) -> str:
    query = urlencode({
        "part": "id",
        "forHandle": handle,
        "key": api_key,
    })
    data = fetch_json(f"https://www.googleapis.com/youtube/v3/channels?{query}")
    items = data.get("items", [])
    if not items:
        raise RuntimeError(f"YouTube channel not found: {handle}")
    return str(items[0]["id"])


def youtube_live(api_key: str, member: str) -> dict[str, Any] | None:
    channel_id = youtube_channel_id(
        api_key,
        MEMBERS[member]["youtube_handle"],
    )
    query = urlencode({
        "part": "snippet",
        "channelId": channel_id,
        "eventType": "live",
        "type": "video",
        "maxResults": 1,
        "key": api_key,
    })
    data = fetch_json(f"https://www.googleapis.com/youtube/v3/search?{query}")
    items = data.get("items", [])
    if not items:
        return None

    item = items[0]
    video_id = item.get("id", {}).get("videoId")
    snippet = item.get("snippet", {})
    if not video_id:
        return None

    details_query = urlencode({
        "part": "liveStreamingDetails",
        "id": video_id,
        "key": api_key,
    })
    details = fetch_json(
        f"https://www.googleapis.com/youtube/v3/videos?{details_query}"
    )
    started_at = snippet.get("publishedAt")
    detail_items = details.get("items", [])
    if detail_items:
        started_at = (
            detail_items[0]
            .get("liveStreamingDetails", {})
            .get("actualStartTime")
            or started_at
        )

    thumbnails = snippet.get("thumbnails", {})
    thumbnail = (
        thumbnails.get("high", {}).get("url")
        or thumbnails.get("medium", {}).get("url")
        or thumbnails.get("default", {}).get("url")
        or ""
    )

    return {
        "member": member,
        "platform": "YouTube",
        "title": snippet.get("title") or "YouTube Live",
        "url": f"https://www.youtube.com/watch?v={video_id}",
        "thumbnail": thumbnail,
        "startedAt": started_at,
    }


def twitch_app_token(client_id: str, client_secret: str) -> str:
    query = urlencode({
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "client_credentials",
    })
    data = fetch_json(
        f"https://id.twitch.tv/oauth2/token?{query}",
        method="POST",
    )
    token = data.get("access_token")
    if not token:
        raise RuntimeError("Twitch access token was not returned.")
    return str(token)


def twitch_lives(
    client_id: str,
    client_secret: str,
) -> dict[str, dict[str, Any] | None]:
    token = twitch_app_token(client_id, client_secret)
    params: list[tuple[str, str]] = [
        ("user_login", MEMBERS["ALROD"]["twitch_login"]),
        ("user_login", MEMBERS["CHROM"]["twitch_login"]),
    ]
    data = fetch_json(
        "https://api.twitch.tv/helix/streams?" + urlencode(params),
        headers={
            "Authorization": f"Bearer {token}",
            "Client-Id": client_id,
        },
    )
    by_login = {
        str(item.get("user_login", "")).lower(): item
        for item in data.get("data", [])
    }

    result: dict[str, dict[str, Any] | None] = {}
    for member, settings in MEMBERS.items():
        item = by_login.get(settings["twitch_login"].lower())
        if not item:
            result[member] = None
            continue

        thumbnail = str(item.get("thumbnail_url") or "")
        thumbnail = thumbnail.replace("{width}", "1280")
        thumbnail = thumbnail.replace("{height}", "720")

        result[member] = {
            "member": member,
            "platform": "Twitch",
            "title": item.get("title") or "Twitch Live",
            "url": settings["twitch_url"],
            "thumbnail": thumbnail,
            "startedAt": item.get("started_at"),
        }
    return result


def youtube_target() -> list[str]:
    forced = os.environ.get("FORCE_YOUTUBE_MEMBER", "AUTO").upper()
    if forced == "BOTH":
        return ["ALROD", "CHROM"]
    if forced in MEMBERS:
        return [forced]

    # 15分ごとにALROD / CHROMを交互に確認。
    slot = int(datetime.now(timezone.utc).timestamp() // (15 * 60))
    return [["ALROD", "CHROM"][slot % 2]]


def combined_streams(state: dict[str, Any]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for platform in ("youtube", "twitch"):
        for member in MEMBERS:
            stream = state["platforms"][platform].get(member)
            if stream:
                result.append(stream)
    result.sort(
        key=lambda stream: str(stream.get("startedAt") or ""),
        reverse=True,
    )
    return result


def save(state: dict[str, Any]) -> None:
    STATE_FILE.write_text(
        json.dumps(state, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    public = {
        "updatedAt": state["updatedAt"],
        "streams": combined_streams(state),
    }
    PUBLIC_FILE.write_text(
        "window.LIVE_DATA = "
        + json.dumps(public, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )


def main() -> None:
    youtube_key = os.environ.get("YOUTUBE_API_KEY", "").strip()
    twitch_id = os.environ.get("TWITCH_CLIENT_ID", "").strip()
    twitch_secret = os.environ.get("TWITCH_CLIENT_SECRET", "").strip()

    missing = [
        name for name, value in (
            ("YOUTUBE_API_KEY", youtube_key),
            ("TWITCH_CLIENT_ID", twitch_id),
            ("TWITCH_CLIENT_SECRET", twitch_secret),
        )
        if not value
    ]
    if missing:
        raise RuntimeError("Missing GitHub Secrets: " + ", ".join(missing))

    state = load_state()

    for member in youtube_target():
        try:
            state["platforms"]["youtube"][member] = youtube_live(
                youtube_key,
                member,
            )
            status = "LIVE" if state["platforms"]["youtube"][member] else "OFFLINE"
            print(f"YouTube {member}: {status}")
        except RuntimeError as error:
            print(f"YouTube {member} check failed: {error}", file=sys.stderr)

    try:
        checked = twitch_lives(twitch_id, twitch_secret)
        for member, stream in checked.items():
            state["platforms"]["twitch"][member] = stream
            print(f"Twitch {member}: {'LIVE' if stream else 'OFFLINE'}")
    except RuntimeError as error:
        print(f"Twitch check failed: {error}", file=sys.stderr)

    state["updatedAt"] = datetime.now(timezone.utc).isoformat()
    save(state)


if __name__ == "__main__":
    main()
