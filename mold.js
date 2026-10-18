// Pure geometry: params (mm) -> Manifold solids. Pot axis is +Z, base at z=0.
// Casting is done upright: wedges stand on the base plate and are clamped shut, the core hangs from its cap
// which sits on the wedges, and concrete is poured through the gaps in the cap above the pot's rim.
export const defaults = {
  height: 120, topDia: 140, bottomDia: 100, wall: 10, base: 12,
  lipHeight: 15, lipWidth: 5, drainDia: 15, moldWall: 4, wedges: 4, segments: 96,
  pattern: 'none', patternDepth: 3, patternCount: 24, patternPitch: 20,
  gap: 0.2, draft: 1, bed: 256, bolts: false,
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

  // outer wedges: constant wall following the pot's taper (pattern depth included), stepping out for the lip
  // with a 45° chamfer underneath so the wedge prints standing upright
  const pd = p.pattern === 'none' ? 0 : p.patternDepth, bodyO = z => rAt(z) + pd + p.moldWall;
  const rMax = Math.max(rLip + p.moldWall, bodyO(lipZ)), z1 = Math.max(0, lipZ - (rMax - bodyO(lipZ)));
  const prof = [[bodyO(0), 0], [bodyO(z1), z1], [rMax, lipZ], [rMax, H]].filter((q, i, a) => !i || q[1] > a[i - 1][1] + 1e-6);
  const rOut = z => { // shell outer radius at height z
    for (let i = 1; i < prof.length; i++) if (z <= prof[i][1]) {
      const [[x0, za], [x1, zb]] = [prof[i - 1], prof[i]];
      return x0 + (x1 - x0) * (z - za) / (zb - za);
    }
    return prof.at(-1)[0];
  };
  const disk = (r, h, z) => Manifold.cylinder(h, r, r, p.segments).translate([0, 0, z]);

  // core = cavity + drain pin + cap. The cap sits on the wedges; pour gaps over the rim leave 4 spokes.
  const spoke = Math.max(8, p.wall);
  const gaps = disk(rLip, p.moldWall + 2, H - 1).subtract(disk(rInTop, p.moldWall + 4, H - 2))
    .subtract(Manifold.union([0, 90].map(d => Manifold.cube([2 * rMax + 2, spoke, p.moldWall + 6], true).translate([0, 0, H]).rotate([0, 0, d + 45]))));
  const core = cavityTo(H + 0.01).add(Manifold.cylinder(p.base, p.drainDia / 2, p.drainDia / 2, p.segments))
    .add(disk(rMax, p.moldWall, H).subtract(gaps));
  // base plate closes the bottom of the outer mold; the core's drain pin rests on it
  const base = disk(rMax, p.moldWall, -p.moldWall);

  // Seam-local frame: x = out from the shell's outer surface, y = across the seam (positive = into the wedge
  // after the seam), z = up. `follow` extrudes a 2D (x, y) section up the whole wedge and bends it to the shell
  // profile, so ribs, joints and bolt holes all follow the taper.
  const follow = cs => Manifold.union(prof.slice(1).map(([, zb], i) => {
    const za = prof[i][1];
    return cs.extrude(zb - za).translate([0, 0, za]).warp(v => { v[0] += rOut(v[2]); });
  }));
  const atSeam = (m, a) => m.rotate([0, 0, a * 180 / Math.PI]);
  const g = p.gap / 2, c = p.gap;

  // clamp ribs sized to the pot (small pots, small clamps); room for M5 bolts 2 hole widths in from the edge
  const ribD = Math.min(30, Math.max(p.bolts ? 26 : 14, rMax * 0.2)), ribT = Math.max(6, ribD / 2.5);
  const round = Math.min(2, ribT / 3), fillet = Math.min(4, ribT / 2);
  const boltX = ribD - 11, jointX = p.bolts ? (boltX - 2.75) / 2 : ribD * 0.4;
  const jw = Math.min(8, p.bolts ? (boltX - 2.75 - 2) : ribD * 0.5), jh = jw * 0.35 + 2 * g; // tongue width, height
  // rib section for the side y >= g: rounded outer corners, plus a root fillet into the shell
  // the shell curves away from the seam plane, so the rib root reaches `sag` into the wall (the pot is trimmed off after)
  const rSmall = Math.min(...prof.map(q => q[0])), yFar = g + ribT + fillet, sag = rSmall - Math.sqrt(rSmall ** 2 - yFar ** 2) + 1;
  const ribSection = CrossSection.square([ribD + sag - 2 * round, ribT - 2 * round]).translate([-sag + round, g + round]).offset(round, 'Round')
    .add(CrossSection.square([fillet + sag, fillet]).translate([-sag, g + ribT]).subtract(CrossSection.circle(fillet, 32).translate([fillet, g + ribT + fillet])));
  // beveled tongue (45° sides) standing on the y = g face and pointing into the neighbour; groove = tongue + clearance
  const trap = (yBase, yTip, wBase, wTip) => new CrossSection([[[jointX - wBase / 2, yBase], [jointX + wBase / 2, yBase], [jointX + wTip / 2, yTip], [jointX - wTip / 2, yTip]]], 'NonZero');
  const tongue = trap(g + 0.5, g - jh, jw + 1, jw - 2 * jh); // starts 0.5 inside the rib so it fuses
  const groove = trap(-g + 1, g - jh - c, jw - 2 * (2 * g - 1) + 2 * c, jw - 2 * jh); // overshoots the face by 1 so the cut is clean
  const ribA = follow(ribSection), ribB = ribA.mirror([0, 1, 0]);
  const tongueM = follow(tongue), grooveM = follow(groove);
  const bolt = (y0, y1) => Manifold.union([H / 6, H / 2, 5 * H / 6].map(z =>
    Manifold.cylinder(y1 - y0, 2.75, 2.75, 24).rotate([-90, 0, 0]).translate([rOut(z) + boltX, y0, z])));
  const bolts = bolt(-g - ribT - 1, g + ribT + 1);

  const shell = new CrossSection([[[0, 0], ...prof, [0, H]]]).revolve(p.segments).subtract(outer);
  const n = p.wedges, R = (rMax + ribD) * 2, wedges = [];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * 2 * Math.PI, a1 = ((i + 1) / n) * 2 * Math.PI, half = (a1 - a0) / 2;
    // sector shrunk by g on each seam: corner sits on the bisector at g / sin(half)
    const k = g / Math.sin(half), pts = [[k * Math.cos(a0 + half), k * Math.sin(a0 + half)]];
    const edge = (a, s) => [R * Math.cos(a) - s * g * Math.sin(a), R * Math.sin(a) + s * g * Math.cos(a)];
    pts.push(edge(a0, 1));
    for (let q = 1; q < 16; q++) { const a = a0 + (a1 - a0) * q / 16; pts.push([R * Math.cos(a), R * Math.sin(a)]); }
    pts.push(edge(a1, -1));
    let w = shell.intersect(new CrossSection([pts]).extrude(H + 2).translate([0, 0, -1]));
    // rib + tongue on the seam at a0, rib + groove on the seam at a1 (the next wedge's tongue lands in it)
    w = w.add(atSeam(ribA.add(tongueM), a0)).add(atSeam(ribB, a1)).subtract(atSeam(grooveM, a1));
    if (p.bolts) w = w.subtract(atSeam(bolts, a0)).subtract(atSeam(bolts, a1));
    wedges.push(w.subtract(outer));
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
