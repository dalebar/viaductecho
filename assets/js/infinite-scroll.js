class InfiniteScroll {
  constructor() {
    this.postsContainer = document.querySelector('#posts-container');
    this.loadingIndicator = document.querySelector('#loading-indicator');
    this.posts = [];
    this.currentIndex = 0;
    this.postsPerLoad = 12;
    this.isLoading = false;
    this.hasMorePosts = true;

    this.init();
  }

  async init() {
    // Load all posts data
    try {
      const response = await fetch('/api/posts.json');
      const data = await response.json();
      this.posts = data.posts;

      // Separate featured posts
      this.featuredPosts = this.posts.filter(post => post.featured);
      this.regularPosts = this.posts.filter(post => !post.featured);

      // Load initial posts
      this.loadInitialPosts();

      // Set up scroll listener
      this.setupScrollListener();
    } catch (error) {
      console.error('Failed to load posts:', error);
      this.showError();
    }
  }

  loadInitialPosts() {
    // Clear existing posts (except featured)
    const existingPosts = this.postsContainer.querySelectorAll('.regular-post');
    existingPosts.forEach(post => post.remove());

    // Load first batch of regular posts
    this.loadMorePosts();
  }

  loadMorePosts() {
    if (this.isLoading || !this.hasMorePosts) return;

    this.isLoading = true;
    this.showLoading();

    // Simulate network delay for better UX
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

      // Apply lazy loading to new images
      this.applyLazyLoading();
    }, 500);
  }

  renderPost(post) {
    const postElement = document.createElement('div');
    postElement.className = 'col-12 col-md-6 col-lg-4 mb-4 regular-post';

    postElement.innerHTML = `
      <div class="card">
        <a href="${post.url}">
          ${post.image ? `<img class="rounded mb-4" data-src="${post.image}" alt="${post.title}" loading="lazy">` : ''}
        </a>
        <div class="card-block">
          <h2 class="card-title h4 serif-font"><a href="${post.url}">${post.title}</a></h2>
          <p class="card-text text-muted">${post.excerpt}</p>
          <div class="metafooter">
            <div class="wrapfooter small d-flex align-items-center">
              <span class="author-meta">
                By <span class="post-name">${post.author},</span>
                on <span class="post-date">${post.date}</span>
              </span>
              <div class="clearfix"></div>
            </div>
          </div>
        </div>
      </div>
    `;

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

    // Load more when user is 200px from bottom
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

            // Add fade-in effect
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
      // Fallback for older browsers
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
    errorElement.innerHTML = `
      <div class="alert alert-danger" role="alert">
        <h4>Unable to load posts</h4>
        <p>Please refresh the page and try again.</p>
      </div>
    `;
    this.postsContainer.appendChild(errorElement);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('#posts-container')) {
    new InfiniteScroll();
  }
});