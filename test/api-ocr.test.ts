// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import { POST } from "@/app/api/ocr/route";

const IMG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function req(body: unknown) {
  return new Request("http://localhost/api/ocr", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/ocr", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("requires an API key (400)", async () => {
    const res = await POST(req({ provider: "openai", base64: IMG, mediaType: "image/png" }));
    expect(res.status).toBe(400);
  });

  it("guards against PDFs on OpenAI with a friendly message", async () => {
    const res = await POST(req({ provider: "openai", apiKey: "sk-x", base64: IMG, mediaType: "application/pdf" }));
    const json = await res.json();
    expect(res.status).toBe(502);
    expect(json.error).toMatch(/pdf/i);
  });

  it("routes images to the OpenAI branch and parses structured output (mocked)", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ vendor: "Adobe", total: 52.99 }) } }] }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(req({ provider: "openai", apiKey: "sk-x", base64: IMG, mediaType: "image/png", kind: "receipt" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.vendor).toBe("Adobe");
    expect(fetchMock).toHaveBeenCalledWith("https://api.openai.com/v1/chat/completions", expect.anything());
  });
});
