# Motion Party

Phone games you play with your whole body. The phone's sensors check every step, turn, jump and squat.

Play: https://islam-sabra.github.io/la-tkob/

## Games
- **Don't Spill the Tea**: carry a full glass through real-life scenes (walk, turn, squat) without spilling.
- **Simon Says**: do the move only when Simon says. The phone verifies each move.
- **Waiter Rush**: a tray of three teas through an obstacle course, timed.

Plus Party mode (pass the phone) and a Sensor Lab for tuning detection on a real device.

## Code
- `js/core.js`: movement engine (step, jump, down/up, turn, shake, flip, stillness), sound effects, glass renderer, steadiness analysis.
- `js/games.js`: characters, command runner, the three games and their levels.
- `js/app.js`: hub, play loop, results, party mode, Sensor Lab.
- `supabase/functions/coach/`: optional AI coach (Claude).

Sensors need HTTPS. On desktop the game runs in demo mode: W step, J jump, S squat, U up, T turn, K shake, F flip, mouse = hand shake.

## App stores
Wrap with Capacitor: `npx cap init "Motion Party" com.motionparty.app --web-dir .` then `npx cap add ios` / `android`.
