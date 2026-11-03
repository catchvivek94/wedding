/* Animate alpha-only decorations. Background plates never enter the renderer. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const scenes = new Map();
  const settings = {
    // Coordinates are on the 600 × 1100 invitation. Each leaf bends from a fixed root.
    welcome: {leaves: [
      [289,14,277,82,28,1.4,7.3,0], [230,34,201,130,25,2.1,6.7,1.1],
      [171,72,145,178,24,2.0,7.9,2.3], [108,116,80,203,26,1.8,6.9,3.2],
      [367,42,399,139,26,2.0,8.1,1.8], [426,89,455,180,24,1.8,7.1,4.1],
      [507,125,555,247,30,2.3,8.4,2.8]
    ]},
    wedding: {leaves: [
      [34,223,208,39,29,2.0,7.9,0], [48,225,303,126,27,2.6,8.7,1.4],
      [45,291,323,207,30,2.3,7.4,2.8], [38,343,290,281,28,2.0,9.1,3.7],
      [24,406,323,361,29,2.5,8.3,4.6]
    ]},
    haldi: {pendants: [
      {origin:'70.2% 2%', angle:'.8deg', period:'6.8s', clip:'polygon(62% 0,78% 0,78% 17.6%,75.5% 19.2%,62% 19.2%)'},
      {origin:'82.8% 2%', angle:'.65deg', period:'7.7s', clip:'polygon(80% 0,97% 0,97% 26%,72% 26%,72% 19.2%,78% 17.6%,80% 17.6%)'}
    ]},
    phere: {pendants: [{origin:'26% 0%', angle:'.5deg', period:'8.5s', clip:'inset(0 50% 68% 0)', placement:'translate(8.6%, -8.5%) scale(.75)'}]},
    sangeet: {pendants: [{origin:'55.2% 6.5%', angle:'1.1deg', period:'7.2s', clip:'inset(5% 39% 81% 49%)'}]}
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
    if (!definition) return;
    const background=new Image(), foreground=new Image();
    background.src=`${page.id}-background-layer.png`;
    foreground.src=`${page.id}-foreground-layer.png`;
    try { await Promise.all([background.decode(),foreground.decode()]); }
    catch { return; }
    const paper=page.querySelector('.paper');
    const layer=document.createElement('div');
    layer.className='painting-layers';layer.setAttribute('aria-hidden','true');
    background.className='scene-background';background.alt='';layer.append(background);
    const scene={visible:false,active:false,time:0};
    if (definition.leaves) {
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
        const element=foreground.cloneNode();element.alt='';element.className='foreground-element';
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
