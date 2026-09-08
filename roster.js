(() => {
  const KEY = 'panza-counters-v3';
  const GIST_ID = 'ed2cc4645817f0eda1ec5d16880008fd';
  const getAuth = () => atob('Z2hvX2g4QVRNSUN0UVTHRzNHVGJyZGNhOUVYaXdPbndtZDNoTE9YWg==');
  const getHeaders = () => ({
    'Authorization': 'Bearer ' + getAuth(),
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  });

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
  let state = read(KEY, null), editOwner, audio, noticeTimer;
  const displayName = name => name === 'Michael' ? 'Micha' : name;

  function setSyncStatus(type, label) {
    const badge = $('#syncStatus'), text = $('#syncText');
    if (!badge || !text) return;
    badge.className = 'sync-badge ' + (type || '');
    text.textContent = label;
  }

  async function pushCloud(nextState) {
    setSyncStatus('syncing', 'Salvando...');
    try {
      const payload = { ...nextState, updatedAt: new Date().toISOString() };
      const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          files: {
            'state.json': {
              content: JSON.stringify(payload)
            }
          }
        })
      });
      if (res.ok) {
        setSyncStatus('saved', 'Sincronizado');
      } else {
        setSyncStatus('offline', 'Salvo local');
      }
    } catch {
      setSyncStatus('offline', 'Salvo local');
    }
  }

  async function syncWithCloud(silent = false) {
    if (!silent) setSyncStatus('syncing', 'Sincronizando...');
    try {
      const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        headers: getHeaders(),
        cache: 'no-store'
      });
      if (!res.ok) throw new Error('Status ' + res.status);
      const gist = await res.json();
      const content = gist.files?.['state.json']?.content;
      if (!content) return;
      const cloud = JSON.parse(content);
      if (!cloud || !cloud.people) {
        if (!silent) setSyncStatus('saved', 'Sincronizado');
        return;
      }

      let dirty = false;
      const merged = structuredClone(cloud);
      merged.events ||= [];
      merged.previousDays ||= {};

      for (const name of Object.keys(owners)) {
        if (!merged.people[name]) {
          merged.people[name] = { planned: owners[name].ids.length, done: 0, extras: 0 };
          dirty = true;
        }
      }

      if (dirty) {
        merged.updatedAt = new Date().toISOString();
        state = merged;
        localStorage.setItem(KEY, JSON.stringify(state));
        render();
        await pushCloud(state);
      } else {
        const hasPeopleDiff = JSON.stringify(cloud.people) !== JSON.stringify(state?.people);
        const hasEventsDiff = (cloud.events?.length || 0) !== (state?.events?.length || 0);
        if (hasPeopleDiff || hasEventsDiff) {
          state = cloud;
          localStorage.setItem(KEY, JSON.stringify(state));
          render();
        }
        setSyncStatus('saved', 'Sincronizado');
      }
    } catch (err) {
      if (!silent) setSyncStatus('offline', 'Modo offline');
    }
  }

  if (!state || state.version !== 3) {
    const todayStr = day(), nowIso = new Date().toISOString();
    const initEvents = [];
    for (let i = 0; i < 7; i++) initEvents.push({id:`init-voce-${i}`, owner:'Você', day:todayStr, at:nowIso, type:'delivery', doneDelta:1, extraDelta:0});
    for (let i = 0; i < 7; i++) initEvents.push({id:`init-nando-${i}`, owner:'Nando', day:todayStr, at:nowIso, type:'delivery', doneDelta:1, extraDelta:0});
    for (let i = 0; i < 5; i++) initEvents.push({id:`init-duda-${i}`, owner:'Duda', day:todayStr, at:nowIso, type:'delivery', doneDelta:1, extraDelta:0});
    for (let i = 0; i < 5; i++) initEvents.push({id:`init-micha-${i}`, owner:'Michael', day:todayStr, at:nowIso, type:'delivery', doneDelta:1, extraDelta:0});
    for (let i = 0; i < 2; i++) initEvents.push({id:`init-renan-${i}`, owner:'Renan', day:todayStr, at:nowIso, type:'delivery', doneDelta:1, extraDelta:0});

    state = {
      version: 3,
      people: {
        'Você': { planned: 21, done: 7, extras: 0 },
        'Nando': { planned: 12, done: 7, extras: 0 },
        'Duda': { planned: 12, done: 5, extras: 0 },
        'Michael': { planned: 12, done: 5, extras: 0 },
        'Renan': { planned: 2, done: 2, extras: 0 }
      },
      events: initEvents,
      previousDays: {},
      updatedAt: nowIso
    };
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
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
    } catch {}
  }

  function todayFor(name) {
    return (state.previousDays?.[day()]?.[name] || 0) + (state.events || []).filter(e => e.owner === name && e.day === day() && e.type === 'delivery').reduce((sum,e) => sum + Math.max(0,e.doneDelta) + Math.max(0,e.extraDelta || 0),0);
  }

  function render() {
    const names = Object.keys(owners);
    $('#remaining').textContent = names.reduce((sum,name) => sum + (state.people[name]?.planned || 0) - (state.people[name]?.done || 0),0);
    $('#todayTotal').textContent = names.reduce((sum,name) => sum + todayFor(name),0);
    const visible = names;
    const html = visible.map(name => {
      const p = state.people[name] || {planned:0, done:0}, owner = owners[name], left = p.planned-p.done;
      return `<article class="counter ${left ? '' : 'complete'}" data-owner="${escape(name)}" style="--person:${owner.color}">
        <div class="person"><span class="avatar ${owner.crop || ''}">${owner.photo ? `<img src="./${owner.photo}" alt="${escape(displayName(name))}" />` : owner.initial}</span><div class="person-copy"><h3>${escape(displayName(name))}</h3><span class="today-person ${todayFor(name) ? 'has-delivery' : ''}"><b>${todayFor(name)}</b> hoje${left ? '' : ' · Tudo em dia'}</span></div></div>
        <div class="remaining"><div class="balance"><strong>${left}</strong><span>${left === 1 ? 'falta' : 'faltam'}</span></div><div class="progress"><i style="width:${p.planned ? p.done/p.planned*100 : 100}%"></i></div></div>
        <form class="delivery"><button class="primary" type="submit" ${left ? '' : 'disabled'}><img src="./check.svg" alt="" /><span>${left ? 'Entregou' : 'Concluído'}</span></button></form>
        <div class="row-tools"><button class="icon" data-action="edit" title="Ajustar quantidade de ${escape(name)}" aria-label="Ajustar quantidade de ${escape(name)}"><img src="./adjust.svg" alt="" /></button></div>
      </article>`;
    }).join('');
    const current = [...$('#counters').querySelectorAll('.counter')];
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
    next.people[name] = {...old, done};
    next.events.push({id:crypto.randomUUID(),owner:name,day:day(),at:new Date().toISOString(),type,doneDelta:done-old.done,extraDelta:0});
    next.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(KEY,JSON.stringify(next)); state = next; render();
      pushCloud(next);
      clearTimeout(noticeTimer);
      $('#notice').textContent = `${displayName(name)}: ${old.planned-done} ${old.planned-done === 1 ? 'restante' : 'restantes'}.`;
      noticeTimer = setTimeout(() => { $('#notice').textContent = ''; },3500);
      return true;
    } catch {
      $('#notice').textContent = 'Não foi possível salvar.';
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
    }
  });

  $('#editForm').addEventListener('submit', event => {
    event.preventDefault(); state = read(KEY,state);
    if (save(editOwner,state.people[editOwner].planned-Number($('#editRemaining').value),'correction')) { $('#editDialog').close(); feedback(false); }
  });

  document.querySelectorAll('.close').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));

  let displayedDay = day();
  setInterval(() => { if (displayedDay !== day()) { displayedDay = day(); render(); } }, 15000);

  // Real-time automatic background polling every 3.5 seconds
  setInterval(() => {
    if (document.hidden || $('#editDialog')?.open) return;
    syncWithCloud(true);
  }, 3500);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      state = read(KEY,state);
      displayedDay = day();
      render();
      syncWithCloud(false);
    }
  });

  window.addEventListener('storage', event => { if (event.key === KEY) { state = read(KEY,state); render(); } });
  
  render();
  syncWithCloud(false);
})();
