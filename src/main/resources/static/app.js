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

// Multiplicadores e Coeficientes Padrão
const COEFFICIENTS_KEY = 'tc_custom_coefficients';
const DEFAULT_COEFFICIENTS = {
  'util-diurno': { normal: 100, firstExtra: 125, nextExtra: 150 },
  'util-noturno': { normal: 150, firstExtra: 175, nextExtra: 200 },
  'especial-diurno': { normal: 150, firstExtra: 175, nextExtra: 200 },
  'especial-noturno': { normal: 200, firstExtra: 225, nextExtra: 250 },
};

function getActiveCoefficients() {
  try {
    const saved = localStorage.getItem(COEFFICIENTS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return {
          'util-diurno': { ...DEFAULT_COEFFICIENTS['util-diurno'], ...(parsed['util-diurno'] || {}) },
          'util-noturno': { ...DEFAULT_COEFFICIENTS['util-noturno'], ...(parsed['util-noturno'] || {}) },
          'especial-diurno': { ...DEFAULT_COEFFICIENTS['especial-diurno'], ...(parsed['especial-diurno'] || {}) },
          'especial-noturno': { ...DEFAULT_COEFFICIENTS['especial-noturno'], ...(parsed['especial-noturno'] || {}) },
        };
      }
    }
  } catch (_) {}
  return JSON.parse(JSON.stringify(DEFAULT_COEFFICIENTS));
}

function saveActiveCoefficients(coeffs) {
  try {
    localStorage.setItem(COEFFICIENTS_KEY, JSON.stringify(coeffs));
  } catch (_) {}
}

// Gestão de Tema
const THEME_KEY = 'tc_theme';
const metaThemeColor = $('meta-theme-color');

function getActiveTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch (_) {}
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const isDark = theme === 'dark';
  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  if (metaThemeColor) metaThemeColor.content = isDark ? '#0c1418' : '#096653';
}

let activeTheme = getActiveTheme();
applyTheme(activeTheme);

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
    const input = Object.fromEntries(new FormData(form));
    input.holidays = [...holidays];
    input.customCoefficients = getActiveCoefficients();
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

function openModal(dialog) {
  if (!dialog) return;
  if (typeof dialog.showModal === 'function') {
    try {
      dialog.showModal();
      return;
    } catch (_) {}
  }
  dialog.setAttribute('open', '');
}

function closeModal(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === 'function') {
    try {
      dialog.close();
      return;
    } catch (_) {}
  }
  dialog.removeAttribute('open');
}

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  if (installBtn) installBtn.hidden = true;
});

if (installBtn && installDialog) {
  installBtn.onclick = () => {
    if (isIos) {
      if (iosGuide) iosGuide.hidden = false;
      if (genericGuide) genericGuide.hidden = true;
      openModal(installDialog);
    } else if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
    } else {
      if (iosGuide) iosGuide.hidden = true;
      if (genericGuide) genericGuide.hidden = false;
      openModal(installDialog);
    }
  };
}

if (closeInstallBtn && installDialog) {
  closeInstallBtn.onclick = () => closeModal(installDialog);
}

if (installDialog) {
  installDialog.addEventListener('click', e => {
    if (e.target === installDialog) closeModal(installDialog);
  });
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
  if (window.TurnoCertoAuth && window.TurnoCertoAuth.isConfigured()) {
    window.TurnoCertoAuth.syncUpload({
      customCoefficients: getActiveCoefficients(),
      roster: rosterShifts
    }).catch(() => {});
  }
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
      holidays: [...holidays],
      customCoefficients: getActiveCoefficients()
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
    btn.textContent = 'Adicionado à folha';
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



// Suporte para alternar tema dentro do modal de definições
document.querySelectorAll('input[name="app-theme"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const val = radio.value;
    if (val === 'auto') {
      try { localStorage.removeItem(THEME_KEY); } catch (_) {}
      activeTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      activeTheme = val;
      try { localStorage.setItem(THEME_KEY, activeTheme); } catch (_) {}
    }
    applyTheme(activeTheme);
  });
});

