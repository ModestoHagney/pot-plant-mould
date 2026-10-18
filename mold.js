// Pure geometry: params (mm) -> Manifold solids. Pot axis is +Z, base at z=0.
// Casting is done upright: wedges stand on the base plate, pour the concrete in, then push the core down
// until its cap sits on the wedges. Vent holes in the cap let excess concrete and air escape.
export const defaults = {
  height: 120, topDia: 140, bottomDia: 100, wall: 10, base: 12,
  lipHeight: 15, lipWidth: 5, drainDia: 15, moldWall: 4, wedges: 4, segments: 96,
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

  const outer = rev([[0, 0], [rb, 0], [rAt(lipZ), lipZ], [rLip, lipZ], [rLip, H], [0, H]]);
  // cavity: wall measured horizontally, so it follows the outer taper
  const cavity = rev([[0, p.base], [rAt(p.base) - p.wall, p.base], [rt - p.wall, H], [0, H]]);
  const drain = Manifold.cylinder(p.base + 2, p.drainDia / 2, p.drainDia / 2, p.segments).translate([0, 0, -1]);
  const pot = outer.subtract(cavity).subtract(drain);

  const rMax = Math.max(rLip, rt, rb) + p.moldWall;
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
