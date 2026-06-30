// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import { POST } from "@/app/api/webhook/route";

function req(body: unknown) {
  return new Request("http://localhost/api/webhook", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/webhook", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("rejects an invalid URL with 400", async () => {
    const res = await POST(req({ url: "not-a-url", payload: {} }));
    expect(res.status).toBe(400);
  });

  it("forwards the payload to a valid URL", async () => {
    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await POST(req({ url: "https://hooks.example/abc", payload: { a: 1 } }));
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith("https://hooks.example/abc", expect.objectContaining({ method: "POST" }));
  });

  it("returns 502 when delivery fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    const res = await POST(req({ url: "https://hooks.example/abc", payload: {} }));
    expect(res.status).toBe(502);
  });
});
