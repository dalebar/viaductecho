class InfiniteScroll {
  constructor() {
    this.postsContainer = document.querySelector('#posts-container');
    this.loadingIndicator = document.querySelector('#loading-indicator');

    if (!this.postsContainer) {
      return;
    }

    this.posts = [];
    this.currentIndex = 0;
    this.postsPerLoad = 12;
    this.isLoading = false;
    this.hasMorePosts = true;
    this.featuredPosts = [];
    this.regularPosts = [];
    this.baseUrl = (document.documentElement && document.documentElement.dataset && document.documentElement.dataset.baseurl) || '';

    this.init();
  }

  async init() {
    try {
      const response = await fetch(this.buildUrl('/api/posts.json'), {
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`Posts request failed with status ${response.status}`);
      }

      const data = await response.json();
      this.posts = Array.isArray(data.posts) ? data.posts : [];

      this.featuredPosts = this.posts.filter(post => post.featured);
      this.regularPosts = this.posts.filter(post => !post.featured);

      this.loadInitialPosts();
      this.setupScrollListener();
    } catch (error) {
      console.error('Failed to load posts:', error);
      this.showError();
    }
  }

  loadInitialPosts() {
    const existingPosts = this.postsContainer.querySelectorAll('.regular-post');
    existingPosts.forEach(post => post.remove());

    this.loadMorePosts();
  }

  loadMorePosts() {
    if (this.isLoading || !this.hasMorePosts) return;

    this.isLoading = true;
    this.showLoading();

    setTimeout(() => {
      const endIndex = Math.min(this.currentIndex + this.postsPerLoad, this.regularPosts.length);
      const postsToLoad = this.regularPosts.slice(this.currentIndex, endIndex);

      postsToLoad.forEach(post => {
        this.renderPost(post);
      });

      this.currentIndex = endIndex;
      this.hasMorePosts = this.currentIndex < this.regularPosts.length;

      this.hideLoading();
      this.isLoading = false;

      this.applyLazyLoading();
    }, 500);
  }

  renderPost(post) {
    const postElement = document.createElement('div');
    postElement.className = 'col-12 col-md-6 col-lg-4 mb-4 regular-post';

    const card = document.createElement('div');
    card.className = 'card';

    const link = document.createElement('a');
    link.href = post.url || '#';

    if (post.image) {
      const img = document.createElement('img');
      img.className = 'rounded mb-4';
      img.setAttribute('data-src', post.image);
      img.alt = post.title || 'Post image';
      img.loading = 'lazy';
      link.appendChild(img);
    }

    card.appendChild(link);

    const cardBlock = document.createElement('div');
    cardBlock.className = 'card-block';

    const titleHeading = document.createElement('h2');
    titleHeading.className = 'card-title h4 serif-font';

    const titleLink = document.createElement('a');
    titleLink.href = post.url || '#';
    titleLink.textContent = post.title || 'Untitled';

    titleHeading.appendChild(titleLink);
    cardBlock.appendChild(titleHeading);

    if (post.excerpt) {
      const excerpt = document.createElement('p');
      excerpt.className = 'card-text text-muted';
      excerpt.textContent = post.excerpt;
      cardBlock.appendChild(excerpt);
    }

    const metaFooter = document.createElement('div');
    metaFooter.className = 'metafooter';

    const wrapFooter = document.createElement('div');
    wrapFooter.className = 'wrapfooter small d-flex align-items-center';

    const authorMeta = document.createElement('span');
    authorMeta.className = 'author-meta';

    const authorName = post.author || '';

    authorMeta.appendChild(document.createTextNode('By '));

    const nameSpan = document.createElement('span');
    nameSpan.className = 'post-name';
    nameSpan.textContent = authorName ? `${authorName},` : '';
    authorMeta.appendChild(nameSpan);

    authorMeta.appendChild(document.createTextNode(' on '));

    const dateSpan = document.createElement('span');
    dateSpan.className = 'post-date';
    dateSpan.textContent = post.date || '';
    authorMeta.appendChild(dateSpan);

    wrapFooter.appendChild(authorMeta);

    const clearfix = document.createElement('div');
    clearfix.className = 'clearfix';
    wrapFooter.appendChild(clearfix);

    metaFooter.appendChild(wrapFooter);
    cardBlock.appendChild(metaFooter);

    card.appendChild(cardBlock);
    postElement.appendChild(card);

    this.postsContainer.appendChild(postElement);
  }

  setupScrollListener() {
    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  handleScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    if (scrollTop + windowHeight >= documentHeight - 200) {
      this.loadMorePosts();
    }
  }

  applyLazyLoading() {
    const images = this.postsContainer.querySelectorAll('img[data-src]');

    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            observer.unobserve(img);

            img.style.opacity = '0';
            img.onload = () => {
              img.style.transition = 'opacity 0.3s';
              img.style.opacity = '1';
            };
          }
        });
      });

      images.forEach(img => imageObserver.observe(img));
    } else {
      images.forEach(img => {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      });
    }
  }

  showLoading() {
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = 'block';
    }
  }

  hideLoading() {
    if (this.loadingIndicator) {
      this.loadingIndicator.style.display = 'none';
    }
  }

  showError() {
    const errorElement = document.createElement('div');
    errorElement.className = 'col-12 text-center';

    const alert = document.createElement('div');
    alert.className = 'alert alert-danger';
    alert.setAttribute('role', 'alert');

    const heading = document.createElement('h4');
    heading.textContent = 'Unable to load posts';
    const message = document.createElement('p');
    message.textContent = 'Please refresh the page and try again.';

    alert.appendChild(heading);
    alert.appendChild(message);
    errorElement.appendChild(alert);

    this.postsContainer.appendChild(errorElement);
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('#posts-container')) {
    new InfiniteScroll();
  }
});
