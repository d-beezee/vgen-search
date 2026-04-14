require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const NodeCache = require('node-cache');

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL || 'https://api.vgen.co';

// Cache per i tassi di cambio (valido per 24 ore)
const exchangeRateCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });

/**
 * Ottiene i tassi di cambio da USD/GBP/JPY a EUR
 * Utilizza exchangerate-api.com (API gratuita)
 */
async function getExchangeRates() {
  try {
    // Controlla se i tassi sono già in cache
    const cached = exchangeRateCache.get('exchange_rates');
    if (cached) {
      return cached;
    }

    // Recupera i tassi da un'API pubblica
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/EUR', {
      timeout: 5000
    });

    const rates = {
      USD: response.data.rates.USD ? 1 / response.data.rates.USD : 1.1,
      EUR: 1,
      GBP: response.data.rates.GBP ? 1 / response.data.rates.GBP : 1.17,
      JPY: response.data.rates.JPY ? 1 / response.data.rates.JPY : 0.0067
    };

    // Salva in cache
    exchangeRateCache.set('exchange_rates', rates);
    return rates;
  } catch (error) {
    console.warn('Errore nel recupero dei tassi di cambio, uso valori di fallback:', error.message);
    // Tassi di fallback approssimativi
    return {
      USD: 0.92,
      EUR: 1,
      GBP: 1.17,
      JPY: 0.0067
    };
  }
}

/**
 * Converte un prezzo nella valuta specificata a EUR
 */
async function convertToEUR(price, currency = 'USD') {
  if (!price || currency === 'EUR') {
    return { priceEUR: price, originalPrice: price, originalCurrency: currency };
  }

  try {
    const rates = await getExchangeRates();
    const rate = rates[currency] || 1;
    const priceEUR = Math.round(price * rate * 100) / 100;

    return {
      priceEUR,
      originalPrice: price,
      originalCurrency: currency
    };
  } catch (error) {
    console.error('Errore nella conversione del prezzo:', error);
    return { priceEUR: price, originalPrice: price, originalCurrency: currency };
  }
}

/**
 * Converte i prezzi di tutti i servizi a EUR
 */
async function convertServicesPrice(services) {
  return Promise.all(
    services.map(async (service) => {
      const conversion = await convertToEUR(service.basePrice, service.currency);
      return {
        ...service,
        basePrice: conversion.priceEUR,
        currency: 'EUR',
        originalPrice: conversion.originalPrice,
        originalCurrency: conversion.originalCurrency,
        priceDisplay: `€${conversion.priceEUR.toFixed(2)}`
      };
    })
  );
}

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
    let services = response.data.services || [];
    const nextCursor = response.data.nextCursor || null;

    // Converti i prezzi a EUR
    services = await convertServicesPrice(services);

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

    let services = response.data.services || [];
    const nextCursor = response.data.cursor || null;

    // Converti i prezzi a EUR
    services = await convertServicesPrice(services);

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
