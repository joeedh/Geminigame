# Aether Command RTS — Architectural Overview

A browser-based real-time strategy prototype where the world's art assets
(tiles, units, buildings) are generated on demand by Google's Imagen and Gemini
image models, then post-processed in the browser into a playable canvas-based
game.

## Goals

- **Single-page, zero-backend.** All game state lives in the browser; the only
  network calls are to Google's image generation APIs.
- **AI-native art pipeline.** Asset generation, background-removal, slicing,
  and animation framing all happen at runtime against arbitrary themes
  ("Cybernetic Desert", "Volcanic Ruins", …).
- **Type-safe, modular TypeScript.** Each concern lives in its own module; the
  game loop is a thin coordinator over pure-ish update/draw functions.

## Tech Stack

| Concern         | Tool                                      |
| --------------- | ----------------------------------------- |
| Package manager | pnpm                                      |
| Language        | TypeScript (strict)                       |
| Type checker    | `tsgo` (`@typescript/native-preview`)     |
| Bundler         | esbuild                                   |
| Dev server      | esbuild `serve` API + watch               |
| Linter          | ESLint v9 flat config + typescript-eslint |
| Formatter       | Prettier                                  |
| E2E tests       | Playwright (Chromium)                     |
| Rendering       | HTML5 Canvas 2D                           |
| Styling         | Tailwind CDN (UI chrome only)             |
| AI image models | Imagen 4.0, Gemini 2.5 Flash Image        |

## Repository Layout

```
.
├── docs/                  # this folder
├── scripts/
│   ├── build.mjs          # production bundle -> dist/
│   └── dev.mjs            # esbuild watch + serve
├── src/
│   ├── index.html         # HTML shell + Tailwind UI
│   ├── main.ts            # bootstrap, init, game loop, button wiring
│   ├── constants.ts       # tile size, map size, speeds, caps
│   ├── types.ts           # Unit, Building, Camera, Selection, Assets, ...
│   ├── state.ts           # singleton mutable game state
│   ├── api.ts             # apiFetch + Imagen/Gemini calls
│   ├── sprites.ts         # background keying, tileset slicing, frame extract
│   ├── input.ts           # mouse/touch handlers + mode toggling
│   ├── render.ts          # update() + draw()
│   └── ui.ts              # DOM bindings for HUD overlay
├── tests/
│   └── smoke.spec.ts      # Playwright smoke coverage
├── eslint.config.js
├── playwright.config.ts
├── tsconfig.json
└── package.json
```

## Module Architecture

```
                 ┌──────────────┐
                 │  index.html  │
                 │  + Tailwind  │
                 └──────┬───────┘
                        │ <script type="module" src="./main.js">
                        ▼
   ┌────────────────────────────────────────────────────┐
   │                     main.ts                        │
   │ - bootstraps canvas, state, listeners              │
   │ - drives requestAnimationFrame loop                │
   │ - wires HUD buttons                                │
   └──┬────────┬────────┬────────┬────────┬─────────────┘
      │        │        │        │        │
      ▼        ▼        ▼        ▼        ▼
  ┌──────┐ ┌──────┐ ┌─────────┐ ┌──────┐ ┌──────┐
  │state │ │input │ │render   │ │api   │ │ui    │
  └──┬───┘ └──┬───┘ │ update  │ │      │ └──────┘
     │        │     │ draw    │ └──┬───┘
     │        │     └────┬────┘    │
     │        │          │         ▼
     │        │          │     ┌────────┐
     │        │          │     │sprites │
     │        │          │     │ keying │
     │        │          │     │ slicing│
     │        │          │     └────────┘
     ▼        ▼          ▼
   ┌──────────────────────────┐
   │       constants          │
   │       types              │
   └──────────────────────────┘
```

Dependency direction is acyclic: lower-level modules (`constants`, `types`)
have no internal imports; higher-level modules (`main`) compose everything.

### `state.ts` — single mutable store

A single exported object (`state`) holds all runtime game data: resources,
units, buildings, camera, the active selection, the tilemap, and the loaded
asset bundle. Modules import `state` and mutate it in place. This is
deliberately simple for a prototype; see _Future improvements_ for migration
paths.

### `render.ts` — `update()` + `draw()`

`update()` integrates unit movement and animation per frame. `draw()` is
strictly pull-based: it reads `state` and renders to a passed-in
`CanvasRenderingContext2D`. There is no retained scene graph.

