// Fundo "shader gradient": gradiente fluido em WebGL (inspirado no Shader Gradient: tipos plane/waves/orb,
// 3 cores, velocidade, força, densidade e grão). Sem dependências; roda em baixa resolução e a ~30 fps.
(() => {
  const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FRAG = `precision mediump float;
uniform float uTime,uStrength,uFreq,uGrain,uDim;uniform vec2 uRes;uniform vec3 c1,c2,c3;uniform float uType;
vec3 m289(vec3 x){return x-floor(x*(1./289.))*289.;}vec4 m289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 perm(vec4 x){return m289(((x*34.)+1.)*x);}vec4 tis(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=m289(i);
vec4 p=perm(perm(perm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
vec4 nrm=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=nrm.x;p1*=nrm.y;p2*=nrm.z;p3*=nrm.w;
vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;float asp=uRes.x/uRes.y;vec2 p=vec2(uv.x*asp,uv.y);float t=uTime;float n;float k;
  if(uType<.5){ // plane: fluxo orgânico
    vec2 q=p*uFreq;vec2 w=vec2(snoise(vec3(q,t*.12)),snoise(vec3(q+7.3,t*.12)))*uStrength*.35;
    n=snoise(vec3(q+w,t*.1));k=snoise(vec3(q*.6-w*.7+3.1,t*.08+4.));
  }else if(uType<1.5){ // waves: ondas suaves
    float ph=snoise(vec3(p*uFreq*.5,t*.1))*uStrength*.9;
    n=sin(p.x*uFreq*3.2+ph*2.+t*.35)*.55+sin(p.y*uFreq*2.2-t*.28+ph)*.45;k=sin(p.x*uFreq*1.6-p.y*uFreq*2.4+t*.2+ph)*.5;
  }else{ // orb: esfera luminosa
    vec2 d=p-vec2(asp*.5,.5);float r=length(d);n=snoise(vec3(d*uFreq*1.1,t*.1+r*1.5))*.8+(.55-r)*1.4;k=snoise(vec3(d*uFreq*.7+2.,t*.07))*.7-(r-.4);
  }
  vec3 col=mix(c1,c2,smoothstep(-.95,.95,n));col=mix(col,c3,smoothstep(-.8,1.0,k));
  float g=fract(sin(dot(gl_FragCoord.xy+t*60.,vec2(12.9898,78.233)))*43758.5453);
  col+=(g-.5)*uGrain;col*=(1.-uDim);gl_FragColor=vec4(col,1.);
}`;
  const hex = (h) => { const n = parseInt(String(h).replace('#', ''), 16) || 0; return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
  let cv, gl, prog, U = {}, raf = 0, t0 = performance.now(), cfg = null, running = false, last = 0;

  function init() {
    if (cv) return !!gl;
    cv = document.createElement('canvas'); cv.id = 'shaderbg'; cv.setAttribute('aria-hidden', 'true');
    const deco = document.getElementById('deco'); if (!deco) return false;
    deco.prepend(cv);
    gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) return false;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { gl = null; return false; }
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uTime', 'uStrength', 'uFreq', 'uGrain', 'uDim', 'uRes', 'c1', 'c2', 'c3', 'uType'].forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));
    addEventListener('resize', resize); resize();
    document.addEventListener('visibilitychange', () => { document.hidden ? stop() : maybeRun(); });
    return true;
  }
  function resize() {
    if (!cv || !gl) return;
    const w = Math.max(2, Math.round(innerWidth * 0.5)), h = Math.max(2, Math.round(innerHeight * 0.5)); // baixa resolução: gradiente é suave
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
    draw((performance.now() - t0) / 1000);
  }
  function draw(time) {
    if (!gl || !cfg) return;
    gl.uniform1f(U.uTime, time * cfg.speed); gl.uniform1f(U.uStrength, cfg.strength); gl.uniform1f(U.uFreq, cfg.freq);
    gl.uniform1f(U.uGrain, cfg.grain); gl.uniform1f(U.uDim, cfg.dim); gl.uniform2f(U.uRes, cv.width, cv.height);
    gl.uniform3fv(U.c1, cfg.c1); gl.uniform3fv(U.c2, cfg.c2); gl.uniform3fv(U.c3, cfg.c3); gl.uniform1f(U.uType, cfg.type);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < 33) return; last = now; // ~30 fps
    draw((now - t0) / 1000);
  }
  const animated = () => cfg && cfg.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  function maybeRun() { if (cfg && gl && animated() && !document.hidden && !running) { running = true; raf = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  // chamado pelo applyPrefs: p = preferências, mode = 'light' | 'dark'
  window.KBShader = {
    supported: () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl')); } catch { return false; } },
    // mede o custo de desenho neste aparelho (gl.readPixels no fim espera a GPU terminar)
    bench(n = 40) {
      if (!gl || !cfg) return null;
      const s0 = performance.now(); for (let i = 0; i < n; i++) draw(i / 30); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
      return { ms: (performance.now() - s0) / n, w: cv.width, h: cv.height };
    },
    update(p, mode) {
      const on = p.bg === 'shader';
      document.documentElement.dataset.shader = on ? 'on' : 'off';
      if (!on) { stop(); if (cv) cv.style.display = 'none'; return; }
      if (!init()) { document.documentElement.dataset.shader = 'fallback'; document.documentElement.style.setProperty('--shader-fb', `linear-gradient(135deg,${p.shC1 || '#52ff89'},${p.shC2 || '#dbba95'},${p.shC3 || '#d0bce1'})`); return; }
      cv.style.display = '';
      const type = { plane: 0, waves: 1, orb: 2 }[p.shType || 'plane'] ?? 0;
      cfg = { type, c1: hex(p.shC1 || '#52ff89'), c2: hex(p.shC2 || '#dbba95'), c3: hex(p.shC3 || '#d0bce1'),
        speed: (p.shSpeed ?? 40) / 100, strength: (p.shStrength ?? 50) / 50, freq: 0.3 + (p.shDensity ?? 40) / 55, grain: (p.shGrain ?? 4) / 100,
        dim: Math.min(0.9, (p.shDim ?? 0) / 100 + (mode === 'dark' ? 0.5 : 0)), animate: p.fx !== false && p.motion !== false };
      resize(); stop(); maybeRun();
    },
  };
})();
