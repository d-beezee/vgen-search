# 🚀 VGen Frontend - Build & Deployment

## Quick Start - Build

```bash
npm run build
```

Questo creerà una cartella `build/` pronta per il deployment con:
- ✅ Server Node.js (server.js)
- ✅ File pubblici (CSS, JS, immagini)
- ✅ Template EJS
- ✅ File di configurazione (.env, package.json)
- ✅ Guida di deployment (DEPLOYMENT.md)
- ✅ Configurazione Apache (.htaccess)

## Struttura Build

```
build/
├── server.js              # Server Express
├── package.json           # Dipendenze
├── .env                   # Variabili d'ambiente
├── .htaccess              # Configurazione Apache
├── DEPLOYMENT.md          # Guida di deployment
├── public/
│   ├── app.js            # JavaScript frontend
│   ├── styles.css        # CSS
│   └── *.jpg             # Immagini
└── views/
    └── index.ejs         # Template HTML
```

## Deploy Steps

### 1. Genera il Build
```bash
npm run build
```

### 2. Copia sul Server
```bash
# Con SCP
scp -r build/* user@server:/var/www/html/vgen/

# O con rsync (più veloce)
rsync -avz --delete build/ user@server:/var/www/html/vgen/
```

### 3. Sul Server - Configurazione
```bash
ssh user@server
cd /var/www/html/vgen

# Installa dipendenze
npm install --production

# Configura il token
nano .env
# Modifica: AUTHORIZATION_TOKEN=your_token_here
```

### 4. Avvia il Server
```bash
# Test
npm start

# Produzione con PM2
npm install -g pm2
pm2 start server.js --name "vgen"
pm2 save
pm2 startup
```

### 5. Configura Reverse Proxy (Nginx)
```nginx
location /vgen {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

## Aggiornamenti Futuri

```bash
# Dopo modifiche al codice
npm run build

# Deploy nuovo build
rsync -avz --delete build/ user@server:/var/www/html/vgen/

# Sul server
pm2 restart vgen
```

## Variabili d'Ambiente

Nel file `.env` della cartella build:
```env
PORT=3000
API_URL=https://api.vgen.co
AUTHORIZATION_TOKEN=Bearer eyJhbGci...
```

## URL Finale

Dopo il deployment in `/var/www/html/vgen/`:
```
http://tuodominio.com/vgen
```

Se il proxy non è configurato, accedi direttamente alla porta:
```
http://tuodominio.com:3000
```

## Troubleshooting

- **Porte in uso:** `lsof -i :3000`
- **Log del server:** `pm2 logs vgen`
- **Installa dipendenze:** `npm install --production`
- **Token scaduto:** Aggiorna `.env` con nuovo token

---

Per una guida completa di deployment, vedi `build/DEPLOYMENT.md`
