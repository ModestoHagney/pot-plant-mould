import Module from 'manifold-3d';
import { build, defaults, patterns } from './mold.js';
const wasm = await Module(); wasm.setup();
for (const [n, pattern, extra] of [[2, 'none', { bolts: true }], [3, 'ribs', { lipWidth: 0 }], [6, 'diamonds', { bolts: true, moldWall: 15 }], ...Object.keys(patterns).map(k => [4, k])]) {
  const { pot, core, wedges, screws } = build(wasm, { ...defaults, wedges: n, pattern, ...extra });
  if (pot.status() !== 'NoError' || pot.genus() !== 1) throw new Error(`bad pot for ${pattern}`);
  const ws = wedges.reduce((a, w) => a + w.volume(), 0);
  // pot + core + shell must exactly fill the bounding cylinder + cap (nothing overlaps, nothing missing)
  const all = wasm.Manifold.union([pot, core, ...wedges]);
  const sum = pot.volume() + core.volume() + ws;
  console.log(n, pattern, 'parts', wedges.length, 'genus ok', [core, ...wedges].every(m => m.status() === 'NoError'),
    'overlap', (sum - all.volume()).toFixed(1));
  if (Math.abs(sum - all.volume()) > 1) throw new Error('parts overlap');
  if (wedges.some(w => w.isEmpty() || w.decompose().length !== 1)) throw new Error('wedge is empty or in pieces');
  // no bolts = only the screw holes: any other genus means a hidden void or tunnel (e.g. a gap at the rib root)
  if (!extra?.bolts && wedges.some(w => w.genus() !== screws)) throw new Error('wedge has a void or tunnel');
}

const big = build(wasm, { ...defaults, bed: 100, bolts: true });
if (!big.warnings.some(w => w.startsWith('Core'))) throw new Error('bed check missed an oversized core');
if (build(wasm, defaults).warnings.length) throw new Error('default pot should fit a 256 mm bed');
console.log('bed check ok');
