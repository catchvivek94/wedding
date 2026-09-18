# Kurta selections: storage decision

The Google Sheet `Wedding Kurta Shopping` is the authoritative shared record.
The current page displays a dated read-only snapshot and stores optional drafts
under `weddingKurta.drafts.v1` in this browser. Drafts never claim to update the
Sheet. The page links to the Sheet for shared edits. Product links are labelled
by website (Myntra, Ajio, Nykaa, or the actual hostname).

## Existing architecture reviewed

`Store` writes the portal JSON to localStorage and queues `Sync.schedulePush()`.
`Sync` upserts every configured collection as a whole JSON row. `kurtaSelections`
was absent from its allowlist, so the original PR's cloud-save claim was wrong.
First sync pushes local collections before pulling remote data. Subsequent pulls
can overwrite local work, and pushes include unchanged collections. This is not
safe for concurrent per-member kurta editing. The schema authorizes all signed-in
users across collections, rather than restricting each person to their selection.

The kurta page intentionally does not initialize Sync; existing portal pages retain
it. Legacy local kurta selections remain intact and can be shown as browser drafts.
The current sheet snapshot uses the sheet's numeric IDs, including distinct IDs
for the two unnamed members. Repeated identical URLs are deduplicated for display;
Sammy's two alternatives remain visible without treating either as finalized.
No sheet cells were changed during implementation.

## Intended direct-update service

Use a dedicated authenticated backend for Sheet reads and writes. Keep Sheets as
the only shared selection store; Supabase may provide identity but must not mirror
selection writes into the collections table. Validate identity and an explicit
member/editor allowlist on the server; do not use a public browser PIN or ship
Google credentials. Restrict operations to the configured spreadsheet, known
member ID, and allowed selection fields. Reject formula input and non-http(s) URLs.

Serialize site writes, read the current row, compare a revision supplied by the
client, and update only that member's allowed cells. Return conflicts for review
rather than overwriting a changed selection. Google Sheets has no general atomic
compare-and-swap for concurrent manual edits: protect the website-managed ranges
and route selection writes through the service before claiming conflict safety.
Keep an audit history and show confirmed server saves separately from local drafts.

Deployment needs the backend, server-side Google access, editor permissions, and
an agreed mapping for the existing sheet columns. The current sheet has #, Member,
Size, Finalized Link, Ordered?, plus Sammy's OR/alternative cells; these must not be
overwritten as if they were a standardized Notes column. Live integration is not
enabled by this PR and the UI states this explicitly.

## Verification

Browser-tested locally: current 23-member roster, six samples, three unambiguous
finalized picks, both Sammy alternatives, sample assignment, save/reload,
size filter, and unsafe-URL rejection. Planner research and stored data retained.