if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    try {
      if (!localStorage.getItem(THEME_KEY)) {
        activeTheme = e.matches ? 'dark' : 'light';
        applyTheme(activeTheme);
      }
    } catch (_) {}
  });
}

// ==========================================================
// --- Gestão de Configurações, Multiplicadores & Supabase ---
// ==========================================================



function populateSettingsModal() {
  try {
    const c = getActiveCoefficients();
    const setVal = (id, val) => {
      const el = $(id);
      if (el && typeof val === 'number') el.value = (val / 100).toFixed(2);
    };
    if (c) {
      if (c['util-diurno']) {
        setVal('coeff-util-diurno-normal', c['util-diurno'].normal);
        setVal('coeff-util-diurno-first', c['util-diurno'].firstExtra);
        setVal('coeff-util-diurno-next', c['util-diurno'].nextExtra);
      }
      if (c['util-noturno']) {
        setVal('coeff-util-noturno-normal', c['util-noturno'].normal);
        setVal('coeff-util-noturno-first', c['util-noturno'].firstExtra);
        setVal('coeff-util-noturno-next', c['util-noturno'].nextExtra);
      }
      if (c['especial-diurno']) {
        setVal('coeff-especial-diurno-normal', c['especial-diurno'].normal);
        setVal('coeff-especial-diurno-first', c['especial-diurno'].firstExtra);
        setVal('coeff-especial-diurno-next', c['especial-diurno'].nextExtra);
      }
      if (c['especial-noturno']) {
        setVal('coeff-especial-noturno-normal', c['especial-noturno'].normal);
        setVal('coeff-especial-noturno-first', c['especial-noturno'].firstExtra);
        setVal('coeff-especial-noturno-next', c['especial-noturno'].nextExtra);
      }
    }

    // Sincronizar escolha de tema nas definições
    const themeRadios = document.querySelectorAll('input[name="app-theme"]');
    let currentMode = 'auto';
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'dark' || saved === 'light') currentMode = saved;
    } catch (_) {}
    themeRadios.forEach(r => {
      r.checked = r.value === currentMode;
    });

    if (window.TurnoCertoAuth) {
      const conf = window.TurnoCertoAuth.getConfig();
      if ($('supabase-url')) $('supabase-url').value = conf.url || '';
      if ($('supabase-key')) $('supabase-key').value = conf.key || '';
      updateCloudStatusBadge();
    }
  } catch (err) {
    console.warn('Erro ao preencher definições:', err);
  }
  const statusMsg = $('settings-status');
  if (statusMsg) statusMsg.hidden = true;
}

function readSettingsModal() {
  const getVal = (id, fallback) => {
    const el = $(id);
    if (!el || !el.value) return fallback;
    const num = parseFloat(el.value.replace(',', '.'));
    return isNaN(num) || num < 0 ? fallback : Math.round(num * 100);
  };
  return {
    'util-diurno': {
      normal: Math.max(100, getVal('coeff-util-diurno-normal', 100)),
      firstExtra: getVal('coeff-util-diurno-first', 125),
      nextExtra: getVal('coeff-util-diurno-next', 150),
    },
    'util-noturno': {
      normal: Math.max(100, getVal('coeff-util-noturno-normal', 150)),
      firstExtra: getVal('coeff-util-noturno-first', 175),
      nextExtra: getVal('coeff-util-noturno-next', 200),
    },
    'especial-diurno': {
      normal: Math.max(100, getVal('coeff-especial-diurno-normal', 150)),
      firstExtra: getVal('coeff-especial-diurno-first', 175),
      nextExtra: getVal('coeff-especial-diurno-next', 200),
    },
    'especial-noturno': {
      normal: Math.max(100, getVal('coeff-especial-noturno-normal', 200)),
      firstExtra: getVal('coeff-especial-noturno-first', 225),
      nextExtra: getVal('coeff-especial-noturno-next', 250),
    },
  };
}

