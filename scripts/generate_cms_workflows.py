
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EDIT_WORKFLOW = ROOT / ".github" / "workflows" / "cms-edit.yml"
DELETE_WORKFLOW = ROOT / ".github" / "workflows" / "cms-delete.yml"


def q(value: str) -> str:
    return json.dumps(str(value), ensure_ascii=False)


def options_for(data: dict) -> list[str]:
    labels = {
        "news": "NEWS",
        "music": "MUSIC",
        "goods": "GOODS",
        "events": "EVENT",
    }
    result: list[str] = []

    for collection in ("news", "music", "goods", "events"):
        for item in data.get(collection, []):
            title = str(item.get("title", "")).strip() or "無題"
            item_id = str(item.get("id", "")).strip()
            state = "公開" if item.get("published", True) else "非表示"
            result.append(f"{labels[collection]}｜{title}｜{state}｜{item_id}")

    return result or ["登録データなし｜none"]


def generate_workflows(data: dict) -> None:
    options_yaml = "\n".join(
        f"          - {q(option)}" for option in options_for(data)
    )

    edit_template = r'''name: "CMS 05 - 内容を選んで編集"

on:
  workflow_dispatch:
    inputs:
      target:
        description: "編集する項目をタイトルから選択"
        required: true
        type: choice
        options:
__OPTIONS__
      title:
        description: "新しいタイトル（変更しない場合は空欄）"
        required: false
        type: string
      date:
        description: "新しい日付・日時（変更しない場合は空欄）"
        required: false
        type: string
      category:
        description: "NEWSカテゴリ（変更しない場合は空欄）"
        required: false
        type: string
      artist:
        description: "歌唱者 ALROD / CHROM / VI-LAIN（変更しない場合は空欄）"
        required: false
        type: string
      url:
        description: "新しいURL（変更しない場合は空欄）"
        required: false
        type: string
      image:
        description: "新しい画像パス（変更しない場合は空欄）"
        required: false
        type: string
      status:
        description: "GOODS販売状況（変更しない場合は空欄）"
        required: false
        type: string
      price:
        description: "価格（変更しない場合は空欄）"
        required: false
        type: string
      description:
        description: "説明（変更しない場合は空欄）"
        required: false
        type: string
      published:
        description: "公開状態"
        required: true
        default: "keep"
        type: choice
        options: [keep, "true", "false"]
      publish_at:
        description: "公開予約（変更しない場合は空欄）"
        required: false
        type: string

permissions:
  contents: write

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Parse selected item
        id: selected
        env:
          TARGET: ${{ inputs.target }}
        run: |
          ITEM_ID="${TARGET##*｜}"
          PREFIX="${TARGET%%｜*}"
          case "$PREFIX" in
            NEWS) COLLECTION="news" ;;
            MUSIC) COLLECTION="music" ;;
            GOODS) COLLECTION="goods" ;;
            EVENT) COLLECTION="events" ;;
            *) echo "対象を判別できません"; exit 1 ;;
          esac
          echo "id=$ITEM_ID" >> "$GITHUB_OUTPUT"
          echo "collection=$COLLECTION" >> "$GITHUB_OUTPUT"
      - name: Edit selected item
        env:
          COLLECTION: ${{ steps.selected.outputs.collection }}
          ITEM_ID: ${{ steps.selected.outputs.id }}
          TITLE: ${{ inputs.title }}
          DATE_VALUE: ${{ inputs.date }}
          CATEGORY: ${{ inputs.category }}
          ARTIST: ${{ inputs.artist }}
          URL_VALUE: ${{ inputs.url }}
          IMAGE: ${{ inputs.image }}
          STATUS_VALUE: ${{ inputs.status }}
          PRICE: ${{ inputs.price }}
          DESCRIPTION: ${{ inputs.description }}
          PUBLISHED: ${{ inputs.published }}
          PUBLISH_AT: ${{ inputs.publish_at }}
        run: |
          python scripts/cms.py edit \
            --collection "$COLLECTION" \
            --id "$ITEM_ID" \
            --title "$TITLE" \
            --date "$DATE_VALUE" \
            --category "$CATEGORY" \
            --artist "$ARTIST" \
            --url "$URL_VALUE" \
            --image "$IMAGE" \
            --status "$STATUS_VALUE" \
            --price "$PRICE" \
            --description "$DESCRIPTION" \
            --published "$PUBLISHED" \
            --publish-at "$PUBLISH_AT"
      - name: Commit changes
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add cms/content.json cms/INDEX.md data/content.js .github/workflows/cms-edit.yml .github/workflows/cms-delete.yml
          git commit -m "CMS: edit selected content"
          git push
'''

    delete_template = r'''name: "CMS 06 - 内容を選んで削除"

on:
  workflow_dispatch:
    inputs:
      target:
        description: "削除する項目をタイトルから選択"
        required: true
        type: choice
        options:
__OPTIONS__
      confirmation:
        description: "削除する場合は DELETE と入力"
        required: true
        type: string

permissions:
  contents: write

jobs:
  delete:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Confirm deletion
        env:
          CONFIRMATION: ${{ inputs.confirmation }}
        run: |
          if [ "$CONFIRMATION" != "DELETE" ]; then
            echo "確認文字が違います。"
            exit 1
          fi
      - name: Parse selected item
        id: selected
        env:
          TARGET: ${{ inputs.target }}
        run: |
          ITEM_ID="${TARGET##*｜}"
          PREFIX="${TARGET%%｜*}"
          case "$PREFIX" in
            NEWS) COLLECTION="news" ;;
            MUSIC) COLLECTION="music" ;;
            GOODS) COLLECTION="goods" ;;
            EVENT) COLLECTION="events" ;;
            *) echo "対象を判別できません"; exit 1 ;;
          esac
          echo "id=$ITEM_ID" >> "$GITHUB_OUTPUT"
          echo "collection=$COLLECTION" >> "$GITHUB_OUTPUT"
      - name: Delete selected item
        env:
          COLLECTION: ${{ steps.selected.outputs.collection }}
          ITEM_ID: ${{ steps.selected.outputs.id }}
        run: |
          python scripts/cms.py delete \
            --collection "$COLLECTION" \
            --id "$ITEM_ID"
      - name: Commit changes
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add cms/content.json cms/INDEX.md data/content.js .github/workflows/cms-edit.yml .github/workflows/cms-delete.yml
          git commit -m "CMS: delete selected content"
          git push
'''

    EDIT_WORKFLOW.write_text(
        edit_template.replace("__OPTIONS__", options_yaml),
        encoding="utf-8",
    )
    DELETE_WORKFLOW.write_text(
        delete_template.replace("__OPTIONS__", options_yaml),
        encoding="utf-8",
    )
