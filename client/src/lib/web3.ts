import EthereumProvider from "@walletconnect/ethereum-provider";
import {
  createPublicClient,
  createWalletClient,
  custom,
  formatEther,
  http,
  isAddress,
  parseEther,
  type Chain,
  type Hash,
  type PublicClient,
  type WalletClient,
} from "viem";
import { arbitrum, bsc, mainnet, optimism, polygon, sepolia } from "viem/chains";

export type SupportedChain = {
  id: string;
  name: string;
  symbol: string;
  color: string;
  dot: string;
  chain: Chain;
  rpcUrl: string;
  explorer: string;
};

export const supportedChains: SupportedChain[] = [
  { id: "eth", name: "Ethereum", symbol: "ETH", color: "#627eea", dot: "bg-indigo-400", chain: mainnet, rpcUrl: "https://cloudflare-eth.com", explorer: "https://etherscan.io" },
  { id: "sep", name: "Sepolia", symbol: "SEP", color: "#8996a8", dot: "bg-slate-400", chain: sepolia, rpcUrl: "https://rpc.sepolia.org", explorer: "https://sepolia.etherscan.io" },
  { id: "polygon", name: "Polygon", symbol: "MATIC", color: "#8247e5", dot: "bg-violet-400", chain: polygon, rpcUrl: "https://polygon-rpc.com", explorer: "https://polygonscan.com" },
  { id: "arb", name: "Arbitrum", symbol: "ARB", color: "#28a0f0", dot: "bg-sky-400", chain: arbitrum, rpcUrl: "https://arb1.arbitrum.io/rpc", explorer: "https://arbiscan.io" },
  { id: "op", name: "Optimism", symbol: "OP", color: "#ff0420", dot: "bg-rose-400", chain: optimism, rpcUrl: "https://mainnet.optimism.io", explorer: "https://optimistic.etherscan.io" },
  { id: "bnb", name: "BNB Chain", symbol: "BNB", color: "#f3ba2f", dot: "bg-amber-300", chain: bsc, rpcUrl: "https://binance.llamarpc.com", explorer: "https://bscscan.com" },
];

export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
  isRabby?: boolean;
};

type Eip6963Info = { uuid: string; name: string; icon: string; rdns: string };
type Eip6963Announcement = { info: Eip6963Info; provider: Eip1193Provider };

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

let activeInjectedProvider: Eip1193Provider | null = null;
let walletConnectProvider: Eip1193Provider | null = null;
let walletConnectInstance: Awaited<ReturnType<typeof EthereumProvider.init>> | null = null;

export const getInjectedProvider = () => activeInjectedProvider ?? window.ethereum;

export async function discoverEip6963Providers(timeoutMs = 120): Promise<Eip6963Announcement[]> {
  if (typeof window === "undefined") return [];
  const announcements: Eip6963Announcement[] = [];
  const handle = (event: Event) => {
    const detail = (event as CustomEvent<Eip6963Announcement>).detail;
    if (detail?.info?.rdns && detail.provider && !announcements.some((item) => item.info.uuid === detail.info.uuid)) announcements.push(detail);
  };
  window.addEventListener("eip6963:announceProvider", handle);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  await new Promise((resolve) => window.setTimeout(resolve, timeoutMs));
  window.removeEventListener("eip6963:announceProvider", handle);
  return announcements;
}

export async function selectInjectedProvider(): Promise<Eip1193Provider> {
  const announcements = await discoverEip6963Providers();
  const rabby = announcements.find((item) => item.info.rdns === "io.rabby" || item.info.name.toLowerCase() === "rabby");
  activeInjectedProvider = rabby?.provider ?? announcements[0]?.provider ?? window.ethereum ?? null;
  if (!activeInjectedProvider) throw new Error("No EIP-1193 wallet detected. Install Rabby or another compatible wallet.");
  return activeInjectedProvider;
}

export const getChainById = (chainId: number) => supportedChains.find((item) => item.chain.id === chainId) ?? supportedChains[0];
export const getChainByKey = (key: string) => supportedChains.find((item) => item.id === key) ?? supportedChains[0];

export function createInjectedClients(chain: SupportedChain, provider = getInjectedProvider()) {
  if (!provider) throw new Error("No EIP-1193 wallet detected. Install Rabby or another compatible wallet first.");
  return { walletClient: createWalletClient({ chain: chain.chain, transport: custom(provider) }), publicClient: createPublicClient({ chain: chain.chain, transport: http(chain.rpcUrl) }) };
}

export function createReadClient(chain: SupportedChain): PublicClient { return createPublicClient({ chain: chain.chain, transport: http(chain.rpcUrl) }); }

export async function connectInjectedWallet(chain: SupportedChain) {
  const provider = await selectInjectedProvider();
  const walletClient = createWalletClient({ chain: chain.chain, transport: custom(provider) });
  const accounts = await walletClient.requestAddresses();
  const currentChainId = await walletClient.getChainId();
  return { address: accounts[0], chainId: currentChainId, walletClient, provider };
}

export async function connectWalletConnect(chain: SupportedChain) {
  const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined;
  if (!projectId) throw new Error("WalletConnect Project ID is not configured.");
  walletConnectInstance = await EthereumProvider.init({ projectId, chains: [chain.chain.id], optionalChains: supportedChains.map((item) => item.chain.id), showQrModal: true, metadata: { name: "Aegis Wallet", description: "Secure finance workspace", url: window.location.origin, icons: [] } });
  await walletConnectInstance.connect();
  walletConnectProvider = walletConnectInstance as unknown as Eip1193Provider;
  const accounts = await walletConnectProvider.request({ method: "eth_accounts" }) as string[];
  const rawChain = await walletConnectProvider.request({ method: "eth_chainId" });
  const chainId = Number.parseInt(String(rawChain), 16);
  const active = getChainById(chainId);
  const walletClient = createWalletClient({ chain: active.chain, transport: custom(walletConnectProvider) });
  return { address: accounts[0] as `0x${string}`, chainId, walletClient, provider: walletConnectProvider };
}

export async function disconnectWalletConnect() { await walletConnectInstance?.disconnect(); walletConnectInstance = null; walletConnectProvider = null; activeInjectedProvider = null; }

export async function switchInjectedChain(chain: SupportedChain) {
  const provider = getInjectedProvider();
  if (!provider) throw new Error("No EIP-1193 wallet detected.");
  const walletClient = createWalletClient({ chain: chain.chain, transport: custom(provider) });
  await walletClient.switchChain({ id: chain.chain.id });
}

export async function readNativeBalance(address: `0x${string}`, chain: SupportedChain) { const client = createReadClient(chain); const balance = await client.getBalance({ address }); return formatEther(balance); }

export async function estimateAndSendNative(walletClient: WalletClient, publicClient: PublicClient, account: `0x${string}`, recipient: string, amount: string): Promise<Hash> {
  if (!isAddress(recipient)) throw new Error("Recipient address is invalid.");
  if (!amount || Number(amount) <= 0) throw new Error("Amount must be greater than zero.");
  const value = parseEther(amount); const gas = await publicClient.estimateGas({ account, to: recipient as `0x${string}`, value }); const gasPrice = await publicClient.getGasPrice(); const fee = gas * gasPrice; const balance = await publicClient.getBalance({ address: account });
  if (balance < value + fee) throw new Error("Insufficient balance for amount plus estimated gas.");
  return walletClient.sendTransaction({ account, to: recipient as `0x${string}`, value, gas, chain: walletClient.chain });
}

export const formatNativeBalance = (value: string) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 5 });
