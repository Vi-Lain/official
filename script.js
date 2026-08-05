
// Cinematic intro with hard safety fallback
(function(){
  const loader=document.querySelector("#loader");
  if(!loader) return;

  let closed=false;
  const closeIntro=()=>{
    if(closed) return;
    closed=true;
    loader.classList.add("out");
    window.setTimeout(()=>{
      loader.classList.add("hide");
      loader.setAttribute("aria-hidden","true");
    },420);
    window.setTimeout(()=>{
      loader.classList.add("force-hide");
    },1300);
  };

  document.addEventListener("DOMContentLoaded",()=>{
    window.setTimeout(closeIntro,3000);
  });

  window.addEventListener("load",()=>{
    window.setTimeout(closeIntro,2500);
  });

  // Absolute failsafe
  window.setTimeout(closeIntro,4200);

  loader.addEventListener("click",closeIntro);
})();

const q=s=>document.querySelector(s),qa=s=>document.querySelectorAll(s);window.addEventListener("load",()=>setTimeout(()=>q("#loader").classList.add("hide"),800));q(".menu-button").onclick=()=>q(".nav").classList.toggle("open");qa(".nav a").forEach(a=>a.onclick=()=>q(".nav").classList.remove("open"));const ob=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add("visible")}),{threshold:.12});qa(".reveal").forEach(e=>ob.observe(e));SITE_DATA.news.forEach(n=>q("#news-list").insertAdjacentHTML("beforeend",`<article class="news-item"><time>${n.date}</time><span>${n.category}</span><b>${n.title}</b></article>`));SITE_DATA.goods.forEach(g=>q("#goods-list").insertAdjacentHTML("beforeend",`<a class="goods-card" href="${g.url}" target="_blank"><img src="${g.image}"><div class="goods-copy"><span>${g.status}</span><h3>${g.title}</h3><p>${g.description}</p><strong>VIEW ON BOOTH →</strong></div></a>`));const c=q("#particles"),x=c.getContext("2d");let w,h,p=[];function r(){w=c.width=innerWidth;h=c.height=innerHeight;p=Array.from({length:Math.min(90,Math.floor(w/18))},()=>({x:Math.random()*w,y:Math.random()*h,s:Math.random()*.35+.08,r:Math.random()*1.5+.3,col:Math.random()>.5?"211,31,67":"151,71,255"}))}function d(){x.clearRect(0,0,w,h);p.forEach(a=>{a.y-=a.s;if(a.y<0)a.y=h;x.beginPath();x.fillStyle=`rgba(${a.col},.35)`;x.arc(a.x,a.y,a.r,0,7);x.fill()});requestAnimationFrame(d)}addEventListener("resize",r);r();d();window.addEventListener("scroll",()=>{let y=scrollY;q(".hero-alrod").style.transform=`translateY(${y*.05}px)`;q(".hero-chrome").style.transform=`translateY(${y*.04}px)`;q(".hero-center").style.transform=`translateY(${y*.1}px)`});
// v5 MUSIC archive
const musicPreview = q("#music-list");
const musicLibrary = q("#music-library");
const musicLibraryGrid = q("#music-library-grid");
const openMusicBtn = q("#open-music-library");
const closeMusicBtn = q("#close-music-library");
const musicCount = q("#music-count");
const musicPage = q("#music-page");
const prevBtn = q("#music-prev");
const nextBtn = q("#music-next");
const filters = qa(".music-filter");

const MUSIC_PREVIEW_LIMIT = 6;
const MUSIC_PAGE_SIZE = 12;
let activeMusicFilter = "ALL";
let currentMusicPage = 1;

function musicCard(m){
  return `<a class="music-card" href="${m.url}" target="_blank" rel="noopener">
    <img src="https://i.ytimg.com/vi/${m.youtubeId}/hqdefault.jpg" alt="${m.title}">
    <div class="music-copy">
      <small>${m.artist}</small>
      <h3>${m.title}</h3>
      <p>WATCH ON YOUTUBE →</p>
    </div>
  </a>`;
}

function renderMusicPreview(){
  musicPreview.innerHTML = SITE_DATA.music
    .slice(0, MUSIC_PREVIEW_LIMIT)
    .map(musicCard)
    .join("");
}

function getFilteredMusic(){
  if(activeMusicFilter === "ALL") return SITE_DATA.music;
  return SITE_DATA.music.filter(m => m.artist === activeMusicFilter);
}

