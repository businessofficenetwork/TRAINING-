# Workshop registration site

Registration page, thank-you page, and privacy page, hosted on Netlify. Each sign-up goes straight into MailerLite, in the group for the evening they picked. Joining the group triggers that evening's confirmation email.

Live site: https://roofingofficeworkshop.netlify.app

```
site/                       the website (what visitors see)
  index.html                registration page
  thank-you.html            shown after someone registers
  privacy.html              privacy policy
  config.js                 settings: contact email, Meta Pixel ID, Zoom links, calendar times
  styles.css                look; colors are set once at the top
  app.js                    form and thank-you page behavior
  img/host.jpg              host photo
  img/share.jpg             image shown when the link is shared on Facebook
netlify/functions/
  register.mjs              adds each sign-up to MailerLite (name, role, date group)
netlify.toml                tells Netlify where everything is
```

## MailerLite

- Groups: **Workshop - Oct 22** and **Workshop - Oct 27**. Their IDs are in `netlify/functions/register.mjs`.
  If a group is deleted and recreated, update its ID there.
- Custom field: **Role** (`owner`, `staff`, or `other`). First name goes in the **Name** field.
- Confirmation emails: one automation per group, triggered when a subscriber joins that group.
- Reminders, replay, and course offer: campaigns scheduled to one or both groups.

## Netlify setting

Site configuration → Environment variables:

- `MAILERLITE_API_KEY`: from MailerLite → Integrations → MailerLite API → Generate new token.
  After adding or changing it, go to Deploys → Trigger deploy.
- `SYSTEME_API_KEY` is no longer used and can be deleted.

## Making changes

Edit a file on GitHub (pencil icon) and commit. Netlify republishes in about a minute.
If a date or time changes, update it in `index.html` **and** `config.js`.
After changing the share image or page title, re-scrape the link at
https://developers.facebook.com/tools/debug/ so Facebook shows the new version.

## Test before any ad goes live

1. Register on the live site for each date with an email you can check (not the MailerLite account email).
2. In MailerLite → Subscribers, you should appear in the right group with Name and Role filled in.
3. The confirmation email should arrive, and the calendar buttons on the thank-you page should work.
4. If the form shows an error: Netlify → Logs → Functions → `register`. The reason is logged there,
   along with the person's name, email, and date, so no sign-up is lost.

## Meta Pixel

Put the Pixel ID in `config.js`. The site sends `PageView` on every page and `Lead` on the thank-you page.
Use `Lead` as the conversion event for the ads.
