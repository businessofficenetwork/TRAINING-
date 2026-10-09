# Workshop registration site

A registration page, thank-you page, and privacy page for Netlify. Sign-ups go straight into Systeme.io with tags, so Systeme sends the emails.

```
site/                       the website (what visitors see)
  index.html                registration page
  thank-you.html            shown after someone registers
  privacy.html              privacy policy (fill in the brackets)
  config.js                 settings: contact email, Meta Pixel ID, Zoom links
  styles.css, app.js        look and behavior; you shouldn't need to touch these
  img/                      add host.jpg (your photo) and share.jpg (link preview)
netlify/functions/
  register.mjs              sends each sign-up to Systeme and adds the tags
netlify.toml                tells Netlify where everything is
```

## 1. Systeme.io (10 minutes)

1. **API key:** Settings → MCP & API keys → Public API keys → Create. Leave Expiration empty. Copy the key right away; Systeme only shows it once.
2. **Tags:** create these six tags, spelled exactly like this:
   `workshop-registered`, `workshop-oct22`, `workshop-oct27`, `role-owner`, `role-staff`, `role-other`.
   (The site creates any that are missing, but you need them to exist to build automations.)
3. **Automations:** add one rule per date.
   - Trigger: tag added `workshop-oct22` → Action: send the Oct 22 confirmation email
   - Trigger: tag added `workshop-oct27` → Action: send the Oct 27 confirmation email
   - Reminder emails go out as broadcasts to each date's tag.

## 2. Put it on Netlify

Drag-and-drop deploys **won't** run the Systeme connector. Use GitHub:

1. Create a new GitHub repository and upload everything in this folder (keep the folder structure).
2. Netlify → Add new site → Import an existing project → pick the repository. Leave the build command empty; `netlify.toml` already sets the rest. Deploy.
3. Netlify → Site configuration → Environment variables → Add a variable:
   - Key: `SYSTEME_API_KEY`
   - Value: the key from step 1
4. Deploys → Trigger deploy, so the site picks up the key.

## 3. Fill in your details

- Search every file in `site/` for `[` and replace each bracketed placeholder.
- `site/config.js`: your contact email, Zoom link for each date, Meta Pixel ID (optional).
- `site/img/host.jpg`: your photo, portrait, about 800×1000.
- `site/img/share.jpg`: 1200×630 image that shows when the link is shared on Facebook.
- If a date or time ever changes, update it in `index.html` **and** `config.js`.

## 4. Test before any ad goes live

1. Register with your own email for **each** date.
2. In Systeme → Contacts: you should appear with `workshop-registered`, your role tag, and the date tag.
3. Check that the confirmation email arrives and the calendar buttons on the thank-you page work.
4. If registration shows an error: Netlify → Logs → Functions → `register`. The reason is logged there, and so is the person's name, email, and date, so no sign-up is ever lost.

## Meta Pixel

Put your Pixel ID in `config.js`. The site sends `PageView` on every page and `Lead` on the thank-you page. Use `Lead` as the conversion event when you set up the ads.
