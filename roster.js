(() => {
  const KEY = 'panza-counters-v1';
  const owners = {
    'Você': { ids: Array.from({length:22}, (_,i) => i+1).filter(n => n !== 6), photo:'avatar-panza.png', crop:'panza', color:'#8dafff' },
    Nando: { ids:Array.from({length:12}, (_,i) => i+1), photo:'avatar-nando.png', crop:'nando', color:'#89c9ab' },
    Duda: { ids:Array.from({length:12}, (_,i) => i+13), initial:'D', color:'#dfb578' },
    Michael: { ids:Array.from({length:12}, (_,i) => i+25), photo:'avatar-michael.png', crop:'michael', color:'#b5a1df' },
    Renan: { ids:[37,38], photo:'avatar-renan.png', crop:'renan', color:'#d99ab6' }
  };
  const $ = s => document.querySelector(s);
  const pad = n => String(n).padStart(2,'0');
  const day = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const escape = text => String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  let state = read(KEY,null), scripts = [], teamScripts = [], editOwner, audio, noticeTimer;
  const displayName = name => name === 'Michael' ? 'Micha' : name;
  if (!state) {
    const previous = read('panza-shorts-calendar-v2', {}), activity = read('panza-shorts-activity-v1', {});
    state = {version:1, people:{}, events:[], previousDays:{}};
    for (const [name, owner] of Object.entries(owners)) state.people[name] = {planned:owner.ids.length, done:owner.ids.filter(id => previous[pad(id)]).length, extras:0};
    for (const [date, entries] of Object.entries(activity)) {
      state.previousDays[date] = {};
      for (const [name, owner] of Object.entries(owners)) state.previousDays[date][name] = owner.ids.filter(id => entries[pad(id)]?.stage > 0).length;
    }
    try { localStorage.setItem(KEY,JSON.stringify(state)); } catch { $('#notice').textContent = 'O navegador não conseguiu salvar os contadores.'; }
  }
  async function feedback(increase) {
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      await audio.resume();
      const start = audio.currentTime;
      (increase ? [587.33,880] : [392]).forEach((frequency,index) => {
        const oscillator = audio.createOscillator(), gain = audio.createGain(), at = start + index*.06;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0,at); gain.gain.linearRampToValueAtTime(.045,at+.008); gain.gain.exponentialRampToValueAtTime(.0001,at+.19);
        oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(at); oscillator.stop(at+.21);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      });
    } catch { /* Audio availability must never block a delivery. */ }
  }
  function todayFor(name) {
    return (state.previousDays?.[day()]?.[name] || 0) + state.events.filter(e => e.owner === name && e.day === day() && e.type === 'delivery').reduce((sum,e) => sum + Math.max(0,e.doneDelta) + Math.max(0,e.extraDelta || 0),0);
  }
  function render() {
    const names = Object.keys(owners);
    $('#remaining').textContent = names.reduce((sum,name) => sum + state.people[name].planned - state.people[name].done,0);
    $('#todayTotal').textContent = names.reduce((sum,name) => sum + todayFor(name),0);
    const visible = names;
    const html = visible.map(name => {
      const p = state.people[name], owner = owners[name], left = p.planned-p.done;
      return `<article class="counter ${left ? '' : 'complete'}" data-owner="${escape(name)}" style="--person:${owner.color}">
        <div class="person"><span class="avatar ${owner.crop || ''}">${owner.photo ? `<img src="./${owner.photo}" alt="${escape(displayName(name))}" />` : owner.initial}</span><div class="person-copy"><h3>${escape(displayName(name))}</h3><span class="today-person ${todayFor(name) ? 'has-delivery' : ''}"><b>${todayFor(name)}</b> hoje${left ? '' : ' · Tudo em dia'}</span></div></div>
        <div class="remaining"><div class="balance"><strong>${left}</strong><span>${left === 1 ? 'falta' : 'faltam'}</span></div><div class="progress"><i style="width:${p.planned ? p.done/p.planned*100 : 100}%"></i></div></div>
        <form class="delivery"><button class="primary" type="submit" ${left ? '' : 'disabled'}><img src="./check.svg" alt="" /><span>${left ? 'Entregou' : 'Concluído'}</span></button></form>
        <div class="row-tools"><button class="icon" data-action="scripts" title="Roteiros de ${escape(name)}" aria-label="Roteiros de ${escape(name)}"><img src="./clapperboard.svg" alt="" /></button><button class="icon" data-action="edit" title="Ajustar quantidade de ${escape(name)}" aria-label="Ajustar quantidade de ${escape(name)}"><img src="./adjust.svg" alt="" /></button></div>
      </article>`;
    }).join('');
    const current = [...$('#counters').querySelectorAll('.counter')];
    // Update values without replacing focused inputs or buttons.
    if (visible.length && current.length === visible.length && current.every((row,i) => row.dataset.owner === visible[i])) {
      const template = document.createElement('template'); template.innerHTML = html;
      [...template.content.children].forEach((next,i) => {
        const row = current[i]; row.className = next.className;
        ['.balance','.person-copy'].forEach(s => { row.querySelector(s).innerHTML = next.querySelector(s).innerHTML; });
        row.querySelector('.progress i').style.width = next.querySelector('.progress i').style.width;
        const button = row.querySelector('.primary');
        button.disabled = next.querySelector('.primary').disabled;
        button.querySelector('span').textContent = next.querySelector('.primary span').textContent;
      });
    } else $('#counters').innerHTML = html || '<div class="empty">Equipe em dia. Nenhum short faltando.</div>';
    window.dispatchEvent(new CustomEvent('panza-update', {detail:structuredClone(state)}));
  }
  function save(name, done, type) {
    state = read(KEY,state);
    const old = state.people[name];
    if (!Number.isInteger(done) || done < 0 || done > old.planned) return false;
    if (done === old.done) return true;
    const next = structuredClone(state);
    // Preserve existing extras and history, even though they are no longer displayed.
    next.people[name] = {...old, done};
    next.events.push({id:crypto.randomUUID(),owner:name,day:day(),at:new Date().toISOString(),type,doneDelta:done-old.done,extraDelta:0});
    try {
      localStorage.setItem(KEY,JSON.stringify(next)); state = next; render();
      clearTimeout(noticeTimer);
      $('#notice').textContent = `${displayName(name)}: ${old.planned-done} ${old.planned-done === 1 ? 'restante' : 'restantes'}.`;
      noticeTimer = setTimeout(() => { $('#notice').textContent = ''; },3500);
      return true;
    } catch {
      $('#notice').textContent = 'Não foi possível salvar. Seus contadores anteriores foram mantidos.';
      return false;
    }
  }
  $('#counters').addEventListener('submit', event => {
    event.preventDefault();
    const row = event.target.closest('.counter'), name = row.dataset.owner;
    state = read(KEY,state);
    const p = state.people[name], quantity = 1;
    if (p.done >= p.planned) { render(); return; }
    if (save(name,p.done+quantity,'delivery')) {
      feedback(true);
      const target = [...document.querySelectorAll('.counter')].find(el => el.dataset.owner === name);
      if (target && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        target.querySelector('.balance strong').animate([{opacity:.35,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:220});
        const pulse = document.createElement('span'); pulse.className = 'count-feedback'; pulse.textContent = `−${quantity}`; target.append(pulse);
        pulse.animate([{opacity:0,transform:'translateY(4px)'},{opacity:1,offset:.2},{opacity:0,transform:'translateY(-20px)'}],{duration:650}).finished.then(() => pulse.remove());
      }
    }
  });
  $('#counters').addEventListener('click', event => {
    const button = event.target.closest('[data-action]'); if (!button) return;
    const name = button.closest('.counter').dataset.owner;
    if (button.dataset.action === 'edit') {
      state = read(KEY,state); editOwner = name;
      $('#editTitle').textContent = `Ajustar · ${displayName(name)}`;
      $('#editRemaining').value = state.people[name].planned-state.people[name].done;
      $('#editRemaining').max = state.people[name].planned; $('#editDialog').showModal();
    } else {
      $('#scriptsTitle').textContent = name === 'Você' ? 'Seus roteiros' : `Roteiros · ${displayName(name)}`;
      const assigned = name === 'Você' ? scripts.filter(s => owners[name].ids.includes(Number(s.num))) : teamScripts.filter(s => s.owner === name);
      $('#scripts').innerHTML = assigned.map(s => `<li><b>${pad(s.num)}</b><span>${escape(s.title)}</span></li>`).join('') || '<li>Os roteiros não carregaram. Atualize a página para tentar novamente.</li>';
      $('#scriptsDialog').showModal();
    }
  });
  $('#editForm').addEventListener('submit', event => {
    event.preventDefault(); state = read(KEY,state);
    if (save(editOwner,state.people[editOwner].planned-Number($('#editRemaining').value),'correction')) { $('#editDialog').close(); feedback(false); }
  });
  document.querySelectorAll('.close').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
  let displayedDay = day();
  setInterval(() => { if (displayedDay !== day()) { displayedDay = day(); render(); } }, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { state = read(KEY,state); displayedDay = day(); render(); } });
  window.addEventListener('storage', event => { if (event.key === KEY) { state = read(KEY,state); render(); } });
  fetch('./shorts.json').then(r => { if (!r.ok) throw Error(r.status); return r.json(); }).then(data => { scripts = data; }).catch(() => {});
  fetch('./team-scripts.json').then(r => { if (!r.ok) throw Error(r.status); return r.json(); }).then(data => { teamScripts = data; }).catch(() => {});
  render();
})();
