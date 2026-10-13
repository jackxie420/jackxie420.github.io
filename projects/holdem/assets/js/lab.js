import { RANKS, SUIT_SYMBOLS, cardCode, cardId, handClass, parseRange, validateSpot, potOdds } from './poker.js?v=b9fee785a9b1';

const $ = id => document.getElementById(id);
const counts = { preflop: 0, flop: 3, turn: 4, river: 5 };
const names = { c: 'clubs', d: 'diamonds', h: 'hearts', s: 'spades' };
const rankNames = { A: 'Ace', K: 'King', Q: 'Queen', J: 'Jack', T: 'Ten' };
const state = { hero: [cardId('As'), cardId('Kh')], board: Array(5).fill(null), villain: [null, null], street: 'preflop', active: ['hero', 0], result: null };
let blueprint = null, worker = null;
const deckButtons = new Map();
const percent = n => `${(n * 100).toFixed(1)}%`;
const currentBoard = () => state.board.slice(0, counts[state.street]).filter(c => c !== null);
const slotLabel = (group, index) => group === 'hero' ? `your card ${index + 1}` : group === 'villain' ? `opponent card ${index + 1}` : index < 3 ? `flop card ${index + 1}` : index === 3 ? 'turn card' : 'river card';
const spoken = c => { const code = cardCode(c); return `${rankNames[code[0]] || code[0]} of ${names[code[1]]}`; };