function updateCloudStatusBadge() {
  const badge = $('cloud-badge');
  if (!badge) return;
  const isConfigured = window.TurnoCertoAuth && window.TurnoCertoAuth.isConfigured();
  if (isConfigured) {
    badge.textContent = 'Configurado';
    badge.style.background = '#eef6f3';
    badge.style.color = '#096653';
  } else {
    badge.textContent = 'Offline';
    badge.style.background = '';
    badge.style.color = '';
  }
}

// Modal de Configurações
const btnSettings = $('btn-settings');
const dialogSettings = $('settings-dialog');
const closeSettings = $('close-settings');
const btnResetCoeffs = $('btn-reset-coefficients');
const btnSaveSettings = $('btn-save-settings');
const btnSaveSupabase = $('btn-save-supabase-config');

if (btnSettings && dialogSettings) {
  btnSettings.onclick = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    populateSettingsModal();
    openModal(dialogSettings);
  };
}

if (closeSettings && dialogSettings) {
  closeSettings.onclick = () => closeModal(dialogSettings);
}

if (dialogSettings) {
  dialogSettings.addEventListener('click', e => {
    if (e.target === dialogSettings) closeModal(dialogSettings);
  });
}

if (btnResetCoeffs) {
  btnResetCoeffs.onclick = () => {
    saveActiveCoefficients(DEFAULT_COEFFICIENTS);
    populateSettingsModal();
    const statusMsg = $('settings-status');
    if (statusMsg) {
      statusMsg.textContent = 'Coeficientes repostos de acordo com a tabela do SNS.';
      statusMsg.hidden = false;
    }
    // Recalcular se houver dados ativos
    if ($('results') && !$('results').hidden) calculate();
    if (rosterShifts.length > 0) calculateRoster();
  };
}

if (btnSaveSettings) {
  btnSaveSettings.onclick = () => {
    const updated = readSettingsModal();
    saveActiveCoefficients(updated);
    const statusMsg = $('settings-status');
    if (statusMsg) {
      statusMsg.textContent = 'Parâmetros atualizados com sucesso.';
      statusMsg.hidden = false;
    }
    // Sincronizar na nuvem se autenticado
    if (window.TurnoCertoAuth && window.TurnoCertoAuth.isConfigured()) {
      window.TurnoCertoAuth.syncUpload({ customCoefficients: updated, roster: rosterShifts });
    }
    // Recalcular se houver dados ativos
    if ($('results') && !$('results').hidden) calculate();
    if (rosterShifts.length > 0) calculateRoster();
  };
}

if (btnSaveSupabase) {
  btnSaveSupabase.onclick = () => {
    const url = $('supabase-url') ? $('supabase-url').value.trim() : '';
    const key = $('supabase-key') ? $('supabase-key').value.trim() : '';
    if (window.TurnoCertoAuth) {
      window.TurnoCertoAuth.setConfig(url, key);
      updateCloudStatusBadge();
      alert(url && key ? 'Ligação ao Supabase configurada com sucesso!' : 'Configurações de Supabase limpas (modo offline).');
    }
  };
}

// Modal de Autenticação Supabase
const btnAuth = $('btn-auth');
const authBtnLabel = $('auth-btn-label');
const dialogAuth = $('auth-dialog');
const closeAuth = $('close-auth');
const authTabLogin = $('auth-tab-login');
const authTabSignup = $('auth-tab-signup');
const authForm = $('auth-form');
const btnAuthSubmit = $('btn-auth-submit');
const authError = $('auth-error');
const authSuccess = $('auth-success');
const btnAuthSignout = $('btn-auth-signout');
const btnSyncNow = $('btn-sync-now');
const btnForgotPassword = $('btn-forgot-password');
const btnBackToLogin = $('btn-back-to-login');
const authForgotBox = $('auth-forgot-box');
const authResetBox = $('auth-reset-box');
const forgotForm = $('forgot-form');
const resetPasswordForm = $('reset-password-form');
const forgotError = $('forgot-error');
const forgotSuccess = $('forgot-success');
const resetError = $('reset-error');
const resetSuccess = $('reset-success');
let authMode = 'login'; // 'login', 'signup', 'forgot', 'reset'

