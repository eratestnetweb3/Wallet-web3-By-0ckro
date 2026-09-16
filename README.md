# Flux Wallet

A local-first Solana wallet foundation inspired by the public Flux Wallet preview. This repository contains a fresh implementation; it does not copy private Manus source code.

## Current scope

- Create a Solana keypair locally.
- Encrypt the secret key in a browser-only AES-GCM/PBKDF2 vault.
- Lock and unlock the vault.
- Read SOL balance from Devnet or Mainnet RPC.
- Display a receive address and QR code.
- Validate a send recipient and show a transfer preview without broadcasting.
- Toggle Black & White mode.

## Run locally

```bash
npm install
npm run dev
```

Then open the Vite URL shown in the terminal.

## Security notes

This is an early foundation, not a production-audited wallet. The send flow intentionally does not broadcast transactions. Never commit a seed phrase, private key, wallet password, or real API secret. Before mainnet use, add an independent security audit, phishing protection, transaction simulation, hardware/OS-backed storage for mobile, and recovery UX.

## Next milestones

1. Add transaction simulation and explicit local signing review.
2. Add token metadata and transaction history with rate limits and RPC fallback.
3. Add Jupiter swap only after transaction review is hardened.
4. Package as PWA and Android with Android Keystore/biometric unlock.
5. Run security audit before enabling mainnet broadcast.
