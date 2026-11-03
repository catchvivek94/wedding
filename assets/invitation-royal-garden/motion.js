/* Continuous, seamless botanical motion. One texture, never sliced into tiles. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pages = [...document.querySelectorAll('.event')];
  const scenes = [];
  let frame = 0, previous = 0;
  const button=document.getElementById("motion-control");
  let paused=false;
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
    uniform vec2 pageSize;
    uniform float theme;
    // Smooth envelopes become exactly zero in the surrounding paper.
    // The coordinate field stays continuous across every leaf and stem.
    vec2 breeze(vec2 p,vec2 center,vec2 radius,vec2 anchor,float angle,float period,float phase){
      float r=length((p-center)/radius);
      float envelope=1.-smoothstep(.35,1.,r);
      float t=time*6.2831853/period+phase;
      float wave=.82*sin(t)+.18*sin(t*1.73+phase);
      float a=angle*1.0*wave*envelope;
      vec2 arm=p-anchor;
      return vec2(-arm.y,arm.x)*a;
    }
    void main(){
      vec2 p=vec2(uv.x,1.-uv.y)*pageSize;
      vec2 d=vec2(0.);
      if(theme<.5){
        d+=breeze(p,vec2(180.,107.),vec2(95.,100.),vec2(171.,30.),.13,5.3,.2);
        d+=breeze(p,vec2(310.,62.),vec2(69.,65.),vec2(300.,0.),.12,4.8,1.8);
        d+=breeze(p,vec2(430.,149.),vec2(91.,125.),vec2(413.,55.),-.11,6.1,3.2);
        d+=breeze(p,vec2(52.,335.),vec2(47.,110.),vec2(30.,438.),.12,5.6,2.1);
        d+=breeze(p,vec2(546.,489.),vec2(66.,95.),vec2(598.,555.),-.14,6.5,4.0);
        d+=breeze(p,vec2(68.,780.),vec2(91.,70.),vec2(66.,852.),.12,5.8,2.8);
        d+=breeze(p,vec2(550.,872.),vec2(67.,63.),vec2(568.,918.),-.14,5.2,5.1);
        d*=smoothstep(21.,35.,min(p.x,600.-p.x));
      }else if(theme<1.5){
        // Fronds flex from their stems; brass lamps and bowls remain fixed.
        d+=breeze(p,vec2(161.,113.),vec2(181.,99.),vec2(23.,260.),.075,5.6,.3);
        d+=breeze(p,vec2(175.,252.),vec2(165.,130.),vec2(18.,411.),-.070,6.3,2.2);
        d+=breeze(p,vec2(372.,558.),vec2(124.,114.),vec2(359.,809.),.060,5.4,1.3);
        d*=smoothstep(0.,18.,min(p.x,600.-p.x));
      }else if(theme<2.5){
        // Broad continuous fields encompass the complete lantern and its cord.
        d+=breeze(p,vec2(58.,108.),vec2(37.,110.),vec2(58.,0.),.13,4.8,.4);
        d+=breeze(p,vec2(119.,173.),vec2(32.,100.),vec2(119.,75.),-.14,5.7,1.8);
        d+=breeze(p,vec2(332.,155.),vec2(41.,108.),vec2(332.,48.),.13,5.1,3.2);
        d+=breeze(p,vec2(524.,191.),vec2(41.,130.),vec2(524.,48.),-.11,6.2,2.7);
        d+=breeze(p,vec2(31.,480.),vec2(42.,91.),vec2(26.,575.),.09,6.3,1.4);
        d+=breeze(p,vec2(564.,680.),vec2(45.,92.),vec2(590.,760.),-.10,5.8,3.1);
      }else if(theme<3.5){
        // Palm tips and bougainvillea move; the chair, parasol and table are still.
        d+=breeze(p,vec2(91.,600.),vec2(104.,110.),vec2(39.,696.),.11,5.8,.3);
        d+=breeze(p,vec2(530.,737.),vec2(83.,87.),vec2(579.,811.),-.12,6.6,2.1);
        d+=breeze(p,vec2(424.,83.),vec2(146.,86.),vec2(579.,5.),.065,6.1,1.4);
        d+=breeze(p,vec2(431.,169.),vec2(37.,78.),vec2(431.,88.),.14,5.2,2.4);
        d*=smoothstep(9.,20.,min(p.x,600.-p.x));
      }else{
        d+=breeze(p,vec2(168.,81.),vec2(103.,105.),vec2(168.,0.),.09,5.8,.4);
        d+=breeze(p,vec2(474.,111.),vec2(84.,100.),vec2(474.,0.),-.095,6.4,2.2);
        d+=breeze(p,vec2(37.,296.),vec2(34.,230.),vec2(37.,0.),.038,6.8,1.5);
        d+=breeze(p,vec2(562.,287.),vec2(31.,222.),vec2(562.,0.),-.038,6.1,3.7);
        d*=smoothstep(0.,13.,min(p.x,600.-p.x));
      }
      vec2 source=clamp(p-d,vec2(.5),pageSize-vec2(.5));
      vec4 color=texture2D(artwork,vec2(source.x/pageSize.x,1.-source.y/pageSize.y));
      if(theme>1.5 && theme<2.5){
        // A restrained warm shimmer on the painted lanterns, no added particles.
        float glow=exp(-pow(length((p-vec2(476.,84.))/vec2(23.,35.)),2.));
        glow+=exp(-pow(length((p-vec2(332.,160.))/vec2(20.,30.)),2.));
        glow+=exp(-pow(length((p-vec2(524.,195.))/vec2(22.,35.)),2.));
        color.rgb+=vec3(.14,.095,.025)*glow*(.5+.5*sin(time*2.1));
      }
      gl_FragColor=color;
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
    if(reduced.matches || document.hidden || !document.body.classList.contains('invitation-open')) return;
    {
      const elapsed=previous ? Math.min((now-previous)/1000,.05) : 0;
      previous=now;
      for(const scene of scenes){
        if(!scene.visible || scene.paused || scene.lost) continue;
        scene.time+=elapsed;
        scene.draw();
      }
    }
    if(scenes.some(s=>s.visible&&!s.paused&&!s.lost)) frame=requestAnimationFrame(tick);
  }
  function start(){if(!frame&&!reduced.matches&&!document.hidden&&document.body.classList.contains('invitation-open')) frame=requestAnimationFrame(tick);}
  function createScene(page, image){
    const canvas=page.querySelector('.living-art');
    const paper=page.querySelector('.paper');
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
      const textureCanvas=document.createElement('canvas');
      textureCanvas.width=Math.min(image.naturalWidth,1200);
      textureCanvas.height=Math.round(textureCanvas.width*image.naturalHeight/image.naturalWidth);
      textureCanvas.getContext('2d').drawImage(image,0,0,textureCanvas.width,textureCanvas.height);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,textureCanvas);
      const clock=gl.getUniformLocation(program,'time');
      const height=Number(page.querySelector('image.still-art').getAttribute('height'));
      gl.uniform2f(gl.getUniformLocation(program,'pageSize'),600,height);
      gl.uniform1f(gl.getUniformLocation(program,'theme'),page.id==='wedding'?1:page.id==='sangeet'?2:page.id==='haldi'?3:page.id==='phere'?4:0);
      const scene={visible:false,paused:paused,lost:false,time:0,draw(){
        gl.uniform1f(clock,this.time);gl.drawArrays(gl.TRIANGLES,0,6);
        canvas.dataset.motionTime=this.time.toFixed(2);
      }};
      const resize=()=>{
        const width=Math.min(1200,Math.round(paper.clientWidth*Math.min(devicePixelRatio||1,2)));
        if(!width || canvas.width===width) return;
        canvas.width=width;canvas.height=Math.round(width*height/600);
        gl.viewport(0,0,canvas.width,canvas.height);scene.draw();
      };
      new ResizeObserver(resize).observe(paper);resize();
      new IntersectionObserver(entries=>{
        scene.visible=entries[0].isIntersecting;
        start();
      },{rootMargin:'40px'}).observe(page);
      canvas.addEventListener('webglcontextlost',()=>{
        scene.lost=true;paper.classList.remove('has-art-motion');
      });
      scenes.push(scene);paper.classList.add('has-art-motion');
      if(button)button.disabled=reduced.matches;
    } catch(error) {
      // The complete still illustration remains available on unsupported devices.
      console.warn('Botanical motion unavailable:',error.message);
    }
  }
  button?.addEventListener('click',()=>{
    paused=!paused;
    scenes.forEach(scene=>{scene.paused=paused;});
    button.setAttribute('aria-pressed',String(paused));
    button.setAttribute('aria-label',paused?'Resume gentle animation':'Pause gentle animation');
    if(paused)stop();else start();
  });
  document.addEventListener('invitation:opened',start);
  const images=new Map();
  pages.forEach(page=>{
    const src=page.querySelector('image.still-art').getAttribute('href');
    if(!images.has(src)) images.set(src,[]);
    images.get(src).push(page);
  });
  images.forEach((targets,src)=>{
    const image=new Image();
    image.onload=()=>{
      // Yield between contexts so loading another chapter cannot freeze a swipe.
      let index=0;
      function next(){if(index<targets.length){createScene(targets[index++],image);requestAnimationFrame(next);}start();}
      requestAnimationFrame(next);
    };
    image.src=src;
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden) stop();else start();});
  reduced.addEventListener('change',()=>{
    if(button)button.disabled=reduced.matches;
    if(reduced.matches)stop();else start();
  });
})();
