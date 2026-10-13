# Hold’em Lab

A static, browser-based heads-up Texas Hold’em study tool. Select two hole cards and a preflop/flop/turn/river board; calculate equity against random cards, a weighted range, or a known hand. For a full postflop strategy solve, the page launches the original WASM Postflop interface in a separate tab and provides a copyable setup. That interface requires manual entry of the board, ranges, pot, stack, and betting tree; this site does not import or display its results.

## Files

- `assets/js/poker.js`: card conversion, exact best-five evaluator, range expansion, equity enumeration/sampling, pot-odds formulas.
- `assets/js/equity-worker.js`: equity calculation off the main thread; terminate to cancel.
- `assets/js/lab.js`: card picker, inputs, published strategy viewer, and solver setup notes.
- `assets/data/preflop.json`: a lossless projection of the sourced solver blueprint with provenance/configuration.
- `assets/data/SOLVER-LICENSE.txt`: upstream MIT license.
- `assets/css/` and `assets/images/`: local presentation assets.
- `scripts/import-preflop.py`: reproduces the data bundle from the pinned upstream commit.
- `tests/poker.test.mjs`: rules, range, equity, pot-odds, and data-integrity checks.

## What the numbers mean

Equity is the expected share of the showdown pot, including half of two-player ties. Ranges expand to concrete suit combinations; blocked combos are removed and remaining weights are renormalized. Overlapping range terms use maximum weight (union), not addition.

When the total possible outcomes is at most 100,000, the calculator enumerates them exhaustively. Otherwise, it samples legal opponent combos by weight and samples board runouts without replacement. The displayed approximate 95% margin uses the sample variance of the pot share, including half-ties; it measures sampling error, not uncertainty about an opponent's range. There are no invented result tables or strength-to-action heuristics.

Pot input means the amount **before** the opponent's bet. Calling adds a second matching bet: required equity = `bet / (pot + 2 * bet)`, and showdown-only call EV = `equity * (pot + 2 * bet) - bet`. This assumes no rake and no future betting; it is not GTO advice.

## Preflop data provenance and limitations

- Source: https://github.com/amaster97/poker_solver
- Pinned commit: `f78f1b2bc338dd8cbb5226ecb8398bbdb3635676`
- License: MIT, preserved in `assets/data/SOLVER-LICENSE.txt`.
- Files: `assets/blueprints/preflop_169class_{20,40,100}bb_anteNone.json.gz`.
- All 169 classes at four heads-up decision nodes are retained with their original action frequencies; no rounding or fabricated recommendations.
- Nodes: SB/button first action, BB facing a limp, BB facing a 2 bb open, BB facing a 3 bb open.
- Configuration: 25,000 DCFR iterations; no ante, no rake. The upstream model uses terminal all-in equity / full equity realization as a continuation approximation. It is not a full multi-street equilibrium and upstream records `final_exploitability_bb100: null`. The UI discloses these limitations and labels the frequencies as model estimates.
- Source shard hashes and convergence metadata are recorded in the bundled JSON.

Regenerate with `python3 projects/holdem/scripts/import-preflop.py` from the repository root (requires network access). The script downloads only these pinned data files and the license.

## Full postflop GTO integration

WASM Postflop: https://wasm-postflop.pages.dev/
Source: https://github.com/b-inary/wasm-postflop
Engine: https://github.com/b-inary/postflop-solver
Author: Wataru Inariba.

The full solver is independently hosted and opened only when the visitor clicks its link. No AGPL solver code is copied or linked into this app. Copyable setup notes preserve the selected board and pot and explicit OOP/IP ranges; they intentionally use ranges instead of treating hero's exact private hand as public information. Prior betting actions are not inferred. Bet sizing and convergence must be configured in the external interface.

## Run and verify

From the repository root:

```sh
python3 -m http.server 8765
node --test projects/holdem/tests/poker.test.mjs
```

Open `/projects/holdem/` over HTTP. Browser ES modules and workers do not work from a `file://` preview. Stop the preview server with Ctrl+C when finished. Tests require Node.js 22 or newer and include exhaustive classification of all 2,598,960 five-card hands.
