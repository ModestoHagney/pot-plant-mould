import Module from 'manifold-3d';
import { build, defaults } from './mold.js';
const wasm = await Module(); wasm.setup();
for (const n of [2, 3, 4, 6]) {
  const { pot, core, base, wedges } = build(wasm, { ...defaults, wedges: n });
  const ws = wedges.reduce((a, w) => a + w.volume(), 0);
  // pot + core + shell must exactly fill the bounding cylinder + cap (nothing overlaps, nothing missing)
  const all = wasm.Manifold.union([pot, core, base, ...wedges]);
  const sum = pot.volume() + core.volume() + base.volume() + ws;
  console.log(n, 'parts', wedges.length, 'genus ok', [core, base, ...wedges].every(m => m.status() === 'NoError'),
    'overlap', (sum - all.volume()).toFixed(1));
  if (Math.abs(sum - all.volume()) > 1) throw new Error('parts overlap');
  if (wedges.some(w => w.isEmpty())) throw new Error('empty wedge');
}
