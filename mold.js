// Pure geometry: params (mm) -> Manifold solids. Pot axis is +Z, base at z=0.
// Casting is done upright: wedges are screwed down to a board through their bottom flange and clamped shut, the
// board forms the pot's underside, the core hangs from its cap
// which sits on the wedges, and concrete is poured through the gaps in the cap above the pot's rim.
export const defaults = {
  height: 120, topDia: 140, bottomDia: 100, wall: 10, base: 12,
  lipHeight: 0, lipWidth: 0, drainDia: 15, moldWall: 4, wedges: 4, segments: 96,
  pattern: 'none', patternDepth: 3, patternCount: 24, patternPitch: 20, seed: 1,
  gap: 0.2, draft: 1, bed: 256, bolts: false,
};

// Outer-face patterns: (params, top of the patterned band, smallest pot radius) -> (angle, height) -> 0..1,
// scaled by patternDepth and pushed outward only, so the wall never gets thinner than `wall`.
const fract = x => x - Math.floor(x);
export const patterns = {
  none: () => () => 0,
  ribs: p => a => (1 + Math.cos(p.patternCount * a)) / 2,
  bands: p => (a, z) => (1 + Math.cos(2 * Math.PI * z / p.patternPitch)) / 2,
  waves: p => (a, z) => (1 + Math.cos(p.patternCount * a + 2 * Math.sin(2 * Math.PI * z / p.patternPitch))) / 2,
  diamonds: p => (a, z) => 1 - Math.abs(fract(p.patternCount * a / (2 * Math.PI)) - 0.5) - Math.abs(fract(z / p.patternPitch) - 0.5),
  lowpoly: lowPoly,
};

