# The Red Balloon

A 2D stop-motion animation in JavaScript that retells a simplified version of Albert Lamorisse's 1956 film *The Red Balloon*. It's drawn to look like a child made it from torn craft paper, colored pencil and other craft materials.

## Files

- `cover.html`: the cover art.
- `storyboard.html`: the 20-frame storyboard, drawn from reusable paper pieces.
- `opening-scene.html`: scene 1, a 20-second stop-motion opening (240 frames at 12 fps). The balloon drifts over the rooftops, snags on a lamppost, and Pascal's shoes step in. It plays to the waltz in `music/opening-theme-sampled.js`, and the pigeon, the lamppost snag and Pascal's footsteps land on the waltz's cues.
- `opening-photoreal.html`: an alternate cut of scene 1 with the same beats and waltz sync, rendered to look like a photographed paper set: fibrous construction paper, torn white edges, colored-pencil wax on the paper's tooth, and real shadows. Its textures are in `assets/photoreal/` (all generated here; see `SOURCES.md`).
- `opening-3d.html`: an alternate take on scene 1 drawn in shaky felt-tip marker. Same beats and waltz cues, but the city is built in 3D so the camera can circle, swoop, crane and punch in. Nothing visual is shared with the craft-paper version.
- `opening-pencil.html`: an alternate cut of scene 1 in colored pencil on white paper, with dense directional strokes, bold dark outlines and bright colors. Same set, camera, beats and cues as the paper version; each piece is drawn a few times while the page loads so the lines boil.
- `final-shot-pencil.html`: a still of the scene's last shot in the same colored pencil style, drawn stroke by stroke by `pencil/final-shot.js` (`pencil/final-shot.jpg` is a saved render).
- `opening-clay.html`: an alternate take on scene 1 in claymation, still 2D. Every piece is modelled as plasticine on a flat set, with rounded rolled edges, thumbprints and a little frame-to-frame boil. Same beats and cues, played to the sampled waltz in `music/opening-theme-sampled.js`; nothing visual is shared with the other versions.
- `music/opening-theme-sampled.js`: the opening waltz that every version of scene 1 plays to, 12 bars of 3/4 over 20 seconds. The accordion, upright bass and marimba are recordings from the FluidR3 General MIDI soundfont, kept in `music/samples/` (see its README for the license). The pigeon's wing flaps and Pascal's footsteps are synthesized.
