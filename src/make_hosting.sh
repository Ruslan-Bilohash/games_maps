#!/bin/sh
# Збирає папку too_much/ для власного хостингу (bilohash.com/games/too_much): усе локально + PHP API
set -e
cd "$(dirname "$0")"
OUT=../too_much
T=../npmchk/package
H=../hosting_src
rm -rf "$OUT" && mkdir -p "$OUT/models" "$OUT/vendor/three/build" "$OUT/vendor/three/examples/jsm/loaders" "$OUT/api" "$OUT/data"
./build.sh >/dev/null
{ printf '<!doctype html>\n<html lang="uk">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="theme-color" content="#07080b">\n<meta name="description" content="Двобій 3D — файтинг у браузері: кампанія, 7 бійців, 7 арен, комбо й супер-удари.">\n<meta property="og:title" content="Двобій 3D">\n<meta property="og:description" content="Файтинг у браузері: кампанія, 7 бійців, 7 арен.">\n<link rel="icon" href="data:image/svg+xml,%%3Csvg xmlns=%%27http://www.w3.org/2000/svg%%27 viewBox=%%270 0 100 100%%27%%3E%%3Ctext y=%%27.9em%%27 font-size=%%2790%%27%%3E%%E2%%9A%%94%%3C/text%%3E%%3C/svg%%3E">\n<style>html,body{margin:0;height:100%%;background:#07080b}</style>\n</head>\n<body>\n'
  sed 's#https://cdn.jsdelivr.net/npm/three@0.160.0/#./vendor/three/#g' index.html
  printf '\n</body>\n</html>\n'; } > "$OUT/index.html"
cp $T/build/three.module.js "$OUT/vendor/three/build/"
cp $T/examples/jsm/loaders/GLTFLoader.js "$OUT/vendor/three/examples/jsm/loaders/"
cp -r $T/examples/jsm/utils $T/examples/jsm/postprocessing $T/examples/jsm/shaders $T/examples/jsm/math "$OUT/vendor/three/examples/jsm/"
cp $T/LICENSE "$OUT/vendor/three/LICENSE"
cp models/*.json models/*.jpg "$OUT/models/"
cp $H/api/game.php $H/api/mail_template.php $H/api/config.sample.php "$OUT/api/"
cp $H/root/.htaccess "$OUT/.htaccess"
cp $H/root/data.htaccess "$OUT/data/.htaccess"
cp $H/root/README_UA.md "$OUT/README_UA.md"
echo "too_much/ готово: $(du -sh $OUT | cut -f1)"