// seeded random numbers (mulberry32): the same seed always gives the same pot, so preview and export match
const rng = s => () => {
  s = s + 0x6D2B79F5 | 0;
  let t = Math.imul(s ^ s >>> 15, 1 | s);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

// Can a wedge pull straight out along its middle line off a surface leaning `k` (= dr/dθ / r) at angle `a`?
// The surface normal must face the pull by at least the draft (or half as much as the smooth pot does, right at a
// 2-wedge seam where even a plain pot has no draft).
const pullsOff = (a, k, n, m) => {
  const w = 2 * Math.PI / n, d = a - (Math.floor(a / w) + 0.5) * w, c = Math.cos(d);
  return c + k * Math.sin(d) >= Math.min(m, c / 2);
};

// Low poly: a jittered grid of points over the side (angle × height), each at a random height, split into
// triangles with random diagonals. A column of points sits on every wedge seam so no facet spans two wedges,
// then facets that a wedge can't pull off are flattened until it can.
function lowPoly(p, lipZ, r0) {
  const rand = rng(p.seed), n = p.wedges, per = Math.max(1, Math.round(p.patternCount / n)), nc = per * n;
  const nr = Math.max(1, Math.round(lipZ / p.patternPitch)), da = 2 * Math.PI / nc, dz = lipZ / nr, J = 0.4;
  const id = (i, j) => (i % nc) * (nr + 1) + j, A = [], Z = [], h = [];
  for (let i = 0; i < nc; i++) for (let j = 0; j <= nr; j++) {
    A.push((i + (i % per ? (rand() - 0.5) * 2 * J : 0)) * da); // seam columns stay put
    Z.push((j + (j % nr ? (rand() - 0.5) * 2 * J : 0)) * dz); // top and bottom rows stay put
    h.push(rand());
  }
  // triangle = 3 corners [point index, angle, height]; the last column wraps back to the first at +2π
  const corner = (i, j) => [id(i, j), A[id(i, j)] + (i >= nc ? 2 * Math.PI : 0), Z[id(i, j)]];
  const area = (u, v, w) => (v[1] - u[1]) * (w[2] - u[2]) - (w[1] - u[1]) * (v[2] - u[2]);
  const cells = [];
  for (let i = 0; i < nc; i++) for (let j = 0; j < nr; j++) {
    const [a, b, c, d] = [corner(i, j), corner(i + 1, j), corner(i + 1, j + 1), corner(i, j + 1)];
    let t = [[a, b, c], [a, c, d]], u = [[a, b, d], [b, c, d]];
    if (rand() < 0.5) [t, u] = [u, t];
    // jitter < 0.5 keeps the quad simple, so if one diagonal folds a triangle over, the other doesn't
    cells.push(t.every(q => area(...q) > 1e-9) ? t : u);
  }
  const m = Math.sin(p.draft * Math.PI / 180);
  const ok = ([u, v, w]) => {
    const det = area(u, v, w), [hu, hv, hw] = [h[u[0]], h[v[0]], h[w[0]]];
    const k = p.patternDepth * ((hv - hu) * (w[2] - u[2]) - (hw - hu) * (v[2] - u[2])) / det / r0;
    const mid = (u[1] + v[1] + w[1]) / 3, side = 2 * Math.PI / n, seam = Math.floor(mid / side) * side;
    // check at the corners, clamped into this facet's wedge (the corner on the seam counts as this wedge's)
    return [u, v, w].every(q => pullsOff(Math.min(seam + side - 1e-9, Math.max(seam, q[1])), k, n, m));
  };
  const tris = cells.flat();
  for (let pass = 0; pass < 200; pass++) {
    const bad = tris.filter(t => !ok(t));
    if (!bad.length) break;
    for (const t of bad) {
      const mean = t.reduce((s, q) => s + h[q[0]], 0) / 3;
      for (const q of t) h[q[0]] = mean + (h[q[0]] - mean) * 0.8;
    }
  }
  return (a, z) => {
    a = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const ci = Math.floor(a / da), cj = Math.min(nr - 1, Math.max(0, Math.floor(z / dz)));
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      const i = ci + di, j = cj + dj, wi = (i + nc) % nc;
      if (j < 0 || j >= nr) continue;
      const q = [0, a + (wi - i) * da, z]; // query in the cell's own angle range when it wraps
      for (const [u, v, w] of cells[wi * nr + j]) {
        const s = area(u, v, w), b1 = area(q, v, w) / s, b2 = area(u, q, w) / s, b3 = 1 - b1 - b2;
        if (b1 > -1e-7 && b2 > -1e-7 && b3 > -1e-7) return b1 * h[u[0]] + b2 * h[v[0]] + b3 * h[w[0]];
      }
    }
    return 0; // ponytail: unreachable for points on the side; a gap here would show as a dent
  };
}

// Manifold objects live in WASM memory, which JS never garbage collects: every rebuild leaked ~175 MB until the
// tab crashed. trackMemory wraps every call that makes a new Manifold or CrossSection; the returned free() deletes
// everything made since the last free(). (ponytail: `new CrossSection` isn't tracked; those are small.)
export function trackMemory(wasm) {
  const made = [], track = r => { if (Array.isArray(r)) r.forEach(track); else if (typeof r?.delete === 'function') made.push(r); };
  const probes = [wasm.Manifold.cube([1, 1, 1]), wasm.CrossSection.square([1, 1])];
  for (const o of [wasm.Manifold, wasm.CrossSection, ...probes.map(Object.getPrototypeOf)]) for (const k of Object.getOwnPropertyNames(o)) {
    const f = Object.getOwnPropertyDescriptor(o, k).value;
    if (typeof f !== 'function' || k === 'delete' || k === 'constructor') continue;
    o[k] = function (...a) { const r = f.apply(this, a); track(r); return r; };
  }
  probes.forEach(m => m.delete());
  return () => { for (const m of made.splice(0)) if (!m.isDeleted()) m.delete(); };
}

