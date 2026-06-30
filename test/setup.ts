import { beforeEach } from "vitest";

// Ensure crypto.randomUUID exists (jsdom/older node).
const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
if (!g.crypto) g.crypto = {};
if (typeof g.crypto.randomUUID !== "function") {
  let n = 0;
  g.crypto.randomUUID = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
}

// Clean localStorage between tests so stateful specs don't leak.
beforeEach(() => {
  if (typeof localStorage !== "undefined") localStorage.clear();
});
