import test from 'node:test';
import assert from 'node:assert/strict';
import { SIZE, Game, createBoard, winningLine, chooseMove } from '../assets/js/engine.js';

test('black starts, turns alternate, and invalid moves leave the game unchanged', () => {
  const game = new Game();
  assert.equal(game.turn, 1);
  for (const [r, c] of [[-1, 0], [15, 0], [0, 15], [.5, 2], [NaN, 2]]) assert.equal(game.play(r, c), false);
  assert.equal(game.play(7, 7), true);
  assert.equal(game.turn, 2);
  assert.equal(game.play(7, 7), false);
  assert.equal(game.history.length, 1);
  assert.equal(game.play(0, 0), true);
  assert.equal(game.turn, 1);
});

for (const [name, start, direction] of [
  ['horizontal at edge', [0, 10], [0, 1]],
  ['vertical at edge', [10, 14], [1, 0]],
  ['descending diagonal', [10, 10], [1, 1]],
  ['ascending diagonal', [10, 4], [1, -1]],
]) test(`detects ${name} wins`, () => {
  const board = createBoard();
  const [r, c] = start, [dr, dc] = direction;
  for (let i = 0; i < 4; i++) board[r + dr * i][c + dc * i] = 1;
  assert.deepEqual(winningLine(board, r, c), []);
  board[r + dr * 4][c + dc * 4] = 1;
  assert.equal(winningLine(board, r + dr * 2, c + dc * 2).length, 5);
});

test('freestyle overlines win, opposing stones break a line, and edges do not wrap', () => {
  const board = createBoard();
  for (let c = 3; c < 9; c++) board[7][c] = 2;
  assert.equal(winningLine(board, 7, 5).length, 6);
  board[7][6] = 1;
  assert.equal(winningLine(board, 7, 5).length, 0);
  const edge = createBoard();
  for (const [r, c] of [[0, 12], [0, 13], [0, 14], [1, 0], [1, 1]]) edge[r][c] = 1;
  assert.equal(winningLine(edge, 0, 14).length, 0);
});

test('a win locks the board; undo restores the correct turn and permits replay', () => {
  const game = new Game();
  for (let c = 0; c < 4; c++) { game.play(7, c); game.play(8, c); }
  game.play(7, 4);
  assert.equal(game.winner, 1);
  assert.equal(game.play(10, 10), false);
  game.undo();
  assert.equal(game.winner, 0); assert.equal(game.turn, 1);
  assert.equal(game.board[7][4], 0);
  game.play(7, 4); assert.equal(game.winner, 1);
  game.undo(2); assert.equal(game.turn, 2);
  game.reset(); assert.equal(game.history.length, 0); assert.equal(game.turn, 1);
  assert.equal(game.board.flat().every(n => n === 0), true);
});

test('computer takes its own win before blocking the opponent', () => {
  const board = createBoard();
  for (let c = 3; c < 7; c++) { board[7][c] = 2; board[9][c] = 1; }
  const move = chooseMove(board);
  assert.equal(move.row, 7);
  board[move.row][move.col] = 2;
  assert.equal(winningLine(board, move.row, move.col).length, 5);
});

test('computer blocks a gap in an immediate opponent win without mutating the board', () => {
  const board = createBoard();
  for (const c of [4, 5, 7, 8]) board[7][c] = 1;
  const copy = structuredClone(board);
  assert.deepEqual(chooseMove(board), { row: 7, col: 6 });
  assert.deepEqual(board, copy);
});

test('computer blocks a diagonal threat on the board edge', () => {
  const board = createBoard();
  for (let n = 0; n < 4; n++) board[n][14 - n] = 1;
  assert.deepEqual(chooseMove(board), { row: 4, col: 10 });
});

test('computer chooses legal moves, uses the center to open, and handles a full board', () => {
  const board = createBoard();
  assert.deepEqual(chooseMove(board), { row: 7, col: 7 });
  board[7][7] = 1;
  const move = chooseMove(board);
  assert.equal(board[move.row][move.col], 0);
  assert.equal(Math.abs(move.row - 7) <= 2 && Math.abs(move.col - 7) <= 2, true);
  for (const row of board) row.fill(1);
  assert.equal(chooseMove(board), null);
});

test('a last empty intersection without a five-in-a-row produces a draw', () => {
  const game = new Game();
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    game.board[r][c] = (r + 2 * c) % 4 < 2 ? 1 : 2;
  }
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) assert.equal(winningLine(game.board, r, c).length, 0);
  game.board[14][13] = 0;
  game.history = Array.from({ length: SIZE * SIZE - 1 }, () => ({}));
  assert.equal(game.play(14, 13), true);
  assert.equal(game.draw, true); assert.equal(game.winner, 0);
  assert.equal(game.play(14, 13), false);
});
