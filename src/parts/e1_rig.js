
  // =====================================================================
  // 3D-скелет: інверсна кінематика поверх скелета Mixamo
  // =====================================================================
  const D2R = Math.PI / 180;
  const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3(), _v5 = new THREE.Vector3();
  const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _qT = new THREE.Quaternion();
  const _e1 = new THREE.Euler(0, 0, 0, 'YXZ');
  const boneKey = n => n.replace(/[^A-Za-z0-9]/g, '').replace(/^mixamorig\d*/, '');
  const qEuler = (p, y, r, out) => { _e1.set(p * D2R, y * D2R, r * D2R, 'YXZ'); return (out || new THREE.Quaternion()).setFromEuler(_e1); };

  // Повертає кістку у світових координатах на кватерніон R (premultiply у світі)
  function worldRot(bone, R) {
    bone.parent.getWorldQuaternion(_q1);
    _q2.copy(_q1).invert();
    bone.quaternion.premultiply(_q1).premultiply(R).premultiply(_q2);
  }
  // Повертає кістку так, щоб напрямок до дочірньої точки дивився на ціль
  function aimBone(bone, child, target) {
    bone.getWorldPosition(_v1); child.getWorldPosition(_v2);
    _v2.sub(_v1); const l = _v2.length(); if (l < 1e-6) return;
    _v2.divideScalar(l);
    _v3.copy(target).sub(_v1); const lt = _v3.length(); if (lt < 1e-6) return;
    _v3.divideScalar(lt);
    _qT.setFromUnitVectors(_v2, _v3);
    worldRot(bone, _qT);
    bone.updateMatrixWorld(true);
  }

  class Rig {
    constructor(gltf, def) {
      this.def = def;
      this.root = new THREE.Group();
      this.spinG = new THREE.Group(); this.root.add(this.spinG);
      this.tilt = new THREE.Group(); this.spinG.add(this.tilt);
      this.norm = new THREE.Group(); this.tilt.add(this.norm);
      const model = SkeletonUtils.clone(gltf.scene);
      this.model = model; this.norm.add(model);
      this.b = {};
      this.meshes = [];
      model.traverse(o => {
        if (o.isBone) this.b[boneKey(o.name)] = o;
        if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; this.meshes.push(o); }
      });
      // Матеріали: власні копії для підсвітки та прозорості
      this.mats = [];
      for (const m of this.meshes) {
        const src = Array.isArray(m.material) ? m.material : [m.material];
        const out = src.map(s => { const c = def.material ? def.material(s) : s.clone(); c.userData.baseEmissive = c.emissive ? c.emissive.clone() : null; c.userData.baseEI = c.emissiveIntensity || 1; this.mats.push(c); return c; });
        m.material = Array.isArray(m.material) ? out : out[0];
      }
      const B = this.b;
      // Нормалізація: дивиться в +Z, потрібний зріст
      this.root.updateMatrixWorld(true);
      const foot = new THREE.Vector3(), toe = new THREE.Vector3();
      B.LeftFoot.getWorldPosition(foot); B.LeftToeBase.getWorldPosition(toe);
      if (toe.z - foot.z < 0) this.norm.rotation.y = Math.PI;
      this.root.updateMatrixWorld(true);
      const head = new THREE.Vector3(); B.Head.getWorldPosition(head);
      const s = (def.height || 1.6) / head.y;
      this.norm.scale.setScalar(s);
      this.root.updateMatrixWorld(true);
      // Збереження пози прив’язки
      this.bones = Object.values(B);
      for (const o of this.bones) { o.userData.bq = o.quaternion.clone(); o.userData.bp = o.position.clone(); }
      const wq = o => o.getWorldQuaternion(new THREE.Quaternion());
      this.hipsQ = wq(B.Hips); this.headQ = wq(B.Head);
      this.footQ = { L: wq(B.LeftFoot), R: wq(B.RightFoot) };
      this.hip0 = B.Hips.getWorldPosition(new THREE.Vector3());
      this.ankle0 = B.LeftFoot.getWorldPosition(new THREE.Vector3()).y;
      this.k = this.hip0.y; // масштаб поз: пози задано для висоти стегон 1.0
      // Пальці: вісь згинання (світова Z у позі прив’язки)
      this.fingers = [];
      for (const [key, o] of Object.entries(B)) {
        const m = key.match(/^(Left|Right)Hand(Index|Middle|Ring|Pinky|Thumb)(\d)$/);
        if (!m) continue;
        const inv = wq(o).invert();
        const axis = (m[2] === 'Thumb' ? new THREE.Vector3(m[1] === 'Left' ? 1 : -1, 0, 0) : new THREE.Vector3(0, 0, 1)).applyQuaternion(inv).normalize();
        this.fingers.push({ o, axis, sign: m[1] === 'Left' ? -1 : 1, thumb: m[2] === 'Thumb', n: +m[3], spread: { Index: 0, Middle: 1, Ring: 2, Pinky: 3, Thumb: 0 }[m[2]] });
      }
      this.pt = new THREE.Vector3();
      this.alpha = 1; this.lit = 0; this.glow = 0;
    }
    // Ціль у просторі персонажа → світ
    toWorld(arr, out, yAdd) {
      const k = this.k;
      out.set(arr[0] * k, arr[1] * k + (yAdd || 0), arr[2] * k);
      return this.tilt.localToWorld(out);
    }
    dirWorld(arr, out) { out.set(arr[0], arr[1], arr[2]).normalize(); this.tilt.getWorldQuaternion(_q3); return out.applyQuaternion(_q3); }
    ik(a, b, c, target, pole) {
      a.getWorldPosition(_v1); b.getWorldPosition(_v2); c.getWorldPosition(_v3);
      const l1 = _v1.distanceTo(_v2), l2 = _v2.distanceTo(_v3);
      _v4.copy(target).sub(_v1);
      const dist = clamp(_v4.length(), Math.abs(l1 - l2) + 0.01, (l1 + l2) * 0.999);
      _v4.normalize();
      const x = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
      const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
      _v5.copy(pole).addScaledVector(_v4, -pole.dot(_v4));
      if (_v5.lengthSq() < 1e-6) _v5.set(0, 1, 0).addScaledVector(_v4, -_v4.y);
      _v5.normalize();
      const elbow = new THREE.Vector3().copy(_v1).addScaledVector(_v4, x).addScaledVector(_v5, h);
      const end = new THREE.Vector3().copy(_v1).addScaledVector(_v4, dist);
      aimBone(a, b, elbow);
      aimBone(b, c, end);
    }
    apply(P) {
      const B = this.b;
      for (const o of this.bones) { o.quaternion.copy(o.userData.bq); o.position.copy(o.userData.bp); }
      const sa = (P.spin || 0) * D2R, sh = this.hip0.y * 0.92;
      this.spinG.rotation.set(sa, 0, 0); this.spinG.position.set(0, sh - sh * Math.cos(sa), -sh * Math.sin(sa));
      this.tilt.rotation.set(P.tilt * D2R, (P.tw || 0) * D2R, 0, 'YXZ');
      this.tilt.position.set(0, P.lift * this.k, P.slide * this.k);
      this.root.updateMatrixWorld(true);
      const tq = this.tilt.getWorldQuaternion(new THREE.Quaternion());
      // Стегна
      const hp = this.toWorld([this.hip0.x / this.k + P.hip[0], this.hip0.y / this.k + P.hip[1], this.hip0.z / this.k + P.hip[2]], new THREE.Vector3());
      B.Hips.parent.worldToLocal(hp); B.Hips.position.copy(hp);
      const hq = tq.clone().multiply(qEuler(P.hr[0], P.hr[1], P.hr[2], _q3)).multiply(this.hipsQ);
      B.Hips.parent.getWorldQuaternion(_q1); B.Hips.quaternion.copy(_q1.invert().multiply(hq));
      B.Hips.updateMatrixWorld(true);
      // Хребет
      const fr = [0.3, 0.35, 0.35];
      ['Spine', 'Spine1', 'Spine2'].forEach((n, i) => {
        if (!B[n]) return;
        const R = tq.clone().multiply(qEuler(P.ch[0] * fr[i], P.ch[1] * fr[i], P.ch[2] * fr[i], _q3)).multiply(tq.clone().invert());
        worldRot(B[n], R);
      });
      B.Spine.updateMatrixWorld(true);
      // Голова дивиться вперед
      if (B.Head) {
        const want = tq.clone().multiply(qEuler(P.hd[0], P.hd[1] + P.hr[1] * 0.3 + P.ch[1] * 0.3, 0, _q3)).multiply(this.headQ);
        B.Head.parent.getWorldQuaternion(_q1); B.Head.quaternion.copy(_q1.invert().multiply(want));
        B.Head.updateMatrixWorld(true);
      }
      // Руки
      const t = new THREE.Vector3(), pole = new THREE.Vector3();
      this.ik(B.LeftArm, B.LeftForeArm, B.LeftHand, this.toWorld(P.lh, t), this.dirWorld(P.le, pole));
      this.ik(B.RightArm, B.RightForeArm, B.RightHand, this.toWorld(P.rh, t), this.dirWorld(P.re, pole));
      // Ноги
      this.ik(B.LeftUpLeg, B.LeftLeg, B.LeftFoot, this.toWorld(P.lf, t, this.ankle0), this.dirWorld(P.lk, pole));
      this.ik(B.RightUpLeg, B.RightLeg, B.RightFoot, this.toWorld(P.rf, t, this.ankle0), this.dirWorld(P.rk, pole));
      // Стопи пласко на землі (якщо нога не в ударі)
      for (const [side, arr, yaw] of [['L', P.lf, P.fy[0]], ['R', P.rf, P.fy[1]]]) {
        if (arr[1] > 0.3) continue;
        const f = B[side === 'L' ? 'LeftFoot' : 'RightFoot'];
        const want = tq.clone().multiply(qEuler(0, yaw, 0, _q3)).multiply(this.footQ[side]);
        f.parent.getWorldQuaternion(_q1); f.quaternion.copy(_q1.invert().multiply(want));
      }
      // Поворот зап’ястя навколо передпліччя
      for (const [hand, fore, w, s] of [[B.LeftHand, B.LeftForeArm, P.lw, 1], [B.RightHand, B.RightForeArm, P.rw, -1]]) {
        if (!w) continue;
        hand.getWorldPosition(_v1); fore.getWorldPosition(_v2);
        _v1.sub(_v2).normalize();
        worldRot(hand, _qT.setFromAxisAngle(_v1, w * D2R * s));
      }
      // Пальці: кулак або розслаблена кисть, мізинець згинається сильніше
      const curl = Math.max(P.fist, 0.22);
      for (const fg of this.fingers) {
        const k = fg.thumb ? (fg.n === 1 ? 0.35 : 0.7) : (fg.n === 1 ? 1.25 : fg.n === 2 ? 1.55 : 1.2) * (1 + fg.spread * 0.12);
        fg.o.quaternion.multiply(_q1.setFromAxisAngle(fg.axis, curl * k * fg.sign));
      }
      this.root.updateMatrixWorld(true);
      // справжня голова (скан) іде за кісткою голови
      if (this.fakeHead) {
        B.Head.getWorldPosition(_v1); B.Head.getWorldQuaternion(_q2).multiply(this.headOffQ);
        this.root.worldToLocal(_v1); this.root.getWorldQuaternion(_q3).invert().multiply(_q2);
        this.fakeHead.position.copy(_v1); this.fakeHead.quaternion.copy(_q3);
        this.fakeHead.updateMatrixWorld(true);
      }
    }
    setLook(alpha, lit, glow) {
      if (alpha !== this.alpha) {
        this.alpha = alpha;
        for (const m of this.mats) { m.transparent = alpha < 0.999; m.opacity = alpha; m.depthWrite = alpha > 0.5; }
        this.root.visible = alpha > 0.02;
      }
      const L = Math.max(lit, glow);
      if (Math.abs(L - this.lit) > 0.01) {
        this.lit = L;
        for (const m of this.mats) if (m.emissive && m.userData.baseEmissive) {
          m.emissive.copy(m.userData.baseEmissive).lerp(glow > lit ? this.def.glowCol : HIT_COL, Math.min(1, L) * (glow > lit ? 0.28 : 0.45));
          m.emissiveIntensity = m.userData.baseEI + L * 0.25;
        }
      }
    }
    // замінює голову манекена на окремий об’єкт (скан справжньої голови)
    setHumanHead(obj) {
      const B = this.b;
      this.root.updateMatrixWorld(true);
      this.headOffQ = B.Head.getWorldQuaternion(new THREE.Quaternion()).invert();
      B.Head.scale.setScalar(0.001);
      this.root.add(obj); this.fakeHead = obj;
      obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material && !this.mats.includes(o.material)) { o.material.userData.baseEmissive = o.material.emissive ? o.material.emissive.clone() : null; o.material.userData.baseEI = o.material.emissiveIntensity || 1; this.mats.push(o.material); } } });
    }
    handWorld(side, out) { return this.b[side === 'L' ? 'LeftHand' : 'RightHand'].getWorldPosition(out); }
    footWorld(side, out) { return this.b[side === 'L' ? 'LeftFoot' : 'RightFoot'].getWorldPosition(out); }
    chestWorld(out) { return (this.b.Spine2 || this.b.Spine).getWorldPosition(out); }
  }
  const HIT_COL = new THREE.Color(1, 0.35, 0.2);
