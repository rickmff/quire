import{a as e,c as t,t as n}from"./index-BxT87NQL.js";import{t as r}from"./utils-D0T3A-kS.js";var i=t(e(),1),a=n(),o={horizon:`
    float r = max(min(size.x * 0.42, size.y * 0.8), 90.0);
    vec2 d = (p - vec2(0.5 * size.x, -0.15 * r)) / vec2(1.25 * r, r);
    float wobble = fbm(vec2(atan(d.y, d.x) * 1.8, t * 0.04)) - 0.5;
    float rim = length(d) * (1.0 + 0.14 * wobble);
    float sun = exp(-3.4 * max(rim - 0.42, 0.0)) * 0.78;
    float h = p.y / r;
    float drift = (fbm(vec2(p.x / 320.0, t * 0.03)) - 0.5) * 2.4;
    float band = 0.5 + 0.5 * sin(log(1.0 + 7.0 * h) * 8.0 - t * 0.45 + drift);
    float haze = smoothstep(0.25, 0.95, band) * exp(-1.9 * h) * 0.5;
    float ground = exp(-p.y / 22.0) * 0.32;
    float sides = smoothstep(0.0, 0.2, p.x / size.x) * smoothstep(1.0, 0.8, p.x / size.x);
    return (sun * (1.0 + haze) + haze * 0.35 + ground) * sides * (1.0 + 0.04 * sin(t * 0.4));
  `,glow:`
    vec2 c = 0.5 * size + vec2(sin(t * 0.21), cos(t * 0.17)) * 0.05 * size;
    float r = 0.5 * min(size.x, size.y);
    float d = length(p - c) / r;
    float n = fbm(p / 170.0 + vec2(t * 0.05, -t * 0.04));
    return exp(-1.7 * d * d) * (0.75 + 0.45 * n) + 0.12 * n * exp(-d);
  `,aurora:`
    float sway = fbm(vec2(p.x / 600.0, t * 0.05));
    float d = p.y / size.y - (0.45 + 0.35 * (sway - 0.5));
    float curtain = d > 0.0 ? exp(-d * 4.0) : exp(d * 22.0);
    float rays = fbm(vec2(p.x / 70.0 + sway * 6.0, p.y / 900.0 - t * 0.08));
    float shimmer = fbm(vec2(p.x / 40.0 - t * 0.05, 3.0));
    return curtain * (0.25 + 0.75 * smoothstep(0.3, 0.75, rays)) * (0.6 + 0.5 * shimmer);
  `,waves:`
    vec2 q = p / 32.0;
    float warp = fbm(q * 0.09 + vec2(t * 0.035, t * 0.02));
    float s = 0.5 + 0.5 * sin(q.x * 0.9 + q.y * 0.6 + warp * 5.0 - t * 0.4);
    float crest = s * s * s * s;
    return crest * (0.5 + 0.5 * p.y / size.y) + 0.12 * warp;
  `,clouds:`
    float n = fbm(p / 210.0 + vec2(t * 0.03, t * 0.012));
    float m = fbm(p / 80.0 - vec2(t * 0.02, 0.0));
    return smoothstep(0.28, 0.78, n) * (0.7 + 0.5 * m);
  `},s=`#version 300 es
void main() {
  vec2 corner = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
  gl_Position = vec4(corner, 0.0, 1.0);
}`,c=`#version 300 es
precision highp float;
uniform vec2 uSize;
uniform vec2 uView;
uniform float uTime;
out vec4 outColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  mat2 turn = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    sum += amp * noise(p);
    p = turn * p * 2.0 + 11.7;
    amp *= 0.5;
  }
  return sum;
}
`,l=`
void main() {
  vec2 p = gl_FragCoord.xy / uView * uSize;
  float v = pattern(p, uSize, uTime);
  outColor = vec4(clamp(v, 0.0, 1.0), 0.0, 0.0, 1.0);
}`,u=`
uniform sampler2D uMedia;
uniform vec2 uMediaSize;

float pattern(vec2 p, vec2 size, float t) {
  float scale = max(size.x / uMediaSize.x, size.y / uMediaSize.y);
  vec2 uv = (p - 0.5 * size) / (uMediaSize * scale) + 0.5;
  vec4 c = texture(uMedia, vec2(uv.x, 1.0 - uv.y));
  return dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
}
`,d=`#version 300 es
precision highp float;
uniform sampler2D uField;
uniform vec2 uView;
uniform vec4 uLow;
uniform vec4 uMid;
uniform vec4 uHigh;
uniform float uIntensity;
uniform vec3 uPointer;
uniform float uDot;
out vec4 outColor;

// 8x8 ordered-dither threshold, built from the 2x2 matrix [0 2; 3 1]. The
// lowest bit of the cell position carries the largest weight.
float threshold(vec2 cell) {
  vec2 c = floor(cell);
  float sum = 0.0;
  float weight = 16.0;
  for (int i = 0; i < 3; i++) {
    vec2 b = mod(c, 2.0);
    sum += weight * mod(2.0 * b.x + 3.0 * b.y, 4.0);
    c = floor(c * 0.5);
    weight *= 0.25;
  }
  return (sum + 0.5) / 64.0;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uView;
  float base = texture(uField, uv).r;
  float halo = textureLod(uField, uv, 1.0).r * 0.45
    + textureLod(uField, uv, 2.2).r * 0.35
    + textureLod(uField, uv, 3.4).r * 0.2;
  float v = base + 0.55 * halo;
  float over = max(v - 0.85, 0.0);
  v = min(v, 0.85) + over / (1.0 + 4.0 * over);
  v = clamp(v * uIntensity, 0.0, 1.0);
  // The pointer glow comes after intensity, so it shows on quiet fields too.
  vec2 away = gl_FragCoord.xy * uDot - uPointer.xy;
  v = min(v + uPointer.z * exp(-dot(away, away) / 28000.0) * (0.35 + 0.5 * v), 1.0);
  // Drop the faintest light, so empty areas stay empty instead of showing
  // a sparse, even grid.
  v = max(v - 0.02, 0.0) / 0.98;
  float on = step(threshold(gl_FragCoord.xy), v);
  vec4 c = v < 0.5 ? mix(uLow, uMid, v * 2.0) : mix(uMid, uHigh, v * 2.0 - 1.0);
  outColor = vec4(c.rgb * c.a, c.a) * on;
}`,f=.6,p=6,m=/^data:video\/|\.(mp4|webm|ogv|mov|m4v)(\?|#|$)/i;function h(e,t){let n=e.createProgram();for(let[r,i]of[[e.VERTEX_SHADER,s],[e.FRAGMENT_SHADER,t]]){let t=e.createShader(r);if(!t)return null;e.shaderSource(t,i),e.compileShader(t),e.getShaderParameter(t,e.COMPILE_STATUS)||console.warn(`DitherField: shader error`,e.getShaderInfoLog(t)),e.attachShader(n,t),e.deleteShader(t)}return e.linkProgram(n),e.getProgramParameter(n,e.LINK_STATUS)?n:(e.deleteProgram(n),null)}function g(e,t){let n=e.createTexture();e.bindTexture(e.TEXTURE_2D,n);let r=t?e.LINEAR_MIPMAP_LINEAR:e.LINEAR;return e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,r),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),n}function _(e,t){let n=h(e,`${c}${t}${l}`),r=h(e,d);if(!n||!r)return e.deleteProgram(n),e.deleteProgram(r),null;let i=(t,n)=>e.getUniformLocation(t,n),a=g(e,!0),o=g(e,!1),s=e.createFramebuffer(),u=null,p=!1,m=[1,1],_=[1,1],v=[1,1];return e.useProgram(r),e.uniform1i(i(r,`uField`),0),e.useProgram(n),e.uniform1i(i(n,`uMedia`),1),{resize(t,n,r,i){m=[t,n],v=[r,i],_=[Math.max(1,Math.round(r*f)),Math.max(1,Math.round(i*f))],e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,a),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,_[0],_[1],0,e.RGBA,e.UNSIGNED_BYTE,null),e.bindFramebuffer(e.FRAMEBUFFER,s),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,a,0),e.bindFramebuffer(e.FRAMEBUFFER,null)},setRamp([t,n,a]){e.useProgram(r),e.uniform4f(i(r,`uLow`),...t),e.uniform4f(i(r,`uMid`),...n),e.uniform4f(i(r,`uHigh`),...a)},setIntensity(t){e.useProgram(r),e.uniform1f(i(r,`uIntensity`),t)},setMedia(e){u=e,p=!0},draw(t,c){if(e.useProgram(n),u){let t=u,r=t instanceof HTMLVideoElement,a=r?t.videoWidth:t.naturalWidth,s=r?t.videoHeight:t.naturalHeight;if(!a||!s)return;(p||r)&&(e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,o),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t),e.uniform2f(i(n,`uMediaSize`),a,s),p=!1)}e.uniform2f(i(n,`uSize`),v[0],v[1]),e.uniform2f(i(n,`uView`),_[0],_[1]),e.uniform1f(i(n,`uTime`),t),e.bindFramebuffer(e.FRAMEBUFFER,s),e.viewport(0,0,_[0],_[1]),e.drawArrays(e.TRIANGLES,0,3),e.bindFramebuffer(e.FRAMEBUFFER,null),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,a),e.generateMipmap(e.TEXTURE_2D),e.useProgram(r),e.uniform2f(i(r,`uView`),m[0],m[1]),e.uniform1f(i(r,`uDot`),v[0]/m[0]),e.uniform3f(i(r,`uPointer`),...c),e.viewport(0,0,m[0],m[1]),e.drawArrays(e.TRIANGLES,0,3)},dispose(){e.deleteProgram(n),e.deleteProgram(r),e.deleteTexture(a),e.deleteTexture(o),e.deleteFramebuffer(s)}}}var v=e=>typeof e==`string`?[e,e,e]:[...e];function y(e,t){let n=document.createElement(`span`);n.style.display=`none`,e.appendChild(n);let r=document.createElement(`canvas`).getContext(`2d`,{willReadFrequently:!0}),i=typeof t==`string`?[.35,.75,1]:[1,1,1],a=v(t).map((e,t)=>{if(n.style.color=``,n.style.color=e,!r)return[.5,.5,.5,i[t]];r.clearRect(0,0,1,1),r.fillStyle=`#808080`,r.fillStyle=getComputedStyle(n).color,r.fillRect(0,0,1,1);let[a,o,s,c]=r.getImageData(0,0,1,1).data;return[a/255,o/255,s/255,c/255*i[t]]});return n.remove(),a}function b(e,t,n){if(m.test(e)){let r=document.createElement(`video`);return r.crossOrigin=`anonymous`,r.muted=!0,r.loop=!0,r.playsInline=!0,r.preload=`auto`,r.addEventListener(`loadeddata`,()=>t(r),{once:!0}),r.addEventListener(`error`,n,{once:!0}),r.src=e,r}let r=new Image;return r.crossOrigin=`anonymous`,r.decoding=`async`,r.addEventListener(`load`,()=>t(r),{once:!0}),r.addEventListener(`error`,n,{once:!0}),r.src=e,r}var x=(e,t,n,r)=>e+(t-e)*(1-Math.exp(-n*r));function S({pattern:e=`horizon`,src:t,color:n=`currentColor`,dotSize:s=1,intensity:c=.75,speed:l=1,fps:d=30,interactive:f=!0,className:m,children:h,...g}){let S=(0,i.useRef)(null),C=(0,i.useRef)(null),[w,T]=(0,i.useState)(!1),[E,D]=(0,i.useState)(!1),[O,k]=(0,i.useState)(0),A=(0,i.useRef)({color:n,intensity:c,speed:l,fps:d,interactive:f});A.current={color:n,intensity:c,speed:l,fps:d,interactive:f};let j=(0,i.useRef)(()=>{}),M=(0,i.useRef)(10),N=(0,i.useRef)(!1),P=v(n).join(`|`);(0,i.useEffect)(()=>{let e=S.current;if(!e)return;let t=new IntersectionObserver(([e])=>T(e.isIntersecting),{rootMargin:`100px`});return t.observe(e),()=>t.disconnect()},[]),(0,i.useEffect)(()=>{let n=S.current,r=C.current;if(!w||!n||!r)return;let i=document.createElement(`canvas`);i.className=`absolute top-0 left-0 opacity-0 transition-opacity duration-700 [image-rendering:pixelated] data-[ready]:opacity-100 motion-reduce:transition-none`;let a=i.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:`low-power`}),c=a?_(a,t?u:`float pattern(vec2 p, vec2 size, float t) {${o[e]}}`):null;if(!a||!c){a?.getExtension(`WEBGL_lose_context`)?.loseContext(),D(!0);return}D(!1),N.current&&(i.dataset.ready=``),r.appendChild(i);let l=window.matchMedia(`(prefers-reduced-motion: reduce)`),d={x:0,y:0,clientX:0,clientY:0,on:!1,hover:0},f=0,m=0,h=0,g=!t,v=!1,T=!1,E=()=>{g&&h&&!v&&(c.draw(M.current,[d.x,d.y,d.hover]),i.dataset.ready=``,N.current=!0)},O=()=>{c.setRamp(y(n,A.current.color)),c.setIntensity(A.current.intensity),E()};j.current=O;let P=0,F=()=>{cancelAnimationFrame(P),P=requestAnimationFrame(O)},I=()=>{let e=n.clientWidth,t=n.clientHeight;if(!e||!t)return;let r=window.devicePixelRatio||1,a=Math.max(1,Math.round(s*r)),o=a/r,l=Math.ceil(e*r/a),u=Math.ceil(t*r/a);h=u*o,i.width=l,i.height=u,i.style.width=`${l*o}px`,i.style.height=`${h}px`,c.resize(l,u,l*o,h),E()},L=()=>{let e=g&&!v&&!document.hidden&&!l.matches;e&&!m?(f=0,m=requestAnimationFrame(R),B?.play().catch(()=>{})):!e&&m&&(cancelAnimationFrame(m),m=0,B?.pause())},R=e=>{m=requestAnimationFrame(R);let{speed:t,fps:r,interactive:i}=A.current;if(f&&e-f<1e3/Math.max(r,1)-2)return;let a=f?Math.min((e-f)/1e3,2):0;f=e,M.current+=a*t;let o=n.getBoundingClientRect(),s=o.left+n.clientLeft,c=o.top+n.clientTop,l=i&&d.on&&d.clientX>=o.left&&d.clientX<=o.right&&d.clientY>=o.top&&d.clientY<=o.bottom;d.x=x(d.x,d.clientX-s,p,a),d.y=x(d.y,c+h-d.clientY,p,a),d.hover=x(d.hover,+!!l,4,a),E()},z=t?b(t,e=>{T||(c.setMedia(e),g=!0,E(),L())},()=>{T||D(!0)}):null,B=z instanceof HTMLVideoElement?z:null,V=e=>{if(e.pointerType!==`touch`||e.buttons!==0){if(!d.on){let t=n.getBoundingClientRect();d.x=e.clientX-t.left-n.clientLeft,d.y=t.top+n.clientTop+h-e.clientY}d.clientX=e.clientX,d.clientY=e.clientY,d.on=!0}},H=()=>{d.on=!1},U=e=>{e.pointerType===`touch`&&(d.on=!1)},W=null,G=()=>{W?.removeEventListener(`change`,K),W=window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`),W.addEventListener(`change`,K)},K=()=>{I(),G()},q=e=>{e.preventDefault(),v=!0,L(),D(!0)},J=()=>k(e=>e+1),Y=new ResizeObserver(I),X=new MutationObserver(F),Z=window.matchMedia(`(prefers-color-scheme: dark)`);return I(),O(),L(),G(),Y.observe(n),X.observe(document.documentElement,{attributes:!0,attributeFilter:[`class`,`data-theme`]}),X.observe(n,{attributes:!0,attributeFilter:[`class`,`style`]}),Z.addEventListener(`change`,F),l.addEventListener(`change`,L),document.addEventListener(`visibilitychange`,L),window.addEventListener(`pointerdown`,V,{passive:!0}),window.addEventListener(`pointermove`,V,{passive:!0}),window.addEventListener(`pointerup`,U,{passive:!0}),window.addEventListener(`pointercancel`,U,{passive:!0}),document.documentElement.addEventListener(`pointerleave`,H),i.addEventListener(`webglcontextlost`,q),i.addEventListener(`webglcontextrestored`,J),()=>{T=!0,cancelAnimationFrame(m),cancelAnimationFrame(P),j.current=()=>{},Y.disconnect(),X.disconnect(),W?.removeEventListener(`change`,K),Z.removeEventListener(`change`,F),l.removeEventListener(`change`,L),document.removeEventListener(`visibilitychange`,L),window.removeEventListener(`pointerdown`,V),window.removeEventListener(`pointermove`,V),window.removeEventListener(`pointerup`,U),window.removeEventListener(`pointercancel`,U),document.documentElement.removeEventListener(`pointerleave`,H),i.removeEventListener(`webglcontextlost`,q),i.removeEventListener(`webglcontextrestored`,J),B?(B.pause(),B.removeAttribute(`src`),B.load()):z?.removeAttribute(`src`),c.dispose(),a.getExtension(`WEBGL_lose_context`)?.loseContext(),i.remove()}},[w,e,t,s,O]),(0,i.useEffect)(()=>{j.current()},[P,c]);let[,F]=v(n),I={backgroundImage:`radial-gradient(${F} 0.6px, transparent 0.9px)`,backgroundSize:`${3*s}px ${3*s}px`,maskImage:`radial-gradient(ellipse at 50% 70%, black, transparent 75%)`,WebkitMaskImage:`radial-gradient(ellipse at 50% 70%, black, transparent 75%)`,opacity:Math.min(1,c)};return(0,a.jsxs)(`div`,{ref:S,className:r(`relative isolate overflow-hidden`,m),...g,children:[(0,a.jsx)(`div`,{ref:C,"aria-hidden":`true`,className:`pointer-events-none absolute inset-0 -z-10`,style:E?I:void 0}),h]})}function C(){return(0,a.jsxs)(S,{pattern:`horizon`,color:[`var(--dither-low)`,`var(--dither-mid)`,`var(--dither-high)`],className:`bg-background flex h-[420px] w-full flex-col items-center justify-center gap-4 rounded-lg border px-4 pb-28 text-center select-none [--dither-high:#4c1d95] [--dither-low:#c4b5fd] [--dither-mid:#7c3aed] md:h-[500px] md:gap-6 md:px-6 md:pb-24 dark:[--dither-high:#ede9fe] dark:[--dither-low:#2e1065] dark:[--dither-mid:#8b5cf6]`,children:[(0,a.jsx)(`h1`,{className:`max-w-xl text-3xl font-semibold tracking-tighter text-balance sm:text-4xl md:text-6xl`,children:`Light, rendered one dot at a time`}),(0,a.jsx)(`p`,{className:`text-muted-foreground max-w-md text-sm text-balance md:text-base`,children:`An ordered-dither field that follows your theme, your brand colors and your pointer.`}),(0,a.jsxs)(`div`,{className:`flex flex-wrap justify-center gap-2 md:gap-3`,children:[(0,a.jsx)(`button`,{type:`button`,className:`bg-foreground text-background h-9 rounded-full px-4 text-sm font-medium whitespace-nowrap md:h-10 md:px-5`,children:`Get started`}),(0,a.jsx)(`button`,{type:`button`,className:`bg-background/80 h-9 rounded-full border px-4 text-sm font-medium whitespace-nowrap backdrop-blur md:h-10 md:px-5`,children:`Learn more`})]})]})}export{C as default};