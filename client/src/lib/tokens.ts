import { erc20Abi, formatUnits, isAddress, parseUnits, type Address, type Hash, type PublicClient, type WalletClient } from "viem";
import type { SupportedChain } from "./web3";

export type TokenDefinition = { symbol: string; name: string; decimals: number; addressByChain: Partial<Record<string, Address>>; color: string };

export const tokenRegistry: TokenDefinition[] = [
  { symbol: "USDC", name: "USD Coin", decimals: 6, color: "#2775ca", addressByChain: {
    eth: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", polygon: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", arb: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", op: "0x0b2C639c533813f4Aa9D7837CaF62653d097Ff85", sep: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
  } },
  { symbol: "WETH", name: "Wrapped Ether", decimals: 18, color: "#627eea", addressByChain: {
    eth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", polygon: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", arb: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", op: "0x4200000000000000000000000000000000000006"
  } },
];

export async function readErc20Balance(client: PublicClient, token: TokenDefinition, chain: SupportedChain, owner: Address) {
  const tokenAddress = token.addressByChain[chain.id];
  if (!tokenAddress) return null;
  const [raw, decimals, symbol] = await Promise.all([
    client.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "balanceOf", args: [owner] }),
    client.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "decimals" }),
    client.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "symbol" }),
  ]);
  return { token, address: tokenAddress, symbol, decimals, balance: formatUnits(raw, decimals), raw };
}

export async function sendErc20(
  walletClient: WalletClient, publicClient: PublicClient, account: Address, token: TokenDefinition, chain: SupportedChain, recipient: string, amount: string,
): Promise<Hash> {
  const tokenAddress = token.addressByChain[chain.id];
  if (!tokenAddress) throw new Error(`${token.symbol} is not supported on ${chain.name}.`);
  if (!isAddress(recipient)) throw new Error("Recipient address is invalid.");
  if (!amount || Number(amount) <= 0) throw new Error("Amount must be greater than zero.");
  const value = parseUnits(amount, token.decimals);
  const balance = await publicClient.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "balanceOf", args: [account] });
  if (balance < value) throw new Error(`Insufficient ${token.symbol} balance.`);
  const gas = await publicClient.estimateContractGas({ address: tokenAddress, abi: erc20Abi, functionName: "transfer", args: [recipient as Address, value], account });
  const gasPrice = await publicClient.getGasPrice();
  const nativeBalance = await publicClient.getBalance({ address: account });
  if (nativeBalance < gas * gasPrice) throw new Error(`Insufficient ${chain.symbol} for network fee.`);
  return walletClient.writeContract({ address: tokenAddress, abi: erc20Abi, functionName: "transfer", args: [recipient as Address, value], account, chain: walletClient.chain });
}
