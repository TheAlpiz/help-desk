import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyWebhookSignature } from "./github.client";

const secret = "test-webhook-secret";
function sign(body: string, key = secret): string {
  return "sha256=" + createHmac("sha256", key).update(body, "utf8").digest("hex");
}

describe("verifyWebhookSignature", () => {
  const body = JSON.stringify({ action: "opened", number: 1 });

  it("accepts a correct signature", () => {
    expect(verifyWebhookSignature(body, sign(body), secret)).toBe(true);
  });

  it("rejects a signature made with the wrong secret", () => {
    expect(verifyWebhookSignature(body, sign(body, "other"), secret)).toBe(false);
  });

  it("rejects a tampered body", () => {
    const sig = sign(body);
    expect(verifyWebhookSignature(body + " ", sig, secret)).toBe(false);
  });

  it("rejects a missing or malformed header", () => {
    expect(verifyWebhookSignature(body, undefined, secret)).toBe(false);
    expect(verifyWebhookSignature(body, "garbage", secret)).toBe(false);
  });

  it("rejects when no secret is configured", () => {
    expect(verifyWebhookSignature(body, sign(body), "")).toBe(false);
  });
});
