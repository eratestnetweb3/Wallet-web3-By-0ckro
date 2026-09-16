import { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { QRCodeSVG } from 'qrcode.react'
import './styles.css'

type Network = 'devnet' | 'mainnet-beta'
const STORAGE_KEY = 'flux-wallet-vault-v1'
const endpoint = (network: Network) => network === 'devnet' ? 'https://api.devnet.solana.com' : 'https://api.mainnet-beta.solana.com'
const buffer = (value: Uint8Array) => value.slice().buffer

async function deriveKey(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: buffer(salt), iterations: 210_000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}
async function encryptSecret(secret: Uint8Array, password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16)); const iv = crypto.getRandomValues(new Uint8Array(12)); const key = await deriveKey(password, salt)
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: buffer(iv) }, key, buffer(secret))
  return JSON.stringify({ salt: Array.from(salt), iv: Array.from(iv), cipher: Array.from(new Uint8Array(cipher)) })
}
async function decryptSecret(payload: string, password: string) {
  const data = JSON.parse(payload); const key = await deriveKey(password, new Uint8Array(data.salt))
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buffer(new Uint8Array(data.iv)) }, key, buffer(new Uint8Array(data.cipher)))
  return new Uint8Array(plain)
}
const short = (value: string) => `${value.slice(0, 5)}…${value.slice(-5)}`

function App() {
  const [network, setNetwork] = useState<Network>('devnet'); const [theme, setTheme] = useState<'dark'|'mono'>('dark')
  const [vault, setVault] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY)); const [keypair, setKeypair] = useState<Keypair | null>(null)
  const [password, setPassword] = useState(''); const [balance, setBalance] = useState<number | null>(null); const [notice, setNotice] = useState('')
  const [recipient, setRecipient] = useState(''); const [amount, setAmount] = useState(''); const [tab, setTab] = useState<'home'|'receive'|'send'>('home')
  const address = keypair?.publicKey.toBase58() ?? ''
  const connection = useMemo(() => new Connection(endpoint(network), 'confirmed'), [network])
  useEffect(() => { if (!keypair) return; connection.getBalance(keypair.publicKey).then(v => setBalance(v / LAMPORTS_PER_SOL)).catch(() => setNotice('RPC belum merespons. Periksa jaringan atau coba lagi.')) }, [keypair, connection])
  const createWallet = async () => { if (password.length < 8) return setNotice('Gunakan password minimal 8 karakter.'); const kp = Keypair.generate(); localStorage.setItem(STORAGE_KEY, await encryptSecret(kp.secretKey, password)); setVault(localStorage.getItem(STORAGE_KEY)); setKeypair(kp); setPassword(''); setNotice('Wallet dibuat dan vault terenkripsi tersimpan lokal.') }
  const unlock = async () => { if (!vault) return; try { const bytes = await decryptSecret(vault, password); setKeypair(Keypair.fromSecretKey(bytes)); setPassword(''); setNotice('Vault terbuka. Private key tidak meninggalkan perangkat.'); } catch { setNotice('Password salah atau vault rusak.') } }
  const sendPreview = () => { if (!recipient || !amount) return setNotice('Isi alamat penerima dan jumlah SOL.'); try { new PublicKey(recipient); const lamports = Math.round(Number(amount) * LAMPORTS_PER_SOL); if (!Number.isFinite(lamports) || lamports <= 0) throw new Error(); setNotice(`Preview siap: ${amount} SOL + fee jaringan. Tidak ada transaksi yang dikirim.`) } catch { setNotice('Alamat atau jumlah tidak valid.') } }
  return <div className={`app ${theme}`}>
    <header><div className="brand"><span className="orb" /> FLUX <em>WALLET</em></div><div className="header-actions"><select value={network} onChange={e => setNetwork(e.target.value as Network)}><option value="devnet">Devnet</option><option value="mainnet-beta">Mainnet</option></select><button className="icon-button" onClick={() => setTheme(theme === 'dark' ? 'mono' : 'dark')} aria-label="Toggle black and white mode">◐</button></div></header>
    <main><section className="hero"><div><p className="eyebrow">SELF-CUSTODY / {network.toUpperCase()}</p><h1>Your wallet,<br /><span>in full orbit.</span></h1><p className="lead">A calm, local-first home for your digital assets. Your keys stay encrypted on this device.</p></div><div className="orbit-card"><div className="planet" /><span className="orbit orbit-one" /><span className="orbit orbit-two" /><span className="orbit orbit-three" /></div></section>
      {!vault ? <section className="panel onboarding"><div><p className="eyebrow">FIRST FLIGHT</p><h2>Create your local vault</h2><p>No seed phrase or private key is sent to a server. This foundation uses AES-GCM and PBKDF2 in your browser.</p></div><div className="form-row"><input type="password" placeholder="Vault password (8+ characters)" value={password} onChange={e => setPassword(e.target.value)} /><button onClick={createWallet}>Create wallet</button></div></section> : !keypair ? <section className="panel onboarding"><div><p className="eyebrow">VAULT LOCKED</p><h2>Welcome back</h2><p>Unlock your encrypted local vault to view the wallet address and balance.</p></div><div className="form-row"><input type="password" placeholder="Vault password" value={password} onChange={e => setPassword(e.target.value)} /><button onClick={unlock}>Unlock</button></div></section> : <>
        <nav className="tabs"><button className={tab==='home'?'active':''} onClick={() => setTab('home')}>Overview</button><button className={tab==='receive'?'active':''} onClick={() => setTab('receive')}>Receive</button><button className={tab==='send'?'active':''} onClick={() => setTab('send')}>Send</button><button onClick={() => { setKeypair(null); setNotice('Vault dikunci.') }}>Lock</button></nav>
        {tab === 'home' && <section className="grid"><div className="panel balance-card"><p className="eyebrow">TOTAL PORTFOLIO</p><div className="balance">{balance === null ? '—' : balance.toFixed(4)} <small>SOL</small></div><div className="address">{short(address)} <button onClick={() => navigator.clipboard.writeText(address)}>Copy</button></div><div className="stat"><span>Network</span><b>{network === 'devnet' ? 'Development' : 'Production'}</b></div></div><div className="panel safety"><p className="eyebrow">SECURITY STATUS</p><h3>Local vault active</h3><p>Encrypted with AES-GCM. Signing is designed to happen locally after a human-readable transaction preview.</p><div className="shield">✓</div></div></section>}
        {tab === 'receive' && <section className="panel action-card"><p className="eyebrow">RECEIVE SOL</p><h2>Your deposit address</h2><QRCodeSVG value={address} bgColor="transparent" fgColor="currentColor" size={180} /><code>{address}</code><button onClick={() => navigator.clipboard.writeText(address)}>Copy address</button></section>}
        {tab === 'send' && <section className="panel action-card"><p className="eyebrow">SEND / PREVIEW ONLY</p><h2>Prepare a transfer</h2><p>Broadcast is intentionally disabled in this foundation until security review is complete.</p><input placeholder="Recipient public address" value={recipient} onChange={e => setRecipient(e.target.value)} /><input placeholder="Amount in SOL" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} /><button onClick={sendPreview}>Preview transfer</button></section>}
      </>}
      {notice && <div className="notice" role="status">{notice}</div>}
    </main><footer><span>FLUX WALLET / BUILD 0.1</span><span>Never share your seed phrase.</span></footer>
  </div>
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
