# Sources and licenses: photoreal paper assets

Everything in this folder was made for this project. Nothing was downloaded,
so there are no third-party licenses to track.

| File | What it is | Made by | License |
| --- | --- | --- | --- |
| `paper-fiber.jpg` | Neutral construction-paper surface (1024 px tile, seamless). Multiplied over every paper piece and the sky. | `make_textures.py`, seeded noise and drawn fibres | Same as this repository; also free to treat as CC0 |
| `pencil-tooth.png` | Paper tooth as an alpha mask (512 px tile, seamless): where colored-pencil wax catches. | `make_textures.py` | Same as above |
| `kraft-board.jpg` | Brown kraft card for the page's craft table (1024 px tile, seamless). | `make_textures.py` | Same as above |
| `make_textures.py` | The generator. Rerun it to rebuild the three images from their fixed seeds. | Written for this project | Same as above |

At run time `opening-photoreal.html` also makes a few things on the fly
rather than loading them: the torn white edges and loose fibres, the
pencil hatching, shadows, the lamp light and vignette, and the film grain.
