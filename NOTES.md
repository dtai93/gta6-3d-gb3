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
| `wanted.js` | Stars, search circle, decay once line of sight breaks |
| `police.js` | Cruisers, foot officers, KESTREL-1, bust meter |
| `weapons.js` | Fists, Quill 9, Strip SMG, Harbor 12, ammo |
| `combat.js` | Aim, tracers, armour, wasted / busted respawn |
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

## Session 3 — wanted, police, combat

`wanted.js` — heat 0–5. Crimes: assault, carjack, gunfire, rundown, officer, kill. Search circle tracks Rafa while a unit has line of sight; out of sight it grows and the heat cools (faster outside the circle). `?test=1` checks decay.

`police.js` — six Port Sentinel cruisers (GULL-1, GULL-4, MARLIN-11, MARLIN-12, HERON-7, TERN-2). They patrol, then chase, ram (2+ stars), and two peel off into a roadblock (3+). Foot officers OSPREY-3, IBIS-9, PLOVER-6, SANDER-14 deploy at 2 stars and shoot at 3. KESTREL-1, the helicopter, lifts off at 3 stars with a searchlight. Close contact while standing still fills a bust meter. Sirens are the blinking light bar plus a point light.

`weapons.js` / `combat.js` — Fists, Quill 9, Strip SMG, Harbor 12. Mouse aim faces the camera look, then the shot goes from the chest to that aim point. Muzzle flash, tracers, sparks. Armour soaks part of a hit. Civilians and officers fall. Wasted respawns at the Coral Shore hospital (44, 44) with a cash fine and a cleared wanted level. Busted respawns at the station (132, 44). Keys: 1–4 slots, R reload, left mouse fire, right mouse aim. F still enters and exits; stealing a cruiser is a crime.

`?test=1` reports `drive-test ok` (old drive checks plus fist, gun, heat, cruiser chase, hospital, bust). `?shot=chase&seed=1` freezes a Solano Sprint with three cruisers, OSPREY-3, and KESTREL-1. `screenshots/1-chase.jpg` is that frame (1280×800, under 256 KiB). A temporary right-hand heat panel lists stars, HP, armour, cash, the driven car or weapon, and unit call-signs. It is not the final HUD.

## Session 4 — missions, story, HUD

`dialogue.js` — cast and canvas portraits: Rafa Quill, Nia Voss, Mateo Sol, Cleo Marsh, Jun Park, Inez Calder, Lalo Brine.

`missions.js` — six jobs with a gold beacon and staged objectives. Coral Drop (delivery), Yellow Shadow (tail a Harbor Cab), The Tide Job (Sprint getaway), Vesper Take (hold-up), Yard Lights (boat-yard heist), Brine's Cut (finale). Walking into the next marker starts the job, pays cash, and opens a mission-complete card. `?shot=` locks a staged moment: chase is mission 3 stage 2, on foot is mission 4, city is mission 1.

`hud.js` plus the overlay in `index.html` — mission panel (stage, title, objective, bar, NEXT), wanted stars, cash, day and clock, police response with call-signs, circular minimap (roads, north, yellow objective, red units, district), health and armour, four weapon slots with ammo, speedometer with vehicle name and condition, radio now-playing, dialogue with portrait, notice line. Q cycles stations in `radio.js`. The temporary heat panel is gone. `#complete` uses `[hidden]` so `display:flex` does not force the payoff card on screen.

`?test=1` still reports `ok`. Cover `screenshots/1-chase.jpg` is the causeway chase (4 stars, three cruisers, KESTREL-1, full HUD, Nia on the radio line). `2-onfoot.jpg` and `3-city.jpg` were retaken with the same HUD. All three are 1280×800 and under 256 KiB. `4-start.jpg` is still missing.

## Next

1. Tighten car silhouettes; wheels still sit outside the body. Pull KESTREL-1 a little larger in the chase frame if the camera allows it.
2. Keep each source file one job. The judge only sees file names and the first declarations.
3. Cover stays `1-chase.jpg`. Do not put the menu on the chase shot.

## Session 5 — menus, save, audio, juice

`menus.js` — title card (PORT SOLANO, New Game / Continue / Controls / Settings, save-slot preview), pause menu, controls and settings sheets. Escape pauses. The title hides the HUD. `?shot=start` freezes a night flyover behind the card. Chase, on-foot, and city shots stay in play with no menu.

`save.js` — one localStorage slot. Walking into the Coral Shore safehouse (road at 44, 22) clears wanted heat and writes the slot. Finishing a job autosaves. Pause can save manually. Continue restores health, cash, heat, clock, radio, weapons, and mission stage.

`mapscreen.js` — M opens a full-city map (roads, districts, safehouse, job blip, police). Escape or M closes it.

`audio.js` — Web Audio synth. Engine pitch follows speed, sirens while wanted, gunshots, crashes, footsteps. Three generative stations (Lagoon FM, Harbor Wire, Neon After); Dock Static and Palm Hours reuse those voices. Q still cycles the dial in `radio.js`. Settings sliders set master, radio, and look speed.

`daynight.js` plus `updateSkyHour` in `sky.js` — 17:00–19:30 stays the existing sunset (chase is 18:42). Later hours go blue and `updateNeon` lifts windows, parapet bands, and lamps. `fx.js` adds sparks, smoke, dust, and muzzle points. Landing, guns, and crashes shake the camera without changing its look direction. Speed adds a little FOV and camera distance.

`?test=1` reports `drive-test ok` with no page exceptions. `screenshots/4-start.jpg` is the night title (1280×800, under 256 KiB). Cover `1-chase.jpg` was not replaced. A fresh chase render still shows sunset, four stars, cruisers, KESTREL-1, and the full HUD.

## Session 6 — screenshot scenes

`shots.js` — `applyShot` freezes `?shot=chase|onfoot|city|start&seed=1`. Chase is The Tide Job in a Solano Sprint (4 stars, three cruisers, KESTREL-1, Nia on the radio). On foot is Vesper Take on the Neon Strip with the crosshair, Strip SMG, two officers, and a cruiser. City is Coral Drop in the Sprint on Coral Shore under the aerial. Start stays the night title card.

Wheels sit inside the body. The helicopter rotor is a cross so it reads against the sky. `shots.json` is `1-chase.jpg`, `2-onfoot.jpg`, `3-city.jpg`, `4-start.jpg`. All four JPEGs are 1280×800 and under 256 KiB. Cover shows the causeway chase, the searchlight, and the full HUD.

## Next

1. If the left cruiser still clips the cover edge, nudge `stagePolice` chase unit 0 a little toward the lane.
2. Keep each source file one job. The judge only sees file names and the first declarations.
3. Cover stays `1-chase.jpg`. Do not put the menu on the chase shot.
