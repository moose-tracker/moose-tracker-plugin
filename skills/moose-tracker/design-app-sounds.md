# Design app-specific sounds with sfx

For a brief like "make satisfying, app-specific sounds for this UI". Recipes are starting points, not a ceiling. Aim for one request, one render and at most one targeted revision.

1. **Read the guidance once.** `describe(topic="sfx")` has a worked example, the pairs idea and what each parameter does. Skip other topics unless you need them.
2. **Choose a palette and a few purposeful settings.** One `style` for the whole set (for example `clean`). For each interaction pick a recipe and set only what expresses its purpose:
   - `spec.pitch` -24..24 semitones (12 = octave; lower is heavier, higher lighter)
   - `spec.bright` -50..50 (dull to bright)
   - `dur` seconds (short is snappy)
   - `seed` 0..9999 (0 is the plain recipe; others vary it repeatably)
3. **Keep pairs recognizable.** press low and short, release a little higher and brighter; toggle_on rises and toggle_off falls; success rises and brightens, warning falls and dulls.
4. **Send one request** with all the items (up to 16), then read `design_mode` in the result: `stock` (nothing changed), `varied` (tailored), `custom` (your own notes or an instrument) or `mixed`. Tell the user which it is. A stock-only result carries one optional suggestion; it never blocks the render.
5. **Revise, do not start over.** If a single option fails (a zip, a format), fix only that option and resend the same items with their pitch, bright, dur and seed intact. To change one sound, use `revise` with a family handle, or resend the same items with one changed; unchanged sounds are reused, not rendered again.

Example (a coherent button set):

```json
{"style":"clean","items":[
 {"name":"press","recipe":"click","spec":{"pitch":-2,"bright":10},"dur":0.08},
 {"name":"release","recipe":"click","spec":{"pitch":3,"bright":20},"dur":0.06},
 {"name":"toggle_on","recipe":"blip","spec":{"pitch":5}},
 {"name":"toggle_off","recipe":"blip","spec":{"pitch":-5}},
 {"name":"success","recipe":"coin","spec":{"pitch":4,"bright":15}},
 {"name":"warning","recipe":"hit","spec":{"pitch":-7,"bright":-10}}]}
```

Honest labels: the synthesizer is deterministic, so the same settings make the same sound for anyone. A seed is reproducibility, not exclusivity. Never describe a result as unique to the user.
