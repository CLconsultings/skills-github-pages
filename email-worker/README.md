# Executive Quick Signal email delivery

This Worker supports the optional **Email me my results** flow for the Executive Quick Signal.

## Architecture

- The assessment remains client-side.
- The browser sends only the recipient email, optional participant/role/date, the five numeric responses, a Turnstile token, and a honeypot field when the user explicitly requests an email.
- The Worker recomputes the score server-side. It does not trust client-supplied score, band, interpretation, or HTML.
- Cloudflare Turnstile is required before delivery.
- Cloudflare rate-limiting bindings limit repeated sends by recipient and source IP.
- Resend performs transactional delivery.
- The Worker does not intentionally persist assessment submissions or recipient data.

Reference implementations and guidance used:
- `resend/resend-cloudflare-workers-example`
- `cloudflare/turnstile-demo-workers`
- `cloudflare/cloudflare-docs` Workers rate-limit binding documentation

## Fail-closed release state

The public client config at `/email-results-config.js` ships with:
- `enabled: false`
- blank endpoint
- blank Turnstile site key

Do not enable the client until all items below are complete.

## Required external setup

1. Verify `executiveaiconsulting.org` as a sending domain in Resend.
2. Confirm the SPF and DKIM records supplied by Resend are valid.
3. Review the domain's DMARC policy and add/update it only in a way compatible with existing mail.
4. Create a Cloudflare Turnstile widget restricted to:
   - `executiveaiconsulting.org`
   - `www.executiveaiconsulting.org`
5. Create these repository secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `RESEND_API_KEY`
   - `TURNSTILE_SECRET_KEY`
   - `RATE_LIMIT_SALT`
6. Confirm rate-limit namespace IDs `2701490` and `2701491` are unused in the Cloudflare account. Change them if needed.
7. Run the manual deployment workflow.
8. Put the deployed Worker endpoint and public Turnstile site key into `email-results-config.js`.
9. Change `enabled` to `true`.
10. Test successful and failed delivery, mobile layout, invalid emails, repeated sends, and at least Gmail and Outlook inbox placement before release.

## Local scoring tests

```bash
node --test email-worker/test/*.test.mjs
```

For local Worker development, copy `.dev.vars.example` to `.dev.vars` and use test-only credentials. Never commit real secrets.

## Privacy boundary

The Worker should not log recipient email addresses, assessment answers, participant names, or roles. Cloudflare and Resend may still process request/delivery metadata under their own terms and retention practices. Keep the public privacy notice synchronized with released behavior.

## Rollback

Set `enabled: false` in `email-results-config.js` first. This removes the public send path without changing the assessment itself. The Worker can then be disabled or rolled back separately.
