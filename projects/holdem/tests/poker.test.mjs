import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cardId, cardCode, handClass, evaluate, categoryOf, parseRange, calculateEquity, potOdds, validateSpot } from '../assets/js/poker.js';
const cards = text => text.split(' ').map(cardId);
const seeded = (seed = 123456) => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };

test('all 52 card IDs round-trip; suits and starting-hand classes are correct', () => {
  for (let c = 0; c < 52; c++) assert.equal(cardId(cardCode(c)), c);
  assert.equal(handClass(cards('As Ks')), 'AKs');
  assert.equal(handClass(cards('Kh As')), 'AKo');
  assert.equal(handClass(cards('Ah As')), 'AA');
  assert.throws(() => cardId('1s'));
});

test('hand categories, kickers, wheels, two trips, and a six-card flush', () => {
  const examples = ['As Kd Qc Jh 9s', 'As Ad Qc Jh 9s', 'As Ad Qc Qh 9s', 'As Ad Ac Jh 9s', 'As 2d 3c 4h 5s', 'As Js 8s 4s 2s', 'As Ad Ac Jh Js', 'As Ad Ac Ah 9s', 'As Ks Qs Js Ts'];
  examples.forEach((text, n) => assert.equal(categoryOf(evaluate(cards(text))), ['High card', 'One pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush'][n]));
  for (let i = 1; i < examples.length; i++) assert.ok(evaluate(cards(examples[i])) > evaluate(cards(examples[i - 1])));
  assert.ok(evaluate(cards('2s 3h 4c 5d 6s')) > evaluate(cards('As 2d 3c 4h 5s')));
  assert.ok(evaluate(cards('As Ad Kc Qd Jh 7s 2d')) > evaluate(cards('Ah Ac Ks Qc Td 9h 3s')));
  assert.equal(evaluate(cards('As Ad Ac Kh Kc Kd 2s')), evaluate(cards('As Ad Ac Kh Kc')));
  assert.equal(evaluate(cards('As Ks 9s 8s 5s 2s Qh')), evaluate(cards('As Ks 9s 8s 5s')));
  assert.equal(evaluate(cards('As Ad Kc Kh Qs Qd Js')), evaluate(cards('As Ad Kc Kh Qs')));
});

test('exhaustive five-card category counts match the combinatorial 52-card deck', () => {
  const counts = Array(9).fill(0), unit = 15 ** 5;
  for (let a = 0; a < 48; a++) for (let b = a + 1; b < 49; b++) for (let c = b + 1; c < 50; c++) for (let d = c + 1; d < 51; d++) for (let e = d + 1; e < 52; e++) counts[Math.floor(evaluate([a, b, c, d, e]) / unit)]++;
  assert.deepEqual(counts, [1302540, 1098240, 123552, 54912, 10200, 5108, 3744, 624, 40]);
});

test('range notation expands exact combos with weights, unions, and blockers', () => {
  for (const [range, expected] of [['AA', 6], ['AKs', 4], ['AKo', 12], ['AK', 16], ['22+', 78], ['A2s+', 48], ['KTs+', 12], ['22-66', 30], ['A2s-A5s', 16], ['random', 1326]]) assert.equal(parseRange(range).length, expected, range);
  assert.equal(parseRange('AA', cards('As')).length, 3);
  assert.equal(parseRange('AA,AA,AsAh:0.5').length, 6);
  assert.equal(parseRange('AKs:0.5', cards('As')).reduce((sum, c) => sum + c.weight, 0), 1.5);
  assert.equal(parseRange('AsKh', cards('As')).length, 0);
  for (const invalid of ['99s', 'KAo', 'A9s-AAs', 'AsAs', 'AA:1.1', 'AKs:-1', 'AA:', 'potato']) assert.throws(() => parseRange(invalid));
});

