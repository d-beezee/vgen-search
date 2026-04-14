const CATEGORIES = {
    "Illustrations": "recmgzrPpwLaQYP0p",
    "Reference Sheet": "recSUfZT4cF56dTpN"
}

// Stato attuale della categoria selezionata
let currentCategory = '';

// Service query di base - all categories
let serviceQuery = {
};

// Salva lo stato della ricerca per infinite scroll
let currentSearchState = {
    cursor: null,
    filters: {
        artist: {},
        service: serviceQuery
    },
    sortType: 'relevance'
};

// Filtro per categoria
function filterByCategory(categoryId) {
    currentCategory = categoryId;
    
    // Aggiorna l'UI dei bottoni
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    event.target.classList.add('active');
    
    // Aggiorna la serviceQuery
    if (categoryId === '') {
        // Tutte le categorie
        serviceQuery = {
        };
    } else {
        // Categoria specifica
        serviceQuery = {
            searchCategoryVariantKeys: [],
            searchCategoryIDs: [categoryId]
        };
    }
    
    // Esegui la ricerca con la nuova categoria
    handleSearch();
}

// Gestione della ricerca
async function handleSearch() {
    const sortType = document.getElementById('sortType').value;
    const minPrice = parseInt(document.getElementById('minPrice')?.value || 0) * 100; // Converti a centesimi
    const maxPrice = parseInt(document.getElementById('maxPrice')?.value || 999999) * 100;
    
    showLoading();
    hideError();

    try {
        const requestBody = {
            filters: {
                artist: {},
                service: serviceQuery
            },
            sortType: sortType
        };
        
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        hideLoading();

        if (!data.success) {
            showError('Errore nella ricerca: ' + data.error);
            return;
        }

        // Filtra i risultati per prezzo lato client
        const filteredResults = data.data.filter(service => {
            const price = service.basePrice || 0;
            return price >= minPrice && price <= maxPrice;
        });

        displayResults(filteredResults);
        
        // Salva lo stato con i filtri per infinite scroll
        currentSearchState = {
            filters: requestBody.filters,
            sortType: sortType,
            lastCursor: data.nextCursor,
            minPrice: minPrice,
            maxPrice: maxPrice
        };
        
        if (data.nextCursor) {
            // infinite scroll attivo
        } else {
            // Nessun altro risultato disponibile
        }
    } catch (error) {
        hideLoading();
        showError('Errore di connessione: ' + error.message);
        console.error('Errore:', error);
    }
}

