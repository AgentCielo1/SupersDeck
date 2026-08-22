#!/usr/bin/env bash
# Motion Factory setup — installs everything needed for capture weekends.
# Validated recipe: Python 3.10–3.11 + FreeMoCap 1.8.x (mediapipe, opencv,
# skellytracker et al. come with it). Run:  bash setup-factory.sh
set -euo pipefail

echo "== Dance Mastery Motion Factory setup =="

# 1) Python check (FreeMoCap wants 3.10 or 3.11)
PY=""
for c in python3.11 python3.10 python3; do
  if command -v "$c" >/dev/null 2>&1; then
    v=$("$c" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
    case "$v" in 3.10|3.11) PY="$c"; break;; esac
    [ -z "${PYFALLBACK:-}" ] && PYFALLBACK="$c"
  fi
done
if [ -z "$PY" ]; then
  echo "!! Python 3.10/3.11 not found (FreeMoCap's supported range)."
  echo "   Install Python 3.11 from python.org, then re-run. (Found: ${PYFALLBACK:-none})"
  exit 1
fi
echo "-> using $PY ($($PY --version))"

# 2) Isolated environment — never pollutes your system Python
DIR="${FACTORY_DIR:-$HOME/dance-mastery-factory}"
mkdir -p "$DIR"
cd "$DIR"
if [ ! -d venv ]; then
  "$PY" -m venv venv
  echo "-> created venv at $DIR/venv"
fi
./venv/bin/pip install --upgrade pip -q

# 3) FreeMoCap (multi-camera markerless mocap — capture, sync, calibrate,
#    reconstruct, export BVH/CSV; ~2-3 GB of dependencies, one-time)
echo "-> installing FreeMoCap (this takes a while the first time)..."
./venv/bin/pip install freemocap -q
./venv/bin/python -c "import freemocap; print('   FreeMoCap OK:', freemocap.__version__)"

# 4) Launcher
cat > "$DIR/freemocap.sh" <<'EOF'
#!/usr/bin/env bash
cd "$(dirname "$0")"
./venv/bin/freemocap
EOF
chmod +x "$DIR/freemocap.sh"

# 5) Capture session folders (matches Doc 09 conventions)
mkdir -p "$DIR/captures"

echo ""
echo "== Done =="
echo "Launch the GUI:        $DIR/freemocap.sh"
echo "Capture sessions in:   $DIR/captures/"
echo ""
echo "Also recommended (not auto-installed):"
echo "  - Blender (blender.org)  — Station 3/4: retarget + cleanup. FreeMoCap"
echo "    ships a Blender add-on (ajc27_freemocap_blender_addon) that imports"
echo "    sessions directly."
echo "  - ffmpeg                 — video wrangling (brew install ffmpeg /"
echo "    apt install ffmpeg / winget install ffmpeg)."
echo "  - Print the calibration board: freemocap.org docs -> calibration."
echo ""
echo "Next: run the weekend protocol in dance-mastery/09-CAPTURE-DAY-PLAYBOOK.md"
