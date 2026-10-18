// Pure geometry: params (mm) -> Manifold solids. Pot axis is +Z, base at z=0.
// Casting is done upright: wedges stand on the base plate and are clamped shut, the core hangs from its cap
// which sits on the wedges, and concrete is poured through the gaps in the cap above the pot's rim.
export const defaults = {
  height: 120, topDia: 140, bottomDia: 100, wall: 10, base: 12,
  lipHeight: 15, lipWidth: 5, drainDia: 15, moldWall: 4, wedges: 4, segments: 96,
  pattern: 'none', patternDepth: 3, patternCount: 24, patternPitch: 20,
  gap: 0.2, draft: 1, bed: 256, ribs: true, bolts: false, straps: false,
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
  // cavity: wall measured horizontally, so it follows the outer taper; narrowed at the bottom if needed so the
  // core always has at least `draft` degrees of taper to pull out upward
  const rInTop = rt - p.wall, rInBot = Math.min(rAt(p.base) - p.wall, rInTop - (H - p.base) * Math.tan(p.draft * Math.PI / 180));
  if (rInBot <= p.drainDia / 2) throw new Error('Draft angle leaves no room at the bottom of the core');
  const cavityTo = top => rev([[0, p.base], [rInBot, p.base], [rInTop, top], [0, top]]);
  const drain = Manifold.cylinder(p.base + 2, p.drainDia / 2, p.drainDia / 2, p.segments).translate([0, 0, -1]);
  const pot = outer.subtract(cavityTo(H)).subtract(drain);

  const rMax = Math.max(rLip, rt + (p.pattern === 'none' ? 0 : p.patternDepth), rb) + p.moldWall;
  const disk = (r, h, z) => Manifold.cylinder(h, r, r, p.segments).translate([0, 0, z]);

  // core = cavity + drain pin + cap. The cap sits on the wedges; pour gaps over the rim leave 4 spokes.
  const spoke = Math.max(8, p.wall);
  const gaps = disk(rLip, p.moldWall + 2, H - 1).subtract(disk(rInTop, p.moldWall + 4, H - 2))
    .subtract(Manifold.union([0, 90].map(d => Manifold.cube([2 * rMax + 2, spoke, p.moldWall + 6], true).translate([0, 0, H]).rotate([0, 0, d + 45]))));
  const core = cavityTo(H + 0.01).add(Manifold.cylinder(p.base, p.drainDia / 2, p.drainDia / 2, p.segments))
    .add(disk(rMax, p.moldWall, H).subtract(gaps));
  // base plate closes the bottom of the outer mold; the core's drain pin rests on it
  const base = disk(rMax, p.moldWall, -p.moldWall);

  // clamp ribs along each seam, sized to the pot so small pots get small clamps
  const ribD = Math.min(30, Math.max(p.bolts ? 16 : 12, rMax * 0.2)), ribT = Math.max(5, ribD / 2.5), g = p.gap / 2;
  // seam-local frame: x = radial, y = across the seam (positive = into the wedge after the seam), z = up
  const atSeam = (m, a) => m.rotate([0, 0, a * 180 / Math.PI]);
  const across = (r, y0, y1, x, z) => Manifold.cylinder(y1 - y0, r, r, 24).rotate([-90, 0, 0]).translate([x, y0, z]);
  const pinR = Math.min(3, ribT * 0.35), pinL = ribT * 0.6, pinZ = [H / 6, 5 * H / 6], pinX = rMax + ribD * 0.35;
  const boltZ = [H / 6, H / 2, 5 * H / 6], boltX = rMax + ribD * 0.7;
  const strapW = Math.min(25, H / 6), strapZ = [H / 3, 2 * H / 3];

  const shell = Manifold.cylinder(H, rMax, rMax, p.segments).subtract(outer);
  const n = p.wedges, R = rMax * 2 + ribD * 2, wedges = [];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * 2 * Math.PI, a1 = ((i + 1) / n) * 2 * Math.PI, half = (a1 - a0) / 2;
    // sector shrunk by g on each seam: corner sits on the bisector at g / sin(half)
    const c = g / Math.sin(half), pts = [[c * Math.cos(a0 + half), c * Math.sin(a0 + half)]];
    const edge = (a, s) => [R * Math.cos(a) - s * g * Math.sin(a), R * Math.sin(a) + s * g * Math.cos(a)];
    pts.push(edge(a0, 1));
    for (let k = 1; k < 16; k++) { const a = a0 + (a1 - a0) * k / 16; pts.push([R * Math.cos(a), R * Math.sin(a)]); }
    pts.push(edge(a1, -1));
    let w = shell.intersect(new CrossSection([pts]).extrude(H + 2).translate([0, 0, -1]));
    if (p.ribs) {
      const rib = y0 => Manifold.cube([ribD + 1, ribT, H]).translate([rMax - 1, y0, 0]);
      w = w.add(atSeam(rib(g), a0)).add(atSeam(rib(-g - ribT), a1));
      // alignment: pins on the rib at the start of this wedge, sockets in the rib at its end
      for (const z of pinZ) {
        w = w.add(atSeam(across(pinR, -pinL, g + 0.5, pinX, z), a0))
          .subtract(atSeam(across(pinR + p.gap, -g - pinL - p.gap, 1, pinX, z), a1));
      }
      if (p.bolts) for (const z of boltZ) {
        // M5 clearance holes through both ribs
        w = w.subtract(atSeam(across(2.75, -ribT - 1, ribT + 1, boltX, z), a0)).subtract(atSeam(across(2.75, -ribT - 1, ribT + 1, boltX, z), a1));
      }
      if (p.straps) for (const z of strapZ) {
        // notch the ribs so a strap lies flat against the shell
        w = w.subtract(disk(R, strapW, z - strapW / 2).subtract(disk(rMax, strapW + 2, z - strapW / 2 - 1)));
      }
    }
    wedges.push(w);
  }

  // bed check: each part's footprint as printed (wedges turned to face +x, everything standing upright)
  const warnings = [], fits = (name, m) => {
    const { min, max } = m.boundingBox(), w = Math.ceil(max[0] - min[0]), d = Math.ceil(max[1] - min[1]);
    if (Math.max(w, d) > p.bed) warnings.push(`${name} is ${w} × ${d} mm, bigger than your ${p.bed} mm bed`);
  };
  fits('Core', core); fits('Base plate', base);
  fits('Each wedge', wedges[0].rotate([0, 0, -180 / n]));
  if (warnings.length) warnings.push('Try more wedges. Splitting the core and base plate comes later.');
  return { pot, core, base, wedges, rMax, warnings };
}
