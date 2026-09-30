import { scoreAnswers } from "./scoring.js";

const MAX_BODY_CHARS = 12000;
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const TURNSTILE_VERIFY_ENDPOINT = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function list(value) {
  return String(value || "").split(",").map(v => v.trim()).filter(Boolean);
}

function responseHeaders(origin = "") {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "permissions-policy": "interest-cohort=()"
  };
  if (origin) {
    headers["access-control-allow-origin"] = origin;
    headers["access-control-allow-methods"] = "POST, OPTIONS";
    headers["access-control-allow-headers"] = "content-type";
    headers["access-control-max-age"] = "600";
    headers["vary"] = "Origin";
  }
  return headers;
}

function json(body, status = 200, origin = "") {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(origin) });
}

function allowedOrigin(request, env) {
  const origin = request.headers.get("origin") || "";
  return list(env.ALLOWED_ORIGINS).includes(origin) ? origin : "";
}

function cleanText(value, max) {
  if (value == null) return "";
  return String(value)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function validEmail(value) {
  if (typeof value !== "string" || value.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validDate(value) {
  return value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function hashKey(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function verifyTurnstile(token, request, env) {
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET_KEY);
  form.append("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) form.append("remoteip", ip);

  const verify = await fetch(TURNSTILE_VERIFY_ENDPOINT, { method: "POST", body: form });
  if (!verify.ok) return false;

  const outcome = await verify.json();
  if (!outcome.success) return false;

  const allowedHostnames = list(env.ALLOWED_HOSTNAMES);
  return allowedHostnames.length > 0 && allowedHostnames.includes(outcome.hostname);
}

function renderEmail({ participant, role, date, result }) {
  const displayName = participant || "there";
  const meta = [
    participant ? `Participant: ${escapeHtml(participant)}` : "",
    role ? `Role / organization: ${escapeHtml(role)}` : "",
    date ? `Date: ${escapeHtml(date)}` : ""
  ].filter(Boolean).join("<br>");

  const signalItems = result.signals.map(signal =>
    `<li style="margin:0 0 10px"><strong>${escapeHtml(signal.label)}:</strong> ${escapeHtml(signal.detail)}</li>`
  ).join("");

  const html = `<!doctype html>
<html><body style="margin:0;background:#f5f8fc;font-family:Arial,Helvetica,sans-serif;color:#182230">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f8fc;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border:1px solid #d8e0e8;border-radius:16px;overflow:hidden">
<tr><td style="background:#0b1220;color:#ffffff;padding:28px 30px"><div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#70d3fc;font-weight:700">Executive Quick Signal</div><h1 style="font-size:28px;line-height:1.15;margin:10px 0 8px">Your results</h1><p style="margin:0;color:#d7e0ec">A directional signal for where deeper validation may be needed.</p></td></tr>
<tr><td style="padding:30px">
<p style="margin:0 0 18px">Hello ${escapeHtml(displayName)},</p>
${meta ? `<p style="font-size:13px;color:#526173;line-height:1.6;margin:0 0 22px">${meta}</p>` : ""}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
<td style="width:50%;background:#f5f8fc;border-radius:10px;padding:16px"><div style="font-size:11px;text-transform:uppercase;color:#526173;font-weight:700">Quick Signal Score</div><div style="font-size:28px;font-weight:800;color:#0b1220;margin-top:4px">${result.total} / 20</div></td>
<td style="width:12px"></td>
<td style="width:50%;background:#f5f8fc;border-radius:10px;padding:16px"><div style="font-size:11px;text-transform:uppercase;color:#526173;font-weight:700">Directional Result</div><div style="font-size:22px;font-weight:800;color:#0b1220;margin-top:7px">${escapeHtml(result.band)}</div></td>
</tr></table>
<h2 style="font-size:18px;color:#0b1220;margin:28px 0 8px">Interpretation</h2>
<p style="margin:0;color:#364152;line-height:1.65">${escapeHtml(result.interpretation)}</p>
<h2 style="font-size:18px;color:#0b1220;margin:26px 0 8px">Signals requiring validation</h2>
<ul style="padding-left:20px;color:#364152;line-height:1.55">${signalItems}</ul>
<div style="margin-top:26px;padding:18px;border-left:5px solid #2563ff;background:#edf3ff"><strong>Next evidence step: Phase 1</strong><p style="margin:7px 0 0;color:#364152">Validate the actual workflow, evidence, ownership, risk, baseline, and measurement feasibility before expanding the commitment.</p></div>
<p style="margin:28px 0 0;font-size:12px;color:#65758b;line-height:1.55">This five-question signal does not establish implementation readiness, prove ROI, validate a workflow, or determine whether an AI use should scale.</p>
</td></tr>
<tr><td style="background:#0b1220;color:#9fb0c6;padding:20px 30px;font-size:12px">Executive AI Consulting · <a href="https://www.executiveaiconsulting.org/" style="color:#ffffff">executiveaiconsulting.org</a></td></tr>
</table>
</td></tr></table>
</body></html>`;

  const lines = [
    "EXECUTIVE QUICK SIGNAL — YOUR RESULTS",
    "",
    `Score: ${result.total} / 20`,
    `Directional result: ${result.band}`,
    participant ? `Participant: ${participant}` : "",
    role ? `Role / organization: ${role}` : "",
    date ? `Date: ${date}` : "",
    "",
    "Interpretation",
    result.interpretation,
    "",
    "Signals requiring validation",
    ...result.signals.map(signal => `- ${signal.label}: ${signal.detail}`),
    "",
    "Next evidence step: Phase 1",
    "Validate the actual workflow, evidence, ownership, risk, baseline, and measurement feasibility before expanding the commitment.",
    "",
    "This five-question signal does not establish implementation readiness, prove ROI, validate a workflow, or determine whether an AI use should scale.",
    "",
    "https://www.executiveaiconsulting.org/"
  ];
  const text = lines.filter((line, index) => line !== "" || (index > 0 && lines[index - 1] !== "")).join("\n");

  return { html, text };
}

function configured(env) {
  return Boolean(
    env.RESEND_API_KEY &&
    env.TURNSTILE_SECRET_KEY &&
    env.RATE_LIMIT_SALT &&
    env.EMAIL_FROM &&
    env.EMAIL_REPLY_TO &&
    list(env.ALLOWED_ORIGINS).length &&
    list(env.ALLOWED_HOSTNAMES).length &&
    env.EMAIL_RATE_LIMITER &&
    env.IP_RATE_LIMITER
  );
}

async function handleEmailResults(request, env, origin) {
  if (!configured(env)) return json({ ok: false, code: "EMAIL_NOT_CONFIGURED" }, 503, origin);

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return json({ ok: false, code: "UNSUPPORTED_CONTENT_TYPE" }, 415, origin);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_CHARS) return json({ ok: false, code: "PAYLOAD_TOO_LARGE" }, 413, origin);

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, code: "INVALID_JSON" }, 400, origin);
  }

  // Honeypot: return success without delivery.
  if (cleanText(body.website, 120)) return json({ ok: true }, 200, origin);

  const email = cleanText(body.email, 254).toLowerCase();
  const participant = cleanText(body.participant, 80);
  const role = cleanText(body.role, 120);
  const date = cleanText(body.date, 10);
  const turnstileToken = cleanText(body.turnstileToken, 2048);
  const answers = Array.isArray(body.answers) ? body.answers.map(Number) : [];

  if (!validEmail(email) || !validDate(date) || !turnstileToken) {
    return json({ ok: false, code: "INVALID_INPUT" }, 400, origin);
  }

  let result;
  try {
    result = scoreAnswers(answers);
  } catch {
    return json({ ok: false, code: "INVALID_ANSWERS" }, 400, origin);
  }

  const human = await verifyTurnstile(turnstileToken, request, env);
  if (!human) return json({ ok: false, code: "VERIFICATION_FAILED" }, 403, origin);

  const emailKey = await hashKey(`${email}:${env.RATE_LIMIT_SALT}`);
  const emailLimit = await env.EMAIL_RATE_LIMITER.limit({ key: emailKey });
  if (!emailLimit.success) return json({ ok: false, code: "RATE_LIMITED" }, 429, origin);

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const ipKey = await hashKey(`${ip}:${env.RATE_LIMIT_SALT}`);
  const ipLimit = await env.IP_RATE_LIMITER.limit({ key: ipKey });
  if (!ipLimit.success) return json({ ok: false, code: "RATE_LIMITED" }, 429, origin);

  const message = renderEmail({ participant, role, date, result });
  const requestId = crypto.randomUUID();

  const send = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [email],
      reply_to: env.EMAIL_REPLY_TO,
      subject: "Your Executive AI Consulting Quick Signal results",
      html: message.html,
      text: message.text,
      tags: [{ name: "message_type", value: "quick_signal_result" }]
    })
  });

  if (!send.ok) {
    console.error("email_results_send_failed", { requestId, status: send.status });
    return json({ ok: false, code: "DELIVERY_FAILED", requestId }, 502, origin);
  }

  return json({ ok: true, requestId }, 200, origin);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = allowedOrigin(request, env);

    if (!origin) return json({ ok: false, code: "ORIGIN_NOT_ALLOWED" }, 403);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: responseHeaders(origin) });
    }

    if (request.method !== "POST" || url.pathname !== "/email-results") {
      return json({ ok: false, code: "NOT_FOUND" }, 404, origin);
    }

    return handleEmailResults(request, env, origin);
  }
};
