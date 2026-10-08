
  // =====================================================================
  // Онлайн: пошук суперника й синхронізація
  // =====================================================================
  const Net = {
    room: null, match: null, searching: false, oppPeer: null, oppInfo: null, oppState: null, oppRecv: 0, myPeer: null,
    unsubs: [], lastSend: 0, waitT: 0, gone: false,
    async connect() {
      if (this.room) return this.room;
      if (!window.claude || typeof window.claude.use !== 'function') return null;
      try { this.room = await window.claude.use('room'); } catch (e) { this.room = null; }
      return this.room;
    },
    // code: приватна кімната для бою за QR-кодом (порожньо — загальний пошук)
    async search(ch, nm, code) {
      const room = await this.connect();
      if (!room) return false;
      this.searching = true; this.oppPeer = null; this.oppState = null; this.gone = false;
      this.me = { ch, nm, code: code || '' };
      try {
        if (code && (!this.lobby || this.lobbyCode !== code)) {
          await this.leaveLobby();
          this.lobby = await room.join('duelq-' + code); this.lobbyCode = code;
        } else if (!code && this.lobby !== room) { await this.leaveLobby(); this.lobby = room; this.lobbyCode = ''; }
        await this.lobby.presence({ st: 'look', ch, nm, v: 3 });
      } catch (e) { return false; }
      if (!this.lobbyUnsub) this.lobbyUnsub = this.lobby.onPeers(ch2 => this.onLobby(ch2.peers), () => {});
      this.onLobby(this.lobby.peers());
      return true;
    },
    async leaveLobby() {
      if (this.lobbyUnsub) { try { this.lobbyUnsub(); } catch (e) { /* ігноруємо */ } this.lobbyUnsub = null; }
      if (this.lobby && this.lobby !== this.room) { try { await this.lobby.leave(); } catch (e) { /* ігноруємо */ } }
      this.lobby = null; this.lobbyCode = '';
    },
    onLobby(peers) {
      const meP = peers.find(p => p.isMe && p.sameTab);
      if (meP) this.myPeer = meP.peer;
      const looking = peers.filter(p => p.kind === 'viewer' && p.presence && p.presence.st === 'look' && p.presence.v === 3).sort((a, b) => (a.peer < b.peer ? -1 : 1));
      const online = peers.filter(p => p.kind === 'viewer').length;
      lobbyCount(online, looking.length);
      if (!this.searching || this.oppPeer || !this.myPeer) return;
      const i = looking.findIndex(p => p.peer === this.myPeer);
      if (i < 0) return;
      const j = i % 2 === 0 ? i + 1 : i - 1;
      const partner = looking[j];
      if (!partner) return;
      this.pair(partner);
    },
    async pair(partner) {
      this.oppPeer = partner.peer;
      const ps = partner.presence || {};
      this.oppInfo = { ch: FIGHTERS.some(f => f.id === ps.ch) ? ps.ch : 'taras', nm: typeof ps.nm === 'string' && ps.nm.trim() ? ps.nm.slice(0, 16) : t('opp') };
      const pairKey = [this.myPeer, partner.peer].sort().join('|');
      let h = 0; for (let i = 0; i < pairKey.length; i++) h = (Math.imul(h, 31) + pairKey.charCodeAt(i)) | 0;
      const name = 'duel-' + (this.me.code ? this.me.code + '-' : '') + (h >>> 0).toString(36);
      try {
        await this.lobby.presence({ st: 'busy', ch: this.me.ch, nm: this.me.nm, v: 3 });
        this.match = await this.room.join(name);
      } catch (e) { this.reset(); toast(t('net.retry')); this.search(this.me.ch, this.me.nm, this.me.code); return; }
      this.waitT = 12;
      this.unsubs.push(this.match.onPeers(c => this.onMatchPeers(c), () => this.lost()));
      this.unsubs.push(this.match.on('hit', m => this.onHit(m), () => {}));
      this.match.presence({ ch: this.me.ch, nm: this.me.nm, a: 'idle', t: 0, x: 0, y: 0, f: 1, hp: 100 }).catch(() => {});
      this.onMatchPeers({ peers: this.match.peers(), left: [] });
    },
    onMatchPeers(c) {
      if (c.left && c.left.some(p => p.peer === this.oppPeer)) { this.lost(); return; }
      const o = c.peers.find(p => p.peer === this.oppPeer);
      if (o && o.presence && typeof o.presence.x === 'number') {
        this.oppState = o.presence; this.oppRecv = performance.now();
        if (this.searching) { this.searching = false; onOnlineMatch(this.myPeer < this.oppPeer ? -1 : 1, this.oppInfo); }
      }
    },
    onHit(m) {
      if (m.sameTab || m.peer !== this.oppPeer || !m.data || m.data.to !== this.myPeer) return;
      const d = m.data.h || {};
      const h = { dmg: clamp(Number(d.dmg) || 0, 0, 40), kb: clamp(Number(d.kb) || 0, 0, 500), stun: clamp(Number(d.stun) || 0.2, 0, 1), down: !!d.down, unblockable: !!d.unblockable, id: 'r' + String(d.id).slice(0, 20), fromX: clamp(Number(d.fromX) || 0, -ARENA, ARENA), col: typeof d.col === 'string' && /^[0-9,]{5,11}$/.test(d.col) ? d.col : undefined, low: !!d.low, throw: !!d.throw, kind: typeof d.kind === 'string' && /^[a-zA-Z0-9]{1,10}$/.test(d.kind) ? d.kind : '' };
      onRemoteHit(h);
    },
    send(f, extra) {
      if (!this.match) return;
      const t = performance.now();
      if (t - this.lastSend < 33) return;
      this.lastSend = t;
      const st = { ch: f.ch, nm: this.me.nm, x: Math.round(f.x), y: Math.round(f.y), f: f.face, a: f.anim, t: Math.round(f.at * 1000) / 1000, hp: Math.round(f.hp * 10) / 10, mh: f.maxHp, cs: Math.max(0, Math.round(f.cdS * 10) / 10), cu: Math.max(0, Math.round(f.cdU * 10) / 10), al: Math.round(f.alpha * 100) / 100, w: f.wins };
      st.pj = f.proj ? [f.proj.k, Math.round(f.proj.x), Math.round(f.proj.y), f.proj.vx > 0 ? 1 : -1] : null;
      Object.assign(st, extra || {});
      this.match.presence(st).catch(() => {});
    },
    hit(h) {
      if (!this.match) return;
      this.match.emit('hit', { to: this.oppPeer, h: { dmg: h.dmg, kb: h.kb, stun: h.stun, down: h.down, unblockable: !!h.unblockable, id: h.id, fromX: Math.round(h.fromX), col: h.col, low: !!h.low, throw: !!h.throw, kind: h.kind } }).catch(() => {});
    },
    tick(dt) {
      if (this.match && this.searching) { this.waitT -= dt; if (this.waitT <= 0) { const me = this.me; this.leave().then(() => this.search(me.ch, me.nm, me.code)); } }
      if (this.match && !this.searching && this.oppRecv && performance.now() - this.oppRecv > 9000) this.lost();
    },
    lost() { if (this.gone || this.searching) return; this.gone = true; onOpponentLeft(); },
    async leave() {
      this.unsubs.forEach(u => { try { u(); } catch (e) { /* ігноруємо */ } }); this.unsubs = [];
      const m = this.match; this.match = null;
      this.oppPeer = null; this.oppState = null; this.oppRecv = 0;
      if (m) { try { await m.leave(); } catch (e) { /* ігноруємо */ } }
    },
    async stop() {
      this.searching = false;
      await this.leave();
      if (this.lobby && this.lobby !== this.room) await this.leaveLobby();
      if (this.room) this.room.presence({ st: 'idle', v: 3 }).catch(() => {});
    },
    reset() { this.oppPeer = null; this.match = null; }
  };
  sendHit = h => Net.hit(h);

  // Віддалений боєць: плавно доганяє останній стан
  function syncRemote(R, dt) {
    const s = Net.oppState;
    if (!s) return;
    const age = (performance.now() - Net.oppRecv) / 1000;
    const k = 1 - Math.exp(-dt * 18);
    R.x = lerp(R.x, clamp(Number(s.x) || 0, -ARENA, ARENA), k);
    R.y = lerp(R.y, clamp(Number(s.y) || 0, -800, 0), k);
    R.face = s.f === -1 ? -1 : 1;
    const a = typeof s.a === 'string' && (ANIM_DUR[s.a] || ['idle', 'walkF', 'walkB', 'jump', 'block', 'ko', 'win', 'down', 'getup', 'hit', 'hit2'].includes(s.a)) ? s.a : 'idle';
    const prev = R.at;
    if (a !== R.anim) { R.anim = a; R.at = (Number(s.t) || 0) + Math.min(age, 0.15); R.ghostAt = 0; }
    else R.at = Math.max(R.at + dt, (Number(s.t) || 0));
    R.prevAt = prev;
    const hp = clamp(Number(s.hp), 0, 200);
    if (!isNaN(hp)) { if (hp < R.hp - 0.5) R.lit = 1; R.hp = hp; }
    R.maxHp = clamp(Number(s.mh) || R.maxHp, 50, 200);
    R.cdS = Number(s.cs) || 0; R.cdU = Number(s.cu) || 0;
    R.alpha = clamp(Number(s.al ?? 1), 0, 1);
    if (Array.isArray(s.pj) && (s.pj[0] === 'fire' || s.pj[0] === 'dagger')) R.proj = { k: s.pj[0], x: Number(s.pj[1]) || 0, y: Number(s.pj[2]) || -120, vx: s.pj[3] > 0 ? 1 : -1, remote: true };
    else R.proj = null;
    if (R.lit > 0) R.lit = Math.max(0, R.lit - dt * 6);
  }
