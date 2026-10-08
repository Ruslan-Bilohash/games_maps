
  // =====================================================================
  // Матч і раунди
  // =====================================================================
  let game = null, clock = 0, last = 0, paused = false;
  let myChar = storage.get('duel.char', 'taras');
  let pendingMode = 'cpu';
  let portraits = {};
  const ui = { login: $('login'), hud: $('hud'), pad: $('pad'), banner: $('banner'), title: $('title'), select: $('select'), lobby: $('lobby'), pause: $('pause'), result: $('result'), toast: $('toast'), qr: $('qr'), codeIn: $('codeIn'), story: $('story') };
  let toastT = 0;
  function toast(m) { ui.toast.textContent = m; ui.toast.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { ui.toast.hidden = true; }, 3000); }
  let bannerT = 0;
  function showBanner(text, small, ms) {
    ui.banner.textContent = text;
    if (small) { const s = document.createElement('small'); s.textContent = small; ui.banner.appendChild(s); }
    ui.banner.hidden = false; ui.banner.classList.remove('pop'); void ui.banner.offsetWidth; ui.banner.classList.add('pop');
    clearTimeout(bannerT); bannerT = setTimeout(() => { ui.banner.hidden = true; }, ms || 1400);
  }
  function screen(name) {
    for (const k of ['title', 'select', 'lobby', 'pause', 'result', 'qr', 'codeIn', 'story', 'login']) ui[k].hidden = k !== name;
  }
  function startMatch(mode, myCh, oppCh, oppName, side, arenaIdx) {
    const nick = mode === 'local' ? t('p1') : ($('nick').value || '').trim().slice(0, 16) || t('fighter');
    const me = mkFighter(myCh, nick, side * 220, -side, true);
    const opp = mkFighter(oppCh, oppName, -side * 220, side, mode === 'cpu' || mode === 'local');
    opp.ai = mode === 'cpu';
    for (const I of IN) I.edge = {};
    title.ready = false;
    clearViews();
    const forced = new URLSearchParams(location.search).get('arena');
    setArena(ARENAS.includes(forced) ? forced : ARENAS[arenaIdx !== undefined ? Math.abs(arenaIdx) % ARENAS.length : Math.floor(Math.random() * ARENAS.length)]);
    attachView(me, 0); attachView(opp, 1);
    precompileScene();
    game = { mode, me, opp, round: 1, timer: ROUND_TIME, phase: 'intro', phaseT: 0, side };
    fx = []; cam.x = 0; cam.w = VH > VW * 1.2 ? 670 : 860; cam.cut = null; cam.cutK = 0; cam.fin = null; slowK = 0.3; hitStop = 0; slowmo = 0; darken = 0;
    screen(null); ui.hud.hidden = false; ui.pad.hidden = false; paused = false;
    // без сенсорного екрана (ПК, Steam) кнопки на екрані не потрібні — лишаємо тільки паузу
    $('stickZone').hidden = $('acts').hidden = !coarse() && !/[?&]pad/.test(location.search);
    stickReset();
    $('nmL').textContent = me.name; $('nmR').textContent = opp.name;
    $('modeTxt').textContent = t(mode === 'online' ? 'mode.online' : mode === 'local' ? 'mode.local' : 'mode.cpu') + arenaName(arenaId);
    introRound();
  }
  function introRound() {
    game.phase = 'intro'; game.phaseT = 0; game.timer = ROUND_TIME;
    const { me, opp, side } = game;
    for (const [f, x, fc] of [[me, side * 220, -side], [opp, -side * 220, side]]) {
      if (f.local) { f.x = x; f.y = 0; f.vx = 0; f.vy = 0; f.face = fc; f.hp = f.maxHp; f.trail = f.maxHp; f.proj = null; f.alpha = 1; f.cdS = 0; f.cdU = /[?&]nocd/.test(location.search) ? 0 : SUPER_CD * 0.4; startAnim(f, 'idle'); }
    }
    if (!opp.local) { opp.hp = opp.maxHp; opp.trail = opp.maxHp; }
    showBanner(t('round', { n: game.round }), '', 1200);
    sfx.gong();
    setTimeout(() => { if (game && game.phase === 'intro') { showBanner(t('fight'), '', 900); sfx.fight(); game.phase = 'fight'; } }, 1300);
  }
  function endRound(winner, why) {
    if (game.phase !== 'fight') return;
    game.phase = 'ko'; game.phaseT = 0;
    slowmo = 1.3; cam.punch = 0.12;
    const local = game.mode === 'local';
    const decisive = why === 'ko' && winner && winner.wins + 1 >= WIN_ROUNDS;
    if (decisive) { startFinale(winner, winner === game.me ? game.opp : game.me); showBanner(t('finish'), local ? winner.name : winner === game.me ? t('victory') : t('ko.lost'), 2600); }
    else if (why === 'ko') { showBanner(t('ko'), local ? t('ko.local', { name: winner.name }) : winner === game.me ? t('ko.won') : t('ko.lost'), 2200); sfx.ko(); flash = 0.6; aberr = 0.025; }
    else showBanner(t('time'), winner === game.me ? t('time.you') : winner ? t('time.opp') : t('time.draw'), 2200);
    if (winner) winner.wins++;
    setTimeout(() => {
      if (!game) return;
      if (winner && winner.local && winner.anim !== 'ko') startAnim(winner, 'win');
      setTimeout(() => {
        if (!game) return;
        if (game.me.wins >= WIN_ROUNDS || game.opp.wins >= WIN_ROUNDS) endMatch(game.me.wins >= WIN_ROUNDS);
        else { game.round++; introRound(); }
      }, 1600);
    }, 900);
  }
  function endMatch(won, reason) {
    game.phase = 'over';
    ui.pad.hidden = true;
    if (game.camp !== undefined) campResult(won);
    $('resTitle').textContent = game.mode === 'local' ? t('res.winner', { name: won ? game.me.name : game.opp.name }) : won ? t('res.win') : t('res.lose');
    $('resText').textContent = reason || (game.mode === 'local' ? t('res.localText', { a: game.me.wins, b: game.opp.wins }) : won ? t('res.winText', { name: game.opp.name, a: game.me.wins, b: game.opp.wins }) : t('res.loseText', { name: game.opp.name, a: game.opp.wins, b: game.me.wins }));
    setTimeout(() => screen('result'), 600);
    // десктопна версія (Steam): досягнення
    try { if (window.duelDesktop && won && game.mode !== 'local') window.duelDesktop.achieve(game.mode === 'online' ? 'WIN_ONLINE' : 'WIN_CPU'); if (window.duelDesktop && game.me.wins >= 2 && game.opp.wins === 0 && won) window.duelDesktop.achieve('FLAWLESS'); } catch (e) { /* ігноруємо */ }
    if (game.mode === 'online') Net.stop();
  }
  function onOnlineMatch(side, info) {
    let h = 0; const key = [Net.myPeer, Net.oppPeer].sort().join('');
    for (let i = 0; i < key.length; i++) h = (h + key.charCodeAt(i)) | 0;
    toast(t('toast.found', { nm: info.nm }));
    startMatch('online', myChar, info.ch, info.nm, side, h);
  }
  function onRemoteHit(h) {
    if (!game || game.mode !== 'online' || game.phase !== 'fight') return;
    const r = receiveHit(game.me, h);
    if (r) hitFx(game.opp, game.me, h, r === 'block');
  }
  function onOpponentLeft() {
    if (!game || game.mode !== 'online' || game.phase === 'over') return;
    toast(t('toast.oppLeft'));
    endMatch(true, t('res.oppLeft'));
  }
  function leaveToTitle() {
    game = null; paused = false; ui.hud.hidden = true; ui.pad.hidden = true;
    cam.cut = null; cam.fin = null; slowK = 0.3; grade.uniforms.uSat.value = 1.14; grade.uniforms.uVig.value = 0.42; darken = 0; slowmo = 0;
    setupTitle();
    campLabel(); $('again').textContent = t('btn.again');
    screen('title');
  }

  // =====================================================================
  // Керування
  // =====================================================================
  // Два набори вводу: гравець 1 (сенсор, WASD+JKL, геймпад 1) і гравець 2 (стрілки+цифри, геймпад 2)
  const mkInput = () => ({ held: { left: false, right: false, block: false }, edge: {} });
  const IN = [mkInput(), mkInput()];
  const stickHeld = { left: false, right: false, block: false };
  const BUF = 0.22; // буфер натискань, с: удар не губиться, якщо натиснув трохи раніше
  const KEYS1 = { KeyA: 'left', KeyD: 'right', KeyW: 'up', Space: 'up', KeyS: 'block', ShiftLeft: 'block', KeyJ: 'p', KeyK: 'k', KeyL: 'h', KeyF: 'f', KeyO: 'f', KeyU: 's', KeyI: 'u' };
  const KEYS_ARROWS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'block' };
  const KEYS2 = Object.assign({}, KEYS_ARROWS, { Numpad1: 'p', Numpad2: 'k', Numpad3: 'h', Numpad0: 'f', Numpad4: 's', Numpad5: 'u', Comma: 'p', Period: 'k', Slash: 'h', Semicolon: 'f', BracketLeft: 's', BracketRight: 'u', ShiftRight: 'block' });
  const buzz = ms => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ігноруємо */ } };
  function keyTarget(code) {
    if (game && game.mode === 'local') { if (KEYS1[code]) return [0, KEYS1[code]]; if (KEYS2[code]) return [1, KEYS2[code]]; return null; }
    const k = KEYS1[code] || KEYS_ARROWS[code];
    return k ? [0, k] : null;
  }
  function press(p, k, on) {
    if (k === 'menu') { if (on) openPause(); return; }
    const I = IN[p];
    if (k in I.held) I.held[k] = on; else if (on) I.edge[k] = clock;
  }
  window.addEventListener('keydown', e => {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    if (e.code === 'Escape' && game && game.phase !== 'over') { openPause(); return; }
    const t = keyTarget(e.code);
    if (!t || !game) return;
    e.preventDefault();
    if (!e.repeat) press(t[0], t[1], true);
  });
  window.addEventListener('keyup', e => { const t = keyTarget(e.code); if (t && t[1] in IN[t[0]].held) IN[t[0]].held[t[1]] = false; });
  window.addEventListener('blur', () => { for (const I of IN) I.held.left = I.held.right = I.held.block = false; stickReset(); });
  // Кнопки: палець можна вести з кнопки на кнопку без відриву
  const acts = $('acts'), ptrBtn = new Map();
  const btnAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest ? el.closest('#acts .k') : null; };
  const btnDown = b => { b.classList.add('on'); press(0, b.dataset.k, true); buzz(8); };
  const btnUp = b => { b.classList.remove('on'); press(0, b.dataset.k, false); };
  acts.addEventListener('pointerdown', e => {
    const b = e.target.closest('.k'); if (!b) return;
    e.preventDefault(); audioInit();
    try { b.setPointerCapture(e.pointerId); } catch (err) { /* ігноруємо */ }
    const prev = ptrBtn.get(e.pointerId); if (prev) btnUp(prev);
    ptrBtn.set(e.pointerId, b); btnDown(b);
  });
  acts.addEventListener('pointermove', e => {
    if (!ptrBtn.has(e.pointerId)) return;
    const b = btnAt(e.clientX, e.clientY), cur = ptrBtn.get(e.pointerId);
    if (b && b !== cur) { if (cur) btnUp(cur); ptrBtn.set(e.pointerId, b); btnDown(b); }
  });
  const btnEnd = e => { const cur = ptrBtn.get(e.pointerId); if (cur) btnUp(cur); ptrBtn.delete(e.pointerId); };
  acts.addEventListener('pointerup', btnEnd); acts.addEventListener('pointercancel', btnEnd); acts.addEventListener('lostpointercapture', btnEnd);
  document.querySelector('#pad .pauseBtn').addEventListener('pointerdown', e => { e.preventDefault(); openPause(); });
  // Плаваючий джойстик: з’являється там, де торкнувся палець
  const zone = $('stickZone'), stick = $('stick'), knob = $('knob');
  const stk = { id: null, cx: 0, cy: 0, upArmed: true };
  function stickHome() { stick.style.left = '88px'; stick.style.top = Math.max(70, zone.clientHeight - 96) + 'px'; }
  function stickReset() {
    stk.id = null; stickHeld.left = stickHeld.right = stickHeld.block = false; stk.upArmed = true;
    knob.style.transform = ''; stick.classList.add('idle'); stickHome();
  }
  function stickMove(x, y) {
    let dx = x - stk.cx, dy = y - stk.cy;
    const d = Math.hypot(dx, dy), max = 46;
    if (d > max) { dx *= max / d; dy *= max / d; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    stickHeld.left = dx < -12; stickHeld.right = dx > 12;
    stickHeld.block = dy > 24 && Math.abs(dx) < 34;
    if (dy < -26 && stk.upArmed) { press(0, 'up', true); stk.upArmed = false; buzz(6); }
    if (dy > -12) stk.upArmed = true;
  }
  zone.addEventListener('pointerdown', e => {
    if (stk.id !== null) return;
    e.preventDefault(); audioInit();
    stk.id = e.pointerId;
    try { zone.setPointerCapture(e.pointerId); } catch (err) { /* ігноруємо */ }
    const r = zone.getBoundingClientRect();
    stk.cx = e.clientX; stk.cy = e.clientY;
    stick.classList.remove('idle');
    stick.style.left = (e.clientX - r.left) + 'px'; stick.style.top = (e.clientY - r.top) + 'px';
    stickMove(e.clientX, e.clientY);
  });
  zone.addEventListener('pointermove', e => { if (e.pointerId === stk.id) stickMove(e.clientX, e.clientY); });
  const stickUp = e => { if (e.pointerId === stk.id) stickReset(); };
  zone.addEventListener('pointerup', stickUp); zone.addEventListener('pointercancel', stickUp); zone.addEventListener('lostpointercapture', stickUp);
  window.addEventListener('resize', () => { if (stk.id === null) stickHome(); });
  // Геймпади (стандартна розкладка): X рука, A нога, Y важкий, B сальто, RB спец, RT супер, LB/LT блок
  const PAD_BTN = { 2: 'p', 0: 'k', 3: 'h', 1: 'f', 5: 's', 7: 'u', 12: 'up' };
  const padPrev = [[], []], padHeld = [{}, {}];
  let padSeen = false;
  function pollPads() {
    const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    for (let i = 0; i < 2; i++) {
      const pad = pads[i], ph = padHeld[i];
      ph.left = ph.right = ph.block = false;
      if (!pad) continue;
      if (!padSeen) { padSeen = true; toast(t('toast.pad')); }
      const p = game && game.mode === 'local' ? i : 0;
      const b = j => !!(pad.buttons[j] && (pad.buttons[j].pressed || pad.buttons[j].value > 0.5));
      const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
      ph.left = b(14) || ax < -0.4; ph.right = b(15) || ax > 0.4;
      ph.block = b(13) || b(4) || b(6) || ay > 0.6;
      const now = [];
      for (let j = 0; j < pad.buttons.length; j++) now[j] = b(j);
      now.up = ay < -0.6;
      for (const j in PAD_BTN) if (now[j] && !padPrev[i][j]) press(p, PAD_BTN[j], true);
      if (now.up && !padPrev[i].up) press(p, 'up', true);
      if (now[9] && !padPrev[i][9] && game && game.phase !== 'over') { if (paused) $('resume').click(); else openPause(); }
      padPrev[i] = now;
      ph.p = p;
    }
  }
  function takeInputP(p) {
    const I = IN[p];
    const pads = padHeld.filter(h => h.p === p);
    const any = k => I.held[k] || (p === 0 && stickHeld[k]) || pads.some(h => h[k]);
    const inp = { left: any('left'), right: any('right'), block: any('block') };
    for (const k of ['up', 'p', 'k', 'h', 's', 'u', 'f']) if (I.edge[k] !== undefined && clock - I.edge[k] <= BUF) inp[k] = true;
    return inp;
  }
  // Буфер очищується, коли боєць справді почав нову дію
  function consumeInput(p, f, prevAtk) {
    if (f.atkId !== prevAtk && (ATTACKS[f.anim] || f.anim === 'jump' || f.anim === 'flipB')) IN[p].edge = {};
  }

  // =====================================================================
  // Оновлення
  // =====================================================================
  function update(rdt) {
    clock += rdt;
    Net.tick(rdt);
    if (!game) { musicTick(rdt, false); tickTitle(rdt); tickArena(rdt); updateFx(rdt); pollPads(); return; }
    musicTick(rdt, game.phase === 'fight');
    let dt = rdt;
    if (slowmo > 0) { slowmo -= rdt; dt *= slowK; if (slowmo <= 0 && !cam.fin) slowK = 0.3; }
    if (hitStop > 0) { hitStop -= rdt; dt *= 0.06; }
    if (cam.cut) dt *= 0.45;
    if (paused && game.mode !== 'online') { tickArena(rdt * 0.2); pollPads(); return; }
    const { me, opp } = game;
    const fighting = game.phase === 'fight';
    pollPads();
    const inp = fighting && !paused ? takeInputP(0) : {};
    const prevMe = me.at, atkMe = me.atkId;
    if (game.phase !== 'over') stepFighter(me, opp, inp, dt);
    consumeInput(0, me, atkMe);
    animEvents(me, opp, prevMe, me.at);
    if (opp.local) {
      const prevO = opp.at, atkO = opp.atkId;
      const oi = !fighting ? {} : game.mode === 'local' ? takeInputP(1) : aiInput(opp, me, dt);
      stepFighter(opp, me, oi, dt);
      if (game.mode === 'local') consumeInput(1, opp, atkO);
      animEvents(opp, me, prevO, opp.at);
    } else {
      syncRemote(opp, rdt);
      animEvents(opp, me, opp.prevAt || 0, opp.at);
      Net.send(me);
    }
    for (const f of [me, opp]) f.trail = f.trail > f.hp ? Math.max(f.hp, f.trail - rdt * 30) : f.hp;
    if (fighting) {
      game.timer -= dt;
      if (me.hp <= 0) endRound(opp, 'ko');
      else if (opp.hp <= 0) endRound(me, 'ko');
      else if (game.timer <= 0) { game.timer = 0; endRound(me.hp / me.maxHp > opp.hp / opp.maxHp ? me : opp.hp / opp.maxHp > me.hp / me.maxHp ? opp : null, 'time'); }
    }
    if (game.phase === 'ko' && opp.local && opp.hp <= 0 && opp.anim !== 'ko') startAnim(opp, 'ko');
    tickArena(dt);
    updateFx(dt);
    if (darken > 0) darken = Math.max(0, darken - rdt * 1.2);
    if (cam.shake > 0) cam.shake = Math.max(0, cam.shake - rdt * 50);
    if (cam.punch > 0) cam.punch = Math.max(0, cam.punch - rdt * 0.4);
    // камера
    const mid = (me.x + opp.x) / 2, gap = Math.abs(me.x - opp.x);
    // стабільна камера: не наїжджає впритул, коли бійці зближуються, і плавно відходить, коли розходяться
    const portrait = VH > VW * 1.2;
    const minW = portrait ? 480 : 800;
    const air = Math.max(0, -Math.min(me.y, opp.y));
    const tw = clamp(gap + (portrait ? 230 : 380) + air * (portrait ? 0.9 : 1.6), minW, portrait ? 820 : 1000);
    const k = 1 - Math.exp(-rdt * (tw > cam.w ? 3 : 1.2));
    cam.w = lerp(cam.w, tw, k);
    const half = cam.w / 2;
    cam.x = lerp(cam.x, clamp(mid, -ARENA / 2 + half - 160, ARENA / 2 - half + 160), 1 - Math.exp(-rdt * 4));
    updateHud();
  }
  function updateHud() {
    const { me, opp } = game;
    const set = (f, fi, tr, bar) => {
      $(fi).style.width = (f.hp / f.maxHp * 100).toFixed(1) + '%';
      $(tr).style.width = (f.trail / f.maxHp * 100).toFixed(1) + '%';
      $(bar).classList.toggle('low', f.hp / f.maxHp < 0.3);
    };
    set(me, 'fiL', 'trL', 'hpL'); set(opp, 'fiR', 'trR', 'hpR');
    const num = (f, id) => { const v = String(Math.max(0, Math.ceil(f.hp / f.maxHp * 100))); const el = $(id); if (el.textContent !== v) el.textContent = v; };
    num(me, 'hnL'); num(opp, 'hnR');
    const wins = (id, n) => $(id).querySelectorAll('b').forEach((b, i) => b.classList.toggle('on', i < n));
    wins('wL', me.wins); wins('wR', opp.wins);
    const t = Math.ceil(game.timer); if ($('timer').textContent !== String(t)) $('timer').textContent = t;
    const ring = (id, kid, cd, max) => {
      const p = cd > 0 ? cd / max : 0;
      $(id).style.background = p > 0 ? `conic-gradient(rgba(0,0,0,0.62) ${(p * 100).toFixed(1)}%, transparent 0)` : 'none';
      $(kid).classList.toggle('cd', p > 0);
    };
    ring('rS', 'kS', me.cdS, SPECIAL_CD); ring('rU', 'kU', me.cdU, SUPER_CD);
    $('kU').classList.toggle('ready', me.cdU <= 0);
  }

  // =====================================================================
  // Меню
  // =====================================================================
  $('nick').value = storage.get('duel.nick', '');
  $('nick').addEventListener('change', () => storage.set('duel.nick', $('nick').value.trim().slice(0, 16)));
  function lobbyCount(online, looking) { $('lobbyCount').textContent = t('lobby.count', { a: online, b: looking }); }
  function renderRoster() {
    $('roster').innerHTML = FIGHTERS.map(f => `<button class="fc" type="button" data-f="${f.id}" aria-pressed="${f.id === myChar}">${portraits[f.id] ? '<canvas class="pc" width="240" height="300"></canvas>' : '<div class="ph"></div>'}<b>${fName(f.id)}</b><span>${fTitle(f.id)}</span></button>`).join('');
    $('roster').querySelectorAll('.fc').forEach(b => { const c = b.querySelector('canvas'); if (c) c.getContext('2d').drawImage(portraits[b.dataset.f], 0, 0); });
    const f = fighterById(myChar);
    $('moveList').innerHTML = `<b>${t('mv.special')}</b><span>${spName(f.id)}: ${spDesc(f.id)}. ${t('mv.reload', { s: SPECIAL_CD })}</span><b>${t('mv.super')}</b><span>${suName(f.id)}: ${suDesc(f.id)}. ${t('mv.reload', { s: SUPER_CD })}</span><b>${t('mv.hands')}</b><span>${t('mv.handsT')}</span><b>${t('mv.block')}</b><span>${t('mv.blockT')}</span><b>${t('mv.flip')}</b><span>${t('mv.flipT')}</span><b>${t('mv.air')}</b><span>${t('mv.airT')}</span>`;
  }
  $('roster').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return; myChar = b.dataset.f; storage.set('duel.char', myChar); renderRoster(); });
  $('goOnline').addEventListener('click', () => { audioInit(); pendingMode = 'online'; renderRoster(); renderPicks(); screen('select'); });
  $('goCpu').addEventListener('click', () => { audioInit(); pendingMode = 'cpu'; renderRoster(); renderPicks(); screen('select'); });
  $('selBack').addEventListener('click', () => screen('title'));
  async function goOnline() {
    screen('lobby');
    $('lobbyTitle').textContent = t('lobby.search');
    $('lobbySpin').hidden = false;
    $('lobbyText').textContent = t('lobby.wait');
    const nick = ($('nick').value || '').trim().slice(0, 16) || t('fighter');
    const ok = await Net.search(myChar, nick);
    if (!ok) {
      $('lobbySpin').hidden = true;
      $('lobbyTitle').textContent = t('lobby.unavail');
      $('lobbyText').textContent = t('lobby.unavailText');
      $('lobbyCount').textContent = '';
    }
  }
  function startCpu() {
    const others = FIGHTERS.filter(f => f.id !== myChar);
    const o = pick(others);
    startMatch('cpu', myChar, o.id, fName(o.id) + t('cpu'), -1, arenaIndexChoice());
    game.opp.aiLvl = DIFFS[diffChoice] ? DIFFS[diffChoice][1] : 0.5;
  }
  function startLocal() {
    const others = FIGHTERS.filter(f => f.id !== myChar);
    startMatch('local', myChar, pick(others).id, t('p2'), -1, arenaIndexChoice());
    toast(t('toast.p2'));
  }
  // ---------- Бій за QR-кодом ----------
  const INVITE_URL = 'https://claude.ai/artifact/2TscYMRzPYF4fXPcy7C3DX';
  let myCode = '';
  function newCode() { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)]; return s; }
  function loadQrLib() {
    return new Promise(res => {
      if (window.qrcode) { res(true); return; }
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
      s.onload = () => res(!!window.qrcode); s.onerror = () => res(false);
      document.head.appendChild(s);
    });
  }
  async function drawQr(text) {
    const c = $('qrCanvas'), g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    if (!(await loadQrLib())) { g.fillStyle = '#222'; g.font = '600 15px Rubik, sans-serif'; g.textAlign = 'center'; g.fillText(t('qr.unavail'), 116, 118); return; }
    const q = window.qrcode(0, 'M'); q.addData(text); q.make();
    const n = q.getModuleCount(), s = Math.floor(c.width / n), o = Math.floor((c.width - n * s) / 2);
    g.fillStyle = '#0b0d12';
    for (let r = 0; r < n; r++) for (let cc = 0; cc < n; cc++) if (q.isDark(r, cc)) g.fillRect(o + cc * s, o + r * s, s, s);
  }
  async function startQrHost() {
    myCode = newCode();
    screen('qr');
    $('qrTitle').textContent = t('qr.show');
    $('qrCode').textContent = myCode;
    $('qrText').textContent = t('qr.text');
    drawQr(INVITE_URL + '?duel=' + myCode);
    const nick = ($('nick').value || '').trim().slice(0, 16) || t('fighter');
    const ok = await Net.search(myChar, nick, myCode.toLowerCase());
    if (!ok) $('qrText').textContent = t('qr.textNo');
  }
  async function joinByCode() {
    const code = ($('codeField').value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 5) { toast(t('code.len')); return; }
    screen('lobby');
    $('lobbyTitle').textContent = t('lobby.joining');
    $('lobbySpin').hidden = false;
    $('lobbyText').textContent = t('lobby.joinText', { c: code });
    const nick = ($('nick').value || '').trim().slice(0, 16) || t('fighter');
    const ok = await Net.search(myChar, nick, code.toLowerCase());
    if (!ok) { $('lobbySpin').hidden = true; $('lobbyTitle').textContent = t('lobby.unavail'); $('lobbyText').textContent = t('qr.textNo'); }
  }
  $('goQr').addEventListener('click', () => { audioInit(); pendingMode = 'qr'; renderRoster(); renderPicks(); screen('select'); });
  $('goCode').addEventListener('click', () => { audioInit(); pendingMode = 'code'; renderRoster(); renderPicks(); screen('select'); });
  $('goLocal').addEventListener('click', () => { audioInit(); pendingMode = 'local'; renderRoster(); renderPicks(); screen('select'); });
  $('qrBack').addEventListener('click', () => { Net.stop(); screen('title'); });
  $('qrCopy').addEventListener('click', async () => {
    const txt = t('qr.invite', { url: INVITE_URL, code: myCode });
    try { await navigator.clipboard.writeText(txt); toast(t('qr.copied')); } catch (e) { toast(txt); }
  });
  $('codeBack').addEventListener('click', () => screen('title'));
  $('codeGo').addEventListener('click', () => { audioInit(); joinByCode(); });
  $('codeField').addEventListener('keydown', e => { if (e.key === 'Enter') joinByCode(); });
  {
    const m = (location.search + location.hash).match(/duel=([A-Za-z0-9]{5})/);
    if (m) { $('codeField').value = m[1].toUpperCase(); pendingMode = 'code'; }
  }
  // ---------- Альбомна орієнтація ----------
  let rotateSkipped = false;
  const coarse = () => !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  function checkRotate() { $('rotate').hidden = !(coarse() && innerHeight > innerWidth * 1.05 && !rotateSkipped); }
  $('rotateSkip').addEventListener('click', () => { rotateSkipped = true; checkRotate(); });
  window.addEventListener('resize', checkRotate);
  window.addEventListener('orientationchange', () => setTimeout(checkRotate, 200));
  // ---------- Повний екран ----------
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const fsAble = () => { const el = document.documentElement; return !!(el.requestFullscreen || el.webkitRequestFullscreen); };
  function enterFs() {
    if (fsEl() || !fsAble() || window.duelDesktop) return;
    try {
      const el = document.documentElement;
      const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen();
      const lock = () => { const o = window.screen && window.screen.orientation; if (o && o.lock && coarse()) o.lock('landscape').catch(() => {}); };
      if (p && p.then) p.then(lock).catch(() => {}); else lock();
    } catch (e) { /* браузер не дозволив */ }
  }
  function exitFs() { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) { /* ігноруємо */ } }
  function goLandscape() { if (coarse()) enterFs(); }
  // на телефоні — повний екран із першого дотику і знову, якщо гравець випадково вийшов під час бою
  document.addEventListener('pointerdown', e => {
    if (!coarse() || fsEl()) return;
    if (e.target.closest && e.target.closest('input, .lsel-menu, #rotate')) return;
    enterFs();
  }, { passive: true });
  function fsLabel() { $('fsBtn').hidden = !fsAble() || !!window.duelDesktop; $('fsBtn').textContent = fsEl() ? t('fs.off') : t('fs.on'); }
  $('fsBtn').addEventListener('click', () => { if (fsEl()) exitFs(); else enterFs(); });
  document.addEventListener('fullscreenchange', () => { fsLabel(); setTimeout(resize, 120); });
  document.addEventListener('webkitfullscreenchange', () => { fsLabel(); setTimeout(resize, 120); });
  // без випадкового масштабування сторінки: щипок, жести Safari, Ctrl+коліщатко (подвійний дотик вимикає touch-action у CSS)
  document.addEventListener('touchmove', e => { if (e.touches.length > 1 || (e.scale !== undefined && e.scale !== 1)) e.preventDefault(); }, { passive: false });
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, e => e.preventDefault(), { passive: false });
  window.addEventListener('wheel', e => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  document.addEventListener('dblclick', e => e.preventDefault());
  $('selGo').addEventListener('click', () => {
    audioInit(); goLandscape();
    if (pendingMode === 'online') goOnline();
    else if (pendingMode === 'qr') startQrHost();
    else if (pendingMode === 'code') { screen('codeIn'); setTimeout(() => $('codeField').focus(), 50); }
    else if (pendingMode === 'local') startLocal();
    else if (pendingMode === 'camp') { storage.set('duel3d.camp', { char: myChar, stage: 0, done: false, losses: 0 }); campLabel(); showStory(0); }
    else startCpu();
  });
  $('lobbyBack').addEventListener('click', () => { Net.stop(); screen('title'); });
  $('lobbyCpu').addEventListener('click', () => { Net.stop(); startCpu(); });
  function openPause() {
    if (!game || game.phase === 'over') return;
    paused = true; screen('pause');
    $('resume').textContent = game.mode === 'online' ? t('btn.resumeOnline') : t('btn.resume');
  }
  $('resume').addEventListener('click', () => { paused = false; screen(null); last = performance.now(); });
  $('quit').addEventListener('click', () => { if (game && game.mode === 'online') Net.stop(); leaveToTitle(); });
  const soundLabel = () => { $('soundBtn').textContent = muted ? t('sound.off') : t('sound.on'); };
  $('soundBtn').addEventListener('click', () => { muted = !muted; storage.set('duel.muted', muted); if (master) master.gain.value = muted ? 0 : 0.9; soundLabel(); });
  soundLabel();
  function musicLabel() { $('musicBtn').textContent = musicOn ? t('music.on') : t('music.off'); }
  $('musicBtn').addEventListener('click', () => { musicOn = !musicOn; storage.set('duel3d.music', musicOn); if (musicBus) musicBus.gain.value = musicOn ? 0.42 : 0; musicLabel(); });
  musicLabel();
  // Вибір мови — випадаюче меню з прапорами
  const FLAGS = {
    uk: '<svg class="flag" viewBox="0 0 3 2" aria-hidden="true"><rect width="3" height="1" fill="#0057B7"/><rect y="1" width="3" height="1" fill="#FFD700"/></svg>',
    en: '<svg class="flag" viewBox="0 0 60 30" preserveAspectRatio="none" aria-hidden="true"><rect width="60" height="30" fill="#012169"/><path d="M0,0 60,30M60,0 0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 60,30M60,0 0,30" stroke="#C8102E" stroke-width="2"/><path d="M30,0v30M0,15h60" stroke="#fff" stroke-width="10"/><path d="M30,0v30M0,15h60" stroke="#C8102E" stroke-width="6"/></svg>',
    no: '<svg class="flag" viewBox="0 0 22 16" aria-hidden="true"><rect width="22" height="16" fill="#BA0C2F"/><rect x="6" width="4" height="16" fill="#fff"/><rect y="6" width="22" height="4" fill="#fff"/><rect x="7" width="2" height="16" fill="#00205B"/><rect y="7" width="22" height="2" fill="#00205B"/></svg>'
  };
  const langMenus = [];
  for (const id of ['langs', 'langs2']) {
    const box = $(id); if (!box) continue;
    box.innerHTML = `<button type="button" class="lsel-btn" aria-haspopup="listbox" aria-expanded="false"><span class="lsel-cur"></span><span class="car"></span></button>`
      + `<ul class="lsel-menu" role="listbox" hidden>` + Object.keys(LANGS).map(l => `<li role="option" tabindex="-1" data-lang="${l}" lang="${l === 'no' ? 'nb' : l}">${FLAGS[l]}<span>${LANGS[l]}</span></li>`).join('') + `</ul>`;
    const btn = box.querySelector('.lsel-btn'), menu = box.querySelector('.lsel-menu');
    const open = v => {
      menu.hidden = !v; btn.setAttribute('aria-expanded', String(v));
      if (v) { for (const m of langMenus) if (m.box !== box) m.open(false); const cur = menu.querySelector(`[data-lang="${lang}"]`); if (cur) cur.focus(); }
    };
    btn.addEventListener('click', e => { e.stopPropagation(); open(menu.hidden); });
    menu.addEventListener('click', e => { const li = e.target.closest('[data-lang]'); if (!li) return; e.stopPropagation(); open(false); setLang(li.dataset.lang); btn.focus(); });
    menu.addEventListener('keydown', e => {
      const items = [...menu.querySelectorAll('[data-lang]')], i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus(); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (items[i]) items[i].click(); }
      else if (e.key === 'Escape') { e.preventDefault(); open(false); btn.focus(); }
      e.stopPropagation();
    });
    langMenus.push({ box, open, render: () => { box.querySelector('.lsel-cur').outerHTML = `<span class="lsel-cur" style="display:inline-flex;align-items:center;gap:8px">${FLAGS[lang]}<span>${LANGS[lang]}</span></span>`; btn.setAttribute('aria-label', t('lang.label') + ': ' + LANGS[lang]); } });
  }
  document.addEventListener('click', () => { for (const m of langMenus) m.open(false); });
  langHooks.push(() => { for (const m of langMenus) m.render(); }, () => fsLabel());
  langHooks.push(soundLabel, () => applyQuality(), () => campLabel(), () => { if (!ui.select.hidden) { renderRoster(); renderPicks(); } }, () => { if (typeof musicLabel === 'function') musicLabel(); }, () => { if (typeof acctRender === 'function') acctRender(); });
  applyLang();
  $('qualBtn').addEventListener('click', () => { quality = (quality + 3) % 4; storage.set('duel3d.q', quality); applyQuality(); });
  $('again').addEventListener('click', () => {
    if (game && game.camp !== undefined) {
      const sv = campSave(); game = null; ui.hud.hidden = true; $('again').textContent = t('btn.again');
      if (sv && sv.done) { storage.set('duel3d.camp', null); pendingMode = 'camp'; renderRoster(); renderPicks(); screen('select'); }
      else if (sv) showStory(sv.stage);
      return;
    }
    $('again').textContent = t('btn.again');
    const mode = game ? game.mode : 'cpu', code = Net.me && Net.me.code;
    game = null; ui.hud.hidden = true;
    if (mode === 'online') { if (code) { $('codeField').value = code.toUpperCase(); joinByCode(); } else goOnline(); }
    else if (mode === 'local') startLocal(); else startCpu();
  });
  $('toMenu').addEventListener('click', leaveToTitle);

  // =====================================================================
  // Проходження, вибір арени, складність, збереження
  // =====================================================================
  const DIFFS = [['diff.0', 0.2], ['diff.1', 0.5], ['diff.2', 0.82]];
  let arenaChoice = storage.get('duel3d.arena', 'random');
  let diffChoice = storage.get('duel3d.diff', 1);
  function renderPicks() {
    const showArena = pendingMode === 'cpu' || pendingMode === 'local', showDiff = pendingMode === 'cpu';
    $('pickBox').hidden = !showArena;
    $('diffLbl').hidden = $('diffPick').hidden = !showDiff;
    $('arenaPick').innerHTML = [['random', t('pick.random')]].concat(ARENAS.map(a => [a, arenaName(a)])).map(([id, n]) => `<button class="chip" type="button" data-a="${id}" aria-pressed="${id === arenaChoice}">${n}</button>`).join('');
    $('diffPick').innerHTML = DIFFS.map(([n], i) => `<button class="chip" type="button" data-d="${i}" aria-pressed="${i === diffChoice}">${t(n)}</button>`).join('');
  }
  $('arenaPick').addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; arenaChoice = b.dataset.a; storage.set('duel3d.arena', arenaChoice); renderPicks(); });
  $('diffPick').addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (!b) return; diffChoice = +b.dataset.d; storage.set('duel3d.diff', diffChoice); renderPicks(); });
  const arenaIndexChoice = () => arenaChoice === 'random' || !ARENAS.includes(arenaChoice) ? undefined : ARENAS.indexOf(arenaChoice);
  // збереження проходження
  const campSave = () => storage.get('duel3d.camp', null);
  function campLabel() {
    const sv = campSave();
    $('goCamp').textContent = sv && !sv.done ? t('btn.campCont', { n: sv.stage + 1, m: CAMPAIGN.length }) : sv && sv.done ? t('btn.campChamp') : t('btn.camp');
  }
  function campOpp(stage) {
    const st = CAMPAIGN[stage], sv = campSave();
    if (st.opp !== sv.char) return { id: st.opp, name: fName(st.opp), mirror: false };
    return { id: st.opp, name: t('twin', { name: fName(st.opp) }), mirror: true };
  }
  function showStory(stage) {
    const st = CAMPAIGN[stage], o = campOpp(stage);
    $('stStage').textContent = t('story.stage', { n: stage + 1, m: CAMPAIGN.length, arena: arenaName(st.arena) });
    $('stTitle').textContent = campText(stage, 0);
    $('stVs').textContent = t('story.vs', { name: o.name, title: fTitle(o.id) }) + (st.boss ? t('story.boss') : '');
    $('stText').textContent = campText(stage, 1) + (o.mirror ? t('story.mirror') : '');
    const c = $('stPortrait').getContext('2d');
    c.fillStyle = '#0b0d12'; c.fillRect(0, 0, 240, 300);
    if (portraits[o.id]) c.drawImage(portraits[o.id], 0, 0);
    if (o.mirror) { c.globalCompositeOperation = 'multiply'; c.fillStyle = '#5a4a8a'; c.fillRect(0, 0, 240, 300); c.globalCompositeOperation = 'source-over'; }
    screen('story');
  }
  function startCampStage() {
    const sv = campSave(); if (!sv) return;
    const st = CAMPAIGN[sv.stage], o = campOpp(sv.stage);
    myChar = sv.char;
    startMatch('cpu', sv.char, o.id, o.name, -1, ARENAS.indexOf(st.arena));
    game.camp = sv.stage;
    game.opp.aiLvl = st.lvl;
    if (st.boss) { game.opp.maxHp = Math.round(game.opp.maxHp * 1.25); game.opp.hp = game.opp.maxHp; game.opp.trail = game.opp.maxHp; }
    $('modeTxt').textContent = t('mode.camp', { n: sv.stage + 1, m: CAMPAIGN.length }) + arenaName(arenaId);
  }
  function campResult(won) {
    const sv = campSave(); if (!sv) return;
    if (won) {
      sv.stage++;
      if (sv.stage >= CAMPAIGN.length) { sv.done = true; sv.stage = CAMPAIGN.length - 1; const ch = storage.get('duel3d.champs', []); if (!ch.includes(sv.char)) ch.push(sv.char); storage.set('duel3d.champs', ch); }
    } else sv.losses = (sv.losses || 0) + 1;
    storage.set('duel3d.camp', sv);
    setTimeout(() => {
      if (sv.done && won) { $('resTitle').textContent = t('camp.champTitle'); $('resText').textContent = t('camp.champText', { name: fName(sv.char) }); $('again').textContent = t('btn.replay'); }
      else if (won) { $('resText').textContent += t('camp.saved', { n: sv.stage + 1, m: CAMPAIGN.length }); $('again').textContent = t('btn.next'); }
      else { $('resText').textContent += t('camp.savedRetry'); $('again').textContent = t('btn.retry'); }
    }, 650);
  }
  $('goCamp').addEventListener('click', () => {
    audioInit();
    const sv = campSave();
    if (sv && !sv.done) { myChar = sv.char; showStory(sv.stage); return; }
    pendingMode = 'camp'; renderRoster(); renderPicks(); screen('select');
  });
  $('stGo').addEventListener('click', () => { audioInit(); goLandscape(); startCampStage(); });
  $('stMenu').addEventListener('click', () => { campLabel(); screen('title'); });

  // =====================================================================
  // Акаунт: вхід через email і збереження проходження на сервері (лише на власному хостингу з api/)
  // =====================================================================
  const API = 'api/game.php';
  let apiOk = false, sess = storage.get('duel3d.sess', null), saveT = 0, loginEmailVal = '';
  async function api(a, body) {
    const h = { 'Content-Type': 'application/json' };
    if (sess && sess.s) h.Authorization = 'Bearer ' + sess.s;
    const r = await fetch(API + '?a=' + a, { method: a === 'ping' ? 'GET' : 'POST', headers: h, body: a === 'ping' ? undefined : JSON.stringify(body || {}), cache: 'no-store', credentials: 'same-origin' });
    let j = null; try { j = await r.json(); } catch (e) { j = null; }
    if (!j) throw new Error('HTTP ' + r.status);
    return j;
  }
  function gatherProgress() {
    return { camp: storage.get('duel3d.camp', null) || undefined, champs: storage.get('duel3d.champs', []), char: myChar, lang, arena: storage.get('duel3d.arena', 'random'), diff: storage.get('duel3d.diff', 1), nick: storage.get('duel.nick', '') };
  }
  const campScore = c => !c ? -1 : c.done ? 1000 : (c.stage || 0);
  // поєднує прогрес із сервера з локальним: беремо далі пройдену кампанію, об’єднуємо чемпіонів
  function mergeProgress(p) {
    if (!p) return;
    const lc = storage.get('duel3d.camp', null);
    if (p.camp && campScore(p.camp) > campScore(lc)) origSet('duel3d.camp', p.camp);
    const ch = new Set([...(storage.get('duel3d.champs', []) || []), ...(p.champs || [])]);
    origSet('duel3d.champs', [...ch]);
    if (p.char && FIGHTERS.some(f => f.id === p.char)) { myChar = p.char; origSet('duel.char', myChar); }
    if (p.nick && !storage.get('duel.nick', '')) { origSet('duel.nick', p.nick); $('nick').value = p.nick; }
    if (p.arena) { arenaChoice = p.arena; origSet('duel3d.arena', p.arena); }
    if (p.diff !== undefined) { diffChoice = p.diff; origSet('duel3d.diff', p.diff); }
    if (p.lang && p.lang !== lang && LANGS[p.lang]) setLang(p.lang);
    campLabel();
  }
  function cloudSave(now) {
    if (!apiOk || !sess) return;
    clearTimeout(saveT);
    saveT = setTimeout(async () => {
      try {
        const j = await api('save', { progress: gatherProgress() });
        if (!j.ok && j.error === 'auth') { sess = null; origSet('duel3d.sess', null); acctRender(); }
      } catch (e) { /* немає мережі — збережемо наступного разу */ }
    }, now ? 10 : 1500);
  }
  // кожна зміна важливих ключів сховища — автоматично в хмару
  const SYNC_KEYS = new Set(['duel3d.camp', 'duel3d.champs', 'duel.char', 'duel3d.lang', 'duel3d.arena', 'duel3d.diff', 'duel.nick']);
  const origSet = storage.set.bind(storage);
  storage.set = (k, v) => { origSet(k, v); if (SYNC_KEYS.has(k)) cloudSave(); };
  function acctRender() {
    const box = $('acct'); if (!box) return;
    box.hidden = !apiOk;
    if (!apiOk) return;
    $('goLogin').textContent = sess ? t('login.out') : t('login.btn');
    $('acctTxt').hidden = !sess;
    $('acctTxt').textContent = sess ? t('login.as', { e: sess.e }) : '';
  }
  function loginDone(j) {
    sess = { s: j.session, e: j.email };
    origSet('duel3d.sess', sess);
    mergeProgress(j.progress);
    acctRender();
    cloudSave(true);
  }
  function loginMsg(m) { $('loginMsg').textContent = m || ''; }
  function loginErr(j) {
    const e = j && j.error;
    loginMsg(e === 'bad_email' ? t('login.badEmail') : e === 'too_soon' || e === 'too_many' ? t('login.wait') : e === 'bad_code' ? t('login.bad') : t('login.err', { e: e || '?' }));
  }
  function openLogin() {
    $('loginForm1').hidden = false; $('loginForm2').hidden = true; loginMsg('');
    $('loginEmail').value = loginEmailVal || ''; $('loginCode').value = '';
    screen('login');
    setTimeout(() => $('loginEmail').focus(), 50);
  }
  $('goLogin').addEventListener('click', async () => {
    if (!sess) { openLogin(); return; }
    try { await api('logout', {}); } catch (e) { /* ігноруємо */ }
    sess = null; origSet('duel3d.sess', null); acctRender();
  });
  $('loginBack').addEventListener('click', () => screen('title'));
  $('loginForm1').addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('loginEmail').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { loginMsg(t('login.badEmail')); return; }
    $('loginSend').disabled = true; loginMsg('…');
    try {
      const j = await api('request', { email, lang });
      if (!j.ok) { loginErr(j); return; }
      loginEmailVal = email;
      $('loginForm1').hidden = true; $('loginForm2').hidden = false;
      $('loginSent').textContent = t('login.sent', { e: email }); loginMsg('');
      setTimeout(() => $('loginCode').focus(), 50);
    } catch (err) { loginMsg(t('login.err', { e: err.message })); }
    finally { $('loginSend').disabled = false; }
  });
  $('loginCode').addEventListener('input', () => {
    const v = $('loginCode').value.replace(/\D/g, '').slice(0, 6);
    $('loginCode').value = v;
    if (v.length === 6) $('loginForm2').requestSubmit();
  });
  $('loginForm2').addEventListener('submit', async e => {
    e.preventDefault();
    const code = $('loginCode').value.replace(/\D/g, '');
    if (code.length !== 6) { loginMsg(t('login.bad')); return; }
    $('loginVerify').disabled = true; loginMsg('…');
    try {
      const j = await api('verify', { email: loginEmailVal, code });
      if (!j.ok) { loginErr(j); return; }
      loginDone(j); screen('title'); toast(t('login.ok'));
    } catch (err) { loginMsg(t('login.err', { e: err.message })); }
    finally { $('loginVerify').disabled = false; }
  });
  async function initAccount() {
    if (window.duelDesktop || window.claude || location.protocol === 'file:') return;
    try { const j = await api('ping'); apiOk = !!(j && j.ok); } catch (e) { apiOk = false; }
    if (!apiOk) return;
    // на власному хостингу онлайн-кімнат Claude немає — лишаємо гру з комп’ютером, удвох і проходження
    if (!window.claude) { $('goOnline').hidden = true; $('goQr').parentElement.hidden = true; }
    const qs = new URLSearchParams(location.search), tok = qs.get('login');
    if (tok) {
      qs.delete('login');
      history.replaceState(null, '', location.pathname + (qs.toString() ? '?' + qs : '') + location.hash);
      try {
        const j = await api('verify', { token: tok });
        if (j.ok) { loginDone(j); toast(t('login.ok')); } else toast(t('login.bad'));
      } catch (e) { toast(t('login.err', { e: e.message })); }
    } else if (sess) {
      try {
        const j = await api('me', {});
        if (j.ok) { sess.e = j.email; mergeProgress(j.progress); cloudSave(); }
        else if (j.error === 'auth') { sess = null; origSet('duel3d.sess', null); }
      } catch (e) { /* офлайн — лишаємо локальний прогрес */ }
    }
    acctRender();
  }


  // =====================================================================
  // Завантаження й цикл
  // =====================================================================
  const MODEL_FILES = { xbot: 'models/xbot.json', soldier: 'models/soldier.json', michelle: 'models/michelle.json', lps: 'models/lps.json' };
  // Модель зберігається як glTF JSON із вбудованим буфером. Збираємо GLB у пам’яті,
  // а текстури розпаковуємо самі: без адрес data: і blob:, які пісочниця може блокувати
  function b64bytes(b64) {
    const s = atob(b64), out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  async function fetchText(url, onProg) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status + ' для ' + url);
    if (!res.body || !res.body.getReader) return res.text();
    const rd = res.body.getReader(), parts = []; let got = 0;
    for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.length; onProg(got); }
    const all = new Uint8Array(got); let o = 0; for (const p of parts) { all.set(p, o); o += p.length; }
    return new TextDecoder().decode(all);
  }
  async function loadModel(url, onProg) {
    const j = JSON.parse(await fetchText(url, onProg));
    const bin = b64bytes(j.buffers[0].uri.slice(j.buffers[0].uri.indexOf(',') + 1));
    const images = j.images || [], textures = j.textures || [];
    const want = [];
    const take = (mat, ref, slot, srgb) => { if (ref && textures[ref.index]) want.push({ mat: mat.name, slot, srgb, img: textures[ref.index].source }); };
    for (const m of j.materials || []) {
      const p = m.pbrMetallicRoughness || {};
      take(m, p.baseColorTexture, 'map', true); delete p.baseColorTexture;
      take(m, p.metallicRoughnessTexture, 'mr', false); delete p.metallicRoughnessTexture;
      take(m, m.normalTexture, 'normalMap', false); delete m.normalTexture;
      take(m, m.emissiveTexture, 'emissiveMap', true); delete m.emissiveTexture;
      delete m.occlusionTexture;
      if (m.extensions) { delete m.extensions.KHR_materials_specular; }
    }
    delete j.textures; delete j.images; delete j.samplers;
    if (j.extensionsUsed) j.extensionsUsed = j.extensionsUsed.filter(e => e !== 'KHR_materials_specular');
    delete j.buffers[0].uri; j.buffers[0].byteLength = bin.length;
    // збираємо GLB
    let js = new TextEncoder().encode(JSON.stringify(j));
    const jl = Math.ceil(js.length / 4) * 4, bl = Math.ceil(bin.length / 4) * 4;
    const glb = new Uint8Array(12 + 8 + jl + 8 + bl), dv = new DataView(glb.buffer);
    dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, glb.length, true);
    dv.setUint32(12, jl, true); dv.setUint32(16, 0x4E4F534A, true);
    glb.fill(0x20, 20, 20 + jl); glb.set(js, 20);
    dv.setUint32(20 + jl, bl, true); dv.setUint32(24 + jl, 0x004E4942, true);
    glb.set(bin, 28 + jl);
    js = null;
    const gltf = await new Promise((res, rej) => new GLTFLoader().parse(glb.buffer, '', res, rej));
    // текстури
    const tex = {};
    await Promise.all([...new Set(want.map(w => w.img))].map(async i => {
      const im = images[i], bv = j.bufferViews[im.bufferView];
      const bytes = bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
      try {
        const bmp = await createImageBitmap(new Blob([bytes], { type: im.mimeType || 'image/png' }));
        const t = new THREE.Texture(bmp); t.flipY = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true;
        t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        tex[i] = t;
      } catch (e) { console.warn('texture', e); }
    }));
    gltf.scene.traverse(o => {
      if (!o.isMesh) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        for (const w of want) {
          if (w.mat !== m.name || !tex[w.img]) continue;
          const t = tex[w.img];
          if (w.slot === 'mr') { m.metalnessMap = t; m.roughnessMap = t; }
          else { if (w.srgb) t.colorSpace = THREE.SRGBColorSpace; m[w.slot] = t; if (w.slot === 'map') m.color.setRGB(1, 1, 1); }
          m.needsUpdate = true;
        }
      }
    });
    return gltf;
  }
  async function loadModels() {
    const prog = {}, total = { xbot: 3797328, soldier: 2763029, michelle: 4333805, lps: 539335 };
    const show = () => {
      const got = Object.keys(total).reduce((a, k) => a + Math.min(prog[k] || 0, total[k]), 0);
      const all = Object.values(total).reduce((a, b) => a + b, 0);
      $('loadBar').style.width = Math.round(got / all * 100) + '%';
    };
    await Promise.all(Object.entries(MODEL_FILES).map(async ([k, url]) => {
      GL[k] = await loadModel(new URL(url, document.baseURI).href, n => { prog[k] = n; show(); });
      prog[k] = total[k]; show();
    }));
    // текстури скану голови: читаємо самі, без адрес blob:
    const img = async (url, srgb) => {
      try {
        const res = await fetch(new URL(url, document.baseURI).href); if (!res.ok) throw new Error(res.status);
        const t = new THREE.Texture(await createImageBitmap(await res.blob())); t.flipY = false; t.needsUpdate = true;
        t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
      } catch (e) { console.warn('head texture', e); return null; }
    };
    [TEX.lpsCol, TEX.lpsNrm] = await Promise.all([img('models/lps_col.jpg', true), img('models/lps_nrm.jpg', false)]);
  }
  function loop(t) {
    const rdt = Math.min(0.05, Math.max(0, (t - last) / 1000));
    last = t;
    try {
      update(rdt);
      renderWorld(rdt);
    } catch (e) { console.error(e); }
    requestAnimationFrame(loop);
  }
  window.addEventListener('resize', resize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
  resize();
  window.__duelBoot = true;
  try {
    await loadModels();
    $('loadTxt').textContent = t('load.arena');
    await new Promise(r => setTimeout(r, 30));
    setupTitle();
    try { portraits = renderPortraits(); } catch (e) { portraits = {}; }
    warmUp();
    $('loadBox').hidden = true;
    for (const id of ['goCamp', 'goOnline', 'goCpu', 'goQr', 'goCode', 'goLocal']) $(id).disabled = false;
    campLabel();
    if (window.duelDesktop) {
      $('goOnline').hidden = true; $('goQr').parentElement.hidden = true;
      const q = document.createElement('button'); q.className = 'btn'; q.type = 'button'; q.textContent = t('btn.exit'); q.dataset.i18n = 'btn.exit';
      q.addEventListener('click', () => window.duelDesktop.quit());
      $('goLocal').parentElement.after(q);
    }
    checkRotate();
    initAccount();
    if (pendingMode === 'code') { renderRoster(); renderPicks(); screen('select'); toast(t('code.friend')); }
    window.__ready = true;
  } catch (e) {
    console.error(e);
    $('loadTxt').textContent = t('load.failModels', { e: e && e.message ? e.message : String(e) });
  }
  last = performance.now();
  requestAnimationFrame(loop);
</script>
<script>
  // Якщо модуль не стартував (немає доступу до бібліотеки 3D), показуємо підказку
  setTimeout(function () {
    if (!window.__duelBoot) { var t = document.getElementById('loadTxt'); if (t) t.textContent = 'Не вдалося запустити 3D-рушій' + (window.__errs && window.__errs.length ? ': ' + window.__errs[0] : '. Перевір інтернет і онови сторінку.'); }
  }, 20000);
</script>
