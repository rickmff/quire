import{a as e,i as t,n,r,t as i}from"./ShaderSurface-DjQw_LIl.js";import{t as a}from"./index-TChZs6Gr.js";var o=48,s=24,c=12,l=5,u=new Map;function d(e){let t=JSON.stringify(e),n=u.get(t);return n||(n=`url("data:image/bmp;base64,${p(f(e))}") center / 100% 100% no-repeat, ${e.base}`,u.size>32&&u.clear(),u.set(t,n)),n}function f(t){let n=(t.colors.length>1?t.colors:[t.colors[0]??`#808080`,t.colors[0]??`#808080`]).map(e),r=g(e(t.base)),i=(c+t.seed*37.1)*.09,a=o/s,u=Math.min(t.layers,l),d=new Uint8Array(3456);for(let e=0;e<o;e++){let c=(e+.5)/o*a/t.stretch,f=[];for(let e=0;e<l&&!(e>=u);e++){let r=t.height-.07*e+t.waviness*.11*S(c*.8+e*3.1,i,e)+t.waviness*.04*S(c*2.2,i*1.6,e+4),a=.55+.45*S(c*1.1+e*5,i*.8,e+2),o=c*.16+i*.35+e*.33+.08*S(c*.7,i,e+9);f.push({y0:r,strength:a*Math.max(1-.18*e,.25),light:g(h(n,o)),reach:t.spread*(.75+.3*e)})}for(let n=0;n<s;n++){let i=(n+.5)/s,a=[0,0,0],c=[...r];for(let e of f){let n=i-e.y0,r=Math.exp(n>0?-n/e.reach:-n*n*90)*e.strength,o=m(r*t.intensity*.9,0,1);for(let t=0;t<3;t++)a[t]+=e.light[t]*r,c[t]+=(e.light[t]-c[t])*o}let l=t.dark?r.map((e,n)=>e+a[n]*t.intensity*.7):c,u=(n*o+e)*3;for(let e=0;e<3;e++)d[u+e]=Math.round(_(l[e])*255)}}return d}function p(e){let t=3510,n=new Uint8Array(t),r=new DataView(n.buffer);n.set([66,77]),r.setUint32(2,t,!0),r.setUint32(10,54,!0),r.setUint32(14,40,!0),r.setInt32(18,o,!0),r.setInt32(22,s,!0),r.setUint16(26,1,!0),r.setUint16(28,24,!0),r.setUint32(34,3456,!0);for(let t=0;t<s;t++)for(let r=0;r<o;r++){let i=(t*o+r)*3,a=54+t*144+r*3;n[a]=e[i+2],n[a+1]=e[i+1],n[a+2]=e[i]}let i=``;for(let e=0;e<n.length;e++)i+=String.fromCharCode(n[e]);return btoa(i)}var m=(e,t,n)=>Math.min(n,Math.max(t,e));function h(e,t){let n=e.length,r=(t-Math.floor(t))*n,i=Math.floor(r),a=i+1>=n?0:i+1,o=r-i,s=o*o*(3-2*o);return e[i].map((t,n)=>t+(e[a][n]-t)*s)}function g([e,t,n]){let r=e+.3963377774*t+.2158037573*n,i=e-.1055613458*t-.0638541728*n,a=e-.0894841775*t-1.291485548*n;return r=r*r*r,i=i*i*i,a=a*a*a,[4.0767416621*r-3.3077115913*i+.2309699292*a,-1.2684380046*r+2.6097574011*i-.3413193965*a,-.0041960863*r-.7034186147*i+1.707614701*a]}function _(e){return e=m(e,0,1),e<.0031308?e*12.92:1.055*e**(1/2.4)-.055}var v=Math.fround,y=v(1/289),b=e=>e-Math.floor(v(e*y))*289,x=e=>b((e*34+1)*e);function S(e,t,n){let r=1/6,i=1/3,a=(e+t+n)*i,o=Math.floor(e+a),s=Math.floor(t+a),c=Math.floor(n+a),l=(o+s+c)*r,u=[e-o+l,t-s+l,n-c+l],d=[+(u[0]>=u[1]),+(u[1]>=u[2]),+(u[2]>=u[0])],f=[1-d[0],1-d[1],1-d[2]],p=[Math.min(d[0],f[2]),Math.min(d[1],f[0]),Math.min(d[2],f[1])],m=[Math.max(d[0],f[2]),Math.max(d[1],f[0]),Math.max(d[2],f[1])],h=[u[0]-p[0]+r,u[1]-p[1]+r,u[2]-p[2]+r],g=[u[0]-m[0]+i,u[1]-m[1]+i,u[2]-m[2]+i],_=[u[0]-.5,u[1]-.5,u[2]-.5];o=b(o),s=b(s),c=b(c);let y=[[0,0,0],[p[0],p[1],p[2]],[m[0],m[1],m[2]],[1,1,1]].map(([e,t,n])=>x(x(x(c+n)+s+t)+o+e)),S=v(.142857142857),C=[v(S*2),v(S*.5-1),S],w=[u,h,g,_],T=0;for(let e=0;e<4;e++){let t=y[e]-49*Math.floor(v(v(y[e]*C[2])*C[2])),n=Math.floor(v(t*C[2])),r=Math.floor(t-7*n),i=n*C[0]+C[1],a=r*C[0]+C[1],o=1-Math.abs(i)-Math.abs(a),s=o<=0?-1:0,c=i+(Math.floor(i)*2+1)*s,l=a+(Math.floor(a)*2+1)*s,u=o,d=1.79284291400159-.85373472095314*(c*c+l*l+u*u);c*=d,l*=d,u*=d;let f=w[e],p=Math.max(.6-(f[0]*f[0]+f[1]*f[1]+f[2]*f[2]),0);T+=p*p*p*p*(c*f[0]+l*f[1]+u*f[2])}return 42*T}var C=a(),w=5,T=`
uniform float u_intensity; // brightness of the light
uniform float u_intensityDark; // the same on dark pages
uniform float u_height;    // where the curtains sit, 0 bottom .. 1 top
uniform float u_spread;    // how far the light reaches upward
uniform float u_layers;    // number of curtains, 1..5
uniform float u_wave;      // how much the curtains undulate
uniform float u_stretch;   // horizontal size of the waves
uniform float u_lean;      // how strongly the curtains lean toward the pointer
`,E=`
vec4 curtain(float fx, float fi) {
  float aspect = u_res.x / u_res.y;
  float x = fx / u_res.x * aspect;
  float t = u_time * 0.09;

  vec2 m = u_pointer / u_res;
  float near = exp(-pow((x - m.x * aspect) * 2.4, 2.0)) * u_pointerAmt * u_lean;
  float xs = x / u_stretch;

  float y0 = u_height - 0.07 * fi
    + u_wave * 0.11 * snoise(vec3(xs * 0.8 + fi * 3.1, t, fi))
    + u_wave * 0.04 * snoise(vec3(xs * 2.2, t * 1.6, fi + 4.0));
  y0 = mix(y0, m.y - 0.06, near * 0.3);

  // broad folds along the curtain, wide enough to read as one blended sheet
  float fold = 0.55 + 0.45 * snoise(vec3(xs * 1.1 + fi * 5.0, t * 0.8, fi + 2.0));
  float hue = xs * 0.16 + t * 0.35 + fi * 0.33 + 0.08 * snoise(vec3(xs * 0.7, t, fi + 9.0));
  return vec4(y0, fold * max(1.0 - 0.18 * fi, 0.25), hue, near);
}
`,D=`
vec3 shade(vec2 frag) {
  vec2 uv = frag / u_res;
  float intensity = mix(u_intensity, u_intensityDark, u_dark);
  vec3 bg = oklabToLinear(u_bg);
  vec3 glow = vec3(0.0);
  vec3 ink = bg;
  float near = 0.0;

  for (int i = 0; i < ${w}; i++) {
    float fi = float(i);
    if (fi >= u_layers) break;
    vec4 c = curtainAt(frag, i);
    near = c.w;
    float d = uv.y - c.x;
    float reach = u_spread * (0.75 + 0.3 * fi);
    float a = (d > 0.0 ? exp(-d / reach) : exp(-d * d * 90.0)) * c.y;

    vec3 light = oklabToLinear(paletteLoop(c.z));
    glow += light * a;
    ink = mix(ink, light, clamp(a * intensity * 0.9, 0.0, 1.0));
  }
  glow *= intensity * 0.7 * (1.0 + 0.6 * near);
  return mix(ink, bg + glow, u_dark);
}
`,O=`
${T}
uniform highp sampler2D u_tex; // the pre-pass: one row per curtain, one texel per column
vec4 curtainAt(vec2 frag, int i) { return texelFetch(u_tex, ivec2(int(frag.x), i), 0); }
${D}
`,k=`
${T}
${E}
vec4 curtainAt(vec2 frag, int i) { return curtain(frag.x, float(i)); }
${D}
`,A=`#version 300 es
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_pointer;
uniform float u_pointerAmt;
${T}
out vec4 outColor;
${i}
${E}
void main() {
  float fi = floor(gl_FragCoord.y);
  outColor = fi < u_layers ? curtain(gl_FragCoord.x, fi) : vec4(0.0);
}
`;function j(e){if(!e.getExtension(`EXT_color_buffer_float`))return null;let n=t(e,r,A);if(!n)return null;let i=e.createTexture(),a=e.createFramebuffer(),o=0,s=t=>{o=t,e.bindTexture(e.TEXTURE_2D,i),e.texImage2D(e.TEXTURE_2D,0,e.RGBA32F,t,w,0,e.RGBA,e.FLOAT,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.bindFramebuffer(e.FRAMEBUFFER,a),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,i,0)};s(1);let c=e.checkFramebufferStatus(e.FRAMEBUFFER)===e.FRAMEBUFFER_COMPLETE;if(e.bindFramebuffer(e.FRAMEBUFFER,null),!c)return e.deleteProgram(n),e.deleteTexture(i),e.deleteFramebuffer(a),null;let l=new Map,u=t=>(l.has(t)||l.set(t,e.getUniformLocation(n,t)),l.get(t));return{render(e,t){t.width!==o&&s(t.width),e.bindFramebuffer(e.FRAMEBUFFER,a),e.viewport(0,0,o,w),e.useProgram(n),e.uniform2f(u(`u_res`),t.width,t.height),e.uniform1f(u(`u_time`),t.time),e.uniform2f(u(`u_pointer`),t.pointer[0],t.pointer[1]),e.uniform1f(u(`u_pointerAmt`),t.pointerAmt);for(let[n,r]of Object.entries(t.uniforms))e.uniform1f(u(n),r);return e.drawArrays(e.TRIANGLES,0,3),i},dispose(e){e.deleteProgram(n),e.deleteTexture(i),e.deleteFramebuffer(a)}}}var M=[`#2dd4a7`,`#36c3b4`,`#6d74f0`,`#41cf9b`];function N({colors:e=M,speed:t=1,animate:r=!0,interactive:i=!0,grain:a=.02,intensity:o=1,intensityDark:s,height:c=.45,spread:l=.2,layers:u=3,waviness:f=1,stretch:p=1,lean:m=1,background:h=``,backgroundDark:g=``,seed:_=0,...v}){return(0,C.jsx)(n,{shader:O,uniforms:{u_intensity:o,u_intensityDark:s??o,u_height:c,u_spread:l,u_layers:u,u_wave:f,u_stretch:p,u_lean:m},colors:e,speed:t,animate:r,interactive:i,grain:a,seed:_,background:h,backgroundDark:g,prepass:j,plainShader:k,fallback:(t,n)=>d({colors:e,base:n,dark:t,intensity:t?s??o:o,height:c,spread:l,layers:u,waviness:f,stretch:p,seed:_}),...v})}function P(){return(0,C.jsx)(N,{className:`h-[440px] w-[720px] max-w-full rounded-2xl`})}export{P as default};