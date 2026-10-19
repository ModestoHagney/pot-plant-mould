# pot-plant-mould

Client-side web app that designs concrete plant pots and 3D-printable molds.

## Run

Pot sizes are outside sizes by default; switch "Size by" to Inside to enter the hole instead (e.g. to fit a plastic pot), and the wall and base are added outward.

Serve the folder and open it, e.g. `python3 -m http.server`, then visit http://localhost:8000.

## Check

`npm install && npm test` checks the core, drain pin, spider and wedges for 2, 3, 4 and 6 parts don't overlap.

## Casting

Cast upright: stand the wedges on a board (ply or melamine), slot the tongues into the grooves, clamp (or bolt) the seam ribs and screw the bottom flange down to the board. The board forms the underside of the pot. Put the drain pin in the drain hole, drop the core in on top of it, and screw down from inside the core through its floor and the pin into the board. Put the spider across the core's rim with its spokes on the seam ribs, and screw it into both ribs of every seam so the core can't float. Fill the hollow core with sand for extra weight if you like, and pour between the spokes. To demould, unscrew the spider and the drain screw, then pull the core straight up.
