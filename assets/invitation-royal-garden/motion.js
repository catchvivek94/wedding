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
      float envelope=1.-smoothstep(.18,1.,r);
      float wave=sin(time*6.2831853/period+phase);
      float a=angle*1.55*wave*envelope;
      vec2 arm=p-anchor;
      return vec2(-arm.y,arm.x)*a;
    }
    void main(){
      vec2 p=vec2(uv.x,1.-uv.y)*pageSize;
      vec2 d=vec2(0.);
      if(theme<.5){
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
      }else if(theme<1.5){
        // Banana fronds bend gently; brass lamps and bowls remain anchored.
        d+=breeze(p,vec2(161.,113.),vec2(181.,99.),vec2(23.,260.),.010,7.4,.3);
        d+=breeze(p,vec2(175.,252.),vec2(165.,130.),vec2(18.,411.),-.011,8.3,2.2);
        d+=breeze(p,vec2(372.,558.),vec2(124.,114.),vec2(359.,809.),.008,6.9,1.3);
        d*=smoothstep(0.,13.,min(p.x,pageSize.x-p.x));
      }else{
        // Individual lanterns and their cords move as complete painted forms.
        d+=breeze(p,vec2(61.,80.),vec2(28.,65.),vec2(61.,0.),.012,5.8,.4);
        d+=breeze(p,vec2(116.,130.),vec2(28.,63.),vec2(116.,70.),-.014,6.9,1.8);
        d+=breeze(p,vec2(334.,112.),vec2(29.,65.),vec2(334.,36.),.012,6.3,3.2);
        d+=breeze(p,vec2(532.,147.),vec2(35.,76.),vec2(532.,55.),-.013,7.2,2.7);
      }
      vec2 source=clamp(p-d,vec2(.5),pageSize-vec2(.5));
      vec4 color=texture2D(artwork,vec2(source.x/pageSize.x,1.-source.y/pageSize.y));
      if(theme>1.5){
        // A restrained warm shimmer on the painted lanterns, no added particles.
        float glow=exp(-pow(length((p-vec2(480.,68.))/vec2(23.,35.)),2.));
        glow+=exp(-pow(length((p-vec2(334.,138.))/vec2(20.,30.)),2.));
        glow+=exp(-pow(length((p-vec2(532.,177.))/vec2(22.,35.)),2.));
        color.rgb+=vec3(.065,.043,.012)*glow*(.5+.5*sin(time*2.1));
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
    if(!previous || now-previous>=32){
      const elapsed=previous ? Math.min((now-previous)/1000,.1) : 0;
      previous=now;
      for(const scene of scenes){
        if(!scene.visible || scene.paused || scene.lost) continue;
        scene.time+=elapsed*1.32;
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
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
      const clock=gl.getUniformLocation(program,'time');
      const height=Number(page.querySelector('image.still-art').getAttribute('height'));
      gl.uniform2f(gl.getUniformLocation(program,'pageSize'),600,height);
      gl.uniform1f(gl.getUniformLocation(program,'theme'),page.id==='wedding'?1:page.id==='sangeet'?2:0);
      const scene={visible:false,paused:paused,lost:false,time:0,draw(){
        gl.uniform1f(clock,this.time);gl.drawArrays(gl.TRIANGLES,0,6);
        canvas.dataset.motionTime=this.time.toFixed(2);
      }};
      const resize=()=>{
        const width=Math.min(1200,Math.round(paper.clientWidth*Math.min(devicePixelRatio||1,2)));
        if(!width) return;
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
    image.onload=()=>{targets.forEach(page=>createScene(page,image));start();};
    image.src=src;
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden) stop();else start();});
  reduced.addEventListener('change',()=>{
    if(button)button.disabled=reduced.matches;
    if(reduced.matches)stop();else start();
  });
})();
