import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("wallet provider router", () => {
  it("reports configured provider capabilities without exposing secrets", async () => {
    const caller = appRouter.createCaller(createContext());
    const status = await caller.wallet.providerStatus();
    expect(status).toEqual({ alchemy: true, walletConnect: true });
    expect(JSON.stringify(status)).not.toContain(process.env.ALCHEMY_API_KEY ?? "__missing__");
  });

  it("rejects malformed wallet addresses before an upstream request", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.wallet.nativeBalance({ network: "eth-mainnet", address: "not-an-address" })).rejects.toThrow("Invalid EVM address");
  });
});
