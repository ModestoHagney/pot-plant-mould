// Pure geometry: params (mm) -> Manifold solids. Pot axis is +Z, base at z=0.
// Casting is done upright: wedges are screwed down to a board through their bottom flange and clamped shut, the
// board forms the pot's underside. The one-piece core is screwed down through its drain pin, a spider across its rim
// screws into the wedge seam ribs, and concrete is poured between the spider's spokes.
export const defaults = {
  height: 120, topDia: 140, bottomDia: 100, wall: 10, base: 12,
  lipHeight: 0, lipWidth: 0, drainDia: 15, moldWall: 4, wedges: 4, segments: 96,
  pattern: 'none', patternDepth: 3, patternCount: 24, patternPitch: 20, seed: 1,
  gap: 0.2, draft: 5, bed: 256, bolts: false, sizeBy: 'outside', screw: 4, pilotAdjust: 0, headDia: 8, csAngle: 90, patternFade: 4,
  // pot edges: size cut back along each face (0 = sharp)
  edgeStyle: 'fillet', edgeTopOut: 0, edgeTopIn: 0, edgeBotOut: 0, edgeBotIn: 0,
  coreWall: 4, coreFloor: 6, spiderThick: 4, spiderRing: 4, spiderLip: 10, spiderLipThick: 3, spiderRound: 1, spokeFillet: 3,
  spiderScrewDepth: 16,
  // rib depth and thickness 0 = sized to the pot
  ribDepth: 0, ribThick: 0, ribRound: 2, ribFillet: 3, flangeThick: 4, screwTilt: 15, screwSpacing: 80, boltSize: 5, boltCount: 3,
};

// The corner c of a profile, cut back s along each of its edges (unit directions u1, u2): a straight chamfer or a
// tangent arc, as points from the u1 side to the u2 side.
const corner = (c, u1, u2, s, fillet) => {
  if (s <= 0) return [c];
  const at = (u, d) => [c[0] + u[0] * d, c[1] + u[1] * d], p1 = at(u1, s), p2 = at(u2, s);
  if (!fillet) return [p1, p2];
  const th = Math.acos(u1[0] * u2[0] + u1[1] * u2[1]), b = [u1[0] + u2[0], u1[1] + u2[1]], bl = Math.hypot(...b);
  const o = at([b[0] / bl, b[1] / bl], s / Math.cos(th / 2)), r = Math.hypot(p1[0] - o[0], p1[1] - o[1]);
  const a1 = Math.atan2(p1[1] - o[1], p1[0] - o[0]);
  let da = Math.atan2(p2[1] - o[1], p2[0] - o[0]) - a1;
  da -= 2 * Math.PI * Math.round(da / (2 * Math.PI)); // the short way round
  return Array.from({ length: 13 }, (_, i) => [o[0] + r * Math.cos(a1 + da * i / 12), o[1] + r * Math.sin(a1 + da * i / 12)]);
};
const unit = (a, b) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };

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
  hex,
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

