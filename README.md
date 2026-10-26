# dsh-wuji (Wuji, phase 1)

A DeepSeek Harness plugin from the Changjie tree-system: **memory folding, persona adjudication, soft-pack protocol**. (Chinese README: [README.zh.md](README.zh.md))

- **Folding (Six-Realms store)** 鈥?turns land as leaves; at fold points, peaks become trauma anchors, unresolved hooks become hollow branches, chatter composts into warmth, extremes are sealed as hashes only, oaths are welded forever. Zero deps: `node:sqlite`.
- **Adjudication (Three-Corpses dice)** 鈥?reason / emotion / instinct roll locally against the persona's base weights, weather-corrected; verdicts are emitted as a *single in-scene state line*, never as a report.
- **Soft-pack** 鈥?when the character cannot go on, she goes silent, shifts the camera, or lands on the aftertaste. No cross-layer vocabulary anywhere, by design.

**Honest boundary:** this plugin does not promise to bypass any network or filter. It promises only that in the moment something cannot be said, you hear *a person's silence*, not a helpdesk's boilerplate.

Requires Node >= 22.6. Install as a dsh bundle (Add plugin -> local bundle) to get service `dsh-wuji` (DB at `$DSH_HOME/wuji/wuji.db`) and preset `wuji`. `npm test` runs the suite in-memory.

Charter texts (Mi-Wo-Jing et al.) 漏 the project owner, redistributed verbatim; code MIT.

*"Cut the mountain, bridge the sea; sooner or later, all roads meet."*