function formatAuthErrorMessage(err) {
  if (!err) return 'Ocorreu um erro no pedido.';
  const msg = err.message || String(err);
  if (/invalid login credentials/i.test(msg)) {
    return 'Email ou palavra-passe incorretos. Se ainda não tem conta criada, selecione a aba "Criar Conta".';
  }
  if (/email not confirmed/i.test(msg)) {
    return 'Endereço de email ainda não confirmado. Verifique a caixa de correio para validar a sua conta.';
  }
  if (/user already registered/i.test(msg)) {
    return 'Já existe uma conta associada a este email. Selecione "Iniciar Sessão" ou recupere a palavra-passe.';
  }
  if (/password should be at least/i.test(msg)) {
    return 'A palavra-passe deve conter pelo menos 6 caracteres.';
  }
  if (/unable to validate email/i.test(msg)) {
    return 'Introduza um endereço de email válido.';
  }
  if (/rate limit/i.test(msg)) {
    return 'Demasiadas tentativas consecutivas. Aguarde breves momentos antes de tentar novamente.';
  }
  return msg;
}

function updateAuthUI(user) {
  const loggedOutBox = $('auth-logged-out');
  const loggedInBox = $('auth-logged-in');
  const authUserEmail = $('auth-user-email');

  if (user) {
    if (loggedOutBox) loggedOutBox.hidden = true;
    if (authForgotBox) authForgotBox.hidden = true;
    if (authResetBox) authResetBox.hidden = true;
    if (loggedInBox) loggedInBox.hidden = false;
    const namePart = (user.email || 'Conta').split('@')[0];
    if (authBtnLabel) authBtnLabel.textContent = namePart;
    if (authUserEmail) authUserEmail.textContent = user.email || '';
  } else {
    if (loggedInBox) loggedInBox.hidden = true;
    showAuthView('login');
    if (authBtnLabel) authBtnLabel.textContent = 'Entrar';
  }
}

function showAuthView(view) {
  const loggedOutBox = $('auth-logged-out');
  if (loggedOutBox) loggedOutBox.hidden = (view === 'forgot' || view === 'reset');
  if (authForgotBox) authForgotBox.hidden = (view !== 'forgot');
  if (authResetBox) authResetBox.hidden = (view !== 'reset');

  if (view === 'login') {
    authMode = 'login';
    if (authTabLogin) authTabLogin.classList.add('active');
    if (authTabSignup) authTabSignup.classList.remove('active');
    if (btnAuthSubmit) btnAuthSubmit.textContent = 'Entrar';
  } else if (view === 'signup') {
    authMode = 'signup';
    if (authTabSignup) authTabSignup.classList.add('active');
    if (authTabLogin) authTabLogin.classList.remove('active');
    if (btnAuthSubmit) btnAuthSubmit.textContent = 'Criar Conta';
  }

  if (authError) authError.hidden = true;
  if (authSuccess) authSuccess.hidden = true;
  if (forgotError) forgotError.hidden = true;
  if (forgotSuccess) forgotSuccess.hidden = true;
  if (resetError) resetError.hidden = true;
  if (resetSuccess) resetSuccess.hidden = true;
}

if (btnAuth && dialogAuth) {
  btnAuth.onclick = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const currentLabel = $('auth-btn-label');
    const labelText = currentLabel ? currentLabel.textContent.trim() : '';
    if (!window.TurnoCertoAuth || !window.TurnoCertoAuth.getUser || labelText === 'Entrar' || labelText === 'Conta') {
      showAuthView('login');
    }
    openModal(dialogAuth);
  };
}

if (closeAuth && dialogAuth) {
  closeAuth.onclick = () => closeModal(dialogAuth);
}

