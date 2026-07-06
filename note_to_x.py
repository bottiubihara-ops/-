#!/usr/bin/env python3
"""note の新着記事を検知して X (旧Twitter) に自動投稿するスクリプト。

使い方:
    python note_to_x.py            # 新着をチェックして X に投稿
    python note_to_x.py --dry-run  # 投稿せず、投稿予定の文面を表示するだけ

必要な環境変数 (X API の OAuth 1.0a キー4点):
    X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET

状態管理:
    投稿済み記事の guid を state/posted.json に保存する。
    初回実行時 (state ファイルが無いとき) は既存記事をすべて投稿済みとして
    登録するだけで、X には投稿しない (過去記事の連投防止)。
"""

import argparse
import json
import os
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

NOTE_RSS_URL = os.environ.get("NOTE_RSS_URL", "https://note.com/huge_stoat8575/rss")
TWEET_TEMPLATE = "新しい記事を公開しました📝\n{title}\n{link}"
MAX_POSTS_PER_RUN = 3  # RSS 異常時などに連投しないための上限

STATE_FILE = Path(__file__).resolve().parent / "state" / "posted.json"
TWEET_ENDPOINT = "https://api.x.com/2/tweets"
REQUIRED_ENV = ("X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET")


def fetch_feed_items():
    """RSS を取得し、新しい順に並んだ記事リストを返す。"""
    import requests

    resp = requests.get(
        NOTE_RSS_URL, timeout=30, headers={"User-Agent": "note-to-x/1.0"}
    )
    resp.raise_for_status()
    root = ET.fromstring(resp.content)
    items = []
    for item in root.iter("item"):
        link = (item.findtext("link") or "").strip()
        guid = (item.findtext("guid") or link).strip()
        title = (item.findtext("title") or "").strip()
        if guid and link:
            items.append({"guid": guid, "title": title, "link": link})
    return items


def load_state():
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    return None


def save_state(state):
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(
        json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def post_to_x(text):
    from requests_oauthlib import OAuth1Session

    missing = [k for k in REQUIRED_ENV if not os.environ.get(k)]
    if missing:
        raise RuntimeError(f"環境変数が未設定です: {', '.join(missing)}")

    session = OAuth1Session(
        os.environ["X_API_KEY"],
        client_secret=os.environ["X_API_SECRET"],
        resource_owner_key=os.environ["X_ACCESS_TOKEN"],
        resource_owner_secret=os.environ["X_ACCESS_TOKEN_SECRET"],
    )
    resp = session.post(TWEET_ENDPOINT, json={"text": text}, timeout=30)
    if resp.status_code != 201:
        raise RuntimeError(f"X への投稿に失敗しました: HTTP {resp.status_code} {resp.text}")
    return resp.json()["data"]["id"]


def main():
    parser = argparse.ArgumentParser(description="note 新着記事を X に投稿する")
    parser.add_argument(
        "--dry-run", action="store_true", help="投稿せず文面を表示するだけ"
    )
    args = parser.parse_args()

    items = fetch_feed_items()
    print(f"RSS 取得: {len(items)} 件 ({NOTE_RSS_URL})")

    state = load_state()
    if state is None:
        # 初回はシードのみ。既存記事を投稿済み扱いにして終了。
        state = {"posted_guids": [it["guid"] for it in items]}
        if args.dry_run:
            print(f"[dry-run] 初回シード: {len(items)} 件を投稿済みとして登録します (保存はしません)")
            return
        save_state(state)
        print(f"初回シード完了: 既存 {len(items)} 件を投稿済みとして登録しました (X への投稿なし)")
        return

    posted = set(state["posted_guids"])
    new_items = [it for it in items if it["guid"] not in posted]
    if not new_items:
        print("新着記事はありません")
        return

    # 古い順に投稿し、1回の実行での投稿数を制限する
    new_items.reverse()
    skipped = len(new_items) - MAX_POSTS_PER_RUN
    new_items = new_items[:MAX_POSTS_PER_RUN]
    if skipped > 0:
        print(f"注意: 新着が多いため {skipped} 件は次回以降に持ち越します")

    for it in new_items:
        text = TWEET_TEMPLATE.format(title=it["title"], link=it["link"])
        if args.dry_run:
            print(f"[dry-run] 以下を投稿します:\n---\n{text}\n---")
            continue
        tweet_id = post_to_x(text)
        # 1件成功するごとに保存し、途中失敗しても二重投稿しないようにする
        state["posted_guids"].append(it["guid"])
        save_state(state)
        print(f"投稿しました: {it['title']} (tweet id: {tweet_id})")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"エラー: {e}", file=sys.stderr)
        sys.exit(1)
