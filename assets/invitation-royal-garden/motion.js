/* Animate alpha-only decorations. Background plates never enter the renderer. */
(() => {
  'use strict';
  // Decorative motion runs on touch devices too; text transitions are handled separately.
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const scenes = new Map();
  const settings = {
    // Coordinates are on the 600 × 1100 invitation. Each leaf bends from a fixed root.
    // Whole sprigs rotate at their stem joints; their silhouettes never stretch.
    welcome: {branches: [
      {root:[49,156], angle:2.8, period:5.4, path:'M47 155L51 155L71 170L87 203L78 211L53 203L41 209L24 235L8 235L3 162Z'},
      {root:[149,88], angle:3.2, period:5.8, path:'M147 87L160 87L177 103L173 157L120 158L120 124L137 110Z'},
      {root:[206,72], angle:3.6, period:6.1, path:'M201 70L211 73L230 92L225 110L223 165L181 183L162 183L165 147L177 124L181 102L195 93Z'},
      {root:[300,39], angle:3.0, period:5.6, path:'M296 35L304 35L308 58L319 69L331 101L329 109L253 109L257 64L285 45Z'},
      {root:[403,101], angle:3.4, period:6.4, path:'M398 100L409 100L426 116L436 151L457 170L477 188L478 205L434 197L407 169L387 140L382 117Z'},
      {root:[455,102], angle:3.0, period:5.3, path:'M451 100L460 100L465 112L479 129L478 157L449 155L437 130L437 115Z'},
      {root:[541,157], angle:2.6, period:6.0, path:'M538 154L546 154L568 167L586 193L586 246L544 244L516 265L501 253L507 217L529 193L541 181Z'}
    ]},
    wedding: {leaves: [
      [34,223,208,39,29,7.0,3.79,0], [48,225,303,126,27,9.1,4.18,1.4],
      [45,291,323,207,30,8.05,3.55,2.8], [38,343,290,281,28,7.0,4.37,3.7],
      [24,406,323,361,29,8.75,3.98,4.6]
    ]},
    haldi: {pendants: [
      {origin:'70.2% 2%', angle:'2.2deg', period:'3.3s', clip:'polygon(62% 0,78% 0,78% 17.6%,75.5% 19.2%,62% 19.2%)'},
      {origin:'82.8% 2%', angle:'1.8deg', period:'3.7s', clip:'polygon(80% 0,97% 0,97% 26%,72% 26%,72% 19.2%,78% 17.6%,80% 17.6%)'}
    ]},
    phere: {background:'phere-background-v2.png', pendants: [
      {origin:'26% 0%', angle:'1.4deg', period:'4.1s', clip:'inset(0 50% 68% 0)', placement:'translate(8.6%, -8.5%) scale(.75)'},
      {src:'phere-garlands.png', origin:'5% 0%', angle:'.75deg', period:'6.2s', clip:'inset(0 90% 37% 0)'},
      {src:'phere-garlands.png', origin:'11.6% 0%', angle:'1.2deg', period:'5.4s', clip:'inset(0 85% 65% 10%)'},
      {src:'phere-garlands.png', origin:'88.3% 0%', angle:'1.1deg', period:'5.8s', clip:'inset(0 9% 63% 85%)'},
      {src:'phere-garlands.png', origin:'95% 0%', angle:'.65deg', period:'6.9s', clip:'inset(0 0 36% 91%)'}
    ]},
    sangeet: {background:'sangeet-background-v2.png', pendants: [
      {origin:'55.2% 6.5%', angle:'3deg', period:'3.5s', clip:'inset(5% 39% 81% 49%)'},
      {src:'sangeet-right-lantern.png', origin:'87.4% 0%', angle:'2.2deg', period:'4.6s', clip:'inset(0 4% 76% 79%)'}
    ]}
  };
  let frame = 0, previous = 0;
  function tick(now) {
    frame = 0;
    const dt = previous ? Math.min((now - previous) / 1000, .05) : 0;
    previous = now;
    for (const scene of scenes.values()) {
      if (scene.active && scene.render) {
        scene.time += dt;
        scene.render(scene.time);
      }
    }
    if ([...scenes.values()].some(scene => scene.active && scene.render)) frame = requestAnimationFrame(tick);
    else previous = 0;
  }
  function sync() {
    for (const [page, scene] of scenes) {
      scene.active = scene.visible && !document.hidden && !reduced.matches && document.body.classList.contains('invitation-open');
      page.classList.toggle('foreground-active', scene.active);
    }
    const running = [...scenes.values()].some(scene => scene.active && scene.render);
    if (running && !frame) frame = requestAnimationFrame(tick);
    if (!running) { cancelAnimationFrame(frame); frame = 0; previous = 0; }
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const scene = scenes.get(entry.target);
      if (scene) scene.visible = entry.isIntersecting;
    }
    sync();
  }, {rootMargin:'0px'});

  function garland(image, branches) {
    const ns='http://www.w3.org/2000/svg';
    const node=(tag,attributes={})=>{
      const element=document.createElementNS(ns,tag);
      for(const [key,value] of Object.entries(attributes)) element.setAttribute(key,String(value));
      return element;
    };
    const svg=node('svg',{viewBox:'0 0 600 1100',class:'garland-elements','aria-hidden':'true'});
    const defs=node('defs');svg.append(defs);
    const mask=node('mask',{id:'garland-fixed',maskUnits:'userSpaceOnUse',x:0,y:0,width:600,height:1100});
    mask.append(node('rect',{width:600,height:1100,fill:'white'}));defs.append(mask);
    const picture=()=>node('image',{href:image.src,width:600,height:1100,preserveAspectRatio:'none'});
    const fixed=picture();fixed.setAttribute('mask','url(#garland-fixed)');svg.append(fixed);
    branches.forEach((branch,index)=>{
      // Cut only alpha artwork; paper and painted borders belong to a separate image.
      mask.append(node('path',{d:branch.path,fill:'black'}));
      const clip=node('clipPath',{id:`garland-sprig-${index}`,clipPathUnits:'userSpaceOnUse'});
      clip.append(node('path',{d:branch.path}));defs.append(clip);
      const group=node('g',{class:'garland-sprig'});
      group.style.transformOrigin=`${branch.root[0]}px ${branch.root[1]}px`;
      group.style.setProperty('--sway',`${branch.angle}deg`);
      group.style.setProperty('--period',`${branch.period}s`);
      group.style.animationDelay=`${index*-.73}s`;
      const sprig=picture();sprig.setAttribute('clip-path',`url(#garland-sprig-${index})`);
      group.append(sprig);svg.append(group);
    });
    return svg;
  }

  function foliage(image, leaves, paper) {
    const canvas = document.createElement('canvas');
    canvas.className = 'foliage-elements';
    const gl = canvas.getContext('webgl', {alpha:true, premultipliedAlpha:true, antialias:false, depth:false, powerPreference:'low-power'});
    if (!gl) return null;
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    try {
      const program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, `
        attribute vec2 point;
        varying vec2 uv;
        uniform float time;
        uniform vec4 branch[${leaves.length}];
        uniform vec4 breeze[${leaves.length}];
        void main() {
          vec2 p = point * vec2(600.0,1100.0);
          vec2 offset = vec2(0.0);
          for (int i=0; i<${leaves.length}; i++) {
            vec2 root = branch[i].xy, end = branch[i].zw;
            vec2 axis = end-root;
            float along = dot(p-root,axis)/dot(axis,axis);
            vec2 nearest = root + clamp(along,0.0,1.0)*axis;
            float mask = 1.0-smoothstep(breeze[i].x*.35,breeze[i].x,length(p-nearest));
            // Roots and connecting stems remain fixed; flex grows towards each tip.
            mask *= smoothstep(.15,.85,along);
            vec2 normal = normalize(vec2(-axis.y,axis.x));
            offset += normal * mask * breeze[i].y * sin(time*6.283185/breeze[i].z+breeze[i].w);
          }
          vec2 position = (p+offset)/vec2(600.0,1100.0);
          gl_Position = vec4(position.x*2.0-1.0,1.0-position.y*2.0,0.0,1.0);
          uv = point;
        }`));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, `
        precision mediump float;
        varying vec2 uv;
        uniform sampler2D artwork;
        void main(){ gl_FragColor=texture2D(artwork,uv); }
      `));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      const vertices = [], columns = 100, rows = 184;
      for (let y=0;y<rows;y++) for (let x=0;x<columns;x++) {
        const l=x/columns,r=(x+1)/columns,t=y/rows,b=(y+1)/rows;
        vertices.push(l,t,r,t,l,b,l,b,r,t,r,b);
      }
      const buffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
      const location=gl.getAttribLocation(program,'point');
      gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
      gl.uniform4fv(gl.getUniformLocation(program,'branch[0]'),new Float32Array(leaves.flatMap(leaf=>leaf.slice(0,4))));
      gl.uniform4fv(gl.getUniformLocation(program,'breeze[0]'),new Float32Array(leaves.flatMap(leaf=>leaf.slice(4))));
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
      // Only this transparent foreground image is sampled — never the scene background.
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
      gl.clearColor(0,0,0,0);
      const clock=gl.getUniformLocation(program,'time');
      let lastTime=0;
      function render(time) {
        lastTime=time;
        gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform1f(clock,time);
        gl.drawArrays(gl.TRIANGLES,0,vertices.length/2);
      }
      function resize() {
        const width=Math.max(1,Math.round(paper.clientWidth*Math.min(devicePixelRatio||1,2)));
        canvas.width=width;canvas.height=Math.round(width*1100/600);
        gl.viewport(0,0,canvas.width,canvas.height);render(lastTime);
      }
      new ResizeObserver(resize).observe(paper);resize();
      return {canvas,render};
    } catch (error) {
      console.warn('Leaf motion unavailable; keeping stationary decoration.',error.message);
      return null;
    }
  }

  async function prepare(page) {
    const definition=settings[page.id];
    if (!definition || page.id === 'welcome') return;
    const background=new Image(), foreground=new Image();
    background.src=definition.background || `${page.id}-background-layer.png`;
    foreground.src=`${page.id}-foreground-layer.png`;
    const extraImages=new Map();
    for(const pendant of definition.pendants || []) {
      if(pendant.src && !extraImages.has(pendant.src)) {
        const image=new Image();image.src=pendant.src;extraImages.set(pendant.src,image);
      }
    }
    // Reveal the replacement plate only when every separated decoration is ready.
    try { await Promise.all([background,foreground,...extraImages.values()].map(image=>image.decode())); }
    catch { return; }
    const paper=page.querySelector('.paper');
    const layer=document.createElement('div');
    layer.className='painting-layers';layer.setAttribute('aria-hidden','true');
    background.className='scene-background';background.alt='';layer.append(background);
    const scene={visible:false,active:false,time:0};
    if (definition.branches) {
      layer.append(garland(foreground,definition.branches));
    } else if (definition.leaves) {
      // Keep a stationary transparent fallback underneath, revealed only on context loss.
      foreground.alt='';foreground.className='stationary-foliage';layer.append(foreground);
      const animation=foliage(foreground,definition.leaves,paper);
      if (animation) {
        foreground.hidden=true;layer.append(animation.canvas);scene.render=animation.render;
        animation.canvas.addEventListener('webglcontextlost',()=>{
          animation.canvas.hidden=true;foreground.hidden=false;scene.render=null;sync();
        });
      }
    } else {
      definition.pendants.forEach((pendant,index)=>{
        const placement=document.createElement('div');placement.className='foreground-placement';
        if(pendant.placement) placement.style.transform=pendant.placement;
        const element=(pendant.src ? extraImages.get(pendant.src) : foreground).cloneNode();element.alt='';element.className='foreground-element';
        element.style.transformOrigin=pendant.origin;element.style.clipPath=pendant.clip;
        element.style.setProperty('--sway',pendant.angle);element.style.setProperty('--period',pendant.period);
        element.style.animationDelay=`${index*-2.1}s`;
        placement.append(element);layer.append(placement);
      });
    }
    paper.prepend(layer);paper.classList.add('has-layered-motion');
    scenes.set(page,scene);observer.observe(page);sync();
  }
  document.querySelectorAll('.event').forEach(prepare);
  document.addEventListener('invitation:opened',sync);
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync);
})();
