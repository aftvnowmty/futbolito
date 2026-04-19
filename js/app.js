const STORAGE_KEY = 'futbol-tablero-clipboard-v2';

const pieceAssets = {
  A: 'assets/salt.png',
  B: 'assets/lemon.png',
};

const formations = {
  '4-3-3': {
    defenders: [18, 39, 61, 82],
    mids: [26, 50, 74],
    attacks: [20, 50, 80],
  },
  '4-4-2': {
    defenders: [18, 39, 61, 82],
    mids: [18, 39, 61, 82],
    attacks: [38, 62],
  },
  '4-2-3-1': {
    defenders: [18, 39, 61, 82],
    mids: [39, 61],
    attacks: [22, 50, 78],
    striker: [50],
  },
  '3-5-2': {
    defenders: [25, 50, 75],
    mids: [15, 33, 50, 67, 85],
    attacks: [38, 62],
  },
  '3-4-3': {
    defenders: [25, 50, 75],
    mids: [18, 39, 61, 82],
    attacks: [20, 50, 80],
  },
  '5-3-2': {
    defenders: [12, 29, 50, 71, 88],
    mids: [26, 50, 74],
    attacks: [38, 62],
  },
  '5-4-1': {
    defenders: [12, 29, 50, 71, 88],
    mids: [18, 39, 61, 82],
    attacks: [50],
  },
  '4-1-4-1': {
    defenders: [18, 39, 61, 82],
    mids: [50],
    attacks: [18, 39, 61, 82],
    striker: [50],
  },
  '3-3-3-1': {
    defenders: [25, 50, 75],
    mids: [22, 50, 78],
    attacks: [22, 50, 78],
    striker: [50],
  },
};

const formationCatalog = Object.keys(formations);

const backgroundCatalog = [
  { id: 'wood', name: 'Mesa de madera' },
  { id: 'coke', name: 'Mesa de cocacola' },
  { id: 'beer', name: 'Mesa de carta' },
];

const pitch = document.getElementById('pitch');
const configBtn = document.getElementById('configBtn');
const configMenu = document.getElementById('configMenu');
const formationA = document.getElementById('formationA');
const formationB = document.getElementById('formationB');
const visibilityMode = document.getElementById('visibilityMode');
const backgroundBtn = document.getElementById('backgroundBtn');
const backgroundLabel = document.getElementById('backgroundLabel');
const flipBtn = document.getElementById('flipBtn');
const resetBtn = document.getElementById('resetBtn');

let overlay = null;
let activeDrag = null;
let rafId = 0;

let state = loadState();

init();

function init() {
  createOverlay();
  hydrateFormationOptions();
  syncControls();
  applyBackground(state.background);
  renderBoard();
  attachEvents();
}

function createOverlay() {
  overlay = document.createElement('div');
  overlay.className = 'overlay';
  document.body.appendChild(overlay);

  overlay.addEventListener('click', closeConfigMenu);
}

function hydrateFormationOptions() {
  formationA.innerHTML = '';
  formationB.innerHTML = '';

  formationCatalog.forEach((formation) => {
    formationA.append(new Option(formation, formation));
    formationB.append(new Option(formation, formation));
  });
}

function cloneDefaults() {
  return {
    background: 'wood',
    formationA: '4-2-3-1',
    formationB: '4-2-3-1',
    visibilityMode: 'both',
    players: buildPlayers('4-2-3-1', '4-2-3-1'),
  };
}

function buildPlayers(teamAFormation, teamBFormation) {
  const teamA = formationToPlayers('A', teamAFormation, false);
  const teamB = formationToPlayers('B', teamBFormation, true);
  return [...teamA, ...teamB];
}

