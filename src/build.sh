#!/bin/sh
cd "$(dirname "$0")"
cat parts/d0_head.html parts/d1_core.js parts/d2_i18n.js parts/e1_rig.js parts/e2_poses.js parts/e3_world.js parts/e4_fight.js parts/e5_net.js parts/e6_game.js > index.html
{ printf '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'; cat index.html; printf '</body></html>'; } > test.html
wc -l index.html
