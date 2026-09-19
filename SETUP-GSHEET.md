# Wedding Kurta Shopping: automatic Sheet reads

Edit selections in [Wedding Kurta Shopping](https://docs.google.com/spreadsheets/d/1hmqgzqWfTX95TDVx_oNQt0JDQs217eEfZZem3b1UWdM/edit).
The website is read-only. No separate wedding-site login is needed for kurtas.

The page refreshes on load, when returning to the tab, on Refresh Sheet, and
once per minute while visible. There is no scheduled daily batch and no work
runs while nobody has the page open. Browser throttling, network failures and
Apps Script quotas can delay refreshes. Failed reads keep the last displayed
data and show an error; the initial fallback snapshot is dated 19 September 2026.

## Architecture

The Sheet is the only authority for roster, sizes, selected links, ordered status,
and the sample shortlist. `apps-script/Code.gs` reads only the configured
spreadsheet and returns these fields. All POST requests are rejected. This
service has no write operation, Supabase login, or mirrored selection database.
The separate existing portal collection sync is not initialized on this page.
Legacy browser drafts are retained but never override the Sheet.

The public endpoint exposes the names, sizes, picks and samples intended for the
public wedding website. It does not expose other spreadsheets or unrelated tabs.
Do not add private information to these public-facing fields.

## Deployment

Project: https://script.google.com/home/projects/1Q3gPHARdUMnqt72CoPmajDu6KRIsv5VkgnjoHVp3EKQTFXQK8w_kWoga/edit

Copy `apps-script/Code.gs` into this project. Deploy as a web app executing as the
Sheet owner, with access set to Anyone. Put the `/exec` URL in
`KURTA_SHEET_ENDPOINT` in `assets/js/config.js`. To update server code, save it,
then Manage deployments → Edit → New version → Deploy, retaining the same URL.
No script properties or Supabase credentials are required by this read-only service.

Sheet headers are validated. Finalized Picks uses A:G with the existing numeric
IDs, names, sizes, links, ordered flag, and alternative link column. Samples are
read below row 4 of Sample Options. TBD members are omitted, duplicate identical
links are collapsed, and alternatives remain visible without picking a winner.
Known photos are mapped in `kurta-photos.js`; new links can sync without a photo.

## Verification

Run `node tests/sheet-service.cjs`. Tests cover roster reads, placeholder filtering,
URL deduplication, alternatives, schema validation and rejection of all writes.
Live browser verification must additionally confirm cross-origin Sheet reads.
