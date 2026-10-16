# Strong Properties — interactive house homepage concept v1

Date: 15 October 2026
Status: User approved this concept with “approved” on 15 October 2026. Implemented as a private local draft in the existing app. Publication remains unauthorized. See docs/HOUSE_HOMEPAGE_HANDOFF.md for the final implementation and verification.

## Established brief
- Business: Strong Properties; land, residential and commercial property in Kumasi, Ghana.
- Main path: property browsing, then viewing requests or enquiries.
- New visual direction; ivory and gold retained.
- Asset choice C: assistant generates imagery and logo.
- Storyboard choice B: user supplied the sequence.
- User journey: fullscreen exterior; desktop scroll into house; hallway with three doors/buttons for Listings, Our Team, Contact Us; click to visually enter each high-end residential room; always return to hallway.
- Listings: property information, then a fullscreen exterior-angle viewer with return navigation.
- Team: smiling professional at far end of consultation table, skill/award content.
- Contact: residential business signing lounge; contract-inspired enquiry form.
- One homepage. The property viewer is a state within that homepage. Preserve existing app, listing routes, administration, authentication and enquiry/viewing infrastructure.
- New work remains private/draft. Publication has not been authorized.

## Art direction and logo
Photographic, warm contemporary tropical residence. Ivory limestone, walnut, muted champagne brass, cream upholstery, late-afternoon natural light. Elegant serif headings, simple readable body type. Proposed SP monogram plus STRONG / PROPERTIES wordmark. Existing brand components remain untouched during concept review.

## States
1. Exterior: fullscreen house, business offering/location in editable text, View Listings and Contact actions, direct navigation, Skip Animation / View Content and motion-off control. Desktop scroll performs the approach. Phones get an optional Explore the House tap.
2. Hallway: three open walnut doorways; buttons below corresponding doors, Listings left, Our Team centre, Contact Us right. A stable composition for choosing; scrolling alone never chooses a room.
3. Listings room: cream sofa consultation lounge with property images. After room entry completes, readable editable property cards appear. Provide Land / Residential / Commercial filters and details for location, type, bedrooms/bathrooms, floor and plot area, parking, features, documentation, price and availability where applicable. Demo content is conspicuously labelled and does not enter live inventory. Unknown genuine values remain pending.
4. Property viewer: selecting a house opens a new fullscreen view in the same homepage. Property title, key facts, full exterior image, nearby angle controls and Back to Listings. Plan six discrete angles: front, front-left, left, rear, right, front-right. Photo fit preserves essential details; no claimed continuous 360 or invented visibility. Buttons, keyboard arrows and optional horizontal swipes change photos with an approximately 200ms fade. Enquire / request viewing stays accessible. Demo property uses Enquire about a similar property. Back restores listing selection/scroll position; Back to Hallway is also available.
5. Team room: professional seated smiling at far end of walnut table in residential lounge. Editable biography and expertise, space for verified awards. Generated man is explicitly an illustrative stand-in, not the owner's likeness or a genuine employee. Trophies are illustrative props; real award names and credentials pending. Contact and Back to Hallway remain accessible.
6. Contact room: signing table, cream paper, pen, walnut business desk and residential lounge. Form visually resembles a refined document and is titled Property Enquiry. Labelled name, preferred contact method/details, optional property/interest and message; essential information only. Submission requests contact and is not a purchase/reservation action. Use existing server validation and enquiry storage. Verify actual storage and notification configuration before claiming delivery. Show observed success/errors; preserve entered values, selected property and room return path.

## Proposed desktop scroll timeline
Finite 2.4 viewport heights of scroll travel; stage height 1 viewport, total wrapper 3.4 viewport heights. For a 900px-tall viewport: travel 2160px and wrapper 3060px. One viewport of scroll is approximately 41.7% progress, with nonuniform apparent movement depending on stage.
- 0–16%: house approach begins; hero copy recedes, central entrance stays fixed.
- 16–48%: move to porch with matched closer exterior plates; entry becomes the focal point.
- 48–76%: cross the open front threshold; aligned jamb, floor and lighting carry into interior plates.
- 76–94%: settle and open the field of view toward the three-door hallway.
- 94–100%: hold arrival composition; reveal door labels/buttons at completed arrival.
Pin only through this finite exterior-to-hall sequence. Stop holds the current state; reverse scroll retraces it. At the end, ordinary content scrolling resumes. No global wheel/touch cancellation. High-resolution intermediate plates replace excessively enlarged wide images; provisional per-plate scale cap 1.65x. Reassess only after visual proof.