function formationToPlayers(team, key, invert) {
  const shape = formations[key];
  const rows = [];

  if (shape.defenders) rows.push({ y: 75, xs: shape.defenders });
  if (shape.mids) rows.push({ y: 60, xs: shape.mids });
  if (shape.attacks) rows.push({ y: shape.striker ? 45 : 37, xs: shape.attacks });
  if (shape.striker) rows.push({ y: 29, xs: shape.striker });

  const players = [
    {
      id: `${team}1`,
      team,
      number: 1,
      x: 50,
      y: invert ? 10 : 90,
    },
  ];

  let number = 2;

  rows.forEach((row) => {
    row.xs.forEach((x) => {
      players.push({
        id: `${team}${number}`,
        team,
        number,
        x,
        y: invert ? 100 - row.y : row.y,
      });
      number += 1;
    });
  });

  return players;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaults();

    const parsed = JSON.parse(raw);

    if (!parsed.players || !Array.isArray(parsed.players)) {
      return cloneDefaults();
    }

    return {
      background: parsed.background || 'wood',
      formationA: parsed.formationA || '4-2-3-1',
      formationB: parsed.formationB || '4-2-3-1',
      visibilityMode: parsed.visibilityMode || 'both',
      players: parsed.players.map((player) => ({ ...player })),
    };
  } catch (error) {
    console.error('Error cargando estado:', error);
    return cloneDefaults();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function syncControls() {
  formationA.value = state.formationA;
  formationB.value = state.formationB;

  if (visibilityMode) {
    visibilityMode.value = state.visibilityMode;
  }

  const bg = backgroundCatalog.find((item) => item.id === state.background) || backgroundCatalog[0];
  backgroundLabel.textContent = bg.name;
}

function renderBoard() {
  pitch.querySelectorAll('.player').forEach((node) => node.remove());

  state.players
    .filter((player) => {
      if (state.visibilityMode === 'salt') return player.team === 'A';
      if (state.visibilityMode === 'lemon') return player.team === 'B';
      return true;
    })
    .forEach((player) => {
      const piece = document.createElement('button');
      piece.type = 'button';
      piece.className = `player ${player.team === 'A' ? 'salt' : 'lemon'}`;
      piece.dataset.id = player.id;
      piece.dataset.team = player.team;
      piece.setAttribute('aria-label', `Jugador ${player.number}`);

      const img = document.createElement('img');
      img.src = pieceAssets[player.team];
      img.alt = player.team === 'A' ? 'Salero' : 'Limón';
      img.draggable = false;

      const badge = document.createElement('span');
      badge.className = 'number';
      badge.textContent = player.number;

      piece.append(img, badge);
      setPosition(piece, player.x, player.y);
      pitch.appendChild(piece);
    });
}

function setPosition(element, x, y) {
  element.style.left = `${x}%`;
  element.style.top = `${y}%`;
}

function attachEvents() {
  pitch.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove, { passive: false });
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  configBtn.addEventListener('click', toggleConfigMenu);

  formationA.addEventListener('change', () => {
    state.formationA = formationA.value;
    applyFormation('A', state.formationA, false);
    closeConfigMenu();
  });

  formationB.addEventListener('change', () => {
    state.formationB = formationB.value;
    applyFormation('B', state.formationB, true);
    closeConfigMenu();
  });

  if (visibilityMode) {
    visibilityMode.addEventListener('change', () => {
      state.visibilityMode = visibilityMode.value;
      renderBoard();
      saveState();
      closeConfigMenu();
    });
  }

  backgroundBtn.addEventListener('click', () => {
    const currentIndex = backgroundCatalog.findIndex((item) => item.id === state.background);
    const next = backgroundCatalog[(currentIndex + 1) % backgroundCatalog.length];

    state.background = next.id;
    applyBackground(next.id);
    syncControls();
    saveState();
    closeConfigMenu();
  });

  flipBtn.addEventListener('click', () => {
    state.players = state.players.map((player) => ({
      ...player,
      y: 100 - player.y,
    }));

    renderBoard();
    saveState();
    closeConfigMenu();
  });

  resetBtn.addEventListener('click', () => {
    state.players = buildPlayers(state.formationA, state.formationB);
    renderBoard();
    saveState();
    closeConfigMenu();
  });

  document.addEventListener('click', onDocumentClick);
}

