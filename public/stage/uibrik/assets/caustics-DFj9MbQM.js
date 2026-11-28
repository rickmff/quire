import{i as e,n as t,t as n}from"./ShaderSurface-DjQw_LIl.js";import{t as r}from"./index-TChZs6Gr.js";var i=r(),a=240,o=`#version 300 es
precision highp float;
in vec2 a_pos;            // 0..1 across the light grid

uniform vec2 u_size;      // canvas size, device px
uniform float u_dpr;
uniform float u_time;
uniform float u_scale;    // size of the waves
uniform float u_waves;    // wave height
uniform float u_depth;    // how far below the surface the floor is: how strongly light focuses
uniform float u_channel;  // per-colour change in refraction
uniform float u_chop;     // irregular chop on top of the wave trains
uniform float u_direction; // the direction the main waves travel, degrees
uniform float u_rippleStrength;
uniform float u_rippleSize;  // wavelength of a click ripple
uniform float u_rippleSpeed;
uniform float u_touch;    // depth of the dip under the pointer
uniform vec2 u_pointer;   // device px, y up
uniform float u_pointerAmt;
uniform vec3 u_ripples[8]; // matches RIPPLE_COUNT in ShaderSurface

out vec2 v_old;
out vec2 v_new;

${n}

// water height at p (in wave units); px is the same point in device px
float height(vec2 p, vec2 px, float unit) {
  float t = u_time * 0.6;
  float h = 0.0;
  // a handful of wave trains from scattered directions; longer waves move faster, as on deep water
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float ang = radians(u_direction) + fi * 2.39996;
    vec2 d = vec2(cos(ang), sin(ang));
    float k = 1.0 + fi * 0.55;
    h += sin(dot(d, p) * k * 2.0 + t * sqrt(k) * 1.4 + fi * 1.7) / k;
  }
  // and some irregular chop, so it never looks like a pattern
  h += u_chop * snoise(vec3(p * 1.4, t * 0.45));
  h *= u_waves;

  // rings from clicks
  for (int i = 0; i < 8; i++) {
    vec3 r = u_ripples[i];
    if (r.z < 0.0 || r.z > 3.0) continue;
    float d = (length(px - r.xy) / unit - r.z * 1.8 * u_rippleSpeed) / u_rippleSize;
    float life = 1.0 - r.z / 3.0;
    h += 0.3 * u_rippleStrength * sin(d * 9.0) * exp(-d * d * 3.0) * life * life;
  }
  // a gentle dip under the pointer, like a fingertip resting on the water
  vec2 dp = (px - u_pointer) / unit;
  h -= u_touch * exp(-dot(dp, dp) * 6.0) * u_pointerAmt;
  return h;
}

void main() {
  vec2 px = mix(vec2(-0.1), vec2(1.1), a_pos) * u_size;
  float unit = 240.0 * u_scale * u_dpr;
  vec2 p = px / unit;
  float e = 0.02;
  vec2 slope = vec2(
    height(p + vec2(e, 0.0), px + vec2(e * unit, 0.0), unit) - height(p - vec2(e, 0.0), px - vec2(e * unit, 0.0), unit),
    height(p + vec2(0.0, e), px + vec2(0.0, e * unit), unit) - height(p - vec2(0.0, e), px - vec2(0.0, e * unit), unit)
  ) / (2.0 * e);
  vec2 landed = px - slope * u_depth * (1.0 + u_channel) * unit * 0.05;
  v_old = px;
  v_new = landed;
  gl_Position = vec4(landed / u_size * 2.0 - 1.0, 0.0, 1.0);
}
`,s=`#version 300 es
precision highp float;
in vec2 v_old;
in vec2 v_new;
out vec4 outColor;
void main() {
  // brightness = how much this bit of the grid shrank on its way to the floor
  float before = length(dFdx(v_old)) * length(dFdy(v_old));
  float after = length(dFdx(v_new)) * length(dFdy(v_new));
  // stored at a quarter, so an 8-bit target still holds up to 4x the plain light
  // capped, so a triangle squashed almost flat can't turn into a spike of light
  outColor = vec4(vec3(min(before / max(after, 1e-6), 12.0) * 0.25), 1.0);
}
`;function c(t){let n=e(t,o,s);if(!n)return null;let r=new Float32Array(116162);for(let e=0;e<241;e++)for(let t=0;t<241;t++)r.set([t/a,e/a],(e*241+t)*2);let i=new Uint16Array(345600),c=0;for(let e=0;e<a;e++)for(let t=0;t<a;t++){let n=e*241+t;i.set([n,n+1,n+241,n+1,n+241+1,n+241],c),c+=6}let l=t.createVertexArray();t.bindVertexArray(l);let u=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,u),t.bufferData(t.ARRAY_BUFFER,r,t.STATIC_DRAW);let d=t.getAttribLocation(n,`a_pos`);t.enableVertexAttribArray(d),t.vertexAttribPointer(d,2,t.FLOAT,!1,0,0);let f=t.createBuffer();t.bindBuffer(t.ELEMENT_ARRAY_BUFFER,f),t.bufferData(t.ELEMENT_ARRAY_BUFFER,i,t.STATIC_DRAW),t.bindVertexArray(null);let p=!!t.getExtension(`EXT_color_buffer_float`),m=t.createTexture(),h=t.createFramebuffer(),g=0,_=0,v=new Map,y=e=>(v.has(e)||v.set(e,t.getUniformLocation(n,e)),v.get(e));return{render(e,t){let r=Math.max(1,Math.round(t.width/1.5)),a=Math.max(1,Math.round(t.height/1.5));(r!==g||a!==_)&&(g=r,_=a,e.bindTexture(e.TEXTURE_2D,m),p?e.texImage2D(e.TEXTURE_2D,0,e.RGBA16F,r,a,0,e.RGBA,e.HALF_FLOAT,null):e.texImage2D(e.TEXTURE_2D,0,e.RGBA8,r,a,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR_MIPMAP_LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindFramebuffer(e.FRAMEBUFFER,h),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,m,0)),e.bindFramebuffer(e.FRAMEBUFFER,h),e.viewport(0,0,r,a),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.useProgram(n),e.bindVertexArray(l),e.uniform2f(y(`u_size`),t.width,t.height),e.uniform1f(y(`u_dpr`),t.dpr),e.uniform1f(y(`u_time`),t.time),e.uniform1f(y(`u_scale`),t.uniforms.u_scale??1),e.uniform1f(y(`u_waves`),t.uniforms.u_waves??1),e.uniform1f(y(`u_depth`),t.uniforms.u_depth??1),e.uniform1f(y(`u_chop`),t.uniforms.u_chop??.55),e.uniform1f(y(`u_direction`),t.uniforms.u_direction??23),e.uniform1f(y(`u_rippleStrength`),t.uniforms.u_rippleStrength??.35),e.uniform1f(y(`u_rippleSize`),t.uniforms.u_rippleSize??1),e.uniform1f(y(`u_rippleSpeed`),t.uniforms.u_rippleSpeed??1),e.uniform1f(y(`u_touch`),t.uniforms.u_touch??.5),e.uniform2f(y(`u_pointer`),t.pointer[0],t.pointer[1]),e.uniform1f(y(`u_pointerAmt`),t.pointerAmt),e.uniform3fv(y(`u_ripples`),t.ripples),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE);let o=(t.uniforms.u_dispersion??.5)*.04,s=[[!0,!1,!1,-o],[!1,!0,!1,0],[!1,!1,!0,o]];for(let[t,n,r,a]of s)e.colorMask(t,n,r,!1),e.uniform1f(y(`u_channel`),a),e.drawElements(e.TRIANGLES,i.length,e.UNSIGNED_SHORT,0);return e.bindTexture(e.TEXTURE_2D,m),e.generateMipmap(e.TEXTURE_2D),m},dispose(e){e.deleteProgram(n),e.deleteBuffer(u),e.deleteBuffer(f),e.deleteVertexArray(l),e.deleteTexture(m),e.deleteFramebuffer(h)}}}var l=`
uniform sampler2D u_tex;   // caustic light, a quarter of its real value per channel
uniform float u_strength;  // how strong the light is against the plain floor
uniform float u_scale;
uniform float u_shade;     // how much the floor colour varies
uniform float u_softness;  // blur on the light, like a larger sun
uniform float u_vignette;  // darkening toward the corners
uniform float u_bloom;     // glow spilling around the brightest light
uniform float u_sparkle;   // star glints where the light peaks
uniform float u_sparkleSize; // length of the glint rays
uniform float u_rayAngle;  // direction of the long glint rays, degrees

vec3 lightAt(vec2 uv) {
  return textureLod(u_tex, uv, 0.0).rgb * 4.0;
}

vec3 shade(vec2 frag) {
  vec2 uv = frag / u_res;
  vec3 light = texture(u_tex, uv).rgb * 4.0;
  if (u_softness > 0.0) {
    vec2 o = u_softness * 6.0 * u_dpr / u_res;
    light = light * 0.4 + (
      texture(u_tex, uv + vec2(o.x, 0.0)).rgb + texture(u_tex, uv - vec2(o.x, 0.0)).rgb +
      texture(u_tex, uv + vec2(0.0, o.y)).rgb + texture(u_tex, uv - vec2(0.0, o.y)).rgb
    ) * 0.6;
  }

  // the floor: slow, broad variation between the deeper and shallower colours
  float t = u_time * 0.03;
  vec2 p = frag / u_res.y / u_scale;
  float n = snoise(vec3(p * 0.8, t)) * 0.6 + snoise(vec3(p * 2.1 + 4.0, t * 1.4)) * 0.25;
  float top = float(u_count - 2) / float(u_count - 1); // the last colour is the light
  vec3 floorLab = paletteRamp(clamp(0.5 + 0.5 * n * u_shade, 0.0, 1.0) * top);
  vec3 floorCol = oklabToLinear(floorLab);
  vec3 sun = oklabToLinear(u_colors[u_count - 1]);

  // plain light is 1; focused light is more, the gaps between less
  vec3 lit = mix(vec3(1.0), light, u_strength);
  vec3 c = floorCol * (0.62 + 0.38 * lit) + sun * max(lit - 1.0, 0.0) * 0.16 * u_strength;
  // bloom: the light above plain daylight spills softly around itself, read from two blurred
  // (mipmap) levels of the light texture: smooth, and no extra samples
  if (u_bloom > 0.0) {
    vec3 wide = (textureLod(u_tex, uv, 1.5).rgb * 0.55 + textureLod(u_tex, uv, 3.0).rgb * 0.45) * 4.0;
    vec3 excess = max(wide - 1.0, 0.0) * 0.8;
    c += mix(sun, vec3(1.0), 0.5) * excess * u_bloom * 0.45 * u_strength;
  }

  // sun glints: a soft star wherever the light peaks. One candidate spot per cell, lit only when
  // the caustic light there is at its brightest; it twinkles, and its rays taper off softly.
  if (u_sparkle > 0.0) {
    float cs = 70.0 * max(u_sparkleSize, 1.0) * u_dpr;
    vec2 home = floor(frag / cs);
    float ra = radians(u_rayAngle);
    vec2 d1 = vec2(cos(ra), sin(ra));
    vec2 d2 = vec2(-d1.y, d1.x);
    float star = 0.0;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 cell = home + vec2(float(i), float(j));
        vec2 spot = (cell + 0.2 + 0.6 * vec2(hash12(cell + 1.3), hash12(cell + 5.1))) * cs;
        float peak = smoothstep(1.1, 1.8, dot(lightAt(spot / u_res), vec3(0.3333)));
        if (peak <= 0.0) continue;
        float tw = 0.55 + 0.45 * sin(u_time * (2.0 + 2.0 * hash12(cell + 2.2)) + hash12(cell) * 40.0);
        vec2 d = frag - spot;
        float L = 34.0 * u_sparkleSize * u_dpr * (0.6 + 0.8 * hash12(cell + 9.0));
        float w = 1.1 * u_dpr;
        float along1 = dot(d, d1);
        float along2 = dot(d, d2);
        float core = exp(-dot(d, d) / pow(3.5 * u_dpr * u_sparkleSize, 2.0));
        float halo = exp(-dot(d, d) / pow(L * 0.55, 2.0)) * 0.45;
        float ray1 = exp(-pow(along2 / w, 2.0)) * exp(-pow(along1 / L, 2.0));
        float ray2 = exp(-pow(along1 / w, 2.0)) * exp(-pow(along2 / (L * 0.55), 2.0));
        star += (core + halo + 0.7 * ray1 + 0.4 * ray2) * peak * tw;
      }
    }
    c += mix(sun, vec3(1.0), 0.6) * star * u_sparkle * 0.55;
  }

  // depth haze: the far corners sink a little
  c *= 1.0 - 0.5 * u_vignette * dot(uv - 0.5, uv - 0.5);
  return c;
}
`,u=[`#0b3a53`,`#0f6f8f`,`#3fb6c9`,`#e6fbff`];function d({colors:e=u,speed:n=1,animate:r=!0,interactive:a=!0,grain:o=.015,seed:s=0,scale:d=1,waves:f=.35,depth:p=1.4,strength:m=.6,dispersion:h=.5,shade:g=.8,chop:_=.55,direction:v=23,softness:y=.05,vignette:b=.25,bloom:x=1.1,sparkle:S=1.25,sparkleSize:C=1,rayAngle:w=70,ripples:T=!0,rippleStrength:E=.35,rippleSize:D=1,rippleSpeed:O=1,touch:k=.5,follow:A=.75,...j}){return(0,i.jsx)(t,{shader:l,prepass:c,uniforms:{u_scale:d,u_waves:f,u_depth:p,u_strength:m,u_dispersion:h,u_shade:g,u_chop:_,u_direction:v,u_softness:y,u_vignette:b,u_bloom:x,u_sparkle:S,u_sparkleSize:C,u_rayAngle:w,u_rippleStrength:E,u_rippleSize:D,u_rippleSpeed:O,u_touch:k},colors:e,speed:n,animate:r,interactive:a,grain:o,seed:s,ripples:T,follow:A,fallback:()=>`radial-gradient(at 30% 20%, ${e[e.length-1]}40, transparent 55%), linear-gradient(160deg, ${e.slice(0,-1).join(`, `)})`,...j})}function f(){return(0,i.jsx)(d,{className:`h-[440px] w-[720px] max-w-full rounded-2xl`})}export{f as default};