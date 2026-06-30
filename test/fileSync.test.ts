import { describe, it, expect } from "vitest";
import { serialize, importJson, getBackend } from "@/lib/fileSync";

describe("fileSync backend default", () => {
  it("defaults to local storage", () => {
    expect(getBackend()).toBe("local");
  });
});

describe("serialize", () => {
  it("includes sync keys but never API keys or webhook URLs", () => {
    localStorage.setItem("invoice_history", JSON.stringify([{ id: "1" }]));
    localStorage.setItem("inv_counter", "5");
    localStorage.setItem("llm_key_anthropic", "sk-ant-secret");
    localStorage.setItem("webhook_url", "https://hooks.example/secret-token");

    const payload = JSON.parse(serialize());
    expect(payload._app).toBe("invoice-generator");
    expect(payload.data.invoice_history).toBeDefined();
    expect(payload.data.inv_counter).toBe("5");
    expect(payload.data.llm_key_anthropic).toBeUndefined();
    expect(payload.data.webhook_url).toBeUndefined();
  });
});

describe("importJson", () => {
  it("restores sync keys from a valid backup", async () => {
    const backup = new File(
      [JSON.stringify({ _app: "invoice-generator", _v: 1, data: { client_book: JSON.stringify([{ id: "c1", name: "X" }]) } })],
      "backup.json",
      { type: "application/json" }
    );
    await importJson(backup);
    expect(JSON.parse(localStorage.getItem("client_book")!)).toEqual([{ id: "c1", name: "X" }]);
  });

  it("rejects a file that is not an invoice backup", async () => {
    const bad = new File([JSON.stringify({ some: "other json" })], "x.json", { type: "application/json" });
    await expect(importJson(bad)).rejects.toThrow();
  });
});
