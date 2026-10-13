"""Reproduce the bundled subset of the upstream, MIT-licensed solver blueprint."""
from pathlib import Path
import gzip, hashlib, json, urllib.request

COMMIT = 'f78f1b2bc338dd8cbb5226ecb8398bbdb3635676'
BASE = f'https://raw.githubusercontent.com/amaster97/poker_solver/{COMMIT}/'
SPOTS = {
    'sb-first': ('||p|', 'SB / button · first to act'),
    'bb-limp': ('||p|c', 'BB · facing a limp'),
    'bb-open2': ('||p|b200', 'BB · facing a 2 bb open'),
    'bb-open3': ('||p|b300', 'BB · facing a 3 bb open'),
}
root = Path(__file__).resolve().parents[1]
data = {'source': {'repository': 'https://github.com/amaster97/poker_solver', 'commit': COMMIT, 'license': 'MIT', 'retrieved': '2026-10-13', 'method': 'Original 25,000-iteration DCFR preflop blueprint. Heads-up, no ante, no rake. Terminal calls use all-in equity / full equity realization; not a full multi-street equilibrium. Upstream publishes no final exploitability certificate.'}, 'spots': {k: {'key': key, 'label': label} for k, (key, label) in SPOTS.items()}, 'stacks': {}}
for stack in [20, 40, 100]:
    name = f'assets/blueprints/preflop_169class_{stack}bb_anteNone.json.gz'
    raw = urllib.request.urlopen(BASE + name).read()
    original = json.loads(gzip.decompress(raw))
    data['stacks'][str(stack)] = {'upstream_file': name, 'upstream_sha256': hashlib.sha256(raw).hexdigest(), 'config': original['config'], 'convergence': original['convergence'], 'nodes': {k: original['infosets'][key] for k, (key, _) in SPOTS.items()}}
(root / 'assets/data/preflop.json').write_text(json.dumps(data, separators=(',', ':')) + '\n')
(root / 'assets/data/SOLVER-LICENSE.txt').write_bytes(urllib.request.urlopen(BASE + 'LICENSE').read())
print('Wrote sourced, unrounded frequencies for 169 classes × 4 spots × 3 stacks.')
