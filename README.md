# VGen Frontend

Frontend Node.js per cercare i servizi di commissione di VGen.

## 🚀 Installazione

```bash
npm install
```

## 📝 Configurazione

Modifica il file `.env` con i tuoi dati:

```env
PORT=3000
API_URL=https://api.vgen.co
AUTHORIZATION_TOKEN=Bearer <your-token>
```

## ▶️ Avvio

**Modalità produzione:**
```bash
npm start
```

**Modalità sviluppo (con auto-reload):**
```bash
npm run dev
```

Il server sarà disponibile su `http://localhost:3000`

## 📁 Struttura del progetto

```
myvgen/
├── server.js           # Server Express principale
├── package.json        # Dipendenze del progetto
├── .env               # Variabili d'ambiente
├── public/
│   ├── app.js         # JavaScript lato client
│   └── styles.css     # Stili CSS
└── views/
    └── index.ejs      # Template HTML (EJS)
```

## 🔧 API Disponibili

### GET `/`
Pagina principale con interfaccia di ricerca

### POST `/api/search`
Ricerca i servizi di commissione
- **Body:** 
  ```json
  {
    "cursor": "optional",
    "filters": { ... },
    "sortType": "relevance|newest|popular"
  }
  ```

### POST `/api/search/more`
Carica altri risultati (paginazione)

### GET `/health`
Health check del server

## 🎨 Funzionalità

- ✅ Ricerca servizi con filtri
- ✅ Ordinamento per rilevanza, novità, popolarità
- ✅ Grid responsive per visualizzare i servizi
- ✅ Caricamento infinito dei risultati
- ✅ Gestione degli errori
- ✅ UI moderna e intuitiva

## 🔐 Sicurezza

⚠️ **Attenzione:** Il token JWT è memorizzato nel file `.env`. 

Per la produzione, considera di:
- Salvare il token in una variabile d'ambiente sicura
- Implementare il refresh automatico del token
- Usare una sessione sicura lato server

## 📱 Responsive Design

L'interfaccia è completamente responsive e funziona su:
- Desktop
- Tablet
- Mobile

## 🐛 Troubleshooting

**Errore: "Modulo non trovato"**
```bash
npm install
```

**Porta 3000 occupata:**
```bash
PORT=3001 npm start
```

**Token scaduto:**
Aggiorna il valore in `.env` con un nuovo token

## 📚 Dipendenze

- **express**: Framework web
- **ejs**: Template engine
- **axios**: HTTP client
- **dotenv**: Gestione variabili d'ambiente
- **nodemon**: (dev) Auto-reload durante lo sviluppo

## 📄 Licenza

ISC