function renderMusicLibrary(){
  const filtered = getFilteredMusic();
  const totalPages = Math.max(1, Math.ceil(filtered.length / MUSIC_PAGE_SIZE));
  if(currentMusicPage > totalPages) currentMusicPage = totalPages;
  const start = (currentMusicPage - 1) * MUSIC_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + MUSIC_PAGE_SIZE);

  musicLibraryGrid.innerHTML = pageItems.length
    ? pageItems.map(musicCard).join("")
    : `<p style="color:#888">現在、このカテゴリーに登録されている楽曲はありません。</p>`;

  musicCount.textContent = `${filtered.length} SONGS`;
  musicPage.textContent = `${currentMusicPage} / ${totalPages}`;
  prevBtn.disabled = currentMusicPage <= 1;
  nextBtn.disabled = currentMusicPage >= totalPages;
}

openMusicBtn.addEventListener("click",()=>{
  musicLibrary.classList.add("open");
  musicLibrary.setAttribute("aria-hidden","false");
  document.body.classList.add("library-open");
  renderMusicLibrary();
});
closeMusicBtn.addEventListener("click",()=>{
  musicLibrary.classList.remove("open");
  musicLibrary.setAttribute("aria-hidden","true");
  document.body.classList.remove("library-open");
});
musicLibrary.addEventListener("click",e=>{
  if(e.target === musicLibrary) closeMusicBtn.click();
});
document.addEventListener("keydown",e=>{
  if(e.key === "Escape" && musicLibrary.classList.contains("open")) closeMusicBtn.click();
});
filters.forEach(btn=>btn.addEventListener("click",()=>{
  filters.forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  activeMusicFilter = btn.dataset.filter;
  currentMusicPage = 1;
  renderMusicLibrary();
}));
prevBtn.addEventListener("click",()=>{
  if(currentMusicPage > 1){currentMusicPage--;renderMusicLibrary();}
});
nextBtn.addEventListener("click",()=>{
  const totalPages = Math.ceil(getFilteredMusic().length / MUSIC_PAGE_SIZE);
  if(currentMusicPage < totalPages){currentMusicPage++;renderMusicLibrary();}
});
renderMusicPreview();

// v6.4 member transition
const transitionOverlay = document.querySelector("#page-transition");
document.querySelectorAll(".member-transition-link").forEach(link=>{
  link.addEventListener("click",event=>{
    event.preventDefault();
    const destination = link.getAttribute("href");
    if(!transitionOverlay || !destination){
      window.location.href = destination;
      return;
    }
    document.body.classList.add("transitioning");
    transitionOverlay.classList.add("active");
    transitionOverlay.setAttribute("aria-hidden","false");

    window.setTimeout(()=>{
      window.location.href = destination;
    }, 1750);
  });
});

// v6.7 subtle 3D tilt for MEMBER cards
document.querySelectorAll(".member-select-card").forEach(card=>{
  card.addEventListener("mousemove",e=>{
    if(window.innerWidth < 900) return;
    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    card.style.setProperty("--mx", `${px*100}%`);
    card.style.setProperty("--my", `${py*100}%`);
    card.style.setProperty("--tilt-y", `${(px-.5)*5}deg`);
    card.style.setProperty("--tilt-x", `${(.5-py)*4}deg`);
  });
  card.addEventListener("mouseleave",()=>{
    card.style.setProperty("--tilt-y","0deg");
    card.style.setProperty("--tilt-x","0deg");
    card.style.setProperty("--mx","50%");
    card.style.setProperty("--my","50%");
  });
});

// v7.0 global motion polish
const progressBar = document.querySelector(".scroll-progress i");
const cursorAura = document.querySelector(".cursor-aura");
const pageSections = [...document.querySelectorAll("main section[id]")];
const navLinks = [...document.querySelectorAll(".nav a[href^='#']")];

function updatePageMotion(){
  const doc = document.documentElement;
  const max = Math.max(1, doc.scrollHeight - innerHeight);
  const progress = scrollY / max;
  if(progressBar) progressBar.style.transform = `scaleX(${progress})`;

  let activeId = "";
  pageSections.forEach(section=>{
    const rect = section.getBoundingClientRect();
    if(rect.top <= innerHeight*.42 && rect.bottom >= innerHeight*.42){
      activeId = section.id;
    }
  });
  navLinks.forEach(link=>{
    link.classList.toggle("active", link.getAttribute("href") === `#${activeId}`);
  });
}
addEventListener("scroll",updatePageMotion,{passive:true});
addEventListener("resize",updatePageMotion);
updatePageMotion();

