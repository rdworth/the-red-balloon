# The Red Balloon

A 2D stop-motion animation in JavaScript that retells a simplified version of Albert Lamorisse's 1956 film *The Red Balloon*. It's drawn to look like a child made it from torn craft paper, colored pencil and other craft materials.

## Files

- `cover.html`: the cover art.
- `storyboard.html`: the 20-frame storyboard, drawn from reusable paper pieces.
- `opening-scene.html`: scene 1, a 20-second stop-motion opening (240 frames at 12 fps). The balloon drifts over the rooftops, snags on a lamppost, and Pascal's shoes step in. It plays to the waltz in `music/opening-theme.js`, and the pigeon, the lamppost snag and Pascal's footsteps land on the waltz's cues.
- `opening-photoreal.html`: an alternate cut of scene 1 with the same beats and waltz sync, rendered to look like a photographed paper set: fibrous construction paper, torn white edges, colored-pencil wax on the paper's tooth, and real shadows. Its textures are in `assets/photoreal/` (all generated here; see `SOURCES.md`).
- `opening-plympton.html`: an alternate take on scene 1 in shaky felt-tip marker, in the spirit of Bill Plympton. Same beats and waltz cues, but the city is built in 3D so the camera can circle, swoop, crane and punch in. Nothing visual is shared with the craft-paper version.
- `opening-clay.html`: an alternate take on scene 1 in claymation, still 2D. Every piece is modelled as plasticine on a flat set, with rounded rolled edges, thumbprints and a little frame-to-frame boil. Same beats and waltz cues; nothing visual is shared with the other versions.
