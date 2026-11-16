import{a as e,c as t,t as n}from"./index-aq3vqO2C.js";import{t as r}from"./utils-D0T3A-kS.js";var i=t(e(),1),a=n(),o=15,s=3,c=.5,l=.9,u=.92,d=-.5,f=6,p=-2,m=89,h=2,g=1,_=200,v=`retro-grid-fallback-scroll`,y=`
@keyframes ${v} {
  from {
    transform: translateY(-50%);
  }

  to {
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  [data-retro-grid-scroll="true"] {
    animation: none !important;
    transform: translateY(-50%) !important;
  }
}
`,b=`
attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`,x=`
#extension GL_OES_standard_derivatives : enable
precision highp float;

uniform vec2 u_container_size;
uniform vec2 u_viewport_size;
uniform vec4 u_line_color;
uniform float u_angle;
uniform float u_cell_size;
uniform float u_device_pixel_ratio;
uniform float u_time;

const float animationDurationSeconds = ${o.toFixed(1)};
const float gridHeightRatio = ${s.toFixed(1)};
const float gridStartOffsetRatio = ${d.toFixed(1)};
const float gridWidthRatio = ${f.toFixed(1)};
const float gridXOffsetRatio = ${p.toFixed(1)};
const float gridLineAlignmentOffsetPx = ${c.toFixed(1)};
const float gridLineAntialiasMultiplier = ${l.toFixed(1)};
const float horizontalLodLevelOneEndPx = 5.6;
const float horizontalLodLevelOneStartPx = 2.8;
const float horizontalLodLevelTwoEndPx = 3.0;
const float horizontalLodLevelTwoStartPx = 1.4;
const float horizontalCompressionEndPx = 2.8;
const float horizontalCompressionStartPx = 1.2;
const float lineWidthPx = ${u.toFixed(2)};
const float perspectivePx = ${_.toFixed(1)};
const float gridTravelRatio = 0.5;
const float verticalCompressionEndPx = 2.6;
const float verticalCompressionStartPx = 1.0;
const float verticalEdgeCompressionEnd = 0.95;
const float verticalEdgeCompressionStart = 0.45;
const float verticalLodLevelEnd = 0.64;
const float verticalLodLevelStart = 0.22;
const float verticalTopCompressionEndCells = 6.0;
const float verticalTopCompressionStartCells = 2.0;

float renderGridLine(
  float wrappedCoord,
  float antiAliasWidth,
  float softnessBoost
) {
  return 1.0 - smoothstep(
    lineWidthPx,
    lineWidthPx + (antiAliasWidth * (1.5 + softnessBoost)),
    wrappedCoord
  );
}

void main() {
  float angle = radians(clamp(u_angle, 1.0, 89.0));
  float sinAngle = sin(angle);
  float cosAngle = cos(angle);
  vec2 screen = vec2(
    (gl_FragCoord.x / u_device_pixel_ratio) - (u_container_size.x * 0.5),
    (u_container_size.y * 0.5) - (gl_FragCoord.y / u_device_pixel_ratio)
  );

  vec3 rayOrigin = vec3(0.0, 0.0, perspectivePx);
  vec3 rayDirection = normalize(vec3(screen, -perspectivePx));
  vec3 planeXAxis = vec3(1.0, 0.0, 0.0);
  vec3 planeYAxis = vec3(0.0, cosAngle, sinAngle);
  vec3 planeNormal = normalize(cross(planeXAxis, planeYAxis));
  float denominator = dot(rayDirection, planeNormal);

  if (abs(denominator) < 0.0001) {
    discard;
  }

  float distanceToPlane = dot(-rayOrigin, planeNormal) / denominator;

  if (distanceToPlane <= 0.0) {
    discard;
  }

  vec3 hitPoint = rayOrigin + (rayDirection * distanceToPlane);
  float localX = hitPoint.x;
  float localY = dot(hitPoint, planeYAxis);
  float gridWidth = u_viewport_size.x * gridWidthRatio;
  float gridHeight = u_viewport_size.y * gridHeightRatio;
  float gridScrollSpeed = (gridHeight * gridTravelRatio) / animationDurationSeconds;
  float patternOffsetY = u_time * gridScrollSpeed;
  float gridLeft = (-0.5 * u_container_size.x) + (gridXOffsetRatio * u_container_size.x);
  float gridTop = (-0.5 * u_container_size.y) + (gridStartOffsetRatio * gridHeight);
  vec2 planePosition = vec2(localX - gridLeft, localY - gridTop);

  if (
    planePosition.x < 0.0 ||
    planePosition.y < 0.0 ||
    planePosition.x > gridWidth ||
    planePosition.y > gridHeight
  ) {
    discard;
  }

  vec2 patternPosition = vec2(planePosition.x, planePosition.y - patternOffsetY);
  vec2 wrapped = mod(
    patternPosition + vec2(gridLineAlignmentOffsetPx),
    u_cell_size
  );
  vec2 patternDerivative = max(fwidth(patternPosition), vec2(0.0001));
  vec2 antiAliasWidth = patternDerivative * gridLineAntialiasMultiplier;
  float horizontalCellSpanPx = u_cell_size / patternDerivative.y;
  float horizontalCompression = 1.0 - smoothstep(
    horizontalCompressionStartPx,
    horizontalCompressionEndPx,
    horizontalCellSpanPx
  );
  float verticalCellSpanPx = u_cell_size / patternDerivative.x;
  float sideDistance = abs((planePosition.x / gridWidth) * 2.0 - 1.0);
  float verticalEdgeCompression = smoothstep(
    verticalEdgeCompressionStart,
    verticalEdgeCompressionEnd,
    sideDistance
  );
  float verticalTopCompression = 1.0 - smoothstep(
    u_cell_size * verticalTopCompressionStartCells,
    u_cell_size * verticalTopCompressionEndCells,
    planePosition.y
  );
  float verticalCompression =
    (1.0 - smoothstep(
      verticalCompressionStartPx,
      verticalCompressionEndPx,
      verticalCellSpanPx
    )) * verticalEdgeCompression * verticalTopCompression;
  float horizontalSoftnessBoost = 1.0 + (horizontalCompression * 3.0);
  float verticalSoftnessBoost = 1.0 + (verticalCompression * 3.5);
  float verticalLod = smoothstep(
    verticalLodLevelStart,
    verticalLodLevelEnd,
    verticalCompression
  );
  float verticalLineFine = renderGridLine(
    wrapped.x,
    antiAliasWidth.x,
    verticalSoftnessBoost
  );
  float verticalWrappedLod = mod(
    patternPosition.x + gridLineAlignmentOffsetPx,
    u_cell_size * 2.0
  );
  float verticalLineCoarse = renderGridLine(
    verticalWrappedLod,
    antiAliasWidth.x,
    verticalSoftnessBoost + verticalLod
  );
  float verticalLine = max(
    verticalLineFine * (1.0 - verticalLod),
    verticalLineCoarse * verticalLod
  );
  float horizontalLodLevelOne = 1.0 - smoothstep(
    horizontalLodLevelOneStartPx,
    horizontalLodLevelOneEndPx,
    horizontalCellSpanPx
  );
  float horizontalLodLevelTwo = 1.0 - smoothstep(
    horizontalLodLevelTwoStartPx,
    horizontalLodLevelTwoEndPx,
    horizontalCellSpanPx
  );
  float horizontalLineFine = renderGridLine(
    wrapped.y,
    antiAliasWidth.y,
    horizontalSoftnessBoost
  );
  float horizontalWrappedLodOne = mod(
    patternPosition.y + gridLineAlignmentOffsetPx,
    u_cell_size * 2.0
  );
  float horizontalWrappedLodTwo = mod(
    patternPosition.y + gridLineAlignmentOffsetPx,
    u_cell_size * 4.0
  );
  float horizontalLineCoarse = renderGridLine(
    horizontalWrappedLodOne,
    antiAliasWidth.y,
    horizontalSoftnessBoost + horizontalLodLevelOne
  );
  float horizontalLineExtraCoarse = renderGridLine(
    horizontalWrappedLodTwo,
    antiAliasWidth.y,
    horizontalSoftnessBoost + horizontalLodLevelOne + horizontalLodLevelTwo
  );
  float horizontalLineReduced = max(
    horizontalLineFine * (1.0 - horizontalLodLevelOne),
    horizontalLineCoarse * horizontalLodLevelOne
  );
  float horizontalLine = max(
    horizontalLineReduced * (1.0 - horizontalLodLevelTwo),
    horizontalLineExtraCoarse * horizontalLodLevelTwo
  );
  float line = max(verticalLine, horizontalLine);

  if (line <= 0.001) {
    discard;
  }

  float alpha = u_line_color.a * line;
  gl_FragColor = vec4(u_line_color.rgb * alpha, alpha);
}
`,S;function C(e,t,n){return Math.min(Math.max(e,t),n)}function w(e,t,n){let r=e.createShader(t);return r?(e.shaderSource(r,n),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS)?r:(e.deleteShader(r),null)):null}function T(e){let t=w(e,e.VERTEX_SHADER,b),n=w(e,e.FRAGMENT_SHADER,x);if(!t||!n)return null;let r=e.createProgram();return r?(e.attachShader(r,t),e.attachShader(r,n),e.linkProgram(r),e.deleteShader(t),e.deleteShader(n),e.getProgramParameter(r,e.LINK_STATUS)?r:(e.deleteProgram(r),null)):(e.deleteShader(t),e.deleteShader(n),null)}function E(e,t){let n=e.getAttribLocation(t,`a_position`),r=e.getUniformLocation(t,`u_angle`),i=e.getUniformLocation(t,`u_cell_size`),a=e.getUniformLocation(t,`u_container_size`),o=e.getUniformLocation(t,`u_device_pixel_ratio`),s=e.getUniformLocation(t,`u_line_color`),c=e.getUniformLocation(t,`u_time`),l=e.getUniformLocation(t,`u_viewport_size`);return n<0||!r||!i||!a||!o||!s||!c||!l?null:{attributeLocation:n,program:t,uniforms:{angle:r,cellSize:i,containerSize:a,devicePixelRatio:o,lineColor:s,time:c,viewportSize:l}}}function D(e){let t=document.documentElement;return t.classList.contains(`dark`)?!0:!t.classList.contains(`light`)&&e.matches}function O(){if(S!==void 0)return S;let e=document.createElement(`canvas`);return e.width=1,e.height=1,S=e.getContext(`2d`,{willReadFrequently:!0}),S}function k(e,t){let n=document.createElement(`span`);n.style.color=e,n.style.opacity=`0`,n.style.pointerEvents=`none`,n.style.position=`absolute`,t.appendChild(n);let r=getComputedStyle(n).color;n.remove();let i=O();if(!i)return new Float32Array([.5,.5,.5,1]);i.clearRect(0,0,1,1),i.fillStyle=r,i.fillRect(0,0,1,1);let a=i.getImageData(0,0,1,1).data;return new Float32Array([a[0]/255,a[1]/255,a[2]/255,a[3]/255])}function A(e,t){return{animation:`${v} ${o}s linear infinite`,backgroundImage:`linear-gradient(to right, ${t} 1px, transparent 0), linear-gradient(to bottom, ${t} 1px, transparent 0)`,backgroundRepeat:`repeat`,backgroundSize:`${e}px ${e}px`,transform:`translateY(-50%)`}}function j({className:e,angle:t=65,cellSize:n=60,opacity:o=.5,lightLineColor:s=`gray`,darkLineColor:c=`gray`,style:l,...u}){let d=(0,i.useRef)(null),f=(0,i.useRef)(null),[p,v]=(0,i.useState)(!1),b=(0,i.useRef)(t),x=(0,i.useRef)(n),S=(0,i.useRef)(c),w=(0,i.useRef)(s),O=(0,i.useRef)(null);(0,i.useEffect)(()=>{b.current=t,x.current=n,S.current=c,w.current=s,O.current?.()},[t,n,c,s]),(0,i.useEffect)(()=>{let e=d.current,t=f.current;if(!e||!t)return;let n=window.matchMedia(`(prefers-reduced-motion: reduce)`),r=window.matchMedia(`(prefers-color-scheme: dark)`),i=null,a=0,o=0,s=1,c=null,l=!0,u=!1,p=k(w.current,t),_=null,y=null,A=()=>{let t=e.getContext(`webgl`,{alpha:!0,antialias:!0,premultipliedAlpha:!0});return!t||!t.getExtension(`OES_standard_derivatives`)?null:t},j=e=>{e&&c&&(_&&c.deleteBuffer(_),y&&c.deleteProgram(y.program)),_=null,y=null,e&&(c=null)},M=()=>{let e=A();if(!e)return j(!1),!1;c=e,j(!0),c=e;let t=T(e);if(!t)return!1;let n=E(e,t);if(!n)return e.deleteProgram(t),!1;let r=e.createBuffer();return r?(e.bindBuffer(e.ARRAY_BUFFER,r),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),_=r,y=n,!0):(e.deleteProgram(t),!1)},N=()=>{p=k(D(r)?S.current:w.current,t)},P=()=>{a=Math.floor(t.clientWidth),o=Math.floor(t.clientHeight),a!==0&&o!==0&&c&&(s=Math.min(window.devicePixelRatio||1,h),e.width=Math.floor(a*s),e.height=Math.floor(o*s),e.style.width=`${a}px`,e.style.height=`${o}px`,c.viewport(0,0,e.width,e.height))},F=e=>{a!==0&&o!==0&&c&&_&&y&&!u&&(c.useProgram(y.program),c.bindBuffer(c.ARRAY_BUFFER,_),c.enableVertexAttribArray(y.attributeLocation),c.vertexAttribPointer(y.attributeLocation,2,c.FLOAT,!1,0,0),c.clearColor(0,0,0,0),c.clear(c.COLOR_BUFFER_BIT),c.uniform1f(y.uniforms.angle,C(b.current,g,m)),c.uniform1f(y.uniforms.cellSize,Math.max(x.current,1)),c.uniform2f(y.uniforms.containerSize,a,o),c.uniform1f(y.uniforms.devicePixelRatio,s),c.uniform4fv(y.uniforms.lineColor,p),c.uniform1f(y.uniforms.time,n.matches?0:e/1e3),c.uniform2f(y.uniforms.viewportSize,window.innerWidth,window.innerHeight),c.drawArrays(c.TRIANGLES,0,3))},I=()=>{i!==null&&(cancelAnimationFrame(i),i=null)},L=e=>{F(e),i=!n.matches&&l?requestAnimationFrame(L):null},R=()=>{u||(!c||!_||!y)&&!M()?(I(),v(!1)):(P(),a===0||o===0?I():(N(),F(performance.now()),v(!0),n.matches||!l?I():i===null&&(i=requestAnimationFrame(L))))};O.current=R;let z=new ResizeObserver(()=>{R()});z.observe(t);let B=()=>{R()},V=new IntersectionObserver(([e])=>{l=e?.isIntersecting??!1,l?R():I()});V.observe(t);let H=new MutationObserver(()=>{R()});H.observe(document.documentElement,{attributeFilter:[`class`],attributes:!0});let U=()=>{R()},W=()=>{R()},G=e=>{e.preventDefault(),u=!0,I(),j(!1),v(!1)},K=()=>{u=!1,R()};return n.addEventListener(`change`,U),r.addEventListener(`change`,W),window.addEventListener(`resize`,B),e.addEventListener(`webglcontextlost`,G),e.addEventListener(`webglcontextrestored`,K),R(),()=>{I(),z.disconnect(),V.disconnect(),H.disconnect(),n.removeEventListener(`change`,U),r.removeEventListener(`change`,W),window.removeEventListener(`resize`,B),e.removeEventListener(`webglcontextlost`,G),e.removeEventListener(`webglcontextrestored`,K),O.current=null,j(!u)}},[]);let j={...l,opacity:o},M=C(t,g,m),N=Math.max(n,1),P={perspective:`${_}px`},F={transform:`rotateX(${M}deg)`},I=A(N,s),L=A(N,c);return(0,a.jsxs)(`div`,{ref:f,className:r(`pointer-events-none absolute size-full overflow-hidden`,e),style:j,...u,children:[(0,a.jsx)(`style`,{children:y}),p?null:(0,a.jsx)(`div`,{className:`absolute inset-0`,style:P,children:(0,a.jsxs)(`div`,{className:`absolute inset-0`,style:F,children:[(0,a.jsx)(`div`,{"data-retro-grid-scroll":`true`,className:`absolute inset-[0%_0px] ml-[-200%] h-[300vh] w-[600vw] origin-[100%_0_0] dark:hidden`,style:I}),(0,a.jsx)(`div`,{"data-retro-grid-scroll":`true`,className:`absolute inset-[0%_0px] ml-[-200%] hidden h-[300vh] w-[600vw] origin-[100%_0_0] dark:block`,style:L})]})}),(0,a.jsx)(`canvas`,{ref:d,className:r(`absolute inset-0 size-full`,p?`opacity-100`:`opacity-0`)}),(0,a.jsx)(`div`,{className:`absolute inset-0 bg-linear-to-t from-white to-transparent to-90% dark:from-black`})]})}function M(){return(0,a.jsxs)(`div`,{className:`bg-background relative flex h-[500px] w-full flex-col items-center justify-center overflow-hidden rounded-lg border`,children:[(0,a.jsx)(`span`,{className:`pointer-events-none z-10 bg-linear-to-b from-[#ffd319] via-[#ff2975] to-[#8c1eff] bg-clip-text text-center text-7xl leading-none font-bold tracking-tighter whitespace-pre-wrap text-transparent`,children:`Retro Grid`}),(0,a.jsx)(j,{})]})}export{M as default};