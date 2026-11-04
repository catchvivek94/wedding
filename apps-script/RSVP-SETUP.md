# RSVP and Attendees

The private Google Sheet is the database for name search, household invitations, attendance, and the host's Attendees page. The website does not contain the guest list or Google credentials.

## Sheet structure

- **Households:** Household ID, Household name, Active (checkbox).
- **Guests:** Guest ID, Full name, Household ID, Day One invited (checkbox), Day Two invited (checkbox), Search aliases (comma-separated).
- **RSVPs:** Guest ID, Day One attendance, Day Two attendance, Updated at.

Keep IDs unique and stable. Use `attending`, `not_attending`, or `undecided` for attendance; `Pending` or a blank means no response. Add new invitees to Guests and Households. RSVP rows are created or updated when guests respond.

## Backend

`RSVP.gs` belongs to its **own** Apps Script project. Do not paste it into the existing kurta script (`Code.gs`); both define `doGet` and `doPost`.

1. In Script Properties, set `RSVP_SHEET_ID` to the private spreadsheet ID, or create the script from the Sheet’s Extensions menu.
2. In Script Properties, set `RSVP_ADMIN_EMAILS` to a JSON array of confirmed host account emails. Keep these values out of the public repository.
3. Run `setupRsvp` once and authorize the script. It creates a persistent signing secret in Script Properties.
4. Deploy a Web app, execute as the owner, access Anyone. This setting is needed for invited guests without Google accounts. The Sheet itself must remain private.
5. Set `WEDDING_RSVP_ENDPOINT` in `assets/js/rsvp-api.js` to the returned `/exec` URL. The endpoint URL is public and is not a secret.

Updating backend source requires a new deployment version of the existing Web app. Keep the same deployment URL. Do not delete the signing secret unless intentionally invalidating all guest sessions.

## Host access

`attendees.html` uses the management site's existing Supabase sign-in. The backend verifies the session with the configured Supabase project's `/auth/v1/user` endpoint and checks the email allowlist before returning the complete list. Guests' name-selection tokens do not grant host access. Adding a host requires updating the allowlist and deploying a new backend version.

Attendees refreshes every 15 seconds while visible, on focus, or on Refresh. Its CSV export includes the current filter. RSVP writes update existing guest rows and use a script lock to serialize writes.

The name gate intentionally checks membership rather than proving identity. A person who knows an invited name can select it, as agreed. Searches require three letters and return up to six matches.

## Local preview

The local server under `rsvp-local` proxies the same production API over HTTPS. Local and published RSVP interfaces therefore write the same private Sheet after the endpoint is configured. Avoid test submissions once the real guest list is loaded.
