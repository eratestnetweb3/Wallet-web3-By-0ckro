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

Aegis dirancang **non-custodial**. UI tidak menyediakan input recovery phrase, private key, maupun fake recovery system. State wallet berada di Zustand memory; tidak ada Zustand persist, localStorage secret, ataupun server-side credential.

Versi ini telah memiliki integrasi nyata untuk browser wallet EIP-1193 melalui `viem`. MetaMask dan Rabby dapat digunakan langsung jika extension tersedia. Aplikasi membaca address, chain, native balance, mendukung switch network, mendengarkan `accountsChanged`/`chainChanged`, melakukan estimasi gas, memvalidasi saldo, lalu memanggil `eth_sendTransaction`. Signature dan approval tetap sepenuhnya terjadi di wallet eksternal.

Connection flow saat ini sudah terhubung ke provider EIP-1193 browser (MetaMask/Rabby), dengan listener `accountsChanged` dan `chainChanged`. Send flow memakai `eth_estimateGas`, validasi saldo plus fee, `eth_sendTransaction`, dan receipt watcher untuk status confirmed/reverted. Seluruh signature tetap terjadi pada wallet eksternal.

## Wallet connection flow

1. User memilih **Connect wallet**.
2. Aplikasi meminta akses akun melalui provider EIP-1193.
3. Aplikasi membaca address dan chain aktif, tanpa membaca secret.
4. Sebelum submit transaksi, aplikasi menjalankan simulation/estimation.
5. Wallet eksternal membuka confirmation screen.
6. Aplikasi memantau pending/success/failed receipt dan menampilkan explorer link.

Jika tidak ada extension, UI tetap dapat dipreview dalam mode demo-safe, tetapi koneksi dan transaksi nyata akan menampilkan error yang aman. Jangan gunakan dana utama saat pengembangan; gunakan Sepolia atau testnet lain.

## WalletConnect dan data portfolio lengkap

WalletConnect membutuhkan `VITE_WALLETCONNECT_PROJECT_ID` dari dashboard WalletConnect. Project ID tersebut bukan private key dan aman digunakan sebagai konfigurasi frontend, tetapi harus dibuat oleh pemilik aplikasi dan dibatasi sesuai domain deployment.

Saldo token ERC-20, harga USD, NFT, dan portfolio multi-chain membutuhkan provider data seperti Alchemy, Moralis, Covalent, Zerion, atau Thirdweb. Pilih satu provider, simpan API key hanya di server/proxy, dan jangan menaruh secret provider di source code atau localStorage. RPC publik yang ada saat ini cocok untuk demo dan testnet terbatas, bukan SLA production.

## Testnet guidance

Gunakan Sepolia untuk pengujian awal. Pastikan network yang dipilih, chain ID, recipient, amount, dan gas benar sebelum menandatangani transaksi. Jangan menempelkan seed phrase atau private key ke field apa pun.

## Catatan status

Versi ini adalah polished frontend prototype. Belum production-ready dan belum diuji untuk transaksi live di testnet. Integrasi provider, token indexer/RPC, gas oracle, receipt watcher, dan contract simulation harus ditambahkan sebelum penggunaan nyata.
