import { useEffect, useState } from "react";
import { CheckCircle2, Database, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useWalletStore } from "@/App";

const networkMap: Record<string, "eth-mainnet" | "eth-sepolia" | "polygon-mainnet" | "arb-mainnet" | "opt-mainnet" | "base-mainnet"> = {
  eth: "eth-mainnet", sep: "eth-sepolia", polygon: "polygon-mainnet", arb: "arb-mainnet", op: "opt-mainnet", bnb: "eth-mainnet",
};

export function ProviderStatus() {
  const status = trpc.wallet.providerStatus.useQuery(undefined, { staleTime: 60_000, retry: 1 });
  if (!status.data?.alchemy) return null;
  return <div className="hidden items-center gap-2 text-[10px] text-slate-600 xl:flex"><span className="pulse-dot"/><span>Alchemy data live</span></div>;
}

export function LiveProviderTokens() {
  const { connected, address, chain } = useWalletStore();
  const network = networkMap[chain.id] ?? "eth-mainnet";
  const query = trpc.wallet.tokenBalances.useQuery(
    { network, address: address ?? "0x0000000000000000000000000000000000000000" },
    { enabled: connected && Boolean(address), staleTime: 30_000, retry: 1 },
  );
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  useEffect(() => { if (query.data) setLastUpdated(Date.now()); }, [query.data]);
  if (!connected) return null;
  const items = (query.data as { tokenBalances?: Array<{ contractAddress?: string; tokenBalance?: string }> } | undefined)?.tokenBalances ?? [];
  return <section className="panel mt-6"><div className="section-heading"><div><div className="font-display text-lg font-semibold text-white">Indexed token data</div><div className="mt-1 text-xs text-slate-500">Alchemy portfolio proxy · {chain.name}</div></div><div className="flex items-center gap-3">{lastUpdated && <span className="mono text-[9px] text-slate-600">live</span>}{query.isFetching ? <RefreshCw size={15} className="animate-spin text-mint"/> : <CheckCircle2 size={15} className="text-mint"/>}</div></div><div className="mt-4 flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4"><div className="icon-badge purple"><Database size={15}/></div><div><div className="text-xs font-semibold text-slate-200">{items.length} indexed token contracts</div><div className="mt-1 text-[10px] text-slate-600">Exact USD pricing and metadata will be added from the provider response.</div></div></div></section>;
}
