import{n as e}from"./ShaderSurface-DjQw_LIl.js";import{t}from"./index-TChZs6Gr.js";var n=t(),r=`
uniform float u_scale; // size of the shapes
uniform float u_warp;  // how much the flow folds into itself
uniform float u_sheen; // light on the folds
uniform float u_angle; // direction the colours run, degrees
uniform float u_sweep; // how far apart the first and last colours sit
uniform float u_vignette; // darkening toward the corners
uniform float u_twist;  // how strongly the pointer twists the silk

float fbm(vec3 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    sum += amp * snoise(p);
    p = p * 1.9 + vec3(1.7, 9.2, 0.3);
    amp *= 0.4;
  }
  return sum;
}

vec3 shade(vec2 frag) {
  float aspect = u_res.x / u_res.y;
  vec2 uv = frag / u_res;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * (0.75 / u_scale);
  float t = u_time * 0.06;

  // the pointer twists the flow around itself, strongest at its centre and fading out softly
  vec2 dp = (frag - u_pointer) / u_res.y;
  float pull = exp(-dot(dp, dp) / 0.05) * u_pointerAmt * u_twist;
  vec2 pc = (u_pointer / u_res - 0.5) * vec2(aspect, 1.0) * (0.75 / u_scale);
  float ra = pull * 1.4;
  p = pc + mat2(cos(ra), -sin(ra), sin(ra), cos(ra)) * (p - pc);

  vec2 q = vec2(fbm(vec3(p, t)), fbm(vec3(p + vec2(5.2, 1.3), t)));
  vec2 r = vec2(
    fbm(vec3(p + 0.8 * u_warp * q + vec2(1.7, 9.2), t * 1.3)),
    fbm(vec3(p + 0.8 * u_warp * q + vec2(8.3, 2.8), t * 1.3))
  );
  float f = fbm(vec3(p + 0.8 * u_warp * r, t * 0.8));

  // a slow sweep underneath, so both ends of the colour list always show
  float a = radians(u_angle);
  float sweep = dot(uv - 0.5, vec2(cos(a), sin(a)));
  vec3 lab = paletteRamp(0.5 + f * 0.85 + sweep * u_sweep);

  lab.x += u_sheen * 0.08 * (smoothstep(0.05, 0.5, length(r)) - 0.4 + pull * 0.6);
  lab.x *= 1.0 - 0.36 * u_vignette * dot(uv - 0.5, uv - 0.5);
  return oklabToLinear(lab);
}
`,i=[`#07142e`,`#123a7c`,`#2b6bd6`,`#7db4f2`,`#dcebfc`];function a({colors:t=i,speed:a=1,animate:o=!0,grain:s=.08,scale:c=1,warp:l=1,sheen:u=.6,grainSize:d=1,angle:f=30,sweep:p=.7,vignette:m=.5,seed:h=0,interactive:g=!0,twist:_=1,...v}){return(0,n.jsx)(e,{shader:r,uniforms:{u_scale:c,u_warp:l,u_sheen:u,u_angle:f,u_sweep:p,u_vignette:m,u_twist:_},colors:t,speed:a,animate:o,interactive:g,follow:.85,grain:s,grainSize:d,seed:h,fallback:()=>`linear-gradient(${90-f}deg, ${t.join(`, `)})`,...v})}function o(){return(0,n.jsx)(a,{className:`h-[440px] w-[720px] max-w-full rounded-2xl`})}export{o as default};