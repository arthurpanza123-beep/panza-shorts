(() => {
  const $ = s => document.querySelector(s);
  const escape = value => String(value === 'Michael' ? 'Micha' : value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  let state, days = 7;
  function openTab(name) {
    document.querySelectorAll('[data-tab]').forEach(b => { const active = b.dataset.tab === name; b.setAttribute('aria-selected',String(active)); b.tabIndex = active ? 0 : -1; document.getElementById(b.dataset.tab).hidden = !active; });
  }
  document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click',() => openTab(b.dataset.tab)));
  $('.dashboard-tabs').addEventListener('keydown',e => {
    const tabs = [...document.querySelectorAll('[data-tab]')], index = tabs.indexOf(document.activeElement);
    if (index < 0 || !['ArrowRight','ArrowLeft','Home','End'].includes(e.key)) return;
    e.preventDefault(); const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length-1 : (index+(e.key === 'ArrowRight' ? 1 : -1)+tabs.length)%tabs.length;
    openTab(tabs[next].dataset.tab); tabs[next].focus();
  });
  $('[data-open-team]').addEventListener('click',() => { openTab('team'); $('#tab-team').focus(); });
  document.querySelectorAll('[data-days]').forEach(b => b.addEventListener('click',() => { days = Number(b.dataset.days); document.querySelectorAll('[data-days]').forEach(el => el.setAttribute('aria-pressed',String(el === b))); render(); }));
  function count(date) {
    return Object.values(state.previousDays?.[date] || {}).reduce((a,n) => a+n,0) + state.events.filter(e => e.day === date && e.type === 'delivery').reduce((sum,e) => sum+Math.max(0,e.doneDelta)+Math.max(0,e.extraDelta || 0),0);
  }
  function render() {
    if (!state) return;
    const people = Object.entries(state.people), done = people.reduce((n,[,p]) => n+p.done,0), planned = people.reduce((n,[,p]) => n+p.planned,0), today = count(dateKey(new Date()));
    $('#dashboardDate').textContent = new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long'});
    const metrics = [['Hoje',today,'entregas registradas','calendar-days'],['Restantes',planned-done,'shorts na produção','clapperboard'],['Concluídos',done,`de ${planned} shorts`,'check-check'],['Progresso',`${planned ? Math.round(done/planned*100) : 0}%`,'da produção total','check']];
    $('#metrics').innerHTML = metrics.map(([label,value,detail,icon]) => `<article class="metric"><img src="./${icon}.svg" alt="" /><span class="metric-label">${label}</span><b>${value}</b><small>${detail}</small></article>`).join('');
    const series = Array.from({length:days},(_,i) => { const d = new Date(); d.setHours(12,0,0,0); d.setDate(d.getDate()-days+1+i); return {date:d,value:count(dateKey(d))}; });
    const max = Math.max(4,...series.map(d => d.value)), ceiling = Math.ceil(max/4)*4;
    const x = i => 32+i/(days-1)*568, y = v => 230-v/ceiling*206;
    const points = series.map((d,i) => `${x(i)},${y(d.value)}`).join(' ');
    const grid = Array.from({length:5},(_,i) => `<line class="grid-line" x1="32" x2="600" y1="${y(i*ceiling/4)}" y2="${y(i*ceiling/4)}"/><text x="20" y="${y(i*ceiling/4)+4}" text-anchor="end">${i*ceiling/4}</text>`).join('');
    const dates = series.map((d,i) => (days === 7 || i%5 === 0 || i === days-1) ? `<text x="${x(i)}" y="258" text-anchor="middle">${d.date.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</text>` : '').join('');
    $('#timeline').innerHTML = `<svg class="timeline-svg" viewBox="0 0 620 270" role="img" aria-label="Entregas nos últimos ${days} dias"><title>${series.map(d => `${d.date.toLocaleDateString('pt-BR')}: ${d.value}`).join('; ')}</title><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#298fff" stop-opacity=".3"/><stop offset="1" stop-color="#298fff" stop-opacity="0"/></linearGradient></defs>${grid}<polygon points="32,230 ${points} 600,230" fill="url(#chartFill)"/><polyline class="plot-line" points="${points}"/>${series.map((d,i) => `<circle cx="${x(i)}" cy="${y(d.value)}" r="${days === 7 ? 4 : 2.5}"><title>${d.date.toLocaleDateString('pt-BR')}: ${d.value} entregas</title></circle>`).join('')}${dates}</svg><div class="chart-note">${series.reduce((n,d) => n+d.value,0)} entregas no período</div>`;
    $('#teamProgress').innerHTML = people.map(([name,p]) => `<div class="progress-person"><header><b>${escape(name)}</b><span>${p.done} / ${p.planned}</span></header><div class="progress-track" role="progressbar" aria-label="Progresso de ${escape(name)}" aria-valuemin="0" aria-valuemax="${p.planned}" aria-valuenow="${p.done}"><i style="width:${p.planned ? p.done/p.planned*100 : 0}%"></i></div></div>`).join('');
  }
  window.addEventListener('panza-update',e => { state = e.detail; render(); });
})();
