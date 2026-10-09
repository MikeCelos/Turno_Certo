const $ = id => document.getElementById(id);
const form = $('shift-form');
const holidays = new Set();
const money = cents => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
const number = value => new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 4 }).format(value);
const duration = minutes => `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
const category = {
  'util-diurno': 'Útil diurno',
  'util-noturno': 'Útil noturno',
  'especial-diurno': 'Especial diurno',
  'especial-noturno': 'Especial noturno',
  'vmer-manha': 'VMER Manhã (08:00–15:00)',
  'vmer-tarde': 'VMER Tarde (15:00–22:00)',
  'vmer-noturno': 'VMER Noturno (22:00–08:00)'
};
const time = value => new Intl.DateTimeFormat('pt-PT', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
const date = value => new Intl.DateTimeFormat('pt-PT', { timeZone: 'Europe/Lisbon', day: '2-digit', month: 'short' }).format(new Date(value));
const month = value => new Intl.DateTimeFormat('pt-PT', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(`${value}-01T12:00Z`));

// Multiplicadores e Coeficientes Padrão SNS
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

// Configurações e Tabela VMER (Emergência Médica)
const VMER_CONFIG_KEY = 'tc_vmer_config';
const DEFAULT_VMER_CONFIG = {
  baseRate: '29,91',
  mode: 'multipliers',
  multipliers: {
    util_08_15: 700,
    util_15_22: 800,
    util_22_08: 1500,
    vesp_feriado_22_08: 1900,
    sab_08_15: 800,
    sab_15_22: 1150,
    sab_22_08: 2000,
    dom_08_15: 1050,
    dom_15_22: 1150,
    dom_22_08: 1600,
    dom_vesp_feriado_22_08: 2000,
  }
};

function getActiveVmerConfig() {
  try {
    const saved = localStorage.getItem(VMER_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return {
          baseRate: parsed.baseRate || DEFAULT_VMER_CONFIG.baseRate,
          mode: parsed.mode || DEFAULT_VMER_CONFIG.mode,
          multipliers: { ...DEFAULT_VMER_CONFIG.multipliers, ...(parsed.multipliers || {}) }
        };
      }
    }
  } catch (_) {}
  return JSON.parse(JSON.stringify(DEFAULT_VMER_CONFIG));
}

function saveActiveVmerConfig(cfg) {
  try {
    localStorage.setItem(VMER_CONFIG_KEY, JSON.stringify(cfg));
  } catch (_) {}
}

// Perfis de Atividade e Modelos de Escala (Presets) Personalizáveis
const PROFILES_STORAGE_KEY = 'tc_user_profiles';
const ACTIVE_PROFILE_KEY = 'tc_active_profile_id';

const DEFAULT_PROFILES = [
  {
    id: 'prof_anestesia',
    name: 'Anestesia',
    workType: 'Anestesiologia',
    calculationMode: 'sns',
    rates: {
      baseRate: '14,52',
      extraRate: '16,33'
    },
    presets: [
      { id: 'p_a1', name: 'Noite 12h (20:00–08:00)', start: '20:00', end: '08:00', nextDay: true, regime: 'extra' },
      { id: 'p_a2', name: 'Dia 12h (08:00–20:00)', start: '08:00', end: '20:00', nextDay: false, regime: 'extra' },
      { id: 'p_a3', name: '24h Misto (12h Normal + 12h Extra)', start: '08:00', end: '08:00', nextDay: true, regime: 'misto', extraStart: '20:00' },
      { id: 'p_a4', name: '24h Trabalho Suplementar', start: '08:00', end: '08:00', nextDay: true, regime: 'extra' }
    ]
  },
  {
    id: 'prof_se',
    name: 'SE · Serviço de Urgência',
    workType: 'Serviço de Urgência',
    calculationMode: 'sns',
    rates: {
      baseRate: '14,52',
      extraRate: '16,33'
    },
    presets: [
      { id: 'p_se1', name: 'Noite 12h (20:00–08:00)', start: '20:00', end: '08:00', nextDay: true, regime: 'extra' },
      { id: 'p_se2', name: 'Dia 12h (08:00–20:00)', start: '08:00', end: '20:00', nextDay: false, regime: 'extra' },
      { id: 'p_se3', name: '24h Misto (12h Normal + 12h Extra)', start: '08:00', end: '08:00', nextDay: true, regime: 'misto', extraStart: '20:00' },
      { id: 'p_se4', name: 'Tarde 8h (14:00–22:00)', start: '14:00', end: '22:00', nextDay: false, regime: 'extra' }
    ]
  },
  {
    id: 'prof_vmer',
    name: 'VMER',
    workType: 'VMER',
    calculationMode: 'vmer',
    rates: {
      baseRate: '29,91',
      extraRate: ''
    },
    presets: [
      { id: 'p_v1', name: 'Manhã 7h (08:00–15:00)', start: '08:00', end: '15:00', nextDay: false, regime: 'vmer' },
      { id: 'p_v2', name: 'Tarde 7h (15:00–22:00)', start: '15:00', end: '22:00', nextDay: false, regime: 'vmer' },
      { id: 'p_v3', name: 'Noite 10h (22:00–08:00)', start: '22:00', end: '08:00', nextDay: true, regime: 'vmer' },
      { id: 'p_v4', name: '24h VMER (08:00–08:00)', start: '08:00', end: '08:00', nextDay: true, regime: 'vmer' }
    ]
  }
];

function getUserProfiles() {
  try {
    const saved = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}

  const profiles = JSON.parse(JSON.stringify(DEFAULT_PROFILES));
  try {
    const hospPresets = localStorage.getItem('tc_presets_hospital');
    if (hospPresets) {
      const parsed = JSON.parse(hospPresets);
      if (Array.isArray(parsed) && parsed.length > 0) profiles[0].presets = parsed;
    }
    const vmerPresets = localStorage.getItem('tc_presets_vmer');
    if (vmerPresets) {
      const parsed = JSON.parse(vmerPresets);
      if (Array.isArray(parsed) && parsed.length > 0) profiles[2].presets = parsed;
    }
    const customPresets = localStorage.getItem('tc_presets_custom');
    if (customPresets) {
      const parsed = JSON.parse(customPresets);
      if (Array.isArray(parsed) && parsed.length > 0) profiles[1].presets = parsed;
    }
  } catch (_) {}
  saveUserProfiles(profiles);
  return profiles;
}

function saveUserProfiles(profiles) {
  try {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  } catch (_) {}
}

function getActiveProfileId() {
  try {
    const saved = localStorage.getItem(ACTIVE_PROFILE_KEY);
    if (saved) return saved;
    const old = localStorage.getItem('tc_active_profile');
    if (old === 'vmer') return 'prof_vmer';
    if (old === 'custom') return 'prof_se';
  } catch (_) {}
  return 'prof_anestesia';
}

function getActiveProfile() {
  const profiles = getUserProfiles();
  const activeId = getActiveProfileId();
  const found = profiles.find(p => p.id === activeId);
  if (found) return found;
  if (profiles.length > 0) return profiles[0];
  return DEFAULT_PROFILES[0];
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
  $('regime-badge').textContent = result.regime === 'extra'
    ? 'Extraordinário'
    : (result.regime === 'misto'
      ? 'Misto'
      : (result.regime === 'vmer' ? 'VMER' : 'Normal'));

  $('total-description').textContent = result.regime === 'extra'
    ? 'O trabalho extra é pago pelo coeficiente completo.'
    : (result.regime === 'misto'
      ? 'Turno misto: período normal (apenas suplementos) e período extraordinário (coeficiente completo).'
      : (result.regime === 'vmer'
        ? 'Turno VMER apurado por blocos horários com tabela de multiplicadores R.'
        : 'Apenas o suplemento. O valor de 1 R já está incluído na base.'));

  $('duration').textContent = duration(result.totalMinutes);

  // Valor-hora base no resumo do cartão:
  if (result.regime === 'misto' && result.segments && result.segments.length > 1) {
    const normalSeg = result.segments.find(s => s.regime === 'normal');
    const extraSeg = result.segments.find(s => s.regime === 'extra');
    if (normalSeg && extraSeg && normalSeg.rateCents !== extraSeg.rateCents) {
      $('base-rate').textContent = `${money(normalSeg.rateCents)} (Base) · ${money(extraSeg.rateCents)} (Extra)`;
    } else {
      $('base-rate').textContent = `${money(result.segments[0].rateCents)}/h`;
    }
  } else if (result.regime === 'vmer') {
    $('base-rate').textContent = `${money(result.segments[0].rateCents)}/h (Base VMER)`;
  } else {
    $('base-rate').textContent = `${money(result.segments[0].rateCents)}/h`;
  }

  $('segment-count').textContent = result.segments.length;
  $('segments').replaceChildren(); $('timeline').replaceChildren();
  for (const s of result.segments) {
    const bar = document.createElement('i'); bar.className = s.category;
    // flex-grow is a numeric DOM style property, never interpolated HTML.
    bar.style.flexGrow = String(s.minutes); bar.title = `${category[s.category] || s.category} · ${duration(s.minutes)}`;
    $('timeline').append(bar);
    const row = document.createElement('tr');
    const startDateStr = date(s.start);
    const endDateStr = date(new Date(new Date(s.end).getTime() - 1000));
    const dateLabel = startDateStr === endDateStr ? startDateStr : `${startDateStr} – ${endDateStr}`;

    const categoryLabel = category[s.category] || s.category;
    const regimeDetail = result.regime === 'misto'
      ? (s.regime === 'normal' ? 'Normal' : 'Extra')
      : (result.regime === 'vmer' ? 'VMER' : '');
    const secondLine = [dateLabel, categoryLabel, regimeDetail].filter(Boolean).join(' · ');
    const thirdLine = s.firstExtra
      ? 'Primeira hora extra'
      : (s.regime === 'normal' && s.payableCoefficient === 0
        ? 'Incluído na remuneração base'
        : (result.regime === 'vmer' ? `Multiplicador: ${number(s.payableCoefficient / 100)} R` : ''));

    const calculationText = result.regime === 'vmer'
      ? `${number(s.payableCoefficient / 100)} R × ${money(s.rateCents)}`
      : `${number(s.minutes / 60)} h × ${number(s.payableCoefficient / 100)} × ${money(s.rateCents)}`;

    const coeffSubtext = result.regime === 'vmer'
      ? `${duration(s.minutes)} cumpridos`
      : `Coeficiente total: ${number(s.coefficient / 100)} R`;

    const values = [
      [`${time(s.start)} – ${time(s.end)}`, secondLine, thirdLine],
      [duration(s.minutes)],
      [calculationText, coeffSubtext],
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
    const activeProfile = getActiveProfile();
    const input = Object.fromEntries(new FormData(form));
    input.holidays = [...holidays];
    input.customCoefficients = getActiveCoefficients();
    input.profileType = activeProfile.calculationMode || activeProfile.id;

    if (activeProfile.calculationMode === 'vmer') {
      input.vmerConfig = getActiveVmerConfig();
      input.regime = 'vmer';
    } else if (input.regime === 'misto') {
      // No turno misto, mapeamento rigoroso sem inversão:
      input.normalRate = $('rate').value.trim();
      input.extraRate = $('extraRate') ? $('extraRate').value.trim() : '';
    }

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
  const regimeVal = form.elements['regime'] ? form.elements['regime'].value : 'extra';
  const isMixed = regimeVal === 'misto';
  const mixedBox = $('mixed-config');
  const rateLabel = $('rate-label');
  const rateDesc = $('rate-desc');
  const extraRateLabel = $('extraRateLabel');
  const activeProfile = getActiveProfile();

  if (mixedBox) {
    mixedBox.hidden = !isMixed;
    if (isMixed && !$('extraStart').value) {
      const anchor = getAnchorDate();
      $('extraStart').value = `${anchor}T20:00`;
    }
  }

  if (rateLabel && rateDesc) {
    if (activeProfile.calculationMode === 'vmer') {
      rateLabel.textContent = 'Hora Base VMER (R)';
      rateDesc.textContent = 'Hora base contratual VMER (referência para os multiplicadores da tabela).';
    } else if (activeProfile.calculationMode === 'linear') {
      rateLabel.textContent = 'Valor-hora Contratado (€/h)';
      rateDesc.textContent = 'Remuneração horária fixa para apuramento direto do turno.';
    } else if (isMixed) {
      rateLabel.textContent = 'Valor-hora normal / base contratual (R)';
      rateDesc.textContent = 'Vencimento base do médico (utilizado para apuramento do período normal).';
      if (extraRateLabel) extraRateLabel.textContent = 'Valor-hora extraordinário (período suplementar)';
    } else if (regimeVal === 'normal') {
      rateLabel.textContent = 'Valor-hora base contratual (R)';
      rateDesc.textContent = 'Vencimento base/hora do médico para cálculo dos suplementos.';
    } else {
      rateLabel.textContent = 'Valor-hora extraordinário (R)';
      rateDesc.textContent = 'Remuneração horária aplicável ao trabalho suplementar.';
    }
  }
}

// Atalhos rápidos de turnos (Presets Dinâmicos)
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

function renderPresets() {
  const container = $('preset-buttons');
  if (!container) return;
  const profile = getActiveProfile();
  const presets = (profile && profile.presets) || [];
  container.replaceChildren();

  presets.forEach((p, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'preset-pill-wrap';

    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'preset-pill';
    pill.textContent = p.name;
    pill.onclick = () => applyPreset(p);

    wrap.appendChild(pill);

    // Botão discreto para apagar se houver mais do que 1
    if (presets.length > 1) {
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'preset-pill-del';
      delBtn.setAttribute('aria-label', `Eliminar modelo ${p.name}`);
      delBtn.title = 'Eliminar modelo habitual';
      delBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        deletePreset(idx);
      };
      wrap.appendChild(delBtn);
    }

    container.appendChild(wrap);
  });
let syncTimeout = null;
function triggerCloudSync() {
  if (!window.TurnoCertoAuth || !window.TurnoCertoAuth.isConfigured()) return;
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    try {
      await window.TurnoCertoAuth.syncUpload({
        customCoefficients: getActiveCoefficients(),
        roster: typeof rosterShifts !== 'undefined' ? rosterShifts : [],
        profiles: getUserProfiles(),
        activeProfileId: getActiveProfileId()
      });
    } catch (_) {}
  }, 1000);
}

function deletePreset(index) {
  const profiles = getUserProfiles();
  const activeId = getActiveProfileId();
  const profile = profiles.find(p => p.id === activeId);
  if (profile && Array.isArray(profile.presets)) {
    profile.presets = profile.presets.filter((_, i) => i !== index);
    saveUserProfiles(profiles);
    renderPresets();
    triggerCloudSync();
  }
}

function applyPreset(p) {
  const anchor = getAnchorDate();
  const next = getNextDate(anchor);

  $('start').value = `${anchor}T${p.start}`;
  $('end').value = p.nextDay ? `${next}T${p.end}` : `${anchor}T${p.end}`;

  const active = getActiveProfile();
  const isProfileVmer = active.calculationMode === 'vmer';

  if (p.regime) {
    const isVmer = p.regime === 'vmer' || isProfileVmer;
    const radio = form.querySelector(`input[name="regime"][value="${isVmer ? 'extra' : p.regime}"]`);
    if (radio) radio.checked = true;
    if (p.regime === 'misto' && p.extraStart) {
      $('extraStart').value = `${anchor}T${p.extraStart}`;
    }
  }

  if (p.rate) {
    $('rate').value = p.rate;
  } else if (active.rates && active.rates.baseRate) {
    $('rate').value = active.rates.baseRate;
  }

  if (p.regime === 'misto' && active.rates && active.rates.extraRate && $('extraRate')) {
    $('extraRate').value = active.rates.extraRate;
  }

  updateMixedVisibility();
  dirty();
  calculate();
}

function renderProfileChips() {
  const container = $('profile-chips-container');
  if (!container) return;
  const profiles = getUserProfiles();
  const activeId = getActiveProfileId();
  container.replaceChildren();

  profiles.forEach(p => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `profile-chip ${p.id === activeId ? 'active' : ''}`;
    btn.setAttribute('data-profile', p.id);
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', p.id === activeId ? 'true' : 'false');
    btn.textContent = p.name;
    btn.onclick = () => setActiveProfile(p.id);
    container.appendChild(btn);
  });
}

function setActiveProfile(profileId) {
  try { localStorage.setItem(ACTIVE_PROFILE_KEY, profileId); } catch (_) {}
  const profile = getActiveProfile();

  const headingEyebrow = $('heading-eyebrow');
  const headingTitle = $('heading-title');
  const headingDesc = $('heading-desc');
  const workType = $('workType');
  const rateInput = $('rate');
  const extraRateInput = $('extraRate');

  if (profile.calculationMode === 'vmer') {
    if (headingEyebrow) headingEyebrow.textContent = 'EMERGÊNCIA MÉDICA PRÉ-HOSPITALAR · VMER';
    if (headingTitle) headingTitle.textContent = `${profile.name} · Apuramento de Turnos`;
    if (headingDesc) headingDesc.textContent = 'Cálculo por blocos horários (08-15, 15-22, 22-08) com tabela de multiplicadores R.';
    const vmerCfg = getActiveVmerConfig();
    if (rateInput) rateInput.value = (profile.rates && profile.rates.baseRate) || vmerCfg.baseRate || '29,91';
    if (workType) workType.value = profile.workType || 'VMER';
  } else if (profile.calculationMode === 'linear') {
    if (headingEyebrow) headingEyebrow.textContent = 'REGIME LINEAR · HORAS × VALOR-HORA';
    if (headingTitle) headingTitle.textContent = `${profile.name} · Apuramento Direto`;
    if (headingDesc) headingDesc.textContent = 'Multiplicação direta de horas realizadas pela remuneração horária contratada.';
    if (workType) workType.value = profile.workType || profile.name;
    if (rateInput && profile.rates && profile.rates.baseRate) rateInput.value = profile.rates.baseRate;
  } else {
    if (headingEyebrow) headingEyebrow.textContent = 'ENQUADRAMENTO LEGAL E ACTS · CARREIRA MÉDICA';
    if (headingTitle) headingTitle.textContent = `${profile.name} · Cálculo de Suplementos`;
    if (headingDesc) headingDesc.textContent = 'Apuramento discriminado de suplementos horários, períodos noturnos e regimes de trabalho.';
    if (workType) workType.value = profile.workType || profile.name;
    if (rateInput && profile.rates && profile.rates.baseRate) rateInput.value = profile.rates.baseRate;
    if (extraRateInput && profile.rates && profile.rates.extraRate) extraRateInput.value = profile.rates.extraRate;
  }

  renderProfileChips();
  updateMixedVisibility();
  renderPresets();
  dirty();
  calculate();
}

function setProfile(profileId) {
  setActiveProfile(profileId);
}

// Modal de Gestão e Criação de Perfis
const btnAddProfile = $('btn-add-profile');
const btnEditProfile = $('btn-edit-profile');
const profileDialog = $('profile-dialog');
const closeProfileDialog = $('close-profile-dialog');
const profileForm = $('profile-form');
const btnDeleteProfile = $('btn-delete-profile');
const profileCalcModeSelect = $('profile-calc-mode');
const profileExtraRateBox = $('profile-extra-rate-box');

if (profileCalcModeSelect && profileExtraRateBox) {
  profileCalcModeSelect.addEventListener('change', () => {
    const mode = profileCalcModeSelect.value;
    profileExtraRateBox.hidden = mode === 'vmer' || mode === 'linear';
    const baseLabel = $('profile-base-rate-label');
    if (baseLabel) {
      baseLabel.textContent = mode === 'vmer' ? 'Hora Base VMER (€/h)' : 'Valor-hora Base / Contratual';
    }
  });
}

if (btnAddProfile && profileDialog) {
  btnAddProfile.onclick = () => {
    if (profileForm) profileForm.reset();
    $('profile-edit-id').value = '';
    $('profile-dialog-title').textContent = 'Novo Perfil de Trabalho';
    if (btnDeleteProfile) btnDeleteProfile.hidden = true;
    if (profileExtraRateBox) profileExtraRateBox.hidden = false;
    openModal(profileDialog);
  };
}

if (btnEditProfile && profileDialog) {
  btnEditProfile.onclick = () => {
    const profile = getActiveProfile();
    $('profile-edit-id').value = profile.id;
    $('profile-dialog-title').textContent = `Editar Perfil: ${profile.name}`;
    $('profile-name-input').value = profile.name;
    $('profile-calc-mode').value = profile.calculationMode || 'sns';
    $('profile-base-rate-input').value = (profile.rates && profile.rates.baseRate) || $('rate').value || '14,52';
    $('profile-extra-rate-input').value = (profile.rates && profile.rates.extraRate) || ($('extraRate') ? $('extraRate').value : '') || '16,33';
    $('profile-work-type-input').value = profile.workType || $('workType').value || '';
    
    const isSns = (profile.calculationMode || 'sns') === 'sns';
    if (profileExtraRateBox) profileExtraRateBox.hidden = !isSns;

    const profiles = getUserProfiles();
    if (btnDeleteProfile) {
      btnDeleteProfile.hidden = profiles.length <= 1;
    }
    openModal(profileDialog);
  };
}

if (closeProfileDialog && profileDialog) {
  closeProfileDialog.onclick = () => closeModal(profileDialog);
}
if (profileDialog) {
  profileDialog.addEventListener('click', e => {
    if (e.target === profileDialog) closeModal(profileDialog);
  });
}

if (profileForm) {
  profileForm.onsubmit = e => {
    e.preventDefault();
    const editId = $('profile-edit-id').value;
    const profiles = getUserProfiles();
    const name = $('profile-name-input').value.trim();
    const calcMode = $('profile-calc-mode').value;
    const baseRate = $('profile-base-rate-input').value.trim();
    const extraRate = $('profile-extra-rate-input') ? $('profile-extra-rate-input').value.trim() : '';
    const workType = $('profile-work-type-input').value.trim() || name;

    if (editId) {
      const p = profiles.find(item => item.id === editId);
      if (p) {
        p.name = name;
        p.calculationMode = calcMode;
        p.rates = { baseRate, extraRate };
        p.workType = workType;
      }
      saveUserProfiles(profiles);
      closeModal(profileDialog);
      setActiveProfile(editId);
    } else {
      const newId = 'prof_' + Date.now();
      let defaultPresets = [];
      if (calcMode === 'vmer') {
        defaultPresets = [
          { id: 'p_' + Date.now() + '_1', name: 'Manhã 7h (08:00–15:00)', start: '08:00', end: '15:00', nextDay: false, regime: 'vmer' },
          { id: 'p_' + Date.now() + '_2', name: 'Tarde 7h (15:00–22:00)', start: '15:00', end: '22:00', nextDay: false, regime: 'vmer' },
          { id: 'p_' + Date.now() + '_3', name: 'Noite 10h (22:00–08:00)', start: '22:00', end: '08:00', nextDay: true, regime: 'vmer' },
          { id: 'p_' + Date.now() + '_4', name: '24h VMER (08:00–08:00)', start: '08:00', end: '08:00', nextDay: true, regime: 'vmer' }
        ];
      } else {
        defaultPresets = [
          { id: 'p_' + Date.now() + '_1', name: 'Noite 12h (20:00–08:00)', start: '20:00', end: '08:00', nextDay: true, regime: 'extra' },
          { id: 'p_' + Date.now() + '_2', name: 'Dia 12h (08:00–20:00)', start: '08:00', end: '20:00', nextDay: false, regime: 'extra' },
          { id: 'p_' + Date.now() + '_3', name: '24h Misto (12h Normal + 12h Extra)', start: '08:00', end: '08:00', nextDay: true, regime: 'misto', extraStart: '20:00' }
        ];
      }

      const newProfile = {
        id: newId,
        name,
        workType,
        calculationMode: calcMode,
        rates: { baseRate, extraRate },
        presets: defaultPresets
      };
      profiles.push(newProfile);
      saveUserProfiles(profiles);
      closeModal(profileDialog);
      setActiveProfile(newId);
    }
    triggerCloudSync();
  };
}

if (btnDeleteProfile) {
  btnDeleteProfile.onclick = () => {
    const editId = $('profile-edit-id').value;
    if (!editId) return;
    let profiles = getUserProfiles();
    if (profiles.length <= 1) {
      alert('Não é possível eliminar o único perfil existente.');
      return;
    }
    const profileToDelete = profiles.find(p => p.id === editId);
    if (confirm(`Tem a certeza de que pretende eliminar o perfil "${profileToDelete ? profileToDelete.name : ''}"?`)) {
      profiles = profiles.filter(p => p.id !== editId);
      saveUserProfiles(profiles);
      closeModal(profileDialog);
      setActiveProfile(profiles[0].id);
      triggerCloudSync();
    }
  };
}

// Modal de Adicionar Modelo de Escala
const btnAddPreset = $('btn-add-preset');
const presetDialog = $('preset-dialog');
const closePresetDialog = $('close-preset-dialog');
const presetForm = $('preset-form');
const presetRegimeSelect = $('preset-regime-select');
const presetExtraStartBox = $('preset-extra-start-box');

if (btnAddPreset && presetDialog) {
  btnAddPreset.onclick = () => {
    if (presetForm) presetForm.reset();
    if (presetExtraStartBox) presetExtraStartBox.hidden = true;
    openModal(presetDialog);
  };
}

if (closePresetDialog && presetDialog) {
  closePresetDialog.onclick = () => closeModal(presetDialog);
}

if (presetDialog) {
  presetDialog.addEventListener('click', e => {
    if (e.target === presetDialog) closeModal(presetDialog);
  });
}

if (presetRegimeSelect && presetExtraStartBox) {
  presetRegimeSelect.onchange = () => {
    presetExtraStartBox.hidden = presetRegimeSelect.value !== 'misto';
  };
}

if (presetForm) {
  presetForm.onsubmit = e => {
    e.preventDefault();
    const profiles = getUserProfiles();
    const activeId = getActiveProfileId();
    const profile = profiles.find(p => p.id === activeId);
    if (!profile) return;
    if (!Array.isArray(profile.presets)) profile.presets = [];

    const newPreset = {
      id: 'p_' + Date.now(),
      name: $('preset-name').value.trim(),
      start: $('preset-start-time').value,
      end: $('preset-end-time').value,
      nextDay: $('preset-next-day').checked,
      regime: $('preset-regime-select').value,
      extraStart: $('preset-regime-select').value === 'misto' ? $('preset-extra-start-time').value : null,
      rate: $('preset-rate-input') && $('preset-rate-input').value.trim() ? $('preset-rate-input').value.trim() : null
    };
    profile.presets.push(newPreset);
    saveUserProfiles(profiles);
    renderPresets();
    closeModal(presetDialog);
    triggerCloudSync();
  };
}

renderProfileChips();
setActiveProfile(getActiveProfileId());

$('rate').addEventListener('input', () => {
  const val = $('rate').value.trim();
  try {
    localStorage.setItem(RATE_KEY, val);
    const profiles = getUserProfiles();
    const active = profiles.find(p => p.id === getActiveProfileId());
    if (active) {
      if (!active.rates) active.rates = {};
      active.rates.baseRate = val;
      saveUserProfiles(profiles);
      triggerCloudSync();
    }
  } catch (_) {}
});
if ($('extraRate')) {
  $('extraRate').addEventListener('input', () => {
    dirty();
    const val = $('extraRate').value.trim();
    try {
      const profiles = getUserProfiles();
      const active = profiles.find(p => p.id === getActiveProfileId());
      if (active) {
        if (!active.rates) active.rates = {};
        active.rates.extraRate = val;
        saveUserProfiles(profiles);
        triggerCloudSync();
      }
    } catch (_) {}
  });
}
$('workType').addEventListener('input', () => {
  const val = $('workType').value.trim();
  try {
    localStorage.setItem(WORK_TYPE_KEY, val);
    const profiles = getUserProfiles();
    const active = profiles.find(p => p.id === getActiveProfileId());
    if (active) {
      active.workType = val;
      saveUserProfiles(profiles);
      triggerCloudSync();
    }
  } catch (_) {}
});
form.querySelectorAll('input[name="regime"]').forEach(radio => {
  radio.addEventListener('change', () => {
    updateMixedVisibility();
    try { localStorage.setItem(REGIME_KEY, radio.value); } catch (_) {}
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
  triggerCloudSync();
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
        profileType: s.profileType || (s.regime === 'vmer' ? 'vmer' : 'hospital'),
        start: s.start,
        end: s.end,
        rate: s.rate,
        extraRate: s.extraRate || null,
        extraStart: s.extraStart || null,
        normalRate: s.normalRate || null,
        startOccurrence: s.startOccurrence || null,
        endOccurrence: s.endOccurrence || null
      })),
      holidays: [...holidays],
      customCoefficients: getActiveCoefficients(),
      vmerConfig: getActiveVmerConfig()
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
      delBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
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
    const active = getActiveProfile();
    const isVmer = active.calculationMode === 'vmer';
    const isMixed = !isVmer && form.elements['regime'] && form.elements['regime'].value === 'misto';
    const shiftItem = {
      id: 's_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      workType: $('workType').value.trim() || active.workType || (isVmer ? 'VMER' : 'Serviço Clínico'),
      regime: isVmer ? 'vmer' : form.elements['regime'].value,
      profileType: active.calculationMode || active.id,
      start: $('start').value,
      end: $('end').value,
      rate: $('rate').value,
      extraRate: (isMixed && $('extraRate') && $('extraRate').value) ? $('extraRate').value : null,
      extraStart: (isMixed && $('extraStart').value) ? $('extraStart').value : null,
      normalRate: isMixed ? $('rate').value : null,
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

    // VMER Config
    const vmerCfg = getActiveVmerConfig();
    if ($('vmer-config-base-rate')) $('vmer-config-base-rate').value = vmerCfg.baseRate || '29,91';
    if ($('vmer-config-mode')) {
      $('vmer-config-mode').value = vmerCfg.mode || 'multipliers';
      if ($('vmer-table-box')) {
        $('vmer-table-box').hidden = vmerCfg.mode === 'hourly';
      }
    }
    const mult = vmerCfg.multipliers || {};
    const setMult = (id, val) => {
      const el = $(id);
      if (el && typeof val === 'number') el.value = (val / 100).toFixed(1);
    };
    setMult('vmer-m-util-08-15', mult.util_08_15);
    setMult('vmer-m-util-15-22', mult.util_15_22);
    setMult('vmer-m-util-22-08', mult.util_22_08);
    setMult('vmer-m-vesp-22-08', mult.vesp_feriado_22_08);
    setMult('vmer-m-sab-08-15', mult.sab_08_15);
    setMult('vmer-m-sab-15-22', mult.sab_15_22);
    setMult('vmer-m-sab-22-08', mult.sab_22_08);
    setMult('vmer-m-dom-08-15', mult.dom_08_15);
    setMult('vmer-m-dom-15-22', mult.dom_15_22);
    setMult('vmer-m-dom-22-08', mult.dom_22_08);
    setMult('vmer-m-dom-vesp-22-08', mult.dom_vesp_feriado_22_08);

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
  const vmerStatusMsg = $('vmer-settings-status');
  if (vmerStatusMsg) vmerStatusMsg.hidden = true;
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

function readVmerSettingsModal() {
  const getMult = (id, fallback) => {
    const el = $(id);
    if (!el || !el.value) return fallback;
    const num = parseFloat(el.value.replace(',', '.'));
    return isNaN(num) || num < 0 ? fallback : Math.round(num * 100);
  };
  return {
    baseRate: $('vmer-config-base-rate') ? $('vmer-config-base-rate').value.trim() : '29,91',
    mode: $('vmer-config-mode') ? $('vmer-config-mode').value : 'multipliers',
    multipliers: {
      util_08_15: getMult('vmer-m-util-08-15', 700),
      util_15_22: getMult('vmer-m-util-15-22', 800),
      util_22_08: getMult('vmer-m-util-22-08', 1500),
      vesp_feriado_22_08: getMult('vmer-m-vesp-22-08', 1900),
      sab_08_15: getMult('vmer-m-sab-08-15', 800),
      sab_15_22: getMult('vmer-m-sab-15-22', 1150),
      sab_22_08: getMult('vmer-m-sab-22-08', 2000),
      dom_08_15: getMult('vmer-m-dom-08-15', 1050),
      dom_15_22: getMult('vmer-m-dom-15-22', 1150),
      dom_22_08: getMult('vmer-m-dom-22-08', 1600),
      dom_vesp_feriado_22_08: getMult('vmer-m-dom-vesp-22-08', 2000),
    }
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
const btnResetVmer = $('btn-reset-vmer-table');
const btnSaveVmer = $('btn-save-vmer-settings');
const vmerModeSelect = $('vmer-config-mode');
const btnSaveSupabase = $('btn-save-supabase-config');

if (vmerModeSelect) {
  vmerModeSelect.addEventListener('change', () => {
    if ($('vmer-table-box')) {
      $('vmer-table-box').hidden = vmerModeSelect.value === 'hourly';
    }
  });
}

if (btnResetVmer) {
  btnResetVmer.onclick = () => {
    saveActiveVmerConfig(DEFAULT_VMER_CONFIG);
    populateSettingsModal();
    const statusMsg = $('vmer-settings-status');
    if (statusMsg) {
      statusMsg.textContent = 'Valores e multiplicadores VMER repostos para a tabela padrão.';
      statusMsg.hidden = false;
    }
    if (getActiveProfile() === 'vmer') {
      if ($('rate')) $('rate').value = DEFAULT_VMER_CONFIG.baseRate;
      if ($('results') && !$('results').hidden) calculate();
      if (rosterShifts.length > 0) calculateRoster();
    }
  };
}

if (btnSaveVmer) {
  btnSaveVmer.onclick = () => {
    const updated = readVmerSettingsModal();
    saveActiveVmerConfig(updated);
    const statusMsg = $('vmer-settings-status');
    if (statusMsg) {
      statusMsg.textContent = 'Configurações de remuneração VMER guardadas com sucesso.';
      statusMsg.hidden = false;
    }
    if (getActiveProfile() === 'vmer') {
      if (updated.baseRate && $('rate')) $('rate').value = updated.baseRate;
      if ($('results') && !$('results').hidden) calculate();
      if (rosterShifts.length > 0) calculateRoster();
    }
  };
}

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
            if (cloudData.profiles && Array.isArray(cloudData.profiles) && cloudData.profiles.length > 0) {
              saveUserProfiles(cloudData.profiles);
              if (cloudData.activeProfileId) {
                try { localStorage.setItem(ACTIVE_PROFILE_KEY, cloudData.activeProfileId); } catch (_) {}
              }
              renderProfileChips();
              setActiveProfile(getActiveProfileId());
            }
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
          roster: rosterShifts,
          profiles: getUserProfiles(),
          activeProfileId: getActiveProfileId()
        });
        if (syncMsg) {
          syncMsg.textContent = ok ? 'Escala, perfis e parâmetros sincronizados com sucesso.' : 'Nota: Tabela cloud não configurada. Definições salvas localmente.';
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
          if (cloudData.profiles && Array.isArray(cloudData.profiles) && cloudData.profiles.length > 0) {
            saveUserProfiles(cloudData.profiles);
            if (cloudData.activeProfileId) {
              try { localStorage.setItem(ACTIVE_PROFILE_KEY, cloudData.activeProfileId); } catch (_) {}
            }
            renderProfileChips();
            setActiveProfile(getActiveProfileId());
          }
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