// `show` = the parts that will be used. Manifold only computes a part when its mesh is read, so the bed check
// skips hidden parts to keep them uncomputed.
export function build(wasm, p, show = { core: true, wedges: true }) {
  const { Manifold, CrossSection } = wasm;
  const rt = p.topDia / 2, rb = p.bottomDia / 2, H = p.height;
  const lipZ = H - p.lipHeight, rLip = rt + p.lipWidth;
  if (p.wall * 2 >= p.bottomDia || p.base >= H || p.lipHeight >= H) throw new Error('Wall, base or lip too big for this pot');
  if (p.drainDia / 2 >= rb - p.wall) throw new Error('Drain hole wider than the pot floor');
  if (p.wedges < 2) throw new Error('Need at least 2 wedges');

  const rev = pts => new CrossSection([pts]).revolve(p.segments);
  // radius of the pot's outer wall at height z (below the lip)
  const rAt = z => rb + (rt - rb) * z / H;

  if (!patterns[p.pattern]) throw new Error(`Unknown pattern ${p.pattern}`);
  let outer;
  const warnings = [];
  if (p.pattern === 'none' || !p.patternDepth) {
    outer = rev([[0, 0], [rb, 0], [rAt(lipZ), lipZ], [rLip, lipZ], [rLip, H], [0, H]]);
  } else {
    const fn = patterns[p.pattern](p, lipZ, Math.min(rb, rAt(lipZ)));
    // with a lip, the pattern fades out over the last few mm so it meets the lip's underside; without one it runs
    // right to the rim and the base
    const lip = p.lipHeight > 0, fade = Math.min(4, lipZ / 4), ramp = t => Math.min(1, Math.max(0, t / fade));
    const dAt = (a, z) => p.patternDepth * fn(a, z) * (lip ? ramp(lipZ - z) : 1);
    // dense side profile + enough segments to resolve the pattern, then push side vertices outward
    const dz = Math.min(1, p.patternPitch / 12), side = [];
    for (let z = 0; z < lipZ; z += dz) side.push([rAt(z), z]);
    const segs = Math.min(720, Math.max(p.segments, p.patternCount * 12));
    const top = lip ? [[rAt(lipZ), lipZ], [rLip, lipZ], [rLip, H], [0, H]] : [[rt, H], [0, H]];
    outer = new CrossSection([[[0, 0], ...side, ...top]]).revolve(segs).warp(v => {
      const r = Math.hypot(v[0], v[1]), z = v[2];
      if ((lip && z >= lipZ) || Math.abs(r - rAt(z)) > 1e-3) return; // only the body's outer face
      const d = dAt(Math.atan2(v[1], v[0]), z);
      v[0] *= (r + d) / r; v[1] *= (r + d) / r;
    });
    // demold check: sample the side and make sure every wedge can pull straight off its part of the pattern
    const m = Math.sin(p.draft * Math.PI / 180), e = 1e-4;
    let locks = false;
    for (let i = 0; i < segs && !locks; i++) for (let z = lipZ / 80; z < lipZ && !locks; z += lipZ / 40) {
      const a = (i + 0.5) / segs * 2 * Math.PI;
      locks = !pullsOff(a, (dAt(a + e, z) - dAt(a - e, z)) / (2 * e) / (rAt(z) + dAt(a, z)), p.wedges, m);
    }
    if (locks) warnings.push('The pattern leans too steeply near a seam and may lock the wedges on. Lower depth or count, or add wedges');
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
  // The shell's outer surface curves away from the seam plane: in this frame it is a circle of radius rS centred
  // at (-rS, 0). The root fillet is tangent to both the rib's side (y = y0) and that circle, so it blends in.
  // ponytail: one radius (the smallest) for the whole height; on wider parts the fillet foot sits a hair inside the wall
  const rS = Math.min(...prof.map(q => q[0])), y0 = g + ribT;
  const fx = Math.sqrt((rS + fillet) ** 2 - (y0 + fillet) ** 2) - rS, fy = y0 + fillet; // fillet centre
  const foot = [-rS + rS * (fx + rS) / (rS + fillet), rS * fy / (rS + fillet)]; // tangent point on the wall
  const sag = rS - Math.sqrt(rS ** 2 - y0 ** 2) + 1; // rib root reaches this far into the wall (the pot is trimmed after)
  const ribSection = CrossSection.square([ribD + sag - 2 * round, ribT - 2 * round]).translate([-sag + round, g + round]).offset(round, 'Round')
    .add(CrossSection.square([ribD / 2 + sag, ribT]).translate([-sag, g])) // square root end, only the outer corners are rounded
    .add(new CrossSection([[[-sag, y0], [fx, y0], [fx, fy], foot, [foot[0] - p.moldWall, foot[1]], [-sag - p.moldWall, y0]]], 'NonZero')
      .subtract(CrossSection.circle(fillet, 48).translate([fx, fy])));
  // beveled tongue (45° sides) standing on the y = g face and pointing into the neighbour; groove = tongue + clearance
  const trap = (yBase, yTip, wBase, wTip) => new CrossSection([[[jointX - wBase / 2, yBase], [jointX + wBase / 2, yBase], [jointX + wTip / 2, yTip], [jointX - wTip / 2, yTip]]], 'NonZero');
  const tongue = trap(g + 0.5, g - jh, jw + 1, jw - 2 * jh); // starts 0.5 inside the rib so it fuses
  const groove = trap(-g + 1, g - jh - c, jw - 2 * (2 * g - 1) + 2 * c, jw - 2 * jh); // overshoots the face by 1 so the cut is clean
  const ribA = follow(ribSection), ribB = ribA.mirror([0, 1, 0]);
  const tongueM = follow(tongue), grooveM = follow(groove);
  const bolt = (y0, y1) => Manifold.union([H / 6, H / 2, 5 * H / 6].map(z =>
    Manifold.cylinder(y1 - y0, 2.75, 2.75, 24).rotate([-90, 0, 0]).translate([rOut(z) + boltX, y0, z])));
  const bolts = bolt(-g - ribT - 1, g + ribT + 1);

  // screw flange round the bottom: the wedges screw down to a board (ply, melamine), which closes the bottom.
  // It reaches out as far as the seam ribs, with a 45° chamfer where it meets the wall so it prints upright.
  // ponytail: fixed for ~4 mm wood screws; make it a setting if people use other screws
  const fT = 5, fCh = 3, screwR = 2.25, screwTilt = 15, rF = bodyO(0) + ribD;
  const flange = rev([[bodyO(0) - 1, 0], [rF, 0], [rF, fT], [bodyO(fT) + fCh, fT], [bodyO(fT + fCh), fT + fCh], [bodyO(fT + fCh) - 1, fT + fCh]]);
  const shell = new CrossSection([[[0, 0], ...prof, [0, H]]]).revolve(p.segments).add(flange).subtract(outer);
  const rScrew = bodyO(0) + (fCh + ribD) / 2, screws = Math.ceil(rScrew * 2 * Math.PI / p.wedges / 80); // per wedge, ≤ 80 mm apart
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
    // screw holes spread evenly along the flange, clear of the seam ribs, tilted outward so the driver clears the wall
    for (let j = 0; j < screws; j++) {
      const a = (a0 + (a1 - a0) * (j + 0.5) / screws) * 180 / Math.PI;
      w = w.subtract(Manifold.cylinder(fT + 4, screwR, screwR, 24, true).rotate([0, screwTilt, 0]).translate([rScrew, 0, fT / 2]).rotate([0, 0, a]));
    }
    wedges.push(w.subtract(outer));
  }

  // bed check: each part's footprint as printed (wedges turned to face +x, everything standing upright)
  const before = warnings.length, fits = (name, m) => {
    const { min, max } = m.boundingBox(), w = Math.ceil(max[0] - min[0]), d = Math.ceil(max[1] - min[1]);
    if (Math.max(w, d) > p.bed) warnings.push(`${name} is ${w} × ${d} mm, bigger than your ${p.bed} mm bed`);
  };
  if (show.core) fits('Core', core);
  if (show.wedges) fits('Each wedge', wedges[0].rotate([0, 0, -180 / n]));
  if (warnings.length > before) warnings.push('Try more wedges. Splitting the core comes later.');
  return { pot, core, wedges, screws, rMax, warnings };
}
