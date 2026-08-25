#!/usr/bin/env bash
#
# compare-shots.sh — build the before/after comparison artefacts for one screenshot pair.
#
# Produces a labelled side-by-side image, a pixel-difference image and a similarity
# score, so the report can show *what* changed instead of asserting that something did.
# A fix that only changes a role, href, attribute or accessible name produces
# byte-identical PNGs; this script says so explicitly, which is the signal to prove the
# change with a DOM probe instead of pixels.
#
# Usage:
#   compare-shots.sh <before.png> <after.png> [out.png]
#
# Writes <out.png> (side-by-side) and <out>-pixeldiff.png. Default out is
# $NX_VAL_EVIDENCE/Reports/<name>-diff.png.
#
# ffmpeg comes from the validation harness (puppeteer-screen-recorder bundles it),
# falling back to a system ffmpeg. Override with NX_VAL_FFMPEG.

set -euo pipefail

die() { printf 'error: %s\n' "$*" >&2; exit 1; }

[ $# -ge 2 ] || die "usage: compare-shots.sh <before.png> <after.png> [out.png]"
BEFORE=$1
AFTER=$2
[ -f "$BEFORE" ] || die "no such file: $BEFORE"
[ -f "$AFTER" ] || die "no such file: $AFTER"

name=$(basename "${AFTER%.*}")
OUT=${3:-${NX_VAL_EVIDENCE:-.}/Reports/${name}-diff.png}
mkdir -p "$(dirname "$OUT")"
PIXELDIFF="${OUT%.*}-pixeldiff.png"

find_ffmpeg() {
  if [ -n "${NX_VAL_FFMPEG:-}" ] && [ -x "$NX_VAL_FFMPEG" ]; then
    printf '%s\n' "$NX_VAL_FFMPEG"
    return 0
  fi
  if [ -n "${NX_VAL_HARNESS:-}" ] && [ -d "$NX_VAL_HARNESS/node_modules/@ffmpeg-installer" ]; then
    # The installer ships one platform-specific subdir (darwin-arm64, linux-x64, …).
    found=$(find "$NX_VAL_HARNESS/node_modules/@ffmpeg-installer" -maxdepth 2 -name ffmpeg -type f -perm -u+x 2>/dev/null | head -1)
    [ -n "$found" ] && { printf '%s\n' "$found"; return 0; }
  fi
  command -v ffmpeg 2>/dev/null && return 0
  return 1
}

if ! FFMPEG=$(find_ffmpeg); then
  die "no ffmpeg found — run validation-init.sh (installs one) or set NX_VAL_FFMPEG"
fi

# Identical bytes are a finding, not a failure: report it instead of drawing a blank diff.
if cmp -s "$BEFORE" "$AFTER"; then
  printf 'IDENTICAL: %s and %s are byte-identical.\n' "$(basename "$BEFORE")" "$(basename "$AFTER")"
  printf '           Prove the change with a DOM probe (s.deepEval) rather than pixels.\n'
fi

"$FFMPEG" -y -loglevel error -i "$BEFORE" -i "$AFTER" \
  -filter_complex "[0:v]scale=-2:800,pad=iw+8:ih:0:0:black[a];[1:v]scale=-2:800[b];[a][b]hstack=inputs=2" \
  "$OUT"
printf 'side-by-side: %s   (left = before, right = after)\n' "$OUT"

"$FFMPEG" -y -loglevel error -i "$BEFORE" -i "$AFTER" \
  -filter_complex "[0:v]scale=1280:800[a];[1:v]scale=1280:800[b];[a][b]blend=all_mode=difference" \
  "$PIXELDIFF"
printf 'pixel diff:   %s   (black = unchanged)\n' "$PIXELDIFF"

# PSNR of "inf" means the scaled frames match exactly; lower values mean bigger visual change.
score=$("$FFMPEG" -hide_banner -loglevel info -i "$BEFORE" -i "$AFTER" \
  -filter_complex "[0:v]scale=1280:800[a];[1:v]scale=1280:800[b];[a][b]psnr" -f null - 2>&1 |
  sed -n 's/.*average:\([^ ]*\).*/\1/p' | head -1)
[ -n "$score" ] && printf 'similarity:   PSNR average %s dB (inf = visually identical)\n' "$score"
