// Exact best-five evaluator and blocker-aware heads-up equity calculations.
export const RANKS = '23456789TJQKA';
export const SUITS = 'cdhs';
export const SUIT_SYMBOLS = ['♣', '♦', '♥', '♠'];
export const CATEGORIES = ['High card', 'One pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush'];
const BASE = 15 ** 5;
export const cardCode = n => RANKS[Math.floor(n / 4)] + SUITS[n % 4];
export function cardId(text) {
  if (!/^[2-9TJQKA][cdhs]$/i.test(text)) throw new Error(`Invalid card: ${text}`);
  return RANKS.indexOf(text[0].toUpperCase()) * 4 + SUITS.indexOf(text[1].toLowerCase());
}
export function handClass(cards) {
  if (cards.length !== 2) return null;
  const [a, b] = cards.map(n => Math.floor(n / 4)).sort((x, y) => y - x);
  return RANKS[a] + RANKS[b] + (a === b ? '' : cards[0] % 4 === cards[1] % 4 ? 's' : 'o');
}
function straight(mask) {
  for (let high = 14; high >= 6; high--) if ((mask & (31 << (high - 4))) === (31 << (high - 4))) return high;
  return (mask & 16444) === 16444 ? 5 : 0; // A-2-3-4-5 (bits 14, 5, 4, 3, 2).
}
function value(category, ranks) {
  let score = category * BASE;
  for (let k = 0; k < Math.min(5, ranks.length); k++) score += ranks[k] * 15 ** (4 - k);
  return score;
}
export const categoryOf = score => CATEGORIES[Math.floor(score / BASE)];
export function evaluate(cards) {
  const counts = new Uint8Array(15), suits = new Uint8Array(4), masks = new Uint16Array(4);
  let mask = 0;
  for (const card of cards) {
    const rank = Math.floor(card / 4) + 2, suit = card % 4;
    counts[rank]++; suits[suit]++; masks[suit] |= 1 << rank; mask |= 1 << rank;
  }
  const singles = [], pairs = [], trips = [], quads = [];
  for (let rank = 14; rank >= 2; rank--) {
    if (counts[rank]) singles.push(rank);
    if (counts[rank] >= 2) pairs.push(rank);
    if (counts[rank] >= 3) trips.push(rank);
    if (counts[rank] === 4) quads.push(rank);
  }
  const flushSuit = suits.findIndex(n => n >= 5);
  if (flushSuit >= 0) {
    const sf = straight(masks[flushSuit]);
    if (sf) return value(8, [sf]);
  }
  if (quads.length) return value(7, [quads[0], ...singles.filter(r => r !== quads[0]).slice(0, 1)]);
  if (trips.length) {
    const pair = pairs.find(r => r !== trips[0]);
    if (pair) return value(6, [trips[0], pair]);
  }
  if (flushSuit >= 0) return value(5, singles.filter(r => masks[flushSuit] & (1 << r)).slice(0, 5));
  const run = straight(mask);
  if (run) return value(4, [run]);
  if (trips.length) return value(3, [trips[0], ...singles.filter(r => r !== trips[0]).slice(0, 2)]);
  if (pairs.length >= 2) return value(2, [pairs[0], pairs[1], ...singles.filter(r => r !== pairs[0] && r !== pairs[1]).slice(0, 1)]);
  if (pairs.length) return value(1, [pairs[0], ...singles.filter(r => r !== pairs[0]).slice(0, 3)]);
  return value(0, singles.slice(0, 5));
}

