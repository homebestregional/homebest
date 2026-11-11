// Tembo, the Homebest elephant: the moving home page hero (no words).
// Client-only: loaded by components/TemboHero.js after the page has shown.
// He starts white, glows, lifts his trunk and blows a galaxy of colourful stars.
// The stars come back into him and he becomes a star-lit elephant.
// Then he roams the whole hero: walking, turning, near and far, leaving star dust,
// and every so often he stops and blows another galaxy, and his colours change.
// Tap him to make him blow right away.
import * as THREE from 'three'
import anim from './anim.json'

const { W, H } = anim
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))
const easeOut = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3))
const clamp01 = (x) => Math.max(0, Math.min(1, x))
const rand = (a, b) => a + Math.random() * (b - a)
const STAR_COLORS = ['#ffffff', '#ffffff', '#bfe9ff', '#7dd3fc', '#00aeef', '#22d3ee', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185', '#fde68a', '#fbbf24', '#34d399']
const BURST_COLORS = ['#ffffff', '#ff2d87', '#ff7a00', '#ffd400', '#22c55e', '#00e5ff', '#00aeef', '#7c3aed', '#c084fc', '#f472b6', '#fde68a', '#34d399', '#60a5fa', '#e879f9']
const NEB_COLORS = ['#7c3aed', '#c026d3', '#2563eb', '#00aeef', '#db2777', '#14b8a6', '#10b981']
// his galaxy colours: violet, blue-green, pink, teal, aqua (never red or brown)
const HUES = [0, 5.2, 0.5, 4.6, 5.8]
const hexToRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255] }

