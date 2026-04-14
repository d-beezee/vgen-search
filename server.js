require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL || 'https://api.vgen.co';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Disabilita cache per i file statici in sviluppo
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Stato della ricerca
let currentCursor = null;
let currentFilters = {
  artist: {},
  service: {
    searchCategoryVariantKeys: [],
    searchCategoryIDs: ['recSUfZT4cF56dTpN']
  }
};
let currentSort = 'relevance';
let searchResults = [];

// Route principale
app.get('/', (req, res) => {
  res.render('index', { results: searchResults, hasResults: searchResults.length > 0 });
});

// API per cercare i servizi
app.post('/api/search', async (req, res) => {
  try {
    const { cursor, filters, sortType } = req.body;

    // Aggiorna lo stato con i filtri della ricerca
    if (filters) currentFilters = filters;
    if (sortType) currentSort = sortType;
    if (cursor) currentCursor = cursor;

    const requestBody = {
      cursor: cursor || currentCursor || '64db6cac9a8f97583545f0c2__0.850289736890733',
      filters: filters || currentFilters,
      sortType: sortType || currentSort
    };

    const response = await axios.post(
      `${API_URL}/commission/services/search`,
      requestBody,
      {
        headers: {
          'Accept': '*/*',
          'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'v-client-id': 'vgen-web'
        }
      }
    );

    // Estrai i risultati dalla risposta
    const services = response.data.services || [];
    const nextCursor = response.data.nextCursor || null;

    // Salva il cursor per la paginazione successiva
    currentCursor = nextCursor;
    searchResults = services;

    res.json({
      success: true,
      data: services,
      nextCursor: nextCursor,
      count: services.length
    });
  } catch (error) {
    console.error('Errore nella ricerca:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Errore durante la ricerca'
    });
  }
});

// API per caricare altri risultati (infinite scroll)
app.post('/api/search/more', async (req, res) => {
  try {
    if (!currentCursor) {
      return res.status(400).json({ success: false, error: 'Nessun cursor disponibile' });
    }

    const requestBody = {
      cursor: currentCursor,
      filters: currentFilters,
      sortType: currentSort
    };

    const response = await axios.post(
      `${API_URL}/commission/services/search`,
      requestBody,
      {
        headers: {
          'Accept': '*/*',
          'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
          'Authorization': AUTHORIZATION_TOKEN,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'v-client-id': 'vgen-web'
        }
      }
    );

    const services = response.data.services || [];
    const nextCursor = response.data.cursor || null;

    currentCursor = nextCursor;
    searchResults = [...searchResults, ...services];

    res.json({
      success: true,
      data: services,
      nextCursor: nextCursor,
      count: services.length
    });
  } catch (error) {
    console.error('Errore nel caricamento:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Errore durante il caricamento'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Gestione errori globale
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Errore interno del server'
  });
});

// Avvia il server
app.listen(PORT, () => {
  console.log(`🚀 Server avviato su http://localhost:${PORT}`);
  console.log(`📡 API: ${API_URL}`);
});
