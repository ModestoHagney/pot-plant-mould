import Module from 'manifold-3d';
import { build, defaults, patterns } from './mold.js';
const wasm = await Module(); wasm.setup();
for (const [n, pattern, extra] of [[2, 'none', { bolts: true }], [3, 'ribs', { lipWidth: 0 }], [6, 'diamonds', { bolts: true, moldWall: 15 }], [4, 'lowpoly', { lipHeight: 0, lipWidth: 0 }], ...Object.keys(patterns).map(k => [4, k])]) {
  const { pot, core, base, wedges } = build(wasm, { ...defaults, wedges: n, pattern, ...extra });
  if (pot.status() !== 'NoError' || pot.genus() !== 1) throw new Error(`bad pot for ${pattern}`);
  const ws = wedges.reduce((a, w) => a + w.volume(), 0);
  // pot + core + shell must exactly fill the bounding cylinder + cap (nothing overlaps, nothing missing)
  const all = wasm.Manifold.union([pot, core, base, ...wedges]);
  const sum = pot.volume() + core.volume() + base.volume() + ws;
  console.log(n, pattern, 'parts', wedges.length, 'genus ok', [core, base, ...wedges].every(m => m.status() === 'NoError'),
    'overlap', (sum - all.volume()).toFixed(1));
  if (Math.abs(sum - all.volume()) > 1) throw new Error('parts overlap');
  if (wedges.some(w => w.isEmpty() || w.decompose().length !== 1)) throw new Error('wedge is empty or in pieces');
  // no bolts = no holes: any genus means a hidden void or tunnel (e.g. a gap at the rib root)
  if (!extra?.bolts && wedges.some(w => w.genus() !== 0)) throw new Error('wedge has a void or tunnel');
}

const big = build(wasm, { ...defaults, bed: 100, bolts: true });
if (!big.warnings.some(w => w.startsWith('Core'))) throw new Error('bed check missed an oversized core');
if (build(wasm, defaults).warnings.length) throw new Error('default pot should fit a 256 mm bed');
console.log('bed check ok');

// patterns: steep ribs must warn; low poly flattens itself until every wedge pulls off, for any seed
const locks = q => build(wasm, { ...defaults, ...q }).warnings.some(w => w.includes('lock'));
if (!locks({ pattern: 'ribs', patternDepth: 10, patternCount: 60 })) throw new Error('missed steep ribs locking the mould');
if (locks({ pattern: 'ribs' })) throw new Error('default ribs should demould');
for (const [wedges, seed, patternDepth, patternCount] of [[2, 1, 10, 24], [3, 7, 10, 60], [4, 42, 6, 12], [8, 99, 10, 60]])
  if (locks({ pattern: 'lowpoly', wedges, seed, patternDepth, patternCount })) throw new Error(`low poly locks: ${wedges} wedges, seed ${seed}`);
const vol = seed => build(wasm, { ...defaults, pattern: 'lowpoly', seed }).pot.volume();
if (vol(5) !== vol(5) || vol(5) === vol(6)) throw new Error('low poly seed should repeat exactly and differ between seeds');
console.log('pattern checks ok');
