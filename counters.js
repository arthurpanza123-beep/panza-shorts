(() => {
  const KEY = 'panza-counters-v1';
  const owners = {
    'Você': { ids: Array.from({ length: 22 }, (_, i) => i + 1).filter(n => n !== 6), color: '#8dafff', photo: 'avatar-panza.png', crop: 'panza' },
    Nando: { ids: Array.from({ length: 12 }, (_, i) => i + 1), color: '#89c9ab', photo: 'avatar-nando.png', crop: 'nando' },
    Duda: { ids: Array.from({ length: 12 }, (_, i) => i + 13), color: '#dfb578', initial: 'D' },
    Michael: { ids: Array.from({ length: 12 }, (_, i) => i + 25), color: '#b5a1df', photo: 'avatar-michael.png', crop: 'michael' },
    Renan: { ids: [37,38], color: '#d99ab6', photo: 'avatar-renan.png', crop: 'renan' },
  };
  const $ = selector => document.querySelector(selector);
  const pad = n => String(n).padStart(2, '0');
  const day = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const escape = text => String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  let view = 'team', editOwner, scripts = [], currentDay = day();
  let audio;
  async function feedback(increase) {
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      await audio.resume();
      const start = audio.currentTime;
      (increase ? [587.33, 880] : [392]).forEach((frequency, index) => {
        const oscillator = audio.createOscillator(), gain = audio.createGain();
        const at = start + index * .06;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(.045, at + .008);
        gain.gain.exponentialRampToValueAtTime(.0001, at + .19);
        oscillator.connect(gain); gain.connect(audio.destination);
        oscillator.start(at); oscillator.stop(at + .21);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      });
    } catch { /* Sound is optional; a device audio failure must not block saving. */ }
  }
  let state = read(KEY, null);
  if (!state) {
    const previous = read('panza-shorts-calendar-v2', {});
    const activity = read('panza-shorts-activity-v1', {});
    state = { version: 1, people: {}, events: [], previousDays: {} };
    for (const [name, owner] of Object.entries(owners)) {
      state.people[name] = { planned: owner.ids.length, done: owner.ids.filter(id => previous[pad(id)]).length, extras: 0 };
    }
    for (const [date, entries] of Object.entries(activity)) {
      state.previousDays[date] = {};
      for (const [name, owner] of Object.entries(owners)) state.previousDays[date][name] = owner.ids.filter(id => entries[pad(id)]?.stage > 0).length;
    }
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { $('#notice').textContent = 'O navegador não conseguiu salvar os contadores.'; }
  }

  function todayFor(name) {
    const adjustments = state.events.filter(e => e.owner === name && e.day === day()).reduce((sum, e) => sum + e.doneDelta + e.extraDelta, 0);
    return Math.max(0, (state.previousDays[day()]?.[name] || 0) + adjustments);
  }

  function avatar(name) {
    const o = owners[name];
    return `<span class="avatar ${o.crop || ''}" title="${escape(name)}">${o.photo ? `<img src="./${o.photo}" alt="${escape(name)}" />` : escape(o.initial || name.slice(0,2).toUpperCase())}</span>`;
  }

  function render() {
    const names = Object.keys(owners);
    $('#remaining').textContent = names.reduce((n, k) => n + state.people[k].planned - state.people[k].done, 0);
    $('#finished').textContent = names.reduce((n, k) => n + state.people[k].done, 0);
    $('#extras').textContent = names.reduce((n, k) => n + state.people[k].extras, 0);
    $('#today').textContent = names.reduce((n, k) => n + todayFor(k), 0);
    $('#date').textContent = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    $('#date').dateTime = day();
    const visible = names.filter(name => (view !== 'today' || todayFor(name) > 0) && (!$('#onlyOpen').checked || state.people[name].done < state.people[name].planned));
    const html = visible.map(name => {
      const p = state.people[name], left = p.planned - p.done;
      return `<article class="counter ${left === 0 ? 'complete' : ''}" data-owner="${escape(name)}" style="--person:${owners[name].color}">
        <header>${avatar(name)}<h2>${escape(name)}</h2><button class="icon" data-action="edit" title="Ajustar contadores de ${escape(name)}" aria-label="Ajustar contadores de ${escape(name)}"><img src="./adjust.svg" alt="" /></button></header>
        <div class="balance"><strong>${left}</strong><span>${left === 1 ? 'falta' : 'faltam'}<small>de ${p.planned} shorts</small></span></div>
        <div class="progress"><i style="width:${p.done / p.planned * 100}%"></i></div>
        <div class="breakdown"><span><b>${p.done}</b> prontos</span><span><b>${p.extras}</b> extras</span><span><b>${todayFor(name)}</b> hoje</span></div>
        <div class="stepper"><button class="step minus" data-action="subtract" aria-label="Retirar um pronto de ${escape(name)}" title="Retirar um pronto" ${p.done + p.extras === 0 ? 'disabled' : ''}><img src="./minus.svg" alt="" /></button><span class="step-value"><b>${p.done + p.extras}</b><small>entregues</small></span><button class="step plus" data-action="add" aria-label="Adicionar um pronto a ${escape(name)}" title="Adicionar um pronto"><img src="./plus.svg" alt="" /></button></div>
        <button class="scripts-link" data-action="scripts">Roteiros <span>↗</span></button>
      </article>`;
    }).join('') || `<div class="empty">${view === 'today' ? 'Nenhum lançamento nesta visualização hoje.' : 'Todos os shorts da equipe estão prontos.'}</div>`;
    const previous = [...$('#counters').querySelectorAll('.counter')];
    // Keep the actual controls in place so rapid clicks and keyboard focus are stable.
    if (visible.length && previous.length === visible.length && previous.every((card, i) => card.dataset.owner === visible[i])) {
      const template = document.createElement('template'); template.innerHTML = html;
      [...template.content.children].forEach((next, index) => {
        const card = previous[index]; card.className = next.className;
        ['.balance', '.breakdown', '.step-value'].forEach(selector => { card.querySelector(selector).innerHTML = next.querySelector(selector).innerHTML; });
        card.querySelector('.progress i').style.width = next.querySelector('.progress i').style.width;
        card.querySelector('.minus').disabled = next.querySelector('.minus').disabled;
      });
    } else $('#counters').innerHTML = html;
  }

  function save(name, done, extras, type) {
    // Reload before each transaction so another open tab is not overwritten.
    state = read(KEY, state);
    const old = state.people[name];
    if (!Number.isInteger(done) || !Number.isInteger(extras) || done < 0 || done > old.planned || extras < 0 || extras > 99999) return false;
    const next = structuredClone(state);
    next.people[name] = { ...old, done, extras };
    const event = { id: crypto.randomUUID(), owner: name, day: day(), at: new Date().toISOString(), type, doneDelta: done - old.done, extraDelta: extras - old.extras };
    if (!event.doneDelta && !event.extraDelta) return true;
    next.events.push(event);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      state = next;
      render();
      $('#notice').textContent = `${name}: ${done} prontos, ${extras} extras.`;
      return true;
    } catch {
      $('#notice').textContent = 'Não foi possível salvar. Seus contadores anteriores foram mantidos.';
      return false;
    }
  }

  function register(card, increase) {
    const name = card.dataset.owner;
    state = read(KEY, state);
    const p = state.people[name];
    if (!increase && p.done + p.extras === 0) return;
    const done = increase ? Math.min(p.planned, p.done + 1) : (p.extras ? p.done : Math.max(0, p.done - 1));
    const extras = increase ? p.extras + (p.done === p.planned ? 1 : 0) : Math.max(0, p.extras - 1);
    if (save(name, done, extras, increase ? 'delivery' : 'correction')) {
      feedback(increase);
      const target = [...document.querySelectorAll('.counter')].find(el => el.dataset.owner === name);
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches && target) {
        target.querySelector('.balance strong').animate([{opacity:.35,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:220});
        const pulse = document.createElement('span'); pulse.className = 'count-feedback'; pulse.textContent = increase ? '+1' : '−1'; target.append(pulse);
        pulse.animate([{opacity:0,transform:'translateY(4px)'},{opacity:1,offset:.2},{opacity:0,transform:'translateY(-20px)'}],{duration:650}).finished.then(()=>pulse.remove());
      }
      if (!target) $('#onlyOpen').focus({preventScroll:true});
    }
  }

  $('#counters').addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const card = button.closest('.counter'), name = card.dataset.owner;
    if (button.dataset.action === 'add') register(card, true);
    if (button.dataset.action === 'subtract') register(card, false);
    if (button.dataset.action === 'edit') {
      editOwner = name;
      $('#editTitle').textContent = `Ajustar · ${name}`;
      $('#editDone').value = state.people[name].done;
      $('#editDone').max = state.people[name].planned;
      $('#editExtras').value = state.people[name].extras;
      $('#editDialog').showModal();
    }
    if (button.dataset.action === 'scripts') {
      $('#scriptsTitle').textContent = name === 'Você' ? 'Seus roteiros' : `Roteiros · ${name}`;
      $('#scripts').innerHTML = scripts.filter(s => owners[name].ids.includes(Number(s.num))).map(s => `<li><b>${pad(s.num)}</b><span>${escape(s.title)}</span></li>`).join('') || '<li>Os roteiros não carregaram. Atualize a página para tentar novamente.</li>';
      $('#scriptsDialog').showModal();
    }
  });
  $('#editForm').addEventListener('submit', event => {
    event.preventDefault();
    if (save(editOwner, Number($('#editDone').value), Number($('#editExtras').value), 'correction')) $('#editDialog').close();
  });
  document.querySelectorAll('.close').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => {
    view = b.dataset.view;
    document.querySelectorAll('[data-view]').forEach(el => { const active = el === b; el.classList.toggle('active', active); el.setAttribute('aria-pressed', String(active)); });
    render();
  }));
  $('#onlyOpen').addEventListener('change', render);
  window.addEventListener('storage', e => { if (e.key === KEY) { state = read(KEY, state); render(); } });
  function refreshDay() { if (currentDay !== day()) { currentDay = day(); render(); } }
  setInterval(refreshDay, 15000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshDay(); });
  fetch('./shorts.json').then(r => { if (!r.ok) throw Error(r.status); return r.json(); }).then(data => { scripts = data; }).catch(() => {});
  render();
})();