### `input.ts` — pointer + mode

Unifies mouse and touch into start/move/end handlers. The current
`InteractionMode` (`'pan' | 'select'`) determines whether drags pan the camera
or define a selection rectangle. Tap-vs-drag is distinguished by a 10-pixel
threshold on pointer-up.

### `api.ts` — AI image fetches with retry

`apiFetch<T>()` wraps `fetch` with exponential-backoff retries (1s, 2s, 4s,
8s, 16s). `fetchAIImage()` calls Imagen and returns a decoded `HTMLImageElement`.
`refineImageWithAI()` round-trips an existing tileset through Gemini for a
detail pass.

### `sprites.ts` — post-processing pipeline

Three pure-ish operations:

1. **`removeBackground(img)`** — samples the four corner pixels to estimate a
   background color, then alpha-keys every pixel within a fixed color
   distance. Returns an offscreen `<canvas>`.
2. **`sliceTileset(img)`** — splits a generated 2×2 tileset image into four
   `TILE_SIZE`-px tile canvases.
3. **`processUnitSheet(img)`** — keys the background, then for each of the 4
   horizontal frames computes the tight bounding box of opaque pixels and
   emits a `SpriteFrame` with width/height/offsets so animation looks stable
   even when the model produces inconsistent silhouettes.

### `ui.ts` — DOM bindings

Thin helpers for the HUD: error toast, generation overlay, selection panel,
and resource readout. Keeps DOM queries out of the game loop modules.

## Build & Dev Pipeline

### Dev (`pnpm dev`)

`scripts/dev.mjs` boots an esbuild `context` in watch mode that compiles
`src/main.ts` to `dist/main.js`. It copies `src/index.html` into `dist/` once
and re-copies on changes via `fs.watch`. The same context's `serve()` exposes
`dist/` over HTTP at `127.0.0.1:5173`.

### Build (`pnpm build`)

`scripts/build.mjs` clears `dist/`, runs a single esbuild bundle (ESM,
ES2022, minified, with sourcemap), then copies `index.html`. Output is fully
static and deployable to any object store / CDN.

### Type checking (`pnpm typecheck`)

Runs `tsgo --noEmit`. The Go-based `tsgo` is used for speed; emit is handled
by esbuild. `tsconfig.json` enables strict mode plus
`noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` for tighter
guarantees.

### Lint (`pnpm lint`)

`eslint.config.js` is a flat config that applies typescript-eslint's
type-checked recommended set to `src/`, `tests/`, and `playwright.config.ts`,
and disables type-checking for `scripts/**` (which use Node globals).

## Game Loop

```
requestAnimationFrame ──► update() ──► draw() ──► updateResourceUI() ──► loop
                            │            │
                            │            ├── tiles
                            │            ├── buildings
                            │            ├── units (with anim frame)
                            │            └── selection rectangle
                            │
                            ├── per-unit: integrate (target - pos)
                            ├── advance animFrame from movement distance
                            └── lerp visualFacing toward facing
```

There is no fixed-timestep accumulator; movement is per-frame and
framerate-coupled. Acceptable for a prototype.

## Asset Generation Flow

```
[user types theme] ──► [click "New World"]
        │
        ▼
  Promise.all([
    fetchAIImage(tileset prompt)   ──► sliceTileset()        ──► state.assets.tiles
    fetchAIImage(walk-cycle prompt) ──► processUnitSheet()    ──► state.assets.soldierFrames
    fetchAIImage(building prompt)   ──► removeBackground()    ──► state.assets.base
  ])
        │
        ▼
  generateMapData() (re-rolls tilemap)
  reveal "Refine Art" button
```

`refineImageWithAI()` re-runs only the tileset through Gemini for a
detail-enhancement pass without regenerating units or the building.

## Testing Strategy

- **Smoke tests** (`tests/smoke.spec.ts`): boot the dev server, verify the
  page title, canvas presence, initial resource readout, mode-button toggling,
  and absence of uncaught page errors during the first frames.
- **Future:** see below.

## Known Limitations

- API key is currently a constant in `main.ts` (`API_KEY = ''`). AI generation
  is a no-op until a real key is wired in.
- The whole game state is a single mutable singleton. Fine at this scale,
  awkward at any larger scale.
