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
  $('regime-badge').textContent = result.regime === 'extra' ? 'Extraordinário' : 'Normal';
  $('total-description').textContent = result.regime === 'extra' ? 'O trabalho extra é pago pelo coeficiente completo.' : 'Apenas o suplemento. O valor de 1 R já está incluído na base.';
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
    const values = [
      [`${time(s.start)} – ${time(s.end)}`, `${date(s.start)} · ${category[s.category]}`, s.firstExtra ? 'Primeira hora extra' : ''],
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
form.onsubmit = event => { event.preventDefault(); calculate(); };
$('example').onclick = () => {
  form.reset(); holidays.clear(); drawHolidays(); $('holiday-error').textContent = ''; revision++; calculate(true);
};
calculate(true);

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

