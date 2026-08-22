#!/usr/bin/env bash
# Tier-2 async clip analysis, end to end:
#   ./analyze.sh <video> <moveId> [outDir]
# Requires: the Motion Factory venv (setup-factory.sh) and Node 18+.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
VIDEO="${1:?usage: analyze.sh <video> <moveId> [outDir]}"
MOVE="${2:?usage: analyze.sh <video> <moveId> [outDir]}"
OUT="${3:-$(dirname "$VIDEO")}"
BASE="$(basename "${VIDEO%.*}")"

PY="${FACTORY_PY:-python3}"   # point FACTORY_PY at your venv python if needed

echo "── Tier-2 analysis: $VIDEO vs $MOVE"
"$PY" "$HERE/analyze-clip.py" "$VIDEO" "$OUT/$BASE.landmarks.json"
node "$HERE/analyze-report.mjs" "$OUT/$BASE.landmarks.json" "$MOVE" "$OUT/$BASE.report.json"
echo "── open app/review.html and load: $OUT/$BASE.report.json"
