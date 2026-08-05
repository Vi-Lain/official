(function(){
  const STORAGE_KEY="vilain-intro-sound";
  let running=false;

  function startIntro(){
    if(running)return;
    running=true;

    const old=document.querySelector("#vl-v8-intro");
    if(old)old.remove();

    const style=document.createElement("style");
    style.id="vl-v8-intro-style";
    style.textContent=`
      #vl-v8-intro{
        position:fixed;inset:0;z-index:999999;overflow:hidden;
        background:#020203;opacity:1;transition:opacity .78s ease;
        cursor:pointer
      }
      #vl-v8-intro.is-leaving{opacity:0}
      #vl-v8-intro canvas{position:absolute;inset:0;width:100%;height:100%}
      #vl-v8-logo{
        position:absolute;left:50%;top:50%;width:min(740px,78vw);
        transform:translate(-50%,-47%) scale(1.14);
        opacity:0;filter:blur(15px) brightness(.65);
        animation:vlV8Logo 1.2s .35s cubic-bezier(.18,.8,.2,1) forwards;
        pointer-events:none
      }
      #vl-v8-kicker,#vl-v8-members,#vl-v8-enter{
        position:absolute;left:50%;transform:translateX(-50%);
        font-family:"Sora","Noto Sans JP",sans-serif;
        white-space:nowrap;text-align:center;pointer-events:none
      }
      #vl-v8-kicker{
        top:16vh;font-size:9px;font-weight:800;letter-spacing:.52em;
        color:#aaa3aa;opacity:0;animation:vlV8Fade .55s .5s forwards
      }
      #vl-v8-members{
        top:calc(50% + min(17vw,165px));font-size:10px;font-weight:700;
        letter-spacing:.48em;color:#c7c0c6;opacity:0;
        animation:vlV8Fade .65s 1.02s forwards
      }
      #vl-v8-members b{color:#ff4c83}
      #vl-v8-enter{
        bottom:8vh;font-size:9px;letter-spacing:.52em;color:#817981;
        opacity:0;animation:vlV8Enter .6s 1.75s forwards
      }
      #vl-v8-sound{
        position:absolute;top:20px;right:22px;z-index:3;
        display:flex;align-items:center;gap:9px;min-height:40px;
        padding:9px 13px;border:1px solid #ffffff24;border-radius:999px;
        background:#07070bd9;color:#d6cfd5;backdrop-filter:blur(12px);
        cursor:pointer;font:700 9px/1 "Noto Sans JP",sans-serif;
        letter-spacing:.16em;transition:.25s
      }
      #vl-v8-sound:hover{transform:translateY(-2px);border-color:#ffffff55;color:#fff}
      #vl-v8-sound.is-on{
        border-color:#ff4c8366;background:#35101fdd;color:#fff;
        box-shadow:0 0 24px #ff3e9d22
      }
      #vl-v8-skip{
        position:absolute;left:50%;bottom:3.5vh;transform:translateX(-50%);
        color:#7f7880;font:700 8px/1 "Sora",sans-serif;
        letter-spacing:.28em;pointer-events:none
      }
      @keyframes vlV8Logo{
        0%{opacity:0;transform:translate(-50%,-47%) scale(1.14);filter:blur(15px) brightness(.65)}
        62%{opacity:1;filter:blur(1px) brightness(1.25)}
        100%{opacity:1;transform:translate(-50%,-50%) scale(1);filter:blur(0) brightness(1)}
      }
      @keyframes vlV8Fade{to{opacity:1}}
      @keyframes vlV8Enter{
        from{opacity:0;letter-spacing:.72em}
        to{opacity:1;letter-spacing:.52em}
      }
      @media(max-width:600px){
        #vl-v8-logo{width:94vw}
        #vl-v8-sound{top:14px;right:14px}
        #vl-v8-sound .label{display:none}
        #vl-v8-kicker{top:19vh}
        #vl-v8-enter{font-size:8px;letter-spacing:.30em}
      }
    `;
    document.head.appendChild(style);

    const root=document.createElement("div");
    root.id="vl-v8-intro";
    root.innerHTML=`
      <canvas></canvas>
      <div id="vl-v8-kicker">ABLOOM VTUBER UNIT</div>
      <img id="vl-v8-logo" src="assets/logo-temp.webp" alt="Vi-Lain">
      <div id="vl-v8-members">ALROD <b>×</b> CHROM</div>
      <div id="vl-v8-enter">ENTER THE WORLD OF Vi-Lain</div>
      <button id="vl-v8-sound" type="button">
        <span class="icon">🔇</span><span class="label">SOUND OFF</span>
      </button>
      <span id="vl-v8-skip">CLICK TO SKIP</span>
      <audio preload="auto" src="assets/vilain-intro-v8.wav"></audio>
    `;
    document.body.appendChild(root);

    const canvas=root.querySelector("canvas");
    const ctx=canvas.getContext("2d");
    const sound=root.querySelector("#vl-v8-sound");
    const icon=sound.querySelector(".icon");
    const label=sound.querySelector(".label");
    const audio=root.querySelector("audio");
    let enabled=localStorage.getItem(STORAGE_KEY)==="on";
    let closed=false;
    let raf=0;
    let start=performance.now();

    const particles=Array.from({length:115},()=>({
      x:Math.random(),y:Math.random(),
      r:Math.random()*1.8+.25,
      speed:Math.random()*.00018+.00004,
      drift:(Math.random()-.5)*.00008,
      alpha:Math.random()*.45+.15,
      color:Math.random()>.48?"215,42,78":"255,62,157"
    }));

    function resize(){
      const dpr=Math.min(devicePixelRatio||1,2);
      canvas.width=Math.floor(innerWidth*dpr);
      canvas.height=Math.floor(innerHeight*dpr);
      canvas.style.width=innerWidth+"px";
      canvas.style.height=innerHeight+"px";
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }

    function draw(now){
      const t=(now-start)/1000;
      ctx.clearRect(0,0,innerWidth,innerHeight);

      const redX=innerWidth*(.12+.07*Math.sin(t*.45));
      const red=ctx.createRadialGradient(redX,innerHeight*.52,0,redX,innerHeight*.52,innerWidth*.58);
      red.addColorStop(0,`rgba(215,42,78,${Math.min(.38,t*.30)})`);
      red.addColorStop(.52,"rgba(92,15,37,.12)");
      red.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=red;ctx.fillRect(0,0,innerWidth,innerHeight);

      const pinkX=innerWidth*(.88-.07*Math.sin(t*.42));
      const pink=ctx.createRadialGradient(pinkX,innerHeight*.48,0,pinkX,innerHeight*.48,innerWidth*.58);
      pink.addColorStop(0,`rgba(255,62,157,${Math.min(.34,t*.27)})`);
      pink.addColorStop(.52,"rgba(90,18,62,.10)");
      pink.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=pink;ctx.fillRect(0,0,innerWidth,innerHeight);

      particles.forEach(p=>{
        p.y-=p.speed*18;
        p.x+=p.drift*8;
        if(p.y<-.02){p.y=1.02;p.x=Math.random()}
        if(p.x<0)p.x=1;if(p.x>1)p.x=0;
        ctx.beginPath();
        ctx.fillStyle=`rgba(${p.color},${p.alpha})`;
        ctx.arc(p.x*innerWidth,p.y*innerHeight,p.r,0,Math.PI*2);
        ctx.fill();
      });

      const flare=Math.min(1,Math.max(0,(t-.72)/.85));
      ctx.save();
      ctx.translate(innerWidth/2,innerHeight/2);
      ctx.scale(flare,1);
      const line=ctx.createLinearGradient(-innerWidth*.40,0,innerWidth*.40,0);
      line.addColorStop(0,"rgba(255,255,255,0)");
      line.addColorStop(.42,"rgba(215,42,78,.5)");
      line.addColorStop(.5,"rgba(255,255,255,.95)");
      line.addColorStop(.58,"rgba(255,62,157,.5)");
      line.addColorStop(1,"rgba(255,255,255,0)");
      ctx.fillStyle=line;
      ctx.fillRect(-innerWidth*.40,0,innerWidth*.80,1.5);
      ctx.restore();

      const sweep=(t-1.05)/.85;
      if(sweep>=0&&sweep<=1){
        const x=sweep*innerWidth;
        const beam=ctx.createLinearGradient(x-100,0,x+100,0);
        beam.addColorStop(0,"rgba(255,255,255,0)");
        beam.addColorStop(.5,"rgba(255,255,255,.12)");
        beam.addColorStop(1,"rgba(255,255,255,0)");
        ctx.fillStyle=beam;ctx.fillRect(x-100,0,200,innerHeight);
      }

      raf=requestAnimationFrame(draw);
    }

    function renderSound(){
      sound.classList.toggle("is-on",enabled);
      icon.textContent=enabled?"🔊":"🔇";
      label.textContent=enabled?"SOUND ON":"SOUND OFF";
    }

    async function play(){
      if(!enabled)return;
      try{
        audio.currentTime=0;
        audio.volume=.42;
        await audio.play();
      }catch(_){}
    }

    function cleanup(){
      cancelAnimationFrame(raf);
      audio.pause();
      root.remove();
      style.remove();
      running=false;
    }

    function close(){
      if(closed)return;
      closed=true;
      root.classList.add("is-leaving");
      setTimeout(cleanup,780);
    }

    sound.addEventListener("click",async event=>{
      event.stopPropagation();
      enabled=!enabled;
      localStorage.setItem(STORAGE_KEY,enabled?"on":"off");
      renderSound();
      if(enabled)await play();
      else{audio.pause();audio.currentTime=0}
    });

    root.addEventListener("click",close);
    addEventListener("resize",resize,{once:false});
    resize();
    renderSound();
    play();
    raf=requestAnimationFrame(draw);
    setTimeout(close,3300);
    setTimeout(close,4700);
  }

  window.VILAIN_PLAY_INTRO=startIntro;

  document.addEventListener("DOMContentLoaded",()=>{
    startIntro();

    const replay=document.createElement("button");
    replay.className="intro-replay";
    replay.type="button";
    replay.title="イントロを再生";
    replay.setAttribute("aria-label","イントロを再生");
    replay.textContent="↻";
    replay.addEventListener("click",startIntro);
    document.body.appendChild(replay);
  });
})();