- Map generation is `Math.random()` per tile — no coherence, no biomes.
- Unit collision and building placement are not modeled.
- No persistence, no networking, no save/load.
- No audio.

---

## Future Improvements

### Configuration & secrets

- **API-key injection.** Replace the literal `API_KEY` constant with an
  esbuild `define` (`__API_KEY__`) sourced from `process.env.GOOGLE_API_KEY`
  at build time, and from `import.meta.env`-style overrides at dev time.
  Refuse to start the AI flow if the key is empty and surface a clear UI
  error.
- **Per-environment configs.** Promote `playwright.config.ts`'s host/port
  reading pattern to a small shared `env.ts`.

### Engine & state management

- **Move from singleton to a typed store.** Wrap the `state` object in a
  module with explicit `selectors` and `actions`. This makes it possible to
  log, replay, or snapshot state without scattering mutations across modules.
- **Entity/Component split.** Units and buildings already share fields
  (`x`, `y`, `hp`); modeling them as `Entity` + components (`Position`,
  `Health`, `Sprite`, `Movement`) would simplify adding new unit types.
- **Fixed-timestep loop.** Decouple simulation from render rate so behavior is
  deterministic regardless of monitor refresh.
- **Spatial index.** Unit picking and box-selection scan all units linearly.
  A grid or quadtree keyed on tile coordinates would make this O(log n) and
  unblock larger maps.
- **Pathfinding.** Replace direct-line movement with A\* over the tilemap and
  add per-unit collision avoidance (RVO or simple separation).

### Game systems

- **Combat & damage.** `hp` is unused. Add weapons, attack ranges, and a
  damage resolution system.
- **Resource economy.** `aether` only displays a constant. Wire workers to
  produce/harvest, add a build menu, and gate unit production on resources.
- **AI opponent.** Even a scripted opponent that builds units and attacks
  would dramatically increase replay value.
- **Fog of war / visibility.**
- **Audio** (Web Audio API): ambient track per biome plus unit acknowledgments.

### Asset pipeline

- **Result caching.** Store generated images under a content-hashed key
  (theme + asset type) in IndexedDB so a refresh doesn't burn API calls. Add
  an explicit "Regenerate" affordance.
- **Smarter background removal.** The current corner-sample + L1 distance
  approach fails on busy backgrounds. Replace with a proper chroma key on a
  fixed-color generation prompt, or run a small WASM segmentation model.
- **Sprite atlas packing.** Pack all per-unit frames into a single texture
  atlas at load time and draw via source-rect to reduce per-frame
  `drawImage` overhead.
- **Streaming generation.** Show partial assets (e.g. tiles only) as they
  arrive instead of waiting for `Promise.all` to resolve.
- **Generation queue with progress.** Surface real progress (which prompt is
  in-flight, retry attempt, ETA) instead of the static overlay text.

### Quality, tooling, and CI

- **Unit tests.** Sprites, API retry, and selection math are pure enough to
  cover with Vitest. Mock `fetch` for `api.ts`.
- **Visual regression.** Add Playwright screenshot tests of the canvas after
  a deterministic seed (override `Math.random`) to catch render regressions.
- **CI workflow.** GitHub Actions matrix running `typecheck`, `lint`,
  `format:check`, `build`, and `test` on every PR.
- **Sourcemap upload / error tracking.** Wire Sentry or similar so production
  generation failures are observable.
- **Bundle analysis.** Add `esbuild --metafile` + a `pnpm analyze` script.
- **HMR.** esbuild's serve doesn't ship HMR — for a richer DX, switch the dev
  command to Vite while keeping esbuild for production.

### UX & accessibility

- **Keyboard controls.** WASD pan, marquee with shift-drag, hotkeys for mode
  switching and group selection (`1`–`9`).
- **Mobile polish.** Pinch-to-zoom, larger tap targets, and a settings drawer
  for biome regeneration.
- **A11y.** Real `aria-label`s on icon buttons, focus management when the
  generation overlay opens, and a reduced-motion mode that disables the
  loader animation.
- **i18n scaffolding.** Currently every string is hardcoded; extract to a
  resource map.

### Deployment

- **Static hosting recipe.** Add a deploy script targeting Cloudflare
  Pages / GitHub Pages from `dist/`.
- **Service worker.** Cache the bundle and any user-confirmed asset packs for
  offline play (sans AI generation).
