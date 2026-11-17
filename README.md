# Kill da Corona

A toon first person arcade game: grab your baseball bat and smash every
corona before they multiply. **Stay the fuck home.**

Built with plain [three.js](https://threejs.org) (WebGL 2), no framework, no
physics engine and no post-processing library: every material is a custom
GLSL 3 `RawShaderMaterial` and the whole frame goes through a custom deferred
pipeline.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
npm run preview  # serve the production build
```

## Controls

| Action       | Key        |
| ------------ | ---------- |
| Move         | WASD       |
| Jump         | Space      |
| Attack       | Left click |
| Boost        | Shift      |
| Toggle sound | M          |
| Settings     | G          |
| Pause        | Esc        |

## Architecture

```
src/
  main.js              bootstrap, render loop, wiring
  config.js            gameplay constants
  core/                input, audio (Web Audio), springs, math, asset loading
  world/
    World.js           collision world: sphere vs triangles (spatial hash)
                       + rasterised walkable footprint for the AI
    Level.js, Sky.js   islands, sky dome, start platform
  game/
    Game.js            game state machine (waitPlayer → initAnimation →
                       gameplay → win / gameover, plus pause)
    Corona.js          enemy state machine (idle, seek, attack, preattack,
                       spawn, dead)
    Player.js          kinematic rolling-ball controller
    Bat.js             springy swing + swept hit capsule
    CameraRig.js       mouse look, boost FOV spring, screen shake
    fx.js              billboards and particles
  render/
    Pipeline.js        deferred renderer
    materials.js       material factories (all RawShaderMaterial)
    shaders/           GLSL: G-buffer, lighting, TAA, bloom, FXAA, composite…
  ui/                  HUD, screens, lil-gui settings panel
```

### Rendering

1. **Shadow map**: depth only pass from the sun, texel snapped, hardware PCF.
2. **G-Buffer** (MRT, 3 × RGBA16F + float depth): albedo + material id,
   octahedral view normal + object id + outline flag, motion vectors +
   emissive + specular. Fading objects use screen-door transparency resolved
   by the TAA.
3. **Lighting**: toon bands (3 for the world, 5 for the characters, like the
   old five tone ramp), tinted shadows, two spinning "disco" lights, toon
   specular and rim, fog and **outlines** (object id silhouettes, inverse
   depth laplacian and normal creases).
4. **Forward**: sprites and particles, soft depth tested against the G-Buffer.
5. **Anti-aliasing**: TAA (Halton jitter, velocity dilation, Catmull-Rom
   history, YCoCg variance clipping) and/or FXAA. No MSAA.
6. **Bloom**: thresholded 13 tap downsample chain + tent upsample.
7. **Composite**: falling "water" wobble, hit glitch, chromatic aberration,
   sharpening, ACES / AgX tone mapping, grading, speed lines, damage
   vignette, vignette, film grain + scanlines, HUD, sRGB encoding.

## Settings panel

Press **G** (or pause with Esc) to open the panel. Every parameter of the game
is there and applies live:

- **Presets & tools**: quality presets, copy / download / import the
  configuration as JSON, copy a share link (`#config=…`), restart the round,
  reset everything.
- **Rendering**: resolution and anti-aliasing (TAA / FXAA settings), shadows,
  toon shading, outlines, lights, fog, post-processing, sprites and particle
  bursts.
- **World**: island materials, start platform, sky and slogans.
- **Gameplay**: rules, player physics, baseball bat, corona behaviour, look
  and death, hit feedback and effects.
- **Camera & controls**, **HUD**, **Audio**, **Debug** (G-Buffer views, fps).

Render settings and gameplay constants (`src/config.js`) are stored in
`localStorage` separately, and only the values that differ from the
defaults are saved.

## Credits

Made by [mlperego](https://twitter.com/mlperego) and
[ggsimm](https://twitter.com/ggsimm). Music by
[L'era del bantha](https://www.youtube.com/channel/UCBqKOx9iJL1ornaMoem9SPg).