function visibleSlots() {
  return [['hero', 0], ['hero', 1], ...Array.from({ length: counts[state.street] }, (_, i) => ['board', i]), ...($('opponent-mode').value === 'exact' ? [['villain', 0], ['villain', 1]] : [])];
}
function advance() {
  const slots = visibleSlots(), index = slots.findIndex(([g, i]) => g === state.active[0] && i === state.active[1]);
  const ordered = [...slots.slice(index + 1), ...slots.slice(0, index + 1)];
  state.active = ordered.find(([g, i]) => state[g][i] === null) || slots[(index + 1) % slots.length];
}
function invalidate() {
  if (worker) worker.terminate(); worker = null;
  state.result = null;
  $('calculate').textContent = 'Calculate equity'; $('method-pill').textContent = 'Ready'; $('progress').hidden = true;
  for (const id of ['equity-value', 'win-value', 'tie-value', 'lose-value', 'call-ev']) $(id).textContent = '—';
  $('win-bar').style.width = '0%'; $('tie-bar').style.width = '0%';
  $('calculation-status').classList.remove('error'); $('calculation-status').textContent = 'Cards updated. Calculate this spot.';
  updateOdds();
}
function renderSlots(group, node, length) {
  node.replaceChildren();
  for (let i = 0; i < length; i++) {
    const card = state[group][i], button = document.createElement('button');
    button.type = 'button'; button.className = 'slot' + (card === null ? ' empty' : card % 4 === 1 || card % 4 === 2 ? ' red' : '');
    button.dataset.slot = `${group}-${i}`;
    button.setAttribute('aria-pressed', String(state.active[0] === group && state.active[1] === i));
    button.setAttribute('aria-label', `Select ${slotLabel(group, i)}${card === null ? ', empty' : ': ' + spoken(card)}`);
    if (card === null) { button.textContent = '+'; const small = document.createElement('small'); small.textContent = group === 'board' ? (i < 3 ? 'Flop' : i === 3 ? 'Turn' : 'River') : `Card ${i + 1}`; button.appendChild(small); }
    else { const rank = document.createElement('span'), suit = document.createElement('span'); rank.textContent = RANKS[Math.floor(card / 4)]; suit.textContent = SUIT_SYMBOLS[card % 4]; button.append(rank, suit); }
    button.addEventListener('click', () => { state.active = [group, i]; render(); });
    node.appendChild(button);
  }
}
for (const suit of [3, 2, 0, 1]) {
  const row = document.createElement('div'); row.className = 'deck-row';
  for (let rank = 12; rank >= 0; rank--) {
    const card = rank * 4 + suit, button = document.createElement('button');
    button.type = 'button'; button.className = 'deck-card' + ([1, 2].includes(suit) ? ' red' : ''); button.dataset.card = cardCode(card);
    button.setAttribute('aria-label', spoken(card)); button.title = spoken(card);
    button.textContent = RANKS[rank]; const symbol = document.createElement('span'); symbol.textContent = SUIT_SYMBOLS[suit]; symbol.setAttribute('aria-hidden', 'true'); button.appendChild(symbol);
    button.addEventListener('click', e => {
      const [group, i] = state.active;
      state[group][i] = card; invalidate(); advance(); render();
      if (e.detail === 0) document.querySelector(`[data-slot="${state.active[0]}-${state.active[1]}"]`)?.focus();
    });
    deckButtons.set(card, button); row.appendChild(button);
  }
  $('deck').appendChild(row);
}
function render() {
  const exact = $('opponent-mode').value === 'exact';
  $('villain-cards').hidden = !exact; $('range-controls').hidden = $('opponent-mode').value !== 'range';
  renderSlots('hero', $('hero-slots'), 2); renderSlots('board', $('board-slots'), counts[state.street]); renderSlots('villain', $('villain-slots'), exact ? 2 : 0);
  const used = new Set([...state.hero, ...currentBoard(), ...(exact ? state.villain : [])].filter(c => c !== null));
  const activeCard = state[state.active[0]][state.active[1]];
  for (const [card, button] of deckButtons) button.disabled = used.has(card) && card !== activeCard;
  $('picker-target').textContent = `Choose ${slotLabel(...state.active)}`;
  $('board-caption').textContent = counts[state.street] ? `${currentBoard().length} of ${counts[state.street]} selected` : 'No board before the flop';
  document.querySelectorAll('[data-street]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.street === state.street)));
  $('preflop-panel').hidden = state.street !== 'preflop';
  renderPreflop();
}
function spot() {
  if ($('opponent-mode').value === 'exact' && state.villain.some(c => c === null)) throw new Error('Choose both opponent cards.');
  const config = { hero: state.hero.filter(c => c !== null), board: currentBoard(), villain: $('opponent-mode').value === 'exact' ? state.villain : [], street: state.street, range: $('opponent-mode').value === 'range' ? $('opponent-range').value : 'random', samples: Number($('samples').value) };
  validateSpot(config); return config;
}
function error(message) { $('calculation-status').textContent = message; $('calculation-status').classList.add('error'); $('method-pill').textContent = 'Check inputs'; }
function calculate() {
  if (worker) { worker.terminate(); worker = null; $('calculate').textContent = 'Calculate equity'; $('progress').hidden = true; $('method-pill').textContent = 'Cancelled'; $('calculation-status').textContent = 'Calculation cancelled.'; return; }
  let config;
  try { config = spot(); if (!parseRange(config.range, [...config.hero, ...config.board]).length && !config.villain.length) throw new Error('No opponent combinations remain after blockers.'); }
  catch (e) { error(e.message); return; }
  invalidate(); $('method-pill').textContent = 'Calculating'; $('calculate').textContent = 'Cancel calculation'; $('calculation-status').textContent = 'Evaluating legal deals…'; $('progress').hidden = false; $('progress').setAttribute('aria-valuenow', '0'); $('progress').firstElementChild.style.width = '0%';
  worker = new Worker(new URL('./equity-worker.js?v=2114c9dd7a70', import.meta.url), { type: 'module' });
  const current = worker;
  current.onmessage = ({ data }) => {
    if (worker !== current) return;
    if (data.type === 'progress') { const progress = Math.round(data.fraction * 100); $('progress').setAttribute('aria-valuenow', String(progress)); $('progress').firstElementChild.style.width = `${progress}%`; return; }
    current.terminate(); worker = null; $('calculate').textContent = 'Calculate equity'; $('progress').hidden = true;
    if (data.type === 'error') { error(data.message); return; }
    state.result = data.result;
    const result = state.result;
    $('equity-value').textContent = percent(result.equity); $('win-value').textContent = percent(result.win); $('tie-value').textContent = percent(result.tie); $('lose-value').textContent = percent(result.lose);
    $('win-bar').style.width = percent(result.win); $('tie-bar').style.width = percent(result.tie); $('method-pill').textContent = result.exact ? 'Exact enumeration' : 'Monte Carlo';
    $('calculation-status').textContent = `${result.trials.toLocaleString()} ${result.exact ? 'outcomes counted' : 'deals sampled'} · ${result.combos.toLocaleString()} opponent combos after blockers. ${result.exact ? 'No sampling error.' : `Approx. 95% sampling margin: ±${(result.margin95 * 100).toFixed(2)} percentage points.`} ${counts[state.street] ? 'Current hand: ' : 'Starting hand: '}${result.madeHand}.`;
    updateOdds();
  };
  current.onerror = () => { if (worker !== current) return; current.terminate(); worker = null; $('calculate').textContent = 'Calculate equity'; $('progress').hidden = true; error('The calculation could not start. Reload the page and try again.'); };
  current.postMessage(config);
}
function numeric(id) {
  if ($(id).value.trim() === '') throw new Error('Enter the pot and bet amounts.');
  const n = Number($(id).value); if (!Number.isFinite(n) || n < 0 || n > 1000000) throw new Error('Use pot and bet amounts between 0 and 1,000,000 bb.'); return n;
}
function updateOdds() {
  try {
    const result = potOdds(numeric('pot'), numeric('bet'), state.result?.equity);
    $('required-equity').textContent = percent(result.required);
    $('call-ev').textContent = result.callEV == null ? '—' : `${result.callEV >= 0 ? '+' : '−'}${Math.abs(result.callEV).toFixed(2)} bb`;
    $('odds-note').textContent = 'Equity includes half of ties. Call EV assumes no future betting or rake; it is not a GTO action recommendation.';
  } catch (e) { $('required-equity').textContent = '—'; $('call-ev').textContent = '—'; $('odds-note').textContent = e.message; }
}
const actionColor = action => action === 'fold' ? '#b7c5d3' : ['call', 'check'].includes(action) ? '#69a8df' : '#e79882';
function actionName(action, key) {
  if (action === 'all_in') return 'All-in';
  if (action === 'call' && key === 'sb-first') return 'Limp';
  if (action.includes('_to_')) return `Raise to ${Number(action.split('_to_')[1]) / 100} bb`;
  return action[0].toUpperCase() + action.slice(1);
}
function renderPreflop() {
  if (!blueprint || state.street !== 'preflop') return;
  const key = $('preflop-spot').value, node = blueprint.stacks[$('stack').value].nodes[key];
  const hand = state.hero.every(c => c !== null) ? handClass(state.hero) : null;
  $('preflop-hand').textContent = hand ? `${hand} · ${blueprint.spots[key].label}` : 'Choose both hole cards';
  $('strategy-bars').replaceChildren();
  if (hand) {
    const strategy = node.strategy[hand];
    let tiny = 0;
    strategy.forEach((frequency, i) => {
      if (frequency < .001) { tiny += frequency; return; }
      const row = document.createElement('div'); row.className = 'strategy-row';
      const label = document.createElement('span'); label.textContent = actionName(node.actions[i], key);
      const track = document.createElement('span'); track.className = 'strategy-track'; const fill = document.createElement('span'); fill.style.width = percent(frequency); fill.style.background = actionColor(node.actions[i]); track.appendChild(fill);
      const number = document.createElement('b'); number.textContent = percent(frequency); row.append(label, track, number); $('strategy-bars').appendChild(row);
    });
    $('preflop-status').textContent = `Published action frequencies for ${hand}.${tiny > .000001 ? ` Actions below 0.1% total ${(tiny * 100).toFixed(2)}% and are omitted from the bars.` : ''}`;
  } else $('preflop-status').textContent = 'Choose two cards to see their published strategy.';
  const matrix = $('range-matrix'); matrix.replaceChildren();
  const descending = [...RANKS].reverse();
  for (let r = 0; r < 13; r++) for (let c = 0; c < 13; c++) {
    const name = r === c ? descending[r].repeat(2) : r < c ? descending[r] + descending[c] + 's' : descending[c] + descending[r] + 'o';
    const probabilities = node.strategy[name]; let fold = 0, passive = 0, raise = 0;
    probabilities.forEach((p, i) => { if (node.actions[i] === 'fold') fold += p; else if (['call', 'check'].includes(node.actions[i])) passive += p; else raise += p; });
    const button = document.createElement('button'); button.type = 'button'; button.textContent = name; button.dataset.hand = name; button.setAttribute('aria-pressed', String(name === hand));
    button.title = `${name}: raise ${percent(raise)}, limp/call/check ${percent(passive)}, fold ${percent(fold)}`; button.setAttribute('aria-label', button.title);
    button.style.background = `linear-gradient(to right, #eab09f 0%, #eab09f ${raise * 100}%, #9cc5e9 ${raise * 100}%, #9cc5e9 ${(raise + passive) * 100}%, #e5ecf3 ${(raise + passive) * 100}%, #e5ecf3 100%)`;
    button.addEventListener('click', () => {
      const dead = $('opponent-mode').value === 'exact' ? state.villain.filter(c => c !== null) : [];
      const combos = parseRange(name, dead);
      if (!combos.length) { error('No suit combinations of this hand remain with the chosen opponent cards.'); return; }
      state.hero = combos[0].cards; invalidate(); render();
    }); matrix.appendChild(button);
  }
}
$('clear-slot').addEventListener('click', () => { const [group, index] = state.active; state[group][index] = null; invalidate(); render(); });
document.querySelectorAll('[data-street]').forEach(button => button.addEventListener('click', () => {
  state.street = button.dataset.street;
  for (let i = counts[state.street]; i < 5; i++) state.board[i] = null;
  state.active = counts[state.street] ? ['board', currentBoard().length < counts[state.street] ? state.board.findIndex(c => c === null) : 0] : ['hero', 0];
  invalidate(); render();
}));
$('opponent-mode').addEventListener('change', () => {
  state.villain = [null, null]; state.active = $('opponent-mode').value === 'exact' ? ['villain', 0] : ['hero', 0]; invalidate(); render();
});
$('opponent-range').addEventListener('input', () => { invalidate(); });
$('calculate').addEventListener('click', calculate);
for (const id of ['pot', 'bet']) $(id).addEventListener('input', () => { updateOdds(); });
$('samples').addEventListener('change', invalidate);
for (const id of ['stack', 'preflop-spot']) $(id).addEventListener('change', renderPreflop);
const examples = {
  aces: { street: 'preflop', hero: ['As', 'Ah'], villain: ['Ks', 'Kh'], board: [], mode: 'exact' },
  draw: { street: 'flop', hero: ['Ah', 'Kh'], villain: [], board: ['Qh', 'Jh', '2c'], mode: 'random' },
  turn: { street: 'turn', hero: ['9s', '8s'], villain: [], board: ['7d', '6c', 'As', '2h'], mode: 'random' },
  river: { street: 'river', hero: ['As', 'Ah'], villain: [], board: ['Ks', 'Qs', '7d', '2h', '3c'], mode: 'range', range: 'TT+,AJs+,KQs,AQo+' },
};
document.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click', () => {
  const example = examples[button.dataset.example];
  invalidate(); state.street = example.street; state.hero = example.hero.map(cardId); state.villain = example.villain.length ? example.villain.map(cardId) : [null, null]; state.board = Array.from({ length: 5 }, (_, i) => example.board[i] ? cardId(example.board[i]) : null); state.active = ['hero', 0];
  $('opponent-mode').value = example.mode; if (example.range) $('opponent-range').value = example.range;
  render(); calculate();
}));
render(); updateOdds(); calculate();
fetch(new URL('../data/preflop.json?v=f9ac317f170f', import.meta.url)).then(response => { if (!response.ok) throw new Error('Data unavailable'); return response.json(); }).then(data => { blueprint = data; renderPreflop(); }).catch(() => { $('preflop-status').textContent = 'The preflop dataset could not load. Reload to retry; equity calculations remain available.'; });
