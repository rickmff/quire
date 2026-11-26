import{i as e,r as t,t as n}from"./index-Cvsa5Tuj.js";import{t as r}from"./react-DCDSqIom.js";import{t as i}from"./MotionConfig-CMzOK2ZJ.js";import{t as a}from"./check-azi4MNzw.js";import{t as o}from"./use-in-view-C0GYJH9u.js";import{t as s}from"./utils-C2msa8mM.js";import{t as c}from"./use-reduced-motion-DoPGir53.js";import{t as l}from"./arrow-right-Bskh7CiC.js";var u=e(t(),1),d=n(),f=[.16,1,.3,1],p=`[--cta-accent:#2f6bff] dark:[--cta-accent:#5b8bff]`,m=`outline-none focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_oklab,var(--cta-accent)_30%,transparent)]`,h=e=>{e.currentTarget.getAttribute(`href`)===`#`&&e.preventDefault()},g=()=>()=>{};function _(){let e=c()??!1;return u.useSyncExternalStore(g,()=>!0,()=>!1)&&e}function v({action:e,className:t,...n}){return(0,d.jsxs)(`a`,{...n,href:e.href,onClick:h,className:s(`group/primary inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-foreground pr-4 pl-5 text-[14.5px] font-medium text-background shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(0,0,0,0.12),0_8px_20px_-10px_rgba(0,0,0,0.45)] transition-[transform,opacity] duration-150 ease-out hover:opacity-[0.92] active:scale-[0.97]`,m,t),children:[e.label,(0,d.jsxs)(`span`,{"aria-hidden":!0,className:`relative grid size-4 overflow-hidden`,children:[(0,d.jsx)(l,{className:`col-start-1 row-start-1 size-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/primary:translate-x-[130%]`,strokeWidth:2}),(0,d.jsx)(l,{className:`col-start-1 row-start-1 size-4 -translate-x-[130%] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/primary:translate-x-0`,strokeWidth:2})]})]})}function y({action:e,className:t}){return(0,d.jsx)(`a`,{href:e.href,onClick:h,className:s(`inline-flex h-11 items-center justify-center rounded-lg bg-background/70 px-5 text-[14.5px] font-medium text-foreground shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] transition-[transform,background-color] duration-150 ease-out hover:bg-background active:scale-[0.97] dark:bg-white/[0.06] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] dark:hover:bg-white/[0.1]`,m,t),children:e.label})}var b=`attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`,x=`
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;
uniform float uHover;
uniform float uFocus;
uniform vec3 uC0;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
uniform vec3 uLight;
uniform float uGrain;
uniform float uScale;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

// Stops arrive in OKLab, so pastels blend through clean hues instead of
// greying out in the middle the way an RGB mix does.
vec3 toRgb(vec3 lab) {
  float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  vec3 lin = vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );
  lin = clamp(lin, 0.0, 1.0);
  return mix(lin * 12.92, 1.055 * pow(lin, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, lin));
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / uRes;
  vec2 p = frag / uRes.y;
  float t = uTime * 0.035;

#ifdef MATTE
  // One color, lit from the top left and falling into shade at the bottom
  // right, with a barely there drift in its tone. Stop 3 is unused.
  float n = noise(p * 1.4 + vec2(t, -t * 0.6)) * 0.65
    + noise(p * 3.1 - vec2(t * 0.4, t * 0.7)) * 0.35;
  vec3 lab = uC0;
  lab.x *= 0.97 + 0.06 * n;
  float key = 1.0 - smoothstep(0.0, 1.25, length((uv - vec2(0.02, 1.02)) * vec2(0.85, 1.25)));
  lab = mix(lab, uC1, key * 0.75);
  float shade = smoothstep(0.45, 1.45, length((uv - vec2(0.0, 1.0)) * vec2(0.8, 1.0)));
  lab = mix(lab, uC2, shade * 0.6);
#else
  // Warp the plane by itself so the shapes fold slowly instead of sliding
  vec2 q = vec2(
    noise(p * 1.1 + vec2(t, 0.0)),
    noise(p * 1.1 + vec2(5.2, 1.3) - t)
  );
  float a = noise(p * 0.8 + q * 1.8 + vec2(t * 0.5, -t * 0.3));
  float b = noise(p * 1.15 - q * 1.4 + vec2(-t * 0.4, t * 0.6) + 3.1);
  float c = noise(p * 0.7 + q * 1.1 + vec2(t * 0.3, t * 0.2) + 7.7);

  vec3 lab = mix(uC0, uC1, smoothstep(0.3, 0.7, a));
  lab = mix(lab, uC2, smoothstep(0.4, 0.75, b));
  lab = mix(lab, uC3, smoothstep(0.45, 0.8, c) * 0.9);
#endif

  vec2 dm = (frag - uPointer) / uRes.y;
  lab = mix(lab, uLight, clamp(0.45 * uHover * exp(-dot(dm, dm) * (5.0 + 6.0 * uFocus)), 0.0, 0.9));

  vec3 col = toRgb(lab);
  col += (hash(floor(frag / uScale)) - 0.5) * uGrain;
  gl_FragColor = vec4(col, 1.0);
}`,S=()=>Math.min(window.devicePixelRatio||1,2);function C(e,t){let n=document.createElement(`canvas`).getContext(`2d`),r=t;if(n&&e){n.fillStyle=e,n.fillRect(0,0,1,1);let[t,i,a]=n.getImageData(0,0,1,1).data;r=[t/255,i/255,a/255]}let[i,a,o]=r.map(e=>e<=.04045?e/12.92:((e+.055)/1.055)**2.4),s=Math.cbrt(.4122214708*i+.5363325363*a+.0514459929*o),c=Math.cbrt(.2119034982*i+.6806995451*a+.1073969566*o),l=Math.cbrt(.0883024619*i+.2817188376*a+.6299787005*o);return[.2104542553*s+.793617785*c-.0040720468*l,1.9779984951*s-2.428592205*c+.4505937099*l,.0259040371*s+.7827717662*c-.808675766*l]}function w({area:e,reduce:t,variant:n=`mesh`,className:r}){let i=u.useRef(null);return u.useEffect(()=>{let r=i.current,a=r?.getContext(`webgl`,{alpha:!1,antialias:!1,depth:!1,stencil:!1,powerPreference:`low-power`});if(!r||!a)return;let o=(e,t)=>{let n=a.createShader(e);return a.shaderSource(n,t),a.compileShader(n),n},s=o(a.VERTEX_SHADER,b),c=n===`matte`?`#define MATTE
`:``,l=o(a.FRAGMENT_SHADER,c+x),u=a.createProgram();a.attachShader(u,s),a.attachShader(u,l),a.linkProgram(u);let d=()=>{a.deleteProgram(u),a.deleteShader(s),a.deleteShader(l)};if(!a.getProgramParameter(u,a.LINK_STATUS)){d();return}a.useProgram(u);let f=a.createBuffer();a.bindBuffer(a.ARRAY_BUFFER,f),a.bufferData(a.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),a.STATIC_DRAW);let p=a.getAttribLocation(u,`p`);a.enableVertexAttribArray(p),a.vertexAttribPointer(p,2,a.FLOAT,!1,0,0);let m=e=>a.getUniformLocation(u,e),h=m(`uRes`),g=m(`uTime`),_=m(`uPointer`),v=m(`uHover`),y=m(`uFocus`),w=m(`uLight`),T=m(`uGrain`),E=m(`uScale`),D=[m(`uC0`),m(`uC1`),m(`uC2`),m(`uC3`)],O=S(),k=r.getBoundingClientRect(),A=()=>{k=r.getBoundingClientRect(),O=S(),a.uniform1f(E,O),r.width=Math.max(1,Math.round(k.width*O)),r.height=Math.max(1,Math.round(k.height*O)),a.viewport(0,0,r.width,r.height),a.uniform2f(h,r.width,r.height)},j=()=>{let e=getComputedStyle(r),t=document.documentElement.classList.contains(`dark`);D.forEach((t,n)=>a.uniform3fv(t,C(e.getPropertyValue(`--field-${n}`).trim(),[.97,.96,.94]))),a.uniform3fv(w,C(e.getPropertyValue(`--field-light`).trim(),[1,1,1])),a.uniform1f(T,t?.03:.04)},M={x:0,y:0,on:0},N={x:0,y:0,on:0,focus:0},P=null,F=24,I=0,L=0,R=!1,z=()=>{a.uniform1f(g,F),a.uniform2f(_,N.x,N.y),a.uniform1f(v,N.on),a.uniform1f(y,N.focus),a.drawArrays(a.TRIANGLES,0,3)},B=e=>{L=requestAnimationFrame(B);let t=I?Math.min(e-I,100)/1e3:0;I=e,F+=t;let n=1-Math.exp(-t*3.5),r=P??M;N.x+=(r.x-N.x)*n,N.y+=(r.y-N.y)*n,N.on+=((P?1.9:M.on)-N.on)*(1-Math.exp(-t*2.5)),N.focus+=(+!!P-N.focus)*(1-Math.exp(-t*3)),z()},V=()=>{t||!R||L||(I=0,L=requestAnimationFrame(B))},H=()=>{cancelAnimationFrame(L),L=0},U=e=>{e.pointerType!==`touch`&&(k=r.getBoundingClientRect(),M.x=(e.clientX-k.left)*O,M.y=(k.bottom-e.clientY)*O,M.on||(N.x=M.x,N.y=M.y),M.on=1)},W=()=>{M.on=0},G=e.current;G?.addEventListener(`pointermove`,U),G?.addEventListener(`pointerleave`,W);let K=G?.querySelector(`[data-field-gather]`),q=()=>{if(!K)return;k=r.getBoundingClientRect();let e=K.getBoundingClientRect();P={x:(e.left+e.width/2-k.left)*O,y:(k.bottom-(e.top+e.height/2))*O},N.on||(N.x=P.x,N.y=P.y),V()},J=()=>{P=null};K?.addEventListener(`pointerenter`,q),K?.addEventListener(`pointerleave`,J),K?.addEventListener(`focus`,q),K?.addEventListener(`blur`,J),A(),j(),z();let Y=new ResizeObserver(()=>{A(),z()});Y.observe(r);let X=new IntersectionObserver(([e])=>{R=e.isIntersecting,R?V():H()});X.observe(r);let Z=new MutationObserver(()=>{j(),z()});return Z.observe(document.documentElement,{attributes:!0,attributeFilter:[`class`]}),()=>{H(),G?.removeEventListener(`pointermove`,U),G?.removeEventListener(`pointerleave`,W),K?.removeEventListener(`pointerenter`,q),K?.removeEventListener(`pointerleave`,J),K?.removeEventListener(`focus`,q),K?.removeEventListener(`blur`,J),Y.disconnect(),X.disconnect(),Z.disconnect(),a.deleteBuffer(f),d()}},[t,e,n]),(0,d.jsx)(`canvas`,{ref:i,"aria-hidden":!0,className:s(`pointer-events-none absolute inset-0 size-full bg-[linear-gradient(135deg,var(--field-0),var(--field-1)_40%,var(--field-2)_70%,var(--field-3))]`,r)})}[0,32,8,40,2,34,10,42,48,16,56,24,50,18,58,26,12,44,4,36,14,46,6,38,60,28,52,20,62,30,54,22,3,35,11,43,1,33,9,41,51,19,59,27,49,17,57,25,15,47,7,39,13,45,5,37,63,31,55,23,61,29,53,21].map(e=>(e+.5)/64);var T=`[--field-0:#fbf8f2] [--field-1:#c3dfe6] [--field-2:#f5d2bb] [--field-3:#c9e2d3] [--field-light:#fffdf8] dark:[--field-0:#0e1014] dark:[--field-1:#17283f] dark:[--field-2:#3a2417] dark:[--field-3:#13302a] dark:[--field-light:#3b4a60]`;function E({title:e=`Plan, build and ship in one place.`,titleMuted:t=`Free for teams of up to ten.`,description:n=`Bring your issues over from Jira or Linear in a few clicks, then keep every doc, review and release in sync.`,primary:c={label:`Start for free`,href:`#`},secondary:l={label:`Book a demo`,href:`#`},notes:m=[`No credit card`,`Set up in two minutes`,`Cancel anytime`],className:h}){let g=_(),b=u.useId(),x=u.useRef(null),S=o(x,{once:!0,amount:.4})||g,C=e=>({initial:{opacity:0,y:10},animate:S?{opacity:1,y:0}:void 0,transition:{duration:.6,ease:f,delay:.08+e*.06}});return(0,d.jsx)(i,{reducedMotion:`user`,children:(0,d.jsx)(`section`,{"aria-labelledby":`${b}-title`,className:s(`w-full bg-background px-4 py-10 font-sans text-foreground sm:px-6 md:py-14`,p,h),children:(0,d.jsxs)(`div`,{ref:x,className:s(`relative isolate mx-auto max-w-6xl overflow-hidden rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.09)]`,T),children:[(0,d.jsx)(w,{area:x,reduce:g,className:`-z-10`}),(0,d.jsxs)(`div`,{className:`flex flex-col items-center px-5 py-16 text-center sm:px-12 md:py-20`,children:[(0,d.jsxs)(r.h2,{id:`${b}-title`,...C(0),className:`max-w-[20ch] text-[34px] leading-[1.06] font-semibold tracking-[-0.04em] text-balance sm:max-w-3xl sm:text-[48px]`,children:[e,(0,d.jsx)(`span`,{className:`block text-foreground/45`,children:t})]}),(0,d.jsx)(r.p,{...C(1),className:`mt-6 max-w-[48ch] text-[15.5px] leading-[1.6] text-pretty text-foreground/65 sm:text-[16.5px]`,children:n}),(0,d.jsxs)(r.div,{...C(2),className:`mt-9 flex w-full flex-col items-stretch gap-2.5 sm:w-auto sm:flex-row sm:items-center`,children:[(0,d.jsx)(v,{action:c,"data-field-gather":``}),(0,d.jsx)(y,{action:l})]}),m.length?(0,d.jsx)(r.ul,{...C(3),className:`mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px] text-foreground/60`,children:m.map(e=>(0,d.jsxs)(`li`,{className:`inline-flex items-center gap-1.5`,children:[(0,d.jsx)(a,{"aria-hidden":!0,className:`size-3.5 text-foreground/45`,strokeWidth:2.25}),e]},e))}):null]})]})})})}export{E as CtaBloom};