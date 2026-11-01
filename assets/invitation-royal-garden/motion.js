/* Continuous, seamless botanical motion. One texture, never sliced into tiles. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pages = [...document.querySelectorAll('.event')];
  const scenes = [];
  let frame = 0, previous = 0;
  const vertex = `
    attribute vec2 position;
    varying vec2 uv;
    void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}
  `;
  const fragment = `
    precision highp float;
    varying vec2 uv;
    uniform sampler2D artwork;
    uniform float time;
    // Smooth envelopes become exactly zero in the surrounding paper.
    // The coordinate field stays continuous across every leaf and stem.
    vec2 breeze(vec2 p,vec2 center,vec2 radius,vec2 anchor,float angle,float period,float phase){
      float r=length((p-center)/radius);
      float envelope=1.-smoothstep(.18,1.,r);
      float wave=sin(time*6.2831853/period+phase);
      float a=angle*wave*envelope;
      vec2 arm=p-anchor;
      return vec2(-arm.y,arm.x)*a;
    }
    void main(){
      vec2 p=vec2(uv.x,1.-uv.y)*vec2(600.,800.);
      vec2 d=vec2(0.);
      d+=breeze(p,vec2(181.,77.),vec2(97.,86.),vec2(135.,39.),.035,7.8,.2);
      d+=breeze(p,vec2(302.,39.),vec2(72.,62.),vec2(300.,0.),.031,6.4,1.8);
      d+=breeze(p,vec2(430.,99.),vec2(100.,108.),vec2(414.,46.),-.035,8.7,3.2);
      d+=breeze(p,vec2(535.,154.),vec2(51.,72.),vec2(568.,157.),.040,7.1,1.1);
      d+=breeze(p,vec2(49.,274.),vec2(41.,86.),vec2(32.,341.),.037,6.8,2.1);
      d+=breeze(p,vec2(566.,398.),vec2(61.,84.),vec2(599.,467.),-.037,9.2,4.0);
      d+=breeze(p,vec2(60.,628.),vec2(81.,52.),vec2(63.,663.),.036,8.2,2.8);
      d+=breeze(p,vec2(550.,663.),vec2(74.,40.),vec2(555.,697.),-.040,7.6,5.1);
      // Pin the outside edge and keep the architecture, border and copy still.
      float edge=smoothstep(31.,42.,min(p.x,600.-p.x));
      edge*=smoothstep(0.,18.,p.y-.55*abs(p.x-300.));
      d*=edge;
      vec2 source=clamp(p-d,vec2(.5),vec2(599.5,799.5));
      gl_FragColor=texture2D(artwork,vec2(source.x/600.,1.-source.y/800.));
    }
  `;
  function shader(gl, type, source) {
    const result=gl.createShader(type);
    gl.shaderSource(result,source);gl.compileShader(result);
    if(!gl.getShaderParameter(result,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result));
    return result;
  }
  function stop(){cancelAnimationFrame(frame);frame=0;previous=0;}
  function tick(now){
    frame=0;
    if(reduced.matches || document.hidden) return;
    if(!previous || now-previous>=32){
      const elapsed=previous ? Math.min((now-previous)/1000,.1) : 0;
      previous=now;
      for(const scene of scenes){
        if(!scene.visible || scene.paused || scene.lost) continue;
        scene.time+=elapsed;
        scene.draw();
      }
    }
    if(scenes.some(s=>s.visible&&!s.paused&&!s.lost)) frame=requestAnimationFrame(tick);
  }
  function start(){if(!frame&&!reduced.matches&&!document.hidden) frame=requestAnimationFrame(tick);}
  function createScene(page, image){
    const canvas=page.querySelector('.living-art');
    const paper=page.querySelector('.paper');
    const button=page.querySelector('.motion-toggle');
    const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,powerPreference:'low-power'});
    if(!gl) return;
    try {
      const program=gl.createProgram();
      gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,vertex));
      gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,fragment));
      gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const location=gl.getAttribLocation(program,'position');
      gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
      const clock=gl.getUniformLocation(program,'time');
      const scene={visible:false,paused:false,lost:false,time:0,draw(){
        gl.uniform1f(clock,this.time);gl.drawArrays(gl.TRIANGLES,0,6);
        canvas.dataset.motionTime=this.time.toFixed(2);
      }};
      const resize=()=>{
        const width=Math.min(1200,Math.round(paper.clientWidth*Math.min(devicePixelRatio||1,2)));
        if(!width) return;
        canvas.width=width;canvas.height=Math.round(width*4/3);
        gl.viewport(0,0,canvas.width,canvas.height);scene.draw();
      };
      new ResizeObserver(resize).observe(paper);resize();
      new IntersectionObserver(entries=>{
        scene.visible=entries[0].isIntersecting;
        start();
      },{rootMargin:'40px'}).observe(page);
      canvas.addEventListener('webglcontextlost',()=>{
        scene.lost=true;paper.classList.remove('has-art-motion');button.hidden=true;
      });
      button.addEventListener('click',()=>{
        scene.paused=!scene.paused;
        button.setAttribute('aria-pressed',String(scene.paused));
        button.textContent=scene.paused?'Resume motion':'Pause motion';
        button.setAttribute('aria-label',`${scene.paused?'Resume':'Pause'} gentle motion for ${page.getAttribute('aria-label')}`);
        start();
      });
      scenes.push(scene);paper.classList.add('has-art-motion');
      button.hidden=reduced.matches;
    } catch(error) {
      // The complete still illustration remains available on unsupported devices.
      console.warn('Botanical motion unavailable:',error.message);
    }
  }
  const image=new Image();
  image.onload=()=>{pages.forEach(page=>createScene(page,image));start();};
  image.src=document.querySelector('image.still-art').getAttribute('href');
  document.addEventListener('visibilitychange',()=>{if(document.hidden) stop();else start();});
  reduced.addEventListener('change',()=>{
    pages.forEach(page=>{page.querySelector('.motion-toggle').hidden=reduced.matches||!page.querySelector('.paper').classList.contains('has-art-motion');});
    if(reduced.matches)stop();else start();
  });
})();