function classesFor(token) {
  const interval = token.split('-');
  if (interval.length === 2) {
    const [a, b] = interval;
    if (/^([2-9TJQKA])\1$/.test(a) && /^([2-9TJQKA])\1$/.test(b)) {
      const lo = Math.min(RANKS.indexOf(a[0]), RANKS.indexOf(b[0])), hi = Math.max(RANKS.indexOf(a[0]), RANKS.indexOf(b[0]));
      return [...RANKS.slice(lo, hi + 1)].map(r => r + r);
    }
    if (/^[2-9TJQKA]{2}[so]?$/.test(a) && /^[2-9TJQKA]{2}[so]?$/.test(b) && a[0] === b[0] && a.slice(2) === b.slice(2)) {
      const lo = Math.min(RANKS.indexOf(a[1]), RANKS.indexOf(b[1])), hi = Math.max(RANKS.indexOf(a[1]), RANKS.indexOf(b[1]));
      if (hi >= RANKS.indexOf(a[0])) throw new Error(`Use non-pair high-card-first intervals, e.g. A2s-A5s: ${token}`);
      return [...RANKS.slice(lo, hi + 1)].map(r => a[0] + r + a.slice(2));
    }
    throw new Error(`Unsupported interval: ${token}. Try 22-66 or A2s-A5s.`);
  }
  const plus = token.endsWith('+'), hand = token.replace(/\+$/, '');
  if (!/^[2-9TJQKA]{2}[so]?$/.test(hand)) throw new Error(`Invalid range term: ${token}`);
  const high = RANKS.indexOf(hand[0]), low = RANKS.indexOf(hand[1]), type = hand.slice(2);
  if (low > high || (high === low && type)) throw new Error(`Use high card first, e.g. AKs or QQ: ${token}`);
  if (!plus) return [hand];
  if (high === low) return [...RANKS.slice(high)].map(r => r + r);
  return [...RANKS.slice(low, high)].map(r => hand[0] + r + type);
}

// Overlapping terms form a union (maximum weight), not duplicated combos.
export function parseRange(text = 'random', dead = []) {
  const blocked = new Set(dead), weights = new Map();
  if (['random', 'any', '*'].includes(text.trim().toLowerCase())) {
    for (let a = 0; a < 52; a++) for (let b = a + 1; b < 52; b++) if (!blocked.has(a) && !blocked.has(b)) weights.set(a * 52 + b, 1);
  } else {
    const tokens = text.trim().split(/[\s,;]+/).filter(Boolean);
    if (!tokens.length) throw new Error('Enter an opponent range, e.g. TT+,AJs+,KQs,AQo+.');
    for (const original of tokens) {
      const parts = original.split(':');
      if (parts.length > 2 || (parts.length === 2 && parts[1] === '')) throw new Error(`Invalid weight: ${original}`);
      const weight = parts.length === 2 ? Number(parts[1]) : 1;
      if (!Number.isFinite(weight) || weight < 0 || weight > 1) throw new Error(`Range weights must be between 0 and 1: ${original}`);
      const token = parts[0];
      let combos = [];
      if (/^[2-9TJQKA][cdhs][2-9TJQKA][cdhs]$/i.test(token)) {
        combos = [[cardId(token.slice(0, 2)), cardId(token.slice(2))]];
        if (combos[0][0] === combos[0][1]) throw new Error(`A card cannot appear twice: ${token}`);
      } else {
        for (const hand of classesFor(token)) {
          const hi = RANKS.indexOf(hand[0]), lo = RANKS.indexOf(hand[1]), kind = hand.slice(2);
          for (let s = 0; s < 4; s++) for (let t = 0; t < 4; t++) {
            if (hi === lo && s >= t) continue;
            if (hi !== lo && ((kind === 's' && s !== t) || (kind === 'o' && s === t))) continue;
            combos.push([hi * 4 + s, lo * 4 + t]);
          }
        }
      }
      for (let [a, b] of combos) {
        if (blocked.has(a) || blocked.has(b) || weight === 0) continue;
        if (a > b) [a, b] = [b, a];
        const key = a * 52 + b;
        weights.set(key, Math.max(weights.get(key) || 0, weight));
      }
    }
  }
  return [...weights].map(([key, weight]) => ({ cards: [Math.floor(key / 52), key % 52], weight }));
}

