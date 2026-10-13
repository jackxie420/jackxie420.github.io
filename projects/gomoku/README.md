# 五子棋 · Gomoku

A browser-only 15×15 freestyle Gomoku game. Black starts; five or more consecutive stones wins. Play against the computer (as Black) or pass the same device between two players.

- `assets/js/engine.js`: board state, win detection, undo, and computer move selection.
- `assets/js/game.js`: board rendering, keyboard/touch input, and turn scheduling.
- `assets/css/game.css`: responsive game styles.
- `assets/images/`: the grid and project-card preview, drawn as SVGs.

The computer checks immediate wins and blocks before scoring local continuous and gapped threats. It runs entirely in the browser and is intended as a casual opponent.

Preview from the repository root using `python3 -m http.server 8765`, then open `/projects/gomoku/`. Stop the server with Ctrl+C when finished. ES modules require an HTTP server.

Run the rules and computer-opponent checks with Node.js 22 or newer, from the repository root:

```sh
node --test projects/gomoku/tests/engine.test.mjs
```
