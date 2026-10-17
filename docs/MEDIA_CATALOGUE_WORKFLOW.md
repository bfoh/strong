# Private property-media workflow

The existing catalogue, navigation and homepage remain the application. Supplied source descriptions are **proposals** until checked. Importing never publishes a listing or copies proposed prices, bedroom counts, availability, rights or documentation into verified property fields.

Production status, 17 October 2026: the owner-approved launch and private-review migrations are applied. Twelve candidates remain private and unapproved; none is published. See [the migration receipt](visual-verification/ghana-launch/database-migrations.json) and [current launch handoff](GHANA_LAUNCH_HANDOFF.md). The migration requirement below remains applicable to any new environment.

## Prepare a batch

Keep the ZIP and extracted material outside the public repository (for example, the sibling `property-media` directory). Never put an unreviewed archive, manifest, contact sheet or video under `public/`. These directories are ignored if placed inside the repository.

1. Run `python3 scripts/catalogue/inspect-archive.py /path/to/archive.zip /path/to/property-media`. This rejects unsafe paths and symlinks, retains the originals unchanged, validates manifest coverage, and records SHA-256 checksums and exact duplicates.
2. On macOS, run `swift scripts/catalogue/extract-video-frames.swift /path/to/property-media/audit.json /path/to/property-media/review > /path/to/property-media/videos.jsonl` after creating the `review` directory. The system media decoder produces faithful samples at 2%, 25%, 50% and 75%; it does not enhance or replace the footage. Media-service permission may be required by the local sandbox. Review the actual videos whenever samples do not establish identity.
3. Visually inspect all photographs and the video samples. Preserve the original manifest grouping, and record corrections as notes. Similar neighbourhoods, colours or finishes do not establish a shared property. An exact duplicate retains two source filenames but gets one gallery entry.
4. Create a **private** `curation.json` with `groups`, `assetNotes`, and `missingDescriptions`. Every group must specify `sourceMediaGroup`, a private candidate `title`, `proposed: {location,city,beds,price,currency:"GHS"}` (unknowns are null), `assigned` (audit source IDs), `cover` (`{sourceId,frame?}` or null), and `notes`. Use an empty assignment and null cover for unresolved groups. Asset notes are a map of audit source IDs to notes. No example source identities are committed here.
5. Dry run: `node --import tsx scripts/catalogue/import-media.ts --source /path/to/property-media --curation /path/to/curation.json`. Inspect the generated private `review-manifest.json`. No backend credentials are needed for preparation.
6. Apply using the existing **server-only** environment, outside git: `node --env-file=/secure/path/production.env --import tsx scripts/catalogue/import-media.ts --source /path/to/property-media --curation /path/to/curation.json --apply`.

The importer uses stable IDs, private buckets, byte checksums and a completion marker. It refuses cross-batch overlapping originals and conflicting IDs. Interrupted imports can resume. A completed batch is a no-op on subsequent runs, preserving staff edits and review decisions. Upload errors never cause a property to publish. Originals are retained in `strong-media-review`; website WebP images and original MP4 tours use the existing private managed-media bucket. Video posters are small, faithful stills. Full videos are absent from catalogue cards and detail players use `preload="none"`.

## Later identification evidence

Additional screenshots are stored separately from the baseline manifest in a private `supplemental-evidence.json`, validated by `supplementalEvidenceSchema`. They never change verified property facts automatically.

When new evidence identifies an original from an unassigned group, use `scripts/catalogue/add-candidate.ts --plan /private/addendum.json` for a dry run and append `--apply` to create the separately supported draft. Load the existing server-only environment as above. The plan specifies the batch and unassigned source group IDs, a stable candidate key, title, selected audit source IDs, cover sample, proposed facts, evidence, remaining-group notes and any resolved missing-description strings. The script retains a baseline snapshot, preserves original folder provenance, splits only the selected originals, assigns stable IDs, and records an addendum receipt. Existing property records are never rewritten. A completed addendum is a no-op on replay.

## Review and publication

- Editors, managers and administrators can open `/admin/media-review`. Agents and anonymous visitors cannot access the report, originals, thumbnails or frames.
- The report preserves the supplied confidence, group, filename, matching notes, duplicate links, missing descriptions, proposed source details and later visual exceptions. These never enter public property props or pages.
- Each supported candidate gets a **draft**, with unknown verified facts left null. Unsupported groups remain unassigned rather than becoming speculative listings.
- Use the private draft preview to inspect the uncropped gallery and playable tour. Correct verified details in the existing editor. Review every media item, resolve conflicts with the owner, then record evidence using **Save media identity confirmation**.
- Confirmation is audited and binds to the exact media IDs, versions, captions and ordering. A stale form is rejected; later gallery edits invalidate confirmation and hide the listing until rechecked. Media identity confirmation does not publish the draft or confirm its price, rights or current availability.
- The normal publication review still requires the Ghana launch migration, structured confirmed location/type, approved review, available status and genuine permission. The launch SQL in `supabase/migrations/20261016_ghana_launch.sql` and the additive review-bucket restriction in `supabase/migrations/20261017_media_review_private.sql` must be applied by a database operator; REST credentials cannot execute it.
- Public queries and the media proxy exclude unresolved imported candidates, even if a status is accidentally changed. Private source objects always remain private after publication; public delivery uses the authorized managed-media proxy.

## Verification

Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`. The unit suite checks manifest coverage/group ownership, duplicate constraints, Ghana pricing, ten-bedroom filters, review invalidation and fail-closed private gates.

`node --env-file=/secure/path/production.env scripts/verify-media-catalogue.mjs` verifies the actual private batch and database using `MEDIA_QA_BASE_URL` (default `http://127.0.0.1:3001`) and `MEDIA_QA_SOURCE` (the private working directory). It authenticates the existing administrator without sending email, checks staff previews, anonymous denials, image decoding and real video playback, and signs out the temporary session. It does not approve identities, publish stock, send enquiries or change real listing data. Reports and private screenshots stay in the private working directory.

Public catalogue layout, gallery, WhatsApp URLs and filter behaviour are tested locally with explicitly labelled synthetic fixtures, never by publishing fake stock to production.