function toggleConfigMenu(event) {
  event.stopPropagation();

  if (configMenu.hasAttribute('hidden')) {
    configMenu.removeAttribute('hidden');
    overlay.classList.add('active');
    configBtn.setAttribute('aria-expanded', 'true');
  } else {
    closeConfigMenu();
  }
}

function closeConfigMenu() {
  configMenu.setAttribute('hidden', '');
  overlay.classList.remove('active');
  configBtn.setAttribute('aria-expanded', 'false');
}

function onDocumentClick(event) {
  const clickedInsideMenu = configMenu.contains(event.target);
  const clickedButton = configBtn.contains(event.target);

  if (!configMenu.hasAttribute('hidden') && !clickedInsideMenu && !clickedButton) {
    closeConfigMenu();
  }
}

function applyFormation(team, formationKey, invert) {
  const fresh = formationToPlayers(team, formationKey, invert);

  state.players = state.players.map((player) => {
    if (player.team !== team) return player;
    const replacement = fresh.find((item) => item.id === player.id);
    return replacement ? replacement : player;
  });

  renderBoard();
  saveState();
}

function onPointerDown(event) {
  const target = event.target.closest('.player');
  if (!target) return;

  event.preventDefault();

  activeDrag = {
    element: target,
    id: target.dataset.id,
    rect: pitch.getBoundingClientRect(),
    pointerId: event.pointerId,
  };

  target.classList.add('dragging');
  target.setPointerCapture?.(event.pointerId);

  updateDraggedPosition(event.clientX, event.clientY);
}

function onPointerMove(event) {
  if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;

  event.preventDefault();

  if (rafId) cancelAnimationFrame(rafId);

  rafId = requestAnimationFrame(() => {
    updateDraggedPosition(event.clientX, event.clientY);
    rafId = 0;
  });
}

function onPointerUp(event) {
  if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;

  activeDrag.element.classList.remove('dragging');
  activeDrag.element.releasePointerCapture?.(event.pointerId);

  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  saveState();
  activeDrag = null;
}

function updateDraggedPosition(clientX, clientY) {
  const { rect, element, id } = activeDrag;

  const x = clamp(((clientX - rect.left) / rect.width) * 100, 4, 96);
  const y = clamp(((clientY - rect.top) / rect.height) * 100, 3, 97);

  setPosition(element, x, y);

  const player = state.players.find((item) => item.id === id);
  if (player) {
    player.x = round2(x);
    player.y = round2(y);
  }
}

function applyBackground(backgroundId) {
  let bgVar;
  let chromeColor;

  switch (backgroundId) {
    case 'coke':
      bgVar = 'var(--coke-bg)';
      chromeColor = '#8d0d18';
      break;

    case 'beer':
      bgVar = 'var(--beer-bg)';
      chromeColor = '#6e6e6e';
      bgPosition = 'right 30% center';
      break;

    case 'wood':
    default:
      bgVar = 'var(--wood-bg)';
      chromeColor = '#6b3f20';
      break;
  }

  document.documentElement.style.setProperty('--bg', bgVar);
  document.documentElement.style.setProperty('--chrome-color', chromeColor);

  updateThemeMeta(chromeColor);
  document.body.style.backgroundPosition = bgPosition;
  document.documentElement.style.backgroundColor = chromeColor;
  document.body.style.backgroundColor = chromeColor;
}


function updateThemeMeta(color) {
  let themeColor = document.querySelector('meta[name="theme-color"]');

  if (!themeColor) {
    themeColor = document.createElement('meta');
    themeColor.name = 'theme-color';
    document.head.appendChild(themeColor);
  }

  themeColor.setAttribute('content', color);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function round2(value) {
  return Math.round(value * 100) / 100;
}