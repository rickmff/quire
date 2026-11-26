import{i as e,r as t,t as n}from"./index-Cvsa5Tuj.js";import{t as r}from"./utils-C2msa8mM.js";import{t as i}from"./use-reduced-motion-DoPGir53.js";var a=e(t(),1),o=()=>()=>{};function s(){let e=i()??!1;return a.useSyncExternalStore(o,()=>!0,()=>!1)&&e}function c(e){let t=new MutationObserver(e);return t.observe(document.documentElement,{attributes:!0,attributeFilter:[`class`]}),()=>t.disconnect()}function l(){return a.useSyncExternalStore(c,()=>document.documentElement.classList.contains(`dark`),()=>!1)}function u(e){return e instanceof Element&&!!e.closest(`a,button,input,textarea,select,label,summary,[role=button],[contenteditable=true],[data-background-ignore]`)}function d(e,t){let n=0,r=0,i=!1,a=e=>{let i=r?Math.min(e-r,100):16.7;r=e,t(i,e),n=requestAnimationFrame(a)},o=()=>{n||!i||document.hidden||(r=0,n=requestAnimationFrame(a))},s=()=>{cancelAnimationFrame(n),n=0},c=new IntersectionObserver(([e])=>{i=e.isIntersecting,i?o():s()});c.observe(e);let l=()=>document.hidden?s():o();return document.addEventListener(`visibilitychange`,l),()=>{s(),c.disconnect(),document.removeEventListener(`visibilitychange`,l)}}var f=`#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.,1.); }`;function p(e,t,n){let r=e.createShader(t);if(!r)throw Error(`createShader failed`);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r);throw e.deleteShader(r),Error(t??`shader compile failed`)}return r}function m(e,t,n=f){let r=e.createProgram();if(!r)throw Error(`createProgram failed`);let i=p(e,e.VERTEX_SHADER,n),a=p(e,e.FRAGMENT_SHADER,t);if(e.attachShader(r,i),e.attachShader(r,a),e.bindAttribLocation(r,0,`aPos`),e.linkProgram(r),e.deleteShader(i),e.deleteShader(a),!e.getProgramParameter(r,e.LINK_STATUS))throw Error(e.getProgramInfoLog(r)??`program link failed`);let o={},s=e.getProgramParameter(r,e.ACTIVE_UNIFORMS);for(let t=0;t<s;t++){let n=e.getActiveUniform(r,t);n&&(o[n.name.replace(/\[0\]$/,``)]=e.getUniformLocation(r,n.name))}return{program:r,uniforms:o}}function h(e){let t=e.createBuffer();return e.bindBuffer(e.ARRAY_BUFFER,t),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),t}function g(e,t,n,r=`half`){let i=e.createTexture(),a=e.createFramebuffer();if(!i||!a)throw Error(`target allocation failed`);return e.bindTexture(e.TEXTURE_2D,i),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),r===`half`?e.texImage2D(e.TEXTURE_2D,0,e.RGBA16F,t,n,0,e.RGBA,e.HALF_FLOAT,null):e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,t,n,0,e.RGBA,e.UNSIGNED_BYTE,null),e.bindFramebuffer(e.FRAMEBUFFER,a),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,i,0),e.viewport(0,0,t,n),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),{texture:i,framebuffer:a,width:t,height:n}}function _(e,t){e.deleteTexture(t.texture),e.deleteFramebuffer(t.framebuffer)}function v(e,t,n){let r=g(e,t,n),i=g(e,t,n);return{get read(){return r},get write(){return i},swap(){[r,i]=[i,r]},dispose(){_(e,r),_(e,i)}}}function y(e){let t=e.replace(`#`,``);return[0,2,4].map(e=>parseInt(t.slice(e,e+2),16)/255)}var b=n(),x={sumi:{label:`Sumi`,paper:{light:`#f2ece0`,dark:`#16140f`},pigments:[{light:`#1c1c22`,dark:`#ece2cc`}]},indigo:{label:`Indigo`,paper:{light:`#f7f6f2`,dark:`#0c0f16`},pigments:[{light:`#1d3672`,dark:`#a3b8ea`}]},sienna:{label:`Sienna & Ultramarine`,paper:{light:`#f1eadc`,dark:`#15120e`},pigments:[{light:`#b4532b`,dark:`#e39a6c`},{light:`#2b3d9a`,dark:`#9aaaf0`}]},night:{label:`Night`,paper:{light:`#0f0f11`,dark:`#0f0f11`},pigments:[{light:`#e6dac2`,dark:`#e6dac2`}],alwaysDark:!0}},S={sumi:`[--ink-paper:#f2ece0] [--ink-fg:#17150f] dark:[--ink-paper:#16140f] dark:[--ink-fg:#f1ece2]`,indigo:`[--ink-paper:#f7f6f2] [--ink-fg:#0f1525] dark:[--ink-paper:#0c0f16] dark:[--ink-fg:#e8edf7]`,sienna:`[--ink-paper:#f1eadc] [--ink-fg:#1a140e] dark:[--ink-paper:#15120e] dark:[--ink-fg:#f3ebdf]`,night:`[--ink-paper:#0f0f11] [--ink-fg:#f1ece2]`},C=`#version 300 es
precision highp float; precision highp sampler2D;
in vec2 vUv; out vec4 o;
float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),u.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*vn(p); p=p*2.03+17.1; a*=.5; } return s; }
`,w={paper:`${C}
  uniform vec2 uSize; uniform float uSeed;
  void main(){
    vec2 p = vUv*uSize + uSeed*31.;
    float tooth = fbm(p*0.045)*0.5 + fbm(p*0.16)*0.32 + vn(p*0.55)*0.18;
    float f = 0.;
    for(int k=0;k<4;k++){ float a = float(k)*1.7+uSeed; mat2 r = mat2(cos(a),-sin(a),sin(a),cos(a));
      vec2 q = r*p; f += smoothstep(.6,.92, vn(vec2(q.x*0.04, q.y*0.3))); }
    o = vec4(tooth, f*0.25, vn(p*0.21+3.7)*0.6 + vn(p*0.6)*0.4, 1.);
  }`,copy:`${C}
  uniform sampler2D uSrc;
  void main(){ o = texture(uSrc, vUv); }`,advect:`${C}
  uniform sampler2D uVel, uSrc; uniform vec2 uTexel; uniform float uDt, uDiss;
  void main(){ vec2 v = texture(uVel,vUv).xy; o = uDiss*texture(uSrc, vUv - uDt*v*uTexel); }`,drop:`${C}
  uniform sampler2D uSrc; uniform vec2 uPoint; uniform float uAspect, uRadius, uSeed; uniform vec4 uValue;
  void main(){
    vec2 d = vUv-uPoint; d.x*=uAspect; float r = length(d);
    float ang = atan(d.y,d.x);
    float wob = 1. + 0.28*(vn(vec2(ang*1.6+uSeed, uSeed))-0.5) + 0.14*(vn(vec2(ang*5.+uSeed*3., 1.))-0.5)
              + 0.10*(fbm(vUv*40.+uSeed)-0.5);
    float R = uRadius*wob;
    float g = smoothstep(R, R*0.5, r);
    float core = mix(1., smoothstep(R, 0., r)*1.4, 0.5);
    vec4 base = texture(uSrc,vUv);
    o = vec4(base.rgb + uValue.rgb*g*core, min(base.a + uValue.a*g, 1.5));
  }`,push:`${C}
  uniform sampler2D uSrc; uniform vec2 uPoint; uniform float uAspect, uRadius; uniform vec3 uValue;
  void main(){
    vec2 d = vUv-uPoint; d.x*=uAspect; float r = length(d);
    float g = exp(-r*r/(uRadius*uRadius));
    vec2 dir = r>0. ? d/r : vec2(0.); dir.x/=uAspect;
    o = texture(uSrc,vUv) + vec4(dir*uValue.x*g + uValue.yz*g, 0.,0.);
  }`,brush:`${C}
  uniform sampler2D uSrc; uniform vec2 uA, uB; uniform float uAspect, uRadius, uStrength, uComb, uSeed;
  void main(){
    vec4 base = texture(uSrc, vUv);
    vec2 k = vec2(uAspect, 1.);
    vec2 p = vUv*k, a = uA*k, b = uB*k, ab = b-a;
    float L = length(ab);
    vec2 dir = L > 1e-5 ? ab/L : vec2(1.,0.);
    float t = clamp(dot(p-a, dir), 0., L);
    float dist = length(p - (a + dir*t));
    float f = smoothstep(uRadius, uRadius*0.35, dist);
    if (f <= 0.) { o = base; return; }
    // Bristles are fixed in the page, so a stroke combs the same lines.
    float across = dot(p, vec2(-dir.y, dir.x)) / uRadius;
    float hair = smoothstep(0.25, 0.75, vn(vec2(across*6. + uSeed, 0.5)));
    vec2 back = (uB-uA) * min(1., uRadius*0.9/max(L,1e-5));
    vec4 s = texture(uSrc, vUv - back);
    float wet = smoothstep(0.03, 0.3, base.a);
    float carry = f*uStrength*(0.5 + 0.5*hair)*smoothstep(0.03, 0.3, s.a);
    vec3 rgb = mix(base.rgb, s.rgb, carry);
    rgb *= 1. + (hair - 0.5)*uComb*f*wet;
    float water = mix(base.a, s.a, carry*0.85);
    o = vec4(rgb, min(water, 1.5));
  }`,forces:`${C}
  uniform sampler2D uVel, uWet; uniform vec2 uTexel; uniform float uSpread, uTurb, uDt, uTime;
  void main(){
    vec2 v = texture(uVel,vUv).xy;
    vec2 e = uTexel*1.5;
    float wL = texture(uWet,vUv-vec2(e.x,0)).a, wR = texture(uWet,vUv+vec2(e.x,0)).a;
    float wB = texture(uWet,vUv-vec2(0,e.y)).a, wT = texture(uWet,vUv+vec2(0,e.y)).a;
    float w = texture(uWet,vUv).a;
    float wet = smoothstep(0.02,0.3,(wL+wR+wB+wT)*0.125 + w*0.5);
    // capillary: water pushes from wet toward drier paper, until it thins out
    v += -vec2(wR-wL, wT-wB)*uSpread*uDt*smoothstep(0.2,0.7,w);
    // a slow curl-noise drift inside wet areas
    vec2 q = vUv*vec2(uTexel.y/uTexel.x,1.)*3.2;
    float t = uTime*0.07;
    float n0 = fbm(q + vec2(0.,t)), nx = fbm(q + vec2(0.01,t)), ny = fbm(q + vec2(0.,t+0.01));
    v += vec2(ny-n0, -(nx-n0))/0.01*uTurb*uDt*wet;
    v *= mix(0.8, 0.982, wet);
    o = vec4(v,0.,1.);
  }`,curl:`${C}
  uniform sampler2D uVel; uniform vec2 uTexel;
  void main(){ float L=texture(uVel,vUv-vec2(uTexel.x,0)).y, R=texture(uVel,vUv+vec2(uTexel.x,0)).y;
    float B=texture(uVel,vUv-vec2(0,uTexel.y)).x, T=texture(uVel,vUv+vec2(0,uTexel.y)).x;
    o = vec4(0.5*(R-L-T+B),0.,0.,1.); }`,vorticity:`${C}
  uniform sampler2D uVel, uCurl; uniform vec2 uTexel; uniform float uCurlAmt, uDt;
  void main(){ float L=texture(uCurl,vUv-vec2(uTexel.x,0)).x, R=texture(uCurl,vUv+vec2(uTexel.x,0)).x;
    float B=texture(uCurl,vUv-vec2(0,uTexel.y)).x, T=texture(uCurl,vUv+vec2(0,uTexel.y)).x, C=texture(uCurl,vUv).x;
    vec2 f = 0.5*vec2(abs(T)-abs(B), abs(R)-abs(L)); f /= length(f)+1e-4; f *= uCurlAmt*C; f.y*=-1.;
    o = vec4(texture(uVel,vUv).xy + f*uDt, 0.,1.); }`,divergence:`${C}
  uniform sampler2D uVel; uniform vec2 uTexel;
  void main(){ float L=texture(uVel,vUv-vec2(uTexel.x,0)).x, R=texture(uVel,vUv+vec2(uTexel.x,0)).x;
    float B=texture(uVel,vUv-vec2(0,uTexel.y)).y, T=texture(uVel,vUv+vec2(0,uTexel.y)).y;
    o = vec4(0.5*(R-L+T-B),0.,0.,1.); }`,pressure:`${C}
  uniform sampler2D uP, uDiv; uniform vec2 uTexel;
  void main(){ float L=texture(uP,vUv-vec2(uTexel.x,0)).x, R=texture(uP,vUv+vec2(uTexel.x,0)).x;
    float B=texture(uP,vUv-vec2(0,uTexel.y)).x, T=texture(uP,vUv+vec2(0,uTexel.y)).x;
    o = vec4((L+R+B+T-texture(uDiv,vUv).x)*0.25,0.,0.,1.); }`,gradient:`${C}
  uniform sampler2D uP, uVel; uniform vec2 uTexel;
  void main(){ float L=texture(uP,vUv-vec2(uTexel.x,0)).x, R=texture(uP,vUv+vec2(uTexel.x,0)).x;
    float B=texture(uP,vUv-vec2(0,uTexel.y)).x, T=texture(uP,vUv+vec2(0,uTexel.y)).x;
    o = vec4(texture(uVel,vUv).xy - 0.5*vec2(R-L,T-B),0.,1.); }`,scale:`${C}
  uniform sampler2D uSrc; uniform float uK;
  void main(){ o = texture(uSrc,vUv)*uK; }`,diffuse:`${C}
  uniform sampler2D uWet, uPaper; uniform vec2 uTexel; uniform float uK;
  void main(){
    vec4 c = texture(uWet,vUv);
    vec3 dp = vec3(0.);
    vec2 off[8] = vec2[8](vec2(1,0),vec2(-1,0),vec2(0,1),vec2(0,-1),vec2(.7,.7),vec2(-.7,.7),vec2(.7,-.7),vec2(-.7,-.7));
    float cw = smoothstep(0.005, 0.06, c.a);
    for(int i=0;i<8;i++){
      vec2 uv = vUv + off[i]*uTexel;
      vec4 n = texture(uWet,uv);
      vec3 pp = texture(uPaper,uv).rgb;
      float nw = smoothstep(0.005, 0.06, n.a);
      float fiber = smoothstep(0.3, 0.7, pp.g + 0.5*pp.b);
      dp += (n.rgb - c.rgb) * cw*nw*(0.15 + fiber)*smoothstep(0.0, 0.4, min(c.a,n.a)) * uK;
    }
    o = vec4(max(c.rgb + dp, 0.), c.a);
  }`,dry:`${C}
  uniform sampler2D uWet, uStain, uPaper; uniform vec2 uTexel; uniform float uDt, uEvap, uSettle, uRim, uGran, uFadeAfter, uFadeRate, uAgeStep;
  uniform int uOut;
  void main(){
    vec4 wet = texture(uWet,vUv);
    float w = wet.a;
    float wb = 0.;
    // a dense kernel: a sparse one aliases and draws grid steps into the rims
    for(int i=-2;i<=2;i++) for(int j=-2;j<=2;j++) wb += texture(uWet,vUv+vec2(i,j)*uTexel*2.5).a;
    wb /= 25.;
    float rim = clamp((w - wb)*uRim, 0., 1.) * smoothstep(0.0, 0.08, w);
    vec3 pp = texture(uPaper,vUv).rgb;
    float gran = mix(1., 0.3 + 1.5*smoothstep(0.25,0.75,1.-pp.r), uGran);
    float thin = smoothstep(0.25, 0.0, w);
    float settle = clamp(uSettle*uDt*(0.05 + rim*0.8 + thin*1.2)*gran, 0., 1.);
    settle = mix(1., settle, smoothstep(0.0, 0.01, w));
    vec3 moved = wet.rgb*settle;
    if(uOut==0){ o = vec4(wet.rgb - moved, max(w - uEvap*uDt*(0.6 + 1.6*thin), 0.)); }
    else {
      // Settled ink keeps its age (seconds since it dried) in alpha. Once it
      // is older than uFadeAfter it fades out; fresh paint resets the age.
      vec4 st = texture(uStain,vUv);
      float fresh = step(0.02, w) + step(0.003, moved.r + moved.g + moved.b);
      float age = fresh > 0. ? 0. : min(st.a + uAgeStep, 1000.);
      float keep = (uFadeAfter >= 0. && age > uFadeAfter) ? exp(-uDt*uFadeRate) : 1.;
      o = vec4(st.rgb*keep + moved, age);
    }
  }`,display:`${C}
  uniform sampler2D uWet, uStain, uPaper; uniform vec2 uTexel, uRes;
  uniform vec3 uPaperCol, uAbs0, uAbs1, uAbs2, uCol0, uCol1, uCol2, uStr;
  uniform float uDark, uTime, uGrain;
  void main(){
    vec4 wet = texture(uWet,vUv);
    vec3 P = texture(uStain,vUv).rgb + wet.rgb*0.9;
    vec3 pp = texture(uPaper,vUv).rgb;
    float hL = texture(uPaper,vUv-vec2(uTexel.x,0)).r, hR = texture(uPaper,vUv+vec2(uTexel.x,0)).r;
    float hB = texture(uPaper,vUv-vec2(0,uTexel.y)).r, hT = texture(uPaper,vUv+vec2(0,uTexel.y)).r;
    vec3 n = normalize(vec3(hL-hR, hB-hT, 0.09));
    float light = dot(n, normalize(vec3(-0.45,0.55,0.7)));
    float gran = 0.85 + 0.3*(1.-pp.r);
    float w = smoothstep(0.04,0.5,wet.a);
    vec3 col;
    if(uDark < 0.5){
      vec3 A = uAbs0*P.x + uAbs1*P.y + uAbs2*P.z;
      A = A / (1. + A*0.22) * gran;
      col = uPaperCol * exp(-A);
      col *= 0.975 + 0.04*light - 0.02*pp.g;
      col *= 1. - 0.035*w;
      col += 0.03*w*pow(max(light,0.),8.);
    } else {
      vec3 amt = P*uStr;
      float m = amt.x + amt.y + amt.z;
      vec3 tint = (uCol0*amt.x + uCol1*amt.y + uCol2*amt.z) / max(m, 1e-4);
      m = m / (1. + m*0.22) * gran;
      float cov = 1. - exp(-m*0.8);
      col = uPaperCol * (0.94 + 0.09*light - 0.03*pp.g);
      col = mix(col, tint*(0.88+0.16*light), cov);
      col += 0.02*w*pow(max(light,0.),8.);
    }
    col += (h21(vUv*uRes + fract(uTime*7.)*91.) - 0.5)*uGrain;
    o = vec4(col,1.);
  }`},T={simRes:360,dyeRes:540,spread:300,turb:1.2,curl:10,burst:1.6,jet:9,evap:.05,settle:.5,rim:22,gran:.65,diffuse:.12,grain:.016,brush:.9,brushRadius:.065,comb:.32,brushPush:900},E=e=>y(e).map(e=>-Math.log(Math.max(e,.02)));function D(e,t){let n=e.getContext(`webgl2`,{alpha:!1,antialias:!1,depth:!1,stencil:!1,powerPreference:`high-performance`});if(!n||!n.getExtension(`EXT_color_buffer_float`)&&!n.getExtension(`EXT_color_buffer_half_float`))return null;let r;try{r=Object.fromEntries(Object.keys(w).map(e=>[e,m(n,w[e])]))}catch{return null}let i=h(n),a=1,o=1,s=1,c=1,l=1,u=1,d={w:1,h:1},f={w:1,h:1};function p(){a=Math.max(1,e.clientWidth),o=Math.max(1,e.clientHeight);let t=Math.min(window.devicePixelRatio||1,1.5);s=Math.round(a*t),c=Math.round(o*t),e.width=s,e.height=c;let n=Math.min(a,o),r=e=>{let t=Math.min(e/n,1);return{w:Math.max(2,Math.round(a*t)),h:Math.max(2,Math.round(o*t))}};d=r(T.simRes),f=r(T.dyeRes),l=a/o,u=n/o}function b(e,t,i){let{program:a,uniforms:o}=r[t];n.useProgram(a);let l=0;i(o,(e,t)=>{n.activeTexture(n.TEXTURE0+l),n.bindTexture(n.TEXTURE_2D,t),n.uniform1i(o[e],l++)}),n.bindFramebuffer(n.FRAMEBUFFER,e?e.framebuffer:null),n.viewport(0,0,e?e.width:s,e?e.height:c),n.drawArrays(n.TRIANGLES,0,3)}function x(e){p();let r={vel:v(n,d.w,d.h),prs:v(n,d.w,d.h),wet:v(n,f.w,f.h),stain:v(n,f.w,f.h),div:g(n,d.w,d.h),curl:g(n,d.w,d.h),paper:g(n,f.w,f.h),paperHi:g(n,Math.round(a),Math.round(o),`byte`)};if(e){for(let t of[`vel`,`wet`,`stain`])b(r[t].read,`copy`,(n,r)=>r(`uSrc`,e[t].read.texture));S(e)}for(let e of[r.paper,r.paperHi])b(e,`paper`,e=>{n.uniform2f(e.uSize,a,o),n.uniform1f(e.uSeed,t)});return r}function S(e){e.vel.dispose(),e.prs.dispose(),e.wet.dispose(),e.stain.dispose();for(let t of[e.div,e.curl,e.paper,e.paperHi])_(n,t)}let C=x(),D=Math.floor(t*1e3)||1,O=()=>(D=D*16807%0x7fffffff)/0x7fffffff,k=t,A=[];function j(e,t,r,i,a,o){b(C.vel.write,`push`,(s,c)=>{c(`uSrc`,C.vel.read.texture),n.uniform2f(s.uPoint,e,t),n.uniform1f(s.uAspect,l),n.uniform1f(s.uRadius,r*u),n.uniform3f(s.uValue,i,a,o)}),C.vel.swap()}function M(e,t,r,i,a){b(C.wet.write,`drop`,(o,s)=>{s(`uSrc`,C.wet.read.texture),n.uniform2f(o.uPoint,e,t),n.uniform1f(o.uAspect,l),n.uniform1f(o.uRadius,r*u),n.uniform1f(o.uSeed,k+=7.31),n.uniform4f(o.uValue,i[0],i[1],i[2],a)}),C.wet.swap()}let N=1,P={after:45,rate:.5},F=0,I={paper:[1,1,1],abs:[[0,0,0],[0,0,0],[0,0,0]],col:[[1,1,1],[1,1,1],[1,1,1]],str:[1,1,1],dark:!1};return{drop(e,t,{r:n=.06,pigment:r=0,water:i=.9,amount:a=1}={}){let o=[0,0,0];o[r%N]=a,M(e,t,n,o,i),A.push([e,t,n*1.3,T.burst,0,0]);let s=3+Math.floor(O()*3);for(let r=0;r<s;r++){let r=O()*Math.PI*2,i=n*(.5+O()*.6),a=T.jet*(.5+O());A.push([e+Math.cos(r)*i*u/l,t+Math.sin(r)*i*u,n*.45,0,Math.cos(r+.6)*a,Math.sin(r+.6)*a])}},wash(e,t,n,r){M(e,t,n,[0,0,0],r)},brush(e,r,i,a){let o=i-e,s=a-r;if(o*o+s*s<1e-8)return;let c=T.brushRadius*u;b(C.wet.write,`brush`,(o,s)=>{s(`uSrc`,C.wet.read.texture),n.uniform2f(o.uA,e,r),n.uniform2f(o.uB,i,a),n.uniform1f(o.uAspect,l),n.uniform1f(o.uRadius,c),n.uniform1f(o.uStrength,T.brush),n.uniform1f(o.uComb,T.comb),n.uniform1f(o.uSeed,t)}),C.wet.swap(),A.push([(e+i)/2,(r+a)/2,T.brushRadius,0,o*T.brushPush,s*T.brushPush])},step(e){e=Math.min(e,1/30),F+=e;let r=Math.floor(F*2)===Math.floor((F-e)*2)?0:.5,i=[1/d.w,1/d.h],a=[1/f.w,1/f.h];b(C.curl,`curl`,(e,t)=>{t(`uVel`,C.vel.read.texture),n.uniform2f(e.uTexel,...i)}),b(C.vel.write,`vorticity`,(t,r)=>{r(`uVel`,C.vel.read.texture),r(`uCurl`,C.curl.texture),n.uniform2f(t.uTexel,...i),n.uniform1f(t.uCurlAmt,T.curl),n.uniform1f(t.uDt,e)}),C.vel.swap(),b(C.div,`divergence`,(e,t)=>{t(`uVel`,C.vel.read.texture),n.uniform2f(e.uTexel,...i)}),b(C.prs.write,`scale`,(e,t)=>{t(`uSrc`,C.prs.read.texture),n.uniform1f(e.uK,.8)}),C.prs.swap();for(let e=0;e<16;e++)b(C.prs.write,`pressure`,(e,t)=>{t(`uP`,C.prs.read.texture),t(`uDiv`,C.div.texture),n.uniform2f(e.uTexel,...i)}),C.prs.swap();b(C.vel.write,`gradient`,(e,t)=>{t(`uP`,C.prs.read.texture),t(`uVel`,C.vel.read.texture),n.uniform2f(e.uTexel,...i)}),C.vel.swap(),b(C.vel.write,`forces`,(r,a)=>{a(`uVel`,C.vel.read.texture),a(`uWet`,C.wet.read.texture),n.uniform2f(r.uTexel,...i),n.uniform1f(r.uSpread,T.spread),n.uniform1f(r.uTurb,T.turb),n.uniform1f(r.uDt,e),n.uniform1f(r.uTime,F+t)}),C.vel.swap();for(let e of A)j(...e);A.length=0,b(C.vel.write,`advect`,(t,r)=>{r(`uVel`,C.vel.read.texture),r(`uSrc`,C.vel.read.texture),n.uniform2f(t.uTexel,...i),n.uniform1f(t.uDt,e),n.uniform1f(t.uDiss,.996)}),C.vel.swap(),b(C.wet.write,`advect`,(t,r)=>{r(`uVel`,C.vel.read.texture),r(`uSrc`,C.wet.read.texture),n.uniform2f(t.uTexel,...i),n.uniform1f(t.uDt,e),n.uniform1f(t.uDiss,1)}),C.wet.swap();for(let e=0;e<2;e++)b(C.wet.write,`diffuse`,(e,t)=>{t(`uWet`,C.wet.read.texture),t(`uPaper`,C.paper.texture),n.uniform2f(e.uTexel,...a),n.uniform1f(e.uK,T.diffuse)}),C.wet.swap();for(let t of[1,0])b(t?C.stain.write:C.wet.write,`dry`,(i,o)=>{o(`uWet`,C.wet.read.texture),o(`uStain`,C.stain.read.texture),o(`uPaper`,C.paper.texture),n.uniform2f(i.uTexel,...a),n.uniform1f(i.uDt,e),n.uniform1f(i.uEvap,T.evap),n.uniform1f(i.uSettle,T.settle),n.uniform1f(i.uFadeAfter,P.after),n.uniform1f(i.uFadeRate,P.rate),n.uniform1f(i.uAgeStep,r),n.uniform1f(i.uRim,T.rim),n.uniform1f(i.uGran,T.gran),n.uniform1i(i.uOut,t)});C.stain.swap(),C.wet.swap()},render(){let e=I;b(null,`display`,(t,r)=>{r(`uWet`,C.wet.read.texture),r(`uStain`,C.stain.read.texture),r(`uPaper`,C.paperHi.texture),n.uniform2f(t.uTexel,1/C.paperHi.width,1/C.paperHi.height),n.uniform2f(t.uRes,s,c),n.uniform3fv(t.uPaperCol,e.paper),n.uniform3fv(t.uAbs0,e.abs[0]),n.uniform3fv(t.uAbs1,e.abs[1]),n.uniform3fv(t.uAbs2,e.abs[2]),n.uniform3fv(t.uCol0,e.col[0]),n.uniform3fv(t.uCol1,e.col[1]),n.uniform3fv(t.uCol2,e.col[2]),n.uniform3fv(t.uStr,e.str),n.uniform1f(t.uDark,+!!e.dark),n.uniform1f(t.uTime,F),n.uniform1f(t.uGrain,T.grain)})},setFade(e){P.after=e===!1?-1:Math.max(0,e),P.rate=3/Math.min(6,Math.max(1.5,(e||0)*.25))},setPalette(e,t){let n=!!(e.alwaysDark||t);N=e.pigments.length,I.dark=n,I.paper=y(n?e.paper.dark:e.paper.light);for(let t=0;t<3;t++){let n=e.pigments[t%e.pigments.length],r=E(n.light);I.abs[t]=r,I.col[t]=y(n.dark),I.str[t]=2.6}},resize(){let t=Math.abs(e.clientWidth-a)/a,n=Math.abs(e.clientHeight-o)/o;return t<.02&&n<.02?!1:(C=x(C),!0)},dispose(){S(C);for(let{program:e}of Object.values(r))n.deleteProgram(e);n.deleteBuffer(i)}}}var O=[{x:.72,y:.62,r:.17,pigment:0,amount:1.1},{x:.88,y:.36,r:.12,pigment:1,amount:1.3},{x:.6,y:.3,r:.08,pigment:0,amount:1.6},{x:.82,y:.8,r:.07,pigment:1,amount:1.4}];function k(e,t,n){return n?{x:.15+(e.x-.55)*1.9,y:.55+e.y*.4}:t===`left`?{x:1-e.x,y:e.y}:t===`center`?{x:.5+(e.x-.74)*1.1,y:e.y}:e}function A({variant:e=`sumi`,side:t=`right`,interactive:n=!0,autoplay:i=!0,fadeAfter:o=45,className:c,children:f,...p}){let m=a.useRef(null),h=a.useRef(null),g=a.useRef(null),_=s(),v=l(),y=x[e],C=a.useRef({palette:y,dark:v}),w=a.useRef(o);return a.useEffect(()=>{w.current=o,g.current?.setFade(o)},[o]),a.useEffect(()=>{C.current={palette:y,dark:v};let e=g.current;e&&(e.setPalette(y,v),e.render())},[y,v]),a.useEffect(()=>{let e=m.current,r=h.current;if(!e||!r)return;let a=D(r,Math.random()*50);if(!a)return;g.current=a,a.setPalette(C.current.palette,C.current.dark),a.setFade(w.current);let o=()=>r.clientWidth<640,s=0,c=[],l=e=>{let n=o(),r=k({x:.76,y:.56},t,n);a.wash(r.x,r.y,.36,.55),O.forEach((r,i)=>{let o=k(r,t,n),s=()=>a.drop(o.x,o.y,{r:r.r,pigment:r.pigment,amount:r.amount});e?s():c.push(window.setTimeout(s,250+i*700))})},f=()=>r.setAttribute(`data-ready`,``);if(_){if(i){l(!0);for(let e=0;e<600;e++)a.step(1/60)}a.render(),f();let e=new ResizeObserver(()=>{a.resize()&&a.render()});return e.observe(r),()=>{e.disconnect(),a.dispose(),g.current=null}}i&&l(!1);let p=e=>{let t=r.getBoundingClientRect();return[(e.clientX-t.left)/t.width,1-(e.clientY-t.top)/t.height]},v=performance.now(),y=null,b=null,x=e=>{if(e.button!==0||u(e.target))return;let[t,n]=p(e);a.drop(t,n,{r:.05+Math.random()*.06,pigment:s++,amount:1.1+Math.random()*.5}),v=performance.now()},S=e=>{if(e.pointerType===`touch`)return;let t=p(e);y||=t,b=t,v=performance.now()},T=()=>{y=null,b=null};n&&(e.addEventListener(`pointerdown`,x),e.addEventListener(`pointermove`,S),e.addEventListener(`pointerleave`,T));let E=0,A=performance.now(),j=d(r,(e,n)=>{if(y&&b&&(a.brush(y[0],y[1],b[0],b[1]),y=b),i&&n-A>1e4&&n-v>6e3){let e=k({x:.6+Math.random()*.32,y:.2+Math.random()*.65},t,o());a.drop(e.x,e.y,{r:.04+Math.random()*.04,pigment:s++,amount:1.2}),A=n}E+=e;let r=0;for(;E>=1e3/60&&r<2;)a.step(1/60),E-=1e3/60,r++;r===2&&(E=0),a.render(),f()}),M=new ResizeObserver(()=>{a.resize()&&a.render()});M.observe(r);let N=e=>{e.preventDefault(),j()};return r.addEventListener(`webglcontextlost`,N),()=>{c.forEach(clearTimeout),j(),M.disconnect(),r.removeEventListener(`webglcontextlost`,N),e.removeEventListener(`pointerdown`,x),e.removeEventListener(`pointermove`,S),e.removeEventListener(`pointerleave`,T),a.dispose(),g.current=null}},[_,t,n,i]),(0,b.jsxs)(`div`,{ref:m,className:r(`relative isolate overflow-hidden bg-[var(--ink-paper)] text-[var(--ink-fg)] select-none`,S[e],c),...p,children:[(0,b.jsx)(`canvas`,{ref:h,"aria-hidden":!0,className:`pointer-events-none absolute inset-0 -z-10 size-full opacity-0 transition-opacity duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] data-[ready]:opacity-100`}),f]})}export{A as InkBackground,x as inkPalettes};