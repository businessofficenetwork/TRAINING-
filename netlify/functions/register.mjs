// Registration connector: website form -> MailerLite.
//
// For each sign-up it adds (or updates) the subscriber in MailerLite with:
//   - Name and Role fields
//   - the group for the evening they picked ("Workshop - Oct 22" or "Workshop - Oct 27")
// Joining a group is what triggers that evening's confirmation email automation.
//
// Needs one Netlify environment variable: MAILERLITE_API_KEY
// (MailerLite > Integrations > MailerLite API > Generate new token)

const API = "https://connect.mailerlite.com/api";

// MailerLite group IDs. If you ever recreate a group, update its ID here.
const DATE_GROUPS = {
  oct22: "201037391490712938", // Workshop - Oct 22
  oct27: "201037394651120924"  // Workshop - Oct 27
};
const ROLES = { owner: "owner", staff: "staff", other: "other" };

export const config = { path: "/api/register" };

export default async (req) => {
  if (req.method !== "POST") return reply({ ok: false, error: "Method not allowed." }, 405);

  const key = process.env.MAILERLITE_API_KEY;
  if (!key) {
    console.error("MAILERLITE_API_KEY is not set in Netlify environment variables.");
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
  const role = ROLES[String(body.role || "")] || ROLES.other;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) {
    return reply({ ok: false, error: "Enter a valid email address." }, 400);
  }
  if (!firstName) return reply({ ok: false, error: "Enter your first name." }, 400);
  if (!DATE_GROUPS[date]) return reply({ ok: false, error: "Pick a workshop date." }, 400);

  try {
    // POST /subscribers creates the subscriber, or updates them if the email already exists.
    // Groups listed here are added; groups they're already in are kept.
    const res = await fetch(`${API}/subscribers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        email,
        fields: { name: firstName, role },
        groups: [DATE_GROUPS[date]]
      })
    });

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 400);
      throw new Error(`MailerLite HTTP ${res.status}: ${detail}`);
    }

    console.log(`Registered ${email} for ${date}`);
    return reply({ ok: true });
  } catch (err) {
    // The lead is written to the function log so it can be added by hand.
    console.error(
      "REGISTRATION FAILED — add this person manually:",
      JSON.stringify({ email, firstName, date, role, at: new Date().toISOString() }),
      "| reason:", err && err.message
    );
    return reply({ ok: false, error: "Something went wrong saving your seat." }, 502);
  }
};

function reply(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}
