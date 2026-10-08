#!/bin/sh
# Збирає папку game/ для десктопної (Steam) версії: без CDN, усе локально
set -e
cd "$(dirname "$0")"
OUT=../dvobiy-steam/game
T=../npmchk/package
rm -rf "$OUT" && mkdir -p "$OUT/models" "$OUT/vendor/three/build" "$OUT/vendor/three/examples/jsm/loaders"
./build.sh >/dev/null
{ printf '<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%%;background:#07080b}</style></head><body>'
  sed 's#https://cdn.jsdelivr.net/npm/three@0.160.0/#./vendor/three/#g' index.html
  printf '</body></html>'; } > "$OUT/index.html"
cp $T/build/three.module.js "$OUT/vendor/three/build/"
cp $T/examples/jsm/loaders/GLTFLoader.js "$OUT/vendor/three/examples/jsm/loaders/"
cp -r $T/examples/jsm/utils $T/examples/jsm/postprocessing $T/examples/jsm/shaders $T/examples/jsm/math "$OUT/vendor/three/examples/jsm/"
cp $T/LICENSE "$OUT/vendor/three/LICENSE"
cp models/*.json models/*.jpg "$OUT/models/"
echo "game/ готово: $(du -sh $OUT | cut -f1)"
