# Don't Spill the Tea

A phone game (iPhone + Android) that measures how steady your hand is using the phone's motion sensors.

Play: https://islam-sabra.github.io/la-tkob/

- `index.html` — the whole game (HTML/JS). Must be served over HTTPS for sensors to work.
- `supabase/functions/coach/` — optional AI coach powered by Claude.

## Sensors used
Gyroscope (tremor, turning), accelerometer (steps, bumps, drops), gravity (tilt, face-down), microphone (loud noise), touch, leaving the app. Output: synthesized sound effects and vibration.

## Desktop testing
Open `index.html`: mouse demo mode (move = tremor, click = step, scroll = loud noise). Tap the title 5 times to show live sensor readings.

## App stores
Wrap the same code with Capacitor:
npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init "Don't Spill the Tea" com.latkob.app --web-dir .
npx cap add ios && npx cap add android
