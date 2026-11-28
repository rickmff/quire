import{i as e,o as t,t as n}from"./index-TChZs6Gr.js";import{t as r}from"./utils-C2msa8mM.js";var i=t(e(),1),a=n(),o=[`Thinking...`,`Processing...`,`Reasoning...`,`Analyzing...`,`Computing...`,`Understanding...`],s=.56,c=.2,l=.28,u=`
precision mediump float;

attribute vec2  a_cur;     // pixel pos in current text
attribute vec2  a_nxt;     // pixel pos in next text
attribute vec2  a_chaos;   // midpoint local scatter pos
attribute float a_ccx;     // current char progress [0, 1]
attribute float a_ncx;     // next char progress [0, 1]
attribute float a_seed;

uniform vec2  u_res;
uniform float u_wave;      // < 0 = display;  0→MAX_WAVE = transition
uniform float u_hold;      // wave-units each char waits between shatter-end and construct-start
uniform float u_pt_scale;  // particle size multiplier based on font size

varying float v_chaos;
varying float v_glow;
varying float v_alpha;

const float DELAY     = 0.56;
const float RAMP_SHAT = 0.20;
const float RAMP_CONS = 0.28;

void main() {
  float w = max(u_wave, 0.0);

  // Left-to-right character shatter
  float rs = clamp((w - a_ccx * DELAY) / RAMP_SHAT, 0.0, 1.0);
  float char_shatter_end = a_ccx * DELAY + RAMP_SHAT;

  // Matching left-to-right character construction
  float rc = clamp((w - char_shatter_end - u_hold) / RAMP_CONS, 0.0, 1.0);

  // Smooth Hermite curves
  float s = rs * rs * (3.0 - 2.0 * rs);   // shatter   0→1
  float c = rc * rc * (3.0 - 2.0 * rc);   // construct 0→1

  // Chaos intensity: 0 = assembled, 1 = peak scatter
  float ct = s * (1.0 - c);
  ct = ct * ct * (3.0 - 2.0 * ct);
  v_chaos = ct;

  // Transition positions
  vec2 shat_pos = mix(a_cur,   a_chaos, s);
  vec2 cons_pos = mix(a_chaos, a_nxt,   c);
  vec2 pos = mix(shat_pos, cons_pos, step(0.0001, c));

  vec2 clip = (pos / u_res) * 2.0 - 1.0;
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);

  // Particle size scaled with font scale
  float sz = (3.4 + a_seed * 0.4 + ct * (3.2 + a_seed * 3.0)) * u_pt_scale;
  gl_PointSize = clamp(sz, 2.0, 24.0);

  // Glow: chars glow during active scatter wave
  v_glow = ct * 0.9;

  // Active particle alpha: particles emerge as solid character dissolves,
  // and disappear as solid character reconstructs, eliminating all assembled blur/gaps.
  float p_in  = smoothstep(0.02, 0.22, s);
  float p_out = 1.0 - smoothstep(0.75, 0.98, c);
  v_alpha = p_in * p_out;
}
`,d=`
precision mediump float;

uniform vec3 u_color_base;
uniform vec3 u_color_flight;
uniform vec3 u_color_glow;

varying float v_chaos;
varying float v_glow;
varying float v_alpha;

void main() {
  if (v_alpha < 0.01) discard;

  vec2  uv = gl_PointCoord - 0.5;
  float d  = length(uv);

  float crisp = smoothstep(0.5, 0.42, d);
  float soft  = exp(-d * d * 6.0);
  float shape = mix(crisp, soft, v_chaos);

  if (shape < 0.01) discard;

  vec3 col = mix(u_color_base,   u_color_flight, v_chaos * 0.6);
  col      = mix(col,            u_color_glow,   v_glow * 0.55);

  float a = shape * v_alpha;
  // Premultiplied alpha output for clean compositing
  gl_FragColor = vec4(col * a, a);
}
`,f=null;function p(e,t){if(typeof document>`u`||!e)return t;try{if(!f){let e=document.createElement(`canvas`);e.width=1,e.height=1,f=e.getContext(`2d`,{willReadFrequently:!0})}if(!f)return t;f.clearRect(0,0,1,1),f.fillStyle=e,f.fillRect(0,0,1,1);let n=f.getImageData(0,0,1,1).data;return n[3]===0&&e!==`transparent`?t:[n[0]/255,n[1]/255,n[2]/255]}catch{return t}}function m(e,t,n){let r=e.createShader(t);return e.shaderSource(r,n),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS)||console.error(`[glsl]`,e.getShaderInfoLog(r)),r}function h(e){let t=e.createProgram();return e.attachShader(t,m(e,e.VERTEX_SHADER,u)),e.attachShader(t,m(e,e.FRAGMENT_SHADER,d)),e.linkProgram(t),e.getProgramParameter(t,e.LINK_STATUS)||console.error(`[prog]`,e.getProgramInfoLog(t)),t}function g(e,t,n,r,i,a=!1){let o=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,o),e.bufferData(e.ARRAY_BUFFER,i,a?e.DYNAMIC_DRAW:e.STATIC_DRAW);let s=e.getAttribLocation(t,n);return s>=0&&(e.enableVertexAttribArray(s),e.vertexAttribPointer(s,r,e.FLOAT,!1,0,0)),o}function _(e,t,n){e.bindBuffer(e.ARRAY_BUFFER,t),e.bufferSubData(e.ARRAY_BUFFER,0,n)}function ee(e,t,n,r,i,a,o,s,c){let l=Math.max(12,Math.round(i*r)),u=`${a} ${l}px ${o}`,d=document.createElement(`canvas`),f=d.getContext(`2d`);f.font=u;let p=[...e||` `],m=Math.max(1,f.measureText(e||` `).width),h=Math.max(100,Math.ceil(m+60)),g=Math.max(40,Math.ceil(l*2.4));d.width=h,d.height=g,f.clearRect(0,0,h,g),f.font=u,f.textAlign=`center`,f.textBaseline=`middle`;let _=t/2;s===`left`?_=m/2+24*r:s===`right`&&(_=t-m/2-24*r);let ee=n/2,v=h/2-m/2,y=p.map((e,t)=>{let n=t===0?0:f.measureText(p.slice(0,t).join(``)).width,r=f.measureText(p.slice(0,t+1).join(``)).width,i=Math.max(1,r-n),a=v+n+i/2;return{char:p[t],cx_s:a,screenCx:_+(a-h/2),frac:m>0?(a-v)/m:.5}});f.fillStyle=`#ffffff`,f.fillText(e||` `,h/2,g/2);let b=f.getImageData(0,0,h,g),x=Array.from({length:p.length},()=>[]);for(let e=0;e<g;e++)for(let t=0;t<h;t++)if(b.data[(e*h+t)*4+3]>110){let n=0;for(let e=0;e<y.length;e++){let r=e===0?0:f.measureText(p.slice(0,e).join(``)).width,i=f.measureText(p.slice(0,e+1).join(``)).width,a=v+r-1,o=v+i+1;if(t>=a&&t<=o){n=e;break}}x[n].push({x:t,y:e})}let S=x.reduce((e,t)=>e+t.length,0);S===0&&(x[0].push({x:h/2,y:g/2}),S=1);for(let e=0;e<p.length;e++){let t=x[e];for(let e=t.length-1;e>0;e--){let n=Math.random()*(e+1)|0;[t[e],t[n]]=[t[n],t[e]]}}let C=x.map(e=>Math.round(e.length/S*c)),w=c-C.reduce((e,t)=>e+t,0);if(w!==0){let e=0;for(let t=1;t<C.length;t++)C[t]>C[e]&&(e=t);C[e]+=w}let T=new Float32Array(c*2),E=new Float32Array(c),D=0;for(let e=0;e<p.length;e++){let t=C[e],n=x[e];if(!(t<=0||n.length===0))for(let r=0;r<t&&!(D>=c);r++){let t=n[r%n.length],i=r>=n.length?(Math.random()-.5)*.8:0,a=r>=n.length?(Math.random()-.5)*.8:0;T[D*2]=_+(t.x-h/2)+i,T[D*2+1]=ee+(t.y-g/2)+a,E[D]=y[e].frac,D++}}for(;D<c;)T[D*2]=T[(D-1)*2],T[D*2+1]=T[(D-1)*2+1],E[D]=E[D-1],D++;return{text:e,pos:T,cx:E,bounds:y,totalW:m,targetCenterX:_}}function v(e,t,n,r,i,a){let o=i[0]*n*r,s=i[1]*n*r,c=new Float32Array(a*2);for(let n=0;n<a;n++){let r=Math.random()*Math.PI*2,i=o+Math.random()*(s-o),a=(e[n*2]+t[n*2])*.5,l=(e[n*2+1]+t[n*2+1])*.5;c[n*2]=a+Math.cos(r)*i,c[n*2+1]=l+Math.sin(r)*i}return c}function y(e,t,n,r,i,a,o,u,d,f,p=120,m=!0){if(e.clearRect(0,0,e.canvas.width,e.canvas.height),e.font=d,e.textAlign=`center`,e.textBaseline=`middle`,r<0||!n){e.fillStyle=a;for(let n of t.bounds)e.fillText(n.char,n.screenCx,u);if(!m)return;let n=t.totalW,r=t.targetCenterX-n/2,s=r+i*n,c=Math.max(8,p/2),l=e.createLinearGradient(s-c,u,s+c,u);l.addColorStop(0,`rgba(255,255,255,0)`),l.addColorStop(.5,o),l.addColorStop(1,`rgba(255,255,255,0)`),e.save(),e.globalCompositeOperation=`source-atop`,e.fillStyle=l,e.fillRect(r-20,u-80,n+40,160),e.restore()}else{for(let n of t.bounds){let t=n.frac*s,i=Math.max(0,Math.min(1,1-(r-t)/.08));i>.01&&(e.save(),e.globalAlpha=i,e.fillStyle=a,e.fillText(n.char,n.screenCx,u),e.restore())}for(let t of n.bounds){let n=t.frac*s+c+f+l,i=Math.max(0,Math.min(1,(r-(n-.08))/.08));i>.01&&(e.save(),e.globalAlpha=i,e.fillStyle=a,e.fillText(t.char,t.screenCx,u),e.restore())}}}function b({phrases:e=o,className:t,style:n,canvasClassName:s,color:c,flightColor:u,glowColor:d,shimmerColor:f,fontSize:m,fontFamily:b,fontWeight:x,displayDuration:S=2.1,waveSpeed:C=.7,scatterHold:w=0,shimmerSpeed:T=.65,shimmerWidth:E=120,particleCount:D=12e3,scatterRadius:te=[20,50],textAlign:ne=`center`,trigger:O,shimmer:re=!0}){let ie=(0,i.useRef)(null),ae=(0,i.useRef)(null),oe=(0,i.useRef)(null),k=(0,i.useRef)(O);(0,i.useEffect)(()=>{k.current=O},[O]);let[se,ce]=te,A=(0,i.useMemo)(()=>e.length>0?e:o,[e]);return(0,i.useEffect)(()=>{let e=ie.current,t=ae.current,n=oe.current;if(!e||!t||!n)return;let r=t.getContext(`2d`),i=n.getContext(`webgl`,{alpha:!0,premultipliedAlpha:!0,antialias:!0});if(!r||!i)return;let a=h(i);i.useProgram(a);let o=i.getUniformLocation(a,`u_res`),s=i.getUniformLocation(a,`u_wave`),te=i.getUniformLocation(a,`u_hold`),O=i.getUniformLocation(a,`u_pt_scale`),le=i.getUniformLocation(a,`u_color_base`),ue=i.getUniformLocation(a,`u_color_flight`),de=i.getUniformLocation(a,`u_color_glow`),j=window.getComputedStyle(e),fe=j.color||`#27272a`,pe=parseFloat(j.fontSize)||42,me=j.fontWeight||`500`,he=j.fontFamily||`Inter, system-ui, sans-serif`,M=m??(pe>0?pe:42),ge=x??me,_e=b??he,ve=c||fe,N=p(ve,[.153,.153,.165]),[P,F,I]=N,L=.299*P+.587*F+.114*I,R=u?p(u,[.42,.42,.46]):L<.4?[P+(1-P)*.35,F+(1-F)*.35,I+(1-I)*.35]:[P*.75,F*.75,I*.75],z=d?p(d,[.6,.8,1]):L<.25?[.6,.8,1]:[Math.min(1,P*1.35+.15),Math.min(1,F*1.35+.15),Math.min(1,I*1.35+.15)],ye=f||(L<.4?`rgba(240, 240, 255, 0.85)`:`rgba(255, 255, 255, 0.95)`);i.uniform3f(le,N[0],N[1],N[2]),i.uniform3f(ue,R[0],R[1],R[2]),i.uniform3f(de,z[0],z[1],z[2]),i.uniform1f(te,w*C);let be=Math.min(Math.max(M/42,.5),2.2);i.uniform1f(O,be);let xe=new Float32Array(D);for(let e=0;e<D;e++)xe[e]=Math.random();let Se=new Float32Array(D*2),Ce=new Float32Array(D),we=g(i,a,`a_cur`,2,Se,!0),Te=g(i,a,`a_nxt`,2,Se,!0),Ee=g(i,a,`a_chaos`,2,Se,!0),De=g(i,a,`a_ccx`,1,Ce,!0),Oe=g(i,a,`a_ncx`,1,Ce,!0);g(i,a,`a_seed`,1,xe),i.enable(i.BLEND),i.blendFunc(i.ONE,i.ONE_MINUS_SRC_ALPHA);let B=0,V=0,H=1,U=[],W=0,G=-.1,K=-.2,q=`display`,J=0,Y,X,Z,Q,ke=0,Ae=!1,je=k.current,Me=.76+w*C+l;function Ne(e,r){H=Math.min(window.devicePixelRatio||1,2),B=Math.max(1,Math.round(e*H)),V=Math.max(1,Math.round(r*H)),t.width=B,t.height=V,t.style.width=`${e}px`,t.style.height=`${r}px`,n.width=B,n.height=V,n.style.width=`${e}px`,n.style.height=`${r}px`,i.viewport(0,0,B,V),i.uniform2f(o,B,V)}function Pe(e){if(!U[e])return;let t=U[e];Y=t.pos,X=t.cx,Z=t.pos,Q=t.cx,_(i,we,Y),_(i,Te,Z),_(i,De,X),_(i,Oe,Q),_(i,Ee,Y)}function Fe(){if(A.length<=1)return;let e=(W+1)%A.length;Z=U[e].pos,Q=U[e].cx;let t=v(Y,Z,H,M/42,[se,ce],D);_(i,Te,Z),_(i,Oe,Q),_(i,Ee,t),W=e,G=0,q=`transition`}function Ie(){Y=Z,X=Q,_(i,we,Y),_(i,De,X),_(i,Te,Z),G=-.1,q=`display`,J=0}let Le=performance.now();function Re(){let e=performance.now(),t=Math.min((e-Le)*.001,.05);if(Le=e,q===`display`?(J+=t,K+=t*T,K>1.25&&(K=-.25),k.current===void 0?J>=S&&A.length>1&&Fe():k.current!==je&&(je=k.current,Fe())):(G=Math.min(G+t*C,Me),G>=Me&&Ie()),Ae&&U.length>0){let e=Math.max(12,Math.round(M*H)),t=`${ge} ${e}px ${_e}`,n=q===`transition`?U[W]:null,i=q===`transition`?U[(W-1+A.length)%A.length]:U[W];y(r,i,n,G,K,ve,ye,V/2,t,w*C,E*H,re)}i.clearColor(0,0,0,0),i.clear(i.COLOR_BUFFER_BIT),i.uniform1f(s,G),q===`transition`&&i.drawArrays(i.POINTS,0,D),ke=requestAnimationFrame(Re)}function ze(){U=A.map(e=>ee(e,B,V,H,M,ge,_e,ne,D))}let Be=e.getBoundingClientRect();Ne(Be.width||window.innerWidth,Be.height||window.innerHeight),document.fonts.ready.then(()=>{ze(),Pe(0),Ae=!0,Le=performance.now(),ke=requestAnimationFrame(Re)});let $,Ve=new ResizeObserver(e=>{for(let t of e){let{width:e,height:n}=t.contentRect;e>0&&n>0&&(clearTimeout($),$=setTimeout(()=>{Ne(e,n),Ae&&(ze(),Pe(W),G=-.1,K=-.2,q=`display`,J=0)},80))}});return Ve.observe(e),()=>{cancelAnimationFrame(ke),clearTimeout($),Ve.disconnect()}},[A,t,c,u,d,f,m,b,x,S,C,w,T,E,D,se,ce,ne,re]),(0,a.jsxs)(`div`,{ref:ie,className:r(`relative w-full h-full min-h-[120px] flex items-center justify-center overflow-hidden`,t),style:n,children:[(0,a.jsx)(`canvas`,{ref:ae,className:`absolute inset-0 w-full h-full pointer-events-none block`}),(0,a.jsx)(`canvas`,{ref:oe,className:r(`absolute inset-0 w-full h-full pointer-events-none block`,s)})]})}export{o as DEFAULT_PHRASES,b as ShatterText,b as default};