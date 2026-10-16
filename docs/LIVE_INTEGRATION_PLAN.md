# Live Supabase integration

1. Move credentials to ignored `.env.local` and sanitise the example. Verify key roles without logging values; inspect available Git history for exposure.
2. Read the real REST schema, required tables, Auth/staff correspondence and buckets. Preserve existing models and data.
3. Harden staff routes, session validation, property input and request idempotency/rate limiting.
4. Add private Storage, validated/optimised staff uploads, gallery ordering/replacement/deletion and a publication-aware streaming endpoint. Keep all documents private.
5. Exercise real Auth, draft/edit/publish/update/unpublish, enquiry and viewing persistence, status management, media and anonymous access with scoped disposable fixtures. Clean only created test IDs/objects.
6. Run static/build/unit/browser checks, scan client output for secret leakage, and write a live-only results report. Password-login verification depends on local test credentials, never credentials pasted in chat.

No site redesign. No existing table/data deletion. New SQL, if needed for atomic quotas/storage defence, is versioned and additive.
