
  // =====================================================================
  // Утиліти
  // =====================================================================
  const $ = id => document.getElementById(id);
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const now = () => Date.now();
  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  function hash2(x, y, s) {
    let h = (x * 374761393 + y * 668265263 + (s || 0) * 1442695041) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function vnoise(x, s) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash2(i, 0, s), hash2(i + 1, 0, s), u); }
  const storage = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* сховище недоступне */ } }
  };
  // =====================================================================
  // Бійці
  // =====================================================================
  const FIGHTERS = [
    { id: 'taras', name: 'Тарас', title: 'Булат, козак-характерник', speed: 1, hp: 100, dmg: 1, model: 'xbot', height: 1.64, glow: [1, 0.62, 0.18], head: 'lps', acc: 'taras', outfit: { coat: '#1d2f5c', trim: '#d6a83a', sash: '#b3201a', pants: '#a3241b', boots: '#2a1610', sleeve: '#efe8da' },
      skin: { body: [0.62, 0.42, 0.32], metal: 0, rough: 0.5, joint: [0.62, 0.42, 0.32], jointGlow: 0, jointMetal: 0, skin: true },
      special: { id: 'dash', name: 'Ривок', desc: 'Стрімкий наскок з ударом' },
      super: { id: 'rush', name: 'Вовчий шквал', desc: 'Серія з п’яти ударів, від якої не втекти' } },
    { id: 'olena', name: 'Олена', title: 'Буря, вулична чаклунка', speed: 1.12, hp: 92, dmg: 0.95, model: 'michelle', height: 1.54, glow: [1, 0.45, 0.12], acc: 'namysto',
      special: { id: 'fireball', name: 'Вогняна куля', desc: 'Кидає полум’я на відстань' },
      super: { id: 'lightning', name: 'Блискавка Перуна', desc: 'Удар блискавки з неба' } },
    { id: 'baron', name: 'Барон', title: 'Залізний легіонер', speed: 0.84, hp: 122, dmg: 1.15, model: 'soldier', height: 1.68, glow: [0.3, 0.85, 1], acc: 'plume',
      special: { id: 'charge', name: 'Таран', desc: 'Плечем уперед, збиває з ніг' },
      super: { id: 'quake', name: 'Землетрус', desc: 'Удар об землю, хвиля валить суперника' } },
    { id: 'voron', name: 'Ворон', title: 'Тіньовий убивця', speed: 1.2, hp: 88, dmg: 1.02, model: 'xbot', height: 1.62, glow: [1, 0.12, 0.2], head: 'lps', headTint: [0.84, 0.78, 0.74], eye: 0x5a0a0c, acc: 'hood',
      outfit: { coat: '#16161a', trim: '#6a0a12', sash: '#2a0a10', pants: '#121216', boots: '#0a0a0c', sleeve: '#1a1a20' },
      skin: { body: [0.045, 0.045, 0.055], metal: 0.25, rough: 0.45, joint: [0.045, 0.045, 0.055], jointGlow: 0, jointMetal: 0.25 },
      special: { id: 'dagger', name: 'Кинджал', desc: 'Кидає ніж у суперника' },
      super: { id: 'shadow', name: 'Тіньовий клинок', desc: 'Зникає в диму й б’є зі спини' } },
    { id: 'otaman', name: 'Отаман', title: 'Сивий отаман із шаблею', speed: 0.96, hp: 108, dmg: 1.08, model: 'xbot', height: 1.68, glow: [1, 0.72, 0.28], acc: 'cossack', head: 'lps', headTint: [0.95, 0.9, 0.86], outfit: { coat: '#7a0e14', trim: '#e0b84a', sash: '#d6a83a', pants: '#1e3a7a', boots: '#c8962e', long: true, sleeve: '#8a121a' },
      skin: { body: [0.42, 0.05, 0.07], metal: 0.05, rough: 0.7, joint: [0.42, 0.05, 0.07], jointGlow: 0, jointMetal: 0.1 },
      special: { id: 'charge', name: 'Козацький наскок', desc: 'Влітає плечем, збиває з ніг' },
      super: { id: 'rush', name: 'Шабельний вихор', desc: 'П’ять ударів шаблею поспіль' } },
    { id: 'mavka', name: 'Мавка', title: 'Лісова відьма', speed: 1.15, hp: 90, dmg: 0.98, model: 'michelle', height: 1.52, glow: [0.35, 1, 0.45], bolt: [0.4, 1, 0.5], tint: [0.42, 0.95, 0.55], acc: 'vinok',
      special: { id: 'fireball', name: 'Блудний вогник', desc: 'Зелений вогонь летить до суперника' },
      super: { id: 'lightning', name: 'Гнів лісу', desc: 'Зелені блискавки з неба' } },
    { id: 'lytsar', name: 'Чорний лицар', title: 'Володар цитаделі, фінальний бос', speed: 0.82, hp: 130, dmg: 1.12, model: 'soldier', height: 1.74, glow: [0.8, 0.2, 1], tint: [0.42, 0.38, 0.48], acc: 'horns',
      special: { id: 'dagger', name: 'Темний спис', desc: 'Метає спис через усю арену' },
      super: { id: 'quake', name: 'Темний розлам', desc: 'Земля розколюється хвилею' } }
  ];
  // блискавки Олени сині, хоч її аура вогняна
  FIGHTERS[1].bolt = [0.55, 0.7, 1];

  // Проходження: «Турнір семи арен»
  const CAMPAIGN = [
    { opp: 'olena', arena: 'zala', lvl: 0.12, title: 'Перший поєдинок', story: 'Про Турнір семи арен ходять легенди: хто переможе всіх чемпіонів, той кине виклик Чорному лицарю. У світлиці на тебе вже чекає Олена — вона перевірить, чи ти взагалі вмієш битися.' },
    { opp: 'mavka', arena: 'kurhan', lvl: 0.28, title: 'Курган на заході', story: 'Біля старого кургану Мавка стереже степ. Вона швидка й кидається зеленим вогнем. Тримай дистанцію коротко й не давай їй чаклувати.' },
    { opp: 'taras', arena: 'shynok', lvl: 0.4, title: 'Бійка в шинку', story: 'Тарас «Булат» не любить, коли хтось бере його чарку. У тісному шинку місця мало — блокуй і відповідай серіями.' },
    { opp: 'voron', arena: 'pidval', lvl: 0.52, title: 'Катакомби', story: 'Під містом, серед смолоскипів і ланцюгів, ховається Ворон. Він зникає в диму й б’є зі спини. Слухай кроки.' },
    { opp: 'baron', arena: 'porohy', lvl: 0.62, title: 'Гроза над порогами', story: 'Залізний легіонер Барон важкий, але кожен його удар збиває з ніг. Ухиляйся сальто і бий, коли він промахнувся.' },
    { opp: 'otaman', arena: 'tron', lvl: 0.74, title: 'Тронна зала', story: 'Сивий Отаман охороняє вхід до цитаделі. Колись він сам виграв турнір. Покажи йому, що виросла нова зміна.' },
    { opp: 'lytsar', arena: 'kuznia', lvl: 0.9, boss: true, title: 'Цитадель Чорного лицаря', story: 'Брама кузні розпечена до червоного. Чорний лицар чекає. У нього більше сил, ніж у будь-кого, — переможи його, і турнір твій.' }
  ];
  const fighterById = id => FIGHTERS.find(f => f.id === id) || FIGHTERS[0];

  // Звичайні удари: тривалість, вікно удару, дальність, шкода, відкидання, оглушення
  const MOVES = {
    p: { dur: 0.28, a0: 0.07, a1: 0.14, reach: 80, dmg: 5, kb: 60, stun: 0.24, name: 'Джеб' },
    p2: { dur: 0.34, a0: 0.09, a1: 0.16, reach: 86, dmg: 6, kb: 90, stun: 0.27, name: 'Прямий' },
    p3: { dur: 0.44, a0: 0.15, a1: 0.23, reach: 74, dmg: 9, kb: 170, stun: 0.38, name: 'Хук' },
    k: { dur: 0.46, a0: 0.16, a1: 0.26, reach: 102, dmg: 8, kb: 120, stun: 0.32, name: 'Нога' },
    p4: { dur: 0.52, a0: 0.17, a1: 0.26, reach: 74, dmg: 11, kb: 160, stun: 0.45, down: true, name: 'Апперкот' },
    k3: { dur: 0.56, a0: 0.19, a1: 0.31, reach: 110, dmg: 8, kb: 90, stun: 0.5, down: true, name: 'Підсічка' },
    k4: { dur: 0.64, a0: 0.27, a1: 0.37, reach: 110, dmg: 12, kb: 300, stun: 0.5, down: true, name: 'Гопак' },
    jp: { dur: 0.34, a0: 0.08, a1: 0.2, reach: 84, dmg: 6, kb: 80, stun: 0.26, name: 'Удар у стрибку' },
    k2: { dur: 0.5, a0: 0.18, a1: 0.28, reach: 112, dmg: 9, kb: 230, stun: 0.34, name: 'Поштовх' },
    h: { dur: 0.74, a0: 0.36, a1: 0.46, reach: 92, dmg: 14, kb: 260, stun: 0.5, down: true, name: 'Важкий' }
  };
  const SPECIAL_CD = 5, SUPER_CD = 15;
  const ROUND_TIME = 60, WIN_ROUNDS = 2;
  const ARENA = 1100, GROUND = 0, GRAV = 2600;

  // =====================================================================
  // Звук
  // =====================================================================
  let AC = null, master = null, sfxBus = null, musicBus = null, reverb = null, revSend = null, NOISE = null;
  let muted = !!storage.get('duel.muted', false), musicOn = storage.get('duel3d.music', true) !== false;
  function audioInit() {
    if (!AC) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      try {
        AC = new Ctor();
        master = AC.createGain(); master.gain.value = muted ? 0 : 0.9;
        const comp = AC.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
        master.connect(comp); comp.connect(AC.destination);
        sfxBus = AC.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
        musicBus = AC.createGain(); musicBus.gain.value = musicOn ? 0.42 : 0; musicBus.connect(master);
        // реверберація приміщення (згенерований імпульс)
        reverb = AC.createConvolver();
        const len = AC.sampleRate * 2.4, ir = AC.createBuffer(2, len, AC.sampleRate);
        for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
        reverb.buffer = ir; revSend = AC.createGain(); revSend.gain.value = 0.22; revSend.connect(reverb); reverb.connect(master);
        NOISE = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
        const nd = NOISE.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      } catch (e) { AC = null; return; }
    }
    if (AC.state === 'suspended') AC.resume().catch(() => {});
  }
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function env(g, t0, a, peak, d, sustain, rel) {
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * (sustain || 0.0005)), t0 + a + d);
    if (rel) g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d + rel);
  }
  function tone(f, dur, type, vol, to, delay, bus, when) {
    if (!AC || muted) return;
    const t0 = when !== undefined ? when : AC.currentTime + (delay || 0), o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0); if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    env(g, t0, 0.006, vol || 0.1, dur);
    o.connect(g); g.connect(bus || sfxBus); o.start(t0); o.stop(t0 + dur + 0.05);
    return g;
  }
  function noise(dur, vol, from, to, delay, q, type, bus, when) {
    if (!AC || muted || !NOISE) return;
    const t0 = when !== undefined ? when : AC.currentTime + (delay || 0);
    const s = AC.createBufferSource(); s.buffer = NOISE;
    const f = AC.createBiquadFilter(); f.type = type || 'bandpass'; f.Q.value = q || 1;
    f.frequency.setValueAtTime(from, t0); f.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    const g = AC.createGain(); env(g, t0, 0.004, vol, dur);
    s.connect(f); f.connect(g); g.connect(bus || sfxBus); s.start(t0, Math.random() * 1.5, dur + 0.05);
    return g;
  }
  // Голос бійця: пилка через дві форманти («ха!», «ух»)
  function voice(f0, dur, vol, fm1, fm2, drop) {
    if (!AC || muted) return;
    const t0 = AC.currentTime, o = AC.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f0 * (drop || 0.75), t0 + dur);
    const g = AC.createGain(); env(g, t0, 0.015, vol, dur);
    for (const [fr, q] of [[fm1, 6], [fm2, 8]]) { const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fr; bp.Q.value = q; o.connect(bp); bp.connect(g); }
    const br = AC.createBufferSource(); br.buffer = NOISE; const bf = AC.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = fm2; bf.Q.value = 2; const bg = AC.createGain(); env(bg, t0, 0.01, vol * 0.5, dur * 0.7);
    br.connect(bf); bf.connect(bg); bg.connect(sfxBus); br.start(t0, Math.random(), dur);
    g.connect(sfxBus); g.connect(revSend); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  const sfx = {
    whoosh(big) { noise(big ? 0.22 : 0.14, big ? 0.2 : 0.13, 2600, 500, 0, 0.9); },
    hit(heavy) {
      tone(heavy ? 130 : 170, heavy ? 0.22 : 0.13, 'sine', heavy ? 0.7 : 0.5, 42);
      noise(0.07, heavy ? 0.6 : 0.42, 1300, 700, 0, 1.2);
      noise(0.035, 0.32, 5200, 3000, 0, 0.7, 'highpass');
      if (heavy) { tone(70, 0.4, 'sine', 0.5, 28); noise(0.25, 0.25, 400, 80, 0.01, 0.8); }
      const g = noise(0.12, 0.08, 900, 300, 0.01); if (g) g.connect(revSend);
    },
    block() { tone(430, 0.07, 'triangle', 0.3, 280); noise(0.05, 0.3, 2600, 1800, 0, 2); tone(1900, 0.05, 'square', 0.04, 1200); },
    grunt(female, heavy) { voice(female ? rand(230, 270) : rand(115, 145), heavy ? 0.26 : 0.16, heavy ? 0.22 : 0.14, female ? 850 : 720, female ? 1350 : 1150, 0.82); },
    hurt(female) { voice(female ? rand(210, 250) : rand(95, 120), 0.24, 0.18, female ? 620 : 520, female ? 1050 : 880, 0.62); },
    crowd(power) {
      if (!AC || muted) return;
      const t0 = AC.currentTime, s = AC.createBufferSource(); s.buffer = NOISE;
      const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 0.6;
      const g = AC.createGain(); const p = 0.06 + power * 0.1;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(p, t0 + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.4);
      const lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = 7; lg.gain.value = p * 0.4; lfo.connect(lg); lg.connect(g.gain);
      s.connect(f); f.connect(g); g.connect(sfxBus); g.connect(revSend); s.start(t0, Math.random(), 1.5); lfo.start(t0); lfo.stop(t0 + 1.5);
    },
    jump() { noise(0.1, 0.07, 700, 300); },
    land() { tone(90, 0.1, 'sine', 0.25, 50); noise(0.08, 0.14, 320, 90); },
    special() { noise(0.4, 0.2, 400, 3000); tone(220, 0.4, 'sawtooth', 0.08, 660); },
    super() { tone(110, 1, 'sawtooth', 0.12, 55); noise(1, 0.25, 200, 4000); tone(440, 0.6, 'square', 0.05, 880, 0.2); const g = noise(1.2, 0.2, 300, 2500, 0, 0.6); if (g) g.connect(revSend); },
    thunder() { noise(1.2, 0.6, 2000, 60, 0, 0.5); tone(60, 1, 'sine', 0.4, 30); },
    quake() { noise(0.9, 0.6, 180, 40, 0, 0.6); tone(45, 0.9, 'sine', 0.5, 25); },
    thunderFar() { noise(1.6, 0.25, 900, 40, 0, 0.4); tone(48, 1.4, 'sine', 0.18, 28); },
    ko() { tone(80, 1.4, 'sine', 0.5, 30); noise(1.2, 0.4, 600, 50); const g = tone(523, 2.2, 'sine', 0.12); if (g) g.connect(revSend); },
    finisher() { if (!AC || muted) return; const t0 = AC.currentTime; const s = AC.createBufferSource(); s.buffer = NOISE; const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(200, t0); f.frequency.exponentialRampToValueAtTime(6000, t0 + 0.9); const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.0); s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t0, 0, 1.1); tone(55, 2.5, 'sine', 0.7, 30, 0.9); tone(196, 3, 'sine', 0.3, 0, 0.9); tone(98, 3, 'triangle', 0.25, 0, 0.9); noise(1.5, 0.5, 2000, 60, 0.9, 0.4); },
    gong() { const g = tone(196, 2, 'sine', 0.25); if (g) g.connect(revSend); tone(294, 2, 'sine', 0.12); tone(392, 1.5, 'sine', 0.06); },
    fight() { [0, 0.12, 0.24].forEach(d => noise(0.15, 0.4, 300, 60, d)); tone(330, 0.5, 'sawtooth', 0.1, 220, 0.3); }
  };

  // ---------------------------------------------------------------------
  // Музика: окремий процедурний трек для кожної арени
  // ---------------------------------------------------------------------
  const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], harm: [0, 2, 3, 5, 7, 8, 11], ukr: [0, 2, 3, 6, 7, 9, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phryg: [0, 1, 3, 5, 7, 8, 10] };
  const TRACKS = {
    title: { bpm: 80, root: 50, scale: 'harm', lead: 'bell', prog: [0, 5, 3, 4], drums: 'epic', pad: true, rev: 0.4, density: 0.35 },
    zala: { bpm: 118, root: 57, scale: 'ukr', lead: 'pluck', prog: [0, 3, 4, 0], drums: 'folk', bass: 'walk', rev: 0.25, density: 0.7 },
    tron: { bpm: 88, root: 48, scale: 'minor', lead: 'brass', prog: [0, 5, 2, 4], drums: 'timpani', pad: true, bass: 'long', rev: 0.45, density: 0.45 },
    shynok: { bpm: 152, root: 55, scale: 'ukr', lead: 'accordion', prog: [0, 3, 4, 0], drums: 'hopak', bass: 'oompah', rev: 0.18, density: 0.85 },
    pidval: { bpm: 68, root: 40, scale: 'phryg', lead: 'bell', prog: [0, 1, 0, 6], drums: 'heart', pad: true, bass: 'drone', rev: 0.55, density: 0.22, drips: true },
    kurhan: { bpm: 94, root: 50, scale: 'dorian', lead: 'flute', prog: [0, 6, 3, 4], drums: 'tom', bass: 'drone', pad: true, rev: 0.35, density: 0.5 },
    porohy: { bpm: 134, root: 41, scale: 'minor', lead: 'strings', prog: [0, 5, 6, 4], drums: 'battle', bass: 'ostinato', rev: 0.3, density: 0.6 },
    kuznia: { bpm: 112, root: 40, scale: 'phryg', lead: 'brass', prog: [0, 1, 5, 4], drums: 'anvil', bass: 'dist', rev: 0.3, density: 0.55 }
  };
  const music = { id: '', step: 0, next: 0, intense: false, seed: 1, mel: 4 };
  function setMusic(id) { if (music.id === id) return; music.id = id; music.step = 0; music.next = 0; music.mel = 4; if (revSend) revSend.gain.value = (TRACKS[id] || TRACKS.title).rev; }
  function deg(tr, d, oct) { const sc = SCALES[tr.scale], n = sc.length; const o = Math.floor(d / n); return tr.root + sc[((d % n) + n) % n] + 12 * (o + (oct || 0)); }
  function inst(kind, midi, t0, dur, vol) {
    const f = mtof(midi), bus = musicBus;
    const o = AC.createOscillator(), g = AC.createGain(), lp = AC.createBiquadFilter(); lp.type = 'lowpass';
    o.connect(lp); lp.connect(g); g.connect(bus); g.connect(revSend);
    o.frequency.setValueAtTime(f, t0);
    if (kind === 'pluck') { o.type = 'sawtooth'; lp.frequency.setValueAtTime(f * 8, t0); lp.frequency.exponentialRampToValueAtTime(f * 1.2, t0 + 0.25); env(g, t0, 0.004, vol, 0.45); }
    else if (kind === 'bell') { o.type = 'sine'; lp.frequency.value = 8000; env(g, t0, 0.005, vol, dur * 2.2); const o2 = AC.createOscillator(); o2.frequency.value = f * 2.76; const g2 = AC.createGain(); env(g2, t0, 0.003, vol * 0.3, 0.6); o2.connect(g2); g2.connect(bus); o2.start(t0); o2.stop(t0 + 0.8); }
    else if (kind === 'flute') { o.type = 'sine'; lp.frequency.value = 4000; const v = AC.createOscillator(), vg = AC.createGain(); v.frequency.value = 5.5; vg.gain.value = f * 0.012; v.connect(vg); vg.connect(o.frequency); v.start(t0); v.stop(t0 + dur + 0.3); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.08); g.gain.setValueAtTime(vol, t0 + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.15); }
    else if (kind === 'brass') { o.type = 'sawtooth'; lp.frequency.setValueAtTime(f * 1.5, t0); lp.frequency.linearRampToValueAtTime(f * 5, t0 + 0.12); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.06); g.gain.setValueAtTime(vol * 0.8, t0 + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.1); }
    else if (kind === 'accordion') { o.type = 'square'; lp.frequency.value = f * 4; const o2 = AC.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = f * 1.006; o2.connect(lp); o2.start(t0); o2.stop(t0 + dur + 0.1); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol * 0.6, t0 + 0.02); g.gain.setValueAtTime(vol * 0.5, t0 + dur * 0.85); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.05); }
    else if (kind === 'strings') { o.type = 'sawtooth'; lp.frequency.value = f * 3; env(g, t0, 0.01, vol, dur * 0.9); }
    else if (kind === 'pad') { o.type = 'sawtooth'; lp.frequency.value = 900; const o2 = AC.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = f * 1.008; o2.connect(lp); o2.start(t0); o2.stop(t0 + dur + 0.6); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.5); }
    else if (kind === 'bass') { o.type = 'triangle'; lp.frequency.value = 600; env(g, t0, 0.005, vol, dur * 0.9); }
    else if (kind === 'dist') { o.type = 'sawtooth'; lp.frequency.setValueAtTime(1800, t0); lp.frequency.exponentialRampToValueAtTime(300, t0 + dur); env(g, t0, 0.004, vol, dur); }
    o.start(t0); o.stop(t0 + dur + 0.7);
  }
  function drum(kind, t0, vol) {
    const B = musicBus;
    if (kind === 'kick') { tone(120, 0.25, 'sine', vol, 40, 0, B, t0); }
    else if (kind === 'snare') { noise(0.14, vol * 0.6, 2200, 900, 0, 0.8, 'bandpass', B, t0); tone(190, 0.08, 'triangle', vol * 0.4, 150, 0, B, t0); }
    else if (kind === 'hat') { noise(0.04, vol * 0.25, 8000, 6000, 0, 0.7, 'highpass', B, t0); }
    else if (kind === 'tam') { noise(0.09, vol * 0.3, 7000, 5000, 0, 1, 'bandpass', B, t0); noise(0.09, vol * 0.2, 9000, 7000, 0.04, 1, 'bandpass', B, t0 + 0.04); }
    else if (kind === 'tom') { tone(150, 0.3, 'sine', vol * 0.8, 90, 0, B, t0); noise(0.06, vol * 0.2, 900, 400, 0, 1, 'bandpass', B, t0); }
    else if (kind === 'timp') { tone(73, 0.8, 'sine', vol, 60, 0, B, t0); tone(110, 0.5, 'triangle', vol * 0.3, 90, 0, B, t0); }
    else if (kind === 'anvil') { for (const fr of [1180, 1650, 2410]) tone(fr, 0.4, 'square', vol * 0.05, fr * 0.995, 0, B, t0); noise(0.03, vol * 0.4, 6000, 4000, 0, 3, 'bandpass', B, t0); }
    else if (kind === 'drip') { tone(rand(1200, 2200), 0.12, 'sine', vol * 0.25, 600, 0, B, t0); }
  }
  const DRUMS = {
    epic: s => [s % 16 === 0 && 'timp', s % 16 === 10 && 'timp'],
    folk: s => [s % 8 === 0 && 'kick', s % 8 === 4 && 'tom', s % 2 === 1 && music.intense && 'tam'],
    timpani: s => [s % 8 === 0 && 'timp', s % 16 === 14 && 'timp', s % 4 === 2 && music.intense && 'snare'],
    hopak: s => [s % 4 === 0 && 'kick', s % 4 === 2 && 'snare', 'hat', s % 8 === 7 && 'tam'],
    heart: s => [(s % 16 === 0 || s % 16 === 3) && 'kick', music.intense && s % 8 === 4 && 'tom'],
    tom: s => [s % 8 === 0 && 'tom', s % 16 === 11 && 'tom', music.intense && s % 4 === 2 && 'hat'],
    battle: s => [(s % 4 === 0 || s % 16 === 10) && 'kick', s % 8 === 4 && 'snare', s % 2 === 0 && 'hat', s % 16 === 15 && 'tom'],
    anvil: s => [s % 8 === 0 && 'kick', s % 8 === 4 && 'anvil', s % 16 === 14 && 'anvil', music.intense && s % 2 === 1 && 'hat']
  };
  function musicUpdate(intense) {
    if (!AC || muted || !musicOn || AC.state !== 'running' || !music.id) return;
    const tr = TRACKS[music.id] || TRACKS.title;
    music.intense = intense;
    const stepDur = 60 / tr.bpm / 4;
    if (music.next < AC.currentTime) music.next = AC.currentTime + 0.05;
    while (music.next < AC.currentTime + 0.15) {
      const s = music.step % 16, bar = Math.floor(music.step / 16), t0 = music.next;
      const chord = tr.prog[bar % tr.prog.length];
      const iv = intense ? 1 : 0.75;
      for (const d of DRUMS[tr.drums](s)) if (d) drum(d, t0, (d === 'hat' ? 0.5 : 0.8) * iv);
      if (tr.drips && Math.random() < 0.06) drum('drip', t0, 0.6);
      // бас
      const bm = deg(tr, chord, -1);
      if (tr.bass === 'walk' && s % 4 === 0) inst('bass', bm + [0, 7, 3, 7][s / 4], t0, stepDur * 3.5, 0.28 * iv);
      else if (tr.bass === 'oompah' && s % 2 === 0) inst('bass', s % 4 === 0 ? bm : bm + 7, t0, stepDur * 1.5, 0.26 * iv);
      else if (tr.bass === 'long' && s === 0) inst('bass', bm, t0, stepDur * 15, 0.25);
      else if (tr.bass === 'drone' && s === 0) inst('pad', bm - 12, t0, stepDur * 16, 0.08);
      else if (tr.bass === 'ostinato' && s % 2 === 0) inst('strings', bm + [0, 0, 12, 0, 7, 0, 12, 3][s / 2], t0, stepDur * 1.6, 0.11 * iv);
      else if (tr.bass === 'dist' && (s % 4 === 0 || s % 16 === 6)) inst('dist', bm, t0, stepDur * 2.5, 0.12 * iv);
      // пед
      if (tr.pad && s === 0) for (const k of [0, 2, 4]) inst('pad', deg(tr, chord + k, 0), t0, stepDur * 16, 0.035);
      // мелодія: випадкове блукання по ладу навколо акорду
      const every = tr.lead === 'flute' || tr.lead === 'brass' ? 4 : 2;
      if (s % every === 0 && Math.random() < tr.density * (intense ? 1.1 : 0.85)) {
        music.mel = clamp(music.mel + pick([-2, -1, -1, 1, 1, 2, 0, 3, -3]), 0, 10);
        if (s === 0) music.mel = chord + pick([0, 2, 4, 7]);
        inst(tr.lead, deg(tr, music.mel, 1), t0, stepDur * every * (tr.lead === 'flute' || tr.lead === 'brass' ? 0.95 : 0.8), tr.lead === 'bell' ? 0.07 : tr.lead === 'flute' ? 0.08 : 0.07);
      }
      music.step++; music.next += stepDur;
    }
  }
  function musicTick(dt, intense) { musicUpdate(intense); }
