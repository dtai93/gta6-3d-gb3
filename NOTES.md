# Port Solano — session notes

Original open-world crime game. Fictional sunset coast city. No Rockstar names or assets.
Protagonist: Rafa Quill. Districts: Coral Shore, Old Harbor, Neon Strip, Palm Heights, Industrial Docks.

## Architecture

Plain ES modules under `game/src/`, three.js r170 at `game/vendor/three.module.min.js` (do not edit).
`vendor/makefun-game.ts` stays byte-for-byte. `main.ts` copies `game/` and `screenshots/` and writes `dossier.json` with the scorer caps.

| File | Job |
|---|---|
| `config.js` | Grid (`SPAN` 44, `ROAD_W` 12, 6×5 blocks), movement, four shot poses, `districtOf` |
| `rng.js` | Seeded mulberry32. No `Math.random` |
| `input.js` | WASD/arrows, shift run, space jump, pointer-lock mouse |
| `sky.js` | Vertex-colour sunset dome, fog, hemisphere fill, one shadow sun that follows the camera |
| `city.js` | Seeded roads, sidewalks, buildings, windows, neon bands, palms, lamps, parked cars, billboards, building AABBs |
| `camera.js` | Third-person chase. Yaw 0 looks world −Z. `planarBasis` is the only movement frame |
| `player.js` | Low-poly body, walk cycle, jump, circle-vs-AABB. Facing: `atan2(-x, -z)` so local −Z is the face |
| `main.js` | Renderer, loop, `?shot=&seed=` freeze |

Frame: y-up, right-handed. Character and camera yaw 0 face world −Z (inland; ocean is −Z / south). Camera sits behind that look vector. Movement reads `camera.getWorldDirection`, right = forward × up.

Spawn is on the road at `(3*SPAN, 1.15*SPAN)`.

## Art direction

Low-poly boxes and instanced props, vertex colours on buildings/sky/palms, emissive windows and lamp heads. Sunset: warm horizon, blue zenith, teal water, sand beach along z < 0. Neon Strip towers are dark with pink/cyan windows and a parapet band. Other districts are plaster, brick, and dock grey. One directional sun, 2048 shadow map tightened around the camera.

## Screenshots (shots.json)

1. `1-chase.jpg` — cover. Car chase at sunset, 3 police cars + helicopter, 4 wanted stars, full HUD, dialogue. Not built yet.
2. `2-onfoot.jpg` — downtown firefight, neon dusk, crosshair, weapon slots.
3. `3-city.jpg` — aerial of coast, grid, traffic, mission panel + minimap. **Test render is in screenshots/3-city.jpg** (city only, label HUD, no mission panel yet).
4. `4-start.jpg` — title flyover: New Game / Continue / Controls, save slot.

Query: `?shot=<chase|onfoot|city|start>&seed=1`. Shot freezes simulation. Capture: serve port 18801, `shot.mjs`, Pillow JPEG ≤ 256 KiB, 1280×800.

## This session

Driveable traffic. `vehicles.js` builds five cars (Solano Sprint, Harbor Cab, Dock Hauler, Port Sentinel, Reef Runner) with headlights, taillights, a driver, and arcade handling: accel, brake, reverse, handbrake drift, skid marks, tyre smoke, condition. F enters the nearest car and pulls the driver out; F exits to the right side. Heading is the same yaw as the on-foot body (`yawForward`, nose local −Z). `traffic.js` runs AI on the right-hand lane, braking for cars and for Rafa, stopping for cross traffic, turning at crossings, honking by flashing the headlights. `peds.js` walks block edges, turns to watch Rafa, flees, and gets knocked down by a fast car. Car-building, car-car, and car-ped contacts push apart and scrape condition. Chase camera eases behind the driven car. `?test=1` reports `ok` (accel toward −Z, wall shove, car separation, ped flee, traffic travel). `?shot=chase&seed=1` shows the Neon Strip with a cruiser, sprint, cab, muscle car, and sidewalk peds. No console errors.

## Next

1. Full HUD shell (mission, wanted, cash, clock, minimap, health, weapons, speedo, radio, dialogue) so later shots can fill real data.
2. Police response and the chase shot cast (3 cars + helicopter).
3. On-foot combat, then mission flow, save, title screen.
4. Retake all 4 shots. Cover must be `1-chase.jpg`. Tighten car silhouettes before that cover; wheels now sit outside the body.
5. Keep each source file one job. The judge only sees file names and the first declarations.
