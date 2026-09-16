import { describe, expect, it } from "vitest";

describe("wallet provider credentials", () => {
  it("accepts the configured Alchemy key for a lightweight RPC call", async () => {
    const apiKey = process.env.ALCHEMY_API_KEY;
    expect(apiKey, "ALCHEMY_API_KEY must be configured").toBeTruthy();

    const response = await fetch(`https://eth-mainnet.g.alchemy.com/v2/${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
    });
    expect(response.ok).toBe(true);
    const payload = await response.json() as { result?: string; error?: { message?: string } };
    expect(payload.error, payload.error?.message ?? "Alchemy returned an RPC error").toBeUndefined();
    expect(payload.result).toMatch(/^0x[0-9a-f]+$/i);
  }, 15000);
});
