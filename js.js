
// Mock data
let data = [];

let filteredData = [...data];
let currentModeration = null;

let imageObserver = null;

function initLazyLoading() {
    if ('IntersectionObserver' in window) {
        imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    img.classList.add('lazy-loaded');
                    imageObserver.unobserve(img);
                }
            });
        }, { rootMargin: '50px' });
    }
}

function createImage(src, className = '', alt = '') {
    const img = document.createElement('img');
    
    if (imageObserver) {
        img.dataset.src = src;
        img.className = `lazy ${className}`;
        img.alt = alt;
        img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect width="100%25" height="100%25" fill="%23f8f9fa"/%3E%3C/svg%3E';
        imageObserver.observe(img);
    } else {
        img.src = src;
        img.className = className;
        img.alt = alt;
    }
    
    return img;
}

// Вспомогательные функции
function getInitials(name) {
    if (!name) return 'N/A';
    return name.split(' ').map(word => word[0]).join('').toUpperCase();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return `${diffMinutes} мин. назад`;
    } else if (diffHours < 24) {
        return `${diffHours} ч. назад`;
    } else {
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} дн. назад`;
    }
}

function getPlacesWord(count) {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
        return 'мест';
    }

    if (lastDigit === 1) {
        return 'место';
    } else if (lastDigit >= 2 && lastDigit <= 4) {
        return 'места';
    } else {
        return 'мест';
    }
}

function getAllPhotos(item) {
    const allPhotos = [];
    if (item.guide?.places) {
        item.guide.places.forEach(place => {
            if (place.photoUris && Array.isArray(place.photoUris)) {
                allPhotos.push(...place.photoUris);
            }
        });
    }
    return allPhotos;
}

function getImageSizeClass(totalPhotos, index) {
    if (totalPhotos === 1)
        return 'single';
    if (totalPhotos === 2 && index === 0)
        return 'double';
    return '';
}

function renderGuides() {
    const grid = document.getElementById('guidesGrid');
    const emptyState = document.getElementById('emptyState');
    const guideTemplate = document.getElementById('guide-card-template');
    const imageTemplate = document.getElementById('guide-image-template');
    const placeholderTemplate = document.getElementById('image-placeholder-template');

    grid.innerHTML = '';

    if (filteredData.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    filteredData.forEach(item => {
        // Клонируем шаблон карточки
        const card = guideTemplate.content.cloneNode(true);
        const cardElement = card.querySelector('.guide-card');

        // Заполняем основные данные
        card.querySelector('.location-text').textContent = item.guide.locality || '';
        card.querySelector('.guide-author-name').textContent = item.guide.author?.name || 'Неизвестный автор';
        card.querySelector('.guide-date').textContent = formatDate(item.guide.publicationTime);
        card.querySelector('.guide-title').textContent = item.guide.title || '';
        card.querySelector('.guide-description').textContent = item.guide.description || '';
        card.querySelector('.guide-places-count').textContent =
                `${item.guide.places?.length || 0} ${getPlacesWord(item.guide.places?.length || 0)}`;

        // Обрабатываем аватар автора
        const avatarImg = card.querySelector('.guide-author-avatar[src]');
        const avatarFallback = card.querySelector('.guide-author-avatar.fallback');

        if (item.guide.author?.avatarUri) {
            avatarImg.src = item.guide.author.avatarUri;
            avatarImg.style.display = 'block';
            avatarFallback.style.display = 'none';
        } else {
            avatarImg.style.display = 'none';
            avatarFallback.style.display = 'flex';
            avatarFallback.textContent = getInitials(item.guide.author?.name || 'Unknown');
        }

        // Обрабатываем статус
        const statusElement = card.querySelector('.guide-status');
        if (item.status) {
            statusElement.textContent = item.status === 'APPROVED' ? 'Одобрено' : 'Отклонено';
            statusElement.className = `guide-status status-${item.status === 'APPROVED' ? 'approved' : 'rejected'}`;
        } else {
            statusElement.textContent = 'Ожидает';
            statusElement.className = 'guide-status status-pending';
        }

        // Обрабатываем изображения с lazy loading
        const imagesContainer = card.querySelector('.guide-images');
        const allPhotos = getAllPhotos(item);

        if (allPhotos.length === 0) {
            // Используем плейсхолдер
            const placeholder = placeholderTemplate.content.cloneNode(true);
            imagesContainer.appendChild(placeholder);
        } else {
            // Добавляем изображения с lazy loading (максимум 3)
            allPhotos.slice(0, 3).forEach((photo, index) => {
                const imageClone = imageTemplate.content.cloneNode(true);
                const img = imageClone.querySelector('.guide-image');
                
                const lazyImg = createImage(photo, `guide-image ${getImageSizeClass(allPhotos.length, index)}`);
                img.replaceWith(lazyImg);
                
                imagesContainer.appendChild(imageClone);
            });
        }

        // Обрабатываем действия (кнопки)
        const actionsContainer = card.querySelector('.guide-actions');
        if (item.status) {
            // Если статус уже есть, оставляем только кнопку просмотра
            actionsContainer.innerHTML = '';
            const viewButton = document.createElement('button');
            viewButton.className = 'btn-guide btn-view';
            viewButton.innerHTML = '<i class="bi bi-eye"></i> Подробнее';
            actionsContainer.appendChild(viewButton);
        }

        // Добавляем обработчики событий
        cardElement.addEventListener('click', (e) => {
            // Проверяем, что клик не по кнопке действия
            if (!e.target.closest('.btn-guide')) {
                openModal(item.id);
            }
        });

        const viewBtn = card.querySelector('.btn-view');
        const approveBtn = card.querySelector('.btn-approve');
        const rejectBtn = card.querySelector('.btn-reject');

        if (viewBtn) {
            viewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openModal(item.id);
            });
        }

        if (approveBtn) {
            approveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                quickApprove(item.id);
            });
        }

        if (rejectBtn) {
            rejectBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                quickReject(item.id);
            });
        }

        // Добавляем карточку в сетку
        grid.appendChild(card);
    });
}


function openModal(id) {
    currentModeration = filteredData.find(item => item.id === id);
    if (!currentModeration)
        return;

    const modalBody = document.getElementById('modalBody');
    const contentTemplate = document.getElementById('modal-content-template');
    const content = contentTemplate.content.cloneNode(true);

    // Fill author section
    const authorAvatar = content.querySelector('.modal-author-avatar');
    const authorFallback = content.querySelector('.modal-author-fallback');
    const authorName = content.querySelector('.modal-author-name');
    const publicationDate = content.querySelector('.modal-publication-date');

    if (currentModeration.guide.author?.avatarUri) {
        authorAvatar.src = currentModeration.guide.author.avatarUri;
        authorAvatar.style.display = 'block';
        authorFallback.style.display = 'none';
    } else {
        authorAvatar.style.display = 'none';
        authorFallback.style.display = 'flex';
        authorFallback.textContent = getInitials(currentModeration.guide.author?.name || 'Unknown');
    }
    authorName.textContent = currentModeration.guide.author?.name || 'Неизвестный автор';
    publicationDate.textContent = `Опубликовано ${formatDate(currentModeration.guide.publicationTime)}`;

    // Fill guide info section
    content.querySelector('.modal-guide-title').textContent = currentModeration.guide.title || '';
    content.querySelector('.locality-text').textContent = currentModeration.guide.locality || '';
    content.querySelector('.modal-guide-description').textContent = currentModeration.guide.description || '';

    // Fill places section
    const places = currentModeration.guide.places || [];
    content.querySelector('.places-count').textContent = places.length;
    const placesContainer = content.querySelector('.modal-places-container');
    
    places.forEach(place => {
        const placeTemplate = document.getElementById('place-item-template');
        const placeItem = placeTemplate.content.cloneNode(true);
        
        placeItem.querySelector('.place-name').textContent = place.name || '';
        placeItem.querySelector('.place-description').textContent = place.description || '';
        
        const placeImagesContainer = placeItem.querySelector('.place-images');
        const placeImagesCarousel = placeItem.querySelector('.place-images-carousel');
        
        if (place.photoUris && Array.isArray(place.photoUris) && place.photoUris.length > 0) {
            place.photoUris.forEach(photo => {
                const imageTemplate = document.getElementById('place-image-template');
                const imageItem = imageTemplate.content.cloneNode(true);
                const link = imageItem.querySelector('a');
                const img = imageItem.querySelector('img');
                
                link.href = photo;
                const lazyImg = createImage(photo, 'place-image');
                img.replaceWith(lazyImg);
                
                placeImagesCarousel.appendChild(imageItem);
            });
            placeImagesContainer.style.display = 'block';
        }
        
        placesContainer.appendChild(placeItem);
    });

    // Show/hide moderation section
    const moderationSection = content.querySelector('.moderation-section');
    if (!currentModeration.status) {
        moderationSection.style.display = 'block';
    }

    // Clear and populate modal body
    modalBody.innerHTML = '';
    modalBody.appendChild(content);

    // Handle modal footer
    const modalFooter = document.getElementById('modalFooter');
    const footerTemplate = currentModeration.status ? 
        document.getElementById('modal-footer-close-template') : 
        document.getElementById('modal-footer-moderation-template');
    
    const footer = footerTemplate.content.cloneNode(true);
    modalFooter.innerHTML = '';
    modalFooter.appendChild(footer);

    document.getElementById('modalTitle').textContent = `Модерация: ${currentModeration.id}`;
    document.getElementById('modalOverlay').classList.add('show');
    
    // Инициализируем lazy loading для новых изображений
    if (imageObserver) {
        const lazyImages = modalBody.querySelectorAll('img.lazy');
        lazyImages.forEach(img => imageObserver.observe(img));
    }
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('show');
    currentModeration = null;
}


async function quickApprove(id) {
    const item = filteredData.find(i => i.id === id);
    if (item) {
        try {
            const response = await fetch('/api/secure/admin/moderation/guides/approve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    moderationId: id.toString(),
                    comment: ''
                })
            });
            
            if (response.ok) {
                item.status = 'APPROVED';
                showNotification('Гайд одобрен', 'success');
                renderGuides();
                updateStats();
            } else {
                showNotification('Ошибка при одобрении', 'error');
            }
        } catch (error) {
            console.error('Error approving guide:', error);
            showNotification('Ошибка при одобрении', 'error');
        }
    }
}

async function quickReject(id) {
    const item = filteredData.find(i => i.id === id);
    if (item) {
        try {
            const response = await fetch('/api/secure/admin/moderation/guides/decline', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    moderationId: id.toString(),
                    comment: ''
                })
            });
            
            if (response.ok) {
                item.status = 'DECLINED';
                showNotification('Гайд отклонен', 'error');
                renderGuides();
                updateStats();
            } else {
                showNotification('Ошибка при отклонении', 'error');
            }
        } catch (error) {
            console.error('Error rejecting guide:', error);
            showNotification('Ошибка при отклонении', 'error');
        }
    }
}

async function approveGuide() {
    if (currentModeration) {
        const commentElement = document.getElementById('moderatorComment');
        const comment = commentElement ? commentElement.value : '';
        
        try {
            const response = await fetch('/api/secure/admin/moderation/guides/approve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    moderationId: currentModeration.id.toString(),
                    comment: comment
                })
            });
            
            if (response.ok) {
                currentModeration.status = 'APPROVED';
                currentModeration.moderatorComment = comment;
                showNotification('Гайд успешно одобрен', 'success');
                closeModal();
                renderGuides();
                updateStats();
            } else {
                showNotification('Ошибка при одобрении', 'error');
            }
        } catch (error) {
            console.error('Error approving guide:', error);
            showNotification('Ошибка при одобрении', 'error');
        }
    }
}

async function rejectGuide() {
    if (currentModeration) {
        const commentElement = document.getElementById('moderatorComment');
        const comment = commentElement ? commentElement.value : '';
        if (!comment) {
            alert('Пожалуйста, укажите причину отклонения');
            return;
        }
        
        try {
            const response = await fetch('/api/secure/admin/moderation/guides/decline', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    moderationId: currentModeration.id.toString(),
                    comment: comment
                })
            });
            
            if (response.ok) {
                currentModeration.status = 'DECLINED';
                currentModeration.moderatorComment = comment;
                showNotification('Гайд отклонен', 'error');
                closeModal();
                renderGuides();
                updateStats();
            } else {
                showNotification('Ошибка при отклонении', 'error');
            }
        } catch (error) {
            console.error('Error rejecting guide:', error);
            showNotification('Ошибка при отклонении', 'error');
        }
    }
}

function applyFilters() {
    const status = document.getElementById('filterStatus').value;
    const sort = document.getElementById('filterSort').value;
    const search = document.getElementById('filterSearch').value.toLowerCase();
    filteredData = [...data];
    // Filter by status
    if (status) {
        filteredData = filteredData.filter(item => {
            if (status === 'pending')
                return !item.status || item.status === 'APPROVING';
            if (status === 'approved')
                return item.status === 'APPROVED';
            if (status === 'rejected')
                return item.status === 'DECLINED';
            return true;
        });
    }

    // Filter by search
    if (search) {
        filteredData = filteredData.filter(item =>
            (item.guide?.title || '').toLowerCase().includes(search) ||
                    (item.guide?.author?.name || '').toLowerCase().includes(search)
        );
    }

    // Sort
    filteredData.sort((a, b) => {
        switch (sort) {
            case 'date-desc':
                return new Date(b.guide?.publicationTime || 0) - new Date(a.guide?.publicationTime || 0);
            case 'date-asc':
                return new Date(a.guide?.publicationTime || 0) - new Date(b.guide?.publicationTime || 0);
            case 'places-desc':
                return (b.guide?.places?.length || 0) - (a.guide?.places?.length || 0);
            default:
                return 0;
        }
    });
    renderGuides();
}

function updateStats() {
    const pending = data.filter(i => !i.status).length;
    const today = data.filter(i => {
        const pubTime = i.guide?.publicationTime;
        if (!pubTime) return false;
        const date = new Date(pubTime);
        const now = new Date();
        return date.toDateString() === now.toDateString();
    }).length;
    const approved = data.filter(i => i.status === 'APPROVED').length;
    const rejected = data.filter(i => i.status === 'DECLINED').length;
    document.getElementById('statPending').textContent = pending;
    document.getElementById('statToday').textContent = today;
    document.getElementById('statApproved').textContent = approved;
    document.getElementById('statRejected').textContent = rejected;
}

function showNotification(message, type) {
    const notificationTemplate = document.getElementById('notification-template');
    const notification = notificationTemplate.content.cloneNode(true);
    
    const notificationDiv = notification.querySelector('.notification');
    const iconElement = notification.querySelector('.notification-icon-element');
    const messageElement = notification.querySelector('.notification-message');
    
    notificationDiv.classList.add(type);
    iconElement.className = `bi bi-${type === 'success' ? 'check' : 'x'}-lg`;
    messageElement.textContent = message;
    
    document.body.appendChild(notification);
    
    // Use setTimeout with DOM manipulation instead of jQuery
    setTimeout(() => {
        const notificationElement = document.querySelector('.notification:last-child');
        if (notificationElement) {
            notificationElement.style.opacity = '0';
            setTimeout(() => notificationElement.remove(), 300);
        }
    }, 3000);
}

async function refreshData() {
    try {
        const response = await fetch('../../api/secure/admin/moderation/guides');
        if (!response.ok) {
            throw new Error(`API error: status ${response.status}`);
        }
        data = await response.json();
        applyFilters();
        updateStats();
    } catch (error) {
        console.error('Error fetching data:', error);
        showNotification('Ошибка загрузки данных', 'error');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Инициализируем lazy loading
    initLazyLoading();
    
    refreshData();
    document.getElementById('modalOverlay').addEventListener('click', function (e) {
        if (e.target === this) {
            closeModal();
        }
    });
});