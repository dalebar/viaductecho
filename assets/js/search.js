class SiteSearch {
  constructor() {
    this.searchIndex = null;
    this.searchData = null;
    this.searchInput = null;
    this.searchResults = null;
    this.searchOverlay = null;

    this.init();
  }

  async init() {
    // Load Lunr.js from CDN
    await this.loadLunr();

    // Load search data
    await this.loadSearchData();

    // Initialize search interface
    this.initializeSearchInterface();

    // Build search index
    this.buildSearchIndex();
  }

  loadLunr() {
    return new Promise((resolve, reject) => {
      if (window.lunr) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/lunr@2.3.9/lunr.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async loadSearchData() {
    try {
      const response = await fetch('/assets/js/search-index.json');
      this.searchData = await response.json();
    } catch (error) {
      console.error('Failed to load search data:', error);
    }
  }

  buildSearchIndex() {
    if (!window.lunr || !this.searchData) return;

    // Combine posts and pages for indexing
    const documents = [
      ...this.searchData.posts,
      ...this.searchData.pages
    ];

    this.searchIndex = lunr(function() {
      this.field('title', { boost: 10 });
      this.field('content', { boost: 5 });
      this.field('excerpt', { boost: 7 });
      this.field('author', { boost: 3 });
      this.field('categories');
      this.field('tags');
      this.ref('id');

      documents.forEach(doc => {
        this.add(doc);
      });
    });
  }

  initializeSearchInterface() {
    // Create search interface elements
    this.createSearchElements();

    // Add event listeners
    this.bindEvents();
  }

  createSearchElements() {
    // Create search input in header - position at the absolute far right of screen
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    // Search form positioned absolutely
    const searchForm = document.createElement('form');
    searchForm.className = 'search-form search-absolute-right';
    searchForm.innerHTML = `
      <div class="input-group">
        <input type="text" id="search-input" class="form-control search-input" placeholder="Search..." aria-label="Search">
        <button class="btn search-btn" type="button" aria-label="Search">
          <i class="fas fa-search"></i>
        </button>
      </div>
    `;

    // Insert into navbar with absolute positioning
    navbar.appendChild(searchForm);

    // Search overlay and results
    const overlay = document.createElement('div');
    overlay.id = 'search-overlay';
    overlay.className = 'search-overlay';
    overlay.innerHTML = `
      <div class="search-container">
        <div class="search-header">
          <h3>Search Results</h3>
          <button class="search-close" aria-label="Close search">&times;</button>
        </div>
        <div class="search-results-wrapper">
          <div id="search-results" class="search-results">
            <!-- Results will be populated here -->
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Store references
    this.searchInput = document.getElementById('search-input');
    this.searchResults = document.getElementById('search-results');
    this.searchOverlay = document.getElementById('search-overlay');
  }

  bindEvents() {
    if (!this.searchInput) return;

    // Input events
    this.searchInput.addEventListener('input', this.debounce(this.handleSearch.bind(this), 300));
    this.searchInput.addEventListener('focus', this.handleSearchFocus.bind(this));

    // Search button click
    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', this.handleSearchButtonClick.bind(this));
    }

    // Close search overlay
    const closeBtn = document.querySelector('.search-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', this.hideSearchResults.bind(this));
    }

    // Click outside to close
    this.searchOverlay.addEventListener('click', (e) => {
      if (e.target === this.searchOverlay) {
        this.hideSearchResults();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.searchInput.focus();
      }

      // Escape to close search
      if (e.key === 'Escape') {
        this.hideSearchResults();
      }
    });
  }

  handleSearch(e) {
    const query = e.target.value.trim();

    if (query.length < 2) {
      this.hideSearchResults();
      return;
    }

    this.performSearch(query);
  }

  handleSearchFocus() {
    const query = this.searchInput.value.trim();
    if (query.length >= 2) {
      this.showSearchResults();
    }
  }

  handleSearchButtonClick() {
    const query = this.searchInput.value.trim();
    if (query.length >= 2) {
      this.performSearch(query);
    }
  }

  performSearch(query) {
    if (!this.searchIndex) {
      console.warn('Search index not ready');
      return;
    }

    try {
      // Perform fuzzy search
      const results = this.searchIndex.search(`${query}~1 ${query}*`);

      // Get full document data for results
      const searchResults = results.map(result => {
        const allDocuments = [...this.searchData.posts, ...this.searchData.pages];
        const doc = allDocuments.find(item => item.id.toString() === result.ref);
        return { ...doc, score: result.score };
      });

      this.displayResults(searchResults, query);
      this.showSearchResults();
    } catch (error) {
      console.error('Search error:', error);
    }
  }

  displayResults(results, query) {
    if (!this.searchResults) return;

    if (results.length === 0) {
      this.searchResults.innerHTML = `
        <div class="search-no-results">
          <p>No results found for "<strong>${query}</strong>"</p>
          <p class="text-muted">Try different keywords or check your spelling.</p>
        </div>
      `;
      return;
    }

    const resultsHTML = results.map(result => {
      const typeIcon = this.getTypeIcon(result.type, result.section);
      const dateStr = result.timestamp ? `<span class="result-date">${result.date}</span>` : '';
      const authorStr = result.author ? `<span class="result-author">by ${result.author}</span>` : '';

      return `
        <div class="search-result-item" data-url="${result.url}">
          <div class="result-header">
            <span class="result-type">${typeIcon}</span>
            <h4 class="result-title">${this.highlightText(result.title, query)}</h4>
          </div>
          <p class="result-excerpt">${this.highlightText(result.excerpt, query)}</p>
          <div class="result-meta">
            ${dateStr}
            ${authorStr}
          </div>
        </div>
      `;
    }).join('');

    this.searchResults.innerHTML = `
      <div class="search-results-header">
        <p>Found ${results.length} result${results.length !== 1 ? 's' : ''} for "<strong>${query}</strong>"</p>
      </div>
      ${resultsHTML}
    `;

    // Add click handlers to results
    this.searchResults.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = item.dataset.url;
        if (url) {
          window.location.href = url;
        }
      });
    });
  }

  getTypeIcon(type, section) {
    if (type === 'post') return '📰';
    if (section === 'events') return '🎉';
    if (section === 'places') return '📍';
    if (section === 'offers') return '💰';
    return '📄';
  }

  highlightText(text, query) {
    if (!text || !query) return text;

    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  showSearchResults() {
    if (this.searchOverlay) {
      this.searchOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  hideSearchResults() {
    if (this.searchOverlay) {
      this.searchOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Initialize search when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new SiteSearch();
});