import { describe, expect, it } from "vitest";
import { getChainByKey, supportedChains } from "./web3";

describe("mainnet network configuration", () => {
  it("exposes the supported EVM mainnets with explorer URLs", () => {
    for (const key of ["eth", "polygon", "arb", "op", "bnb"]) {
      const chain = getChainByKey(key);
      expect(chain.chain.id).toBeGreaterThan(0);
      expect(chain.rpcUrl).toMatch(/^https:\/\//);
      expect(chain.explorer).toMatch(/^https:\/\//);
    }
    expect(supportedChains.some((chain) => chain.id === "sep")).toBe(true);
  });
});
