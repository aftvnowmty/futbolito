const STORAGE_KEY = 'futbol-tablero-completo-v1';

const pieceAssets = {
  A: 'assets/salt.png',
  B: 'assets/lemon.png',
};

const defaultPlayers = [
  { id: 'A1', team: 'A', number: 1, x: 50, y: 90 },
  { id: 'A2', team: 'A', number: 2, x: 18, y: 75 },
  { id: 'A3', team: 'A', number: 3, x: 39, y: 75 },
  { id: 'A4', team: 'A', number: 4, x: 61, y: 75 },
  { id: 'A5', team: 'A', number: 5, x: 82, y: 75 },
  { id: 'A6', team: 'A', number: 6, x: 39, y: 60 },
  { id: 'A7', team: 'A', number: 7, x: 61, y: 60 },
  { id: 'A8', team: 'A', number: 8, x: 22, y: 45 },
  { id: 'A9', team: 'A', number: 9, x: 50, y: 43 },
  { id: 'A10', team: 'A', number: 10, x: 78, y: 45 },
  { id: 'A11', team: 'A', number: 11, x: 50, y: 29 },

  { id: 'B1', team: 'B', number: 1, x: 50, y: 10 },
  { id: 'B2', team: 'B', number: 2, x: 18, y: 25 },
  { id: 'B3', team: 'B', number: 3, x: 39, y: 25 },
  { id: 'B4', team: 'B', number: 4, x: 61, y: 25 },
  { id: 'B5', team: 'B', number: 5, x: 82, y: 25 },
  { id: 'B6', team: 'B', number: 6, x: 39, y: 40 },
  { id: 'B7', team: 'B', number: 7, x: 61, y: 40 },
  { id: 'B8', team: 'B', number: 8, x: 22, y: 55 },
  { id: 'B9', team: 'B', number: 9, x: 50, y: 57 },
  { id: 'B10', team: 'B', number: 10, x: 78, y: 55 },
  { id: 'B11', team: 'B', number: 11, x: 50, y: 71 },
];

const pitch = document.getElementById('pitch');
const resetBtn = document.getElementById('resetBtn');
const flipBtn = document.getElementById('flipBtn');

let state = loadState();
let activeDrag = null;

renderBoard();
attachEvents();

function cloneDefaults() {
  return { players: defaultPlayers.map((player) => ({ ...player })) };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaults();
    const parsed = JSON.parse(raw);
    if (!parsed.players || !Array.isArray(parsed.players)) return cloneDefaults();
    return { players: parsed.players.map((player) => ({ ...player })) };
  } catch {
    return cloneDefaults();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function renderBoard() {
  pitch.querySelectorAll('.player').forEach((node) => node.remove());

  state.players.forEach((player) => {
    const piece = document.createElement('button');
    piece.type = 'button';
    piece.className = `player ${player.team === 'A' ? 'salt' : 'lemon'}`;
    piece.dataset.id = player.id;
    piece.dataset.team = player.team;
    piece.setAttribute('aria-label', `Jugador ${player.number}`);

    const img = document.createElement('img');
    img.src = pieceAssets[player.team];
    img.alt = player.team === 'A' ? 'Salero' : 'Limón';

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

  resetBtn.addEventListener('click', () => {
    state = cloneDefaults();
    renderBoard();
    saveState();
  });

  flipBtn.addEventListener('click', () => {
    state.players = state.players.map((player) => ({
      ...player,
      x: 100 - player.x,
      y: 100 - player.y,
    }));
    renderBoard();
    saveState();
  });
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
  updateDraggedPosition(event.clientX, event.clientY);
}

function onPointerUp(event) {
  if (!activeDrag || event.pointerId !== activeDrag.pointerId) return;
  activeDrag.element.classList.remove('dragging');
  activeDrag.element.releasePointerCapture?.(event.pointerId);
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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function round2(value) {
  return Math.round(value * 100) / 100;
}
