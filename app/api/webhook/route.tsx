// Server-side proxy: forwards a JSON payload to the user's configured webhook
// URL. Running it server-side avoids browser CORS restrictions and keeps
// delivery reliable (with a timeout).

export async function POST(request: Request) {
  let body: { url?: string; payload?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { url, payload } = body;
  if (!url || !/^https?:\/\//i.test(url)) {
    return Response.json({ error: "A valid http(s) webhook URL is required." }, { status: 400 });
  }

  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      return Response.json({ error: `Webhook endpoint responded ${res.status}.` }, { status: 502 });
    }
    return Response.json({ ok: true, status: res.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Delivery failed.";
    const friendly = /abort/i.test(msg) ? "Webhook timed out after 8s." : msg;
    return Response.json({ error: friendly }, { status: 502 });
  }
}
