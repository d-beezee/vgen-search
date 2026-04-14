#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const buildDir = path.join(rootDir, 'build');
const publicBuildDir = path.join(buildDir, 'public');
const viewsBuildDir = path.join(buildDir, 'views');

console.log('🔨 Building application for deployment...\n');

// Pulisci la cartella build se esiste
if (fs.existsSync(buildDir)) {
  console.log('📦 Cleaning build directory...');
  fs.rmSync(buildDir, { recursive: true, force: true });
}

// Crea le directory
console.log('📂 Creating build directories...');
fs.mkdirSync(buildDir, { recursive: true });
fs.mkdirSync(publicBuildDir, { recursive: true });
fs.mkdirSync(viewsBuildDir, { recursive: true });

// Copia i file del server
console.log('📋 Copying server files...');
copyFile('server.js', buildDir);
copyFile('.env', buildDir);
copyFile('package.json', buildDir);
copyFile('package-lock.json', buildDir);

// Copia i file pubblici
console.log('🎨 Copying public files...');
const publicDir = path.join(rootDir, 'public');
if (fs.existsSync(publicDir)) {
  copyDir(publicDir, publicBuildDir);
}

// Copia i template EJS
console.log('📄 Copying views...');
const viewsDir = path.join(rootDir, 'views');
if (fs.existsSync(viewsDir)) {
  copyDir(viewsDir, viewsBuildDir);
}

// Crea un file .htaccess per Apache (se stai mettendo in sottocartella)
console.log('⚙️  Creating Apache configuration...');
createHtaccess(buildDir);

// Crea un file di istruzioni di deployment
console.log('📝 Creating deployment instructions...');
createDeploymentInstructions(buildDir);

console.log('\n✅ Build completed successfully!\n');
console.log('📦 Build folder: ' + buildDir);
console.log('\n📋 Deployment instructions:');
console.log('  1. Copy the "build" folder to your server');
console.log('  2. Place it in: /your-webroot/vgen/');
console.log('  3. Install dependencies: npm install');
console.log('  4. Update .env with your API token');
console.log('  5. Start with: npm start\n');

// Helper functions
function copyFile(filename, destDir) {
  const source = path.join(rootDir, filename);
  const dest = path.join(destDir, filename);
  
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, dest);
    console.log(`  ✓ ${filename}`);
  }
}

function copyDir(source, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const files = fs.readdirSync(source);
  files.forEach(file => {
    const sourcePath = path.join(source, file);
    const destPath = path.join(dest, file);
    
    if (fs.statSync(sourcePath).isDirectory()) {
      copyDir(sourcePath, destPath);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  });
  
  const relPath = path.relative(rootDir, source);
  console.log(`  ✓ ${relPath}`);
}

function createHtaccess(buildDir) {
  const htaccessContent = `# VGen Frontend - Apache Configuration

# Abilita il rewrite module
<IfModule mod_rewrite.c>
  RewriteEngine On
  
  # Se il file/cartella non esiste, passa a Node.js
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ index.html [L]
</IfModule>

# Disabilita la cache per i file HTML
<FilesMatch "\\.html$">
  <IfModule mod_headers.c>
    Header set Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </IfModule>
</FilesMatch>

# Abilita la cache per i file statici
<FilesMatch "\\.(jpg|jpeg|png|gif|webp|css|js|woff|woff2)$">
  <IfModule mod_headers.c>
    Header set Cache-Control "max-age=31536000, public"
  </IfModule>
</FilesMatch>
`;

  fs.writeFileSync(path.join(buildDir, '.htaccess'), htaccessContent);
  console.log('  ✓ .htaccess');
}

function createDeploymentInstructions(buildDir) {
  const instructions = `# 🚀 VGen Frontend - Deployment Guide

## Prerequisiti
- Node.js 14+ installato sul server
- npm installato
- Accesso SSH al server web
- Token JWT valido per l'API VGen

## Istruzioni di Deployment

### 1. Preparazione del Server
\`\`\`bash
# Se non esiste ancora, crea la struttura
mkdir -p /var/www/html/vgen
cd /var/www/html/vgen
\`\`\`

### 2. Deploy dei File
\`\`\`bash
# Copia il contenuto della cartella "build" al server
scp -r build/* user@server:/var/www/html/vgen/
# O con rsync per velocità
rsync -avz build/ user@server:/var/www/html/vgen/
\`\`\`

### 3. Configurazione sul Server
\`\`\`bash
ssh user@server
cd /var/www/html/vgen

# Installa dipendenze
npm install --production

# Configura le variabili d'ambiente
nano .env
# Aggiorna: AUTHORIZATION_TOKEN=your_token_here
# Aggiorna: PORT=3000 (o la porta che vuoi)

# Verifica che il server avvii correttamente
npm start
# Premi Ctrl+C per stoppare
\`\`\`

### 4. Configura il Reverse Proxy (Nginx - Consigliato)
\`\`\`nginx
server {
    listen 80;
    server_name tuodominio.com;

    location /vgen {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Disabilita cache per HTML
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate";
    }
}
\`\`\`

### 5. Usa PM2 per Auto-Restart
\`\`\`bash
# Installa PM2 globalmente (solo una volta)
npm install -g pm2

# Avvia l'app con PM2
cd /var/www/html/vgen
pm2 start server.js --name "vgen-frontend"

# Salva la configurazione
pm2 save

# Configura PM2 per partire all'avvio del sistema
pm2 startup
\`\`\`

### 6. Verifica il Deployment
\`\`\`bash
# Controlla se il processo è in esecuzione
pm2 status

# Vedi i log
pm2 logs vgen-frontend

# Visita: http://tuodominio.com/vgen
\`\`\`

## Troubleshooting

### Porta già in uso
\`\`\`bash
lsof -i :3000
# Uccidi il processo se necessario
kill -9 <PID>
\`\`\`

### Immagini non caricano
- Verifica il token JWT in .env
- Controlla i CORS headers
- Vedi i log del server: \`pm2 logs vgen-frontend\`

### Node_modules manca
\`\`\`bash
cd /var/www/html/vgen
npm install --production
\`\`\`

## Aggiornamenti Futuri
\`\`\`bash
# Quando hai nuove versioni da deployare
cd /var/www/html/vgen
git pull  # Se usi git
npm install
pm2 restart vgen-frontend
\`\`\`

## Variabili d'Ambiente (.env)
\`\`\`env
PORT=3000
API_URL=https://api.vgen.co
AUTHORIZATION_TOKEN=Bearer eyJhbGci...
\`\`\`

---

**Nota:** Assicurati che il token JWT nel .env sia aggiornato e valido!
`;

  fs.writeFileSync(path.join(buildDir, 'DEPLOYMENT.md'), instructions);
  console.log('  ✓ DEPLOYMENT.md');
}
