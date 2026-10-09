// Registration connector: website form -> Systeme.io.
//
// For each sign-up it:
//   1. creates the contact in Systeme (or finds them if they already exist)
//   2. adds tags: role-..., workshop-registered, then workshop-oct22 / workshop-oct27
//      (the date tag goes last, so a "tag added" automation fires after the others are on)
//
// Needs one Netlify environment variable: SYSTEME_API_KEY
// Tags are created in Systeme automatically if they don't exist yet.

const API = "https://api.systeme.io/api";

const DATE_TAGS = { oct22: "workshop-oct22", oct27: "workshop-oct27" };
const ROLE_TAGS = { owner: "role-owner", staff: "role-staff", other: "role-other" };
const ALL_TAG = "workshop-registered";

export const config = { path: "/api/register" };

export default async (req) => {
  if (req.method !== "POST") return reply({ ok: false, error: "Method not allowed." }, 405);

  const key = process.env.SYSTEME_API_KEY;
  if (!key) {
    console.error("SYSTEME_API_KEY is not set in Netlify environment variables.");
    return reply({ ok: false, error: "Registration isn't switched on yet." }, 500);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return reply({ ok: false, error: "Something was wrong with that request." }, 400);
  }

  // Spam trap: real people never fill this hidden field. Pretend it worked.
  if (body.website) return reply({ ok: true });

  const email = String(body.email || "").trim().toLowerCase();
  const firstName = String(body.firstName || "").trim().slice(0, 80);
  const date = String(body.date || "");
  const roleTag = ROLE_TAGS[String(body.role || "")] || ROLE_TAGS.other;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) {
    return reply({ ok: false, error: "Enter a valid email address." }, 400);
  }
  if (!firstName) return reply({ ok: false, error: "Enter your first name." }, 400);
  if (!DATE_TAGS[date]) return reply({ ok: false, error: "Pick a workshop date." }, 400);

  try {
    const contactId = await findOrCreateContact(key, email, firstName);
    const tagIds = await ensureTags(key, [roleTag, ALL_TAG, DATE_TAGS[date]]);
    for (const tagId of tagIds) await assignTag(key, contactId, tagId);
    console.log(`Registered ${email} for ${date}`);
    return reply({ ok: true });
  } catch (err) {
    // The lead is written to the function log so it can be added by hand.
    console.error(
      "REGISTRATION FAILED — add this person manually:",
      JSON.stringify({ email, firstName, date, role: roleTag, at: new Date().toISOString() }),
      "| reason:", err && err.message
    );
    return reply({ ok: false, error: "Something went wrong saving your seat." }, 502);
  }
};

// ---------------------------------------------------------------------------

function reply(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}

async function systeme(key, path, { method = "GET", body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      "X-API-Key": key,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

async function findOrCreateContact(key, email, firstName) {
  const created = await systeme(key, "/contacts", {
    method: "POST",
    body: { email, fields: [{ slug: "first_name", value: firstName }] }
  });
  if (created.ok && created.data && created.data.id) return created.data.id;

  // Most likely the email is already in Systeme (registered before, or for both dates).
  const found = await systeme(key, `/contacts?email=${encodeURIComponent(email)}&limit=10`);
  const items = (found.ok && found.data && found.data.items) || [];
  const match = items.find((c) => String(c.email || "").toLowerCase() === email);
  if (match) return match.id;

  throw new Error(
    `Create contact failed (HTTP ${created.status}): ${JSON.stringify(created.data).slice(0, 300)}`
  );
}

// Tag name -> id, cached while the function stays warm.
let tagCache = null;

async function ensureTags(key, names) {
  if (!tagCache) {
    const cache = new Map();
    let after = null;
    for (let page = 0; page < 20; page++) {
      const q = `/tags?limit=100${after ? `&startingAfter=${after}` : ""}`;
      const res = await systeme(key, q);
      if (!res.ok) throw new Error(`List tags failed (HTTP ${res.status}): ${JSON.stringify(res.data).slice(0, 300)}`);
      const items = (res.data && res.data.items) || [];
      for (const t of items) cache.set(t.name, t.id);
      if (!res.data || !res.data.hasMore || !items.length) break;
      after = items[items.length - 1].id;
    }
    tagCache = cache;
  }

  const ids = [];
  for (const name of names) {
    if (!tagCache.has(name)) {
      const res = await systeme(key, "/tags", { method: "POST", body: { name } });
      if (!res.ok || !res.data || !res.data.id) {
        throw new Error(`Create tag "${name}" failed (HTTP ${res.status}): ${JSON.stringify(res.data).slice(0, 300)}`);
      }
      tagCache.set(name, res.data.id);
    }
    ids.push(tagCache.get(name));
  }
  return ids;
}

async function assignTag(key, contactId, tagId) {
  const res = await systeme(key, `/contacts/${contactId}/tags`, {
    method: "POST",
    body: { tagId: Number(tagId) }
  });
  // 422 usually means the contact already has this tag, which is fine.
  if (!res.ok && res.status !== 422) {
    throw new Error(`Add tag ${tagId} failed (HTTP ${res.status}): ${JSON.stringify(res.data).slice(0, 300)}`);
  }
}