// assets: { base, trunk, glow } picture URLs. floor: px at the bottom of the hero he keeps clear of.
export function startHero({ canvas, stage, assets, floor = 0 }) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(0, 1, 1, 0, -10, 10)

  const loader = new THREE.TextureLoader()
  const tex = (url) => {
    const t = loader.load(url)
    t.colorSpace = THREE.NoColorSpace
    t.minFilter = THREE.LinearFilter
    t.generateMipmaps = false
    return t
  }
  const baseTex = tex(assets.base)
  const trunkTex = tex(assets.trunk)
  const glowTex = tex(assets.glow)

  // where the galaxy skin shows (photo space); fills in as the first stars land
  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = W
  maskCanvas.height = H
  const mctx = maskCanvas.getContext('2d')
  const maskTex = new THREE.CanvasTexture(maskCanvas)
  maskTex.colorSpace = THREE.NoColorSpace
  maskTex.minFilter = THREE.LinearFilter
  maskTex.generateMipmaps = false
  let maskDirty = false
  function reveal(x, y, r) {
    const g = mctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, 'rgba(255,255,255,0.55)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    mctx.fillStyle = g
    mctx.fillRect(x - r, y - r, r * 2, r * 2)
    maskDirty = true
  }
  function revealAll() { mctx.fillStyle = '#fff'; mctx.fillRect(0, 0, W, H); maskDirty = true }

  const shared = {
    uMask: { value: maskTex },
    uGlow: { value: 0 },
    uOpacity: { value: 0 },
    uTime: { value: 0 },
    uHue: { value: 0 },
    uWalk: { value: 0 },
    uWalkAmp: { value: 0 },
    uSize: { value: new THREE.Vector2(W, H) },
    uLegs: { value: anim.legs.map((l) => new THREE.Vector4(l[0], l[1], l[2], l[3])) },
    uLegPhase: { value: anim.legs.map((l) => l[4]) },
    uTail: { value: new THREE.Vector4(...anim.tail) },
  }

  const vert = `
    uniform float uWalk; uniform float uWalkAmp; uniform vec2 uSize;
    uniform vec4 uLegs[4]; uniform float uLegPhase[4]; uniform vec4 uTail;
    uniform float uIsBase;
    attribute vec2 aRest;
    varying vec2 vUv;
    void main(){
      vec3 p = position;
      vec2 img = vec2(aRest.x, uSize.y - aRest.y);
      if (uIsBase > 0.5) {
        for (int i = 0; i < 4; i++) {
          vec4 L = uLegs[i];
          float wx = smoothstep(L.y + 10.0, L.y - 8.0, abs(img.x - L.x));
          float wy = clamp((img.y - L.z)/(L.w - L.z), 0.0, 1.0);
          float ph = uWalk + uLegPhase[i]*6.2831853;
          p.x += -wx*pow(wy, 1.15)*sin(ph)*14.0*uWalkAmp;
          p.y += wx*wy*max(0.0, cos(ph))*5.0*uWalkAmp;
        }
        float tw = smoothstep(uTail.y, uTail.w, img.y)*smoothstep(uTail.x - 30.0, uTail.x, img.x);
        p.x += tw*sin(uWalk*0.5 + 1.0)*7.0*(0.4 + uWalkAmp);
      }
      vUv = aRest/uSize;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }`
  const frag = `
    uniform sampler2D uMap; uniform sampler2D uMask;
    uniform float uGlow; uniform float uOpacity; uniform float uTime; uniform float uHue;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }
    float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
      return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
    float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a*noise(p); p = p*2.03 + 7.1; a *= 0.5; } return v; }
    vec3 hueShift(vec3 c, float h){ const vec3 k = vec3(0.57735); float ch = cos(h); return c*ch + cross(k, c)*sin(h) + k*dot(k, c)*(1.0 - ch); }
    vec3 nebula(vec2 uv){
      vec2 q = uv*vec2(4.0, 2.7);
      float n1 = fbm(q + vec2(uTime*0.03, 0.0));
      float n2 = fbm(q*1.6 + 3.1 - vec2(0.0, uTime*0.02));
      vec3 c = mix(vec3(0.05, 0.04, 0.22), vec3(0.32, 0.14, 0.72), smoothstep(0.30, 0.72, n1));
      c = mix(c, vec3(0.86, 0.22, 0.72), smoothstep(0.55, 0.82, n2)*0.75);
      c = mix(c, vec3(0.0, 0.68, 0.94), smoothstep(0.58, 0.86, n1*n2*1.7)*0.7);
      return clamp(hueShift(c, uHue), 0.0, 1.0);
    }
    void main(){
      vec4 c = texture2D(uMap, vUv);
      if (c.a < 0.01) discard;
      float L = dot(c.rgb, vec3(0.3333));
      float m = texture2D(uMask, vUv).a;
      vec3 sky = nebula(vUv)*(0.30 + 1.35*L*L);
      vec3 col = mix(c.rgb, sky, m);
      col += uGlow*vec3(0.55, 0.85, 1.0)*0.28*(0.4 + L);
      gl_FragColor = vec4(col, c.a*uOpacity);
    }`
  const elephantMat = (map, isBase) => new THREE.ShaderMaterial({
    uniforms: { ...shared, uMap: { value: map }, uIsBase: { value: isBase ? 1 : 0 } },
    vertexShader: vert, fragmentShader: frag, transparent: true, depthTest: false, side: THREE.DoubleSide,
  })

  // ---------- Tembo (drawn in photo space, then placed in the hero) ----------
  const elephant = new THREE.Group()
  scene.add(elephant)

  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(W + 180, H + 180),
    new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, depthTest: false, blending: THREE.AdditiveBlending, color: new THREE.Color(0.55, 0.85, 1.0), side: THREE.DoubleSide }),
  )
  glow.position.set(W / 2, H / 2, -1)
  elephant.add(glow)

  const bg = new THREE.PlaneGeometry(W, H, 90, 60)
  bg.translate(W / 2, H / 2, 0)
  const restAttr = new Float32Array(bg.attributes.position.count * 2)
  for (let i = 0; i < bg.attributes.position.count; i++) {
    restAttr[i * 2] = bg.attributes.position.getX(i)
    restAttr[i * 2 + 1] = bg.attributes.position.getY(i)
  }
  bg.setAttribute('aRest', new THREE.BufferAttribute(restAttr, 2))
  const base = new THREE.Mesh(bg, elephantMat(baseTex, true))
  base.renderOrder = 1
  elephant.add(base)

  // trunk ribbon on a bendable spine
  const toY = (p) => [p[0], H - p[1]]
  const extend = (pts, d) => {
    const a = pts[pts.length - 2], b = pts[pts.length - 1]
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    return [...pts, [b[0] + (b[0] - a[0]) / l * d, b[1] + (b[1] - a[1]) / l * d]]
  }
  const rest = extend(anim.rest.map(toY), 9)
  const raised = extend(anim.raised.map(toY), 9)
  const hw = [...anim.hw, anim.hw[anim.hw.length - 1]]
  const N = rest.length
  const segLen = [], restAng = [], raisedAng = []
  for (let i = 0; i < N - 1; i++) {
    const a = rest[i], b = rest[i + 1], c = raised[i], d = raised[i + 1]
    segLen.push(Math.hypot(b[0] - a[0], b[1] - a[1]))
    restAng.push(Math.atan2(b[1] - a[1], b[0] - a[0]))
    raisedAng.push(Math.atan2(d[1] - c[1], d[0] - c[0]))
  }
  const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a }
  const restTurn = restAng.map((a, i) => (i === 0 ? a : wrap(a - restAng[i - 1])))
  const raisedTurn = raisedAng.map((a, i) => (i === 0 ? a : wrap(a - raisedAng[i - 1])))
  raisedTurn[0] = restTurn[0] + wrap(raisedTurn[0] - restTurn[0])
  const normals = (pts) => pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)]
    const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1
    return [-ty / l, tx / l]
  })
  const restN = normals(rest)
  const tg = new THREE.BufferGeometry()
  const tpos = new Float32Array(N * 2 * 3)
  const trest = new Float32Array(N * 2 * 2)
  for (let i = 0; i < N; i++) {
    for (let s = 0; s < 2; s++) {
      const sign = s === 0 ? 1 : -1
      trest[(i * 2 + s) * 2] = rest[i][0] + restN[i][0] * hw[i] * sign
      trest[(i * 2 + s) * 2 + 1] = rest[i][1] + restN[i][1] * hw[i] * sign
    }
  }
  const tidx = []
  for (let i = 0; i < N - 1; i++) { const a = i * 2; tidx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
  tg.setIndex(tidx)
  tg.setAttribute('position', new THREE.BufferAttribute(tpos, 3))
  tg.setAttribute('aRest', new THREE.BufferAttribute(trest, 2))
  const trunk = new THREE.Mesh(tg, elephantMat(trunkTex, false))
  trunk.renderOrder = 2
  trunk.frustumCulled = false
  elephant.add(trunk)

  const spine = new Array(N).fill(0).map(() => [0, 0])
  function poseTrunk(k, t, sway, blow) {
    let x = rest[0][0], y = rest[0][1]
    spine[0][0] = x; spine[0][1] = y
    let baseAng = 0
    for (let i = 0; i < N - 1; i++) {
      const s = i / (N - 2)
      const ki = ease(clamp01(k * 1.15 - 0.15 * s))
      baseAng += restTurn[i] + (raisedTurn[i] - restTurn[i]) * ki
      let ang = baseAng
      ang += sway * Math.sin(t * 1.3 - s * 2.0) * 0.06 * s
      ang += blow * Math.sin(t * 38.0 + s * 4.0) * 0.025 * s * s
      x += Math.cos(ang) * segLen[i]
      y += Math.sin(ang) * segLen[i]
      spine[i + 1][0] = x; spine[i + 1][1] = y
    }
    const nn = normals(spine)
    for (let i = 0; i < N; i++) {
      const puff = 1 + blow * 0.06 * Math.max(0, (i - N + 6) / 6)
      for (let s = 0; s < 2; s++) {
        const sign = s === 0 ? 1 : -1
        const j = (i * 2 + s) * 3
        tpos[j] = spine[i][0] + nn[i][0] * hw[i] * sign * puff
        tpos[j + 1] = spine[i][1] + nn[i][1] * hw[i] * sign * puff
        tpos[j + 2] = 0
      }
    }
    tg.attributes.position.needsUpdate = true
  }

  // ---------- placing Tembo in the hero ----------
  // flip = 1: facing left like the photo; -1: facing right
  const E = { cx: 0, fy: 0, s: 1, flip: 1, bob: 0 }
  function imgToWorld(x, yUp) { return [E.cx + (x - W / 2) * E.s * E.flip, E.fy + E.bob + yUp * E.s] }
  function placeElephant() {
    elephant.position.set(E.cx - (W / 2) * E.s * E.flip, E.fy + E.bob, 0)
    elephant.scale.set(E.s * E.flip, E.s, 1)
  }
  // same leg/tail swing as the shader, so stars on his skin move with him
  function skinOffset(ix, iy) {
    const walkPh = shared.uWalk.value, amp = shared.uWalkAmp.value
    if (amp < 0.001) return [0, 0]
    let dx = 0, dy = 0
    for (let i = 0; i < 4; i++) {
      const L = anim.legs[i]
      const w0 = clamp01((L[1] + 10 - Math.abs(ix - L[0])) / 18)
      const wx = w0 * w0 * (3 - 2 * w0)
      const wy = clamp01((iy - L[2]) / (L[3] - L[2]))
      const ph = walkPh + L[4] * 6.2831853
      dx += -wx * Math.pow(wy, 1.15) * Math.sin(ph) * 14 * amp
      dy += wx * wy * Math.max(0, Math.cos(ph)) * 5 * amp
    }
    return [dx, dy]
  }
  function skinWorld(ix, iy) {
    const o = skinOffset(ix, iy)
    return imgToWorld(ix + o[0], H - iy + o[1])
  }

  // ---------- stars (all in hero space) ----------
  const NB = window.innerWidth < 700 ? 3600 : 7200   // the burst of colour
  const NS = 1300            // stars that live on his skin
  const NT = 360             // star dust trail
  const MAXP = NB + NS + NT
  const pPos = new Float32Array(MAXP * 3)
  const pCol = new Float32Array(MAXP * 3)
  const pSize = new Float32Array(MAXP)
  const pAlpha = new Float32Array(MAXP)
  const pKind = new Float32Array(MAXP)
  const pg = new THREE.BufferGeometry()
  pg.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
  pg.setAttribute('aColor', new THREE.BufferAttribute(pCol, 3))
  pg.setAttribute('aSize', new THREE.BufferAttribute(pSize, 1))
  pg.setAttribute('aAlpha', new THREE.BufferAttribute(pAlpha, 1))
  pg.setAttribute('aKind', new THREE.BufferAttribute(pKind, 1))
  const pMat = new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 1 } },
    vertexShader: `
      attribute vec3 aColor; attribute float aSize; attribute float aAlpha; attribute float aKind; uniform float uScale;
      varying vec3 vC; varying float vA; varying float vK;
      void main(){ vC = aColor; vA = aAlpha; vK = aKind; gl_PointSize = aSize*uScale; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0); }`,
    fragmentShader: `
      varying vec3 vC; varying float vA; varying float vK;
      void main(){
        vec2 d = gl_PointCoord - 0.5;
        float r = length(d)*2.0;
        float a;
        if (vK > 0.5) a = exp(-r*r*3.0)*0.55;
        else {
          float core = exp(-r*r*28.0);
          float halo = exp(-r*r*5.0)*0.35;
          float rays = (exp(-abs(d.x)*60.0)*exp(-abs(d.y)*5.0) + exp(-abs(d.y)*60.0)*exp(-abs(d.x)*5.0))*0.55;
          a = core + halo + rays;
        }
        a *= vA;
        if (a < 0.004) discard;
        vec3 col = mix(vC, vec3(1.0), vK > 0.5 ? 0.0 : clamp(exp(-r*r*40.0), 0.0, 1.0)*0.45);
        gl_FragColor = vec4(col*a, a);
      }`,
    transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  })
  const points = new THREE.Points(pg, pMat)
  points.renderOrder = 5
  points.frustumCulled = false
  scene.add(points)

  const pickTarget = () => anim.targets[(Math.random() * anim.targets.length) | 0]

  // burst stars
  const burst = []
  for (let i = 0; i < NB; i++) burst.push({ state: 0 })
  // skin stars
  const skin = []
  for (let i = 0; i < NS; i++) {
    const tg2 = pickTarget()
    skin.push({ ix: tg2[0], iy: tg2[1], rgb: hexToRgb(STAR_COLORS[(Math.random() * STAR_COLORS.length) | 0]),
      size: 3 + Math.pow(Math.random(), 3) * 10, tw: rand(1.5, 5.5), ph: rand(0, 6.28), on: 0 })
  }
  // trail dust
  const trail = []
  for (let i = 0; i < NT; i++) trail.push({ life: 0 })
  let trailNext = 0

  // a burst: countless colourful particles shooting out of the middle of his body
  const G = { active: false, t0: 0, cx: 0, cy: 0, first: false }
  function startBurst(now, first) {
    const c = imgToWorld(410, H - 245)              // the centre of his body
    Object.assign(G, { active: true, t0: now, cx: c[0], cy: c[1], first })
    const reach = Math.hypot(view.w, view.h) * 0.55
    for (let i = 0; i < NB; i++) {
      const flash = i < 3, cloud = i >= 3 && i < 26
      const tg2 = pickTarget()
      // start inside his body, near the middle
      const a0 = Math.random() * Math.PI * 2, r0 = Math.sqrt(Math.random())
      const sx = Math.cos(a0) * r0 * 0.2 * W * E.s, sy = Math.sin(a0) * r0 * 0.13 * H * E.s
      // fly outward: mostly away from the centre, a little random
      let dx = sx + rand(-1, 1) * 30, dy = sy + rand(-1, 1) * 30 + 10
      const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl
      const sp = flash ? 0 : cloud ? rand(70, 260) : reach * 1.3 * (0.05 + 0.95 * Math.pow(Math.random(), 2.2))
      Object.assign(burst[i], {
        state: 0, kind: flash || cloud ? 1 : 0, flash, cloud,
        sx, sy, vx0: dx * sp, vy0: dy * sp,
        curl: rand(-1, 1) * 0.9,
        rgb: hexToRgb(flash ? (i === 0 ? '#ffffff' : '#fff3c4') : cloud ? NEB_COLORS[(i + hueStep * 2) % NEB_COLORS.length] : BURST_COLORS[(Math.random() * BURST_COLORS.length) | 0]),
        size: flash ? 220 + i * 60 : cloud ? rand(200, 380) : (Math.random() < 0.85 ? rand(3.5, 8) : rand(9, 20)),
        tw: rand(2, 7), ph: rand(0, 6.28),
        born: flash || cloud ? 0 : Math.pow(Math.random(), 2) * 0.35,
        homeAt: rand(2.6, 3.8),
        ix: tg2[0], iy: tg2[1],
        x: 0, y: 0, vx: 0, vy: 0, landT: 0,
      })
    }
  }

  // ---------- the hero's size and Tembo's roaming area ----------
  const view = { w: 1, h: 1, sNear: 1, xMin: 0, xMax: 1, yMin: 0, yMax: 1 }
  function layout() {
    const r = canvas.getBoundingClientRect()
    view.w = r.width; view.h = r.height
    renderer.setSize(view.w, view.h, false)
    camera.left = 0; camera.right = view.w; camera.top = view.h; camera.bottom = 0
    camera.updateProjectionMatrix()
    pMat.uniforms.uScale.value = renderer.getPixelRatio()
    const portrait = view.w < view.h * 0.9
    view.sNear = portrait ? (view.w * 0.92) / W : Math.min((view.h * 0.62) / H, (view.w * 0.5) / W)
    view.yMin = Math.max(view.h * (portrait ? 0.08 : 0.05), floor)
    view.yMax = Math.max(view.h * (portrait ? 0.46 : 0.30), view.yMin + view.h * 0.12)
    if (!E.placed) {
      E.cx = view.w * 0.62; E.fy = view.yMin + (view.yMax - view.yMin) * 0.2; E.placed = true
    }
    E.s = depthScale(E.fy)
    const half = (W * 0.5) * E.s
    view.xMin = Math.min(view.w * 0.5, half * 0.9)
    view.xMax = Math.max(view.w * 0.5, view.w - half * 0.9)
    E.cx = Math.max(view.xMin, Math.min(view.xMax, E.cx))
  }
  function depthScale(fy) {
    const d = clamp01((fy - view.yMin) / Math.max(1, view.yMax - view.yMin))
    return view.sNear * (1 - 0.38 * d)          // further up the hero = further away = smaller
  }
  layout()
  window.addEventListener('resize', layout)
  let visible = true
  const io = new IntersectionObserver((entries) => { visible = entries[0].isIntersecting }, { threshold: 0 })
  io.observe(stage)

  // ---------- behaviour ----------
  let clock = 0
  let mode = reduceMotion ? 'still' : 'intro'
  let modeT = 0
  let target = [0, 0]
  let walkAmp = 0, walkPh = 0, lift = 0
  let hue = 0, hueFrom = 0, hueTo = 0, hueT0 = -10, hueStep = 0
  let starry = 0
  let turnFrom = 1, turnTo = 1
  let nextTrumpet = rand(1, 2)    // how many walks before he blows again

  function setMode(m) { mode = m; modeT = 0 }
  function newTarget() {
    for (let k = 0; k < 8; k++) {
      const x = rand(view.xMin, view.xMax)
      const y = rand(view.yMin, view.yMax)
      if (Math.abs(x - E.cx) > view.w * 0.22 || k === 7) { target = [x, y]; return }
    }
  }
  function trumpetNow() {
    if (mode === 'walk' || mode === 'pause' || mode === 'turn') setMode('trumpet')
  }
  if (mode === 'still') {
    revealAll(); starry = 1
    for (const s of skin) s.on = 1
  }

  function step(dt) {
    clock += dt
    modeT += dt
    const t = clock
    shared.uTime.value = t

    let glowAmt = 0, blowing = false, k = 0
    // --- what Tembo is doing ---
    if (mode === 'intro') {
      shared.uOpacity.value = easeOut(t / 0.9)
      glowAmt = ease((t - 0.8) / 1.4) * (1 - ease((t - 2.5) / 1.0)) * (0.85 + 0.15 * Math.sin(t * 5))
      if (t > 2.3) { setMode('trumpet'); G.introBlow = true }
    } else shared.uOpacity.value = 1

    if (mode === 'trumpet') {
      walkAmp = Math.max(0, walkAmp - dt * 3)
      const tau = modeT
      lift = ease(tau / 1.0) * (1 - ease((tau - 2.6) / 1.0))
      blowing = tau > 0.9 && tau < 1.7
      // he glows from inside just before the burst, then a bright flash
      glowAmt = Math.max(glowAmt, ease((tau - 0.4) / 0.6) * (tau < 1.0 ? 1 : Math.exp(-(tau - 1.0) * 3.0)) * 0.85)
      if (tau > 1.0 && !G.active) startBurst(t, !!G.introBlow)
      if (G.active && tau > 3.6 && hueT0 < G.t0) {
        // his colours change as the stars come back into him
        if (!G.first) {
          hueStep++
          let h = HUES[hueStep % HUES.length]
          while (h - hue > Math.PI) h -= Math.PI * 2       // go the short way round
          while (h - hue < -Math.PI) h += Math.PI * 2
          hueFrom = hue; hueTo = h
        }
        hueT0 = t
      }
      if (tau > 6.0) {
        if (G.first) revealAll()
        G.active = false; G.introBlow = false
        setMode('pause')
      }
    } else if (mode === 'pause') {
      walkAmp = Math.max(0, walkAmp - dt * 3)
      lift = 0
      if (modeT > 1.2) { newTarget(); setMode('walk') }
    } else if (mode === 'walk') {
      const dx = target[0] - E.cx, dy = target[1] - E.fy
      const want = dx < 0 ? 1 : -1
      if (Math.abs(dx) > 30 && want !== Math.sign(E.flip) && modeT < 0.2) {
        turnFrom = E.flip; turnTo = want; setMode('turn')
      } else {
        walkAmp = Math.min(1, walkAmp + dt * 2)
        const speed = 0.2 * W * E.s * walkAmp
        const dist = Math.hypot(dx, dy)
        if (dist < 6) {
          nextTrumpet--
          if (nextTrumpet <= 0) { nextTrumpet = (Math.random() * 2 + 1) | 0; setMode('trumpet') }
          else setMode('pause')
        } else {
          const stepD = Math.min(dist, speed * dt)
          E.cx += dx / dist * stepD
          E.fy += dy / dist * stepD * 0.6
          walkPh += (stepD / E.s) / 62 * Math.PI * 2
          // star dust behind him
          trailNext -= dt * 34 * walkAmp
          while (trailNext < 0) { spawnTrail(); trailNext += 1 }
        }
      }
    } else if (mode === 'turn') {
      walkAmp = Math.max(0, walkAmp - dt * 2)
      const k2 = ease(modeT / 0.65)
      E.flip = turnFrom + (turnTo - turnFrom) * k2
      if (Math.abs(E.flip) < 0.06) E.flip = Math.sign(turnTo) * 0.06 * (k2 > 0.5 ? 1 : -1)
      if (modeT >= 0.65) { E.flip = turnTo; setMode('walk'); modeT = 0.3 }
    }

    // hue drifts slowly and jumps (smoothly) after each galaxy
    const hk = ease((t - hueT0) / 2.6)
    hue = hueFrom + (hueTo - hueFrom) * hk + 0.04 * Math.sin(t * 0.2)
    shared.uHue.value = hue

    shared.uGlow.value = glowAmt
    const halo = starry * (0.22 + 0.05 * Math.sin(t * 1.7))
    glow.material.opacity = Math.max(glowAmt * 0.5, halo)
    glow.material.color.setRGB(0.55 + 0.05 * starry, 0.85 - 0.45 * starry, 1.0)

    shared.uWalk.value = walkPh
    shared.uWalkAmp.value = walkAmp
    E.s = depthScale(E.fy)
    E.bob = walkAmp * Math.abs(Math.sin(walkPh)) * 2.2 * E.s + (mode === 'intro' ? (1 - easeOut(t / 0.9)) * -18 : 0)
    placeElephant()
    poseTrunk(lift, t, (1 - lift * 0.7) * (0.6 + 0.4 * walkAmp), blowing ? 1 : 0)

    stepStars(dt, t)
  }

  function spawnTrail() {
    const p = trail[(trailNext2++) % NT]
    const tg2 = pickTarget()
    const w = skinWorld(tg2[0], tg2[1])
    p.x = w[0]; p.y = w[1]
    p.vx = rand(-12, 12) + (E.flip > 0 ? 18 : -18); p.vy = rand(12, 40)
    p.life = 1; p.max = rand(1.0, 1.8)
    p.rgb = hexToRgb(STAR_COLORS[(Math.random() * STAR_COLORS.length) | 0])
    p.size = rand(3, 9) * E.s
    p.tw = rand(3, 7)
  }
  let trailNext2 = 0

  function stepStars(dt, t) {
    let i = 0
    // --- the burst out of his body ---
    const tau = t - G.t0
    for (let b = 0; b < NB; b++, i++) {
      const p = burst[b]
      let alpha = 0
      if (G.active || p.state === 2 || p.state === 3) {
        if (p.state === 0 && tau >= p.born) {
          p.state = 1
          p.x = G.cx + p.sx; p.y = G.cy + p.sy
          p.vx = p.vx0; p.vy = p.vy0
        }
        if (p.state === 1) {
          if (p.flash) {
            // white-gold flash in the middle of him
            const f = tau / 0.9
            alpha = f < 1 ? (1 - f) * 0.8 : 0
            pSize[i] = p.size * E.s * (0.3 + 0.9 * easeOut(f))
            p.x = G.cx; p.y = G.cy
            if (f >= 1) p.state = 5
          } else {
            // fly out fast, slow down, drift and swirl a little, twinkle
            const drag = p.cloud ? 1.0 : 1.25
            p.vx *= Math.exp(-drag * dt); p.vy *= Math.exp(-drag * dt)
            const cx2 = p.x - G.cx, cy2 = p.y - G.cy
            p.vx += -cy2 * p.curl * 0.18 * dt * 6; p.vy += cx2 * p.curl * 0.18 * dt * 6
            p.vy += 8 * dt
            p.x += p.vx * dt; p.y += p.vy * dt
            if (p.cloud) {
              alpha = 0.6 * (1 - clamp01(tau / 2.4))
              pSize[i] = p.size * E.s * (0.5 + 0.8 * easeOut(tau / 1.5))
              if (tau > 2.4) p.state = 5
            } else {
              alpha = 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(t * p.tw + p.ph))
              pSize[i] = p.size * (0.8 + 0.2 * Math.sin(t * p.tw * 1.3 + p.ph))
              if (tau > p.homeAt) p.state = 2
            }
          }
        } else if (p.state === 2) {
          // pulled back into him
          const w = skinWorld(p.ix, p.iy)
          p.vx += ((w[0] - p.x) * 14 - p.vx * 6) * dt
          p.vy += ((w[1] - p.y) * 14 - p.vy * 6) * dt
          p.x += p.vx * dt; p.y += p.vy * dt
          alpha = 1
          pSize[i] = p.size
          if (Math.hypot(w[0] - p.x, w[1] - p.y) < 5) {
            p.state = 3; p.landT = t
            if (G.first) reveal(p.ix, p.iy, 26)
          }
        } else if (p.state === 3) {
          const w = skinWorld(p.ix, p.iy)
          p.x = w[0]; p.y = w[1]
          const flash = Math.exp(-(t - p.landT) * 5)
          alpha = flash * 1.3
          pSize[i] = p.size * (1 + flash)
          if (flash < 0.02) p.state = 5
        }
      }
      pAlpha[i] = alpha
      pPos[i * 3] = p.x || 0; pPos[i * 3 + 1] = p.y || 0
      if (p.rgb) { pCol[i * 3] = p.rgb[0]; pCol[i * 3 + 1] = p.rgb[1]; pCol[i * 3 + 2] = p.rgb[2] }
      pKind[i] = p.kind || 0
    }
    // --- the first time the stars come home, his skin turns into a galaxy ---
    if (G.first && G.active && tau > 2.5) starry = Math.max(starry, ease((tau - 2.5) / 2.3))
    if (starry > 0 && !G.first) starry = 1
    // --- stars on his skin ---
    for (let s = 0; s < NS; s++, i++) {
      const p = skin[s]
      if (starry > 0 && p.on < 1) p.on = Math.min(1, p.on + dt * (G.first ? 0.6 + Math.random() : 3))
      const w = skinWorld(p.ix, p.iy)
      pPos[i * 3] = w[0]; pPos[i * 3 + 1] = w[1]
      pAlpha[i] = p.on * starry * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * p.tw + p.ph)))
      pSize[i] = p.size * E.s
      pCol[i * 3] = p.rgb[0]; pCol[i * 3 + 1] = p.rgb[1]; pCol[i * 3 + 2] = p.rgb[2]
      pKind[i] = 0
    }
    // --- star dust trail ---
    for (let s = 0; s < NT; s++, i++) {
      const p = trail[s]
      if (p.life > 0) {
        p.life -= dt / p.max
        p.vy -= 6 * dt
        p.x += p.vx * dt; p.y += p.vy * dt
        pAlpha[i] = Math.max(0, p.life) * (0.6 + 0.4 * Math.sin(t * p.tw)) * starry
        pPos[i * 3] = p.x; pPos[i * 3 + 1] = p.y
        pSize[i] = p.size
        pCol[i * 3] = p.rgb[0]; pCol[i * 3 + 1] = p.rgb[1]; pCol[i * 3 + 2] = p.rgb[2]
      } else pAlpha[i] = 0
      pKind[i] = 0
    }
    for (const n of ['position', 'aColor', 'aSize', 'aAlpha', 'aKind']) pg.attributes[n].needsUpdate = true
  }

  function draw() {
    if (maskDirty) { maskTex.needsUpdate = true; maskDirty = false }
    renderer.render(scene, camera)
  }

  let last = performance.now() / 1000
  let raf = 0
  function frame() {
    const nowReal = performance.now() / 1000
    const realDt = Math.min(0.5, nowReal - last)
    last = nowReal
    if (visible) {
      // keep real time even on a slow phone: catch up in small steps, draw once
      const n = Math.max(1, Math.ceil(realDt / (1 / 30)))
      for (let i = 0; i < n; i++) step(realDt / n)
      draw()
    }
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)

  // tap Tembo: he bursts with colour right away
  function onClick(ev) {
    const r = canvas.getBoundingClientRect()
    const x = ev.clientX - r.left, y = r.height - (ev.clientY - r.top)
    const lx = (x - E.cx) / (E.s * Math.abs(E.flip)) + W / 2, ly = (y - E.fy) / E.s
    if (lx > 0 && lx < W && ly > 0 && ly < H) trumpetNow()
  }
  stage.addEventListener('click', onClick)

  function destroy() {
    cancelAnimationFrame(raf)
    io.disconnect()
    window.removeEventListener('resize', layout)
    stage.removeEventListener('click', onClick)
    scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose() })
    ;[baseTex, trunkTex, glowTex, maskTex].forEach((t) => t.dispose())
    renderer.dispose()
  }
  return { trumpet: trumpetNow, destroy }
}
