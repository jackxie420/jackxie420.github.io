import { Game, SIZE, chooseMove } from './engine.js?v=e13eb94d8c88';

const game = new Game();
const board = document.getElementById('board');
const status = document.getElementById('game-status');
const hint = document.getElementById('game-hint');
const mode = document.getElementById('game-mode');
const undo = document.getElementById('undo');
const moveCount = document.getElementById('move-count');
const cells = [];
let pending = null, thinking = false, focusRow = 7, focusCol = 7;
const color = player => player === 1 ? 'Black' : 'White';
const coordinates = (r, c) => `${String.fromCharCode(65 + c)}${SIZE - r}`;

for (let r = 0; r < SIZE; r++) {
  const row = document.createElement('div');
  row.className = 'board-row'; row.setAttribute('role', 'row');
  cells[r] = [];
  for (let c = 0; c < SIZE; c++) {
    const cell = document.createElement('button');
    cell.type = 'button'; cell.className = 'intersection';
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-rowindex', r + 1); cell.setAttribute('aria-colindex', c + 1);
    cell.dataset.row = r; cell.dataset.col = c;
    cell.addEventListener('click', () => play(r, c));
    cell.addEventListener('focus', () => setFocus(r, c, false));
    cells[r][c] = cell; row.appendChild(cell);
  }
  board.appendChild(row);
}

function setFocus(r, c, moveFocus) {
  cells[focusRow][focusCol].tabIndex = -1;
  focusRow = r; focusCol = c; cells[r][c].tabIndex = 0;
  if (moveFocus) cells[r][c].focus();
}

board.addEventListener('keydown', e => {
  const directions = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
  if (directions[e.key]) {
    e.preventDefault(); const [dr, dc] = directions[e.key];
    setFocus(Math.max(0, Math.min(SIZE - 1, focusRow + dr)), Math.max(0, Math.min(SIZE - 1, focusCol + dc)), true);
  } else if (e.key === 'Home' || e.key === 'End') {
    e.preventDefault(); setFocus(e.ctrlKey ? (e.key === 'Home' ? 0 : SIZE - 1) : focusRow, e.key === 'Home' ? 0 : SIZE - 1, true);
  }
});

function render() {
  const last = game.history.at(-1);
  const winning = new Set(game.line.map(([r, c]) => r * SIZE + c));
  const locked = thinking || Boolean(game.winner) || game.draw;
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const cell = cells[r][c], player = game.board[r][c];
    cell.className = 'intersection' + (player ? ` occupied ${player === 1 ? 'black' : 'white'}` : '') + (winning.has(r * SIZE + c) ? ' winning' : '') + (last?.row === r && last?.col === c ? ' last-move' : '');
    cell.setAttribute('aria-label', `${coordinates(r, c)}, ${player ? color(player) + ' stone' : 'empty'}${winning.has(r * SIZE + c) ? ', winning line' : ''}${last?.row === r && last?.col === c ? ', last move' : ''}`);
    cell.setAttribute('aria-disabled', String(locked || Boolean(player)));
    cell.tabIndex = r === focusRow && c === focusCol ? 0 : -1;
  }
  board.dataset.turn = String(game.turn); board.dataset.locked = String(locked);
  moveCount.textContent = `${game.history.length} ${game.history.length === 1 ? 'stone' : 'stones'} played`;
  undo.disabled = !game.history.length;
  if (game.winner) {
    status.textContent = mode.value === 'computer' ? (game.winner === 1 ? 'You win!' : 'Computer wins.') : `${color(game.winner)} wins!`;
    hint.textContent = 'Five in a row. A fine line of work.';
  } else if (game.draw) {
    status.textContent = 'A full board. A draw.'; hint.textContent = 'Start a new game for another round.';
  } else if (thinking) {
    status.textContent = 'White is thinking…'; hint.textContent = 'The computer is choosing its next move.';
  } else {
    status.textContent = mode.value === 'computer' ? 'Your turn · Black' : `${color(game.turn)} to move`;
    hint.textContent = game.history.length ? `Last move: ${color(last.player)} at ${coordinates(last.row, last.col)}.` : 'Black goes first. Choose an intersection.';
  }
  document.getElementById('black-player').textContent = mode.value === 'computer' ? 'You' : 'Player 1';
  document.getElementById('white-player').textContent = mode.value === 'computer' ? 'Computer' : 'Player 2';
  document.getElementById('black-side').classList.toggle('active', !game.winner && !game.draw && game.turn === 1);
  document.getElementById('white-side').classList.toggle('active', !game.winner && !game.draw && game.turn === 2);
}

function cancelComputer() {
  clearTimeout(pending); pending = null; thinking = false;
}

function play(row, col) {
  if (thinking || !game.play(row, col)) return;
  setFocus(row, col, false);
  render();
  if (mode.value === 'computer' && game.turn === 2 && !game.winner && !game.draw) {
    thinking = true; render();
    pending = setTimeout(() => {
      pending = null;
      const move = chooseMove(game.board, 2);
      thinking = false;
      if (move) game.play(move.row, move.col);
      render();
    }, 350);
  }
}

function reset() {
  cancelComputer(); game.reset(); setFocus(7, 7, false); render();
}
mode.addEventListener('change', reset);
document.getElementById('restart').addEventListener('click', reset);
undo.addEventListener('click', () => {
  cancelComputer();
  // In computer mode, undo your move and its reply, or just your pending move.
  const count = mode.value === 'computer' && game.history.at(-1)?.player === 2 ? 2 : 1;
  game.undo(count); render();
});
render();