test('invalid streets, board counts, duplicate cards and impossible ranges are rejected', () => {
  assert.throws(() => validateSpot({ hero: cards('As As'), board: [], street: 'preflop' }));
  assert.throws(() => validateSpot({ hero: cards('As Kh'), board: cards('2c 3d'), street: 'flop' }));
  assert.throws(() => calculateEquity({ hero: cards('As Ah'), board: [], street: 'preflop', range: 'AsKh' }));
});

test('exact river showdown, board-only ties, and weighted opponent ranges', () => {
  const royal = { hero: cards('2c 3d'), board: cards('As Ks Qs Js Ts'), street: 'river' };
  const result = calculateEquity(royal);
  assert.equal(result.equity, .5); assert.equal(result.tie, 1); assert.equal(result.trials, 990); assert.equal(result.exact, true); assert.equal(result.margin95, 0);
  const weighted = calculateEquity({ hero: cards('9c 9d'), board: cards('As Kh Qc 2d 3h'), street: 'river', range: 'AcAd:0.25,8c8d:0.75' });
  assert.equal(weighted.equity, .75); assert.equal(weighted.win, .75); assert.equal(weighted.lose, .25); assert.equal(weighted.combos, 2);
});

test('known turn opponent is exhaustive and correctly counts its two winning rivers', () => {
  const result = calculateEquity({ hero: cards('As Ah'), villain: cards('Ks Kh'), board: cards('2c 3d 4h 9s'), street: 'turn' });
  assert.equal(result.exact, true); assert.equal(result.trials, 44); assert.equal(result.equity, 42 / 44);
});

test('known flop opponent enumerates all 990 unordered turn/river combinations', () => {
  const result = calculateEquity({ hero: cards('As Ah'), villain: cards('Ks Kh'), board: cards('2c 3d 9s'), street: 'flop' });
  assert.equal(result.exact, true); assert.equal(result.trials, 990); assert.ok(result.equity > .85 && result.equity < .95);
});

test('AA versus KK simulation is reproducible and in its expected equity interval', () => {
  const result = calculateEquity({ hero: cards('As Ah'), villain: cards('Ks Kh'), board: [], street: 'preflop', samples: 30000 }, () => {}, seeded());
  assert.equal(result.exact, false); assert.ok(result.equity > .80 && result.equity < .84); assert.ok(result.margin95 > 0 && result.margin95 < .01);
  assert.ok(Math.abs(result.win + result.tie + result.lose - 1) < 1e-12);
});

test('pot odds use the pot BEFORE the opponent bet; zero and invalid inputs', () => {
  assert.deepEqual(potOdds(10, 5, .25), { required: .25, callEV: 0 });
  assert.deepEqual(potOdds(10, 5, .5), { required: .25, callEV: 5 });
  assert.deepEqual(potOdds(0, 0, null), { required: 0, callEV: null });
  assert.throws(() => potOdds(-1, 5, .5)); assert.throws(() => potOdds(10, NaN, .5));
});

test('sourced strategies have all 169 classes, normalized action frequencies, and provenance', () => {
  const data = JSON.parse(readFileSync(new URL('../assets/data/preflop.json', import.meta.url)));
  assert.equal(data.source.commit, 'f78f1b2bc338dd8cbb5226ecb8398bbdb3635676');
  for (const [stack, source] of Object.entries(data.stacks)) {
    assert.equal(source.config.stack_bb, Number(stack)); assert.equal(source.config.iterations, 25000); assert.match(source.upstream_sha256, /^[0-9a-f]{64}$/);
    for (const node of Object.values(source.nodes)) {
      assert.equal(Object.keys(node.strategy).length, 169);
      for (const probabilities of Object.values(node.strategy)) {
        assert.equal(probabilities.length, node.actions.length);
        assert.ok(probabilities.every(p => p >= 0 && p <= 1));
        assert.ok(Math.abs(probabilities.reduce((a, b) => a + b, 0) - 1) < 1e-9);
      }
    }
  }
});
