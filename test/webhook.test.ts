import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildPayload, fireOnStatusChange, saveWebhookConfig } from "@/lib/webhook";
import { makeInvoice } from "./fixtures";

describe("buildPayload", () => {
  it("includes event, statuses, amounts and parties", () => {
    const p = buildPayload(makeInvoice({ status: "paid", taxRate: 10 }), "unpaid");
    expect(p.event).toBe("invoice.status_changed");
    expect(p.status).toBe("paid");
    expect(p.previousStatus).toBe("unpaid");
    expect(p.amounts.total).toBe(220);
    expect(p.client.email).toBe("ap@client.com");
    expect(typeof p.timestamp).toBe("string");
  });
});

describe("fireOnStatusChange", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("does not fire when disabled", async () => {
    saveWebhookConfig({ enabled: false, url: "https://hook", triggers: ["paid"] });
    const r = await fireOnStatusChange(makeInvoice({ status: "paid" }), "unpaid");
    expect(r.sent).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not fire without a transition", async () => {
    saveWebhookConfig({ enabled: true, url: "https://hook", triggers: ["paid"] });
    const r = await fireOnStatusChange(makeInvoice({ status: "paid" }), "paid");
    expect(r.sent).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not fire when the new status is not a trigger", async () => {
    saveWebhookConfig({ enabled: true, url: "https://hook", triggers: ["paid"] });
    const r = await fireOnStatusChange(makeInvoice({ status: "overdue" }), "unpaid");
    expect(r.sent).toBe(false);
  });

  it("fires on a transition into a trigger status", async () => {
    saveWebhookConfig({ enabled: true, url: "https://hook", triggers: ["paid"] });
    const r = await fireOnStatusChange(makeInvoice({ status: "paid" }), "unpaid");
    expect(r.sent).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith("/api/webhook", expect.objectContaining({ method: "POST" }));
  });
});