export function validateSpot({ hero, board, villain = [], street }) {
  const expected = { preflop: 0, flop: 3, turn: 4, river: 5 }[street];
  if (expected === undefined) throw new Error('Choose preflop, flop, turn, or river.');
  if (hero.length !== 2) throw new Error('Choose both of your hole cards.');
  if (board.length !== expected) throw new Error(`Choose ${expected} board cards for the ${street}.`);
  if (villain.length !== 0 && villain.length !== 2) throw new Error('Choose both opponent cards.');
  const all = [...hero, ...board, ...villain];
  if (all.some(c => !Number.isInteger(c) || c < 0 || c > 51)) throw new Error('Choose valid cards from the deck.');
  if (new Set(all).size !== all.length) throw new Error('The same card cannot be used twice.');
}

export function calculateEquity(spot, onProgress = () => {}, random = Math.random) {
  validateSpot(spot);
  const { hero, board, villain = [], range = 'random', samples = 30000 } = spot;
  const combos = villain.length ? [{ cards: villain, weight: 1 }] : parseRange(range, [...hero, ...board]);
  if (!combos.length) throw new Error('No opponent combinations remain after removing your cards and the board.');
  const missing = 5 - board.length;
  const base = Array.from({ length: 52 }, (_, i) => i).filter(c => !hero.includes(c) && !board.includes(c));
  const runouts = missing === 0 ? 1 : missing === 1 ? base.length - 2 : missing === 2 ? (base.length - 2) * (base.length - 3) / 2 : Infinity;
  const exact = combos.length * runouts <= 100000;
  const trials = exact ? combos.length * runouts : samples;
  if (!Number.isInteger(samples) || samples < 1 || samples > 200000) throw new Error('Choose between 1 and 200,000 simulations.');
  let wins = 0, ties = 0, losses = 0, total = 0, completed = 0;
  const score = (opponent, tail, weight) => {
    const finalBoard = board.concat(tail);
    const h = evaluate(hero.concat(finalBoard)), v = evaluate(opponent.concat(finalBoard));
    if (h > v) wins += weight; else if (h === v) ties += weight; else losses += weight;
    total += weight; completed++;
    if (completed % 1024 === 0) onProgress(completed / trials);
  };
  if (exact) {
    for (const { cards, weight } of combos) {
      const deck = base.filter(c => !cards.includes(c));
      if (missing === 0) score(cards, [], weight);
      else if (missing === 1) for (const c of deck) score(cards, [c], weight);
      else for (let a = 0; a < deck.length; a++) for (let b = a + 1; b < deck.length; b++) score(cards, [deck[a], deck[b]], weight);
    }
  } else {
    const cumulative = []; let sum = 0;
    for (const { weight } of combos) { sum += weight; cumulative.push(sum); }
    for (let n = 0; n < samples; n++) {
      const target = random() * sum;
      let lo = 0, hi = cumulative.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (target < cumulative[mid]) hi = mid; else lo = mid + 1; }
      const opponent = combos[lo].cards, deck = base.filter(c => !opponent.includes(c));
      for (let k = 0; k < missing; k++) {
        const j = k + Math.floor(random() * (deck.length - k));
        [deck[k], deck[j]] = [deck[j], deck[k]];
      }
      score(opponent, deck.slice(0, missing), 1);
    }
  }
  onProgress(1);
  const equity = (wins + ties / 2) / total;
  const standardError = exact ? 0 : Math.sqrt(Math.max(0, (wins + ties / 4) / total - equity ** 2) / total);
  return { equity, win: wins / total, tie: ties / total, lose: losses / total, exact, trials: completed, combos: combos.length, weightedCombos: combos.reduce((sum, c) => sum + c.weight, 0), margin95: 1.96 * standardError, madeHand: board.length >= 3 ? categoryOf(evaluate([...hero, ...board])) : handClass(hero) };
}

// Pot is the amount BEFORE the opponent's bet; only showdown value is modelled.
export function potOdds(pot, bet, equity) {
  if (![pot, bet].every(n => Number.isFinite(n) && n >= 0)) throw new Error('Pot and bet must be non-negative numbers.');
  const finalPot = pot + 2 * bet;
  return { required: finalPot ? bet / finalPot : 0, callEV: equity == null ? null : equity * finalPot - bet };
}
