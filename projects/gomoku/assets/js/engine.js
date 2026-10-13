// Freestyle Gomoku: black starts; five or more consecutive stones wins.
export const SIZE = 15;
const DIRECTIONS = [[1, 0], [0, 1], [1, 1], [1, -1]];
const inside = (r, c) => r >= 0 && c >= 0 && r < SIZE && c < SIZE;
export const createBoard = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

export function winningLine(board, row, col) {
  const player = board[row]?.[col];
  if (!player) return [];
  for (const [dr, dc] of DIRECTIONS) {
    const line = [[row, col]];
    for (const sign of [-1, 1]) {
      let r = row + dr * sign, c = col + dc * sign;
      while (inside(r, c) && board[r][c] === player) {
        line.push([r, c]); r += dr * sign; c += dc * sign;
      }
    }
    if (line.length >= 5) return line;
  }
  return [];
}

export class Game {
  constructor() { this.reset(); }
  reset() {
    this.board = createBoard(); this.history = []; this.turn = 1;
    this.winner = 0; this.line = []; this.draw = false;
  }
  play(row, col) {
    if (!Number.isInteger(row) || !Number.isInteger(col) || !inside(row, col) || this.board[row][col] || this.winner || this.draw) return false;
    const player = this.turn;
    this.board[row][col] = player;
    this.history.push({ row, col, player });
    this.line = winningLine(this.board, row, col);
    this.winner = this.line.length ? player : 0;
    this.draw = !this.winner && this.history.length === SIZE * SIZE;
    if (!this.winner && !this.draw) this.turn = 3 - player;
    return true;
  }
  undo(count = 1) {
    while (count-- > 0 && this.history.length) {
      const { row, col, player } = this.history.pop();
      this.board[row][col] = 0; this.turn = player;
    }
    this.winner = 0; this.line = []; this.draw = false;
  }
}

function candidates(board) {
  const found = new Set();
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (!board[r][c]) continue;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
      if (inside(r + dr, c + dc) && !board[r + dr][c + dc]) found.add((r + dr) * SIZE + c + dc);
    }
  }
  if (!found.size && board[7][7] === 0) return [[7, 7]];
  return [...found].map(n => [Math.floor(n / SIZE), n % SIZE]);
}

function potential(board, row, col, player) {
  let score = 0;
  board[row][col] = player;
  for (const [dr, dc] of DIRECTIONS) {
    let length = 1, open = 0;
    for (const sign of [-1, 1]) {
      let r = row + dr * sign, c = col + dc * sign;
      while (inside(r, c) && board[r][c] === player) { length++; r += dr * sign; c += dc * sign; }
      if (inside(r, c) && !board[r][c]) open++;
    }
    if (open) score += ({ 1: 2, 2: 40, 3: 900, 4: 18000 }[length] || 100000) * (open === 2 ? 4 : 1);
    // Include threats with gaps, such as XX_XX, as well as continuous runs.
    for (let offset = -4; offset <= 0; offset++) {
      let stones = 0, blocked = false;
      for (let k = 0; k < 5; k++) {
        const r = row + (offset + k) * dr, c = col + (offset + k) * dc;
        if (!inside(r, c) || (board[r][c] && board[r][c] !== player)) { blocked = true; break; }
        if (board[r][c] === player) stones++;
      }
      if (!blocked) score += [0, 1, 10, 90, 1500, 1000000][stones];
    }
  }
  board[row][col] = 0;
  return score;
}

export function chooseMove(board, player = 2) {
  const options = candidates(board);
  const opponent = 3 - player;
  // Take a win before blocking; neither tactical decision depends on heuristics.
  for (const target of [player, opponent]) for (const [row, col] of options) {
    board[row][col] = target;
    const wins = winningLine(board, row, col).length > 0;
    board[row][col] = 0;
    if (wins) return { row, col };
  }
  let best = null, bestScore = -Infinity;
  for (const [row, col] of options) {
    const score = potential(board, row, col, player) + potential(board, row, col, opponent) * 1.1 - (Math.abs(row - 7) + Math.abs(col - 7)) * .1;
    if (score > bestScore) { bestScore = score; best = { row, col }; }
  }
  return best;
}