## Proposed desktop click transition
Approximately 900ms to enter a room: first 20% centre selected doorway; 20–75% traverse matching open threshold using masks and interior/near-threshold plates; final 25% settle on destination. Reveal destination body after visual arrival. Each room needs its own correctly matched near/far doorway plates. Return reverses the route and restores focus to its button. Door leaf animation is not promised; doors are already open.

During click movement, browser Back/Escape returns to the previous stable state. A new direct navigation selection interrupts and goes to the requested destination; no input trap. No intro replay on return. Form and reading state preserved. Keyboard can activate all doors; focus moves to destination heading after a user-triggered arrival. Inactive destinations leave focus/accessibility navigation. Direct anchors expose content immediately.

## Independent phone experience
Exterior first screen includes purpose/location plus View Listings and Contact, with optional Explore the House. No required cinematic scroll, pinning, scrub, giant zoom or doorway mask. Explore opens a compact hallway preview with three clearly labelled room cards/buttons. Tap transitions use a proposed 300ms fade/small movement, both in and out. Use cropped doorway cards rather than forcing tiny controls under a full-width three-door scene. Room destinations lead with short preview, useful content and primary action; ordinary reading scroll remains available. Gallery photo/angle/return controls stay together. Keep vertical page scroll usable. Respect safe areas, short/landscape screens, text enlargement, keyboard and touch target spacing. Reduced motion is immediate from first render with no pinning; motion-off is available on desktop/mobile.

## Asset status and continuity review
This section records the concept-stage assessment. For delivered assets, actual camera behavior, browser results and known limits, use [the implementation handoff](../../HOUSE_HOMEPAGE_HANDOFF.md). The delivered mask composition uses the room photographs directly in the hallway openings; no separate porch/near-threshold film sequence was produced.

Seven generated concept references exist: exterior, hallway, listings lounge, exterior gallery, team lounge, contact lounge and logo. Generated using the built-in image_gen tool; prompts saved in generation-prompts.json.
These are appearance references, not proven continuity plates. The exterior's visible long axial hall has not yet been matched to the three-door foyer. Furniture and framing change between foyer previews and room references; production must reconcile these. The rear/side exterior is an illustrative extrapolation, not a verified reconstruction of the front. No transition playback or browser QA has occurred.
After concept approval: lock house plan, regenerate inconsistent views as needed, prepare porch/threshold/interior intermediate plates and masks, reconcile all room entry/arrival pairs, produce remaining exterior angles, create mobile crops and responsive compressed formats, recreate approved logo as a crisp small-size asset. Review adjacent-frame alignment before browser interaction proof.

## Implementation and verification after approval
Keep homepage in the existing Next.js app. Editable content stays separate from photographic scene layers and uses existing property/enquiry data paths where appropriate. Essential offering, location, headings and actions are in initial HTML; direct content remains usable if motion fails.
Proposed initial mobile imagery budget around 1MB or less, with desktop transition assets not fetched on phones and additional gallery assets deferred. Prioritize hero image, explicit dimensions, responsive formats and lazy offscreen images.
Two browser checkpoints: first exterior/hall/room transition plus mobile first screen/direct action; then completed journey/returns/browser Back/keyboard/reduced motion/narrow and short phones/landscape/forms/metadata/HTML/image delivery and available lab measurements. No lab or field performance results exist for this proposed experience yet.
Verify current official Google and WCAG implementation references at build time. No ranking, indexing, compliance or performance certification claims.
Keep current working preview intact and do not publish without current-project authorization.

## Current conversation stage
Concept approved. Implementation and verification are recorded in docs/HOUSE_HOMEPAGE_HANDOFF.md. Do not ask for the same concept approval again. After the user's request to proceed, the house experience is assigned to the local homepage with the preview URL retained. It remains loopback-only and noindex; the live hosting target has been requested and no public deployment has occurred.
