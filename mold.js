// Pure geometry: params (mm) -> Manifold solids. Pot axis is +Z, base at z=0.
// Casting is done upright: wedges stand on the base plate, pour the concrete in, then push the core down
// until its cap sits on the wedges. Vent holes in the cap let excess concrete and air escape.
export const defaults = {
  height: 120, topDia: 140, bottomDia: 100, wall: 10, base: 12,
  lipHeight: 15, lipWidth: 5, drainDia: 15, moldWall: 4, wedges: 4, segments: 96,
  pattern: 'none', patternDepth: 3, patternCount: 24, patternPitch: 20,
};

// Outer-face patterns: (angle, height, params) -> 0..1, scaled by patternDepth and pushed outward only,
// so the wall never gets thinner than `wall`.
const fract = x => x - Math.floor(x);
export const patterns = {
  none: () => 0,
  ribs: (a, z, p) => (1 + Math.cos(p.patternCount * a)) / 2,
  bands: (a, z, p) => (1 + Math.cos(2 * Math.PI * z / p.patternPitch)) / 2,
  waves: (a, z, p) => (1 + Math.cos(p.patternCount * a + 2 * Math.sin(2 * Math.PI * z / p.patternPitch))) / 2,
  diamonds: (a, z, p) => 1 - Math.abs(fract(p.patternCount * a / (2 * Math.PI)) - 0.5) - Math.abs(fract(z / p.patternPitch) - 0.5),
};

export function build(wasm, p) {
  const { Manifold, CrossSection } = wasm;
  const rt = p.topDia / 2, rb = p.bottomDia / 2, H = p.height;
  const lipZ = H - p.lipHeight, rLip = rt + p.lipWidth;
  if (p.wall * 2 >= p.bottomDia || p.base >= H || p.lipHeight >= H) throw new Error('Wall, base or lip too big for this pot');
  if (p.drainDia / 2 >= rb - p.wall) throw new Error('Drain hole wider than the pot floor');
  if (p.wedges < 2) throw new Error('Need at least 2 wedges');

  const rev = pts => new CrossSection([pts]).revolve(p.segments);
  // radius of the pot's outer wall at height z (below the lip)
  const rAt = z => rb + (rt - rb) * z / H;

  const fn = patterns[p.pattern];
  if (!fn) throw new Error(`Unknown pattern ${p.pattern}`);
  let outer;
  if (p.pattern === 'none' || !p.patternDepth) {
    outer = rev([[0, 0], [rb, 0], [rAt(lipZ), lipZ], [rLip, lipZ], [rLip, H], [0, H]]);
  } else {
    // dense side profile + enough segments to resolve the pattern, then push side vertices outward
    const dz = Math.min(1, p.patternPitch / 12), side = [];
    for (let z = 0; z < lipZ; z += dz) side.push([rAt(z), z]);
    const segs = Math.min(720, Math.max(p.segments, p.patternCount * 12));
    const fade = Math.min(4, lipZ / 4), ramp = t => Math.min(1, Math.max(0, t / fade));
    outer = new CrossSection([[[0, 0], ...side, [rAt(lipZ), lipZ], [rLip, lipZ], [rLip, H], [0, H]]]).revolve(segs).warp(v => {
      const r = Math.hypot(v[0], v[1]), z = v[2];
      if (z >= lipZ || Math.abs(r - rAt(z)) > 1e-3) return; // only the body's outer face
      const d = p.patternDepth * fn(Math.atan2(v[1], v[0]), z, p) * ramp(z) * ramp(lipZ - z);
      v[0] *= (r + d) / r; v[1] *= (r + d) / r;
    });
  }
  // cavity: wall measured horizontally, so it follows the outer taper
  const cavity = rev([[0, p.base], [rAt(p.base) - p.wall, p.base], [rt - p.wall, H], [0, H]]);
  const drain = Manifold.cylinder(p.base + 2, p.drainDia / 2, p.drainDia / 2, p.segments).translate([0, 0, -1]);
  const pot = outer.subtract(cavity).subtract(drain);

  const rMax = Math.max(rLip, rt + (p.pattern === 'none' ? 0 : p.patternDepth), rb) + p.moldWall;
  // core = cavity + drain pin + cap that covers the rim and seats the outer mold
  const vents = Array.from({ length: 6 }, (_, i) => {
    const a = i / 6 * 2 * Math.PI, r = rt - p.wall / 2;
    return Manifold.cylinder(p.moldWall + 2, p.wall / 4, p.wall / 4, 24).translate([r * Math.cos(a), r * Math.sin(a), H - 1]);
  });
  const cap = Manifold.cylinder(p.moldWall, rMax, rMax, p.segments).translate([0, 0, H]).subtract(Manifold.union(vents));
  const pin = Manifold.cylinder(p.base, p.drainDia / 2, p.drainDia / 2, p.segments);
  const cavityToTop = rev([[0, p.base], [rAt(p.base) - p.wall, p.base], [rt - p.wall, H + 0.01], [0, H + 0.01]]);
  const core = cavityToTop.add(pin).add(cap);
  // base plate closes the bottom of the outer mold; the core's drain pin rests on it
  const base = Manifold.cylinder(p.moldWall, rMax, rMax, p.segments).translate([0, 0, -p.moldWall]);

  // outer shell: tube hugging the pot outside, open at the pot base (pour side)
  const shell = Manifold.cylinder(H, rMax, rMax, p.segments).subtract(outer);
  const n = p.wedges, R = rMax * 2, wedges = [];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * 2 * Math.PI, a1 = ((i + 1) / n) * 2 * Math.PI, pts = [[0, 0]];
    for (let k = 0; k <= 16; k++) { const a = a0 + (a1 - a0) * k / 16; pts.push([R * Math.cos(a), R * Math.sin(a)]); }
    const sector = new CrossSection([pts]).extrude(H + 2).translate([0, 0, -1]);
    wedges.push(shell.intersect(sector));
  }
  return { pot, core, base, wedges, rMax };
}