if (dialogAuth) {
  dialogAuth.addEventListener('click', e => {
    if (e.target === dialogAuth) closeModal(dialogAuth);
  });
}

if (authTabLogin && authTabSignup) {
  authTabLogin.onclick = () => showAuthView('login');
  authTabSignup.onclick = () => showAuthView('signup');
}

if (btnForgotPassword) {
  btnForgotPassword.onclick = () => showAuthView('forgot');
}

if (btnBackToLogin) {
  btnBackToLogin.onclick = () => showAuthView('login');
}

if (authForm) {
  authForm.onsubmit = async e => {
    e.preventDefault();
    if (authError) authError.hidden = true;
    if (authSuccess) authSuccess.hidden = true;

    if (!window.TurnoCertoAuth || !window.TurnoCertoAuth.isConfigured()) {
      if (authError) {
        authError.textContent = 'O serviço de autenticação não se encontra disponível ou configurado.';
        authError.hidden = false;
      }
      return;
    }

    const emailEl = $('auth-email');
    const passEl = $('auth-password');
    const email = emailEl ? emailEl.value.trim() : '';
    const password = passEl ? passEl.value : '';

    if (!email) {
      if (authError) {
        authError.textContent = 'Por favor introduza o seu endereço de email.';
        authError.hidden = false;
      }
      if (emailEl) emailEl.focus();
      return;
    }

    if (!password) {
      if (authError) {
        authError.textContent = 'Por favor introduza a sua palavra-passe.';
        authError.hidden = false;
      }
      if (passEl) passEl.focus();
      return;
    }

    if (btnAuthSubmit) {
      btnAuthSubmit.disabled = true;
      btnAuthSubmit.textContent = 'A processar…';
    }

    try {
      if (authMode === 'login') {
        const user = await window.TurnoCertoAuth.signIn(email, password);
        updateAuthUI(user);
        // Tentar descarregar dados da nuvem se existirem
        try {
          const cloudData = await window.TurnoCertoAuth.syncDownload();
          if (cloudData) {
            if (cloudData.customCoefficients) {
              saveActiveCoefficients(cloudData.customCoefficients);
            }
            if (Array.isArray(cloudData.roster) && cloudData.roster.length > 0) {
              rosterShifts = cloudData.roster;
              saveRoster();
              updateRosterBadge();
              calculateRoster();
            }
          }
        } catch (_) {}
        if (dialogAuth) closeModal(dialogAuth);
      } else {
        const user = await window.TurnoCertoAuth.signUp(email, password);
        if (authSuccess) {
          authSuccess.textContent = `Registo concluído. Foi expedida uma mensagem de confirmação para ${email} (remetente: flascocelos@gmail.com).`;
          authSuccess.hidden = false;
        }
      }
    } catch (err) {
      if (authError) {
        authError.textContent = formatAuthErrorMessage(err);
        authError.hidden = false;
      }
    } finally {
      if (btnAuthSubmit) {
        btnAuthSubmit.disabled = false;
        btnAuthSubmit.textContent = authMode === 'login' ? 'Entrar' : 'Criar Conta';
      }
    }
  };
}

if (forgotForm) {
  forgotForm.onsubmit = async e => {
    e.preventDefault();
    const email = $('forgot-email').value.trim();
    const btnSubmit = $('btn-forgot-submit');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'A processar…';
    }
    if (forgotError) forgotError.hidden = true;
    if (forgotSuccess) forgotSuccess.hidden = true;

    try {
      if (!window.TurnoCertoAuth || !window.TurnoCertoAuth.isConfigured()) {
        throw new Error('Serviço de autenticação não configurado.');
      }
      await window.TurnoCertoAuth.resetPassword(email);
      if (forgotSuccess) {
        forgotSuccess.textContent = `Instruções de recuperação expedidas para ${email} através de flascocelos@gmail.com. Verifique também a pasta de spam.`;
        forgotSuccess.hidden = false;
      }
    } catch (err) {
      if (forgotError) {
        forgotError.textContent = formatAuthErrorMessage(err);
        forgotError.hidden = false;
      }
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Submeter pedido de recuperação';
      }
    }
  };
}

