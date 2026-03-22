import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { webcrypto } from 'crypto';

const root = join(import.meta.dirname, '..');
const deckDir = join(root, 'deck');
const outDir = join(root, 'public', 'investors');

const password = process.argv[2];
if (!password) {
  console.error('Usage: bun run scripts/encrypt-deck.js <password>');
  process.exit(1);
}

const html = readFileSync(join(deckDir, 'index.html'), 'utf-8');
const css = readFileSync(join(deckDir, 'styles.css'), 'utf-8');
const js = readFileSync(join(deckDir, 'deck.js'), 'utf-8');

const bundled = html
  .replace('<link rel="stylesheet" href="styles.css">', `<style>${css}</style>`)
  .replace('<script src="deck.js"></script>', `<script>${js}</script>`);

const enc = new TextEncoder();
const salt = webcrypto.getRandomValues(new Uint8Array(16));
const iv = webcrypto.getRandomValues(new Uint8Array(12));

const keyMaterial = await webcrypto.subtle.importKey(
  'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
);
const key = await webcrypto.subtle.deriveKey(
  { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
  keyMaterial,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt']
);

const ciphertext = new Uint8Array(
  await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(bundled))
);

const payload = new Uint8Array(salt.length + iv.length + ciphertext.length);
payload.set(salt, 0);
payload.set(iv, salt.length);
payload.set(ciphertext, salt.length + iv.length);

const b64 = Buffer.from(payload).toString('base64');

const shell = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Neptune — Investors</title>
<link rel="icon" type="image/png" sizes="512x512" href="/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300;1,9..144,400&family=Geist+Mono:wght@300;400;500&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;background:#060608;color:#7a7a85;font-family:'Fraunces','Georgia',serif;-webkit-font-smoothing:antialiased;overflow:hidden}
.gate{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:32px}
.gate h1{font-size:clamp(3rem,8vw,5rem);font-weight:300;font-style:italic;color:#dcdce0;letter-spacing:-0.04em}
.gate-label{font-family:'Geist Mono',monospace;font-size:0.6rem;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;color:#3a3a42}
.gate-input{background:none;border:none;border-bottom:0.5px solid rgba(255,255,255,0.04);font-family:'Geist Mono',monospace;font-size:0.78rem;font-weight:300;color:#dcdce0;padding:10px 0;width:240px;outline:none;text-align:center;letter-spacing:0.04em;transition:border-color 0.2s ease}
.gate-input:focus{border-bottom-color:rgba(255,255,255,0.1)}
.gate-input.error{border-bottom-color:#5a2a2a;animation:shake 0.4s ease}
.gate-hint{font-family:'Geist Mono',monospace;font-size:0.55rem;font-weight:300;color:#3a3a42;letter-spacing:0.06em;margin-top:-16px}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
</style>
</head>
<body>
<div class="gate" id="gate">
<span class="gate-label">Investors</span>
<h1>Neptune</h1>
<input class="gate-input" id="pw" type="password" placeholder="password" autocomplete="off" autofocus>
<span class="gate-hint">press enter</span>
</div>
<script>
var D='${b64}';
document.getElementById('pw').addEventListener('keydown',async function(e){
if(e.key!=='Enter')return;
var pw=this.value;if(!pw)return;
try{
var raw=Uint8Array.from(atob(D),function(c){return c.charCodeAt(0)});
var salt=raw.slice(0,16),iv=raw.slice(16,28),ct=raw.slice(28);
var enc=new TextEncoder();
var km=await crypto.subtle.importKey('raw',enc.encode(pw),'PBKDF2',false,['deriveKey']);
var key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:salt,iterations:600000,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['decrypt']);
var pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:iv},key,ct);
var html=new TextDecoder().decode(pt);
document.open();document.write(html);document.close();
}catch(err){
var input=document.getElementById('pw');
input.classList.remove('error');
void input.offsetWidth;
input.classList.add('error');
input.value='';
}
});
</script>
</body>
</html>`;

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'index.html'), shell);
console.log('Encrypted deck → public/investors/index.html');
