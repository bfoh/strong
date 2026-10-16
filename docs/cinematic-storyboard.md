# Storyboard and camera keyframes

Exact machine-readable keys: [shot.json](../production/cinematic/shot.json). Both preview and Blender use time-weighted cubic Hermite interpolation of position and look target. Positions are metres, Y up. Each curve is continuous in position and first derivative. This mathematical property is not proof that a future imported model is collision-free or that its shot is visually approved.

| Progress | Shot intention | Position | Look target |
|---|---|---|---|
| 0 | Intimate limestone detail; glance along the wall | -7.25,1.65,-7.5 | -6.8,1.7,-4.2 |
| 15% | Enter covered passage; columns establish depth | -6.5,1.7,-5.8 | -5.4,1.7,-1.3 |
| 35% | Exit passage towards courtyard | -4.7,1.75,-1.3 | 0,1.5,2.5 |
| 60% | Residence and reflecting pool revealed | 2.5,2.6,10.8 | 0,1.6,-3 |
| 85% | Rise and pull back | 11,7.5,16 | 0,1.5,-3 |
| 100% | Settle into wide view; property discovery follows | 13,8.6,19 | 0,1.5,-3 |

Stages: Arrival0–15%, Passage15–35%, Reveal35–60%, Ascent60–85%, Transition85–100%. No abrupt cuts. Exterior camera motion follows a virtual crane/dolly rather than pretending to be a handheld walking shot throughout.

Copy is sparse and follows the same normalized scroll value: “Space for What Comes Next.” near the start; “Built on Strong Foundations.” during reveal; “Discover Your Next Opportunity.” near the transition. Opacity and vertical masking protect the architecture. Stage controls and “Skip to Properties” use native page scrolling; no autoplay or scroll hijacking.

The temporary72-frame masters represent the same10-second path at7.2fps solely to validate player mechanics. They are expressly not the final24fps film. First,25%,50%,75%,last source stills and actual browser frames are kept in `docs/visual-verification/cinematic-v3/`.