if (resetPasswordForm) {
  resetPasswordForm.onsubmit = async e => {
    e.preventDefault();
    const newPass = $('reset-new-password').value;
    const confirmPass = $('reset-confirm-password').value;
    const btnSubmit = $('btn-reset-submit');

    if (newPass !== confirmPass) {
      if (resetError) {
        resetError.textContent = 'As palavras-passe não coincidem.';
        resetError.hidden = false;
      }
      return;
    }

    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'A guardar…';
    }
    if (resetError) resetError.hidden = true;
    if (resetSuccess) resetSuccess.hidden = true;

    try {
      if (!window.TurnoCertoAuth || !window.TurnoCertoAuth.isConfigured()) {
        throw new Error('Supabase não configurado.');
      }
      await window.TurnoCertoAuth.updatePassword(newPass);
      if (resetSuccess) {
        resetSuccess.textContent = 'Palavra-passe atualizada com sucesso. Sessão iniciada.';
        resetSuccess.hidden = false;
      }
      setTimeout(async () => {
        const user = await window.TurnoCertoAuth.getUser();
        updateAuthUI(user);
        if (dialogAuth) closeModal(dialogAuth);
      }, 1500);
    } catch (err) {
      if (resetError) {
        resetError.textContent = err.message || 'Erro ao atualizar a palavra-passe.';
        resetError.hidden = false;
      }
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Atualizar palavra-passe';
      }
    }
  };
}

if (btnAuthSignout) {
  btnAuthSignout.onclick = async () => {
    if (window.TurnoCertoAuth) {
      await window.TurnoCertoAuth.signOut();
      updateAuthUI(null);
    }
  };
}

if (btnSyncNow) {
  btnSyncNow.onclick = async () => {
    const syncMsg = $('sync-status-msg');
    if (btnSyncNow) btnSyncNow.textContent = 'A sincronizar…';
    try {
      if (window.TurnoCertoAuth) {
        const ok = await window.TurnoCertoAuth.syncUpload({
          customCoefficients: getActiveCoefficients(),
          roster: rosterShifts
        });
        if (syncMsg) {
          syncMsg.textContent = ok ? 'Escala e parâmetros sincronizados com sucesso.' : 'Nota: Tabela cloud não configurada. Definições salvas localmente.';
          syncMsg.hidden = false;
        }
      }
    } catch (_) {
      if (syncMsg) {
        syncMsg.textContent = 'Erro ao sincronizar com o servidor.';
        syncMsg.hidden = false;
      }
    } finally {
      if (btnSyncNow) btnSyncNow.textContent = 'Sincronizar agora';
    }
  };
}

// Inicializar estado de autenticação Supabase
if (window.TurnoCertoAuth) {
  window.TurnoCertoAuth.getUser().then(async user => {
    updateAuthUI(user);
    if (user) {
      try {
        const cloudData = await window.TurnoCertoAuth.syncDownload();
        if (cloudData) {
          if (cloudData.customCoefficients) saveActiveCoefficients(cloudData.customCoefficients);
          if (Array.isArray(cloudData.roster) && cloudData.roster.length > 0 && rosterShifts.length === 0) {
            rosterShifts = cloudData.roster;
            saveRoster();
            updateRosterBadge();
            calculateRoster();
          }
        }
      } catch (_) {}
    }
  });
  window.TurnoCertoAuth.onAuthStateChange((event, user) => {
    if (event === 'PASSWORD_RECOVERY') {
      showAuthView('reset');
      if (dialogAuth) openModal(dialogAuth);
    } else {
      updateAuthUI(user);
    }
  });

  // Deteção se o utilizador abriu o link de recuperação de password enviado por email
  if (window.location.hash.includes('reset-password') || window.location.hash.includes('type=recovery')) {
    showAuthView('reset');
    if (dialogAuth) openModal(dialogAuth);
  }
}