addEventListener("mousemove",e=>{
  if(!cursorAura) return;
  cursorAura.style.left = `${e.clientX}px`;
  cursorAura.style.top = `${e.clientY}px`;
});

document.querySelectorAll(".view-all,.socials a,.live-grid a,.member-select-card").forEach(el=>{
  el.classList.add("magnetic");
  el.addEventListener("mousemove",e=>{
    if(innerWidth < 900) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX-r.left-r.width/2)*.055;
    const y = (e.clientY-r.top-r.height/2)*.055;
    el.style.transform = `translate(${x}px,${y}px)`;
  });
  el.addEventListener("mouseleave",()=>el.style.transform="");
});

const staggerObserver = new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(!entry.isIntersecting) return;
    [...entry.target.children].forEach((child,i)=>{
      child.classList.add("card-stagger");
      child.style.animationDelay = `${i*70}ms`;
    });
    staggerObserver.unobserve(entry.target);
  });
},{threshold:.12});
document.querySelectorAll(".news-list,.music-preview,.live-grid,.goods-grid,.member-select-grid").forEach(el=>staggerObserver.observe(el));

// CHROM transition content support
document.querySelectorAll(".member-transition-link").forEach(link=>{
  link.addEventListener("click",()=>{
    const overlay=document.querySelector("#page-transition");
    if(!overlay)return;
    const name=link.dataset.member||"ALROD";
    const subtitle=link.dataset.subtitle||"";
    overlay.classList.toggle("chrom-mode",name==="CHROM");
    const strong=overlay.querySelector(".transition-copy strong");
    const small=overlay.querySelector(".transition-copy small");
    const img=overlay.querySelector(".transition-character img");
    if(strong)strong.textContent=name;
    if(small)small.textContent=subtitle;
    if(img)img.src=name==="CHROM"?"assets/chrome.webp":"assets/alrod.webp";
  },{capture:true});
});

(function(){
  const area=document.querySelector("#live-status-area");
  const count=document.querySelector("#live-stream-count");
  if(!area||!count)return;

  const streams=Array.isArray(window.LIVE_DATA?.streams)?window.LIVE_DATA.streams:[];

  const esc=v=>String(v??"")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  const startedText=v=>{
    if(!v)return "";
    const d=new Date(v);
    if(Number.isNaN(d.getTime()))return "";
    const m=Math.floor(Math.max(0,Date.now()-d.getTime())/60000);
    return m<60?`${m}分前に開始`:`${Math.floor(m/60)}時間前に開始`;
  };

  if(streams.length===0){
    count.textContent="OFFLINE";
    count.classList.remove("is-live");
    area.innerHTML=`
      <div class="live-offline-panel">
        <span class="offline-pulse"></span>
        <div>
          <strong>OFFLINE</strong>
          <p>現在配信中のメンバーはいません。</p>
        </div>
      </div>`;
    return;
  }

  count.textContent=`NOW LIVE ×${streams.length}`;
  count.classList.add("is-live");
  area.innerHTML=`<div class="live-now-grid">${streams.map(s=>{
    const twitch=String(s.platform).toLowerCase()==="twitch";
    const started=startedText(s.startedAt);
    return `
      <a class="live-now-card ${twitch?"is-twitch":"is-youtube"}" href="${esc(s.url)}" target="_blank" rel="noopener">
        <div class="live-thumbnail">
          <img src="${esc(s.thumbnail)}" alt="" onerror="this.style.display='none'">
          <span class="live-badge">LIVE NOW</span>
        </div>
        <div class="live-copy">
          <div class="live-meta">
            <strong class="live-member">${esc(s.member)}</strong>
            <span class="live-platform">${esc(s.platform)}</span>
          </div>
          <h3 class="live-title">${esc(s.title||"LIVE STREAM")}</h3>
          ${started?`<p class="live-started">${started}</p>`:""}
          <p class="live-watch">WATCH STREAM →</p>
        </div>
      </a>`;
  }).join("")}</div>`;
})();
