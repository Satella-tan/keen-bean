(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))r(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const u of o.addedNodes)u.tagName==="LINK"&&u.rel==="modulepreload"&&r(u)}).observe(document,{childList:!0,subtree:!0});function s(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function r(n){if(n.ep)return;n.ep=!0;const o=s(n);fetch(n.href,o)}})();const c=document.getElementById("engineBadge"),w=document.getElementById("deviceBadge"),v=document.getElementById("corpusStatusBadge"),_=document.getElementById("numItemsVal"),P=document.getElementById("dimsVal"),A=document.getElementById("corpusLatencyVal"),m=document.getElementById("modelStatusBadge"),B=document.getElementById("deviceSelector"),U=document.getElementById("activeDeviceVal"),V=document.getElementById("modelInitLatencyVal"),M=document.getElementById("progressContainer"),q=document.getElementById("progressBar"),b=document.getElementById("modelStatusText"),$=document.getElementById("queryInput"),a=document.getElementById("searchBtn"),k=document.querySelectorAll(".mode-btn"),W=document.getElementById("metricsBar"),j=document.getElementById("metricEmbed"),F=document.getElementById("metricSearch"),H=document.getElementById("metricTotal"),z=document.getElementById("metricQuery"),x=document.getElementById("resultsContainer"),R=document.getElementById("paginationContainer"),f=document.getElementById("loadMoreBtn"),O=document.getElementById("resultsCountInfo"),K=document.getElementById("scrollSentinel"),T="Xenova/bge-small-en-v1.5",G=5;let g=!1,p=!1,h="hybrid",y=!1,i=[],l=0;const D=new Worker(new URL("/assets/search-worker-meEK2_or.js",import.meta.url),{type:"module"});function E(e){D.postMessage(e)}function C(){g&&p?(c.textContent="Engine Ready",c.className="badge active",a.disabled=!1):!g&&!p?(c.textContent="Loading Corpus & Model...",c.className="badge warning",a.disabled=!0):g?(c.textContent="Loading Model...",c.className="badge warning",a.disabled=h!=="keyword"):(c.textContent="Loading Corpus...",c.className="badge warning",a.disabled=!0)}function I(e){const t=Math.floor(e/60),s=e%60;return`${t}:${s.toString().padStart(2,"0")}`}D.addEventListener("message",e=>{const t=e.data;switch(t.type){case"CORPUS_LOADED":{g=!0,v.textContent="Loaded",v.className="badge active",_.textContent=t.numItems.toLocaleString(),P.textContent=t.dims.toString(),A.textContent=`${t.loadTimeMs} ms`,C();break}case"MODEL_PROGRESS":{M.style.display="block",typeof t.progress=="number"?(q.style.width=`${t.progress}%`,b.textContent=`${t.status} (${t.progress}%)${t.file?` - ${t.file}`:""}`):b.textContent=t.status;break}case"MODEL_READY":{p=!0,M.style.display="none",m.textContent="Ready",m.className="badge active",U.textContent=t.device.toUpperCase(),w.textContent=`Backend: ${t.device.toUpperCase()}`,w.className="badge active",V.textContent=`${t.initTimeMs.toLocaleString()} ms`,b.textContent=`Model loaded successfully via ${t.device.toUpperCase()}`,C();break}case"SEARCH_RESULTS":{y=!1,a.disabled=!1,a.textContent="Search",W.style.display="flex",j.textContent=`${t.timing.embedMs} ms`,F.textContent=`${t.timing.searchMs} ms`,H.textContent=`${t.timing.totalMs} ms`,z.textContent=`"${t.query}" (${t.results.length} results)`,X(t.results);break}case"ERROR":{y=!1,a.disabled=!1,a.textContent="Search",console.error("Worker error reported:",t),alert(`Error in [${t.context}]: ${t.message}`);break}}});function N(e){if(e.includes(`
`))return e.split(`
`).map(s=>s.trim()).filter(Boolean);const t=e.split(/(?<=[.?!])\s+/).map(s=>s.trim()).filter(Boolean);return t.length>0?t:[e.trim()]}function Q(e){return!e.parentChunks||e.parentChunks.length===0?N(e.matchedText).map(s=>`
        <div class="match-line">
          <span class="match-indicator">&gt;&gt;</span>
          <span class="match-text">${d(s)}</span>
        </div>
      `).join(""):e.parentChunks.map(t=>{const s=N(t.text);return t.isMatch?s.map(r=>`
            <div class="match-line">
              <span class="match-indicator">&gt;&gt;</span>
              <span class="match-text">${d(r)}</span>
            </div>
          `).join(""):s.map(r=>`
            <div class="context-sentence">${d(r)}</div>
          `).join("")}).join("")}function Y(e){const t=document.createElement("div");t.className="result-card";const s=`https://youtu.be/${e.videoId}?t=${e.start}`,r=`${I(e.start)} - ${I(e.end)}`,n=`https://img.youtube.com/vi/${e.videoId}/mqdefault.jpg`,o=e.videoTitle||e.videoId,u=e.scene?`<span class="badge">${d(e.scene)}</span>`:"";return t.innerHTML=`
    <div class="result-top-bar">
      <div class="result-title-group">
        <span class="result-rank">#${e.rank}</span>
        <span class="result-video-title" title="${d(o)}">${d(o)}</span>
        ${u}
      </div>
      <div class="result-scores">
        <span>Score: <strong class="score-total">${e.score.toFixed(4)}</strong></span>
        <span>(${e.semanticScore.toFixed(3)} sem / ${e.keywordScore.toFixed(3)} kw)</span>
      </div>
    </div>
    <div class="result-body">
      <a href="${s}" target="_blank" rel="noopener noreferrer" class="yt-box" title="Watch on YouTube (${r})">
        <div class="yt-thumb-container">
          <img src="${n}" alt="${d(o)}" class="yt-thumb-img" loading="lazy" onerror="this.style.display='none'" />
          <div class="yt-play-overlay">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
          <div class="yt-time-badge">${r}</div>
        </div>
        <div class="yt-caption">
          <span>Watch @ ${I(e.start)}</span>
          <span>↗</span>
        </div>
      </a>
      <div class="transcript-container">
        ${Q(e)}
      </div>
    </div>
  `,t}function S(){if(l>=i.length)return;const e=Math.min(l+G,i.length);for(let t=l;t<e;t++){const s=Y(i[t]);x.appendChild(s)}if(l=e,O.textContent=`Showing ${l} of ${i.length} results`,l>=i.length)f.style.display="none",O.textContent=`Showing all ${i.length} results`;else{f.style.display="block";const t=i.length-l;f.textContent=`Load 5 More Results (${t} remaining)`}}function X(e){if(i=e,l=0,x.innerHTML="",e.length===0){R.style.display="none",x.innerHTML=`
      <div class="empty-state">
        No results matched your query.
      </div>
    `;return}R.style.display="flex",S()}function d(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function L(){const e=$.value.trim();if(e){if(h!=="keyword"&&!p){alert("Embedding model is still loading. Please wait a moment or switch to Keyword Only mode.");return}if(!g){alert("Corpus is still loading. Please wait.");return}y=!0,a.disabled=!0,a.textContent="Searching...",E({type:"SEARCH",id:String(Date.now()),query:e,options:{mode:h,topK:50,semanticWeight:.7,keywordWeight:.3}})}}a.addEventListener("click",L);$.addEventListener("keydown",e=>{e.key==="Enter"&&L()});k.forEach(e=>{e.addEventListener("click",()=>{k.forEach(t=>t.classList.remove("active")),e.classList.add("active"),h=e.getAttribute("data-mode"),C(),$.value.trim()&&!y&&L()})});B.addEventListener("change",()=>{p=!1,m.textContent="Re-initializing...",m.className="badge warning",C(),E({type:"INIT_MODEL",modelId:T,devicePreference:B.value})});const Z=new IntersectionObserver(e=>{for(const t of e)t.isIntersecting&&l<i.length&&!y&&S()},{rootMargin:"250px"});Z.observe(K);f.addEventListener("click",()=>{S()});async function J(){v.textContent="Fetching...",v.className="badge warning",E({type:"LOAD_CORPUS",url:"/embeddings_BAAI_bge-small-en-v1.5_int8.bin"}),m.textContent="Initializing...",m.className="badge warning",E({type:"INIT_MODEL",modelId:T,devicePreference:B.value})}J();
