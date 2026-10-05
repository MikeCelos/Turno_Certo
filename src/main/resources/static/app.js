const $ = id => document.getElementById(id);
const form = $('shift-form');
const holidays = new Set();
const money = cents => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
const number = value => new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 4 }).format(value);
const duration = minutes => `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
const category = { 'util-diurno': 'Útil diurno', 'util-noturno': 'Útil noturno', 'especial-diurno': 'Especial diurno', 'especial-noturno': 'Especial noturno' };
const time = value => new Intl.DateTimeFormat('pt-PT', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
const date = value => new Intl.DateTimeFormat('pt-PT', { timeZone: 'Europe/Lisbon', day: '2-digit', month: 'short' }).format(new Date(value));
const month = value => new Intl.DateTimeFormat('pt-PT', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(`${value}-01T12:00Z`));
let revision = 0;
function dirty() {
  revision++;
  $('results').hidden = true;
  $('empty').hidden = false;
  $('result-state').textContent = 'Dados alterados · calcula para atualizar o resultado';
  $('form-error').hidden = true;
}
form.addEventListener('input', dirty);
function drawHolidays() {
  $('holiday-count').textContent = `${holidays.size} configurado${holidays.size === 1 ? '' : 's'}`;
  $('holiday-list').replaceChildren();
  [...holidays].sort().forEach(value => {
    const li = document.createElement('li');
    const label = document.createElement('span'); label.textContent = value.split('-').reverse().join('/');
    const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Remover'; button.setAttribute('aria-label', `Remover feriado ${label.textContent}`);
    button.onclick = () => { holidays.delete(value); drawHolidays(); dirty(); };
    li.append(label, button); $('holiday-list').append(li);
  });
}
$('add-holiday').onclick = () => {
  const value = $('holiday-date').value;
  if (!value) { $('holiday-error').textContent = 'Escolhe uma data para adicionar.'; return; }
  holidays.add(value); $('holiday-date').value = ''; $('holiday-error').textContent = ''; drawHolidays(); dirty();
};
function render(result) {
  $('total').textContent = money(result.payableCents);
  $('regime-badge').textContent = result.regime === 'extra' ? 'Extraordinário' : (result.regime === 'misto' ? 'Misto' : 'Normal');
  $('total-description').textContent = result.regime === 'extra'
    ? 'O trabalho extra é pago pelo coeficiente completo.'
    : (result.regime === 'misto'
      ? 'Turno misto: período normal (apenas suplementos) e período extraordinário (coeficiente completo).'
      : 'Apenas o suplemento. O valor de 1 R já está incluído na base.');
  $('duration').textContent = duration(result.totalMinutes);
  $('base-rate').textContent = `${money(result.segments[0].rateCents)}/h`;
  $('segment-count').textContent = result.segments.length;
  $('segments').replaceChildren(); $('timeline').replaceChildren();
  for (const s of result.segments) {
    const bar = document.createElement('i'); bar.className = s.category;
    // flex-grow is a numeric DOM style property, never interpolated HTML.
    bar.style.flexGrow = String(s.minutes); bar.title = `${category[s.category]} · ${duration(s.minutes)}`;
    $('timeline').append(bar);
    const row = document.createElement('tr');
    const startDateStr = date(s.start);
    const endDateStr = date(new Date(new Date(s.end).getTime() - 1000));
    const dateLabel = startDateStr === endDateStr ? startDateStr : `${startDateStr} – ${endDateStr}`;

    const categoryLabel = category[s.category] || s.category;
    const regimeDetail = result.regime === 'misto' ? (s.regime === 'normal' ? 'Normal' : 'Extra') : '';
    const secondLine = [dateLabel, categoryLabel, regimeDetail].filter(Boolean).join(' · ');
    const thirdLine = s.firstExtra ? 'Primeira hora extra' : (s.regime === 'normal' && s.payableCoefficient === 0 ? 'Incluído na remuneração base' : '');

    const values = [
      [`${time(s.start)} – ${time(s.end)}`, secondLine, thirdLine],
      [duration(s.minutes)],
      [`${number(s.minutes / 60)} h × ${number(s.payableCoefficient / 100)} × ${money(s.rateCents)}`, `Coeficiente total: ${number(s.coefficient / 100)} R`],
      [money(s.payableCents)],
    ];
    values.forEach((lines, index) => {
      const cell = document.createElement('td');
      lines.filter(Boolean).forEach((line, i) => { const el = document.createElement(i ? 'small' : 'strong'); el.textContent = line; if (index === 0 && i === 1) el.className = 'category'; cell.append(el); });
      row.append(cell);
    });
    $('segments').append(row);
  }
  const payments = result.payments.filter(p => p.payableCents > 0);
  $('payment-month').textContent = payments.length ? payments.map(p => month(p.month)).join(' / ') : 'Sem suplemento a pagar';
  $('payment-detail').textContent = payments.length ? payments.map(p => `${month(p.month)}: ${money(p.payableCents)}`).join(' · ') + ' · Dois meses após o trabalho.' : 'Este turno normal está integralmente incluído na remuneração base.';
  $('results').hidden = false; $('empty').hidden = true;
}
async function calculate(isExample = false) {
  if (!form.reportValidity()) return;
  const currentRevision = revision;
  $('calculate').disabled = true; $('calculate').textContent = 'A calcular…'; $('form-error').hidden = true;
  try {
    const input = Object.fromEntries(new FormData(form)); input.holidays = [...holidays];
    const response = await fetch('/api/calculate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    const result = await response.json();
    if (revision !== currentRevision) return;
    if (!response.ok) throw new Error(result.error);
    render(result);
    $('result-state').textContent = isExample ? 'Exemplo calculado · R fictício de 20 €/h' : `${input.workType} · ${holidays.size} feriado${holidays.size === 1 ? '' : 's'} configurado${holidays.size === 1 ? '' : 's'}`;
  } catch (error) {
    if (revision !== currentRevision) return;
    $('form-error').textContent = error.message === 'Failed to fetch' ? 'Sem ligação à aplicação. Confirma que o servidor continua aberto no Terminal.' : error.message;
    $('form-error').hidden = false; $('results').hidden = true; $('empty').hidden = false;
    $('result-state').textContent = 'Revê os dados do turno';
  } finally { $('calculate').disabled = false; $('calculate').textContent = 'Calcular turno'; }
}
form.onsubmit = event => { event.preventDefault(); switchTab('single'); calculate(); };
$('example').onclick = () => {
  form.reset(); holidays.clear(); drawHolidays(); $('holiday-error').textContent = ''; updateMixedVisibility(); revision++; switchTab('single'); calculate(true);
};

// LocalStorage: recuperar preferências guardadas
const RATE_KEY = 'tc_rate';
const WORK_TYPE_KEY = 'tc_work_type';
const REGIME_KEY = 'tc_regime';

function updateMixedVisibility() {
  const isMixed = form.elements['regime'] && form.elements['regime'].value === 'misto';
  const mixedBox = $('mixed-config');
  if (mixedBox) {
    mixedBox.hidden = !isMixed;
    if (isMixed && !$('extraStart').value) {
      const anchor = getAnchorDate();
      $('extraStart').value = `${anchor}T20:00`;
    }
  }
}

let hasSaved = false;
try {
  const savedRate = localStorage.getItem(RATE_KEY);
  if (savedRate) { $('rate').value = savedRate; hasSaved = true; }
  const savedWorkType = localStorage.getItem(WORK_TYPE_KEY);
  if (savedWorkType) { $('workType').value = savedWorkType; hasSaved = true; }
  const savedRegime = localStorage.getItem(REGIME_KEY);
  if (savedRegime) {
    const radio = form.querySelector(`input[name="regime"][value="${savedRegime}"]`);
    if (radio) { radio.checked = true; hasSaved = true; }
  }
} catch (_) {}
updateMixedVisibility();

$('rate').addEventListener('input', () => {
  try { localStorage.setItem(RATE_KEY, $('rate').value); } catch (_) {}
});
$('workType').addEventListener('input', () => {
  try { localStorage.setItem(WORK_TYPE_KEY, $('workType').value); } catch (_) {}
});
form.querySelectorAll('input[name="regime"]').forEach(radio => {
  radio.addEventListener('change', () => {
    updateMixedVisibility();
    try { localStorage.setItem(REGIME_KEY, radio.value); } catch (_) {}
  });
});

// Atalhos rápidos de turnos (Presets)
function getAnchorDate() {
  const startVal = $('start').value;
  if (startVal && /^\d{4}-\d{2}-\d{2}/.test(startVal)) {
    return startVal.slice(0, 10);
  }
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getNextDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

document.querySelectorAll('.preset-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    const anchor = getAnchorDate();
    const next = getNextDate(anchor);
    const type = btn.getAttribute('data-hours');
    if (type === 'night') {
      $('start').value = `${anchor}T20:00`;
      $('end').value = `${next}T08:00`;
      const extraRadio = form.querySelector('input[name="regime"][value="extra"]');
      if (extraRadio) extraRadio.checked = true;
      updateMixedVisibility();
    } else if (type === 'day') {
      $('start').value = `${anchor}T08:00`;
      $('end').value = `${anchor}T20:00`;
      updateMixedVisibility();
    } else if (type === '24h-mixed') {
      $('start').value = `${anchor}T08:00`;
      $('extraStart').value = `${anchor}T20:00`;
      $('end').value = `${next}T08:00`;
      const mistoRadio = form.querySelector('input[name="regime"][value="misto"]');
      if (mistoRadio) mistoRadio.checked = true;
      updateMixedVisibility();
    } else if (type === 'full') {
      $('start').value = `${anchor}T08:00`;
      $('end').value = `${next}T08:00`;
      const extraRadio = form.querySelector('input[name="regime"][value="extra"]');
      if (extraRadio) extraRadio.checked = true;
      updateMixedVisibility();
    }
    dirty();
    calculate();
  });
});

// Ajuda contextual sobre o valor R
const rateHelpBtn = $('rate-help-btn');
const rateHelpBox = $('rate-help-box');
if (rateHelpBtn && rateHelpBox) {
  rateHelpBtn.addEventListener('click', () => {
    rateHelpBox.hidden = !rateHelpBox.hidden;
  });
}

calculate(!hasSaved);

// Registo PWA Service Worker e Botão de Instalação
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

let deferredPrompt = null;
const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

const installBtn = $('btn-install');
const installDialog = $('install-dialog');
const iosGuide = $('ios-guide');
const genericGuide = $('generic-guide');
const closeInstallBtn = $('close-install');
const confirmInstallBtn = $('confirm-install-btn');

if (!isStandalone) {
  if (isIos && installBtn) {
    installBtn.hidden = false;
  }
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn && !isStandalone) installBtn.hidden = false;
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  if (installBtn) installBtn.hidden = true;
});

if (installBtn && installDialog) {
  installBtn.onclick = () => {
    if (isIos) {
      if (iosGuide) iosGuide.hidden = false;
      if (genericGuide) genericGuide.hidden = true;
      installDialog.showModal();
    } else if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
    } else {
      if (iosGuide) iosGuide.hidden = true;
      if (genericGuide) genericGuide.hidden = false;
      installDialog.showModal();
    }
  };
}

if (closeInstallBtn && installDialog) {
  closeInstallBtn.onclick = () => installDialog.close();
}

if (confirmInstallBtn) {
  confirmInstallBtn.onclick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
    }
    if (installDialog) installDialog.close();
  };
}

// --- Gestão de Tabs (Turno Individual vs Folha Mensal) ---
const tabSingle = $('tab-single');
const tabRoster = $('tab-roster');
const singleView = $('single-view');
const rosterView = $('roster-view');
const rosterBadge = $('roster-badge');

function switchTab(target) {
  if (target === 'roster') {
    if (tabRoster) {
      tabRoster.classList.add('active');
      tabRoster.setAttribute('aria-selected', 'true');
    }
    if (tabSingle) {
      tabSingle.classList.remove('active');
      tabSingle.setAttribute('aria-selected', 'false');
    }
    if (rosterView) rosterView.hidden = false;
    if (singleView) singleView.hidden = true;
  } else {
    if (tabSingle) {
      tabSingle.classList.add('active');
      tabSingle.setAttribute('aria-selected', 'true');
    }
    if (tabRoster) {
      tabRoster.classList.remove('active');
      tabRoster.setAttribute('aria-selected', 'false');
    }
    if (singleView) singleView.hidden = false;
    if (rosterView) rosterView.hidden = true;
  }
}

if (tabSingle) tabSingle.onclick = () => switchTab('single');
if (tabRoster) {
  tabRoster.onclick = () => {
    switchTab('roster');
    if (rosterShifts.length > 0 && $('roster-results') && $('roster-results').hidden) {
      calculateRoster();
    }
  };
}

// --- Folha Mensal (Roster) ---
const ROSTER_KEY = 'tc_roster';
let rosterShifts = [];
try {
  rosterShifts = JSON.parse(localStorage.getItem(ROSTER_KEY) || '[]');
  if (!Array.isArray(rosterShifts)) rosterShifts = [];
} catch (_) {
  rosterShifts = [];
}

function saveRoster() {
  try {
    localStorage.setItem(ROSTER_KEY, JSON.stringify(rosterShifts));
  } catch (_) {}
  updateRosterBadge();
}

function updateRosterBadge() {
  if (!rosterBadge) return;
  const count = rosterShifts.length;
  if (count > 0) {
    rosterBadge.textContent = count;
    rosterBadge.hidden = false;
  } else {
    rosterBadge.hidden = true;
  }
}

const monthNamesShort = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
function formatInputDate(dtLocal) {
  if (!dtLocal || dtLocal.length < 10) return '';
  const [y, m, d] = dtLocal.slice(0, 10).split('-');
  return `${d} ${monthNamesShort[parseInt(m, 10) - 1] || ''}`;
}

function formatInputTimeRange(startDt, endDt) {
  if (!startDt || !endDt) return '';
  const startTime = startDt.slice(11, 16);
  const endTime = endDt.slice(11, 16);
  const startDate = formatInputDate(startDt);
  const endDate = formatInputDate(endDt);
  if (startDate === endDate) {
    return `${startDate} · ${startTime} – ${endTime}`;
  }
  return `${startDate} ${startTime} – ${endDate} ${endTime}`;
}

async function calculateRoster() {
  updateRosterBadge();
  if (rosterShifts.length === 0) {
    if ($('roster-results')) $('roster-results').hidden = true;
    if ($('roster-empty')) $('roster-empty').hidden = false;
    if ($('roster-state')) $('roster-state').textContent = 'A folha mensal está vazia';
    return;
  }

  if ($('roster-state')) $('roster-state').textContent = 'A consolidar folha mensal…';
  try {
    const payload = {
      shifts: rosterShifts.map(s => ({
        workType: s.workType,
        regime: s.regime,
        start: s.start,
        end: s.end,
        rate: s.rate,
        extraStart: s.extraStart || null,
        normalRate: s.normalRate || null,
        startOccurrence: s.startOccurrence || null,
        endOccurrence: s.endOccurrence || null
      })),
      holidays: [...holidays]
    };
    const response = await fetch('/api/calculate-roster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Erro ao processar folha.');
    renderRoster(result);
  } catch (err) {
    if ($('roster-state')) $('roster-state').textContent = 'Erro ao processar folha: ' + err.message;
  }
}

function renderRoster(result) {
  updateRosterBadge();
  if ($('roster-results')) $('roster-results').hidden = false;
  if ($('roster-empty')) $('roster-empty').hidden = true;
  if ($('roster-state')) $('roster-state').textContent = `${result.totalShifts} turno${result.totalShifts === 1 ? '' : 's'} na folha · consolidado estilo recibo`;
  if ($('roster-total')) $('roster-total').textContent = money(result.payableCents);
  if ($('roster-shifts-badge')) $('roster-shifts-badge').textContent = `${result.totalShifts} turno${result.totalShifts === 1 ? '' : 's'}`;
  if ($('roster-duration')) $('roster-duration').textContent = duration(result.totalMinutes);
  if ($('roster-count-stat')) $('roster-count-stat').textContent = result.totalShifts;
  if ($('roster-list-count')) $('roster-list-count').textContent = result.totalShifts;

  const payments = (result.payments || []).filter(p => p.payableCents > 0);
  if ($('roster-payment-month')) {
    $('roster-payment-month').textContent = payments.length
      ? payments.map(p => month(p.month)).join(' / ')
      : 'Sem suplemento';
  }

  // Tabela Consolidada (CategorySummaries)
  if ($('roster-categories')) {
    $('roster-categories').replaceChildren();
    for (const cs of result.categorySummaries) {
      const row = document.createElement('tr');

      const c1 = document.createElement('td');
      const strong1 = document.createElement('strong');
      strong1.textContent = cs.label;
      const small1 = document.createElement('small');
      small1.textContent = `${cs.regime === 'extra' ? 'Extraordinário' : 'Normal'} · Valor-hora: ${money(cs.rateCents)}/h`;
      c1.append(strong1, small1);

      const c2 = document.createElement('td');
      const strong2 = document.createElement('strong');
      strong2.textContent = duration(cs.totalMinutes);
      c2.append(strong2);

      const c3 = document.createElement('td');
      const strong3 = document.createElement('strong');
      strong3.textContent = `${number(cs.totalMinutes / 60)} h × ${number(cs.payableCoefficient / 100)} × ${money(cs.rateCents)}`;
      const small3 = document.createElement('small');
      small3.textContent = `Coeficiente: ${number(cs.coefficient / 100)} R`;
      c3.append(strong3, small3);

      const c4 = document.createElement('td');
      const strong4 = document.createElement('strong');
      strong4.textContent = money(cs.payableCents);
      c4.append(strong4);

      row.append(c1, c2, c3, c4);
      $('roster-categories').append(row);
    }
  }

  // Lista de Turnos da Folha
  if ($('roster-shift-list')) {
    $('roster-shift-list').replaceChildren();
    rosterShifts.forEach((shiftItem, idx) => {
      const shiftRes = result.shifts && result.shifts[idx];
      const item = document.createElement('div');
      item.className = 'roster-shift-item';

      const info = document.createElement('div');
      info.className = 'roster-shift-info';

      const title = document.createElement('div');
      title.className = 'roster-shift-title';
      title.textContent = `${idx + 1}. ${shiftItem.workType || 'Turno'}`;

      const meta = document.createElement('div');
      meta.className = 'roster-shift-meta';

      const timeSpan = document.createElement('span');
      timeSpan.textContent = formatInputTimeRange(shiftItem.start, shiftItem.end);

      const tag = document.createElement('span');
      tag.className = 'roster-shift-tag';
      tag.textContent = shiftItem.regime === 'extra' ? 'Extra' : (shiftItem.regime === 'misto' ? 'Misto' : 'Normal');

      const durSpan = document.createElement('span');
      durSpan.textContent = shiftRes ? `· ${duration(shiftRes.totalMinutes)}` : '';

      meta.append(timeSpan, tag, durSpan);
      info.append(title, meta);

      const right = document.createElement('div');
      right.className = 'roster-shift-right';

      const val = document.createElement('div');
      val.className = 'roster-shift-val';
      val.textContent = shiftRes ? money(shiftRes.payableCents) : '-';

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-remove-shift';
      delBtn.textContent = '✕';
      delBtn.title = 'Remover turno';
      delBtn.setAttribute('aria-label', `Remover turno ${idx + 1}`);
      delBtn.onclick = () => removeRosterShift(shiftItem.id);

      right.append(val, delBtn);
      item.append(info, right);
      $('roster-shift-list').append(item);
    });
  }
}

function removeRosterShift(id) {
  rosterShifts = rosterShifts.filter(s => s.id !== id);
  saveRoster();
  if (rosterShifts.length > 0) {
    calculateRoster();
  } else {
    if ($('roster-results')) $('roster-results').hidden = true;
    if ($('roster-empty')) $('roster-empty').hidden = false;
    if ($('roster-state')) $('roster-state').textContent = 'A folha mensal está vazia';
    updateRosterBadge();
  }
}

if ($('clear-roster')) {
  $('clear-roster').onclick = () => {
    if (confirm('Tens a certeza de que queres limpar todos os turnos da folha mensal?')) {
      rosterShifts = [];
      saveRoster();
      if ($('roster-results')) $('roster-results').hidden = true;
      if ($('roster-empty')) $('roster-empty').hidden = false;
      if ($('roster-state')) $('roster-state').textContent = 'Folha mensal limpa';
    }
  };
}

if ($('load-roster-example')) {
  $('load-roster-example').onclick = () => {
    const anchor = getAnchorDate();
    const next = getNextDate(anchor);
    const next2 = getNextDate(next);
    const next3 = getNextDate(next2);
    const next4 = getNextDate(next3);
    const currentRate = $('rate').value || '20,00';
    const currentType = $('workType').value || 'Anestesia';

    rosterShifts = [
      {
        id: 's_ex1',
        workType: currentType,
        regime: 'extra',
        start: `${anchor}T20:00`,
        end: `${next}T08:00`,
        rate: currentRate,
        extraStart: null,
        normalRate: null
      },
      {
        id: 's_ex2',
        workType: currentType,
        regime: 'extra',
        start: `${next2}T08:00`,
        end: `${next2}T20:00`,
        rate: currentRate,
        extraStart: null,
        normalRate: null
      },
      {
        id: 's_ex3',
        workType: currentType,
        regime: 'misto',
        start: `${next3}T08:00`,
        end: `${next4}T08:00`,
        rate: currentRate,
        extraStart: `${next3}T20:00`,
        normalRate: '14,52'
      },
      {
        id: 's_ex4',
        workType: currentType,
        regime: 'extra',
        start: `${next4}T20:00`,
        end: `${getNextDate(next4)}T08:00`,
        rate: currentRate,
        extraStart: null,
        normalRate: null
      }
    ];
    saveRoster();
    calculateRoster();
  };
}

if ($('add-to-roster')) {
  $('add-to-roster').onclick = () => {
    if (!form.reportValidity()) return;
    const isMixed = form.elements['regime'] && form.elements['regime'].value === 'misto';
    const shiftItem = {
      id: 's_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      workType: $('workType').value.trim() || 'Anestesia',
      regime: form.elements['regime'].value,
      start: $('start').value,
      end: $('end').value,
      rate: $('rate').value,
      extraStart: (isMixed && $('extraStart').value) ? $('extraStart').value : null,
      normalRate: (isMixed && $('normalRate').value) ? $('normalRate').value : null,
      startOccurrence: $('startOccurrence').value || null,
      endOccurrence: $('endOccurrence').value || null
    };
    rosterShifts.push(shiftItem);
    saveRoster();

    const btn = $('add-to-roster');
    const origText = btn.textContent;
    btn.textContent = '✓ Adicionado à Folha!';
    btn.classList.add('btn-success');
    setTimeout(() => {
      btn.textContent = origText;
      btn.classList.remove('btn-success');
    }, 1200);

    switchTab('roster');
    calculateRoster();
  };
}

updateRosterBadge();
if (rosterShifts.length > 0) {
  calculateRoster();
}

