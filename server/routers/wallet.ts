import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";

const networkSchema = z.enum(["eth-mainnet", "eth-sepolia", "polygon-mainnet", "arb-mainnet", "opt-mainnet", "base-mainnet"]);
const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address");

function alchemyUrl(network: z.infer<typeof networkSchema>) {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) throw new Error("ALCHEMY_API_KEY is not configured");
  return `https://${network}.g.alchemy.com/v2/${key}`;
}

async function alchemyRpc(network: z.infer<typeof networkSchema>, method: string, params: unknown[]) {
  const response = await fetch(alchemyUrl(network), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });
  if (!response.ok) throw new Error(`Alchemy request failed (${response.status})`);
  const payload = await response.json() as { result?: unknown; error?: { message?: string } };
  if (payload.error) throw new Error(payload.error.message ?? "Alchemy RPC error");
  return payload.result;
}

export const walletRouter = router({
  providerStatus: publicProcedure.query(() => ({ alchemy: Boolean(process.env.ALCHEMY_API_KEY), walletConnect: Boolean(process.env.VITE_WALLETCONNECT_PROJECT_ID) })),
  nativeBalance: publicProcedure.input(z.object({ network: networkSchema, address: addressSchema })).query(async ({ input }) => {
    const result = await alchemyRpc(input.network, "eth_getBalance", [input.address, "latest"]);
    return { network: input.network, address: input.address, wei: String(result), hex: String(result) };
  }),
  tokenBalances: publicProcedure.input(z.object({ network: networkSchema, address: addressSchema })).query(async ({ input }) => {
    const result = await alchemyRpc(input.network, "alchemy_getTokenBalances", [input.address, "erc20"]);
    return result;
  }),
  assetTransfers: publicProcedure.input(z.object({ network: networkSchema, address: addressSchema, maxCount: z.number().int().min(1).max(100).default(50) })).query(async ({ input }) => {
    const base = { fromBlock: "0x0", toBlock: "latest", category: ["external", "erc20", "erc721", "erc1155"], withMetadata: true, maxCount: `0x${input.maxCount.toString(16)}` };
    const [outgoing, incoming] = await Promise.all([
      alchemyRpc(input.network, "alchemy_getAssetTransfers", [{ ...base, fromAddress: input.address, order: "desc" }]),
      alchemyRpc(input.network, "alchemy_getAssetTransfers", [{ ...base, toAddress: input.address, order: "desc" }]),
    ]);
    return { outgoing, incoming };
  }),
  nfts: publicProcedure.input(z.object({ network: networkSchema, address: addressSchema })).query(async ({ input }) => {
    const url = `https://${input.network}.g.alchemy.com/nft/v3/${process.env.ALCHEMY_API_KEY}/getNFTsForOwner?owner=${input.address}&withMetadata=true&pageSize=50`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Alchemy NFT request failed (${response.status})`);
    return response.json();
  }),
  lifiQuote: publicProcedure.input(z.object({
    fromChain: z.number().int().positive(),
    toChain: z.number().int().positive(),
    fromToken: z.string().min(2).max(100),
    toToken: z.string().min(2).max(100),
    fromAddress: addressSchema,
    toAddress: addressSchema,
    fromAmount: z.string().regex(/^\d+$/, "fromAmount must be integer base units"),
    slippage: z.number().min(0).max(1).default(0.005),
  })).query(async ({ input }) => {
    const params = new URLSearchParams({
      fromChain: String(input.fromChain), toChain: String(input.toChain), fromToken: input.fromToken,
      toToken: input.toToken, fromAddress: input.fromAddress, toAddress: input.toAddress,
      fromAmount: input.fromAmount, slippage: String(input.slippage), order: "CHEAPEST", integrator: "aegis-wallet",
    });
    const response = await fetch(`https://li.quest/v1/quote?${params.toString()}`, { headers: { accept: "application/json" } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error((payload as { message?: string }).message ?? `LI.FI quote failed (${response.status})`);
    return payload;
  }),
});