// Caricamento di altri risultati
async function loadMore() {
    showLoading();
    hideError();

    try {
        const response = await fetch('/api/search/more', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        hideLoading();

        if (!data.success) {
            showError('Errore nel caricamento: ' + data.error);
            return;
        }

        // Aggiungi i nuovi risultati ai risultati esistenti
        appendResults(data.data);

        if (!data.nextCursor) {
            document.getElementById('loadMoreContainer').classList.add('hidden');
        }
    } catch (error) {
        hideLoading();
        showError('Errore di connessione: ' + error.message);
        console.error('Errore:', error);
    }
}

// Visualizza i risultati
function displayResults(services) {
    const resultsContainer = document.getElementById('results');
    
    if (!services || services.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                <p>Nessun risultato trovato. Prova a cercare di nuovo!</p>
            </div>
        `;
        return;
    }

    resultsContainer.innerHTML = services.map(service => createServiceCard(service)).join('');
    
    // Forza il caricamento delle immagini aggiungendo timestamp per bypass cache
    loadImages();
    
    // Setuppa l'infinite scroll
    setupInfiniteScroll();
}

// Carica le immagini con cache-busting
function loadImages() {
    const images = document.querySelectorAll('img[src*="storage.vgen.co"]');
    images.forEach(img => {
        // Se l'immagine non ha un timestamp, aggiungilo per bypassare la cache
        if (!img.src.includes('?t=')) {
            img.src += '?t=' + Date.now();
        }
    });
}

// Aggiungi risultati (per infinite scroll)
function appendResults(services) {
    const resultsContainer = document.getElementById('results');
    
    // Rimuovi il messaggio "nessun risultato" se presente
    const noResults = resultsContainer.querySelector('.no-results');
    if (noResults) {
        noResults.remove();
    }

    const html = services.map(service => createServiceCard(service)).join('');
    resultsContainer.insertAdjacentHTML('beforeend', html);
    
    // Forza il caricamento delle immagini appena aggiunte
    setTimeout(() => loadImages(), 100);
}

// Crea la card di un servizio
function createServiceCard(service) {
    // Immagine principale dalla galleria (prima immagine)
    const imageUrl = (service.galleryItems && service.galleryItems.length > 0) 
        ? service.galleryItems[0].url 
        : '/placeholder.jpg';
    
    // Info artista dall'oggetto user
    const artistName = service.user?.displayName || service.user?.username || 'Artista';
    const artistAvatar = service.user?.avatarURL || '/placeholder-avatar.jpg';
    
    // Titolo servizio
    const serviceTitle = service.serviceName || service.name || service.title || 'Servizio senza nome';
    
    // Prezzo (in centesimi, convertire a euro)
    const price = service.basePrice || 'Contatta';
    const priceFormatted = typeof price === 'number' ? `€${(price / 100).toFixed(2)}` : price;
    
    // Descrizione (estrai testo dai dati strutturati se disponibili)
    let description = '';
    if (service.description) {
        try {
            const parsed = JSON.parse(service.description);
            if (Array.isArray(parsed)) {
                description = parsed
                    .filter(block => block.type === 'heading-one' || block.type === 'paragraph')
                    .map(block => block.children?.map(child => child.text).join('') || '')
                    .join(' ')
                    .substring(0, 120);
            }
        } catch (e) {
            description = service.description.substring(0, 120);
        }
    }
    
    const descriptionHtml = description ? `
        <p class="description">${description}${description.length > 119 ? '...' : ''}</p>
    ` : '';

    // Overlay artista sull'immagine
    const artistOverlay = `
        <div class="artist-overlay">
            <img src="${artistAvatar}" alt="${artistName}" class="artist-avatar" onerror="this.src='/placeholder-avatar.jpg'">
            <div class="artist-info">
                <p class="name">${artistName}</p>
                <p class="status">Artist</p>
            </div>
        </div>
    `;

    // Info artista nella card
    const artistCard = `
        <div class="card-artist-info">
            <img src="${artistAvatar}" alt="${artistName}" class="card-artist-avatar" onerror="this.src='/placeholder-avatar.jpg'">
            <span class="card-artist-name">${artistName}</span>
        </div>
    `;

    // Crea uno slug dal tagline o dal nome
    const slug = (service.tagline || service.serviceName || 'service')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    
    const username = service.user?.username || 'artist';
    
    return `
        <div class="service-card" 
             data-service-id="${service.serviceID}" 
             data-username="${username}" 
             data-slug="${slug}"
             onclick="viewDetails('${service.serviceID}')" 
             style="cursor: pointer;">
            <div class="card-image">
                <img src="${imageUrl}" alt="${serviceTitle}" onerror="">
                ${artistOverlay}
            </div>
            <div class="card-content">
                <div class="card-header">
                    ${artistCard}
                    <h3>${serviceTitle}</h3>
                </div>
                ${descriptionHtml}
                <div class="card-footer">
                    <button class="btn-secondary" onclick="event.stopPropagation(); viewDetails('${service.serviceID}')">Visualizza</button>
                    <span class="price">${priceFormatted}</span>
                </div>
            </div>
        </div>
    `;
}

// Visualizza i dettagli di un servizio
function viewDetails(serviceId) {
    // Ricerca il card per ottenere i dati
    const cardElement = document.querySelector(`[data-service-id="${serviceId}"]`);
    if (!cardElement) return;
    
    const username = cardElement.getAttribute('data-username');
    const slug = cardElement.getAttribute('data-slug');
    
    // Apri il servizio su VGen con il formato corretto
    window.open(`https://vgen.co/${username}/service/${slug}/${serviceId}`, '_blank');
}

// Helper functions
function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function hideError() {
    document.getElementById('error').classList.add('hidden');
}

// Infinite scroll - carica automaticamente quando arrivi a fine pagina
let isLoadingMore = false;

function setupInfiniteScroll() {
    // Crea un elemento sentinella alla fine della grid
    const resultsContainer = document.getElementById('results');
    
    // Rimuovi il vecchio sentinel se esiste
    const oldSentinel = resultsContainer.querySelector('.scroll-sentinel');
    if (oldSentinel) oldSentinel.remove();
    
    const sentinel = document.createElement('div');
    sentinel.className = 'scroll-sentinel';
    resultsContainer.appendChild(sentinel);
    
    // Intersection Observer per rilevare quando raggiungi il fondo
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !isLoadingMore) {
                loadMoreAuto();
            }
        });
    }, {
        root: null,
        rootMargin: '200px', // Carica prima di arrivare completamente al fondo
        threshold: 0.1
    });
    
    observer.observe(sentinel);
}

// Caricamento automatico per infinite scroll
async function loadMoreAuto() {
    if (isLoadingMore || !currentSearchState.lastCursor) return;
    isLoadingMore = true;

    try {
        // Usa la ricerca precedente con il nuovo cursor
        const requestBody = {
            cursor: currentSearchState.lastCursor,
            filters: currentSearchState.filters,
            sortType: currentSearchState.sortType
        };

        const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!data.success) {
            isLoadingMore = false;
            return;
        }

        // Se ci sono nuovi risultati, aggiungili
        if (data.data && data.data.length > 0) {
            // Applica il filtro prezzo anche ai nuovi risultati
            const filteredResults = data.data.filter(service => {
                const price = service.basePrice || 0;
                const minPrice = currentSearchState.minPrice || 0;
                const maxPrice = currentSearchState.maxPrice || 999999 * 100;
                return price >= minPrice && price <= maxPrice;
            });
            
            appendResults(filteredResults);
            
            // Aggiorna il cursor per il prossimo caricamento
            currentSearchState.lastCursor = data.nextCursor;
            
            // Se ci sono ancora più risultati, configura di nuovo l'observer
            if (data.nextCursor) {
                setupInfiniteScroll();
            }
        }

        isLoadingMore = false;
    } catch (error) {
        console.error('Errore nel caricamento automatico:', error);
        isLoadingMore = false;
    }
}

// Carica i risultati iniziali al caricamento della pagina
document.addEventListener('DOMContentLoaded', function() {
    handleSearch();
});