// Hexagons: raised flat-topped tiles with V grooves between them, in columns that alternate half a tile up and down.
// Every wedge seam runs down the middle of a column, through the tiles' flat tops, so no groove sits on a seam.
// Tiles are sized from the column width at the smallest radius and stay regular, stretched slightly so whole rows fit.
function hex(p, lipZ, r0) {
  let nc = Math.max(1, Math.round(p.patternCount / p.wedges)) * p.wedges;
  if (nc % 2) nc += p.wedges; // an even count, so the alternating columns meet up all the way round
  const s3 = Math.sqrt(3), side = 2 * Math.PI * r0 / nc / 1.5, nr = Math.max(1, Math.round(lipZ / (side * s3)));
  // groove width (share of the tile's half-width): half by default, wider until the slanted sides are gentle enough
  // for a wedge to pull off them right by its seam (pullsOff's limit, with a margin), up to a full pyramid
  const h = Math.PI / p.wedges, c = Math.cos(h), kMax = 0.9 * (c - Math.min(Math.sin(p.draft * Math.PI / 180), c / 2)) / Math.sin(h);
  const g = Math.min(1, Math.max(0.5, p.patternDepth / (kMax * side)));
  return (a, z) => {
    const x = fract(a / (2 * Math.PI)) * nc, y = z * nr / lipZ; // in columns and rows
    let d = Infinity;
    for (const i of [Math.floor(x), Math.floor(x) + 1]) {
      const o = i & 1 ? 0.5 : 0, dx = (x - i) * 1.5, dy = (y - o - Math.round(y - o)) * s3; // to the centre, in hex sides
      d = Math.min(d, Math.max(Math.abs(dy), Math.abs(dx * s3 + dy) / 2, Math.abs(dx * s3 - dy) / 2) * 2 / s3);
    }
    return Math.min(1, (1 - d) / g);
  };
}

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
  // sizes can describe the hole instead (e.g. to fit a plastic pot inside): turn them into outside sizes.
  // The hole's bottom diameter is measured at the top of the base, where the cavity starts.
  if (p.sizeBy === 'inside') {
    const H = p.height + p.base, rt = p.topDia / 2 + p.wall, f = p.base / H;
    p = { ...p, height: H, topDia: 2 * rt, bottomDia: 2 * (p.bottomDia / 2 + p.wall - rt * f) / (1 - f), holeBot: p.bottomDia / 2 };
  }
  const rt = p.topDia / 2, rb = p.bottomDia / 2, H = p.height;
  const lipZ = H - p.lipHeight, rLip = rt + p.lipWidth;
  if (p.wall * 2 >= p.bottomDia || p.base >= H || p.lipHeight >= H) throw new Error('Wall, base or lip too big for this pot');
  if (p.drainDia / 2 >= rb - p.wall) throw new Error('Drain hole wider than the pot floor');
  if (p.wedges < 2) throw new Error('Need at least 2 wedges');

  const rev = pts => new CrossSection([pts]).revolve(p.segments);
  // radius of the pot's outer wall at height z (below the lip)
  const rAt = z => rb + (rt - rb) * z / H;

  if (!patterns[p.pattern]) throw new Error(`Unknown pattern ${p.pattern}`);
  // cavity: wall measured horizontally, so it follows the outer taper; narrowed at the bottom if needed so the
  // core always has at least `draft` degrees of taper to pull out upward
  const rInTop = rt - p.wall, rInBot = Math.min(rAt(p.base) - p.wall, rInTop - (H - p.base) * Math.tan(p.draft * Math.PI / 180));
  const warnings = [];
  if (rInBot <= p.drainDia / 2) throw new Error('Draft angle leaves no room at the bottom of the core');
  if (p.holeBot && rInBot < p.holeBot - 0.05)
    warnings.push(`Core draft narrows the bottom of the hole to ${(2 * rInBot).toFixed(1)} mm. Lower the draft or widen the top`);

  // pot edges, drawn into the outer and cavity profiles; each is capped to leave the face it sits on
  const fil = p.edgeStyle !== 'chamfer', lip = p.lipHeight > 0, rimW = (lip ? rLip : rt) - rInTop, bot = [rInBot, p.base], top = [rInTop, H];
  const eTO = Math.min(p.edgeTopOut, rimW * 0.49, lip ? p.lipHeight - 0.1 : lipZ / 2), eBO = Math.min(p.edgeBotOut, rb - p.drainDia / 2 - 0.5, lipZ / 2);
  const eTI = Math.min(p.edgeTopIn, rimW * 0.49, (H - p.base) / 2), eBI = Math.min(p.edgeBotIn, rInBot - p.drainDia / 2 - 1, (H - p.base) / 2);
  const up = unit([rb, 0], [rAt(lipZ), lipZ]), botArc = corner([rb, 0], [-1, 0], up, eBO, fil); // bottom face round onto the wall
  const topArc = lip ? corner([rLip, H], [0, -1], [-1, 0], eTO, fil) : corner([rt, H], [-up[0], -up[1]], [-1, 0], eTO, fil);
  const sideBot = botArc.at(-1)[1], sideTop = lip ? lipZ : topArc[0][1];
  const outerPts = side => [[0, 0], ...botArc, ...side, ...(lip ? [[rAt(lipZ), lipZ], [rLip, lipZ]] : []), ...topArc, [0, H]];

  let outer;
  const plain = p.pattern === 'none' || !p.patternDepth;
  const segs = plain ? p.segments : Math.min(720, Math.max(p.segments, p.patternCount * 12));
  if (plain) {
    outer = rev(outerPts([]));
  } else {
    const fn = patterns[p.pattern](p, lipZ, Math.min(rb, rAt(lipZ)));
    // with a lip, the pattern fades out over the last few mm so it meets the lip's underside; without one it runs
    // right to the rim and the base
    const fade = Math.min(p.patternFade, lipZ / 4), ramp = t => Math.min(1, Math.max(0, t / fade));
    const dAt = (a, z) => p.patternDepth * fn(a, z) * (lip ? ramp(lipZ - z) : 1);
    // dense side profile + enough segments to resolve the pattern, then push the side and its edge rounds outward,
    // so a rounded edge carries the pattern instead of cutting it off
    const dz = Math.min(1, p.patternPitch / 12), side = [];
    for (let z = sideBot + dz; z < sideTop - 1e-6; z += dz) side.push([rAt(z), z]);
    outer = new CrossSection([outerPts(side)]).revolve(segs).warp(v => {
      const r = Math.hypot(v[0], v[1]), z = v[2];
      const onSide = (!lip || z < lipZ) && (Math.abs(r - rAt(z)) < 1e-3 || (z <= sideBot + 1e-6 && r >= botArc[0][0] - 1e-3)
        || (!lip && z >= sideTop - 1e-6 && r >= topArc.at(-1)[0] - 1e-3));
      if (!onSide) return;
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
  const cavity = rev([[0, p.base], ...corner(bot, [-1, 0], unit(bot, top), eBI, fil), ...corner(top, unit(top, bot), [1, 0], eTI, fil), [0, H]]);
  // drain hole (a zero-radius cylinder is invalid and would empty every part it touches)
  let pot = outer.subtract(cavity);
  if (p.drainDia > 0) pot = pot.subtract(Manifold.cylinder(p.base + 2, p.drainDia / 2, p.drainDia / 2, p.segments).translate([0, 0, -1]));

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
  const ribD = p.ribDepth || Math.min(30, Math.max(p.bolts ? 5 * p.boltSize + 1 : 14, rMax * 0.2)), ribT = p.ribThick || Math.max(6, ribD / 2.5);
  const round = Math.min(p.ribRound, ribT / 2 - 0.1, ribD / 2 - 0.1), fillet = p.ribFillet;
  const boltR = (p.boltSize + 0.5) / 2, boltX = ribD - 2 * p.boltSize - 1, jointX = p.bolts ? (boltX - boltR) / 2 : ribD * 0.4;
  const jw = Math.min(8, p.bolts ? (boltX - boltR - 2) : ribD * 0.5), jh = jw * 0.35 + 2 * g; // tongue width, height
  if (jw < 2) throw new Error('Ribs too shallow for these bolts: raise rib depth or use smaller bolts');
  const seamScrewDepth = Math.min(p.spiderScrewDepth, H / 2);
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
  // the joint stops short of the top, leaving room for the screws that hold the spider's spoke down (see core)
  const below = Manifold.cube([1e4, 1e4, H - seamScrewDepth - 1]).translate([-5e3, -5e3, -1]);
  const tongueM = follow(tongue).intersect(below), grooveM = follow(groove).intersect(below);
  const bolt = (y0, y1) => Manifold.union(Array.from({ length: p.boltCount }, (_, i) => (i + 0.5) * H / p.boltCount).map(z =>
    Manifold.cylinder(y1 - y0, boltR, boltR, 24).rotate([-90, 0, 0]).translate([rOut(z) + boltX, y0, z])));
  const bolts = bolt(-g - ribT - 1, g + ribT + 1);

  // core: one tapered shell (the core always has `draft` taper so it pulls straight up), closed floor, open top,
  // printed floor-down. With a drain, a separate pin fills the pot's drain hole and one countersunk screw goes from
  // inside the core down through the floor and pin into the board. A separate spider sits across the core's rim and
  // screws into both ribs of every wedge seam, so the core can't float; a lip under the spider drops inside the core's
  // rim so the core can't wobble.
  const t = p.coreWall, kc = (rInTop - rInBot) / (H - p.base), rIn = z => rInBot + kc * (z - p.base) - t; // inner wall radius
  const { pilotR: screwPilot, clearR: screwR, headR } = screwHoles(p);
  const tb = p.coreFloor, zB = p.base + tb, rd = p.drainDia / 2; // floor thickness
  let core = cavity.subtract(rev([[0, zB], [rIn(zB), zB], [rIn(H + 1), H + 1], [0, H + 1]]));
  let pin = null;
  if (rd > 0) {
    pin = Manifold.cylinder(p.base, rd, rd, p.segments); // fills the pot's drain hole, flush with the board
    if (rd > screwR + 1.5) {
      const hole = Manifold.cylinder(zB + 2, screwR, screwR, 24).translate([0, 0, -1]);
      pin = pin.subtract(hole);
      core = core.subtract(hole).subtract(countersink(Manifold, screwR, headR, zB, p.csAngle));
    }
  }
  // spider (plan view): a ring over the core's rim + rounded, filleted spokes out over each wedge seam's rib pair
  const ts = p.spiderThick, spokeY = g + ribT, rEnd = rMax + ribD, rr = Math.min(p.spiderRound, spokeY - 0.5), sf = p.spokeFillet;
  const plan = CrossSection.circle(rInTop, p.segments).subtract(CrossSection.circle(rInTop - t - p.spiderRing, p.segments))
    .add(CrossSection.union(Array.from({ length: p.wedges }, (_, i) =>
      CrossSection.square([rEnd - rInTop + t, 2 * spokeY]).translate([rInTop - t, -spokeY]).rotate(i * 360 / p.wedges))))
    .offset(-rr, 'Round').offset(rr, 'Round').offset(sf, 'Round').offset(-sf, 'Round');
  const ribMid = g + ribT / 2, lipH = Math.min(p.spiderLip, H - zB - 2), lt = p.spiderLipThick;
  let spider = plan.extrude(ts).translate([0, 0, H]);
  if (lipH > 0) spider = spider.add(rev([[rIn(H - lipH) - g - lt, H - lipH], [rIn(H - lipH) - g, H - lipH], [rIn(H) - g, H + ts / 2], [rIn(H) - g - lt, H + ts / 2]]));
  for (let i = 0; i < p.wedges; i++) for (const y of [ribMid, -ribMid])
    spider = spider.subtract(atSeam(Manifold.cylinder(ts + 2, screwR, screwR, 24).translate([rMax + jointX, y, H - 1]), i * 2 * Math.PI / p.wedges));
  const seamScrew = Manifold.union([ribMid, -ribMid].map(y => Manifold.cylinder(seamScrewDepth + 1, screwPilot, screwPilot, 24).translate([rMax + jointX, y, H - seamScrewDepth])));

  // screw flange round the bottom: the wedges screw down to a board (ply, melamine), which closes the bottom.
  // It reaches out as far as the seam ribs, and its top slopes down and out so a driver clears the wall.
  const fT = p.flangeThick, screwTilt = p.screwTilt, slope = Math.tan(screwTilt * Math.PI / 180), rF = bodyO(0) + ribD;
  const fTop = r => fT + (rF - r) * slope; // flange thickness at radius r
  const flange = rev([[bodyO(0) - 1, 0], [rF, 0], [rF, fT], [bodyO(0), fTop(bodyO(0))], [bodyO(0) - 1, fTop(bodyO(0))]]);
  const shell = new CrossSection([[[0, 0], ...prof, [0, H]]]).revolve(p.segments).add(flange).subtract(outer);
  const rScrew = bodyO(0) + ribD / 2, screws = Math.ceil(rScrew * 2 * Math.PI / p.wedges / p.screwSpacing); // per wedge, at most screwSpacing apart
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
    w = w.subtract(atSeam(seamScrew, a0)).subtract(atSeam(seamScrew, a1));
    // screw holes spread evenly along the flange, clear of the seam ribs, square to its sloped top
    for (let j = 0; j < screws; j++) {
      const a = (a0 + (a1 - a0) * (j + 0.5) / screws) * 180 / Math.PI;
      w = w.subtract(Manifold.cylinder(fTop(rScrew) * 2 + 4, screwR, screwR, 24, true).rotate([0, screwTilt, 0]).translate([rScrew, 0, fTop(rScrew) / 2]).rotate([0, 0, a]));
    }
    wedges.push(w.subtract(outer));
  }

  // bed check: each part's footprint as printed (wedges turned to face +x, everything standing upright)
  const before = warnings.length, fits = (name, m) => {
    const { min, max } = m.boundingBox(), w = Math.ceil(max[0] - min[0]), d = Math.ceil(max[1] - min[1]);
    if (Math.max(w, d) > p.bed) warnings.push(`${name} is ${w} × ${d} mm, bigger than your ${p.bed} mm bed`);
  };
  if (show.core) { fits('Core', core); fits('Spider', spider); }
  if (show.wedges) fits('Each wedge', wedges[0].rotate([0, 0, -180 / n]));
  if (warnings.length > before) warnings.push('Try more wedges (the core can\'t be split yet)');
  return { pot, core, pin, spider, wedges, screws, rMax, warnings };
}

// screw holes from the screw's thread size: pilot (the screw bites in), clearance (it passes through), head (countersink).
// Only the pilot is tuned, by pilotAdjust from the test print; clearance holes are forgiving. headDia = the countersink's top diameter.
export const screwHoles = p => ({ pilotR: (0.8 * p.screw + p.pilotAdjust) / 2, clearR: (p.screw + 0.5) / 2, headR: p.headDia / 2 });
// cone (csAngle included) from the head down to the clearance hole, top at z
const countersink = (Manifold, r, headR, z, angle) => {
  const R = Math.max(headR, r + 0.1), h = (R - r) / Math.tan(angle * Math.PI / 360); // poked 0.01 out the top for a clean cut
  return Manifold.cylinder(h + 0.01, r, R + 0.01 * (R - r) / h, 24).translate([0, 0, z - h]);
};

// test bar: 5 pilot holes at -0.4..+0.4 mm from the setting (a notch marks the middle one, the current setting),
// then one clearance hole and one countersunk clearance hole. Prints flat, 10 mm deep.
export function testPrint(wasm, p) {
  const { Manifold } = wasm, { pilotR, clearR, headR } = screwHoles(p), T = 10, W = Math.max(20, 2 * headR + 8);
  const pitch = Math.max(12, 2 * headR + 4), L = 7 * pitch;
  let bar = Manifold.cube([L, W, T]);
  const at = (m, i) => m.translate([pitch * (i + 0.5), W / 2, 0]);
  for (let i = 0; i < 5; i++) { const r = pilotR + (i - 2) * 0.2; bar = bar.subtract(at(Manifold.cylinder(T + 2, r, r, 24).translate([0, 0, -1]), i)); }
  bar = bar.subtract(at(Manifold.cylinder(T + 2, clearR, clearR, 24).translate([0, 0, -1]), 5));
  bar = bar.subtract(at(Manifold.cylinder(T + 2, clearR, clearR, 24).translate([0, 0, -1]).add(countersink(Manifold, clearR, headR, T, p.csAngle)), 6));
  return bar.subtract(Manifold.cylinder(T + 2, 1.5, 1.5, 4).translate([pitch * 2.5, 0, -1])); // notch on the edge by the middle pilot
}
