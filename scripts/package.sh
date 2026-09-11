#!/bin/sh
# 打包 Chrome Web Store 上傳用的 zip：只放 dist/，排除 source map。
set -eu
cd "$(dirname "$0")/.."
VERSION=$(node -p "require('./dist/manifest.json').version")
OUT="release/comments-exporter-for-claude-design-v${VERSION}.zip"
mkdir -p release
rm -f "$OUT"
(cd dist && zip -r -X "../$OUT" . -x "*.map" -x ".DS_Store" -x "*/.DS_Store")
echo "Packaged: $OUT ($(du -h "$OUT" | cut -f1))"
unzip -l "$OUT" | tail -1
