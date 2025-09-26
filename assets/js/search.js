class SiteSearch {
  constructor() {
    this.searchIndex = null;
    this.searchData = null;
    this.searchInput = null;
    this.searchResults = null;
    this.searchOverlay = null;
    this.searchDocuments = [];
    this.documentMap = new Map();
    this.baseUrl = (document.documentElement && document.documentElement.dataset && document.documentElement.dataset.baseurl) || '';

    this.init();
  }

  async init() {
    try {
      await this.loadLunr();
      await this.loadSearchData();
      this.initializeSearchInterface();
      this.buildSearchIndex();
    } catch (error) {
      console.error('Search initialization failed:', error);
    }
  }

  loadLunr() {
    return new Promise((resolve, reject) => {
      if (window.lunr) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = this.buildUrl('/assets/js/vendor/lunr.min.js');
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load Lunr search library'));
      document.head.appendChild(script);
    });
  }

  async loadSearchData() {
    try {
      const response = await fetch(this.buildUrl('/assets/js/search-index.json'), {
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`Search data request failed with status ${response.status}`);
      }

      this.searchData = await response.json();
    } catch (error) {
      console.error('Failed to load search data:', error);
      this.searchData = { posts: [], pages: [] };
    }
  }

  buildSearchIndex() {
    if (!window.lunr || !this.searchData) return;

    const documents = [
      ...(this.searchData.posts || []),
      ...(this.searchData.pages || [])
    ];

    this.searchDocuments = documents;
    this.documentMap = new Map(
      documents.map(doc => [doc.id != null ? doc.id.toString() : '', doc])
    );

    this.searchIndex = lunr(function() {
      this.field('title', { boost: 10 });
      this.field('content', { boost: 5 });
      this.field('excerpt', { boost: 7 });
      this.field('author', { boost: 3 });
      this.field('categories');
      this.field('tags');
      this.ref('id');

      documents.forEach(doc => {
        if (doc && doc.id != null) {
          this.add(doc);
        }
      });
    });
  }

  initializeSearchInterface() {
    this.createSearchElements();
    this.bindEvents();
  }

  createSearchElements() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

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

    navbar.appendChild(searchForm);

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
          <div id="search-results" class="search-results"></div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    this.searchInput = document.getElementById('search-input');
    this.searchResults = document.getElementById('search-results');
    this.searchOverlay = document.getElementById('search-overlay');
  }

  bindEvents() {
    if (!this.searchInput) return;

    this.searchInput.addEventListener('input', this.debounce(this.handleSearch.bind(this), 300));
    this.searchInput.addEventListener('focus', this.handleSearchFocus.bind(this));

    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', this.handleSearchButtonClick.bind(this));
    }

    const closeBtn = document.querySelector('.search-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', this.hideSearchResults.bind(this));
    }

    if (this.searchOverlay) {
      this.searchOverlay.addEventListener('click', (e) => {
        if (e.target === this.searchOverlay) {
          this.hideSearchResults();
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.searchInput.focus();
      }

      if (e.key === 'Escape') {
        this.hideSearchResults();
      }
    });
  }

  handleSearch(event) {
    const query = event.target.value.trim();

    if (query.length < 2) {
      this.hideSearchResults();
      return;
    }

    this.performSearch(query);
  }

  handleSearchFocus() {
    const query = this.searchInput.value.trim();
    if (query.length >= 2) {
      this.performSearch(query);
    }
  }

  handleSearchButtonClick() {
    const query = this.searchInput.value.trim();
    if (query.length >= 2) {
      this.performSearch(query);
    }
  }

  performSearch(rawQuery) {
    if (!this.searchIndex) {
      console.warn('Search index not ready');
      return;
    }

    const tokens = this.tokenizeQuery(rawQuery);
    if (!tokens.length) {
      this.hideSearchResults();
      return;
    }

    const expressionParts = tokens
      .map(term => this.escapeForLunr(term))
      .filter(Boolean)
      .map(term => `${term}~1 ${term}*`);

    if (!expressionParts.length) {
      this.hideSearchResults();
      return;
    }

    try {
      const results = this.searchIndex.search(expressionParts.join(' '));
      const documents = results
        .map(result => this.documentMap.get(result.ref))
        .filter(Boolean);

      this.displayResults(documents, tokens, rawQuery);
      this.showSearchResults();
    } catch (error) {
      console.error('Search error:', error);
    }
  }

  displayResults(documents, tokens, rawQuery) {
    if (!this.searchResults) return;

    this.searchResults.innerHTML = '';

    if (!documents.length) {
      const noResults = document.createElement('div');
      noResults.className = 'search-no-results';

      const message = document.createElement('p');
      message.textContent = `No results found for "${rawQuery}"`;
      const tip = document.createElement('p');
      tip.className = 'text-muted';
      tip.textContent = 'Try different keywords or check your spelling.';

      noResults.appendChild(message);
      noResults.appendChild(tip);
      this.searchResults.appendChild(noResults);
      return;
    }

    const fragment = document.createDocumentFragment();

    const header = document.createElement('div');
    header.className = 'search-results-header';
    const headerText = document.createElement('p');
    headerText.textContent = `Found ${documents.length} result${documents.length !== 1 ? 's' : ''} for "${rawQuery}"`;
    header.appendChild(headerText);
    fragment.appendChild(header);

    documents.forEach(doc => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      if (doc.url) {
        item.dataset.url = doc.url;
      }

      const resultHeader = document.createElement('div');
      resultHeader.className = 'result-header';

      const typeIcon = document.createElement('span');
      typeIcon.className = 'result-type';
      typeIcon.textContent = this.getTypeIcon(doc.type, doc.section);

      const titleHeading = document.createElement('h4');
      titleHeading.className = 'result-title';
      this.applyHighlight(titleHeading, doc.title, tokens);

      resultHeader.appendChild(typeIcon);
      resultHeader.appendChild(titleHeading);
      item.appendChild(resultHeader);

      if (doc.excerpt) {
        const excerpt = document.createElement('p');
        excerpt.className = 'result-excerpt';
        this.applyHighlight(excerpt, doc.excerpt, tokens);
        item.appendChild(excerpt);
      }

      const meta = document.createElement('div');
      meta.className = 'result-meta';

      if (doc.timestamp) {
        const dateSpan = document.createElement('span');
        dateSpan.className = 'result-date';
        dateSpan.textContent = doc.date || '';
        meta.appendChild(dateSpan);
      }

      if (doc.author) {
        if (meta.childNodes.length) {
          meta.appendChild(document.createTextNode(' '));
        }
        const authorSpan = document.createElement('span');
        authorSpan.className = 'result-author';
        authorSpan.textContent = `by ${doc.author}`;
        meta.appendChild(authorSpan);
      }

      item.appendChild(meta);

      item.addEventListener('click', () => {
        if (doc.url) {
          window.location.href = doc.url;
        }
      });

      fragment.appendChild(item);
    });

    this.searchResults.appendChild(fragment);
  }

  getTypeIcon(type, section) {
    if (type === 'post') return '📰';
    if (section === 'events') return '🎉';
    if (section === 'places') return '📍';
    if (section === 'offers') return '💰';
    return '📄';
  }

  applyHighlight(container, text, tokens) {
    container.textContent = '';

    if (!text) {
      return;
    }

    const filteredTokens = (tokens || [])
      .map(token => token.trim())
      .filter(Boolean);

    if (!filteredTokens.length) {
      container.textContent = text;
      return;
    }

    const escapedTokens = filteredTokens
      .map(token => this.escapeForRegex(token))
      .filter(Boolean);

    if (!escapedTokens.length) {
      container.textContent = text;
      return;
    }

    const pattern = new RegExp(`(${escapedTokens.join('|')})`, 'gi');
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        container.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }

      const mark = document.createElement('mark');
      mark.textContent = match[0];
      container.appendChild(mark);

      lastIndex = pattern.lastIndex;
    }

    if (lastIndex < text.length) {
      container.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
  }

  tokenizeQuery(query) {
    if (!query) return [];
    return query
      .split(/\s+/)
      .map(term => term.trim())
      .filter(Boolean);
  }

  escapeForLunr(term) {
    return term
      .replace(/\\/g, '\\\\')
      .replace(/&&/g, '\\&&')
      .replace(/\|\|/g, '\\||')
      .replace(/[-^~*+!:"']/g, match => `\\${match}`);
  }

  escapeForRegex(term) {
    return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    }
    if (this.searchResults) {
      this.searchResults.innerHTML = '';
    }
    document.body.style.overflow = '';
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

  buildUrl(path) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (!this.baseUrl) {
      return normalizedPath;
    }

    const trimmedBase = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    return `${trimmedBase}${normalizedPath}`;
  }
}

// Initialize search when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new SiteSearch();
});
