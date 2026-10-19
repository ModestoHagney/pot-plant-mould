import Module from 'manifold-3d';
import { build, defaults, patterns, screwHoles, testPrint, trackMemory } from './mold.js';
const wasm = await Module(); wasm.setup();
const free = trackMemory(wasm); // freed before each build, as the app does
for (const [n, pattern, extra] of [[2, 'none', { bolts: true }], [4, 'none', { drainDia: 0 }], [3, 'ribs', { lipWidth: 0 }], [6, 'diamonds', { bolts: true, moldWall: 15 }], [4, 'lowpoly', { lipHeight: 0, lipWidth: 0 }], [4, 'none', { screw: 2, pilotAdjust: -0.6 }], [4, 'none', { screw: 5, pilotAdjust: 0.6, moldWall: 8 }], ...Object.keys(patterns).map(k => [4, k])]) {
  free();
  const { pot, core, pin, spider, wedges, screws } = build(wasm, { ...defaults, wedges: n, pattern, ...extra });
  if (pot.status() !== 'NoError' || pot.genus() !== (extra?.drainDia === 0 ? 0 : 1)) throw new Error(`bad pot for ${pattern}`);
  const solids = [pot, core, spider, ...wedges, ...(pin ? [pin] : [])];
  // every part sum must equal their union (nothing overlaps)
  const all = wasm.Manifold.union(solids);
  const sum = solids.reduce((a, m) => a + m.volume(), 0);
  console.log(n, pattern, 'parts', solids.length, 'status ok', solids.every(m => m.status() === 'NoError'),
    'overlap', (sum - all.volume()).toFixed(1));
  if (Math.abs(sum - all.volume()) > 1) throw new Error('parts overlap');
  if (wedges.some(w => w.isEmpty() || w.decompose().length !== 1)) throw new Error('wedge is empty or in pieces');
  // disc: only its top screw hole goes through; wall pieces: only the foot screw holes (at least 2, one by each join)
  // core and pin: only the drain screw hole goes through
  const hole = extra?.drainDia !== 0 ? 1 : 0;
  if (core.decompose().length !== 1 || core.genus() !== hole || !pin !== !hole || (pin && pin.genus() !== 1)) throw new Error('core or pin is in bits, has a void or is missing');
  if (spider.decompose().length !== 1 || spider.genus() !== 2 * n + 1) throw new Error('spider is in bits or missing screw holes');
  // no bolts = only the screw holes: any other genus means a hidden void or tunnel (e.g. a gap at the rib root)
  if (!extra?.bolts && wedges.some(w => w.genus() !== screws)) throw new Error('wedge has a void or tunnel');
}

const big = build(wasm, { ...defaults, bed: 100, bolts: true });
if (!big.warnings.some(w => w.startsWith('Spider'))) throw new Error('bed check missed an oversized spider');
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

// inside sizing: the hole comes out at the sizes asked for, and the pot grows by the wall and base
{
  const q = { ...defaults, sizeBy: 'inside', height: 100, topDia: 120, bottomDia: 90, draft: 0 };
  const { pot } = build(wasm, q), b = pot.boundingBox();
  const hole = z => Math.min(...pot.slice(z).toPolygons().map(c => Math.max(...c.map(([x, y]) => Math.hypot(x, y)))));
  const near = (a, x) => Math.abs(a - x) < 0.3;
  if (!near(b.max[2], 100 + q.base) || !near(b.max[0] * 2, 120 + 2 * q.wall) || !near(hole(b.max[2] - 0.01) * 2, 120)
    || !near(hole(q.base + 0.01) * 2, 90)) throw new Error('inside sizing is off');
  console.log('inside sizing ok');
}

// screws: defaults keep the old 4 mm holes; the test bar is one solid with all 7 holes, and holes follow the setting
{
  const h = screwHoles(defaults);
  if (h.pilotR !== 1.6 || h.clearR !== 2.25 || h.headR !== 4) throw new Error('default screw holes changed');
  for (const q of [defaults, { ...defaults, screw: 6, pilotAdjust: -0.3 }]) {
    const bar = testPrint(wasm, q);
    if (bar.status() !== 'NoError' || bar.decompose().length !== 1 || bar.genus() !== 7) throw new Error('test bar is broken');
  }
  if (testPrint(wasm, { ...defaults, pilotAdjust: 0.4 }).volume() >= testPrint(wasm, defaults).volume()) throw new Error('pilot adjust does not widen holes');
  const disc = s => build(wasm, { ...defaults, screw: s }).core.volume();
  if (disc(6) >= disc(4)) throw new Error('bigger screws should cut bigger holes');
  console.log('screw checks ok');
}
