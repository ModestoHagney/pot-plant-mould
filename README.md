# pot-plant-mould

Client-side web app that designs concrete plant pots and 3D-printable molds.

## Run

Pot sizes are outside sizes by default; switch "Size by" to Inside to enter the hole instead (e.g. to fit a plastic pot), and the wall and base are added outward.

Serve the folder and open it, e.g. `python3 -m http.server`, then visit http://localhost:8000.

## Check

`npm install && npm test` checks the core pieces, spider and wedges for 2, 3, 4 and 6 parts don't overlap.

## Casting

Cast upright: stand the wedges on a board (ply or melamine), slot the tongues into the grooves, clamp (or bolt) the seam ribs and screw the bottom flange down to the board. The board forms the underside of the pot. Drop the core's base disc in, pin first into the drain hole, and screw down through it into the board. Stand the core wall pieces on the disc one by one, sliding their tongues into the grooves, and screw each foot tab down into the disc. Put the spider on top: its lip drops into the core, and its spokes sit on the seam ribs. Screw it into the tab on each core piece and into both ribs of every seam, so the core can't float or spread. Fill the hollow core with sand for extra weight if you like, and pour between the spokes. To demould, unscrew the spider and the foot tabs, slide each wall piece straight up, then lift out the disc.
