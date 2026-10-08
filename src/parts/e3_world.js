
  // =====================================================================
  // Рендерер і постобробка
  // =====================================================================
  const SC = 1 / 120; // ігрова одиниця → метри
  const app = $('app'), cv = $('cv');
  let VW = 1, VH = 1;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || Math.min(window.screen.width, window.screen.height) < 600;
  let quality = storage.get('duel3d.q', isMobile ? 1 : 2);
  const Q_NAMES = ['низька', 'середня', 'висока', 'ультра'];
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: 'high-performance', stencil: false }); }
  catch (e) { window.__duelBoot = true; $('loadTxt').textContent = t('load.noWebgl'); throw e; }
  renderer.toneMapping = /[?&]tm=agx/.test(location.search) ? THREE.AgXToneMapping : THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 600);
  camera.position.set(0, 1.4, 7);
  const rtMain = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: isMobile ? 2 : 4 });
  const composer = new EffectComposer(renderer, rtMain);
  composer.addPass(new RenderPass(scene, camera));
  // затінення в кутах і щілинах (GTAO) та глибина різкості — для високої й ультра якості
  const gtao = new GTAOPass(scene, camera, 4, 4);
  gtao.updateGtaoMaterial({ radius: 0.32, distanceExponent: 1.6, thickness: 1.2, scale: 1.25, samples: 12 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 12 });
  gtao.blendIntensity = 0.9;
  composer.addPass(gtao);
  const bokeh = new BokehPass(scene, camera, { focus: 6, aperture: 0.0016, maxblur: 0.006 });
  composer.addPass(bokeh);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.55, 0.88);
  composer.addPass(bloom);
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: 0.03 }, uVig: { value: 0.42 }, uDark: { value: 0 }, uFlash: { value: 0 }, uAb: { value: 0 }, uSat: { value: 1.14 }, uSharp: { value: 0.3 }, uTexel: { value: new THREE.Vector2(1 / 1280, 1 / 720) }, uTint: { value: new THREE.Color(1, 1, 1) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uGrain, uVig, uDark, uFlash, uAb, uSat, uSharp; uniform vec2 uTexel; uniform vec3 uTint; varying vec2 vUv;
      void main(){
        vec2 d = vUv - 0.5; vec3 c;
        if (uAb > 0.0005) { vec2 o = d * uAb; c = vec3(texture2D(tDiffuse, vUv + o).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - o).b); }
        else c = texture2D(tDiffuse, vUv).rgb;
        if (uSharp > 0.0) {
          // підкреслення різкості (як CAS): посилює дрібні деталі
          vec3 n = texture2D(tDiffuse, vUv + vec2(0.0, uTexel.y)).rgb + texture2D(tDiffuse, vUv - vec2(0.0, uTexel.y)).rgb + texture2D(tDiffuse, vUv + vec2(uTexel.x, 0.0)).rgb + texture2D(tDiffuse, vUv - vec2(uTexel.x, 0.0)).rgb;
          c = max(c + (c - n * 0.25) * uSharp, 0.0);
        }
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(vec3(l), c, uSat) * uTint;
        float v = smoothstep(0.9, 0.25, length(d * vec2(1.0, 0.85)));
        c *= mix(1.0 - uVig, 1.0, v);
        c *= 1.0 - uDark * 0.7;
        c += uFlash * vec3(1.5, 1.6, 1.8);
        float gn = fract(sin(dot(vUv * 913.7 + uTime * 37.1, vec2(12.9898, 78.233))) * 43758.5453);
        c *= 1.0 + (gn - 0.5) * uGrain;
        gl_FragColor = vec4(c, 1.0);
      }`
  });
  composer.addPass(grade);
  composer.addPass(new OutputPass());
  const pmrem = new THREE.PMREMGenerator(renderer);

  function pixelRatio() { return Math.min(window.devicePixelRatio || 1, [0.85, 1.35, 2, 2.5][quality] || 1.35); }
  function applyQuality() {
    const pr = pixelRatio();
    renderer.setPixelRatio(pr); composer.setPixelRatio(pr);
    renderer.setSize(VW, VH, false); composer.setSize(VW, VH);
    bloom.enabled = quality > 0;
    gtao.enabled = quality >= 2 && !/[?&]noao/.test(location.search);
    bokeh.enabled = quality >= 2 && !/[?&]nodof/.test(location.search);
    grade.uniforms.uSharp.value = quality >= 2 ? 0.32 : quality === 1 ? 0.18 : 0;
    grade.uniforms.uTexel.value.set(1 / (VW * pr), 1 / (VH * pr));
    renderer.shadowMap.enabled = true;
    const sm = [1024, 1024, 2048, 4096][quality] || 1024; sun.shadow.mapSize.set(sm, sm); sun.shadow.radius = quality === 3 ? 5 : 3;
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    PS.forEach(p => { p.mat.uniforms.uScale.value = VH * pr / (2 * Math.tan(camera.fov * D2R / 2)); });
    const qb = $('qualBtn'); if (qb) qb.textContent = t('quality', { q: t('q.' + quality) });
  }
  function resize() {
    VW = Math.max(1, app.clientWidth); VH = Math.max(1, app.clientHeight);
    camera.aspect = VW / VH;
    if (VH > VW * 1.2) camera.setViewOffset(VW, VH, 0, VH * 0.1, VW, VH); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    applyQuality();
  }

  // =====================================================================
  // Процедурні текстури
  // =====================================================================
  function noise2(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return lerp(lerp(hash2(xi, yi, s), hash2(xi + 1, yi, s), u), lerp(hash2(xi, yi + 1, s), hash2(xi + 1, yi + 1, s), u), v);
  }
  // Тайловий шум (період p)
  function tnoise(x, y, p, s) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), m = a => ((a % p) + p) % p;
    return lerp(lerp(hash2(m(xi), m(yi), s), hash2(m(xi + 1), m(yi), s), u), lerp(hash2(m(xi), m(yi + 1), s), hash2(m(xi + 1), m(yi + 1), s), u), v);
  }
  function tfbm(x, y, p, oct, s) { let a = 0, amp = 0.5, f = 1; for (let i = 0; i < oct; i++) { a += tnoise(x * f, y * f, p * f, s + i * 7) * amp; amp *= 0.5; f *= 2; } return a; }
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function texFrom(canvas, srgb, rep) {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (rep) t.repeat.set(rep, rep);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    t.needsUpdate = true;
    return t;
  }
  // Нормаль з карти висот
  function normalFrom(H, N, str) {
    const c = mkCanvas(N, N), g = c.getContext('2d'), img = g.createImageData(N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const h = (xx, yy) => H[((yy + N) % N) * N + ((xx + N) % N)];
      const dx = (h(x + 1, y) - h(x - 1, y)) * str, dy = (h(x, y + 1) - h(x, y - 1)) * str;
      const l = Math.hypot(dx, dy, 1), i = (y * N + x) * 4;
      img.data[i] = (-dx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  // Кам’яна плитка: колір, нормаль, шорсткість
  function stoneTiles(opt) {
    const N = opt.size || 512, rows = opt.rows || 4, cols = opt.cols || 4, seed = opt.seed || 1;
    const H = new Float32Array(N * N);
    const col = mkCanvas(N, N), g = col.getContext('2d'), img = g.createImageData(N, N);
    const rough = mkCanvas(N, N), gr = rough.getContext('2d'), rimg = gr.createImageData(N, N);
    const base = opt.color, grout = opt.grout || 0.035;
    for (let y = 0; y < N; y++) {
      const ry = y / N * rows, row = Math.floor(ry), fy = ry - row;
      const off = (row % 2) * 0.5 * (opt.offset === undefined ? 1 : opt.offset);
      for (let x = 0; x < N; x++) {
        const rx = x / N * cols + off, cx = Math.floor(rx), fx = rx - cx;
        const cid = ((cx % cols) + cols) % cols;
        const tv = hash2(cid, row, seed);
        const edge = Math.min(fx, 1 - fx, fy * cols / rows, (1 - fy) * cols / rows);
        const n = tfbm(x / N * 8, y / N * 8, 8, 5, seed + 3);
        const n2 = tfbm(x / N * 32, y / N * 32, 32, 3, seed + 11);
        const inG = edge < grout ? 0 : Math.min(1, (edge - grout) * 30);
        const bevel = Math.min(1, (edge - grout) * 14);
        const h = inG * (0.55 + bevel * 0.25 + n * 0.25 + n2 * 0.08 + tv * 0.06);
        H[y * N + x] = h;
        const shadeV = (0.72 + tv * 0.3 + (n - 0.5) * 0.5 + (n2 - 0.5) * 0.18) * (0.35 + inG * 0.65);
        const i = (y * N + x) * 4;
        const tint = opt.tint ? (tv - 0.5) * opt.tint : 0;
        img.data[i] = clamp(base[0] * shadeV * (1 + tint) * 255, 0, 255);
        img.data[i + 1] = clamp(base[1] * shadeV * 255, 0, 255);
        img.data[i + 2] = clamp(base[2] * shadeV * (1 - tint) * 255, 0, 255);
        img.data[i + 3] = 255;
        const wet = opt.wet ? clamp((tfbm(x / N * 3, y / N * 3, 3, 3, seed + 21) - 0.45) * 4, 0, 1) : 0;
        const r = clamp((opt.rough || 0.8) - wet * 0.6 + (1 - inG) * 0.15 + (n2 - 0.5) * 0.15, 0.05, 1) * 255;
        rimg.data[i] = r; rimg.data[i + 1] = r; rimg.data[i + 2] = r; rimg.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0); gr.putImageData(rimg, 0, 0);
    return { map: texFrom(col, true), normalMap: texFrom(normalFrom(H, N, opt.bump || 6), false), roughnessMap: texFrom(rough, false) };
  }
  // Природна поверхня (ґрунт, скеля): шум
  function naturalTex(opt) {
    const N = opt.size || 256, seed = opt.seed || 5;
    const H = new Float32Array(N * N);
    const col = mkCanvas(N, N), g = col.getContext('2d'), img = g.createImageData(N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const n = tfbm(x / N * 6, y / N * 6, 6, 6, seed), n2 = tfbm(x / N * 24, y / N * 24, 24, 3, seed + 9);
      H[y * N + x] = n * 0.8 + n2 * 0.3;
      const i = (y * N + x) * 4;
      const a = clamp((n - 0.3) * 1.6, 0, 1), b = n2;
      for (let k = 0; k < 3; k++) img.data[i + k] = clamp((opt.c1[k] * (1 - a) + opt.c2[k] * a) * (0.75 + b * 0.5) * 255, 0, 255);
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return { map: texFrom(col, true), normalMap: texFrom(normalFrom(H, N, opt.bump || 4), false) };
  }
  // М’яка кругла пляма для спрайтів
  function glowTex() {
    const c = mkCanvas(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t;
  }
  const GLOW = glowTex();

  // =====================================================================
  // Небо
  // =====================================================================
  const SKY_VS = 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }';
  const SKY_FS = `
    uniform vec3 uTop, uMid, uHor, uBot, uSunDir, uSunCol, uCloudCol, uCloudDark;
    uniform float uSun, uCloud, uTime, uStars, uFlash, uCover;
    varying vec3 vDir;
    float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
    float fbm(vec2 p){ float a = 0.0, m = 0.5; for (int i = 0; i < 5; i++) { a += n2(p) * m; p = p * 2.03 + vec2(1.7, 9.2); m *= 0.5; } return a; }
    void main(){
      vec3 d = normalize(vDir); float h = d.y;
      vec3 c = mix(uHor, uMid, smoothstep(0.0, 0.22, h));
      c = mix(c, uTop, smoothstep(0.18, 0.85, h));
      if (h < 0.0) c = mix(uHor, uBot, smoothstep(0.0, -0.12, h));
      float sd = max(dot(d, normalize(uSunDir)), 0.0);
      c += uSunCol * (smoothstep(0.9993, 0.9997, sd) * uSun * 18.0 + pow(sd, 14.0) * 0.45 + pow(sd, 3.0) * 0.12);
      if (uStars > 0.0 && h > 0.0) { vec3 q = floor(d * 380.0); float s = h3(q); c += step(0.9975, s) * uStars * (0.6 + 0.4 * sin(uTime * 3.0 + s * 90.0)) * smoothstep(0.0, 0.25, h) * vec3(0.9, 0.95, 1.0) * 2.0; }
      vec2 uv = d.xz / max(0.06, h + 0.12);
      float n = fbm(uv * 0.55 + vec2(uTime * 0.006, uTime * 0.002));
      float n2v = fbm(uv * 1.6 - vec2(uTime * 0.01, 0.0));
      float cl = smoothstep(0.62 - uCover, 0.95 - uCover * 0.6, n * 0.75 + n2v * 0.35) * uCloud * smoothstep(-0.02, 0.12, h);
      vec3 lit = mix(uCloudDark, uCloudCol, clamp(n2v * 1.3 - 0.2, 0.0, 1.0)) + uSunCol * pow(sd, 5.0) * 0.6;
      c = mix(c, lit, cl);
      c += uFlash * vec3(0.7, 0.75, 0.95) * (0.4 + cl * 1.6);
      gl_FragColor = vec4(c, 1.0);
    }`;
  function makeSky(p) {
    const u = {
      uTop: { value: new THREE.Color(p.top) }, uMid: { value: new THREE.Color(p.mid) }, uHor: { value: new THREE.Color(p.hor) }, uBot: { value: new THREE.Color(p.bot) },
      uSunDir: { value: new THREE.Vector3().fromArray(p.sunDir).normalize() }, uSunCol: { value: new THREE.Color().fromArray(p.sunCol) },
      uCloudCol: { value: new THREE.Color(p.cloudCol) }, uCloudDark: { value: new THREE.Color(p.cloudDark) },
      uSun: { value: p.sun }, uCloud: { value: p.cloud }, uCover: { value: p.cover || 0 }, uTime: { value: 0 }, uStars: { value: p.stars || 0 }, uFlash: { value: 0 }
    };
    const m = new THREE.ShaderMaterial({ uniforms: u, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), m);
    mesh.renderOrder = -10; mesh.frustumCulled = false;
    return mesh;
  }

  // =====================================================================
  // Світло
  // =====================================================================
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.6);
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.castShadow = true;
  sun.shadow.camera.left = -6; sun.shadow.camera.right = 6; sun.shadow.camera.top = 5; sun.shadow.camera.bottom = -3;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 80;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
  const rim = new THREE.DirectionalLight(0xffffff, 1);
  const fill = new THREE.DirectionalLight(0xffffff, 0.4);
  scene.add(hemi, sun, sun.target, rim, rim.target, fill, fill.target);
  // Пул світла для ефектів: джерела створюються один раз і лише вмикаються.
  // Якщо додавати нові джерела під час бою, рушій перекомпільовує всі шейдери — це й давало фриз на суперударах.
  const FXL = [];
  for (let i = 0; i < 5; i++) { const L = new THREE.PointLight(0xffffff, 0, 10, 1.5); scene.add(L); FXL.push(L); }
  let fxlI = 0;
  function fxLight(col, intensity, dist, x, y, z) {
    const L = FXL[2 + (fxlI++ % 3)];
    L.color.copy(col); L.intensity = intensity; L.distance = dist; L.position.set(x, y, z);
    return L;
  }

  // =====================================================================
  // Частинки
  // =====================================================================
  const PART_VS = `attribute vec4 aCol; attribute float aSize; uniform float uScale; varying vec4 vC;
    void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / max(0.2, -mv.z); gl_Position = projectionMatrix * mv; vC = aCol; }`;
  const PART_FS = `uniform sampler2D uTex; varying vec4 vC; void main(){ float a = texture2D(uTex, gl_PointCoord).a; gl_FragColor = vec4(vC.rgb, vC.a * a); }`;
  class Particles {
    constructor(max, additive) {
      this.max = max; this.n = 0;
      this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 4); this.size = new Float32Array(max);
      this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.ml = new Float32Array(max);
      this.rgb = new Float32Array(max * 3); this.a0 = new Float32Array(max); this.s0 = new Float32Array(max); this.grow = new Float32Array(max);
      this.grav = new Float32Array(max); this.drag = new Float32Array(max); this.fin = new Float32Array(max); this.heat = new Float32Array(max);
      const g = new THREE.BufferGeometry();
      this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
      this.aCol = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
      this.aSize = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
      g.setAttribute('position', this.aPos); g.setAttribute('aCol', this.aCol); g.setAttribute('aSize', this.aSize);
      this.mat = new THREE.ShaderMaterial({ uniforms: { uScale: { value: 400 }, uTex: { value: GLOW } }, vertexShader: PART_VS, fragmentShader: PART_FS, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
      this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = additive ? 5 : 4;
      g.setDrawRange(0, 0);
      scene.add(this.pts);
    }
    emit(x, y, z, vx, vy, vz, life, size, r, gC, b, a, o) {
      if (this.n >= this.max) return;
      const i = this.n++;
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
      this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
      this.life[i] = life; this.ml[i] = life; this.s0[i] = size;
      this.rgb[i * 3] = r; this.rgb[i * 3 + 1] = gC; this.rgb[i * 3 + 2] = b; this.a0[i] = a;
      this.grow[i] = o && o.grow || 0; this.grav[i] = o && o.grav || 0; this.drag[i] = o && o.drag || 0; this.fin[i] = o && o.fin || 0; this.heat[i] = o && o.heat || 0;
    }
    update(dt) {
      let i = 0;
      while (i < this.n) {
        this.life[i] -= dt;
        if (this.life[i] <= 0) { this.copy(this.n - 1, i); this.n--; continue; }
        const k = Math.exp(-this.drag[i] * dt);
        this.vel[i * 3] *= k; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * k - this.grav[i] * dt; this.vel[i * 3 + 2] *= k;
        this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
        if (this.grav[i] > 0 && this.pos[i * 3 + 1] < 0.01) { this.pos[i * 3 + 1] = 0.01; this.vel[i * 3 + 1] *= -0.3; this.vel[i * 3] *= 0.6; this.vel[i * 3 + 2] *= 0.6; }
        const u = 1 - this.life[i] / this.ml[i];
        const fade = this.fin[i] > 0 ? Math.min(1, u / this.fin[i]) * (1 - u) : (1 - u) * (1 - u * 0.3);
        this.size[i] = this.s0[i] * (1 + this.grow[i] * u);
        const ht = this.heat[i] > 0 ? 1 - u * this.heat[i] : 1;
        this.col[i * 4] = this.rgb[i * 3]; this.col[i * 4 + 1] = this.rgb[i * 3 + 1] * ht; this.col[i * 4 + 2] = this.rgb[i * 3 + 2] * ht * ht;
        this.col[i * 4 + 3] = this.a0[i] * fade;
        i++;
      }
      this.pts.geometry.setDrawRange(0, this.n);
      this.aPos.needsUpdate = true; this.aCol.needsUpdate = true; this.aSize.needsUpdate = true;
    }
    copy(a, b) {
      if (a === b) return;
      for (const [arr, n] of [[this.pos, 3], [this.vel, 3], [this.rgb, 3], [this.col, 4]]) for (let k = 0; k < n; k++) arr[b * n + k] = arr[a * n + k];
      for (const arr of [this.size, this.life, this.ml, this.a0, this.s0, this.grow, this.grav, this.drag, this.fin, this.heat]) arr[b] = arr[a];
    }
    clear() { this.n = 0; this.pts.geometry.setDrawRange(0, 0); }
  }
  const PA = new Particles(2600, true), PN = new Particles(1400, false);
  const PS = [PA, PN];
  const parseCol = (s, d) => { const a = (s || d).split(',').map(Number); return [a[0] / 255, a[1] / 255, a[2] / 255]; };

  // Вогонь у точці
  function fireAt(x, y, z, s, dt, rate) {
    const n = Math.random() < (rate || 40) * dt % 1 ? Math.ceil((rate || 40) * dt) : Math.floor((rate || 40) * dt);
    for (let i = 0; i < n; i++) {
      PA.emit(x + rand(-0.12, 0.12) * s, y + rand(0, 0.08) * s, z + rand(-0.12, 0.12) * s, rand(-0.15, 0.15) * s, rand(0.8, 1.6) * s, rand(-0.15, 0.15) * s, rand(0.35, 0.7), rand(0.3, 0.55) * s, 3.2, 1.5, 0.45, 0.8, { grow: -0.6, fin: 0.12, heat: 1.1 });
    }
    if (Math.random() < dt * 8) PA.emit(x, y + 0.2 * s, z, rand(-0.3, 0.3), rand(1, 2), rand(-0.3, 0.3), rand(1, 2.2), 0.04, 4, 1.6, 0.4, 1, { drag: 0.5 });
    if (Math.random() < dt * 6) PN.emit(x, y + 0.6 * s, z, rand(-0.1, 0.1), rand(0.4, 0.8), 0, rand(1.5, 2.5), 0.5 * s, 0.06, 0.05, 0.05, 0.35, { grow: 2.5, fin: 0.3 });
  }

  // =====================================================================
  // Арени
  // =====================================================================
  const ARENAS = ['zala', 'tron', 'shynok', 'pidval', 'kurhan', 'porohy', 'kuznia'];
  const ARENA_NAME = new Proxy({}, { get: (o, k) => arenaName(k) });
  let arena = null, arenaId = '';
  const arenaCache = {};
  const stdMat = o => new THREE.MeshStandardMaterial(o);

  function displaceGeo(geo, amp, freq, seed, keepTop) {
    const p = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      if (keepTop && v.y > keepTop - 0.001) continue;
      const n = noise2(v.x * freq + v.z * 0.7 * freq, v.y * freq + seed, seed) - 0.5 + (noise2(v.x * freq * 3, v.z * freq * 3 + v.y, seed + 4) - 0.5) * 0.35;
      v.addScaledVector(v.clone().normalize(), n * amp);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  }
  function rockGeo(r, seed) { return displaceGeo(new THREE.IcosahedronGeometry(r, 3), r * 0.55, 1.4 / r, seed); }
  // Кам’яна баба
  function idol(mat) {
    const pts = [[0, 0], [0.34, 0], [0.34, 0.12], [0.28, 0.2], [0.3, 0.7], [0.36, 1.05], [0.3, 1.4], [0.2, 1.52], [0.24, 1.7], [0.2, 1.9], [0.08, 1.98], [0, 2]].map(([x, y]) => new THREE.Vector2(x, y));
    const m = new THREE.Mesh(displaceGeo(new THREE.LatheGeometry(pts, 14), 0.06, 4, 3), mat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  // Трава: інстанси з гойданням
  function grassField(count, area, colA, colB) {
    const c = mkCanvas(64, 128), g = c.getContext('2d');
    for (let i = 0; i < 26; i++) {
      const x = 4 + Math.random() * 56, h = 60 + Math.random() * 66, bend = rand(-14, 14);
      const gr = g.createLinearGradient(0, 128, 0, 128 - h); gr.addColorStop(0, '#6b5428'); gr.addColorStop(1, Math.random() < 0.5 ? '#f2d58e' : '#d8bb72');
      g.strokeStyle = gr; g.lineWidth = rand(1.5, 3); g.beginPath(); g.moveTo(x, 128); g.quadraticCurveTo(x + bend * 0.3, 128 - h * 0.5, x + bend, 128 - h); g.stroke();
    }
    const tex = texFrom(c, true); tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    const geo = new THREE.PlaneGeometry(0.8, 0.5); geo.translate(0, 0.25, 0);
    const g2 = new THREE.PlaneGeometry(0.8, 0.5); g2.rotateY(Math.PI / 2); g2.translate(0, 0.25, 0);
    const merged = mergeGeos([geo, g2]);
    const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 1, color: colA, emissive: new THREE.Color(0x4a3010), emissiveIntensity: 0.6 });
    const uTime = { value: 0 };
    mat.onBeforeCompile = sh => {
      sh.uniforms.uTime = uTime;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float sw = sin(uTime * 1.7 + wp.x * 0.35 + wp.z * 0.2) * 0.5 + sin(uTime * 3.1 + wp.x * 0.9) * 0.2;
        transformed.x += sw * position.y * 0.25; transformed.z += sw * position.y * 0.1;`);
    };
    const im = new THREE.InstancedMesh(merged, mat, count);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
    let n = 0, guard = 0;
    while (n < count && guard++ < count * 20) {
      const x = rand(-area, area), z = rand(-area, 8);
      if (Math.abs(x) < 7.5 && z > -7.5) continue;
      if (z > 1.5 && Math.abs(x) < 18) continue;
      p.set(x, 0, z); e.set(0, rand(0, TAU), 0); q.setFromEuler(e); const sc = rand(0.7, 1.5); s.set(sc, sc * rand(0.8, 1.3), sc);
      m4.compose(p, q, s); im.setMatrixAt(n, m4);
      im.setColorAt(n, new THREE.Color(colA).lerp(new THREE.Color(colB), Math.random()));
      n++;
    }
    im.count = n;
    im.receiveShadow = true;
    im.userData.uTime = uTime;
    return im;
  }
  function mergeGeos(list) {
    let total = 0; for (const g of list) total += g.attributes.position.count;
    const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uv = new Float32Array(total * 2), idx = [];
    let o = 0;
    for (const g of list) {
      pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); uv.set(g.attributes.uv.array, o * 2);
      for (const i of g.index.array) idx.push(i + o);
      o += g.attributes.position.count;
    }
    const m = new THREE.BufferGeometry();
    m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    m.setIndex(idx);
    return m;
  }
  function torch(x, z, h, col) {
    const g = new THREE.Group();
    const wood = stdMat({ color: 0x3a2516, roughness: 0.9 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, h, 8), wood); pole.position.y = h / 2; pole.castShadow = true;
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.08, 0.22, 10, 1, true), stdMat({ color: 0x2a2a2a, metalness: 0.8, roughness: 0.4, side: THREE.DoubleSide })); cup.position.y = h + 0.05;
    g.add(pole, cup); g.position.set(x, 0, z);
    const L = new THREE.PointLight(col || 0xff8a3a, 6, 10, 1.6); L.position.set(x, h + 0.4, z);
    return { g, L, fx: [x, h + 0.12, z], base: 6 };
  }
  function brazier(x, z, mat) {
    const g = new THREE.Group();
    const bowl = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.45, 0.05], [0.55, 0.3], [0.5, 0.34], [0, 0.2]].map(a => new THREE.Vector2(a[0], a[1])), 16), mat);
    bowl.position.y = 0.9; bowl.castShadow = true;
    for (let i = 0; i < 3; i++) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.05, 6), mat); const a = i / 3 * TAU; leg.position.set(Math.cos(a) * 0.3, 0.48, Math.sin(a) * 0.3); leg.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25); leg.castShadow = true; g.add(leg); }
    const coal = new THREE.Mesh(new THREE.CircleGeometry(0.47, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.8, 0.15) })); coal.rotation.x = -Math.PI / 2; coal.position.y = 1.15;
    g.add(bowl, coal); g.position.set(x, 0, z);
    const L = new THREE.PointLight(0xff7a2a, 9, 12, 1.5); L.position.set(x, 1.9, z);
    return { g, L, fx: [x, 1.18, z], base: 9 };
  }

  function buildKurhan() {
    const A = { group: new THREE.Group(), fires: [], lights: [] };
    A.sky = makeSky({ top: '#1d2c52', mid: '#a4543a', hor: '#ffad66', bot: '#3a2a20', sunDir: [-0.55, 0.05, -1], sunCol: [1.6, 0.85, 0.4], sun: 1, cloud: 0.85, cover: 0.05, cloudCol: '#ffb27a', cloudDark: '#5a3046' });
    A.fog = new THREE.Fog(0xd08458, 22, 150);
    A.env = { exposure: 1.0, hemi: [0xffcf9e, 0x3a2a1c, 0.55], sun: [0xffb070, 3.2, [-14, 7, -22]], rim: [0xffa060, 2.2, [-6, 4, -10]], fill: [0x8aa0ff, 0.5, [3, 3, 10]], tint: [1.04, 0.98, 0.92], bloom: 0.55 };
    const groundT = naturalTex({ size: 256, seed: 7, c1: [0.36, 0.28, 0.16], c2: [0.55, 0.45, 0.24], bump: 5 });
    groundT.map.repeat.set(60, 60); groundT.normalMap.repeat.set(60, 60);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), stdMat({ map: groundT.map, normalMap: groundT.normalMap, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.2; ground.receiveShadow = true;
    // далекі пагорби
    const hillG = new THREE.RingGeometry(70, 260, 96, 12); hillG.rotateX(-Math.PI / 2);
    const hp = hillG.attributes.position;
    for (let i = 0; i < hp.count; i++) { const x = hp.getX(i), z = hp.getZ(i), r = Math.hypot(x, z); hp.setY(i, -0.2 + (noise2(x * 0.02, z * 0.02, 3) * 9 + noise2(x * 0.07, z * 0.07, 4) * 3) * clamp((r - 70) / 80, 0, 1)); }
    hillG.computeVertexNormals();
    const hills = new THREE.Mesh(hillG, stdMat({ map: groundT.map, color: 0xb08a5a, roughness: 1 }));
    // курган
    const mound = new THREE.Mesh(displaceGeo(new THREE.SphereGeometry(16, 48, 24, 0, TAU, 0, Math.PI / 2), 1.2, 0.15, 2), stdMat({ map: groundT.map, color: 0x8a6c44, roughness: 1 }));
    mound.scale.set(1.4, 0.42, 1); mound.position.set(-14, -0.4, -48); mound.receiveShadow = true;
    // кам’яний майданчик
    const tiles = stoneTiles({ size: 512, rows: 6, cols: 6, seed: 4, color: [0.66, 0.6, 0.52], rough: 0.85, bump: 4, tint: 0.15, grout: 0.02 });
    tiles.map.repeat.set(2.4, 2.4); tiles.normalMap.repeat.set(2.4, 2.4); tiles.roughnessMap.repeat.set(2.4, 2.4);
    const stoneM = stdMat({ map: tiles.map, normalMap: tiles.normalMap, roughnessMap: tiles.roughnessMap, roughness: 1 });
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.7, 0.4, 64), stoneM);
    plat.position.y = -0.2; plat.receiveShadow = true; plat.castShadow = true;
    const rockT = naturalTex({ size: 256, seed: 12, c1: [0.42, 0.4, 0.37], c2: [0.62, 0.58, 0.52], bump: 6 });
    const rockM = stdMat({ map: rockT.map, normalMap: rockT.normalMap, roughness: 0.95 });
    A.group.add(ground, hills, mound, plat);
    // кам’яні баби
    for (const [x, z, r, s] of [[-3.4, -6.4, 0.2, 1.1], [3.8, -7.4, -0.3, 1.25], [-9, -9, 0.6, 1.3], [10.5, -10, -0.4, 1.4], [-13.6, -48.5, 0.2, 2.2]]) {
      const m = idol(rockM); m.position.set(x, -0.2, z); m.rotation.set(0, r, rand(-0.06, 0.06)); m.scale.setScalar(s); A.group.add(m);
    }
    // валуни
    for (let i = 0; i < 14; i++) {
      const a = rand(-Math.PI, 0), r = rand(8, 26), sz = rand(0.3, 1.2);
      const m = new THREE.Mesh(rockGeo(sz, i + 3), rockM); m.position.set(Math.cos(a) * r * 1.4, -0.2 + sz * 0.2, Math.sin(a) * r); m.castShadow = true; m.receiveShadow = true; A.group.add(m);
    }
    A.grass = grassField(isMobile ? 1100 : 2600, 46, 0xe0c080, 0xa89660);
    A.group.add(A.grass);
    for (const [x, z] of [[-6.1, -2.4], [6.1, -2.4]]) { const t = torch(x, z, 2.1); A.group.add(t.g, t.L); A.fires.push(t); }
    A.ambient = dt => {
      if (Math.random() < dt * 14) PA.emit(rand(-9, 9), rand(0.2, 3), rand(-6, 2), rand(-0.1, 0.25), rand(-0.05, 0.08), rand(-0.05, 0.05), rand(3, 6), rand(0.025, 0.05), 1.6, 1.0, 0.5, 0.7, { fin: 0.3, drag: 0.2 });
    };
    return A;
  }

  function buildKuznia() {
    const A = { group: new THREE.Group(), fires: [], lights: [] };
    A.sky = makeSky({ top: '#01030a', mid: '#06102a', hor: '#1a2648', bot: '#030406', sunDir: [0.45, 0.32, -1], sunCol: [0.7, 0.8, 1.1], sun: 1.4, cloud: 0.5, cover: 0, cloudCol: '#2b3657', cloudDark: '#070a14', stars: 1 });
    A.fog = new THREE.Fog(0x0b1224, 16, 95);
    A.env = { exposure: 1.05, hemi: [0x3a4a80, 0x120c08, 0.35], sun: [0x8fb0ff, 1.1, [9, 10, -16]], rim: [0x6f9dff, 2.2, [7, 5, -9]], fill: [0xff9050, 0.35, [-3, 3, 10]], tint: [0.96, 0.98, 1.06], bloom: 0.8 };
    const tiles = stoneTiles({ size: 512, rows: 4, cols: 4, seed: 9, color: [0.34, 0.33, 0.36], rough: 0.55, bump: 5, wet: true, grout: 0.03 });
    for (const t of [tiles.map, tiles.normalMap, tiles.roughnessMap]) t.repeat.set(14, 14);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(56, 56), stdMat({ map: tiles.map, normalMap: tiles.normalMap, roughnessMap: tiles.roughnessMap, roughness: 1, metalness: 0.05 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    A.group.add(floor);
    const wallT = stoneTiles({ size: 512, rows: 8, cols: 4, seed: 14, color: [0.3, 0.28, 0.27], rough: 0.9, bump: 8, grout: 0.04 });
    for (const t of [wallT.map, wallT.normalMap, wallT.roughnessMap]) t.repeat.set(1, 3);
    const colM = stdMat({ map: wallT.map, normalMap: wallT.normalMap, roughnessMap: wallT.roughnessMap, roughness: 1 });
    const capM = stdMat({ color: 0x3b3936, roughness: 0.8 });
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i + 0.5) / 9 * Math.PI, r = 11.5;
      const x = Math.cos(a) * r * 1.25, z = Math.sin(a) * r * 0.75 - 3;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 8, 24), colM); c.position.set(x, 4, z); c.castShadow = true; c.receiveShadow = true;
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1.5), capM); base.position.set(x, 0.25, z); base.receiveShadow = true; base.castShadow = true;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 1.6), capM); cap.position.set(x, 8.2, z);
      A.group.add(c, base, cap);
      if (i % 2 === 1) {
        const bc = mkCanvas(128, 384), g = bc.getContext('2d');
        const gr = g.createLinearGradient(0, 0, 0, 384); gr.addColorStop(0, '#5e0d0d'); gr.addColorStop(1, '#2c0505'); g.fillStyle = gr; g.fillRect(0, 0, 128, 384);
        g.strokeStyle = '#d9a33a'; g.lineWidth = 5; g.strokeRect(10, 10, 108, 364);
        g.fillStyle = '#e8b347'; g.beginPath(); g.arc(64, 150, 30, 0, TAU); g.fill();
        for (let k = 0; k < 12; k++) { const aa = k / 12 * TAU; g.fillRect(64 + Math.cos(aa) * 38 - 3, 150 + Math.sin(aa) * 38 - 3, 6, 6); }
        g.fillStyle = '#5e0d0d'; g.beginPath(); g.arc(64, 150, 16, 0, TAU); g.fill();
        g.fillStyle = '#2c0505'; g.beginPath(); g.moveTo(0, 384); g.lineTo(64, 330); g.lineTo(128, 384); g.fill();
        const ban = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 3.3, 1, 8), stdMat({ map: texFrom(bc, true), roughness: 0.9, side: THREE.DoubleSide, transparent: false }));
        ban.position.set(x, 5.2, z + 0.62); ban.lookAt(x * 0.2, 5.2, 6); ban.castShadow = true;
        A.group.add(ban);
      }
    }
    // задня стіна з брамою кузні
    const wallT2 = stoneTiles({ size: 512, rows: 10, cols: 5, seed: 31, color: [0.24, 0.23, 0.23], rough: 0.9, bump: 8, grout: 0.04 });
    for (const t of [wallT2.map, wallT2.normalMap, wallT2.roughnessMap]) t.repeat.set(6, 2);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(60, 14, 1.5), stdMat({ map: wallT2.map, normalMap: wallT2.normalMap, roughnessMap: wallT2.roughnessMap, roughness: 1 }));
    wall.position.set(0, 7, -19); wall.receiveShadow = true;
    const gc = mkCanvas(256, 384), gg = gc.getContext('2d');
    const glow = gg.createRadialGradient(128, 360, 10, 128, 300, 300);
    glow.addColorStop(0, '#fff2c0'); glow.addColorStop(0.18, '#ffb347'); glow.addColorStop(0.5, '#c2410c'); glow.addColorStop(1, '#2a0802');
    gg.fillStyle = glow; gg.fillRect(0, 0, 256, 384);
    gg.fillStyle = 'rgba(20,8,4,0.9)';
    gg.beginPath(); gg.moveTo(40, 384); gg.lineTo(60, 300); gg.lineTo(110, 300); gg.lineTo(120, 384); gg.fill();
    gg.beginPath(); gg.moveTo(160, 384); gg.lineTo(170, 320); gg.lineTo(230, 330); gg.lineTo(236, 384); gg.fill();
    gg.strokeStyle = '#120806'; gg.lineWidth = 9;
    for (let x = 16; x < 256; x += 34) { gg.beginPath(); gg.moveTo(x, 0); gg.lineTo(x, 384); gg.stroke(); }
    gg.lineWidth = 7; for (let y = 30; y < 384; y += 60) { gg.beginPath(); gg.moveTo(0, y); gg.lineTo(256, y); gg.stroke(); }
    const gTex = texFrom(gc, true); gTex.wrapS = gTex.wrapT = THREE.ClampToEdgeWrapping;
    const gateMat = new THREE.MeshBasicMaterial({ map: gTex, color: new THREE.Color(1.6, 1.3, 1.1) });
    const gate = new THREE.Mesh(new THREE.PlaneGeometry(5, 6.5), gateMat);
    gate.position.set(0, 3.25, -18.2);
    const gateTop = new THREE.Mesh(new THREE.CircleGeometry(2.5, 32, 0, Math.PI), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.12, 0.03, 0.01) })); gateTop.position.set(0, 6.5, -18.2);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.35, 8, 24, Math.PI), capM); arch.position.set(0, 6.5, -18.1);
    for (const sx of [-2.75, 2.75]) { const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.7, 6.5, 0.7), capM); jamb.position.set(sx, 3.25, -18.1); A.group.add(jamb); }
    A.group.add(arch);
    const gL = new THREE.PointLight(0xff6a20, 9, 20, 1.4); gL.position.set(0, 3, -16.5);
    A.group.add(wall, gate, gateTop, gL);
    A.gateLight = gL;
    const metal = stdMat({ color: 0x2b2b2e, metalness: 0.85, roughness: 0.35 });
    for (const [x, z, light] of [[-5.6, -3.2, 1], [5.6, -3.2, 1], [-9.5, -8, 0], [9.5, -8, 0]]) { const b = brazier(x, z, metal); A.group.add(b.g); if (light) A.group.add(b.L); else b.L = null; A.fires.push(b); }
    A.ambient = dt => {
      if (Math.random() < dt * 18) PA.emit(rand(-10, 10), 0.1, rand(-12, 1), rand(-0.2, 0.2), rand(0.4, 1.0), rand(-0.1, 0.1), rand(3, 6), rand(0.03, 0.05), 4, 1.2, 0.3, 1, { fin: 0.1, drag: 0.1 });
      if (A.gateLight) A.gateLight.intensity = 9 + Math.sin(clock * 7) * 1.2 + Math.sin(clock * 13.3) * 0.8;
    };
    return A;
  }

  function buildPorohy() {
    const A = { group: new THREE.Group(), fires: [], lights: [] };
    A.sky = makeSky({ top: '#0c1016', mid: '#252d3a', hor: '#4b5666', bot: '#0d1116', sunDir: [0.3, 0.25, -1], sunCol: [0.25, 0.28, 0.35], sun: 0, cloud: 1, cover: 0.32, cloudCol: '#5b6676', cloudDark: '#141922' });
    A.fog = new THREE.Fog(0x37414f, 14, 85);
    A.env = { exposure: 1.1, hemi: [0x8d9db5, 0x1a1e24, 0.7], sun: [0xb8c8ff, 1.6, [-8, 12, 6]], rim: [0x9fc0ff, 2.0, [5, 4, -9]], fill: [0xffb070, 0.3, [-3, 2, 10]], tint: [0.94, 0.99, 1.05], bloom: 0.6 };
    // вода
    const N = 256, H = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) H[y * N + x] = tfbm(x / N * 8, y / N * 8, 8, 4, 41) + tfbm(x / N * 3, y / N * 22, 3, 2, 45) * 0.4;
    const wn = texFrom(normalFrom(H, N, 3), false); wn.repeat.set(36, 36);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshPhysicalMaterial({ color: 0x0f1a20, roughness: 0.06, metalness: 0.1, normalMap: wn, normalScale: new THREE.Vector2(0.6, 0.6), clearcoat: 1, clearcoatRoughness: 0.15 }));
    water.rotation.x = -Math.PI / 2; water.position.y = -0.75; water.receiveShadow = true;
    A.water = wn;
    // плита-скеля
    const rockT = naturalTex({ size: 256, seed: 19, c1: [0.16, 0.17, 0.18], c2: [0.32, 0.31, 0.3], bump: 7 });
    rockT.map.repeat.set(3, 3); rockT.normalMap.repeat.set(3, 3);
    const rockM = stdMat({ map: rockT.map, normalMap: rockT.normalMap, roughness: 0.62, metalness: 0.05 });
    const slabT = naturalTex({ size: 256, seed: 23, c1: [0.3, 0.29, 0.27], c2: [0.46, 0.43, 0.39], bump: 6 });
    slabT.map.repeat.set(4, 4); slabT.normalMap.repeat.set(4, 4);
    const slabM = stdMat({ map: slabT.map, normalMap: slabT.normalMap, roughness: 0.78 });
    const slabG = new THREE.CylinderGeometry(6.6, 7.6, 1.4, 64, 4);
    const sp = slabG.attributes.position;
    for (let i = 0; i < sp.count; i++) {
      const x = sp.getX(i), y = sp.getY(i), z = sp.getZ(i), a = Math.atan2(z, x);
      if (y > 0.69) { sp.setY(i, 0.7 + (Math.hypot(x, z) > 6 ? (noise2(x, z, 3) - 0.5) * 0.15 : 0)); continue; }
      const k = 1 + (noise2(a * 3, y * 2, 5) - 0.5) * 0.25; sp.setX(i, x * k); sp.setZ(i, z * k);
    }
    slabG.computeVertexNormals();
    const slab = new THREE.Mesh(slabG, slabM); slab.position.y = -0.7; slab.receiveShadow = true; slab.castShadow = true;
    A.group.add(water, slab);
    for (let i = 0; i < 22; i++) {
      const a = rand(-Math.PI * 1.05, 0.05), r = rand(9, 40), sz = rand(0.6, 3.2);
      const m = new THREE.Mesh(rockGeo(sz, i + 9), rockM); m.position.set(Math.cos(a) * r * 1.3, -0.75 + sz * rand(0.1, 0.5), Math.sin(a) * r); m.rotation.set(rand(0, 3), rand(0, 3), 0);
      m.castShadow = true; m.receiveShadow = true; A.group.add(m);
    }
    for (const [x, z] of [[-6, -2.6], [6, -2.6]]) { const t = torch(x, z, 2.2, 0xffa05a); A.group.add(t.g, t.L); A.fires.push(t); }
    // дощ
    const RN = isMobile ? 900 : 1800, rp = new Float32Array(RN * 6);
    for (let i = 0; i < RN; i++) { const x = rand(-14, 14), y = rand(0, 12), z = rand(-10, 8); rp.set([x, y, z, x + 0.03, y - 0.45, z], i * 6); }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    A.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0x9fb2c8, transparent: true, opacity: 0.2, depthWrite: false }));
    A.rain.frustumCulled = false;
    A.group.add(A.rain);
    A.storm = 3;
    A.ambient = dt => {
      const p = A.rain.geometry.attributes.position, arr = p.array;
      for (let i = 0; i < RN; i++) {
        const o = i * 6; arr[o + 1] -= 16 * dt; arr[o + 4] -= 16 * dt;
        if (arr[o + 4] < -0.7) { const x = rand(-14, 14) + cam.x * SC, z = rand(-10, 8); arr[o] = x; arr[o + 3] = x + 0.03; arr[o + 1] = 12; arr[o + 4] = 11.55; arr[o + 2] = arr[o + 5] = z; if (Math.random() < 0.05 && Math.abs(z) < 5) PN.emit(x, 0.02, z, 0, 0.6, 0, 0.25, 0.12, 0.7, 0.75, 0.85, 0.4, { grow: 1.5 }); }
      }
      p.needsUpdate = true;
      A.water.offset.x += dt * 0.012; A.water.offset.y += dt * 0.02;
      A.storm -= dt;
      if (A.storm <= 0) { A.storm = rand(4, 10); A.flash = 1; if (game) sfx.thunderFar(); }
      if (A.flash > 0) { A.flash = Math.max(0, A.flash - dt * 2.5); A.sky.material.uniforms.uFlash.value = A.flash * (0.6 + Math.random() * 0.4); hemi.intensity = A.env.hemi[2] + A.flash * 2.5; }
      else A.sky.material.uniforms.uFlash.value = 0;
    };
    return A;
  }


  // Дерев’яна підлога: дошки з волокнами
  function woodFloor(N) {
    N = N || 512;
    const H = new Float32Array(N * N);
    const col = mkCanvas(N, N), g = col.getContext('2d'), img = g.createImageData(N, N);
    const rough = mkCanvas(N, N), gr = rough.getContext('2d'), rimg = gr.createImageData(N, N);
    const rows = 8;
    for (let y = 0; y < N; y++) {
      const ry = y / N * rows, row = Math.floor(ry), fy = ry - row;
      for (let x = 0; x < N; x++) {
        const len = 0.5, off = hash2(row, 7, 3) * len;
        const rx = (x / N + off) / len, pl = Math.floor(rx), fx = rx - pl;
        const id = hash2(((pl % 2) + 2) % 2, row, 11) * 0.5 + hash2(pl, row, 5) * 0.5;
        const gap = Math.min(fy, 1 - fy) < 0.035 || Math.min(fx, 1 - fx) < 0.006 ? 1 : 0;
        const grain = Math.sin((y / N * rows * 60) + tfbm(x / N * 4, y / N * 32, 4, 4, row + 3) * 9) * 0.5 + 0.5;
        const knots = tfbm(x / N * 16, y / N * 16, 16, 3, 41);
        const tone = 0.55 + id * 0.45;
        const v = tone * (0.78 + grain * 0.16 + (knots - 0.5) * 0.25) * (gap ? 0.25 : 1);
        const i = (y * N + x) * 4;
        img.data[i] = clamp(v * 0.62 * 255, 0, 255); img.data[i + 1] = clamp(v * 0.4 * 255, 0, 255); img.data[i + 2] = clamp(v * 0.22 * 255, 0, 255); img.data[i + 3] = 255;
        H[y * N + x] = gap ? 0 : 0.6 + grain * 0.06 + knots * 0.05;
        const r = clamp(0.32 + (1 - grain) * 0.12 + gap * 0.5 + (tfbm(x / N * 3, y / N * 3, 3, 3, 77) - 0.5) * 0.25, 0.08, 1) * 255;
        rimg.data[i] = r; rimg.data[i + 1] = r; rimg.data[i + 2] = r; rimg.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0); gr.putImageData(rimg, 0, 0);
    return { map: texFrom(col, true), normalMap: texFrom(normalFrom(H, N, 5), false), roughnessMap: texFrom(rough, false) };
  }
  // Світловий промінь із вікна
  function lightShaft(x, z, w, h, lean, col, alpha) {
    const geo = new THREE.PlaneGeometry(w, h, 1, 8);
    const p = geo.attributes.position, c = [];
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) / h + 0.5; const k = Math.pow(Math.sin(Math.PI * y), 2) * y; c.push(col[0] * k, col[1] * k, col[2] * k); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: alpha, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    m.position.set(x, h / 2 - 0.3, z); m.rotation.set(lean, 0, 0);
    return m;
  }
  function buildZala() {
    const A = { group: new THREE.Group(), fires: [], lights: [] };
    A.sky = makeSky({ top: '#0c1430', mid: '#29365e', hor: '#e7a46a', bot: '#120c08', sunDir: [-0.3, 0.12, -1], sunCol: [1.4, 0.8, 0.45], sun: 1, cloud: 0.5, cloudCol: '#d99a70', cloudDark: '#3a2a3a' });
    A.fog = new THREE.Fog(0x2a1c14, 18, 60);
    A.env = { exposure: 1.05, hemi: [0xffd2a0, 0x24160c, 0.55], sun: [0xffc28a, 2.2, [-3, 10, -3]], rim: [0xffb070, 2.4, [-3, 5, -9]], fill: [0xc8d4ff, 0.9, [3, 3, 10]], tint: [1.05, 0.99, 0.92], bloom: 0.55 };
    const W = 22, D = 14, H = 7.5;
    const wood = woodFloor(512);
    for (const t of [wood.map, wood.normalMap, wood.roughnessMap]) t.repeat.set(5, 5);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D + 10), new THREE.MeshPhysicalMaterial({ map: wood.map, normalMap: wood.normalMap, roughnessMap: wood.roughnessMap, roughness: 1, clearcoat: 0.35, clearcoatRoughness: 0.35, normalScale: new THREE.Vector2(0.7, 0.7) }));
    floor.rotation.x = -Math.PI / 2; floor.position.z = 1; floor.receiveShadow = true;
    // стіни: тинькування + дерев’яний каркас
    const plasterT = naturalTex({ size: 256, seed: 61, c1: [0.62, 0.55, 0.46], c2: [0.78, 0.71, 0.6], bump: 2 });
    plasterT.map.repeat.set(4, 2); plasterT.normalMap.repeat.set(4, 2);
    const plaster = stdMat({ map: plasterT.map, normalMap: plasterT.normalMap, roughness: 0.95 });
    const beamT = woodFloor(256); beamT.map.repeat.set(1, 0.3);
    const beam = stdMat({ map: beamT.map, color: 0x6a4a34, roughness: 0.7 });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), plaster); back.position.set(0, H / 2, -D / 2); back.receiveShadow = true;
    const left = new THREE.Mesh(new THREE.PlaneGeometry(D + 10, H), plaster); left.rotation.y = Math.PI / 2; left.position.set(-W / 2, H / 2, 1); left.receiveShadow = true;
    const right = left.clone(); right.rotation.y = -Math.PI / 2; right.position.x = W / 2;
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D + 10), stdMat({ color: 0x2a1c14, roughness: 1 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, 1);
    A.group.add(floor, back, left, right, ceil);
    // вікна у задній стіні
    const winC = mkCanvas(128, 256), wg = winC.getContext('2d');
    const sky = wg.createLinearGradient(0, 0, 0, 256); sky.addColorStop(0, '#3a4a80'); sky.addColorStop(0.6, '#f0a868'); sky.addColorStop(0.75, '#ffd29a'); sky.addColorStop(1, '#3a2a1a');
    wg.fillStyle = sky; wg.fillRect(0, 0, 128, 256);
    wg.fillStyle = '#1a120c'; wg.beginPath(); wg.moveTo(0, 210); for (let x = 0; x <= 128; x += 8) wg.lineTo(x, 196 + Math.sin(x * 0.11) * 8 + Math.random() * 4); wg.lineTo(128, 256); wg.lineTo(0, 256); wg.fill();
    wg.fillStyle = '#1a0f08'; wg.fillRect(60, 0, 8, 256); wg.fillRect(0, 120, 128, 8);
    const winTex = texFrom(winC, true); winTex.wrapS = winTex.wrapT = THREE.ClampToEdgeWrapping;
    const winMat = new THREE.MeshBasicMaterial({ map: winTex, color: new THREE.Color(1.7, 1.5, 1.35), fog: false });
    for (const x of [-7, -2.4, 2.4, 7]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.5), winMat); w.position.set(x, 2.75, -D / 2 + 0.1);
      const fr = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.8, 0.16), beam); fr.position.set(x, 2.75, -D / 2 + 0.0);
      const sill = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 0.45), beam); sill.position.set(x, 1.45, -D / 2 + 0.15); sill.castShadow = true;
      A.group.add(fr, w, sill);
      A.group.add(lightShaft(x + 0.5, -D / 2 + 1.6, 1.2, 4.6, -0.7, [1, 0.72, 0.45], 0.045));
    }
    // балки
    for (let i = -2; i <= 2; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, D + 10), beam); b.position.set(i * 4.6, H - 0.2, 1); b.castShadow = true; A.group.add(b); }
    for (const x of [-W / 2 + 0.2, -4.6, 4.6, W / 2 - 0.2]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, H, 0.4), beam); p.position.set(x, H / 2, -D / 2 + 0.2); p.castShadow = true; p.receiveShadow = true; A.group.add(p); }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(W, 0.3, 0.2), beam); rail.position.set(0, 1.0, -D / 2 + 0.1); A.group.add(rail);
    // стійка зі зброєю
    const steel = stdMat({ color: 0xc8ccd4, metalness: 1, roughness: 0.22 });
    for (const [x, n] of [[-4.6, 3], [4.6, 3]]) {
      const rack = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.2), beam); rack.position.set(x, 3.3, -D / 2 + 0.35); A.group.add(rack);
      for (let i = 0; i < n; i++) {
        const sw = new THREE.Group();
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1.05, 0.012), steel); blade.position.y = -0.55; blade.rotation.z = 0.06;
        const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8), beam); hilt.position.y = 0.08;
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.04), stdMat({ color: 0xb08a3a, metalness: 1, roughness: 0.3 }));
        sw.add(blade, hilt, guard); sw.position.set(x - 0.6 + i * 0.6, 3.25, -D / 2 + 0.42); sw.rotation.z = (i - 1) * 0.12; sw.castShadow = true;
        A.group.add(sw);
      }
    }
    // діжки й лави
    for (const [x, z] of [[-8.4, -5.6], [-7.6, -5.9], [8.2, -5.4]]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.0, 20), beam); bar.scale.set(1, 1, 1); bar.position.set(x, 0.5, z); bar.castShadow = true; bar.receiveShadow = true;
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.025, 6, 24), stdMat({ color: 0x2a2a2a, metalness: 0.8, roughness: 0.5 })); hoop.rotation.x = Math.PI / 2; hoop.position.set(x, 0.75, z);
      const hoop2 = hoop.clone(); hoop2.position.y = 0.25;
      A.group.add(bar, hoop, hoop2);
    }
    const bench = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 0.5), beam); bench.position.set(0, 0.48, -D / 2 + 1.0); bench.castShadow = true; bench.receiveShadow = true;
    for (const x of [-1.5, 1.5]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.46, 0.4), beam); leg.position.set(x, 0.23, -D / 2 + 1.0); A.group.add(leg); }
    A.group.add(bench);
    // килим під бійцями
    const rugC = mkCanvas(256, 128), rg = rugC.getContext('2d');
    rg.fillStyle = '#5a1410'; rg.fillRect(0, 0, 256, 128);
    rg.strokeStyle = '#c8962e'; rg.lineWidth = 6; rg.strokeRect(10, 10, 236, 108); rg.lineWidth = 2; rg.strokeRect(22, 22, 212, 84);
    rg.fillStyle = '#1e3a5a'; for (let i = 0; i < 7; i++) { rg.save(); rg.translate(40 + i * 29.3, 64); rg.rotate(Math.PI / 4); rg.fillRect(-9, -9, 18, 18); rg.restore(); }
    rg.fillStyle = '#c8962e'; for (let i = 0; i < 7; i++) { rg.save(); rg.translate(40 + i * 29.3, 64); rg.rotate(Math.PI / 4); rg.fillRect(-4, -4, 8, 8); rg.restore(); }
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 3.6), stdMat({ map: texFrom(rugC, true), roughness: 1 }));
    rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.006, 0.1); rug.receiveShadow = true;
    A.group.add(rug);
    // люстра
    const iron = stdMat({ color: 0x1c1c1e, metalness: 0.8, roughness: 0.5 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.04, 8, 32), iron); ring.rotation.x = Math.PI / 2; ring.position.set(0, 4.6, -0.8);
    A.group.add(ring);
    for (let i = 0; i < 3; i++) { const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 2.6, 4), iron); const a = i / 3 * TAU; ch.position.set(Math.cos(a) * 0.55, 5.9, -0.8 + Math.sin(a) * 0.55); ch.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4); A.group.add(ch); }
    A.candles = [];
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; const c = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 8), stdMat({ color: 0xf2e6c8, roughness: 0.6 })); c.position.set(Math.cos(a) * 1.1, 4.72, -0.8 + Math.sin(a) * 1.1); A.group.add(c); A.candles.push([c.position.x, 4.82, c.position.z]); }
    const cl = new THREE.PointLight(0xffa860, 7, 12, 1.4); cl.position.set(0, 4.4, -0.8); A.group.add(cl);
    A.fires.push({ g: null, L: cl, fx: [0, 4.8, -0.8], base: 7, noFire: true });
    // камін
    const stoneT = stoneTiles({ size: 256, rows: 6, cols: 4, seed: 71, color: [0.4, 0.37, 0.34], rough: 0.9, bump: 6 });
    const fp = new THREE.Mesh(new THREE.BoxGeometry(3, 3.2, 1.2), stdMat({ map: stoneT.map, normalMap: stoneT.normalMap, roughness: 1 })); fp.position.set(-W / 2 + 0.6, 1.6, -2.5); fp.castShadow = true;
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.3), new THREE.MeshBasicMaterial({ color: 0x0a0503 })); hole.rotation.y = Math.PI / 2; hole.position.set(-W / 2 + 1.21, 0.75, -2.5);
    const fl = new THREE.PointLight(0xff7a2a, 2.5, 6, 2); fl.position.set(-W / 2 + 1.5, 0.8, -2.5);
    A.group.add(fp, hole, fl);
    A.fires.push({ g: null, L: fl, fx: [-W / 2 + 1.35, 0.25, -2.5], base: 2.5 });
    // дрібниці світлиці
    for (const x of [-7, -2.4, 2.4, 7]) { rushnyk(A, x - 0.82, 3.0, -D / 2 + 0.2, 0.32, 1.5); rushnyk(A, x + 0.82, 3.0, -D / 2 + 0.2, 0.32, 1.5); candle(A, x - 0.4, 1.51, -D / 2 + 0.25); candle(A, x + 0.35, 1.51, -D / 2 + 0.25); }
    shield(A, -9.6, 3.2, -D / 2 + 0.12); shield(A, 9.6, 3.2, -D / 2 + 0.12);
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.35), beam); shelf.position.set(0, 4.4, -D / 2 + 0.2); A.group.add(shelf);
    for (let i = 0; i < 5; i++) pot(A, -0.85 + i * 0.42, 4.44, -D / 2 + 0.22, 0.75 + Math.random() * 0.4, [0x8a4a2a, 0x6a3a1a, 0xb07040, 0x3a5a7a, 0x8a4a2a][i]);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.6, 0.7), beam); chest.position.set(-8.5, 0.3, -5.6); chest.castShadow = true; A.group.add(chest);
    spawnCrowd(A, [
      { model: 'xbot', x: -1.1, z: -D / 2 + 1.0, pose: 'sit', o: 0 }, { model: 'xbot', x: 1.2, z: -D / 2 + 1.0, pose: 'sit', o: 1, skinTint: [0.9, 0.82, 0.78] },
      { model: 'michelle', x: 0.05, z: -D / 2 + 1.0, pose: 'sit', h: 1.5, tint: [0.9, 0.75, 0.75] },
      { model: 'xbot', x: -6.2, z: -4.9, pose: 'stand', o: 2, ry: 0.3 }
    ]);
    A.ambient = dt => {
      // порошинки в променях
      if (Math.random() < dt * 22) PA.emit(rand(-8, 8), rand(0.3, 4.5), rand(-6, 0), rand(-0.05, 0.05), rand(-0.03, 0.04), rand(-0.03, 0.03), rand(3, 6), rand(0.015, 0.03), 1.6, 1.2, 0.8, 0.7, { fin: 0.3 });
      for (const c of A.candles) if (Math.random() < dt * 10) PA.emit(c[0], c[1], c[2], 0, 0.3, 0, 0.25, 0.09, 3, 1.4, 0.4, 0.9, { grow: -0.5, heat: 1 });
    };
    return A;
  }

  // ---------- Тронна зала ----------
  function marbleFloor(N) {
    N = N || 512;
    const col = mkCanvas(N, N), g = col.getContext('2d'), img = g.createImageData(N, N);
    const rough = mkCanvas(N, N), gr = rough.getContext('2d'), rimg = gr.createImageData(N, N);
    const H = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const tx = Math.floor(x / N * 4), ty = Math.floor(y / N * 4), dark = (tx + ty) % 2 === 1;
      const fx = (x / N * 4) % 1, fy = (y / N * 4) % 1, gap = Math.min(fx, 1 - fx, fy, 1 - fy) < 0.008;
      const n = tfbm(x / N * 6, y / N * 6, 6, 5, dark ? 91 : 93);
      const vein = Math.pow(1 - Math.abs(Math.sin((x / N * 9 + y / N * 5 + n * 3.2) * Math.PI)), 14);
      const base = dark ? [0.06, 0.055, 0.06] : [0.86, 0.84, 0.8];
      const vc = dark ? [0.55, 0.45, 0.3] : [0.42, 0.4, 0.42];
      const i = (y * N + x) * 4, k = 0.9 + (n - 0.5) * 0.25;
      for (let c = 0; c < 3; c++) img.data[i + c] = clamp((base[c] * k * (1 - vein) + vc[c] * vein) * (gap ? 0.5 : 1) * 255, 0, 255);
      img.data[i + 3] = 255;
      H[y * N + x] = gap ? 0 : 1;
      const r = (gap ? 0.6 : 0.08 + vein * 0.1) * 255; rimg.data[i] = rimg.data[i + 1] = rimg.data[i + 2] = r; rimg.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0); gr.putImageData(rimg, 0, 0);
    return { map: texFrom(col, true), normalMap: texFrom(normalFrom(H, N, 2), false), roughnessMap: texFrom(rough, false) };
  }
  function carpet(w, d, base, border) {
    const c = mkCanvas(512, 128), g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 512, 128);
    g.strokeStyle = border; g.lineWidth = 8; g.strokeRect(8, 8, 496, 112); g.lineWidth = 2; g.strokeRect(22, 22, 468, 84);
    g.fillStyle = border; for (let i = 0; i < 14; i++) { g.save(); g.translate(40 + i * 33, 64); g.rotate(Math.PI / 4); g.fillRect(-6, -6, 12, 12); g.restore(); }
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`; g.fillRect(Math.random() * 512, Math.random() * 128, 2, 2); }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), stdMat({ map: texFrom(c, true), roughness: 1 }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.008; m.receiveShadow = true;
    return m;
  }
  function chandelier(x, y, z, A, col) {
    const gold = stdMat({ color: 0xc9a043, metalness: 1, roughness: 0.25 });
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.035, 8, 32), gold); ring.rotation.x = Math.PI / 2; g.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.03, 8, 24), gold); ring2.rotation.x = Math.PI / 2; ring2.position.y = 0.35; g.add(ring2);
    const glass = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.4, 1.6) });
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), glass); b.position.set(Math.cos(a) * 0.9, 0.06, Math.sin(a) * 0.9); g.add(b); }
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3, 6), gold); rod.position.y = 1.8; g.add(rod);
    g.position.set(x, y, z); A.group.add(g);
    const L = new THREE.PointLight(col || 0xffc080, 6, 14, 1.4); L.position.set(x, y - 0.2, z); A.group.add(L);
    A.fires.push({ g: null, L, fx: [x, y, z], base: 6, noFire: true });
  }
  function buildTron() {
    const A = { group: new THREE.Group(), fires: [], lights: [] };
    A.sky = makeSky({ top: '#05060c', mid: '#0d1426', hor: '#1c2846', bot: '#050505', sunDir: [0.3, 0.4, -1], sunCol: [0.6, 0.7, 1], sun: 1, cloud: 0.2, cloudCol: '#223', cloudDark: '#000', stars: 1 });
    A.fog = new THREE.Fog(0x120c10, 18, 60);
    A.env = { exposure: 1.05, hemi: [0xffe0b0, 0x201010, 0.5], sun: [0xffd8a8, 2.0, [-2, 10, -3]], rim: [0x8fb0ff, 2.4, [4, 6, -9]], fill: [0xffd0a0, 0.9, [-3, 3, 10]], tint: [1.03, 0.99, 0.95], bloom: 0.55 };
    const mt = marbleFloor(512);
    for (const t of [mt.map, mt.normalMap, mt.roughnessMap]) t.repeat.set(4, 4);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 24), new THREE.MeshPhysicalMaterial({ map: mt.map, normalMap: mt.normalMap, roughnessMap: mt.roughnessMap, roughness: 1, clearcoat: 0.8, clearcoatRoughness: 0.12 }));
    floor.rotation.x = -Math.PI / 2; floor.position.z = 1; floor.receiveShadow = true;
    A.group.add(floor, carpet(13, 3, '#6e0f12', '#d4a640'));
    const wallC = mkCanvas(256, 256), wg = wallC.getContext('2d');
    wg.fillStyle = '#4a0e12'; wg.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) { wg.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,200,150'},${Math.random() * 0.05})`; wg.fillRect(Math.random() * 256, Math.random() * 256, 3, 3); }
    wg.strokeStyle = '#c9a043'; wg.lineWidth = 4; wg.strokeRect(24, 24, 208, 208); wg.lineWidth = 1.5; wg.strokeRect(36, 36, 184, 184);
    const wallT = texFrom(wallC, true); wallT.repeat.set(8, 3);
    const wallM = stdMat({ map: wallT, roughness: 0.75 });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(26, 10), wallM); back.position.set(0, 5, -9); back.receiveShadow = true;
    A.group.add(back);
    const marbleM = new THREE.MeshPhysicalMaterial({ color: 0xeeeae2, roughness: 0.18, clearcoat: 0.8 });
    const gold = stdMat({ color: 0xc9a043, metalness: 1, roughness: 0.25 });
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      const x = i * 3.2, z = -4.8;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 7, 24), marbleM); c.position.set(x, 3.5, z); c.castShadow = true; c.receiveShadow = true;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.4, 0.4, 24), gold); cap.position.set(x, 7.1, z);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.3, 24), gold); base.position.set(x, 0.15, z);
      A.group.add(c, cap, base);
    }
    // трон на помості
    const step1 = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 3), marbleM); step1.position.set(0, 0.15, -7.4);
    const step2 = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.3, 2.2), marbleM); step2.position.set(0, 0.45, -7.8);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 1.0), stdMat({ color: 0x5a0c10, roughness: 0.6 })); seat.position.set(0, 0.9, -7.9);
    const backT = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.6, 0.2), gold); backT.position.set(0, 2.2, -8.35);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.6, 5), gold); crown.position.set(0, 3.8, -8.35);
    for (const m of [step1, step2, seat, backT, crown]) { m.castShadow = true; m.receiveShadow = true; }
    A.group.add(step1, step2, seat, backT, crown);
    // високі вікна з місячним світлом
    const winM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.65, 1.3), fog: false });
    for (const x of [-9.6, -6.4, 6.4, 9.6]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 4.2), winM); w.position.set(x, 4.2, -8.95);
      const arch = new THREE.Mesh(new THREE.CircleGeometry(0.7, 20, 0, Math.PI), winM); arch.position.set(x, 6.3, -8.95);
      A.group.add(w, arch, lightShaft(x + 0.4, -6.6, 1.1, 6.5, -0.55, [0.55, 0.65, 1], 0.08));
    }
    for (const x of [-2.6, 2.6]) {
      const ban = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 4), stdMat({ color: 0x1d2c66, roughness: 0.9, side: THREE.DoubleSide })); ban.position.set(x, 4.6, -8.9); A.group.add(ban);
      const sun = new THREE.Mesh(new THREE.CircleGeometry(0.35, 20), gold); sun.position.set(x, 5.4, -8.88); A.group.add(sun);
    }
    chandelier(-3.5, 5.5, -1.5, A); chandelier(3.5, 5.5, -1.5, A);
    // гобелени, бра зі свічками, штори
    const tapC = mkCanvas(128, 256), tg = tapC.getContext('2d');
    tg.fillStyle = '#2a1a3a'; tg.fillRect(0, 0, 128, 256); tg.strokeStyle = '#c9a043'; tg.lineWidth = 6; tg.strokeRect(6, 6, 116, 244);
    tg.fillStyle = '#c9a043'; tg.beginPath(); tg.moveTo(64, 50); tg.lineTo(100, 130); tg.lineTo(64, 210); tg.lineTo(28, 130); tg.closePath(); tg.fill();
    tg.fillStyle = '#7a1018'; tg.beginPath(); tg.arc(64, 130, 22, 0, TAU); tg.fill();
    const tapM = stdMat({ map: texFrom(tapC, true), roughness: 0.95, side: THREE.DoubleSide });
    for (const x of [-11.2, 11.2]) { const tp = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.2), tapM); tp.position.set(x, 4, -8.9); A.group.add(tp); }
    for (const x of [-8, -4.8, 4.8, 8]) { const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.04, 0.25, 10), gold); sc.position.set(x, 2.9, -8.85); A.group.add(sc); candle(A, x, 3.02, -8.82); }
    const curtM = stdMat({ color: 0x5a0a10, roughness: 0.85, side: THREE.DoubleSide });
    for (const x of [-9.6, -6.4, 6.4, 9.6]) for (const s of [-1, 1]) { const cg = new THREE.PlaneGeometry(0.5, 4.8, 6, 1); const cp = cg.attributes.position; for (let i = 0; i < cp.count; i++) cp.setZ(i, Math.sin(cp.getX(i) * 18) * 0.04); cg.computeVertexNormals(); const cu = new THREE.Mesh(cg, curtM); cu.position.set(x + s * 0.85, 4.4, -8.85); A.group.add(cu); }
    spawnCrowd(A, [
      { model: 'soldier', x: -2.3, y: 0.3, z: -7.4, pose: 'statue', metal: true, tint: [1, 0.78, 0.35], h: 1.85 },
      { model: 'soldier', x: 2.3, y: 0.3, z: -7.4, pose: 'statue', metal: true, tint: [1, 0.78, 0.35], h: 1.85, statue: 'win' },
      { model: 'xbot', x: -7.6, z: -6.5, pose: 'stand', o: 2, ry: 0.4 }, { model: 'michelle', x: 7.4, z: -6.4, pose: 'stand', h: 1.52, tint: [0.75, 0.8, 1], ry: -0.4 }
    ]);
    A.ambient = dt => { if (Math.random() < dt * 10) PA.emit(rand(-8, 8), rand(0.5, 5), rand(-7, 0), 0, rand(-0.02, 0.03), 0, rand(3, 6), rand(0.015, 0.03), 1.2, 1.2, 1.6, 0.6, { fin: 0.3 }); };
    return A;
  }

  // ---------- Шинок ----------
  function buildShynok() {
    const A = { group: new THREE.Group(), fires: [], lights: [] };
    A.sky = makeSky({ top: '#05070c', mid: '#0b1020', hor: '#1a1a22', bot: '#050505', sunDir: [0, 1, 0], sunCol: [0, 0, 0], sun: 0, cloud: 0, cloudCol: '#000', cloudDark: '#000', stars: 1 });
    A.fog = new THREE.Fog(0x2a1a10, 10, 34);
    A.env = { exposure: 1.15, hemi: [0xffc890, 0x1a0e06, 0.65], sun: [0xffb070, 1.9, [-2, 9, -2]], rim: [0xff9a50, 2.2, [3, 4, -8]], fill: [0x7090d0, 0.3, [6, 3, 9]], tint: [1.07, 0.98, 0.88], bloom: 0.7 };
    const wood = woodFloor(512);
    for (const t of [wood.map, wood.normalMap, wood.roughnessMap]) t.repeat.set(4, 4);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 18), stdMat({ map: wood.map, normalMap: wood.normalMap, color: 0x8a6a50, roughness: 0.78 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    A.group.add(floor);
    // стіни з колод
    const logT = woodFloor(256); logT.map.repeat.set(3, 0.25);
    const logM = stdMat({ map: logT.map, color: 0x9a7a5a, roughness: 0.85 });
    for (let i = 0; i < 14; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 20, 12), logM); l.rotation.z = Math.PI / 2; l.position.set(0, 0.2 + i * 0.38, -6.5); l.receiveShadow = true; A.group.add(l); }
    const beamM = stdMat({ color: 0x3a2618, roughness: 0.8 });
    for (let i = -2; i <= 2; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 14), beamM); b.position.set(i * 4, 5.2, 0); b.castShadow = true; A.group.add(b); }
    // шинквас із пляшками
    const bar = new THREE.Mesh(new THREE.BoxGeometry(6, 1.1, 0.8), beamM); bar.position.set(-3, 0.55, -5.3); bar.castShadow = true; bar.receiveShadow = true;
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(5, 0.08, 0.35), beamM); shelf.position.set(-3, 2.2, -6.15);
    A.group.add(bar, shelf);
    const glassCols = [0x2e5a2a, 0x5a3a1a, 0x8a8a7a, 0x3a1a1a];
    for (let i = 0; i < 14; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.32, 10), new THREE.MeshPhysicalMaterial({ color: glassCols[i % 4], roughness: 0.05, transmission: 0.3, thickness: 0.1, clearcoat: 1 })); b.position.set(-5.2 + i * 0.32, 2.4, -6.15); A.group.add(b); }
    // столи, лави, діжки
    for (const [x, z] of [[-7, -2.8], [7, -2.6], [6.2, -4.8]]) {
      const top = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 1), beamM); top.position.set(x, 0.8, z); top.castShadow = true; top.receiveShadow = true;
      A.group.add(top);
      for (const [dx, dz] of [[-0.85, -0.4], [0.85, -0.4], [-0.85, 0.4], [0.85, 0.4]]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.08), beamM); leg.position.set(x + dx, 0.4, z + dz); A.group.add(leg); }
      const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 10), stdMat({ color: 0x6a5a4a, metalness: 0.6, roughness: 0.4 })); mug.position.set(x + 0.3, 0.92, z); A.group.add(mug);
    }
    for (const [x, z] of [[2.5, -5.6], [3.4, -5.8], [-7.5, -5.2]]) {
      const bar2 = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.0, 20), logM); bar2.position.set(x, 0.5, z); bar2.castShadow = true; A.group.add(bar2);
    }
    // піч
    const ovenM = stdMat({ color: 0x8e877a, roughness: 0.95 });
    const oven = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 1.6), ovenM); oven.position.set(5.5, 1.2, -5.6); oven.castShadow = true;
    const mouth = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 0.5, 0.12) })); mouth.position.set(5.5, 0.8, -4.79);
    const ol = new THREE.PointLight(0xff7a2a, 1.6, 5, 2); ol.position.set(5.5, 0.6, -3.6);
    A.group.add(oven, mouth, ol);
    A.fires.push({ g: null, L: ol, fx: [5.5, 0.6, -4.9], base: 1.6 });
    // часник, глечики, рушник над піччю
    for (const x of [-6.5, -5.8, 1.5]) { for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), stdMat({ color: 0xe8dcc8, roughness: 0.7 })); b.position.set(x + Math.sin(k) * 0.03, 4.6 - k * 0.14, -1.2); A.group.add(b); } }
    for (let i = 0; i < 6; i++) pot(A, -5.1 + i * 0.4, 2.24, -6.15, 0.6, [0x8a4a2a, 0x6a3a1a, 0x3a5a7a][i % 3]);
    rushnyk(A, 5.5, 2.15, -4.78, 1.6, 0.4).rotation.z = Math.PI / 2;
    spawnCrowd(A, [
      { model: 'xbot', x: -7, z: -3.65, pose: 'sit', o: 1 }, { model: 'xbot', x: 7, z: -3.45, pose: 'sit', o: 0, skinTint: [0.85, 0.78, 0.74] },
      { model: 'xbot', x: -3.2, z: -5.95, pose: 'stand', o: 2 }
    ]);
    // гасові лампи
    for (const x of [-4.5, 0, 3.2]) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.8, 0.8) })); lamp.position.set(x, 3.6, -1.5);
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.5, 4), beamM); wire.position.set(x, 4.4, -1.5);
      const L = new THREE.PointLight(0xffa860, 5.5, 10, 1.6); L.position.set(x, 3.4, -1.5);
      A.group.add(lamp, wire, L);
      A.fires.push({ g: null, L, fx: [x, 3.6, -1.5], base: 5.5, noFire: true });
    }
    A.ambient = dt => { if (Math.random() < dt * 8) PN.emit(rand(-8, 8), rand(1, 4), rand(-5, 1), rand(-0.05, 0.05), 0.02, 0, rand(4, 7), rand(0.8, 1.6), 0.3, 0.25, 0.2, 0.08, { fin: 0.4, grow: 0.5 }); };
    return A;
  }

  // ---------- Катакомби ----------
  function buildPidval() {
    const A = { group: new THREE.Group(), fires: [], lights: [] };
    A.sky = makeSky({ top: '#020304', mid: '#040608', hor: '#06080a', bot: '#020202', sunDir: [0, 1, 0], sunCol: [0, 0, 0], sun: 0, cloud: 0, cloudCol: '#000', cloudDark: '#000' });
    A.fog = new THREE.Fog(0x0a1210, 8, 30);
    A.env = { exposure: 1.0, hemi: [0x7a8078, 0x0a0806, 0.22], sun: [0x9ab8c8, 0.7, [5, 9, 6]], rim: [0x60c0a0, 1.8, [-4, 4, -8]], fill: [0xff9050, 0.3, [-3, 2, 9]], tint: [0.94, 1.02, 0.98], bloom: 0.8 };
    const tiles = stoneTiles({ size: 512, rows: 5, cols: 5, seed: 101, color: [0.22, 0.21, 0.2], rough: 0.6, bump: 7, wet: true, grout: 0.04 });
    for (const t of [tiles.map, tiles.normalMap, tiles.roughnessMap]) t.repeat.set(6, 6);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 20), stdMat({ map: tiles.map, normalMap: tiles.normalMap, roughnessMap: tiles.roughnessMap, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    A.group.add(floor);
    const brick = stoneTiles({ size: 512, rows: 10, cols: 4, seed: 107, color: [0.36, 0.32, 0.28], rough: 0.9, bump: 8, grout: 0.05 });
    for (const t of [brick.map, brick.normalMap, brick.roughnessMap]) t.repeat.set(1, 1.5);
    const brickM = stdMat({ map: brick.map, normalMap: brick.normalMap, roughnessMap: brick.roughnessMap, roughness: 1 });
    const darkM = new THREE.MeshBasicMaterial({ color: 0x010101 });
    // аркада
    for (let i = -3; i <= 3; i++) {
      const x = i * 3.4;
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.9, 4, 0.9), brickM); p.position.set(x, 2, -5); p.castShadow = true; p.receiveShadow = true;
      A.group.add(p);
      if (i < 3) {
        const arch = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.4, 10, 20, Math.PI), brickM); arch.position.set(x + 1.7, 4, -5); arch.castShadow = true;
        const hole = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 5.2), darkM); hole.position.set(x + 1.7, 2.6, -6.2);
        A.group.add(arch, hole);
      }
    }
    const wallTop = new THREE.Mesh(new THREE.BoxGeometry(26, 3, 0.9), brickM); wallTop.position.set(0, 6.4, -5); A.group.add(wallTop);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(26, 9), brickM); back.position.set(0, 4.5, -9); A.group.add(back);
    // ланцюги
    const iron = stdMat({ color: 0x2a2826, metalness: 0.9, roughness: 0.5 });
    const linkG = new THREE.TorusGeometry(0.06, 0.015, 6, 12);
    for (const x of [-5.1, 1.7, 8.5]) for (let k = 0; k < 14; k++) { const l = new THREE.Mesh(linkG, iron); l.position.set(x, 6 - k * 0.1, -4.2); l.rotation.y = k % 2 ? Math.PI / 2 : 0; A.group.add(l); }
    // смолоскипи на колонах
    for (let i = -3; i <= 3; i += 2) {
      const x = i * 3.4;
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.5, 6), stdMat({ color: 0x3a2516, roughness: 0.9 })); t.position.set(x, 2.6, -4.45); t.rotation.x = 0.4;
      A.group.add(t);
      const L = new THREE.PointLight(0xff8a3a, 5, 9, 1.6); L.position.set(x, 3.1, -4.1); A.group.add(L);
      A.fires.push({ g: null, L, fx: [x, 2.9, -4.3], base: 5 });
    }
    // ящики, павутиння, свічки в нішах, глядачі в капюшонах
    const crateM = stdMat({ color: 0x5a4030, roughness: 0.9 });
    for (const [x, z, s] of [[-9, -3.6, 0.8], [-8.2, -3.9, 0.6], [9.2, -3.4, 0.9]]) { const c = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), crateM); c.position.set(x, s / 2, z); c.rotation.y = Math.random(); c.castShadow = true; A.group.add(c); }
    for (const x of [-8.5, -1.7, 5.1]) cobweb(A, x + 1.2, 5.6, -4.5, Math.random());
    for (const x of [-6.8, 0, 6.8]) { candle(A, x - 0.15, 1.2, -4.55); candle(A, x + 0.12, 1.2, -4.55); }
    spawnCrowd(A, [
      { model: 'xbot', x: -5.1, z: -6.0, pose: 'stand', tint: [0.12, 0.1, 0.12] }, { model: 'xbot', x: 5.1, z: -6.0, pose: 'stand', tint: [0.12, 0.1, 0.12] }
    ]);
    // калюжі
    for (const [x, z, s] of [[-3, 1.2, 1.4], [4.5, 0.6, 1.1], [0.8, -2.5, 1.8]]) {
      const pd = new THREE.Mesh(new THREE.CircleGeometry(s, 24), new THREE.MeshPhysicalMaterial({ color: 0x0a0c0c, roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.85 }));
      pd.rotation.x = -Math.PI / 2; pd.position.set(x, 0.006, z); pd.scale.set(1.4, 1, 1); A.group.add(pd);
    }
    A.ambient = dt => {
      if (Math.random() < dt * 6) PN.emit(rand(-10, 10), 0.2, rand(-4, 2), rand(-0.1, 0.1), 0.05, 0, rand(5, 8), rand(1.2, 2.2), 0.25, 0.35, 0.32, 0.1, { fin: 0.4, grow: 0.6 });
      if (Math.random() < dt * 3) PA.emit(rand(-6, 6), 5.5, rand(-4, 1), 0, -0.1, 0, 0.9, 0.025, 0.6, 0.8, 1, 0.7, { grav: 9.8 });
    };
    return A;
  }

  // ---------- Прикраси бійців ----------
  function attachAt(bone, obj, worldPos, worldQuat) {
    bone.updateMatrixWorld(true);
    const m = new THREE.Matrix4().compose(worldPos, worldQuat || new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
    m.premultiply(bone.matrixWorld.clone().invert());
    m.decompose(obj.position, obj.quaternion, obj.scale);
    bone.add(obj);
  }
  // Скан голови: обрізаємо бюст до шиї, масштаб до метрів, додаємо очі
  let HEAD_GEO = null;
  function headGeometry() {
    if (HEAD_GEO) return HEAD_GEO;
    let src = null; GL.lps.scene.traverse(o => { if (o.isMesh && !src) src = o.geometry; });
    const g = src.index ? src : src.toNonIndexed();
    const pos = g.attributes.position, idx = g.index ? g.index.array : null, keep = [];
    const n = idx ? idx.length : pos.count;
    for (let i = 0; i < n; i += 3) {
      const a = idx ? idx[i] : i, b = idx ? idx[i + 1] : i + 1, c = idx ? idx[i + 2] : i + 2;
      if (Math.min(pos.getY(a), pos.getY(b), pos.getY(c)) > -1.85) keep.push(a, b, c);
    }
    const out = g.clone(); out.setIndex(keep);
    out.translate(0, -0.94, -0.05); out.scale(0.053, 0.053, 0.053);
    out.computeBoundingSphere();
    HEAD_GEO = out;
    return out;
  }
  function makeHead(F) {
    const grp = new THREE.Group();
    const mat = new THREE.MeshPhysicalMaterial({ map: TEX.lpsCol, normalMap: TEX.lpsNrm, roughness: 0.52, sheen: 0.35, sheenColor: new THREE.Color(0.8, 0.35, 0.3), sheenRoughness: 0.5, clearcoat: 0.08, emissive: new THREE.Color(0, 0, 0) });
    if (F.headTint) mat.color.fromArray(F.headTint);
    grp.add(new THREE.Mesh(headGeometry(), mat));
    // очі: білок, райдужка, зіниця з відблиском
    const white = new THREE.MeshPhysicalMaterial({ color: 0xf2ece4, roughness: 0.1, clearcoat: 1 });
    const iris = new THREE.MeshStandardMaterial({ color: F.eye || 0x3a2a1a, roughness: 0.3 });
    const pupil = new THREE.MeshBasicMaterial({ color: 0x050505 });
    for (const s of [-1, 1]) {
      const e = new THREE.Group();
      e.add(new THREE.Mesh(new THREE.SphereGeometry(0.0118, 16, 12), white));
      const ir = new THREE.Mesh(new THREE.CircleGeometry(0.0056, 16), iris); ir.position.z = 0.0116; e.add(ir);
      const pu = new THREE.Mesh(new THREE.CircleGeometry(0.0026, 12), pupil); pu.position.z = 0.0118; e.add(pu);
      e.position.set(s * 0.0322, 0.0094, 0.0915); e.scale.set(1, 0.62, 1);
      grp.add(e);
    }
    return grp;
  }

  // Козацький одяг поверх манекена: жупан з облямівкою, пояс, шаровари, чоботи
  function clothTex(base, trim, kind) {
    const c = mkCanvas(256, 256), g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.05})`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 1); }
    if (kind === 'coat') {
      // облямівка по краях розрізу спереду (u = 0 і u = 1) та внизу
      for (const x0 of [0, 236]) {
        g.fillStyle = trim; g.fillRect(x0, 0, 20, 256);
        g.fillStyle = '#7a0e0e'; for (let y = 6; y < 256; y += 16) { g.save(); g.translate(x0 + 10, y); g.rotate(Math.PI / 4); g.fillRect(-4, -4, 8, 8); g.restore(); }
      }
      g.fillStyle = trim; g.fillRect(0, 240, 256, 16);
      g.fillStyle = '#e8c35a'; for (let y = 30; y < 200; y += 34) { g.beginPath(); g.arc(24, y, 5, 0, TAU); g.fill(); }
    }
    if (kind === 'sash') { g.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 0; y < 256; y += 22) g.fillRect(0, y, 256, 4); }
    const t = texFrom(c, true); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
  }
  function lathe(prof, seg) { return new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg || 20); }
  function dressRig(r, O) {
    const B = r.b, W3 = () => new THREE.Vector3();
    r.root.updateMatrixWorld(true);
    const p = n => B[n].getWorldPosition(W3());
    const cloth = (col, map) => withDetail(new THREE.MeshPhysicalMaterial({ color: map ? 0xffffff : col, map: map || null, roughness: 0.85, sheen: 0.7, sheenRoughness: 0.6, sheenColor: new THREE.Color(col).multiplyScalar(1.5) }), 'cloth', 0.6);
    const add = (bone, geo, mat, pos, quat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; attachAt(B[bone], m, pos, quat); return m; };
    const hips = p('Hips'), sp1 = p('Spine1'), sp2 = p('Spine2'), neck = p('Neck'), la = p('LeftArm');
    const sw = Math.abs(la.x) + 0.03;
    // жупан: груди (Spine2) і низ (Spine)
    const coatT = clothTex(O.coat, O.trim, 'coat');
    const chestTop = neck.y + 0.005, chestBot = hips.y + 0.03, chestH = chestTop - chestBot;
    const chest = lathe([[sw * 0.84, 0], [sw * 0.86, chestH * 0.35], [sw * 0.97, chestH * 0.78], [sw * 0.78, chestH], [0.07, chestH + 0.012]], 28); chest.scale(1, 1, 0.68);
    const chM = cloth(O.coat, coatT); chM.side = THREE.DoubleSide;
    add('Spine1', chest, chM, new THREE.Vector3(0, chestBot, 0.008));
    const collar = new THREE.TorusGeometry(0.075, 0.018, 8, 20); collar.rotateX(Math.PI / 2);
    add('Spine2', collar, cloth(O.trim), new THREE.Vector3(0, neck.y - 0.005, 0.0));
    const skirtH = (O.long ? 0.42 : 0.2), waist = hips.y + 0.07;
    const skirt = lathe([[sw * 0.84, 0], [sw * 0.88, -0.08], [sw * (O.long ? 1.05 : 0.95), -skirtH]], 28); skirt.scale(1, 1, 0.72);
    const sm = cloth(O.coat, coatT); sm.side = THREE.DoubleSide;
    add('Spine', skirt, sm, new THREE.Vector3(0, waist + 0.005, 0.005));
    // пояс із кінцями
    const sashM = cloth(O.sash, clothTex(O.sash, O.sash, 'sash'));
    const sash = new THREE.CylinderGeometry(sw * 0.86, sw * 0.86, 0.1, 28, 1, true); sash.scale(1.02, 1, 0.74);
    sashM.side = THREE.DoubleSide;
    add('Spine', sash, sashM, new THREE.Vector3(0, waist - 0.02, 0.005));
    for (const s of [-1, 1]) add('Hips', new THREE.BoxGeometry(0.06, 0.26, 0.012), sashM, new THREE.Vector3(s * 0.05 + sw * 0.3, waist - 0.17, sw * 0.6), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, 0, s * 0.08)));
    // рукави сорочки: ховають кулясті шарніри манекена
    const sleeveM = withDetail(new THREE.MeshPhysicalMaterial({ color: O.sleeve || '#efe8da', roughness: 0.9, sheen: 0.8, sheenRoughness: 0.5, sheenColor: new THREE.Color(O.sleeve || '#ffffff'), side: THREE.DoubleSide }), 'cloth', 0.7);
    const cuffM = cloth(O.trim);
    for (const side of ['Left', 'Right']) {
      const a = p(side + 'Arm'), e = p(side + 'ForeArm'), h = p(side + 'Hand');
      const qa = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), e.clone().sub(a).normalize());
      const qe = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), h.clone().sub(e).normalize());
      const la = a.distanceTo(e), le = e.distanceTo(h);
      add(side + 'Arm', lathe([[0.072, 0.07], [0.082, 0.0], [0.074, -la * 0.5], [0.068, -la - 0.03]], 16), sleeveM, a, qa);
      add(side + 'ForeArm', lathe([[0.07, 0.04], [0.078, -le * 0.35], [0.066, -le * 0.8], [0.046, -le + 0.02]], 16), sleeveM, e, qe);
      add(side + 'ForeArm', lathe([[0.05, 0], [0.05, -0.035]], 14), cuffM, h.clone().addScaledVector(h.clone().sub(e).normalize(), -0.045), qe);
    }
    // шаровари й чоботи
    const pantsM = cloth(O.pants); pantsM.side = THREE.DoubleSide;
    const bootM = new THREE.MeshPhysicalMaterial({ color: O.boots, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.3 });
    const seat = lathe([[sw * 0.88, 0.03], [sw * 1.04, -0.1], [sw * 1.0, -0.2], [sw * 0.7, -0.3]], 24); seat.scale(1, 1, 0.95);
    add('Hips', seat, pantsM, new THREE.Vector3(0, hips.y + 0.02, 0.0));
    for (const side of ['Left', 'Right']) {
      const up = p(side + 'UpLeg'), kn = p(side + 'Leg'), an = p(side + 'Foot'), toe = p(side + 'ToeBase');
      const L1 = up.y - kn.y, L2 = kn.y - an.y;
      const thigh = lathe([[0.115, 0.07], [0.148, -L1 * 0.35], [0.14, -L1 * 0.75], [0.1, -L1 - 0.04]], 18);
      add(side + 'UpLeg', thigh, pantsM, new THREE.Vector3(up.x * 1.05, up.y, up.z));
      const shin = lathe([[0.1, 0.04], [0.115, -L2 * 0.25], [0.085, -L2 * 0.5], [0.062, -L2 * 0.55]], 18);
      add(side + 'Leg', shin, pantsM, new THREE.Vector3(kn.x, kn.y, kn.z));
      const boot = lathe([[0.066, 0], [0.06, -L2 * 0.25], [0.056, -L2 * 0.48], [0.05, -L2 * 0.5]], 16);
      add(side + 'Leg', boot, bootM, new THREE.Vector3(an.x, an.y + L2 * 0.5, an.z));
      const fl = Math.max(0.12, toe.distanceTo(an) + 0.07);
      const foot = new THREE.CapsuleGeometry(0.045, fl, 4, 10); foot.rotateX(Math.PI / 2); foot.scale(1, 0.8, 1);
      const mid = an.clone().lerp(toe, 0.55); mid.y = an.y - 0.03;
      add(side + 'Foot', foot, bootM, mid);
    }
  }
  function decorateRig(r, F) {
    if (F.head === 'lps' && GL.lps) r.setHumanHead(makeHead(F));
    if (F.outfit) dressRig(r, F.outfit);
    if (!F.acc) return;
    const B = r.b;
    r.root.updateMatrixWorld(true);
    const tube = (pts, rad, mat) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3().fromArray(p))), 20, rad, 6), mat); m.castShadow = true; return m; };
    const H = r.fakeHead;
    if ((F.acc === 'cossack' || F.acc === 'taras') && H) {
      const hairCol = F.acc === 'cossack' ? 0xb8b2a8 : 0x2a1c12;
      const hair = new THREE.MeshPhysicalMaterial({ color: hairCol, roughness: 0.55, sheen: 1, sheenColor: new THREE.Color(hairCol).multiplyScalar(1.6), sheenRoughness: 0.3 });
      // оселедець від маківки за вухо
      H.add(tube([[0, 0.155, 0.03], [0.012, 0.162, -0.02], [0.05, 0.14, -0.075], [0.085, 0.08, -0.075], [0.096, 0.01, -0.045], [0.094, -0.05, -0.02]], 0.0085, hair));
      const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), hair); tuft.scale.set(1, 0.35, 1.4); tuft.position.set(0, 0.156, 0.02); H.add(tuft);
      // вуса донизу
      const long = F.acc === 'cossack' ? 1.35 : 1;
      for (const s of [-1, 1]) H.add(tube([[s * 0.003, -0.019, 0.116], [s * 0.022, -0.026, 0.11], [s * 0.036, -0.045 * long, 0.098], [s * 0.04, -0.075 * long, 0.085]], 0.0055, hair));
      if (F.acc === 'cossack') {
        const fur = stdMat({ color: 0x15100c, roughness: 1 });
        const hat = new THREE.Group();
        const body = new THREE.Mesh(displaceGeo(new THREE.CylinderGeometry(0.098, 0.104, 0.15, 24, 3), 0.007, 45, 3), fur); body.castShadow = true;
        const cloth = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 8, 0, TAU, 0, Math.PI / 2), stdMat({ color: 0x8e1612, roughness: 0.8 })); cloth.scale.y = 0.5; cloth.position.y = 0.07;
        const tassel = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), stdMat({ color: 0xd6a83a, metalness: 0.8, roughness: 0.3 })); tassel.position.set(0, 0.11, -0.05);
        hat.add(body, cloth, tassel); hat.position.set(0, 0.165, -0.012); hat.rotation.x = -0.12;
        H.add(hat);
      }
    }
    if (F.acc === 'cossack') {
      const sh = new THREE.Shape(); sh.moveTo(-0.018, 0); sh.quadraticCurveTo(-0.03, 0.45, 0.06, 0.82); sh.lineTo(0.068, 0.8); sh.quadraticCurveTo(0.012, 0.45, 0.018, 0); sh.closePath();
      const bladeG = new THREE.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: false }); bladeG.translate(0, 0.07, -0.003);
      const sabre = new THREE.Group();
      sabre.add(new THREE.Mesh(bladeG, stdMat({ color: 0xdfe4ea, metalness: 1, roughness: 0.14 })));
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.14, 8), stdMat({ color: 0x2a1a10, roughness: 0.6 })); hilt.position.y = -0.02; sabre.add(hilt);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.018, 0.03), stdMat({ color: 0xc9a043, metalness: 1, roughness: 0.3 })); guard.position.y = 0.055; sabre.add(guard);
      sabre.traverse(o => { if (o.isMesh) o.castShadow = true; });
      const hand = B.RightHand.getWorldPosition(new THREE.Vector3()), tip = (B.RightHandMiddle1 || B.RightHand).getWorldPosition(new THREE.Vector3());
      const fdir = tip.clone().sub(hand).normalize();
      attachAt(B.RightHand, sabre, hand.clone().addScaledVector(fdir, 0.07).add(new THREE.Vector3(0, -0.03, 0)), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0.25, 1).normalize()));
      r.sabre = sabre;
    }
    // сережка в лівому вусі (козаки)
    if ((F.acc === 'cossack' || F.acc === 'taras') && H) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0025, 6, 16), stdMat({ color: 0xd4a83a, metalness: 1, roughness: 0.25 }));
      ring.position.set(0.079, -0.018, 0.0); ring.rotation.y = Math.PI / 2; H.add(ring);
    }
    // Ворон: глибокий капюшон і маска
    if (F.acc === 'hood' && H) {
      const cloth = withDetail(new THREE.MeshPhysicalMaterial({ color: 0x141418, roughness: 0.85, sheen: 0.6, sheenColor: new THREE.Color(0x3a3a48), side: THREE.DoubleSide }), 'cloth', 0.6);
      const hood = new THREE.Mesh(new THREE.SphereGeometry(0.142, 28, 18, Math.PI / 2 + 0.85, TAU - 1.7, 0, Math.PI * 0.7), cloth);
      hood.scale.set(1, 1.14, 1.12); hood.position.set(0, 0.055, -0.012); hood.castShadow = true; H.add(hood);
      const drape = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.17, 0.2, 20, 1, true, Math.PI * 0.55, Math.PI * 0.9 + 0.0), cloth);
      drape.position.set(0, -0.09, -0.03); H.add(drape);
      const mask = new THREE.Mesh(new THREE.CylinderGeometry(0.084, 0.09, 0.07, 22, 1, true, -1.15, 2.3), withDetail(new THREE.MeshPhysicalMaterial({ color: 0x0c0c10, roughness: 0.9, side: THREE.DoubleSide }), 'cloth', 0.5));
      mask.position.set(0, -0.034, 0.03); H.add(mask);
      const trim = new THREE.Mesh(new THREE.TorusGeometry(0.087, 0.004, 6, 28, 2.3), stdMat({ color: 0x6a0a12, roughness: 0.6 }));
      trim.rotation.set(Math.PI / 2, 0, Math.PI / 2 - 1.15); trim.position.set(0, 0.0, 0.03); H.add(trim);
    }
    // намисто з коралів
    if (F.acc === 'namysto' || F.acc === 'vinok') {
      const neck = B.Neck.getWorldPosition(new THREE.Vector3()), sp2 = B.Spine2.getWorldPosition(new THREE.Vector3());
      const beads = new THREE.Group(), cols = [0xc81e1e, 0xe0402a, 0xf2c230];
      for (let row = 0; row < 3; row++) for (let i = 0; i < 26; i++) {
        const a = i / 26 * TAU, front = Math.max(0, Math.sin(a));
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.0085 + (i % 3 === 0 ? 0.003 : 0), 8, 6), stdMat({ color: cols[(i + row) % 3 === 2 ? 2 : (i + row) % 2], roughness: 0.25, metalness: 0.1 }));
        const r = 0.072 + row * 0.012;
        b.position.set(Math.cos(a) * r, -0.01 - front * (0.035 + row * 0.022), Math.sin(a) * r * 0.9 + 0.012);
        beads.add(b);
      }
      attachAt(B.Spine2, beads, new THREE.Vector3(neck.x, neck.y - 0.02, neck.z));
      void sp2;
    }
    // Барон: плюмаж; Чорний лицар: роги й шипи. Обидва — плащ.
    if (F.acc === 'plume' || F.acc === 'horns') {
      const hp = B.Head.getWorldPosition(new THREE.Vector3()), top = hp.clone().add(new THREE.Vector3(0, 0.2, 0));
      if (F.acc === 'plume') {
        const plume = new THREE.Group(), pm = withDetail(new THREE.MeshPhysicalMaterial({ color: 0xb01818, roughness: 0.9, sheen: 1, sheenColor: new THREE.Color(0xff6060) }), 'cloth', 0.8);
        for (let i = 0; i < 14; i++) { const a = -0.3 + i / 13 * 2.4; const q = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.16, 6), pm); q.position.set(0, Math.sin(a) * 0.1 + 0.02, -Math.cos(a) * 0.1); q.rotation.x = a - Math.PI / 2; plume.add(q); }
        attachAt(B.Head, plume, top.clone().add(new THREE.Vector3(0, -0.04, -0.02)));
      } else {
        const hm = stdMat({ color: 0x1a1418, roughness: 0.4, metalness: 0.6 });
        for (const s of [-1, 1]) {
          const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(s * 0.08, 0.05, -0.01), new THREE.Vector3(s * 0.13, 0.15, -0.04), new THREE.Vector3(s * 0.1, 0.26, -0.03)]);
          const g = new THREE.TubeGeometry(curve, 16, 0.024, 8);
          const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const u = Math.floor(i / 9) / 16; const c = curve.getPoint(u); p.setXYZ(i, c.x + (p.getX(i) - c.x) * (1 - u * 0.9), c.y + (p.getY(i) - c.y) * (1 - u * 0.9), c.z + (p.getZ(i) - c.z) * (1 - u * 0.9)); }
          g.computeVertexNormals();
          const horn = new THREE.Mesh(g, hm); horn.castShadow = true;
          attachAt(B.Head, horn, hp.clone().add(new THREE.Vector3(s * 0.09, 0.12, 0)));
        }
        const spikeM = stdMat({ color: 0x2a2228, metalness: 0.9, roughness: 0.3 });
        for (const side of ['Left', 'Right']) {
          const sh = B[side + 'Arm'].getWorldPosition(new THREE.Vector3()), sg = side === 'Left' ? 1 : -1;
          for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.12, 6), spikeM); c.castShadow = true; attachAt(B[side + 'Arm'], c, sh.clone().add(new THREE.Vector3(sg * (0.02 + i * 0.05), 0.09, -0.02 + i * 0.01)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -sg * 0.35))); }
        }
      }
      const neck = B.Neck.getWorldPosition(new THREE.Vector3()), la = B.LeftArm.getWorldPosition(new THREE.Vector3());
      const cw = Math.abs(la.x) * 2 + 0.06, ch = 0.95;
      const cg = new THREE.PlaneGeometry(cw, ch, 6, 10); cg.translate(0, -ch / 2, 0);
      const cp = cg.attributes.position;
      for (let i = 0; i < cp.count; i++) { const x = cp.getX(i), y = cp.getY(i); cp.setZ(i, -Math.pow(x / (cw / 2), 2) * 0.06 - (-y) * 0.12 + Math.sin(x * 30) * 0.012 * (-y)); cp.setX(i, x * (1 + (-y) * 0.35)); }
      cg.computeVertexNormals();
      const cape = new THREE.Mesh(cg, withDetail(new THREE.MeshPhysicalMaterial({ color: F.acc === 'plume' ? 0x1a2a5a : 0x4a0a12, roughness: 0.8, sheen: 0.8, sheenColor: new THREE.Color(F.acc === 'plume' ? 0x4a6aff : 0xff3040), side: THREE.DoubleSide }), 'cloth', 0.7));
      cape.castShadow = true;
      attachAt(B.Spine2, cape, new THREE.Vector3(0, neck.y - 0.03, neck.z - 0.13));
    }
    if (F.acc === 'vinok') {
      const hp = B.Head.getWorldPosition(new THREE.Vector3());
      const top = B.HeadTop_End ? B.HeadTop_End.getWorldPosition(new THREE.Vector3()) : hp.clone().add(new THREE.Vector3(0, 0.17, 0));
      const w = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.018, 8, 28), stdMat({ color: 0x2e6a2a, roughness: 0.8 })); ring.rotation.x = Math.PI / 2 - 0.25; w.add(ring);
      const cols = [0xd8231e, 0xf2c230, 0x3a66d8, 0xf0f0f0];
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; const f = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), stdMat({ color: cols[i % 4], roughness: 0.6, emissive: new THREE.Color(cols[i % 4]), emissiveIntensity: 0.15 })); f.position.set(Math.cos(a) * 0.115, Math.sin(a) * 0.115 * Math.sin(0.25), Math.sin(a) * 0.115 * Math.cos(0.25)); w.add(f); }
      for (let i = 0; i < 4; i++) { const rib = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.42), stdMat({ color: cols[i], roughness: 0.8, side: THREE.DoubleSide })); rib.position.set(-0.04 + i * 0.027, -0.2, -0.12); rib.rotation.x = 0.25; w.add(rib); }
      attachAt(B.Head, w, top.clone().add(new THREE.Vector3(0, -0.06, 0)));
    }
  }


  // ---------- Глядачі та дрібниці інтер’єру ----------
  const SIT = { hip: [0, -0.5, -0.12], hr: [0, 0, 0], ch: [6, 0, 0], lf: [0.15, 0, 0.42], rf: [-0.15, 0, 0.42], lk: [0.2, 0.4, 1], rk: [-0.2, 0.4, 1], lh: [0.22, 0.62, 0.36], rh: [-0.22, 0.62, 0.36], le: [0.6, -1, 0], re: [-0.6, -1, 0], fist: 0.3, fy: [0, 0] };
  const STAND = { hip: [0, -0.02, 0], hr: [0, 0, 0], ch: [0, 0, 0], lf: [0.12, 0, 0.02], rf: [-0.12, 0, -0.02], lh: [0.24, 0.9, 0.05], rh: [-0.24, 0.9, 0.05], le: [1, -0.4, -0.3], re: [-1, -0.4, -0.3], fist: 0.3, fy: [-10, 10] };
  const ARMS_UP = { lh: [0.3, 1.95, 0.15], rh: [-0.3, 1.95, 0.15], le: [1, 0, 0], re: [-1, 0, 0], fist: 1 };
  function crowdMat(tint, metal) {
    return src => {
      if (metal) return new THREE.MeshPhysicalMaterial({ color: new THREE.Color().fromArray(tint), metalness: 1, roughness: 0.28, clearcoat: 0.5, emissive: new THREE.Color(0, 0, 0) });
      const m = src.clone(); if (m.color) m.color.multiply(new THREE.Color().fromArray(tint)); if (!m.emissive) m.emissive = new THREE.Color(0, 0, 0);
      if (/Joint/i.test(src.name) || /Beta/i.test(src.name) || /asdf/i.test(src.name)) { m.color.setRGB(tint[0] * 0.6, tint[1] * 0.6, tint[2] * 0.6); m.metalness = 0; m.roughness = 0.75; }
      return m;
    };
  }
  const OUTFITS = [
    { coat: '#2a4a2a', trim: '#d6a83a', sash: '#8a1a14', pants: '#3a2a5a', boots: '#2a1610' },
    { coat: '#5a2a14', trim: '#e0c070', sash: '#1e4a8a', pants: '#8a1a14', boots: '#1a1210' },
    { coat: '#203050', trim: '#c9a043', sash: '#a32a1a', pants: '#304a2a', boots: '#3a2010' }
  ];
  function spawnCrowd(A, list) {
    if (quality === 0 || !GL.xbot) return;
    if (isMobile && quality < 2) list = list.slice(0, 2);
    A.crowd = [];
    for (const c of list) {
      const human = c.model === 'xbot' && c.o !== undefined && GL.lps;
      const r = new Rig(GL[c.model], { height: c.h || 1.66, material: human ? materialFor('taras') : crowdMat(c.tint || [0.6, 0.6, 0.65], c.metal), glowCol: new THREE.Color(1, 1, 1) });
      if (human) { r.setHumanHead(makeHead({ headTint: c.skinTint })); dressRig(r, OUTFITS[c.o || 0]); }
      r.root.position.set(c.x, c.y || 0, c.z); r.root.rotation.y = c.ry || 0;
      r.root.traverse(o => { if (o.isMesh) o.castShadow = quality > 1; });
      A.group.add(r.root);
      const ent = { r, kind: c.pose, ph: Math.random() * 10, pose: mkPose() };
      if (c.pose === 'statue') r.apply(mkPose(c.statue === 'win' ? Object.assign({}, STAND, { rh: [-0.14, 2.02, 0.12], re: [-1, 0, 0], fist: 1 }) : { hip: [0, -0.05, 0], hr: [0, 0, 0] }));
      A.crowd.push(ent);
    }
    A.cheer = 0;
  }
  function crowdCheer(dmg) { if (arena && arena.crowd) { if ((arena.cheer || 0) < 0.3) sfx.crowd(dmg >= 14 ? 1 : 0.5); arena.cheer = Math.max(arena.cheer || 0, dmg >= 14 ? 1.6 : 0.9); } }
  function tickCrowd(dt) {
    if (!arena || !arena.crowd) return;
    arena.cheer = Math.max(0, (arena.cheer || 0) - dt);
    const ch = arena.cheer > 0;
    for (const e of arena.crowd) {
      if (e.kind === 'statue') continue;
      const base = mkPose(e.kind === 'sit' ? SIT : STAND);
      const t = clock + e.ph, br = Math.sin(t * 2.1);
      base.hip[1] += br * 0.008; base.ch[0] += br * 1.5; base.hd[1] = Math.sin(t * 0.4) * 20 + (game ? clamp(((game.me.x + game.opp.x) / 2 * SC - e.r.root.position.x) * 6, -30, 30) : 0);
      if (ch) { const k = 0.6 + Math.sin(t * 12) * 0.4; base.lh = ARMS_UP.lh.map((v, i) => lerp(base.lh[i], v, k)); base.rh = ARMS_UP.rh.map((v, i) => lerp(base.rh[i], v, k)); base.le = ARMS_UP.le; base.re = ARMS_UP.re; base.fist = 1; if (e.kind === 'stand') base.hip[1] += Math.abs(Math.sin(t * 12)) * 0.04; }
      lerpPose(e.pose, base, 1 - Math.exp(-dt * 8), e.pose);
      e.r.apply(e.pose);
    }
  }
  function towelTex() {
    const c = mkCanvas(64, 256), g = c.getContext('2d');
    g.fillStyle = '#f2ece0'; g.fillRect(0, 0, 64, 256);
    for (const y0 of [16, 196]) { for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) { g.fillStyle = (i + j) % 2 ? '#b3201a' : '#1a1a1a'; g.save(); g.translate(8 + i * 10, y0 + j * 9); g.rotate(Math.PI / 4); g.fillRect(-3, -3, 6, 6); g.restore(); } }
    g.fillStyle = '#b3201a'; g.fillRect(0, 250, 64, 6);
    return texFrom(c, true);
  }
  let TOWEL = null;
  function rushnyk(A, x, y, z, w, h) {
    TOWEL = TOWEL || towelTex();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 1, 6), stdMat({ map: TOWEL, roughness: 0.9, side: THREE.DoubleSide }));
    m.position.set(x, y, z); A.group.add(m); return m;
  }
  function pot(A, x, y, z, s, col) {
    const m = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.09, 0.01], [0.13, 0.08], [0.12, 0.17], [0.07, 0.22], [0.075, 0.26], [0, 0.26]].map(a => new THREE.Vector2(a[0], a[1])), 16), stdMat({ color: col || 0x8a4a2a, roughness: 0.7 }));
    m.scale.setScalar(s || 1); m.position.set(x, y, z); m.castShadow = true; A.group.add(m); return m;
  }
  function shield(A, x, y, z) {
    const g = new THREE.Group();
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 28), stdMat({ color: 0x6a1a14, roughness: 0.6 })); d.rotation.x = Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 8, 28), stdMat({ color: 0xb08a3a, metalness: 1, roughness: 0.3 }));
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8, 0, TAU, 0, Math.PI / 2), stdMat({ color: 0xb08a3a, metalness: 1, roughness: 0.3 })); boss.rotation.x = Math.PI / 2;
    g.add(d, rim, boss);
    for (const s of [-1, 1]) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.2, 6), stdMat({ color: 0x4a3020, roughness: 0.8 })); sp.rotation.z = s * 0.7; sp.position.z = -0.05; g.add(sp); const tip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.2, 6), stdMat({ color: 0xc8ccd4, metalness: 1, roughness: 0.25 })); tip.position.set(-s * 0.71, 0.83, -0.05); tip.rotation.z = s * 0.7; g.add(tip); }
    g.position.set(x, y, z); A.group.add(g); return g;
  }
  function candle(A, x, y, z) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, 0.14, 8), stdMat({ color: 0xf2e6c8, roughness: 0.6 })); c.position.set(x, y + 0.07, z); A.group.add(c);
    (A.candles || (A.candles = [])).push([x, y + 0.16, z]);
  }
  function cobweb(A, x, y, z, ry) {
    const c = mkCanvas(128, 128), g = c.getContext('2d');
    g.strokeStyle = 'rgba(220,220,220,0.5)'; g.lineWidth = 1;
    for (let i = 0; i < 9; i++) { const a = i / 8 * Math.PI / 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 128, Math.sin(a) * 128); g.stroke(); }
    for (let r = 14; r < 128; r += 14) { g.beginPath(); for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI / 2, rr = r + Math.sin(i * 2) * 3; if (i) g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.stroke(); }
    const t = texFrom(c, false); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true }));
    m.position.set(x, y, z); m.rotation.set(Math.PI, ry || 0, 0); A.group.add(m);
  }
  function candleTick(A, dt) { if (A.candles) for (const c of A.candles) if (Math.random() < dt * 9) PA.emit(c[0], c[1], c[2], 0, 0.25, 0, 0.22, 0.08, 3, 1.4, 0.4, 0.9, { grow: -0.5, heat: 1 }); }
  function setArena(id) {
    if (arenaId === id) return;
    setMusic(id);
    if (arena) { scene.remove(arena.group, arena.sky); }
    if (!arenaCache[id]) arenaCache[id] = ({ kurhan: buildKurhan, kuznia: buildKuznia, zala: buildZala, tron: buildTron, shynok: buildShynok, pidval: buildPidval, porohy: buildPorohy }[id] || buildZala)();
    arena = arenaCache[id]; arenaId = id;
    scene.add(arena.group, arena.sky);
    scene.fog = arena.fog;
    const E = arena.env;
    renderer.toneMappingExposure = E.exposure;
    hemi.color.set(E.hemi[0]); hemi.groundColor.set(E.hemi[1]); hemi.intensity = E.hemi[2];
    sun.color.set(E.sun[0]); sun.intensity = E.sun[1]; sun.userData.off = new THREE.Vector3().fromArray(E.sun[2]);
    rim.color.set(E.rim[0]); rim.intensity = E.rim[1]; rim.userData.off = new THREE.Vector3().fromArray(E.rim[2]);
    fill.color.set(E.fill[0]); fill.intensity = E.fill[1]; fill.userData.off = new THREE.Vector3().fromArray(E.fill[2]);
    grade.uniforms.uTint.value.fromArray(E.tint);
    bloom.strength = E.bloom;
    // карта оточення з неба арени
    if (!arena.envTex) {
      // відбиття знімаємо з самої арени (стіни, вікна, лампи) з висоти грудей бійця
      const es = new THREE.Scene();
      const E2 = arena.env;
      es.add(arena.group, arena.sky);
      es.fog = arena.fog;
      const eh = new THREE.HemisphereLight(E2.hemi[0], E2.hemi[1], E2.hemi[2] * 1.6);
      const ed = new THREE.DirectionalLight(E2.sun[0], E2.sun[1]); ed.position.fromArray(E2.sun[2]);
      es.add(eh, ed);
      const glows = [];
      for (const f of arena.fires) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 0.7, 0.25) })); m.position.fromArray(f.fx); m.position.y -= 1.3; es.add(m); glows.push(m); }
      arena.group.position.y = -1.3; arena.sky.position.set(0, 0, 0);
      try { arena.envTex = pmrem.fromScene(es, 0.02, 0.1, 300).texture; } catch (e) { arena.envTex = null; }
      arena.group.position.y = 0;
      for (const m of glows) { m.geometry.dispose(); m.material.dispose(); }
      eh.dispose(); ed.dispose();
      scene.add(arena.group, arena.sky);
    }
    scene.environment = arena.envTex;
    PA.clear(); PN.clear();
  }
  function tickArena(dt) {
    if (!arena) return;
    arena.sky.material.uniforms.uTime.value = clock;
    if (arena.grass) arena.grass.userData.uTime.value = clock;
    for (const f of arena.fires) {
      if (!f.noFire) fireAt(f.fx[0], f.fx[1], f.fx[2], f.L ? 1 : 1.1, dt, quality === 0 ? 18 : 34);
      if (f.L) f.L.intensity = f.base * (0.85 + Math.sin(clock * 17 + f.fx[0]) * 0.08 + Math.random() * 0.12);
    }
    if (arena.ambient) arena.ambient(dt);
    candleTick(arena, dt);
    tickCrowd(dt);
    arena.sky.position.copy(camera.position);
  }

  // =====================================================================
  // Ефекти бою (координати в ігрових одиницях)
  // =====================================================================
  let fx = [], flash = 0, darken = 0, slowmo = 0, slowK = 0.3, hitStop = 0, aberr = 0;
  // Фінальний удар: майже зупинка часу, облітання камери, знебарвлення, вибухи
  function startFinale(winner, loser) {
    cam.fin = { w: winner, f: loser, t: 0, dur: 2.8, k: 0, fired: 0 };
    slowmo = 2.6; slowK = 0.1;
    flash = 1; aberr = 0.03; sfx.finisher();
    const c = fighterById(winner.ch).glow;
    spark(loser.x, loser.y - 120, winner.face, 2.4, c.map(v => Math.round(v * 255)).join(','));
    groundShock(loser.x, c); pillar(loser.x, c);
    if (!reduceMotion) { const sp = $('speed'); sp.hidden = false; clearTimeout(superBurst.t); superBurst.t = setTimeout(() => { sp.hidden = true; }, 1400); }
  }
  function tickFinale(rdt) {
    const F = cam.fin; if (!F) return;
    F.t += rdt;
    const c = fighterById(F.w.ch).glow;
    if (F.fired < 1 && F.t > 0.7) { F.fired = 1; spark(F.f.x, F.f.y - 100, -F.w.face, 1.6, '255,255,255'); groundShock(F.f.x, c); sfx.hit(true); }
    if (F.fired < 2 && F.t > 1.5) { F.fired = 2; flash = 0.6; dust(F.f.x, 0, 30); }
    const desat = F.t < 0.25 ? F.t / 0.25 : F.t > F.dur - 0.5 ? Math.max(0, (F.dur - F.t) / 0.5) : 1;
    grade.uniforms.uSat.value = lerp(1.14, 0.3, desat);
    grade.uniforms.uVig.value = lerp(0.42, 0.7, desat);
    if (F.t >= F.dur) { cam.fin = null; slowK = 0.3; grade.uniforms.uSat.value = 1.14; grade.uniforms.uVig.value = 0.42; }
  }
  const cam = { x: 0, w: 600, shake: 0, punch: 0, cut: null, cutK: 0 };
  const W = (x, y, z) => [x * SC, -y * SC, z || 0.18];
  function spark(x, y, dir, power, col) {
    const [wx, wy, wz] = W(x, y);
    const [r, g, b] = parseCol(col, '255,196,110');
    const n = Math.round(12 + power * 26);
    for (let i = 0; i < n; i++) {
      const a = rand(-1.2, 1.2), sp = rand(2, 7) * (0.6 + power * 0.6);
      PA.emit(wx, wy, wz, Math.cos(a) * sp * dir + rand(-1, 1), Math.sin(a) * sp + rand(0, 2), rand(-2, 2), rand(0.18, 0.45), rand(0.025, 0.05), r * 5, g * 4, b * 3, 1, { grav: 9, drag: 2.5 });
    }
    PA.emit(wx, wy, wz, 0, 0, 0, 0.1, 0.32 + power * 0.4, r * 2.6, g * 2.3, b * 2, 1, { grow: 0.8 });
    PA.emit(wx, wy, wz, 0, 0, 0, 0.2, 0.2 + power * 0.25, 1.4, 1.4, 1.4, 0.6, { grow: 2.5 });
    if (power > 0.7) { fx.push({ k: 'ring', x: wx, y: wy, z: wz, life: 0.3, max: 0.3, col: [r, g, b] }); aberr = Math.max(aberr, 0.012); }
  }
  function dust(x, y, n, col) {
    const [wx] = W(x, y); const [r, g, b] = parseCol(col, '150,128,100');
    const tint = arenaId === 'kuznia' ? 0.5 : arenaId === 'porohy' ? 0.6 : 1;
    for (let i = 0; i < n; i++) PN.emit(wx + rand(-0.3, 0.3), 0.05, rand(-0.3, 0.4), rand(-1.4, 1.4), rand(0.2, 1), rand(-0.6, 0.6), rand(0.6, 1.3), rand(0.25, 0.5), r * tint, g * tint, b * tint, 0.45, { grow: 2.2, drag: 2.5, fin: 0.1 });
  }
  function smoke(x, y, n) {
    const [wx] = W(x, y);
    for (let i = 0; i < n * 2; i++) PN.emit(wx + rand(-0.4, 0.4), rand(0.1, 1.8), rand(-0.3, 0.4), rand(-0.8, 0.8), rand(0.2, 1.2), rand(-0.4, 0.4), rand(0.7, 1.4), rand(0.4, 0.8), 0.05, 0.03, 0.07, 0.85, { grow: 1.8, drag: 2, fin: 0.1 });
    for (let i = 0; i < n; i++) PA.emit(wx + rand(-0.3, 0.3), rand(0.2, 1.6), 0.1, rand(-1, 1), rand(0.5, 2), 0, rand(0.4, 0.8), 0.05, 3, 0.2, 0.4, 1, { drag: 1 });
  }
  function lightning(x, bc) {
    bc = bc || [0.55, 0.7, 1];
    const wx = x * SC;
    const pts = []; let px = wx + rand(-1.5, 1.5), py = 14;
    while (py > 0) { pts.push([px, py]); py -= rand(0.4, 1.1); px += rand(-0.55, 0.55); px = lerp(px, wx, 0.12); }
    pts.push([wx, 0]);
    const geo = new THREE.BufferGeometry(), v = [];
    const ribbon = (P, w) => { for (let i = 0; i < P.length - 1; i++) { const [x0, y0] = P[i], [x1, y1] = P[i + 1]; v.push(x0 - w, y0, 0.2, x0 + w, y0, 0.2, x1 + w, y1, 0.2, x0 - w, y0, 0.2, x1 + w, y1, 0.2, x1 - w, y1, 0.2); } };
    ribbon(pts, 0.05);
    for (let b = 0; b < 3; b++) { const s = Math.floor(rand(1, pts.length - 3)); let [bx, by] = pts[s]; const br = [[bx, by]]; for (let k = 0; k < 4; k++) { bx += rand(-0.9, 0.9); by -= rand(0.4, 0.9); br.push([bx, by]); } ribbon(br, 0.025); }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(1 + bc[0] * 3.5, 1 + bc[1] * 3.5, 1 + bc[2] * 3.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    scene.add(mesh);
    const L = fxLight(new THREE.Color().fromArray(bc), 14, 25, wx, 4, 2.5);
    fx.push({ k: 'bolt', mesh, L, life: 0.45, max: 0.45 });
    flash = 0.7; aberr = 0.02;
    for (let i = 0; i < 50; i++) { const a = rand(0, Math.PI), s = rand(2, 8); PA.emit(wx, 0.05, 0.2, Math.cos(a) * s, Math.sin(a) * s, rand(-2, 2), rand(0.3, 0.7), rand(0.03, 0.06), bc[0] * 6, bc[1] * 6, bc[2] * 6, 1, { grav: 10, drag: 1.5 }); }
    dust(x, 0, 16, '120,130,150');
  }
  function quakeWave(x, dir) { fx.push({ k: 'quake', x: x * SC, dir, d: 0, life: 1.0, max: 1.0, acc: 0 }); dust(x, 0, 30, '110,85,60'); aberr = 0.02; }
  function trailFx(f, colOver) {
    const v = views.get(f); if (!v || !v.rig) return;
    const c = colOver || fighterById(f.ch).glow, p = new THREE.Vector3();
    for (const b of ['Hips', 'Spine2', 'Head', 'LeftHand', 'RightHand', 'LeftFoot', 'RightFoot']) {
      const bone = v.rig.b[b]; if (!bone) continue;
      bone.getWorldPosition(p);
      PA.emit(p.x, p.y, p.z, 0, 0, 0, 0.3, 0.32, c[0] * 2.5, c[1] * 2.5, c[2] * 2.5, 0.45, { grow: -0.5 });
    }
  }

  // ---------- Ефекти суперударів ----------
  const ARC_GEO = (() => {
    const N = 28, pos = [], col = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, a = -1.2 + u * 2.4, w = 0.2 * Math.sin(Math.PI * u) + 0.01, r = 0.66;
      const c = Math.pow(Math.sin(Math.PI * u), 0.6) * (0.35 + 0.65 * u);
      pos.push(Math.cos(a) * (r - w), Math.sin(a) * (r - w), 0, Math.cos(a) * (r + w * 0.4), Math.sin(a) * (r + w * 0.4), 0);
      col.push(c * 0.5, c * 0.5, c * 0.5, c, c, c);
      if (i < N) { const o = i * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
    return g;
  })();
  const additive = (c, k, extra) => new THREE.MeshBasicMaterial(Object.assign({ color: new THREE.Color(c[0] * k, c[1] * k, c[2] * k), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }, extra || {}));
  function slashArc(x, y, face, col, size, rot) {
    const m = new THREE.Mesh(ARC_GEO, additive(col, 4.5, { vertexColors: true }));
    const [wx, wy] = W(x, y);
    m.position.set(wx, wy, 0.4); m.rotation.z = (rot || 0) * face;
    fx.push({ k: 'arc', mesh: m, life: 0.24, max: 0.24, size: size || 1, face });
    scene.add(m);
  }
  const RING_GEO = new THREE.RingGeometry(0.8, 1, 64); RING_GEO.rotateX(-Math.PI / 2);
  function groundShock(x, col) {
    const m = new THREE.Mesh(RING_GEO, additive(col, 3.5));
    m.position.set(x * SC, 0.04, 0); scene.add(m);
    fx.push({ k: 'shock', mesh: m, life: 0.55, max: 0.55 });
    for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; PN.emit(x * SC + Math.cos(a) * 0.4, 0.05, Math.sin(a) * 0.4 - 0.2, Math.cos(a) * 5, rand(0.2, 0.7), Math.sin(a) * 3, rand(0.4, 0.7), rand(0.2, 0.35), 0.4, 0.36, 0.32, 0.18, { grow: 1.6, drag: 3 }); }
  }
  const PILLAR_GEO = (() => {
    const g = new THREE.CylinderGeometry(0.32, 0.32, 9, 32, 8, true); g.translate(0, 4.5, 0);
    const p = g.attributes.position, col = [];
    for (let i = 0; i < p.count; i++) { const c = Math.pow(1 - p.getY(i) / 9, 3); col.push(c, c, c); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  })();
  function pillar(x, col) {
    if (fx.some(e => e.k === 'pillar' && e.life > 0.4)) return;
    const m = new THREE.Mesh(PILLAR_GEO, additive(col, 1.1, { vertexColors: true, opacity: 0.8 }));
    m.position.set(x * SC, 0, -0.35); scene.add(m);
    const L = fxLight(new THREE.Color().fromArray(col), 5, 7, x * SC, 1.2, 1);
    fx.push({ k: 'pillar', mesh: m, L, life: 0.85, max: 0.85 });
  }
  function superBurst(f) {
    const c = fighterById(f.ch).glow;
    pillar(f.x, c); groundShock(f.x, c);
    const [wx] = W(f.x, 0);
    for (let i = 0; i < 70; i++) { const a = rand(0, TAU), r = rand(1.2, 2.2); PA.emit(wx + Math.cos(a) * r, rand(0.1, 2.2), Math.sin(a) * r, -Math.cos(a) * r * 2.2, rand(-0.5, 1.5), -Math.sin(a) * r * 2.2, 0.45, rand(0.03, 0.06), c[0] * 3, c[1] * 3, c[2] * 3, 1, { drag: 1.5 }); }
    if (!reduceMotion) { const sp = $('speed'); sp.hidden = false; clearTimeout(superBurst.t); superBurst.t = setTimeout(() => { sp.hidden = true; }, 850); }
    aberr = Math.max(aberr, 0.015);
  }
  function zap(f, dur, col) { fx.push({ k: 'zap', f, life: dur, max: dur, col: col || [0.55, 0.7, 1] }); }
  function darkSky(v) { darken = Math.max(darken, v); }
  const SPIKE_GEO = displaceGeo(new THREE.ConeGeometry(0.28, 1.1, 6, 3), 0.07, 5, 9);
  let SPIKE_MAT = null;
  function spike(x) {
    if (!SPIKE_MAT) SPIKE_MAT = new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.9, flatShading: true, emissive: new THREE.Color(0.35, 0.12, 0.02), emissiveIntensity: 0.6 });
    const m = new THREE.Mesh(SPIKE_GEO, SPIKE_MAT);
    const s = rand(0.7, 1.3);
    m.scale.set(s, s * rand(0.9, 1.5), s); m.rotation.set(rand(-0.3, 0.3), rand(0, TAU), rand(-0.3, 0.3));
    m.position.set(x + rand(-0.15, 0.15), -0.6, rand(-0.5, 0.5)); m.castShadow = true;
    scene.add(m);
    fx.push({ k: 'spike', mesh: m, life: 0.8, max: 0.8, h: 0.55 * s });
  }
  function updateFx(dt) {
    for (const e of fx) {
      e.life -= dt;
      if (e.k === 'quake') {
        e.d += 900 * SC * dt;
        const wx = e.x + e.dir * e.d;
        e.acc += dt;
        while (e.acc > 0.03) {
          e.acc -= 0.03;
          for (let i = 0; i < 3; i++) PN.emit(wx + rand(-0.2, 0.2), 0.05, rand(-0.5, 0.6), rand(-0.5, 0.5) + e.dir, rand(3, 6), rand(-1, 1), rand(0.6, 1.1), rand(0.08, 0.16), 0.28, 0.24, 0.2, 1, { grav: 14, drag: 0.5 });
          PN.emit(wx, 0.2, 0.2, e.dir * 0.5, rand(0.5, 1.5), 0, 1, rand(0.5, 0.9), 0.45, 0.38, 0.3, 0.5, { grow: 2, drag: 2 });
          PA.emit(wx, 0.05, 0.25, 0, rand(1, 3), 0, 0.3, 0.5, 4, 1.6, 0.4, 0.8, { grow: 1 });
        }
        e.sp = (e.sp || 0) + dt;
        if (e.sp > 0.07 && Math.abs(wx) < 6) { e.sp = 0; spike(wx); }
      } else if (e.k === 'bolt') {
        e.mesh.material.opacity = Math.max(0, e.life / e.max) * (Math.random() < 0.3 ? 0.3 : 1);
        e.L.intensity = 14 * Math.max(0, e.life / e.max);
        if (e.life <= 0) { scene.remove(e.mesh); e.mesh.geometry.dispose(); e.mesh.material.dispose(); e.L.intensity = 0; }
      } else if (e.k === 'arc') {
        const u = 1 - e.life / e.max, sz = e.size * (0.85 + u * 0.45);
        e.mesh.scale.set(sz * e.face, sz, 1); e.mesh.material.opacity = Math.max(0, 1 - u * u);
        if (e.life <= 0) { scene.remove(e.mesh); e.mesh.material.dispose(); }
      } else if (e.k === 'shock') {
        const u = 1 - e.life / e.max, sz = 0.3 + u * 5;
        e.mesh.scale.set(sz, 1, sz); e.mesh.material.opacity = Math.max(0, 1 - u);
        if (e.life <= 0) { scene.remove(e.mesh); e.mesh.material.dispose(); }
      } else if (e.k === 'pillar') {
        const u = 1 - e.life / e.max;
        const w = u < 0.15 ? 0.3 + u / 0.15 * 0.8 : 1.1 - (u - 0.15) / 0.85 * 1.0;
        e.mesh.scale.set(w, 1 + u * 0.3, w); e.mesh.material.opacity = 0.8 * Math.max(0, 1 - u) * Math.max(0, 1 - u);
        e.L.intensity = 5 * Math.max(0, 1 - u);
        if (e.life <= 0) { scene.remove(e.mesh); e.mesh.material.dispose(); e.L.intensity = 0; }
      } else if (e.k === 'spike') {
        const u = 1 - e.life / e.max, h = u < 0.12 ? u / 0.12 : u < 0.62 ? 1 : 1 - (u - 0.62) / 0.38;
        e.mesh.position.y = -0.62 + h * (0.62 + e.h * 0.6);
        if (e.life <= 0) scene.remove(e.mesh);
      } else if (e.k === 'zap') {
        const v = views.get(e.f);
        if (v && v.rig) {
          const bs = ['Hips', 'Spine2', 'Head', 'LeftHand', 'RightHand', 'LeftFoot', 'RightFoot', 'LeftForeArm', 'RightLeg'], p = new THREE.Vector3();
          for (let i = 0; i < 4; i++) { const b = v.rig.b[pick(bs)]; if (!b) continue; b.getWorldPosition(p); PA.emit(p.x, p.y, p.z + 0.1, rand(-3, 3), rand(-2, 3), rand(-1, 1), rand(0.08, 0.2), rand(0.03, 0.06), e.col[0] * 7, e.col[1] * 7, e.col[2] * 7, 1, { drag: 4 }); }
          if (Math.random() < 0.3) { b2: { const b = v.rig.b.Spine2; if (!b) break b2; b.getWorldPosition(p); PA.emit(p.x, p.y, p.z, 0, 0, 0, 0.08, rand(0.5, 0.9), 1.2, 1.5, 3, 0.8, {}); } }
        }
      } else if (e.k === 'ring') {
        const u = 1 - e.life / e.max, n = 14;
        if (!e.done) { e.done = true; for (let i = 0; i < n; i++) { const a = i / n * TAU; PA.emit(e.x, e.y, e.z, Math.cos(a) * 6, Math.sin(a) * 6, 0, 0.18, 0.12, e.col[0] * 4, e.col[1] * 4, e.col[2] * 4, 1, { drag: 8 }); } }
        void u;
      }
    }
    fx = fx.filter(e => e.life > 0);
    PA.update(dt); PN.update(dt);
    if (flash > 0) flash = Math.max(0, flash - dt * 3);
    if (aberr > 0) aberr = Math.max(0, aberr - dt * 0.05);
  }

  // =====================================================================
  // Моделі й бійці на сцені
  // =====================================================================
  const GL = {}, TEX = {};
  // мікрорельєф поверхонь: пори шкіри, переплетення тканини, шліфований метал
  const DETAIL = {};
  function detailNormal(kind) {
    if (DETAIL[kind]) return DETAIL[kind];
    const N = 256, H = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let h;
      if (kind === 'skin') h = tfbm(x / N * 24, y / N * 24, 24, 3, 5) * 0.6 + (hash2(x >> 2, y >> 2, 9) > 0.93 ? -0.5 : 0);
      else if (kind === 'cloth') h = (Math.sin(x / N * TAU * 64) * 0.5 + 0.5) * ((Math.floor(y / 4) % 2) ? 1 : 0.4) + (Math.sin(y / N * TAU * 64) * 0.5 + 0.5) * ((Math.floor(x / 4) % 2) ? 0.4 : 1) + tfbm(x / N * 8, y / N * 8, 8, 3, 7) * 0.6;
      else h = tfbm(x / N * 2, y / N * 64, 2, 3, 11) * 0.7 + (hash2(x, y >> 3, 13) > 0.997 ? 1 : 0);
      H[y * N + x] = h;
    }
    const t = texFrom(normalFrom(H, N, kind === 'cloth' ? 1.4 : 1.2), false);
    t.repeat.set(kind === 'skin' ? 7 : kind === 'cloth' ? 5 : 3, kind === 'skin' ? 7 : kind === 'cloth' ? 5 : 3);
    return (DETAIL[kind] = t);
  }
  const withDetail = (m, kind, s) => { m.normalMap = detailNormal(kind); m.normalScale = new THREE.Vector2(s, s); return m; };
  const views = new Map();
  const rigPool = {};
  const glowColor = ch => new THREE.Color().fromArray(fighterById(ch).glow);
  function materialFor(ch) {
    const F = fighterById(ch);
    return src => {
      if (F.skin) {
        const s = F.skin;
        if (/Joint/i.test(src.name)) return new THREE.MeshStandardMaterial({ color: new THREE.Color().fromArray(s.joint), emissive: new THREE.Color().fromArray(s.joint), emissiveIntensity: s.jointGlow, metalness: s.jointMetal === undefined ? 0.4 : s.jointMetal, roughness: 0.35 });
        if (s.skin) return withDetail(new THREE.MeshPhysicalMaterial({ color: new THREE.Color().fromArray(s.body), roughness: s.rough, sheen: 0.4, sheenColor: new THREE.Color(0.9, 0.4, 0.32), sheenRoughness: 0.5, clearcoat: 0.08, emissive: new THREE.Color(0, 0, 0) }), 'skin', 0.35);
        return withDetail(new THREE.MeshPhysicalMaterial({ color: new THREE.Color().fromArray(s.body), metalness: s.metal, roughness: s.rough, clearcoat: s.metal > 0.5 ? 0.7 : 0.15, clearcoatRoughness: 0.3, sheen: s.metal > 0.5 ? 0 : 0.6, sheenRoughness: 0.6, sheenColor: new THREE.Color().fromArray(s.body).multiplyScalar(2) }), s.metal > 0.5 ? 'metal' : 'cloth', 0.3);
      }
      const m = src.clone();
      if (!m.normalMap) withDetail(m, F.model === 'soldier' ? 'metal' : 'cloth', 0.4);
      if (F.tint && m.color) m.color.multiply(new THREE.Color().fromArray(F.tint));
      if (/Visor/i.test(src.name)) { m.emissive = new THREE.Color().fromArray(F.glow); m.emissiveIntensity = 2.2; }
      if (!m.emissive) m.emissive = new THREE.Color(0, 0, 0);
      return m;
    };
  }
  function rigFor(ch, slot) {
    const key = ch + ':' + slot;
    if (!rigPool[key]) {
      const F = fighterById(ch);
      const r = new Rig(GL[F.model], { height: F.height, material: materialFor(ch), glowCol: glowColor(ch) });
      decorateRig(r, F);
      if (ch === 'voron') {
        const blade = new THREE.Group();
        const bl = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.32, 4), new THREE.MeshStandardMaterial({ color: 0xdfe6ee, metalness: 1, roughness: 0.15, emissive: new THREE.Color(1, 0.1, 0.15), emissiveIntensity: 0.6 }));
        bl.position.y = 0.2; bl.scale.z = 0.3;
        const hd = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.1, 6), new THREE.MeshStandardMaterial({ color: 0x220a0a, roughness: 0.6 }));
        blade.add(bl, hd);
        const hand = r.b.RightHand, tip = r.b.RightHandMiddle1;
        const ws = hand.getWorldScale(new THREE.Vector3()).x;
        blade.scale.setScalar(1 / ws);
        if (tip) blade.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tip.position.clone().normalize());
        hand.add(blade); r.blade = blade; blade.visible = false;
      }
      rigPool[key] = r;
    }
    return rigPool[key];
  }
  const BLOB_TEX = (() => { const c = mkCanvas(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t; })();
  function attachView(f, slot) {
    let v = views.get(f);
    if (!v) { v = { rig: null, anim: '', pose: mkPose(), from: mkPose(), target: mkPose(), blend: 1 }; views.set(f, v); }
    if (!v.blob) { v.blob = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), new THREE.MeshBasicMaterial({ map: BLOB_TEX, transparent: true, depthWrite: false, fog: false })); v.blob.rotation.x = -Math.PI / 2; v.blob.renderOrder = 2; }
    scene.add(v.blob);
    if (v.rig) scene.remove(v.rig.root);
    v.rig = rigFor(f.ch, slot); v.slot = slot;
    scene.add(v.rig.root);
    return v;
  }
  // «Прогрівання»: компілюємо шейдери всіх ефектів заздалегідь, на екрані завантаження
  function warmUp() {
    projObj(0); projObj(1);
    const tmp = new THREE.Group();
    tmp.add(new THREE.Mesh(ARC_GEO, additive([1, 1, 1], 1, { vertexColors: true })));
    tmp.add(new THREE.Mesh(RING_GEO, additive([1, 1, 1], 1)));
    tmp.add(new THREE.Mesh(PILLAR_GEO, additive([1, 1, 1], 1, { vertexColors: true, opacity: 0.8 })));
    if (!SPIKE_MAT) SPIKE_MAT = new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.9, flatShading: true, emissive: new THREE.Color(0.35, 0.12, 0.02), emissiveIntensity: 0.6 });
    tmp.add(new THREE.Mesh(SPIKE_GEO, SPIKE_MAT));
    tmp.position.set(camera.position.x, camera.position.y, camera.position.z - 3);
    scene.add(tmp);
    for (const o of projObjs) { o.visible = true; o.userData.core.visible = true; o.userData.knife.visible = true; o.position.copy(tmp.position); }
    try { renderer.compile(scene, camera); composer.render(0.016); } catch (e) { console.warn('warmup', e); }
    for (const o of projObjs) o.visible = false;
    scene.remove(tmp);
    tmp.traverse(o => { if (o.isMesh && o.material !== SPIKE_MAT) o.material.dispose(); });
  }
  // Компіляція арени й бійців перед стартом бою (під час заставки «Раунд 1»)
  function precompileScene() { try { renderer.compile(scene, camera); } catch (e) { /* ігноруємо */ } }
  function clearViews() { for (const v of views.values()) { if (v.rig) scene.remove(v.rig.root); if (v.blob) scene.remove(v.blob); } views.clear(); for (const o of projObjs) o.visible = false; }
  function syncView(f, dt) {
    const v = views.get(f); if (!v) return;
    if (f.anim !== v.anim) { lerpPose(v.pose, v.pose, 0, v.from); v.from.spin = ((v.from.spin % 360) + 540) % 360 - 180; v.from.tw = ((v.from.tw % 360) + 540) % 360 - 180; v.blend = 0; v.anim = f.anim; }
    if (v.lastX === undefined) v.lastX = f.x;
    v.walkD = (v.walkD || 0) + (f.x - v.lastX) * SC * f.face; v.lastX = f.x;
    poseFor(f.anim, f.at, clock, v.target, v);
    v.blend = Math.min(1, v.blend + dt / (ATTACKS[f.anim] ? 0.06 : 0.11));
    lerpPose(v.from, v.target, sstep(v.blend), v.pose);
    // пружна реакція голови й корпусу на влучання
    if (!v.rs) { v.rs = [0, 0, 0, 0]; v.rv = [0, 0, 0, 0]; }
    if (f.lit > 0.95 && (v.prevLit || 0) < 0.9 && game) {
      const by = f.hitKind || (f === game.me ? game.opp : game.me).anim, sg = Math.random() < 0.5 ? -1 : 1;
      const I = { p: [0, -420, -80, 0], p2: [0, -560, -140, 0], p3: [sg * 720, -160, -60, sg * 120], p4: [0, -950, -320, 0], k: [sg * 200, -200, 260, sg * 260], k2: [0, -150, 380, 0], k3: [0, 120, 200, sg * 200], h: [sg * 240, -650, -260, 0], flipF: [0, 520, 300, 0], rush: [sg * 380, -520, -140, sg * 100] }[by] || [sg * 150, -380, -120, 0];
      for (let i = 0; i < 4; i++) v.rv[i] += I[i];
    }
    v.prevLit = f.lit;
    for (let i = 0; i < 4; i++) { v.rv[i] += (-190 * v.rs[i] - 15 * v.rv[i]) * dt; v.rs[i] += v.rv[i] * dt; }
    v.pose.hd[1] += clamp(v.rs[0], -45, 45); v.pose.hd[0] += clamp(v.rs[1], -50, 40); v.pose.ch[0] += clamp(v.rs[2], -35, 40); v.pose.ch[2] += clamp(v.rs[3], -25, 25);
    const r = v.rig;
    r.root.position.set(f.x * SC, -f.y * SC, 0);
    if (v.blob) { const air = clamp(-f.y * SC / 1.5, 0, 1); v.blob.position.set(f.x * SC, 0.012, 0.02); v.blob.scale.setScalar(1 - air * 0.5); v.blob.material.opacity = (1 - air * 0.7) * f.alpha * (f.anim === 'down' || f.anim === 'ko' ? 0.5 : 1); }
    const want = f.face * (Math.PI / 2 - 0.2);
    r.root.rotation.y = f.anim === 'win' ? want * 0.35 : want;
    // точне наведення: кулак чи стопа йдуть у голову або корпус суперника
    if (game && MOVES[f.anim]) {
      const opp = f === game.me ? game.opp : game.me, ov = views.get(opp), M = MOVES[f.anim];
      const AIM = { p: ['lh', 'Head', 0], p2: ['rh', 'Head', 0], p3: ['lh', 'Head', 0.01], p4: ['rh', 'Head', -0.07], h: ['rh', 'Head', 0], k: ['rf', 'Head', -0.1], k2: ['rf', 'Spine1', 0] }[f.anim];
      if (AIM && ov && ov.rig && opp.alpha > 0.3) {
        const t = f.at, w = t < M.a0 - 0.07 ? 0 : t < M.a0 ? (t - (M.a0 - 0.07)) / 0.07 : t <= M.a1 + 0.03 ? 1 : Math.max(0, 1 - (t - M.a1 - 0.03) / 0.12);
        if (w > 0) {
          const tp = (ov.rig.b[AIM[1]] || ov.rig.b.Spine2).getWorldPosition(new THREE.Vector3()); tp.y += AIM[2];
          r.root.updateMatrixWorld(true);
          r.tilt.worldToLocal(tp);
          if (AIM[0] === 'rf') tp.y -= r.ankle0;
          tp.divideScalar(r.k); tp.z -= AIM[0] === 'rf' ? 0.14 : 0.12;
          if (tp.z > 0.25 && tp.z < 1.35 && tp.y > 0.2) { const arr = v.pose[AIM[0]]; arr[0] = lerp(arr[0], tp.x, w * 0.8); arr[1] = lerp(arr[1], tp.y, w * 0.9); arr[2] = lerp(arr[2], tp.z, w * 0.9); }
        }
      }
    }
    r.apply(v.pose);
    const sup = SUPERS[f.anim] && f.at < 0.7 ? 1 - f.at / 0.7 : 0;
    r.setLook(f.alpha, f.lit, sup);
    if ((f.anim === 'rush' && f.at > 0.2 && f.at < 1.65) || (f.anim === 'dash' && f.at > 0.2 && f.at < 0.55)) {
      const c = fighterById(f.ch).glow, p = new THREE.Vector3();
      for (const s of ['L', 'R']) { r.handWorld(s, p); PA.emit(p.x, p.y, p.z, rand(-0.3, 0.3), rand(0.2, 1), rand(-0.3, 0.3), rand(0.15, 0.3), rand(0.12, 0.22), c[0] * 4, c[1] * 4, c[2] * 4, 0.9, { grow: -0.6, heat: 0.8 }); }
    }
    if (r.blade) r.blade.visible = f.anim === 'shadow' || (f.anim === 'dagger' && f.at < 0.3) || f.anim === 'h';
    if (sup > 0 && Math.random() < 0.9) {
      const c = fighterById(f.ch).glow, p = new THREE.Vector3();
      r.chestWorld(p);
      for (let i = 0; i < 3; i++) { const a = rand(0, TAU), rr = rand(0.35, 0.7); PA.emit(p.x + Math.cos(a) * rr, rand(0.05, 1.9), p.z + Math.sin(a) * rr, -Math.cos(a) * 0.6, rand(1, 2.4), -Math.sin(a) * 0.6, rand(0.4, 0.8), rand(0.06, 0.12), c[0] * 4, c[1] * 4, c[2] * 4, 1, { drag: 1 }); }
    }
  }
  // Снаряди
  const projObjs = [];
  function projObj(i) {
    if (!projObjs[i]) {
      const g = new THREE.Group();
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 3, 0.8) }));
      const L = FXL[i]; L.distance = 6;
      g.add(core); g.userData.core = core; g.userData.L = L;
      const knife = new THREE.Group();
      const bl = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.34, 4), new THREE.MeshStandardMaterial({ color: 0xe8eef5, metalness: 1, roughness: 0.12, emissive: new THREE.Color(1, 0.15, 0.2), emissiveIntensity: 1.2 }));
      bl.rotation.z = -Math.PI / 2; bl.scale.z = 0.3;
      knife.add(bl); g.add(knife); g.userData.knife = knife;
      g.visible = false; scene.add(g); projObjs[i] = g;
    }
    return projObjs[i];
  }
  function syncProj(f, i, dt) {
    const o = projObj(i), pj = f.proj;
    if (!pj) { o.visible = false; o.userData.L.intensity = 0; return; }
    o.visible = true;
    const x = pj.x * SC, y = -pj.y * SC, z = 0.15, dir = Math.sign(pj.vx || 1);
    o.position.set(x, y, z);
    const fire = pj.k === 'fire';
    o.userData.core.visible = fire; o.userData.knife.visible = !fire;
    o.userData.L.intensity = fire ? 10 : 0; o.userData.L.position.set(x, y, z + 0.2);
    const gc = fighterById(f.ch).glow;
    if (fire) {
      o.userData.core.scale.setScalar(1 + Math.sin(clock * 40) * 0.12);
      o.userData.core.material.color.setRGB(1 + gc[0] * 5, 1 + gc[1] * 5, 1 + gc[2] * 5); o.userData.L.color.setRGB(gc[0], gc[1], gc[2]);
      for (let k = 0; k < 4; k++) PA.emit(x - dir * rand(0, 0.15), y + rand(-0.1, 0.1), z + rand(-0.1, 0.1), -dir * rand(1, 3), rand(-0.4, 0.8), rand(-0.4, 0.4), rand(0.2, 0.45), rand(0.22, 0.42), gc[0] * 3.5, gc[1] * 3.5, gc[2] * 3.5, 0.9, { grow: -0.5, heat: gc[1] > 0.8 ? 0 : 1.2 });
      if (Math.random() < 0.5) PN.emit(x - dir * 0.3, y, z, -dir, 0.5, 0, 0.6, 0.3, 0.08, 0.06, 0.05, 0.4, { grow: 2 });
    } else {
      o.userData.knife.rotation.set(0, dir > 0 ? 0 : Math.PI, 0);
      o.userData.knife.children[0].rotation.x = clock * 30;
      PA.emit(x - dir * 0.15, y, z, -dir * 0.5, 0, 0, 0.15, 0.08, gc[0] * 3, gc[1] * 3, gc[2] * 3, 0.8, {});
    }
  }

  // =====================================================================
  // Камера
  // =====================================================================
  const camPos = new THREE.Vector3(0, 1.5, 7), camLook = new THREE.Vector3(0, 1, 0);
  const _cp = new THREE.Vector3(), _cl = new THREE.Vector3();
  function placeFightCamera(rdt) {
    const aspect = VW / VH, tanH = Math.tan(camera.fov * D2R / 2);
    const wM = cam.w * SC / (1 + cam.punch * 1.5);
    const d = clamp((wM / 2) / (tanH * aspect), 3.2, 40);
    const cx = cam.x * SC;
    const portrait = VH > VW * 1.2;
    _cp.set(cx, portrait ? 1.0 + d * 0.035 : 1.15 + d * 0.07, d); _cl.set(cx, portrait ? 1.0 : 0.95, 0);
    if (cam.fin) {
      tickFinale(rdt);
      const F = cam.fin;
      if (F) {
        F.k = Math.min(1, F.k + rdt * 6) * (F.t > F.dur - 0.35 ? Math.max(0, (F.dur - F.t) / 0.35) : 1);
        const lx = F.f.x * SC, ly = -F.f.y * SC, u = F.t / F.dur, a = lerp(-1.1, 2.3, u * u * (3 - 2 * u)) * (F.w.face || 1);
        const R = portrait ? 4.2 : 3.1;
        _cp.lerp(new THREE.Vector3(lx + Math.sin(a) * R, ly + 1.25 + Math.sin(u * Math.PI) * 0.4, Math.cos(a) * R), F.k);
        _cl.lerp(new THREE.Vector3(lx, ly + 0.95, 0), F.k);
      }
    }
    if (cam.cut) {
      cam.cut.t -= rdt; cam.cutF = cam.cut.f; cam.cutU = clamp(1 - cam.cut.t / 0.75, 0, 1);
      if (cam.cut.t <= 0) cam.cut = null;
    }
    cam.cutK = lerp(cam.cutK, cam.cut ? 1 : 0, 1 - Math.exp(-rdt * (cam.cut ? 10 : 5)));
    if (cam.cutK > 0.002 && cam.cutF && game) {
      const f = cam.cutF, fx_ = f.x * SC, fy = -f.y * SC, k = cam.cutK, u = cam.cutU;
      const portrait = VH > VW * 1.2, R = (portrait ? 6.2 : 4.4) - u * 0.8, a = Math.atan2(f.face * 1.5, 2.4) + (u - 0.5) * 1.0 * f.face;
      _cp.lerp(new THREE.Vector3(fx_ + Math.sin(a) * R, fy + 0.8 + 0.5 * (1 - u), Math.cos(a) * R), k);
      _cl.lerp(new THREE.Vector3(fx_ + f.face * 0.3, fy + 0.95, 0), k);
    }
    camPos.copy(_cp); camLook.copy(_cl);
    camera.position.copy(camPos);
    if (cam.shake > 0 && !reduceMotion) { const s = cam.shake * 0.0035; camera.position.x += rand(-s, s); camera.position.y += rand(-s, s) * 0.7; }
    camera.lookAt(camLook);
  }
  function placeTitleCamera() {
    const portrait = VH > VW * 1.2;
    const a = Math.sin(clock * 0.12) * 0.35;
    const d = portrait ? 7.4 : 6.2;
    camera.position.set(Math.sin(a) * d, portrait ? 1.15 : 1.2, Math.cos(a) * d);
    camera.lookAt(0, portrait ? 0.92 : 0.95, 0);
    const sx = portrait ? 75 : clamp(VW / VH * 95, 120, 230);
    title.f[0].x = -sx; title.f[1].x = sx;
    const cu = location.search.match(/closeup=?(\d?)/);
    if (cu) { const t = title.f[0], hx = t.x * SC, side = cu[1] === '1' ? 1 : 0; camera.position.set(hx + (side ? 1.0 : 0.6), 1.45, side ? 0.3 : 1.5); camera.lookAt(hx + 0.08, 1.3, 0); $('title').style.opacity = 0; }
  }
  function placeLights() {
    const c = new THREE.Vector3(camera.position.x, 0, 0);
    if (game) c.x = (game.me.x + game.opp.x) / 2 * SC;
    for (const L of [sun, rim, fill]) { L.position.copy(c).add(L.userData.off || new THREE.Vector3(0, 10, 5)); L.target.position.copy(c); L.target.updateMatrixWorld(); }
    // тіні тільки навколо бійців — щільніші й чіткіші
    const gap = game ? Math.abs(game.me.x - game.opp.x) * SC : 2.5;
    const half = Math.ceil((gap / 2 + 2.2) * 2) / 2, sc = sun.shadow.camera;
    if (sc.right !== half) { sc.left = -half; sc.right = half; sc.top = 3.2; sc.bottom = -2.2; sc.updateProjectionMatrix(); }
  }

  // =====================================================================
  // Кадр
  // =====================================================================
  function renderWorld(rdt) {
    if (game) {
      syncView(game.me, rdt); syncView(game.opp, rdt);
      syncProj(game.me, 0, rdt); syncProj(game.opp, 1, rdt);
      placeFightCamera(rdt);
    } else if (title.ready) {
      for (const t of title.f) syncView(t, rdt);
      placeTitleCamera();
    }
    placeLights();
    grade.uniforms.uDark.value = darken;
    grade.uniforms.uTime.value = clock % 100;
    grade.uniforms.uFlash.value = flash * 0.16;
    grade.uniforms.uAb.value = reduceMotion ? 0 : aberr;
    // фокус камери на бійцях
    if (bokeh.enabled) {
      const fx_ = game ? (game.me.x + game.opp.x) / 2 * SC : 0;
      const fd = camera.position.distanceTo(new THREE.Vector3(fx_, 1.1, 0));
      bokeh.uniforms.focus.value = lerp(bokeh.uniforms.focus.value, fd, 0.2);
      bokeh.uniforms.aperture.value = (cam.fin ? 0.006 : cam.cutK > 0.3 ? 0.004 : 0.0016) * (VH > VW ? 0.6 : 1);
    }
    composer.render(rdt);
    window.__progs = renderer.info.programs ? renderer.info.programs.length : 0;
  }
  // Заставка: двоє бійців у цитаделі
  const title = { ready: false, f: [] };
  function setupTitle() {
    clearViews();
    setArena('kuznia');
    const a = { ch: 'taras', x: -110, y: 0, face: 1, anim: 'idle', at: 0, alpha: 1, lit: 0 };
    const b = { ch: 'baron', x: 110, y: 0, face: -1, anim: 'idle', at: 0, alpha: 1, lit: 0 };
    title.f = [a, b];
    attachView(a, 0); attachView(b, 1);
    title.ready = true;
    setMusic('title');
  }
  function tickTitle(dt) { for (const f of title.f) f.at += dt; }

  // Портрети для вибору бійця
  function renderPortraits() {
    const out = {};
    const st = new THREE.Scene();
    st.background = new THREE.Color(0x0c0e14);
    const es = new THREE.Scene(); es.background = new THREE.Color(0x30343c);
    for (const [x, y, z, c] of [[3, 3, 4, 0xffffff], [-4, 2, -2, 0xff9a50], [4, 1, -3, 0x60b0ff], [0, 6, 0, 0xffffff]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(3), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 1, 0); es.add(m); }
    const studioEnv = pmrem.fromScene(es, 0.04).texture;
    st.environment = studioEnv;
    const k1 = new THREE.DirectionalLight(0xfff0e0, 2.6); k1.position.set(1.5, 2.5, 3);
    const k2 = new THREE.DirectionalLight(0xff8a40, 3); k2.position.set(-2, 2, -2);
    const k3 = new THREE.DirectionalLight(0x5ab0ff, 2.2); k3.position.set(2, 1.5, -2.5);
    st.add(k1, k2, k3, new THREE.HemisphereLight(0x8090b0, 0x101010, 0.6));
    const pc = new THREE.PerspectiveCamera(26, 0.8, 0.1, 50);
    const w = 240, h = 300, pr = renderer.getPixelRatio();
    const prevFog = st.fog;
    for (const F of FIGHTERS) {
      const r = new Rig(GL[F.model], { height: F.height, material: materialFor(F.id), glowCol: glowColor(F.id) });
      decorateRig(r, F);
      st.add(r.root);
      r.root.rotation.y = 0.45;
      r.apply(poseFor('idle', 0, 0.4));
      pc.position.set(0.5, 1.5, 4.1); pc.lookAt(0, 1.2, 0);
      renderer.setRenderTarget(null);
      renderer.setScissorTest(true);
      renderer.setViewport(0, 0, w, h); renderer.setScissor(0, 0, w, h);
      const prevExp = renderer.toneMappingExposure; renderer.toneMappingExposure = 1.1;
      renderer.render(st, pc);
      renderer.toneMappingExposure = prevExp;
      const c = mkCanvas(w, h);
      c.getContext('2d').drawImage(cv, 0, cv.height - h * pr, w * pr, h * pr, 0, 0, w, h);
      out[F.id] = c;
      st.remove(r.root);
    }
    void prevFog;
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, VW, VH);
    return out;
  }
