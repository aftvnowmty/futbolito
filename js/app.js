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
  { id: 'beer', name: 'Mesa de Carta Blanca' },
];

let pitch;
let configBtn;
let configMenu;
let formationA;
let formationB;
let visibilityMode;
let backgroundBtn;
let backgroundLabel;
let flipBtn;
let resetBtn;

let overlay = null;
let activeDrag = null;
let rafId = 0;
let state = null;

document.addEventListener('DOMContentLoaded', () => {
  try {
    init();
  } catch (error) {
    console.error('Error inicializando app:', error);
    alert('Error JS: ' + error.message);
  }
});

function init() {
  cacheDom();

  if (!pitch) {
    throw new Error('No se encontró #pitch');
  }

  state = loadState();

  createOverlay();
  hydrateFormationOptions();
  syncControls();
  applyBackground(state.background);
  renderBoard();
  attachEvents();
}

function cacheDom() {
  pitch = document.getElementById('pitch');
  configBtn = document.getElementById('configBtn');
  configMenu = document.getElementById('configMenu');
  formationA = document.getElementById('formationA');
  formationB = document.getElementById('formationB');
  visibilityMode = document.getElementById('visibilityMode');
  backgroundBtn = document.getElementById('backgroundBtn');
  backgroundLabel = document.getElementById('backgroundLabel');
  flipBtn = document.getElementById('flipBtn');
  resetBtn = document.getElementById('resetBtn');
}

function createOverlay() {
  overlay = document.createElement('div');
  overlay.className = 'overlay';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', closeConfigMenu);
}

function hydrateFormationOptions() {
  if (!formationA || !formationB) return;

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

function formationToPlayers(team, formationKey, invert) {
  const shape = formations[formationKey];
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

    if (
      !parsed.players ||
      !Array.isArray(parsed.players) ||
      parsed.players.length !== 22
    ) {
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
  if (formationA) formationA.value = state.formationA;
  if (formationB) formationB.value = state.formationB;
  if (visibilityMode) visibilityMode.value = state.visibilityMode;

  const bg =
    backgroundCatalog.find((item) => item.id === state.background) ||
    backgroundCatalog[0];

  if (backgroundLabel) {
    backgroundLabel.textContent = bg.name;
  }
}

function setPosition(element, x, y) {
  element.style.left = `${x}%`;
  element.style.top = `${y}%`;
}

function renderBoard() {
  if (!pitch) return;

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

function attachEvents() {
  if (pitch) {
    pitch.addEventListener('pointerdown', onPointerDown);
  }

  window.addEventListener('pointermove', onPointerMove, { passive: false });
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  if (configBtn) {
    configBtn.addEventListener('click', toggleConfigMenu);
  }

  if (formationA) {
    formationA.addEventListener('change', () => {
      state.formationA = formationA.value;
      applyFormation('A', state.formationA, false);
      closeConfigMenu();
    });
  }

  if (formationB) {
    formationB.addEventListener('change', () => {
      state.formationB = formationB.value;
      applyFormation('B', state.formationB, true);
      closeConfigMenu();
    });
  }

  if (visibilityMode) {
    visibilityMode.addEventListener('change', () => {
      state.visibilityMode = visibilityMode.value;
      renderBoard();
      saveState();
      closeConfigMenu();
    });
  }

  if (backgroundBtn) {
    backgroundBtn.addEventListener('click', () => {
      const currentIndex = backgroundCatalog.findIndex(
        (item) => item.id === state.background
      );
      const next =
        backgroundCatalog[(currentIndex + 1) % backgroundCatalog.length];

      state.background = next.id;
      applyBackground(next.id);
      syncControls();
      saveState();
      closeConfigMenu();
    });
  }

  if (flipBtn) {
    flipBtn.addEventListener('click', () => {
      state.players = state.players.map((player) => ({
        ...player,
        y: 100 - player.y,
      }));

      renderBoard();
      saveState();
      closeConfigMenu();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state.players = buildPlayers(state.formationA, state.formationB);
      renderBoard();
      saveState();
      closeConfigMenu();
    });
  }

  document.addEventListener('click', onDocumentClick);
}

function toggleConfigMenu(event) {
  if (event) {
    event.stopPropagation();
  }

  if (!configMenu) return;

  if (configMenu.hasAttribute('hidden')) {
    configMenu.removeAttribute('hidden');

    if (overlay) {
      overlay.classList.add('active');
    }

    if (configBtn) {
      configBtn.setAttribute('aria-expanded', 'true');
    }
  } else {
    closeConfigMenu();
  }
}

function closeConfigMenu() {
  if (configMenu) {
    configMenu.setAttribute('hidden', '');
  }

  if (overlay) {
    overlay.classList.remove('active');
  }

  if (configBtn) {
    configBtn.setAttribute('aria-expanded', 'false');
  }
}

function onDocumentClick(event) {
  if (!configMenu || !configBtn) return;

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
  if (!target || !pitch) return;

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
  if (!activeDrag) return;

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
  let bgPosition = 'center';

  switch (backgroundId) {
    case 'coke':
      bgVar = 'var(--coke-bg)';
      chromeColor = '#8d0d18';
      break;

    case 'beer':
  bgVar = 'var(--beer-bg)';
  chromeColor = '#6e6e6e';
  if (window.matchMedia('(max-width: 768px)').matches) {
    bgPosition = '72% 60%';
    document.body.style.backgroundSize = 'cover';
  } else {
    bgPosition = '50% 50%';
    document.body.style.backgroundSize = '115%';
  }
  break;
    case 'wood':
    default:
      bgVar = 'var(--wood-bg)';
      chromeColor = '#6b3f20';
      break;
  }

  document.documentElement.style.setProperty('--bg', bgVar);
  document.documentElement.style.setProperty('--chrome-color', chromeColor);
  document.body.style.backgroundPosition = bgPosition;

  updateThemeMeta(chromeColor);

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
