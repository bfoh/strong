"""Package only the Strong House integration; never walk environment or auth folders."""
from hashlib import sha256
from pathlib import Path
import json
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "production/house-v1"
EXACT = [
    "README.md", "package.json", "package-lock.json", "playwright.config.ts",
    "app/page.tsx", "app/layout.tsx", "app/admin/page.tsx", "app/admin/enquiries/page.tsx",
    "components/layout/SiteChrome.tsx", "tests/unit/house.test.ts",
    "tests/browser/house.spec.ts", "tests/browser/house-complete.spec.ts",
    "tests/browser/house-performance.spec.ts", "tests/browser/house-live.spec.ts",
    "tests/browser/house-homepage.spec.ts", "production/house-v1/previous-homepage.tsx.txt",
    "docs/HOUSE_HOMEPAGE_HANDOFF.md",
    "docs/concepts/interactive-homepage-v1/storyboard.md",
    "docs/concepts/interactive-homepage-v1/generation-prompts.json",
    "docs/concepts/interactive-homepage-v1/production-prompts.json",
    "docs/concepts/interactive-homepage-v1/asset-manifest.json",
]
FOLDERS = {
    "components/house": {".tsx"}, "lib/house": {".ts"},
    "app/preview/house": {".tsx", ".css"},
    "app/api/admin/house-settings": {".ts"},
    "app/api/admin/house-images": {".ts"},
    "app/api/house-enquiries": {".ts"}, "app/api/house-images": {".ts"},
    "scripts/house": {".mjs", ".py"},
    "public/images/house-v1": {".webp", ".jpg"},
    "docs/visual-verification/house-v1": {".json"},
}
# Representative captures; the complete screenshot set and original PNG sources
# remain in the workspace, outside the compact integration source package.
CAPTURES = [
    "checkpoint1/mobile-exterior.png", "checkpoint1/desktop-50.png",
    "checkpoint2/desktop-hallway.png", "checkpoint2/desktop-team.png",
    "checkpoint2/desktop-contact.png", "checkpoint2/mobile-gallery.png",
    "checkpoint2/mobile-entry-in-motion.png",
]
files = {ROOT / name for name in EXACT}
for folder, suffixes in FOLDERS.items():
    files.update(p for p in (ROOT / folder).rglob("*") if p.is_file() and p.suffix in suffixes)
files.update(ROOT / "docs/visual-verification/house-v1" / name for name in CAPTURES)
for file in files:
    relative = file.relative_to(ROOT)
    if not file.is_file() or file.is_symlink():
        raise RuntimeError(f"Missing or unsafe package input: {relative}")
    if any(part.startswith(".") or part in {"node_modules", "test-results"} for part in relative.parts):
        raise RuntimeError(f"Private package input: {relative}")

manifest = {
    "component": "Strong House Experience", "version": "1.0.1",
    "date": "2026-10-16", "status": "installed local draft; unpublished",
    "platform": "Existing Strong Properties Next.js application",
    "preview": "http://127.0.0.1:3000/",
    "standaloneApplication": False, "credentialsIncluded": False,
    "requiredExistingModules": [
        "staff authentication/roles", "property data and administration",
        "server Supabase client", "public lead handlers and validation",
        "origin/body/rate-limit helpers", "safe media processing",
        "existing fonts, global layout styles and project configuration",
    ],
    "notes": [
        "Merge modified layout and admin files intentionally into the existing app.",
        "Original PNG sources and complete browser captures remain in workspace docs.",
        "No environment files, customer records, tokens, auth traces or build output are included.",
    ],
    "files": [
        {"path": str(p.relative_to(ROOT)), "bytes": p.stat().st_size,
         "sha256": sha256(p.read_bytes()).hexdigest()}
        for p in sorted(files)
    ],
}
OUTPUT.mkdir(parents=True, exist_ok=True)
manifest_path = OUTPUT / "manifest.json"
manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
archive = OUTPUT / "strong-house-v1-source.zip"
with ZipFile(archive, "w", ZIP_DEFLATED, compresslevel=6) as package:
    for p in sorted(files):
        package.write(p, p.relative_to(ROOT))
    package.write(manifest_path, "production/house-v1/manifest.json")
with ZipFile(archive) as package:
    if package.testzip() is not None:
        raise RuntimeError("Package integrity check failed")
print(json.dumps({"package": str(archive.relative_to(ROOT)), "files": len(files) + 1,
                  "bytes": archive.stat().st_size, "integrity": "passed"}))
