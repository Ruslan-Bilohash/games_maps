
  // =====================================================================
  // Бійці
  // =====================================================================
  const ATTACKS = { flipF: 1, grab: 1, jp: 1, p: 1, p2: 1, p3: 1, p4: 1, k: 1, k2: 1, k3: 1, k4: 1, h: 1, dash: 1, fireball: 1, charge: 1, dagger: 1, rush: 1, lightning: 1, quake: 1, shadow: 1 };
  const SUPERS = { rush: 1, lightning: 1, quake: 1, shadow: 1 };
  const ANIM_DUR = { p: MOVES.p.dur, p2: MOVES.p2.dur, p3: MOVES.p3.dur, p4: MOVES.p4.dur, k: MOVES.k.dur, k2: MOVES.k2.dur, k3: MOVES.k3.dur, k4: MOVES.k4.dur, jp: MOVES.jp.dur, grab: 0.9, h: MOVES.h.dur, hit2: 0.38, dash: 0.75, fireball: 0.8, charge: 0.9, dagger: 0.55, rush: 1.8, lightning: 1.6, quake: 1.5, shadow: 1.3, hit: 0.35, down: 1.1, getup: 0.6, flipF: 0.72, flipB: 0.7 };
  const INVULN = { down: 1, getup: 1, ko: 1, win: 1, flipB: 1 };
  function mkFighter(chId, name, x, face, local) {
    const ch = fighterById(chId);
    return { ch: ch.id, name, x, y: 0, vx: 0, vy: 0, face, anim: 'idle', at: 0, hp: ch.hp, maxHp: ch.hp, cdS: 0, cdU: 0, stun: 0, combo: 0, comboT: 0, hitDone: false, rushHits: 0, wins: 0, local, lit: 0, alpha: 1, proj: null, atkId: 0, ghostT: 0, trail: ch.hp };
  }
  const freeAnim = f => f.anim === 'idle' || f.anim === 'walkF' || f.anim === 'walkB' || f.anim === 'block';
  function startAnim(f, a) { f.anim = a; f.at = 0; f.hitDone = false; f.atkId++; f.rushHits = 0; }

  // Подія удару: відправляється супернику (онлайн) або застосовується одразу (комп’ютер)
  let sendHit = null;
  function deliverHit(att, opp, h) {
    h.fromX = att.x; h.id = att.atkId + ':' + (h.n || 0); h.kind = att.anim;
    if (opp.local) { const r = receiveHit(opp, h); if (r) hitFx(att, opp, h, r === 'block'); }
    else { if (sendHit) sendHit(h); hitFx(att, opp, h, opp.anim === 'block' && !h.unblockable && Math.sign(att.x - opp.x) === opp.face); }
  }
  function hitFx(att, opp, h, blocked) {
    const x = lerp(att.x, opp.x, 0.62), y = opp.y - (h.low ? 40 : 120);
    if (blocked) { spark(x, y, att.face, 0.3, '150,200,255'); sfx.block(); return; }
    spark(x, y, att.face, h.dmg / 14, h.col);
    const arcCol = h.col ? h.col.split(',').map(v => v / 255) : fighterById(att.ch).glow;
    if (att.anim === 'k' || att.anim === 'flipF') slashArc(x, y, att.face, arcCol, att.anim === 'flipF' ? 1.2 : 1, att.anim === 'flipF' ? -1.2 : 0.35);
    else if (att.anim === 'h' || att.anim === 'charge' || att.anim === 'dash') slashArc(x, y, att.face, arcCol, 1.25, -0.5);
    else if (att.anim === 'rush') slashArc(x, y, att.face, fighterById(att.ch).glow, 0.9 + Math.random() * 0.4, rand(-1, 1));
    if (h.dmg >= 20 && !reduceMotion) { slowmo = Math.max(slowmo, 0.55); cam.punch = Math.max(cam.punch, 0.1); }
    if (opp === game.me) buzz(h.dmg >= 12 ? 60 : 25); else if (att === game.me) buzz(12);
    sfx.hit(h.dmg >= 12);
    const fem = id => id === 'olena' || id === 'mavka';
    if (h.dmg >= 9 && Math.random() < 0.7) sfx.grunt(fem(att.ch), h.dmg >= 13);
    if (Math.random() < (h.dmg >= 9 ? 0.85 : 0.35)) setTimeout(() => sfx.hurt(fem(opp.ch)), 60);
    if (h.dmg >= 8) crowdCheer(h.dmg);
    hitStop = Math.max(hitStop, h.dmg >= 20 ? 0.13 : h.dmg >= 12 ? 0.09 : h.dmg >= 7 ? 0.05 : 0.03);
    cam.shake = Math.max(cam.shake, reduceMotion ? 0 : Math.min(18, 4 + h.dmg * 0.7));
    if (h.dmg >= 14) cam.punch = Math.max(cam.punch, 0.06);
  }
  // підкинутого суперника можна добивати в повітрі (до трьох разів)
  const juggleable = f => f.anim === 'down' && f.y < -25 && f.at < 0.75 && (f.jug || 0) < 3;
  const invul = f => !!INVULN[f.anim] && !juggleable(f);
  function receiveHit(f, h) {
    if (invul(f) || f.alpha < 0.3 || f.seenHits && f.seenHits.has(h.id)) return null;
    (f.seenHits || (f.seenHits = new Set())).add(h.id);
    f.hitKind = h.kind || ''; f.hitFrom = Math.sign(h.fromX - f.x) || 1;
    if (f.seenHits.size > 60) f.seenHits = new Set([...f.seenHits].slice(-30));
    const dir = Math.sign(f.x - h.fromX) || -f.face;
    const facingAttacker = Math.sign(h.fromX - f.x) === f.face;
    if (f.anim === 'block' && facingAttacker && !h.unblockable) {
      f.hp = Math.max(1, f.hp - h.dmg * 0.12);
      f.vx = dir * h.kb * 0.5;
      f.blockFx = 0.12;
      return 'block';
    }
    const dmg = h.unblockable && f.anim === 'block' && facingAttacker ? h.dmg * 0.35 : h.dmg;
    f.hp = Math.max(0, f.hp - dmg);
    f.lit = 1;
    f.combo = 0;
    if (f.hp <= 0) { startAnim(f, 'ko'); f.vx = dir * (h.throw ? -520 : 420); f.vy = -520; f.y = Math.min(f.y, -1); return 'hit'; }
    if (juggleable(f)) { f.jug = (f.jug || 0) + 1; startAnim(f, 'down'); f.vy = -460; f.vx = dir * 140; f.y = Math.min(f.y, -1); return 'hit'; }
    if (h.throw) { startAnim(f, 'down'); f.vx = -dir * 520; f.vy = -760; f.y = Math.min(f.y, -1); f.jug = 3; return 'hit'; }
    if (h.down) { startAnim(f, 'down'); f.vx = dir * h.kb * 1.3; f.vy = -420; f.y = Math.min(f.y, -1); }
    else { startAnim(f, h.low || Math.random() < 0.45 ? 'hit2' : 'hit'); f.stun = h.stun; f.vx = dir * h.kb; }
    return 'hit';
  }

  // Атака: перевірка влучання власником удару
  function inRange(att, opp, reach, hgt) {
    const dx = (opp.x - att.x) * att.face;
    return dx > -20 && dx < reach + 34 && Math.abs(opp.y - att.y) < (hgt || 130) && !invul(opp) && opp.alpha > 0.3;
  }
  function attackLogic(f, opp, dt) {
    const ch = fighterById(f.ch), M = MOVES[f.anim], dm = ch.dmg;
    const t = f.at;
    if (M) {
      if (!f.hitDone && t >= M.a0 && t <= M.a1 && inRange(f, opp, M.reach, 220)) {
        f.hitDone = true;
        const bonus = 1 + f.combo * 0.12, jug = juggleable(opp);
        deliverHit(f, opp, { dmg: Math.round(M.dmg * dm * bonus * (jug ? 0.8 : 1)), kb: M.kb, stun: M.stun, down: !!M.down, low: f.anim === 'k3' });
        f.combo++; f.comboT = 1.0;
        (f.seq || (f.seq = [])).push(f.anim); if (f.seq.length > 6) f.seq.shift();
        if (f.local && (f === game.me || game.mode === 'local')) showCombo(f, jug);
      }
      return;
    }
    switch (f.anim) {
      case 'grab':
        // кидок через плече: захоплення, потім перекид за спину
        if (!f.hitDone && t >= 0.24 && t <= 0.38 && Math.abs(opp.x - f.x) < 100 && opp.y > -40 && !invul(opp) && opp.alpha > 0.3) {
          f.hitDone = true;
          deliverHit(f, opp, { dmg: Math.round(13 * dm), kb: 300, stun: 0.6, down: true, unblockable: true, throw: true, col: '255,220,150' });
          if (f.local && (f === game.me || game.mode === 'local')) showBanner(L('cn.throw'), L('combo'), 900);
        }
        break;
      case 'flipF':
        if (!f.hitDone && t >= 0.44 && t <= 0.66 && inRange(f, opp, 96, 220)) { f.hitDone = true; deliverHit(f, opp, { dmg: Math.round(11 * dm), kb: 220, stun: 0.45, down: true, col: '200,255,170', arc: 'down' }); }
        break;
      case 'dash':
        if (t > 0.22 && t < 0.55) { f.vx = f.face * 900 * ch.speed; if (!f.hitDone && inRange(f, opp, 60)) { f.hitDone = true; f.vx = 0; deliverHit(f, opp, { dmg: Math.round(11 * dm), kb: 280, stun: 0.42, down: false }); } }
        else if (t >= 0.55) f.vx *= 0.8;
        break;
      case 'charge':
        if (t > 0.25 && t < 0.7) { f.vx = f.face * 720; if (!f.hitDone && inRange(f, opp, 50)) { f.hitDone = true; f.vx = 0; deliverHit(f, opp, { dmg: Math.round(12 * dm), kb: 300, stun: 0.5, down: true }); } }
        else if (t >= 0.7) f.vx *= 0.8;
        break;
      case 'fireball':
        if (!f.hitDone && t >= 0.32) { f.hitDone = true; f.proj = { k: 'fire', x: f.x + f.face * 60, y: f.y - 128, vx: f.face * 720, life: 1.6, dmg: Math.round(10 * dm), id: f.atkId }; }
        break;
      case 'dagger':
        if (!f.hitDone && t >= 0.3) { f.hitDone = true; f.proj = { k: 'dagger', x: f.x + f.face * 50, y: f.y - 130, vx: f.face * 1150, life: 1.1, dmg: Math.round(8 * dm), id: f.atkId }; }
        break;
      case 'rush': {
        if (t > 0.12 && t < 1.6) {
          const target = opp.x - f.face * 72;
          f.vx = clamp((target - f.x) * 10, -900, 900);
          const n = Math.floor((t - 0.3) / 0.27);
          if (t > 0.3 && n >= f.rushHits && f.rushHits < 5) {
            f.rushHits++;
            if (Math.abs(opp.x - f.x) < 150 && !invul(opp)) deliverHit(f, opp, { dmg: Math.round((f.rushHits === 5 ? 12 : 5) * dm), kb: f.rushHits === 5 ? 380 : 40, stun: 0.3, down: f.rushHits === 5, unblockable: true, n: f.rushHits });
          }
        } else f.vx *= 0.8;
        break;
      }
      case 'lightning':
        if (!f.hitDone && t >= 0.8) { f.hitDone = true; if (!invul(opp) && opp.alpha > 0.3) deliverHit(f, opp, { dmg: Math.round(26 * dm), kb: 200, stun: 0.6, down: true, unblockable: true, col: (ch.bolt || [0.75, 0.84, 1]).map(v => Math.round(v * 255)).join(',') }); }
        break;
      case 'quake':
        if (t >= 0.6 && !f.quake) f.quake = { x: f.x, d: 0, dir: f.face };
        if (f.quake) {
          f.quake.d += 900 * dt;
          const wx = f.quake.x + f.quake.dir * f.quake.d;
          if (!f.hitDone && Math.abs(opp.x - wx) < 60 && opp.y > -30 && !invul(opp)) { f.hitDone = true; deliverHit(f, opp, { dmg: Math.round(24 * dm), kb: 260, stun: 0.6, down: true, unblockable: true, low: true, col: '255,190,120' }); }
          if (f.quake.d > 1200) f.quake = null;
        }
        break;
      case 'shadow':
        if (t > 0.3 && t < 0.8) f.alpha = Math.max(0, 1 - (t - 0.3) * 6);
        if (t >= 0.8 && !f.tele) { f.tele = true; f.x = clamp(opp.x - opp.face * 74, -ARENA / 2 + 40, ARENA / 2 - 40); f.face = Math.sign(opp.x - f.x) || f.face; f.alpha = 1; }
        if (!f.hitDone && t >= 0.88 && t <= 1.1 && inRange(f, opp, 70)) { f.hitDone = true; deliverHit(f, opp, { dmg: Math.round(24 * dm), kb: 320, stun: 0.6, down: true, unblockable: true, col: '255,80,90' }); }
        break;
    }
  }
  function projLogic(f, opp, dt) {
    const pj = f.proj;
    if (!pj) return;
    pj.x += pj.vx * dt; pj.life -= dt;
    if (Math.abs(pj.x - opp.x) < 40 && Math.abs(pj.y - (opp.y - 120)) < 90 && !invul(opp) && opp.alpha > 0.3) {
      deliverHit(f, opp, { dmg: pj.dmg, kb: 160, stun: 0.35, down: false, n: 'pj', col: pj.k === 'fire' ? '255,150,60' : '230,230,240' });
      f.proj = null; return;
    }
    if (pj.life <= 0 || Math.abs(pj.x) > ARENA / 2 + 100) f.proj = null;
  }

  // Візуальні події з анімації (однакові для свого й чужого бійця)
  function animEvents(f, opp, prev, t) {
    const cross = x => prev < x && t >= x;
    if (prev === 0 && t > 0 && SUPERS[f.anim]) { superCutIn(f); }
    if (MOVES[f.anim] && cross(MOVES[f.anim].a0 - 0.04)) sfx.whoosh();
    switch (f.anim) {
      case 'flipF': case 'flipB': if (t - (f.ghostAt || 0) > 0.04 && t > 0.08 && t < 0.6) { f.ghostAt = t; trailFx(f, [0.6, 1, 0.5]); } break;
      case 'rush':
        if (cross(1.38)) { groundShock(opp.x, fighterById(f.ch).glow); pillar(opp.x, fighterById(f.ch).glow); cam.shake = 24; }
        break;
      case 'dash': case 'charge': if (cross(0.2)) { sfx.special(); dust(f.x, 0, 10); } break;
      case 'fireball': if (cross(0.3)) sfx.special(); break;
      case 'dagger': if (cross(0.28)) sfx.whoosh(); break;
      case 'lightning': {
        const bc = fighterById(f.ch).bolt || [0.55, 0.7, 1];
        if (cross(0.5)) darkSky(0.9);
        if (cross(0.78)) { lightning(opp.x, bc); zap(opp, 0.9, bc); sfx.thunder(); cam.shake = 22; }
        if (cross(0.9)) { lightning(opp.x + rand(-90, 90), bc); sfx.thunder(); }
        if (cross(1.02)) { lightning(opp.x + rand(-60, 60), bc); groundShock(opp.x, bc); }
        break;
      }
      case 'quake': if (cross(0.58)) { quakeWave(f.x, f.face); sfx.quake(); cam.shake = 26; } break;
      case 'shadow':
        if (cross(0.3)) { smoke(f.x, 0, 24); sfx.special(); }
        if (cross(0.8)) { smoke(f.x, 0, 18); trailFx(f, [1, 0.1, 0.15]); }
        if (cross(0.9)) { slashArc(opp.x, opp.y - 120, f.face, [1, 0.12, 0.18], 1.7, -0.6); slashArc(opp.x, opp.y - 110, f.face, [1, 0.3, 0.3], 1.3, 0.7); }
        break;
    }
    if ((f.anim === 'dash' || f.anim === 'rush' || f.anim === 'charge' || (f.anim === 'shadow' && t > 0.8)) && t - (f.ghostAt || 0) > 0.05) {
      f.ghostAt = t;
      trailFx(f);
    }
    if (prev > t) f.ghostAt = 0;
  }
  function superCutIn(f) {
    const ch = fighterById(f.ch);
    const el = $('superCut'), tx = $('superTxt');
    tx.textContent = suName(ch.id);
    el.hidden = false; tx.style.animation = 'none'; void tx.offsetWidth; tx.style.animation = '';
    clearTimeout(superCutIn.t); superCutIn.t = setTimeout(() => { el.hidden = true; }, 1000);
    darken = 0.9; sfx.super();
    superBurst(f);
    if (!reduceMotion) cam.cut = { f, t: 0.75 };
  }
  let comboTimer = 0;
  function showCombo(f, jug) {
    const n = f.combo, q = (f.seq || []).join(',');
    let name = '';
    if (/p,p2,p3,p4$/.test(q)) name = t('cn.fists');
    else if (/k,k2,k4$/.test(q)) name = t('cn.hopak');
    else if (n >= 5) name = t('cn.storm');
    if (jug && !name) name = t('combo.juggle');
    if (n < 3 && !name) return;
    const word = n >= 6 ? t('combo.6') : n >= 5 ? t('combo.5') : n >= 4 ? t('combo.4') : t('combo.3');
    showBanner(name || word, t('combo.n', { n }), 800);
    if (n >= 4 || name) sfx.crowd(0.6);
  }

  // Крок фізики й станів для свого бійця
  function stepFighter(f, opp, inp, dt) {
    const ch = fighterById(f.ch);
    f.at += dt;
    if (f.cdS > 0) f.cdS -= dt;
    if (f.cdU > 0) f.cdU -= dt;
    if (f.cdF > 0) f.cdF -= dt;
    if (f.comboT > 0) { f.comboT -= dt; if (f.comboT <= 0) { f.combo = 0; f.seq = []; } }
    const grounded = f.y >= 0;
    if (f.anim === 'ko' || f.anim === 'win') { /* нічого */ }
    else if (f.anim === 'down') { if (grounded && f.at > ANIM_DUR.down) startAnim(f, 'getup'); }
    else if (f.anim === 'getup') { if (f.at > ANIM_DUR.getup) startAnim(f, 'idle'); }
    else if (f.anim === 'hit' || f.anim === 'hit2') { f.stun -= dt; if (f.stun <= 0) startAnim(f, 'idle'); }
    else if (f.anim === 'flipB') { f.vx = -f.face * 330 * ch.speed; if (f.at > 0.25 && grounded) { startAnim(f, 'idle'); f.vx = 0; } }
    else if (ATTACKS[f.anim]) {
      attackLogic(f, opp, dt);
      const M = MOVES[f.anim];
      // ланцюжки: джеб → прямий → хук, нога → поштовх, будь-що → важкий
      if (M && grounded && f.at > M.a1 + 0.01) {
        if (inp.p && inp.block) { startAnim(f, 'p4'); f.vx = 0; }
        else if (inp.k && inp.block) { startAnim(f, 'k3'); f.vx = 0; }
        else if (inp.p) { startAnim(f, f.anim === 'p' ? 'p2' : f.anim === 'p2' ? 'p3' : f.anim === 'p3' ? 'p4' : 'p'); f.vx = 0; }
        else if (inp.k) { startAnim(f, f.anim === 'k' ? 'k2' : f.anim === 'k2' ? 'k4' : 'k'); f.vx = 0; }
        else if (inp.h && f.anim !== 'h') { startAnim(f, 'h'); f.vx = 0; }
      }
      if (f.anim === 'flipF' && f.at > 0.3 && grounded) { startAnim(f, 'idle'); f.vx = 0; }
      else if (f.at >= ANIM_DUR[f.anim]) { if (f.anim === 'shadow') { f.tele = false; f.alpha = 1; } startAnim(f, grounded ? 'idle' : 'jump'); f.quake = null; }
    } else if (f.anim === 'jump') {
      if (inp.left) f.vx = -260 * ch.speed; else if (inp.right) f.vx = 260 * ch.speed;
      if (inp.p) startAnim(f, 'jp'); else if (inp.k) startAnim(f, 'k');
    } else {
      // вільний стан
      if (grounded) f.face = Math.sign(opp.x - f.x) || f.face;
      if (inp.u && f.cdU <= 0 && grounded) { f.cdU = SUPER_CD; startAnim(f, ch.super.id); f.vx = 0; }
      else if (inp.s && f.cdS <= 0 && grounded) { f.cdS = SPECIAL_CD; startAnim(f, ch.special.id); f.vx = 0; }
      else if (inp.h && inp.block && grounded) { startAnim(f, 'grab'); f.vx = 0; }
      else if (inp.p && inp.block && grounded) { startAnim(f, 'p4'); f.vx = 0; }
      else if (inp.k && inp.block && grounded) { startAnim(f, 'k3'); f.vx = 0; }
      else if (inp.h && grounded) { startAnim(f, 'h'); f.vx = 0; }
      else if (inp.k) { startAnim(f, 'k'); f.vx = 0; }
      else if (inp.p) { startAnim(f, 'p'); f.vx = 0; }
      else if (inp.f && grounded && !(f.cdF > 0)) {
        const toward = (inp.right && f.face > 0) || (inp.left && f.face < 0);
        f.cdF = 0.85; f.vy = -900; f.y = -1; sfx.jump(); sfx.whoosh();
        if (toward) { startAnim(f, 'flipF'); f.vx = f.face * 250 * ch.speed; } else { startAnim(f, 'flipB'); f.vx = -f.face * 330 * ch.speed; }
      }
      else if (inp.up && grounded) { startAnim(f, 'jump'); f.vy = -980; sfx.jump(); f.vx = inp.left ? -300 * ch.speed : inp.right ? 300 * ch.speed : 0; }
      else if (inp.block && grounded) { if (f.anim !== 'block') startAnim(f, 'block'); f.vx = 0; }
      else if (inp.left || inp.right) {
        const dir = inp.left ? -1 : 1;
        f.vx = dir * 250 * ch.speed * (dir === f.face ? 1 : 0.8);
        const a = dir === f.face ? 'walkF' : 'walkB';
        if (f.anim !== a) startAnim(f, a);
      } else { f.vx = 0; if (f.anim !== 'idle') startAnim(f, 'idle'); }
    }
    projLogic(f, opp, dt);
    physics(f, opp, dt);
  }
  function physics(f, opp, dt) {
    f.x += f.vx * dt;
    if (f.y < 0 || f.vy < 0) {
      f.y += f.vy * dt; f.vy += GRAV * dt;
      if (f.y >= 0) {
        f.y = 0; f.vy = 0;
        if (f.anim === 'jump') { startAnim(f, 'idle'); sfx.land(); dust(f.x, 0, 6); }
        if (f.anim === 'flipF' || f.anim === 'flipB') { sfx.land(); dust(f.x, 0, 10); }
        if (f.anim === 'down' || f.anim === 'ko') { dust(f.x - f.face * 40, 0, 16); sfx.land(); f.vx *= 0.3; f.jug = 0; if (f.anim === 'down' && f.at < 0.4) f.at = 0.4; }
      }
    }
    if (f.anim === 'hit' || f.anim === 'hit2' || f.anim === 'down' || f.anim === 'ko' || f.blockFx > 0) f.vx *= Math.exp(-dt * 6);
    if (f.blockFx > 0) f.blockFx -= dt;
    f.x = clamp(f.x, -ARENA / 2 + 40, ARENA / 2 - 40);
    if (opp && Math.abs(f.x - opp.x) < 62 && Math.abs(f.y - opp.y) < 100 && f.alpha > 0.3 && opp.alpha > 0.3) {
      const push = (62 - Math.abs(f.x - opp.x)) * (f.x < opp.x ? -1 : 1);
      f.x = clamp(f.x + push * (opp.local ? 0.5 : 1), -ARENA / 2 + 40, ARENA / 2 - 40);
    }
    if (f.lit > 0) f.lit = Math.max(0, f.lit - dt * 6);
  }

  // =====================================================================
  // Комп’ютерний суперник
  // =====================================================================
  // Комп’ютер: me.aiLvl від 0 (новачок) до 1 (майстер)
  function aiInput(me, opp, dt) {
    const L = me.aiLvl === undefined ? 0.5 : me.aiLvl;
    const inp = {};
    const ch = fighterById(me.ch), ranged = ch.special.id === 'fireball' || ch.special.id === 'dagger';
    me.aiT = (me.aiT || 0) - dt;
    me.aiBlock = (me.aiBlock || 0) - dt;
    // продовження комбо
    if (MOVES[me.anim] && me.aiChain > 0 && me.at > MOVES[me.anim].a1 + 0.02) { me.aiChain--; inp[me.aiChainKey] = true; if (me.aiChainKey === 'p' && me.aiChain === 0 && Math.random() < L) inp.block = true; return inp; }
    if (!freeAnim(me) && me.anim !== 'jump') return inp;
    const d = Math.abs(opp.x - me.x), toward = opp.x > me.x ? 'right' : 'left', away = toward === 'right' ? 'left' : 'right';
    const threat = (ATTACKS[opp.anim] && opp.at < 0.5) || !!opp.proj;
    if (me.aiBlock > 0) { inp.block = true; return inp; }
    if (threat && d < 190 && Math.random() < 0.025 + L * 0.13) { me.aiBlock = rand(0.2, 0.45); inp.block = true; return inp; }
    if (threat && d < 210 && Math.random() < 0.006 + L * 0.03) { inp.f = true; return inp; }
    if (opp.y < -60 && d < 150 && Math.random() < L * 0.2) { inp.p = true; inp.block = true; return inp; }
    if (d > 140 && d < 250 && Math.random() < 0.004 + L * 0.012) { inp.f = true; inp[toward] = true; return inp; }
    if (me.cdU <= 0 && opp.anim !== 'down' && Math.random() < 0.004 + L * 0.014 && (d < 300 || ch.super.id === 'lightning' || ch.super.id === 'shadow')) { inp.u = true; return inp; }
    if (d > 190) {
      if (me.cdS <= 0 && Math.random() < 0.008 + L * 0.02 && (ranged || d < 420)) { inp.s = true; return inp; }
      inp[toward] = true;
      if (Math.random() < 0.004) inp.up = true;
      return inp;
    }
    if (me.aiT <= 0) {
      me.aiT = rand(0.6 - L * 0.35, 1.05 - L * 0.5);
      const r = Math.random();
      if (r < 0.34) { inp.p = true; if (Math.random() < L) { me.aiChain = Math.random() < 0.5 ? 1 : 2; me.aiChainKey = 'p'; } }
      else if (r < 0.56) { inp.k = true; if (Math.random() < L * 0.6) { me.aiChain = 1; me.aiChainKey = 'k'; } }
      else if (r < 0.66) inp.h = true;
      else if (r < 0.72) { inp.k = true; inp.block = true; }
      else if (r < 0.77) inp.up = true;
      else if (r < 0.9) { me.aiBack = 0.3; }
      else if (me.cdS <= 0) inp.s = true;
    } else if (d > 120 && Math.random() < 0.3 + L * 0.4) inp[toward] = true;
    if (me.aiBack > 0) { me.aiBack -= dt; inp[away] = true; }
    return inp;
  }
