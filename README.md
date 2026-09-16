# Aegis Wallet

Aegis Wallet adalah dashboard Web3 non-custodial dengan visual premium “Obsidian Aurora”. Project ini berfokus pada clarity, transaction safety, dan pengalaman responsive tanpa meminta atau menyimpan seed phrase/private key.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Zustand untuk state typed in-memory
- React Router untuk seluruh route aplikasi
- Lucide React untuk icon system
- Sonner untuk feedback/toast

## Install & Run

```bash
pnpm install
pnpm run dev
```

Validasi project:

```bash
pnpm run check
pnpm run build
```

Alias npm tetap dapat dipakai jika environment mengarahkan `npm` ke package manager yang kompatibel.

## Route utama

| Route | Fungsi |
|---|---|
| `/` | Portfolio overview, balance chart, quick actions, asset dan activity preview |
| `/assets` | Daftar aset, nilai USD, filter, token import placeholder |
| `/send` | Form send crypto dengan validasi dasar dan security review step |
| `/receive` | Public address dan receive flow |
| `/activity` | Transaction history dengan filter dan pencarian |
| `/connect` | DApp connection/session center |
| `/security` | Security posture, simulation messaging, safety principles |
| `/watch` | Import dan remove public address sebagai watch-only wallet |
| `/settings` | Interface, network, gas speed, auto-refresh, local state controls |

## Security note

Aegis dirancang **non-custodial**. UI tidak menyediakan input recovery phrase, private key, maupun fake recovery system. State wallet hanya berupa status UI dan public address demo di Zustand memory; tidak ada Zustand persist, localStorage secret, ataupun server-side credential.

Pada integrasi nyata, connection flow perlu dihubungkan ke provider EIP-1193 (MetaMask/Rabby/WalletConnect), menambahkan listener `accountsChanged` dan `chainChanged`, serta memindahkan transaksi ke `eth_estimateGas`, `eth_sendTransaction`, dan receipt watcher. Seluruh signature tetap harus terjadi pada wallet eksternal.

## Wallet connection flow

1. User memilih **Connect wallet**.
2. Aplikasi meminta akses akun melalui provider EIP-1193.
3. Aplikasi membaca address dan chain aktif, tanpa membaca secret.
4. Sebelum submit transaksi, aplikasi menjalankan simulation/estimation.
5. Wallet eksternal membuka confirmation screen.
6. Aplikasi memantau pending/success/failed receipt dan menampilkan explorer link.

UI pada versi ini menggunakan demo-safe state agar dapat dipreview tanpa wallet extension. Jangan gunakan dana utama saat pengembangan; gunakan Sepolia atau testnet lain.

## Testnet guidance

Gunakan Sepolia untuk pengujian awal. Pastikan network yang dipilih, chain ID, recipient, amount, dan gas benar sebelum menandatangani transaksi. Jangan menempelkan seed phrase atau private key ke field apa pun.

## Catatan status

Versi ini adalah polished frontend prototype. Belum production-ready dan belum diuji untuk transaksi live di testnet. Integrasi provider, token indexer/RPC, gas oracle, receipt watcher, dan contract simulation harus ditambahkan sebelum penggunaan nyata.
