/**
 * NewsArticle - Отображение отдельной статьи новости
 * Отвечает за загрузку и рендеринг полной статьи
 */
class NewsArticle {
    constructor() {
        this.loader = new NewsLoader();
        this.article = null;
        this.currentId = null;
        
        // Элементы страницы
        this.container = document.querySelector('.article-page');
        this.loadingElement = document.querySelector('#loading-overlay');
        this.errorElement = document.querySelector('#error-message');
        this.relatedContainer = document.querySelector('#related-articles');
    }

    /**
     * Инициализация страницы статьи
     */
    async init() {
        this.currentId = this.getIdFromUrl();
        
        if (!this.currentId) {
            this.showError('ID статьи не указан');
            return;
        }

        try {
            this.showLoading();
            
            // Загружаем статью
            this.article = await this.loader.loadArticle(this.currentId);
            
            if (!this.article) {
                this.showError('Статья не найдена');
                return;
            }

            // Рендерим статью
            await this.render();
            await this.renderRelated();
            await this.renderSidebar();
            await this.renderNavigation();
            this.setupEvents();
            this.updatePageMeta();
            this.hideLoading();
            
        } catch (error) {
            console.error('Failed to load article:', error);
            this.showError('Ошибка загрузки статьи');
        }
    }

    /**
     * Получает ID статьи из URL
     */
    getIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    /**
     * Рендерит основное содержимое статьи
     */
    async render() {
        if (!this.article) return;

        const categoryName = this.getCategoryName(this.article.category);
        const formattedDate = this.formatDate(this.article.publishedAt);
        const imageUrl = this.article.image?.url || this.article.image;

        // Обновляем заголовок страницы
        document.title = `${this.article.title} - Федерація Дзюдо України`;

        // Обновляем breadcrumb с категорией
        this.updateBreadcrumbs();

        // Скрываем старый header, так как информация теперь в overlay
        const articleHeader = document.querySelector('.article-header');
        if (articleHeader) {
            articleHeader.style.display = 'none';
        }

        // Обновляем изображение и создаем overlay-дизайн
        const imageElement = document.getElementById('article-image');
        const imageContainer = document.querySelector('.article-image-container');
        console.log('Article image URL:', imageUrl); // Отладка
        
        if (imageElement && imageUrl && imageContainer) {
            imageElement.src = imageUrl;
            imageElement.alt = this.article.title;
            imageElement.style.display = 'block';
            imageContainer.style.display = 'block';
            imageContainer.classList.add('loaded');
            
            // Создаем overlay с информацией
            const overlayHTML = `
                <div class="article-image-overlay">
                    <div class="article-overlay-content">
                        <span class="article-category-overlay">${categoryName}</span>
                        <h1 class="article-title-overlay">${this.article.title}</h1>
                        <div class="article-meta-overlay">
                            <div class="meta-item">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="10"/>
                                    <polyline points="12,6 12,12 16,14"/>
                                </svg>
                                <span>${formattedDate}</span>
                            </div>
                            <div class="meta-item">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                </svg>
                                <span>${this.article.author?.name || 'ФДУ'}</span>
                            </div>
                            <div class="meta-item">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                                </svg>
                                <span>${Math.ceil(this.article.content.split(' ').length / 200)} хв читання</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            imageContainer.innerHTML = `
                <img id="article-image" src="${imageUrl}" alt="${this.article.title}" class="article-image">
                ${overlayHTML}
            `;
            
        } else {
            console.log('No image URL found for article:', this.article.title);
            if (imageContainer) {
                imageContainer.style.display = 'none';
            }
        }

        // Обновляем контент
        const contentElement = document.getElementById('article-content');
        if (contentElement) {
            contentElement.innerHTML = this.article.content;
        }

        // Обновляем теги
        const tagsContainer = document.getElementById('article-tags');
        if (tagsContainer && this.article.tags && this.article.tags.length > 0) {
            tagsContainer.innerHTML = this.article.tags.map(tag => `
                <span class="tag">${tag}</span>
            `).join('');
        }
    }

    /**
     * Рендерит похожие статьи
     */
    async renderRelated() {
        const relatedContainer = document.getElementById('related-articles');
        if (!relatedContainer || !this.article) return;

        try {
            const relatedArticles = await this.loader.getRelatedArticles(this.article, 4);
            
            if (relatedArticles.length === 0) {
                const widget = relatedContainer.closest('.sidebar-widget');
                if (widget) widget.style.display = 'none';
                return;
            }

            const relatedHTML = relatedArticles.map(article => {
                const imageUrl = article.image?.url || article.image || '';
                return `
                    <div class="related-article">
                        <a href="news-article.html?id=${article.slugId}" class="related-article-link">
                            <div class="related-article-image">
                                ${imageUrl ? `<img src="${imageUrl}" alt="${article.title}" loading="lazy">` : '<div class="image-placeholder"></div>'}
                            </div>
                            <div class="related-article-content">
                                <h4 class="related-article-title">${article.title}</h4>
                                <span class="related-article-date">${this.formatDate(article.publishedAt)}</span>
                            </div>
                        </a>
                    </div>
                `;
            }).join('');

            relatedContainer.innerHTML = relatedHTML;
            
        } catch (error) {
            console.warn('Failed to load related articles:', error);
        }
    }

    /**
     * Рендерит сайдбар
     */
    async renderSidebar() {
        // Обновляем только "Останні новини" секцію
        const recentArticlesContainer = document.getElementById('sidebar-recent-articles');
        if (!recentArticlesContainer) return;

        try {
            // Получаем все статьи
            const allArticles = await this.loader.scanArticles();
            
            // Получаем последние статьи
            const latestArticles = allArticles
                .filter(article => article.id !== this.article.id)
                .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
                .slice(0, 5);

            const recentHTML = latestArticles.map(article => {
                const imageUrl = article.image?.url || article.image || '';
                console.log('Sidebar article image data:', article.title, imageUrl); // Отладка
                return `
                    <div class="sidebar-recent-article">
                        <a href="news-article.html?id=${article.slugId}" class="recent-article-link">
                            <div class="sidebar-recent-article-image">
                                ${imageUrl ? `<img src="${imageUrl}" alt="${article.title}" loading="lazy">` : '<div class="image-placeholder"></div>'}
                            </div>
                            <div class="sidebar-recent-article-content">
                                <h4 class="sidebar-recent-article-title">${article.title}</h4>
                                <span class="sidebar-recent-article-date">${this.formatDate(article.publishedAt)}</span>
                            </div>
                        </a>
                    </div>
                `;
            }).join('');

            recentArticlesContainer.innerHTML = recentHTML;
            
        } catch (error) {
            console.warn('Failed to render sidebar:', error);
        }
    }

    /**
     * Получает категории с количеством
     */
    getCategories(articles) {
        const categories = {};
        
        articles.forEach(article => {
            if (!categories[article.category]) {
                categories[article.category] = {
                    id: article.category,
                    name: this.getCategoryName(article.category),
                    count: 0
                };
            }
            categories[article.category].count++;
        });

        return Object.values(categories);
    }

    /**
     * Рендерит навигацию между статьями
     */
    async renderNavigation() {
        try {
            // Получаем все статьи
            const allArticles = await this.loader.scanArticles();
            
            // Сортируем по дате публикации
            const sortedArticles = allArticles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
            
            // Находим текущую статью
            const currentIndex = sortedArticles.findIndex(article => article.slugId === this.article.slugId);
            
            const prevArticle = currentIndex < sortedArticles.length - 1 ? sortedArticles[currentIndex + 1] : null;
            const nextArticle = currentIndex > 0 ? sortedArticles[currentIndex - 1] : null;
            
            // Ищем контейнер для навигации (после тегов или действий)
            let navigationContainer = document.querySelector('.article-navigation');
            
            if (!navigationContainer) {
                // Создаем контейнер навигации
                const actionsContainer = document.querySelector('.article-actions');
                if (actionsContainer) {
                    navigationContainer = document.createElement('div');
                    navigationContainer.className = 'article-navigation';
                    actionsContainer.parentNode.insertBefore(navigationContainer, actionsContainer.nextSibling);
                } else {
                    // Если нет actions, добавляем в конец основного контента
                    const mainContent = document.querySelector('.article-main');
                    if (mainContent) {
                        navigationContainer = document.createElement('div');
                        navigationContainer.className = 'article-navigation';
                        mainContent.appendChild(navigationContainer);
                    }
                }
            }
            
            if (navigationContainer) {
                navigationContainer.innerHTML = `
                    <div class="nav-links">
                        <div class="nav-link-item">
                            ${prevArticle ? `
                                <a href="news-article.html?id=${prevArticle.slugId}" class="nav-button prev-button">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M15 18L9 12L15 6"/>
                                    </svg>
                                </a>
                            ` : ''}
                        </div>
                        
                        <div class="nav-center">
                            <a href="news.html" class="back-to-news">
                                <div class="back-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z"/>
                                        <polyline points="3,9 12,2 21,9"/>
                                    </svg>
                                </div>
                                <span>Всі новини</span>
                            </a>
                        </div>
                        
                        <div class="nav-link-item">
                            ${nextArticle ? `
                                <a href="news-article.html?id=${nextArticle.slugId}" class="nav-button next-button">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M9 18L15 12L9 6"/>
                                    </svg>
                                </a>
                            ` : ''}
                        </div>
                    </div>
                `;
            }
            
        } catch (error) {
            console.warn('Failed to render navigation:', error);
        }
    }

    /**
     * Обновляет breadcrumbs с категорией
     */
    updateBreadcrumbs() {
        if (!this.article) return;

        const breadcrumbNav = document.querySelector('.breadcrumb-nav');
        if (!breadcrumbNav) return;

        const categoryName = this.getCategoryName(this.article.category);
        const articleTitle = this.article.title;
        
        // Обрезаем длинные заголовки для мобильных
        const shortTitle = articleTitle.length > 50 ? 
            articleTitle.substring(0, 47) + '...' : articleTitle;

        breadcrumbNav.innerHTML = `
            <a href="index.html">Головна</a>
            <span class="breadcrumb-separator">›</span>
            <a href="news.html">Новини</a>
            <span class="breadcrumb-separator">›</span>
            <a href="news.html?category=${this.article.category}">${categoryName}</a>
            <span class="breadcrumb-separator">›</span>
            <span id="breadcrumb-title">${shortTitle}</span>
        `;
    }

    /**
     * Обновляет мета-теги страницы
     */
    updatePageMeta() {
        if (!this.article) return;

        document.title = `${this.article.title} - Федерація Дзюдо України`;

        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.content = this.article.excerpt;
        }
    }

    /**
     * Настройка событий
     */
    setupEvents() {
        document.querySelectorAll('[data-share]').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.share(button.dataset.share);
            });
        });
    }

    /**
     * Поделиться
     */
    share(platform) {
        const url = encodeURIComponent(window.location.href);
        const title = encodeURIComponent(this.article.title);

        const shareUrls = {
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
            telegram: `https://t.me/share/url?url=${url}&text=${title}`,
            copy: () => {
                navigator.clipboard.writeText(window.location.href);
                this.showNotification('Посилання скопійовано!');
            }
        };

        if (shareUrls[platform]) {
            if (typeof shareUrls[platform] === 'function') {
                shareUrls[platform]();
            } else {
                window.open(shareUrls[platform], '_blank', 'width=600,height=400');
            }
        }
    }

    /**
     * Показать уведомление
     */
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 3000);
    }

    getCategoryName(category) {
        const categories = {
            'achievements': 'Досягнення',
            'competitions': 'Змагання',
            'events': 'Події',
            'announcements': 'Анонси'
        };
        return categories[category] || category;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('uk-UA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    showLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'flex';
        }
    }

    hideLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'none';
        }
    }

    showError(message) {
        this.hideLoading();
        if (this.errorElement) {
            this.errorElement.style.display = 'block';
            const messageElement = this.errorElement.querySelector('h2');
            if (messageElement) {
                messageElement.textContent = 'Помилка завантаження';
            }
            const textElement = this.errorElement.querySelector('p');
            if (textElement) {
                textElement.textContent = message;
            }
        }
    }
}

// Экспорт
if (typeof window !== 'undefined') {
    window.NewsArticle = NewsArticle;
} 