# Kurta storage decision

Google Sheet `Wedding Kurta Shopping` is the single shared source of truth.
The user chose to edit in Google Sheet and publish automatic site refreshes.
The site reads on load, when returning to the tab and every visible minute.
The deployed service rejects all writes. See [SETUP-GSHEET.md](SETUP-GSHEET.md).

## Existing architecture reviewed

`Store` writes portal JSON to localStorage and queues `Sync.schedulePush()`.
`Sync` upserts every configured collection as a whole JSON row. Kurta selections
were absent from its allowlist; first sync pushes local collections before
pulling remote data. This is unsuitable for concurrent per-member selection
editing. The kurta page does not initialize this Sync or mirror Sheet data into
Supabase. Other portal pages retain their existing storage behavior.

Legacy drafts and original stored selections remain intact, but cannot override
live or fallback Sheet data on the configured public page. A failed read shows
an explicit status and keeps the last displayed data. Both alternatives remain
visible where the Sheet has not finalized a single choice.

## Placeholder cleanup

New browsers no longer receive starter tasks, budgets, guests or other fabricated
records. Unchanged legacy starter rows are hidden without deleting underlying
records; edited records and newly added data remain visible. Historical planner
research remains in the archive. Empty navigation and dashboard sections are hidden.
