// Fundos de efeito (sem dependências): Lightfall e Ink Flow Field (WebGL, com reserva em Canvas 2D), Grid Hole e Parallax vertical (Canvas 2D).
// Código próprio, a partir do efeito do OriginKit (referência em docs/originkit-cache). Controles: cores, velocidade, intensidade.
// ~30 fps, meia resolução, pausa com a aba oculta; parado com "fundo animado" desligado ou movimento reduzido.
(() => {
  const PRESETS = {
    neon:  { fxBg: '#05060f', fxC1: '#7c9cff', fxC2: '#ff5fd2' },
    ambar: { fxBg: '#0c0703', fxC1: '#ffb347', fxC2: '#ff5a36' },
    gelo:  { fxBg: '#f3f8fb', fxC1: '#2b6cb0', fxC2: '#0e9aa7' },
    mono:  { fxBg: '#0a0a0a', fxC1: '#f4f4f5', fxC2: '#71717a' },
  };
  const AUTO = {
    chuvaluz: ['lightfall', { fxBg: '#f4f7fb', fxC1: '#2b5fd9', fxC2: '#0e9aa7' }, { fxBg: '#04050d', fxC1: '#7c9cff', fxC2: '#ff5fd2' }],
    singular: ['gridhole', { fxBg: '#f6f3ee', fxC1: '#3a3a46', fxC2: '#d2461e' }, { fxBg: '#030308', fxC1: '#6d7dff', fxC2: '#ff7a1a' }],
    nanquim: ['ink', { fxBg: '#f4efe6', fxC1: '#1b2a41', fxC2: '#b4432a' }, { fxBg: '#07090c', fxC1: '#5ad1c4', fxC2: '#e8c15a' }],
    cordilheira: ['parallax', { fxBg: '#f6efe8', fxC1: '#7a5a8a', fxC2: '#e8825a' }, { fxBg: '#0a0814', fxC1: '#7c6cf0', fxC2: '#ff7ab0' }],
  };
  const TYPES = ['lightfall', 'gridhole', 'ink', 'parallax'];
  const rgb = (hex) => { const n = parseInt(String(hex).replace('#', ''), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const lum = (c) => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  let cv, ctx, cfg = null, raf = 0, running = false, last = 0, t0 = performance.now(), W = 2, H = 2;
  let mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5, scrollY = 0, scrollT = 0;
  let streaks = [], parts = [], inkReset = true, ema = 0, qual = 1;

  // ---------- Lightfall em WebGL: fios de luz caem na parede curva de um cilindro (interseção analítica, sem raymarch).
  // Colunas com sorteio próprio (velocidade, fase, cor, cauda); cabeça brilhante, cauda que some, cintilar e brilho de fundo.
  const GL_VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const GL_FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes; uniform float uT, uMx, uGlow, uLayers, uDark; uniform vec3 uBg, uC1, uC2;
const float D = 15.0;      // colunas por unidade de x
const float F = 1.35;      // distância focal (curvatura da parede)
const float LOOP = 2.3;    // comprimento (rad) do ciclo de uma faixa
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  vec2 u = (gl_FragCoord.xy * 2.0 - uRes) / uRes.y;
  u.x += (uMx - 0.5) * 0.25;
  float rho = sqrt(u.y * u.y + F * F), x = u.x / rho * D, th = atan(u.y, F) / LOOP;
  // tamanho do pixel em unidades de coluna: dá o suavizado das bordas sem derivadas do hardware
  float fp = (abs(1.0 / rho) + abs(u.x * u.y / (rho * rho * rho))) * D * (2.0 / uRes.y);
  float e = 0.004;
  vec3 accC = vec3(0.0); float accA = 0.0;
  for (int m = 0; m < 12; m++) {
    float fm = float(m);
    if (fm >= uLayers) break;
    float xs = x + fm * 0.37 + fm * fm * 0.11, cell = floor(xs), fx = fract(xs) - 0.5;
    float i1 = h21(vec2(cell, fm)), i2 = h21(vec2(cell, fm + 20.0)), i3 = h21(vec2(cell, fm + 40.0)), i4 = h21(vec2(cell, fm + 60.0));
    float b = fract(th + uT * (0.05 + 0.11 * i1) + i2 + e) - e;     // distância atrás da cabeça (fração do ciclo)
    float tl = 0.10 + 0.32 * i3, bp = max(b, 0.0);
    float tail = exp(-bp / tl * 3.2) * smoothstep(-e, 0.0, b);
    float head = exp(-bp / (tl * 0.07)) * 1.5 * smoothstep(-e, 0.0, b);
    float hw = 0.075 + 0.05 * i4, w = max(hw, fp);                   // largura da linha (nunca menor que um pixel)
    float lat = exp(-(fx * fx) / (w * w)) * min(1.0, hw / w);
    vec3 col = mix(uC1, uC2, i4);
    float tw = 1.0 + 0.4 * sin(uT * 1.7 + i3 * 40.0);
    float a = (tail + head) * lat * tw * (0.5 + 0.5 * i2) * (1.0 - 0.7 * smoothstep(0.8, 1.9, abs(u.x)));   // bordas mais fracas: não brigam com a barra lateral
    vec3 hc = mix(col, vec3(1.0), 0.45 * uDark);
    accC += mix(col, hc, clamp(head / max(tail + head, 1e-4), 0.0, 1.0)) * a; accA += a;
  }
  float g = exp(-dot(u * vec2(0.7, 1.0), u * vec2(0.7, 1.0)) * 1.1);
  vec3 base = mix(uBg, mix(uBg, uC1, 0.16), g * mix(0.45, 1.0, uDark));
  vec3 outc;
  if (uDark > 0.5) outc = base + (1.0 - exp(-accC * uGlow));
  else outc = mix(base, accC / max(accA, 1e-4), (1.0 - exp(-accA * uGlow * 0.8)) * 0.9);
  gl_FragColor = vec4(outc, 1.0);
}`;
  let gcv, gl, glProg, glU, glOk = false;
  function glInit() {
    if (glOk) return true; if (gcv === false) return false;
    const deco = document.getElementById('deco'); if (!deco) return false;
    gcv = document.createElement('canvas'); gcv.id = 'fxgl'; gcv.setAttribute('aria-hidden', 'true'); deco.prepend(gcv);
    gl = gcv.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
    const bad = () => { gcv.remove(); gcv = false; gl = null; return false; };
    if (!gl) return bad();
    const sh = (t, src) => { const o = gl.createShader(t); gl.shaderSource(o, src); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; };
    const vs = sh(gl.VERTEX_SHADER, GL_VS), fs = sh(gl.FRAGMENT_SHADER, GL_FS); if (!vs || !fs) return bad();
    glProg = gl.createProgram(); gl.attachShader(glProg, vs); gl.attachShader(glProg, fs); gl.bindAttribLocation(glProg, 0, 'p'); gl.linkProgram(glProg);
    if (!gl.getProgramParameter(glProg, gl.LINK_STATUS)) return bad();
    gl.useProgram(glProg); const bf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    glU = {}; for (const n of ['uRes', 'uT', 'uMx', 'uGlow', 'uLayers', 'uDark', 'uBg', 'uC1', 'uC2']) glU[n] = gl.getUniformLocation(glProg, n);
    // se o navegador perder o contexto, volta para a versão em Canvas 2D sem quebrar a tela
    gcv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); glOk = false; inkOk = false; if (cfg) { stop(); gcv.style.display = 'none'; cv && (cv.style.display = ''); resize(); run(); } });
    return (glOk = true);
  }
  const useGL = () => glOk && cfg && (cfg.type === 'lightfall' || (cfg.type === 'ink' && inkOk));
  function glDraw(t) {
    const c = cfg, dark = lum(c.bgc) < 0.5;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.useProgram(glProg);
    gl.viewport(0, 0, gcv.width, gcv.height); gl.uniform2f(glU.uRes, gcv.width, gcv.height);
    gl.uniform1f(glU.uT, t * c.sp + 8); gl.uniform1f(glU.uMx, mx);
    gl.uniform1f(glU.uLayers, Math.max(3, Math.min(12, Math.round(7 * c.amt)))); gl.uniform1f(glU.uGlow, (dark ? 0.9 : 1.1) * Math.min(1.4, 0.6 + c.amt * 0.4)); gl.uniform1f(glU.uDark, dark ? 1 : 0);
    gl.uniform3f(glU.uBg, c.bgc[0] / 255, c.bgc[1] / 255, c.bgc[2] / 255); gl.uniform3f(glU.uC1, c.c1[0] / 255, c.c1[1] / 255, c.c1[2] / 255); gl.uniform3f(glU.uC2, c.c2[0] / 255, c.c2[1] / 255, c.c2[2] / 255);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // ---------- Ink Flow Field em WebGL: fluido estável (Navier–Stokes) na GPU. Tinta é soprada por um agitador autônomo
  // (deriva) e pelo mouse; vorticidade mantém os redemoinhos; a tinta some devagar. Sem WebGL de meia precisão, cai no Canvas 2D.
  const INK_VS = 'attribute vec2 p;varying vec2 vUv,vL,vR,vT,vB;uniform vec2 uTx;void main(){vUv=p*.5+.5;vL=vUv-vec2(uTx.x,0.);vR=vUv+vec2(uTx.x,0.);vT=vUv+vec2(0.,uTx.y);vB=vUv-vec2(0.,uTx.y);gl_Position=vec4(p,0.,1.);}';
  const INK_H = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\nvarying vec2 vUv,vL,vR,vT,vB;';
  const INK_FS = {
    splat: 'uniform sampler2D uT;uniform vec2 uPt;uniform vec3 uCol;uniform float uAsp,uR,uA;void main(){vec2 d=vUv-uPt;d.x*=uAsp;gl_FragColor=texture2D(uT,vUv)+vec4(uCol,uA)*exp(-dot(d,d)/uR);}',
    advect: 'uniform sampler2D uV,uS;uniform vec2 uTxV;uniform float uDt,uDiss;void main(){vec2 c=vUv-uDt*texture2D(uV,vUv).xy*uTxV;gl_FragColor=texture2D(uS,c)/(1.+uDiss*uDt);}',
    curl: 'uniform sampler2D uV;void main(){float L=texture2D(uV,vL).y,R=texture2D(uV,vR).y,T=texture2D(uV,vT).x,B=texture2D(uV,vB).x;gl_FragColor=vec4(.5*(R-L-T+B),0.,0.,1.);}',
    vort: 'uniform sampler2D uV,uC;uniform float uAmt,uDt;void main(){float L=texture2D(uC,vL).x,R=texture2D(uC,vR).x,T=texture2D(uC,vT).x,B=texture2D(uC,vB).x,C=texture2D(uC,vUv).x;vec2 f=.5*vec2(abs(T)-abs(B),abs(R)-abs(L));f/=length(f)+1e-4;f*=uAmt*C;f.y*=-1.;gl_FragColor=vec4(clamp(texture2D(uV,vUv).xy+f*uDt,-1000.,1000.),0.,1.);}',
    div: 'uniform sampler2D uV;void main(){float L=texture2D(uV,vL).x,R=texture2D(uV,vR).x,T=texture2D(uV,vT).y,B=texture2D(uV,vB).y;vec2 C=texture2D(uV,vUv).xy;if(vL.x<0.)L=-C.x;if(vR.x>1.)R=-C.x;if(vT.y>1.)T=-C.y;if(vB.y<0.)B=-C.y;gl_FragColor=vec4(.5*(R-L+T-B),0.,0.,1.);}',
    prs: 'uniform sampler2D uP,uD;void main(){float L=texture2D(uP,vL).x,R=texture2D(uP,vR).x,T=texture2D(uP,vT).x,B=texture2D(uP,vB).x;gl_FragColor=vec4((L+R+B+T-texture2D(uD,vUv).x)*.25,0.,0.,1.);}',
    grad: 'uniform sampler2D uP,uV;void main(){float L=texture2D(uP,vL).x,R=texture2D(uP,vR).x,T=texture2D(uP,vT).x,B=texture2D(uP,vB).x;gl_FragColor=vec4(texture2D(uV,vUv).xy-vec2(R-L,T-B),0.,1.);}',
    clr: 'uniform sampler2D uT;uniform float uK;void main(){gl_FragColor=uK*texture2D(uT,vUv);}',
    show: 'uniform sampler2D uD;uniform vec3 uBg;uniform float uDark;void main(){vec4 d=max(texture2D(uD,vUv),0.);float a=(1.-exp(-max(d.a-.02,0.)*1.2))*mix(.85,1.,uDark);vec3 hue=clamp(d.rgb/max(d.a,1e-4),0.,1.);vec3 o=mix(uBg,hue,a);o+=hue*a*a*.25*uDark;gl_FragColor=vec4(o,1.);}',
  };
  let inkOk = false, inkT = 0, ink_ = null, inkClock = 0, inkPh = 0, inkSeed = false, inkAx = 0.5, inkAy = 0.5, inkLx = null, inkLy = 0;
  const inkP = {};
  function inkTarget(w, h) {
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, inkT, null);
    const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fbo, w, h, tx: 1 / w, ty: 1 / h };
  }
  const inkFree = (t) => { if (t) { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fbo); } };
  const inkDbl = (w, h) => { const o = { r: inkTarget(w, h), w: inkTarget(w, h), swap() { const x = this.r; this.r = this.w; this.w = x; } }; return o; };
  function inkInit() {
    if (inkOk) return true; if (inkT === -1 || !glOk) return false;
    const e = gl.getExtension('OES_texture_half_float'), lin = gl.getExtension('OES_texture_half_float_linear'), cb = gl.getExtension('EXT_color_buffer_half_float');
    const fail = () => { inkT = -1; return false; };
    if (!e || !lin || !cb) return fail(); inkT = e.HALF_FLOAT_OES;
    try {
      for (const [n, src] of Object.entries(INK_FS)) {
        const f = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(f, INK_H + src); gl.compileShader(f); if (!gl.getShaderParameter(f, gl.COMPILE_STATUS)) return fail();
        const v = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(v, INK_VS); gl.compileShader(v);
        const pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.bindAttribLocation(pr, 0, 'p'); gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return fail();
        inkP[n] = { pr, u: new Proxy({}, { get: (o, k) => o[k] || (o[k] = gl.getUniformLocation(pr, k)) }) };
      }
      const t = inkTarget(4, 4); const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE; inkFree(t); if (!ok) return fail();
    } catch (_) { return fail(); }
    return (inkOk = true);
  }
  function inkAlloc() {
    if (!inkOk) return; if (ink_) { for (const k of ['vel', 'dye', 'prs']) { inkFree(ink_[k].r); inkFree(ink_[k].w); } inkFree(ink_.div); inkFree(ink_.crl); }
    const a = innerWidth / innerHeight, sz = (m) => (a >= 1 ? [Math.round(m * a), m] : [m, Math.round(m / a)]), S = sz(96), D = sz(320);
    ink_ = { vel: inkDbl(S[0], S[1]), dye: inkDbl(D[0], D[1]), prs: inkDbl(S[0], S[1]), div: inkTarget(S[0], S[1]), crl: inkTarget(S[0], S[1]), asp: a };
    inkSeed = false; inkClock = 0; inkLx = null;
  }
  function inkDraw(t, dtr) {
    const c = cfg, K = ink_; if (!K) return;
    const dt = dtr * c.sp * 1.1, dark = lum(c.bgc) < 0.5; inkClock += dt; inkPh += dt * 0.5;
    const use = (n) => { gl.useProgram(inkP[n].pr); return inkP[n].u; };
    const tex = (tx, i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tx); return i; };
    const blit = (tg) => { gl.bindFramebuffer(gl.FRAMEBUFFER, tg.fbo); gl.viewport(0, 0, tg.w, tg.h); gl.drawArrays(gl.TRIANGLES, 0, 3); };
    const col = (k) => { const m = 0.5 + 0.5 * Math.sin(inkPh * 2 + k * 3), q = mix(c.c1, c.c2, m); return [q[0] / 255, q[1] / 255, q[2] / 255]; };
    const splat = (x, y, fx, fy, cl, r, amt) => {
      const u = use('splat'); gl.uniform2f(u.uTx, K.vel.r.tx, K.vel.r.ty); gl.uniform1f(u.uAsp, K.asp); gl.uniform2f(u.uPt, x, y); gl.uniform1f(u.uR, r);
      gl.uniform1i(u.uT, tex(K.vel.r.tex, 0)); gl.uniform3f(u.uCol, fx, fy, 0); gl.uniform1f(u.uA, 0); blit(K.vel.w); K.vel.swap();
      gl.uniform1i(u.uT, tex(K.dye.r.tex, 0)); gl.uniform3f(u.uCol, cl[0] * amt, cl[1] * amt, cl[2] * amt); gl.uniform1f(u.uA, amt); blit(K.dye.w); K.dye.swap();
    };
    const vw = K.vel.r.w;   // força em texels/s: um gesto de "1 tela por segundo" move o fluido na mesma velocidade
    if (!inkSeed) { inkSeed = true; [[0.28, 0.62, 1.4, 0.6], [0.66, 0.38, -1.2, 0.9], [0.5, 0.5, 0.4, -1.4]].forEach((q, i) => splat(q[0], q[1], q[2] * vw * 0.4, q[3] * vw * 0.4, col(i * 1.7), 0.0042, 1.1)); }
    const px = tx, py = 1 - ty;
    if (inkLx !== null && (Math.abs(px - inkLx) + Math.abs(py - inkLy) > 1e-4) && dtr > 0) splat(px, py, ((px - inkLx) / dtr) * vw * 0.6 * 0.9, ((py - inkLy) / dtr) * vw * 0.6 * 0.9, col(px * 4), 0.0045, dtr * 4.5);
    inkLx = px; inkLy = py;
    for (const [k, fa, fb, ph] of [[0, 0.55, 0.17, 0], [1, 0.37, 0.23, 2.4]]) {   // dois agitadores autônomos, com frequências que nunca se repetem
      const nx = 0.5 + 0.32 * Math.sin(inkClock * fa + ph) * Math.cos(inkClock * fb), ny = 0.5 + 0.28 * Math.sin(inkClock * (fa * 0.8) + 1.7 + ph);
      const ax = inkAx, ay = inkAy; if (k === 0) { inkAx = nx; inkAy = ny; }
      const lx = k === 0 ? ax : (K.l1x ?? nx), ly = k === 0 ? ay : (K.l1y ?? ny); if (k === 1) { K.l1x = nx; K.l1y = ny; }
      if (dtr > 0) splat(nx, ny, ((nx - lx) / dtr) * vw * 0.5, ((ny - ly) / dtr) * vw * 0.5, col(inkPh + k * 2), 0.0034, dtr * 4.5 * 0.7);
    }
    let u = use('curl'); gl.uniform2f(u.uTx, K.vel.r.tx, K.vel.r.ty); gl.uniform1i(u.uV, tex(K.vel.r.tex, 0)); blit(K.crl);
    u = use('vort'); gl.uniform2f(u.uTx, K.vel.r.tx, K.vel.r.ty); gl.uniform1i(u.uV, tex(K.vel.r.tex, 0)); gl.uniform1i(u.uC, tex(K.crl.tex, 1)); gl.uniform1f(u.uAmt, 14); gl.uniform1f(u.uDt, dt); blit(K.vel.w); K.vel.swap();
    u = use('div'); gl.uniform2f(u.uTx, K.vel.r.tx, K.vel.r.ty); gl.uniform1i(u.uV, tex(K.vel.r.tex, 0)); blit(K.div);
    u = use('clr'); gl.uniform2f(u.uTx, K.prs.r.tx, K.prs.r.ty); gl.uniform1i(u.uT, tex(K.prs.r.tex, 0)); gl.uniform1f(u.uK, 0.8); blit(K.prs.w); K.prs.swap();
    u = use('prs'); gl.uniform2f(u.uTx, K.prs.r.tx, K.prs.r.ty); gl.uniform1i(u.uD, tex(K.div.tex, 0));
    for (let i = 0; i < 18; i++) { gl.uniform1i(u.uP, tex(K.prs.r.tex, 1)); blit(K.prs.w); K.prs.swap(); }
    u = use('grad'); gl.uniform2f(u.uTx, K.vel.r.tx, K.vel.r.ty); gl.uniform1i(u.uP, tex(K.prs.r.tex, 0)); gl.uniform1i(u.uV, tex(K.vel.r.tex, 1)); blit(K.vel.w); K.vel.swap();
    u = use('advect'); gl.uniform2f(u.uTx, K.vel.r.tx, K.vel.r.ty); gl.uniform2f(u.uTxV, K.vel.r.tx, K.vel.r.ty); gl.uniform1f(u.uDt, dt);
    gl.uniform1i(u.uV, tex(K.vel.r.tex, 0)); gl.uniform1i(u.uS, tex(K.vel.r.tex, 1)); gl.uniform1f(u.uDiss, 0.2); blit(K.vel.w); K.vel.swap();
    gl.uniform1i(u.uV, tex(K.vel.r.tex, 0)); gl.uniform1i(u.uS, tex(K.dye.r.tex, 1)); gl.uniform1f(u.uDiss, 0.9); blit(K.dye.w); K.dye.swap();
    u = use('show'); gl.uniform2f(u.uTx, 0, 0); gl.uniform1i(u.uD, tex(K.dye.r.tex, 0)); gl.uniform3f(u.uBg, c.bgc[0] / 255, c.bgc[1] / 255, c.bgc[2] / 255); gl.uniform1f(u.uDark, dark ? 1 : 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, gcv.width, gcv.height); gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function init() {
    if (cv) return true;
    const deco = document.getElementById('deco'); if (!deco) return false;
    cv = document.createElement('canvas'); cv.id = 'fxbg'; cv.setAttribute('aria-hidden', 'true'); deco.prepend(cv);
    ctx = cv.getContext('2d', { alpha: false }); if (!ctx) return false;
    addEventListener('resize', resize);
    addEventListener('pointermove', (e) => { tx = e.clientX / innerWidth; ty = e.clientY / innerHeight; }, { passive: true });
    // rolagem de qualquer contêiner (o quadro tem várias colunas com rolagem própria) alimenta o parallax vertical
    document.addEventListener('scroll', (e) => { const el = e.target === document ? document.scrollingElement : e.target; if (el && el.scrollTop != null) scrollT = el.scrollTop; }, { capture: true, passive: true });
    document.addEventListener('visibilitychange', () => { document.hidden ? stop() : run(); });
    return true;
  }
  function resize() {
    if (!cv) return;
    const s = Math.min(1, window.devicePixelRatio || 1) * 0.6;
    W = Math.max(64, Math.round(innerWidth * s)); H = Math.max(64, Math.round(innerHeight * s));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    if (gcv && glOk) { const g = Math.min(1.5, window.devicePixelRatio || 1) * 0.75; gcv.width = Math.max(64, Math.round(innerWidth * g)); gcv.height = Math.max(64, Math.round(innerHeight * g)); if (inkOk && cfg && cfg.type === 'ink') inkAlloc(); }
    streaks = []; parts = []; inkReset = true; hole = null;
    draw((performance.now() - t0) / 1000, 0.033);
  }
  const fill = (c) => { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = rgba(c, 1); ctx.fillRect(0, 0, W, H); };

  // ---------- Lightfall: fios de luz caindo, com brilho na ponta e reação ao mouse
  function lightfall(t, dt) {
    const c = cfg, bg = c.bgc; fill(bg);
    const want = Math.round((W / 9) * c.amt * qual);
    while (streaks.length < want) streaks.push({ x: rnd() * W, y: rnd() * H * 1.4 - H * 0.4, v: 0.35 + rnd() * 0.9, len: 0.08 + rnd() * 0.22, k: rnd(), w: 0.6 + rnd() * 1.4 });
    streaks.length = Math.min(streaks.length, want);
    const dark = lum(bg) < 0.5; ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over'; ctx.lineCap = 'round';
    for (const s of streaks) {
      s.y += s.v * H * 0.38 * c.sp * dt; if (s.y - s.len * H > H) { s.y = -rnd() * H * 0.3; s.x = rnd() * W; s.k = rnd(); }
      const col = mix(c.c1, c.c2, s.k), L = s.len * H, near = Math.max(0, 1 - Math.abs(s.x / W - mx) * 5);
      const g = ctx.createLinearGradient(0, s.y - L, 0, s.y); g.addColorStop(0, rgba(col, 0)); g.addColorStop(1, rgba(col, (dark ? 0.55 : 0.7) + near * 0.35));
      ctx.strokeStyle = g; ctx.lineWidth = s.w * (1 + near * 0.8); ctx.beginPath(); ctx.moveTo(s.x, s.y - L); ctx.lineTo(s.x, s.y); ctx.stroke();
      ctx.fillStyle = rgba(col, dark ? 0.8 : 0.9); ctx.beginPath(); ctx.arc(s.x, s.y, s.w * 0.9, 0, 6.3); ctx.fill();
    }
  }

  // ---------- Grid Hole: funil visto de cima. Anéis elípticos fluem para dentro do buraco (espaçamento exponencial),
  // linhas radiais curvas, túnel recortado, partículas subindo em leque, vinheta e brilho embaixo.
  let hole = null;
  function holeBuild() {
    const c = cfg, N = 80, A = { x: W * 0.5, y: H * 0.45, w: W * 0.75, h: H * 0.7 }, B = { y: H * 0.95 };
    const at = (p) => ({ x: A.x, y: A.y + (B.y - A.y) * (p === 0 ? 0 : Math.pow(2, 10 * (p - 1))), w: A.w * (1 - p), h: A.h * (1 - p) });
    // o anel de menor "fundo" define a boca do túnel (elipse + retângulo acima do centro)
    let mouth = at(0), prev = H;
    for (let i = 0; i < N; i++) { const d = at(i / N); if (d.y + d.h <= prev) mouth = d; prev = d.y + d.h; }
    const clip = new Path2D(); clip.ellipse(mouth.x, mouth.y, mouth.w, mouth.h, 0, 0, 6.2832); clip.rect(mouth.x - mouth.w, 0, mouth.w * 2, mouth.y);
    // linhas radiais: percorrem os anéis parados; fora da boca ficam inteiras, dentro dela são recortadas
    const off = document.createElement('canvas'); off.width = W; off.height = H; const o = off.getContext('2d');
    const L = 80, ring = []; for (let i = 0; i < N; i++) ring.push(at(i / N));
    o.strokeStyle = rgba(c.c1, 1); o.lineWidth = Math.max(1, W / 1200); o.lineJoin = o.lineCap = 'round';
    const poly = (pts) => { if (pts.length < 2) return; o.beginPath(); o.moveTo(pts[0][0], pts[0][1]); for (let j = 1; j < pts.length; j++) o.lineTo(pts[j][0], pts[j][1]); o.stroke(); };
    for (let k = 0; k < L; k++) {
      const an = (k / L) * 6.2832, pts = ring.map((d) => [d.x + Math.cos(an) * d.w, d.y + Math.sin(an) * d.h]);
      let enter = -1; for (let j = 1; j < pts.length; j++) if (o.isPointInPath(clip, pts[j][0], pts[j][1]) || o.isPointInStroke(clip, pts[j][0], pts[j][1])) { enter = j; break; }
      if (enter < 0) { poly(pts); continue; }
      poly(pts.slice(0, enter + 1)); o.save(); o.clip(clip); poly(pts.slice(enter)); o.restore();
    }
    const area = { sw: mouth.w * 0.5, ew: mouth.w * 2, h: H * 0.85 }; area.sx = (W - area.sw) / 2; area.ex = (W - area.ew) / 2;
    hole = { at, mouth, clip, off, area, parts: null };
  }
  function holePart(start) {
    const a = hole.area, sx = a.sx + a.sw * rnd(), ex = a.ex + a.ew * rnd();
    return { sx, dx: ex - sx, y: start ? a.h * rnd() : a.h, vy: (0.5 + rnd()) * 0.6, r: (0.5 + rnd() * 4) * 0.6, al: 0.15 + rnd() * 0.85 };
  }
  function gridhole(t, dt) {
    const c = cfg, bg = c.bgc, dark = lum(bg) < 0.5; if (!hole) holeBuild();
    fill(bg); ctx.save(); ctx.translate((mx - 0.5) * W * 0.03, 0);
    const base = dark ? 0.3 : 0.4, lw = Math.max(1, W / 1200);
    // linhas radiais (já desenhadas) e anéis em movimento
    ctx.globalAlpha = base; ctx.drawImage(hole.off, 0, 0); ctx.globalAlpha = 1;
    ctx.strokeStyle = rgba(c.c1, base * 1.5); ctx.lineWidth = lw;
    const N = 80, ph = (t * 0.06 * c.sp) % 1, m = hole.mouth;
    for (let i = 0; i < N; i += 5) {
      const d = hole.at((i / N + ph) % 1), inner = d.w < m.w - 5;
      if (inner) { ctx.save(); ctx.clip(hole.clip); }
      ctx.beginPath(); ctx.ellipse(d.x, d.y, Math.max(0.1, d.w), Math.max(0.1, d.h), 0, 0, 6.2832); ctx.stroke(); if (inner) ctx.restore();
    }
    ctx.beginPath(); const A = hole.at(0); ctx.ellipse(A.x, A.y, A.w, A.h, 0, 0, 6.2832); ctx.stroke();
    // partículas sobem do fundo do funil e abrem em leque
    const want = Math.round(300 * c.amt * qual * (W * H) / (1000 * 600)), n = Math.max(40, Math.min(600, want));
    if (!hole.parts) hole.parts = [];
    while (hole.parts.length < n) hole.parts.push(holePart(true)); hole.parts.length = n;
    ctx.save(); ctx.clip(hole.clip);
    for (let i = 0; i < n; i++) {
      const q = hole.parts[i], p = 1 - q.y / hole.area.h; q.y -= q.vy * 60 * c.sp * dt;
      if (q.y < 0) { hole.parts[i] = holePart(false); continue; }
      ctx.fillStyle = rgba(dark ? mix(c.c2, [255, 255, 255], 0.35) : c.c2, q.al * (dark ? 0.9 : 0.8));
      ctx.beginPath(); ctx.arc(q.sx + q.dx * p, q.y, q.r / 2 + 0.2, 0, 6.2832); ctx.fill();
    }
    ctx.restore(); ctx.restore();
    // vinheta (apaga as bordas) e brilho do fundo do buraco
    const vg = ctx.createRadialGradient(W * 0.5, H * 0.55, Math.min(W, H) * 0.12, W * 0.5, H * 0.55, Math.max(W, H) * 0.75);
    vg.addColorStop(0, rgba(bg, 0)); vg.addColorStop(0.7, rgba(bg, 0.8)); vg.addColorStop(1, rgba(bg, 1)); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W * 0.5, H * 0.78); ctx.scale(1, 0.55); const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.5);
    gg.addColorStop(0, rgba(c.c2, dark ? 0.5 : 0.28)); gg.addColorStop(1, rgba(c.c2, 0)); ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over'; ctx.fillStyle = gg; ctx.fillRect(-W, -H * 2, W * 2, H * 4); ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---------- Ink Flow Field: partículas seguem um campo de fluxo e deixam rastros de tinta
  const ang = (x, y, t) => (Math.sin(x * 0.0042 + t * 0.21) + Math.cos(y * 0.0051 - t * 0.17) + Math.sin((x + y) * 0.0026 + t * 0.11) * 1.3) * 1.9;
  function ink(t, dt) {
    const c = cfg, bg = c.bgc;
    if (inkReset) { fill(bg); inkReset = false; }
    const want = Math.round(520 * c.amt * qual * (W * H) / (1000 * 600)); const N = Math.max(80, Math.min(1400, want));
    while (parts.length < N) parts.push({ x: rnd() * W, y: rnd() * H, a: rnd(), life: 60 + rnd() * 200 });
    parts.length = Math.min(parts.length, N);
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = rgba(bg, 0.045); ctx.fillRect(0, 0, W, H);
    const dark = lum(bg) < 0.5, sp = 1.1 * c.sp, mxp = mx * W, myp = my * H; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
    for (const p of parts) {
      let a = ang(p.x, p.y, t); const dx = p.x - mxp, dy = p.y - myp, d = Math.hypot(dx, dy);
      if (d < 140) a += (1 - d / 140) * 2.2; // o mouse gira o fluxo em volta dele
      const nx = p.x + Math.cos(a) * sp, ny = p.y + Math.sin(a) * sp, k = (Math.sin(a * 0.5 + p.a * 6) + 1) / 2;
      ctx.strokeStyle = rgba(mix(c.c1, c.c2, k), dark ? 0.5 : 0.42); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
      p.x = nx; p.y = ny; if (--p.life < 0 || nx < -5 || ny < -5 || nx > W + 5 || ny > H + 5) { p.x = rnd() * W; p.y = rnd() * H; p.life = 80 + rnd() * 220; }
    }
  }

  // ---------- Parallax vertical: camadas de cristas que sobem/descem em velocidades diferentes com a rolagem
  function parallax(t) {
    const c = cfg, bg = c.bgc; fill(bg);
    scrollY += (scrollT - scrollY) * 0.12;
    const layers = 6, dark = lum(bg) < 0.5;
    // sol/lua que quase não se mexe
    const sx = W * (0.7 - (mx - 0.5) * 0.03), sy = H * 0.3 - scrollY * 0.03; const g0 = ctx.createRadialGradient(sx, sy, 0, sx, sy, H * 0.35); g0.addColorStop(0, rgba(c.c2, 0.5)); g0.addColorStop(1, rgba(c.c2, 0));
    ctx.fillStyle = g0; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < layers; i++) {
      const d = (i + 1) / layers, depth = 0.04 + d * 0.5; // camadas da frente andam mais
      const base = H * (0.42 + d * 0.5) - scrollY * depth * 0.55 * c.amt + Math.sin(t * 0.15 * c.sp + i) * 3, amp = H * (0.07 + (1 - d) * 0.05), f = 0.8 + i * 0.55;
      const sh = (mx - 0.5) * depth * W * 0.08 + t * 3 * c.sp * (0.2 + d * 0.8);
      const col = mix(bg, mix(c.c1, c.c2, d), 0.12 + d * 0.5 * (dark ? 0.8 : 0.9));
      ctx.fillStyle = rgba(col, 1); ctx.beginPath(); ctx.moveTo(0, H + 4);
      for (let x = 0; x <= W; x += 6) {
        const u = (x + sh) / W * Math.PI * 2 * f; ctx.lineTo(x, base + Math.sin(u + i * 1.7) * amp + Math.sin(u * 2.3 + i * 0.6) * amp * 0.45 + Math.sin(u * 5.1 + i) * amp * 0.12);
      }
      ctx.lineTo(W, H + 4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba(mix(c.c1, c.c2, d), 0.3 + d * 0.3); ctx.lineWidth = 1; ctx.stroke();
    }
  }

  function draw(t, dt) {
    if (!ctx || !cfg) return;
    mx += (tx - mx) * 0.07; my += (ty - my) * 0.07;
    if (useGL()) return cfg.type === 'ink' ? inkDraw(t, dt || 0.033) : glDraw(t);
    ({ lightfall, gridhole, ink, parallax }[cfg.type] || lightfall)(t, dt || 0.033);
  }
  function frame(now) {
    raf = requestAnimationFrame(frame); if (now - last < 33) return; const dt = Math.min(0.1, (now - last) / 1000); last = now;
    const s = performance.now(); draw((now - t0) / 1000, dt); const d = performance.now() - s; ema = ema ? ema * 0.9 + d * 0.1 : d;
    if (ema > 22 && qual > 0.46) { qual = Math.max(0.45, qual * 0.8); ema = 14; }
  }
  const animated = () => cfg && cfg.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  function run() { if (cfg && ctx && animated() && !document.hidden && !running) { running = true; raf = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  window.KBFx = {
    PRESETS, TYPES,
    bench(n = 40) {
      if (!ctx || !cfg) return null;
      const s = performance.now(); for (let i = 0; i < n; i++) draw(i / 30, 0.033);
      if (useGL()) gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); else ctx.getImageData(0, 0, 1, 1);
      return { ms: (performance.now() - s) / n, w: W, h: H };
    },
    // mode = claro/escuro; theme = id (os temas de AUTO ligam o fundo sozinhos quando o fundo é "do tema")
    update(p, mode, theme) {
      const au = AUTO[theme] && (!p.bg || p.bg === 'theme') ? AUTO[theme] : null;
      const on = !!au || TYPES.includes(p.bg), type = au ? au[0] : p.bg;
      if (au) p = { ...p, ...au[mode === 'dark' ? 2 : 1] };
      document.documentElement.dataset.fxbg = on ? type : 'off';
      if (!on) { stop(); if (cv) cv.style.display = 'none'; if (gcv) gcv.style.display = 'none'; return; }
      if (!init()) return;
      if (type === 'lightfall' || type === 'ink') glInit();
      if (type === 'ink' && glOk) inkInit();
      const gl_ = (type === 'lightfall' && glOk) || (type === 'ink' && inkOk); cv.style.display = gl_ ? 'none' : ''; if (gcv) gcv.style.display = gl_ ? '' : 'none';
      const bgc = rgb(p.fxBg || '#05060f');
      cfg = { type, bgc, c1: rgb(p.fxC1 || '#7c9cff'), c2: rgb(p.fxC2 || '#ff5fd2'), sp: Math.max(0.05, (p.fxSp ?? 100) / 100), amt: Math.max(0.2, (p.fxAmt ?? 100) / 100),
        animate: p.fx !== false && p.motion !== false };
      qual = 1; ema = 0; streaks = []; parts = []; inkReset = true; hole = null; seed = 7; resize(); stop();
      if (!animated()) for (let i = 0; i < (cfg.type === 'ink' ? (useGL() ? 120 : 260) : 3); i++) draw(i / 30, 0.033); // quadro estático já "desenvolvido"
      run();
    },
  };
})();
