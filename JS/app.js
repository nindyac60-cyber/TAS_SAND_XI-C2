// ========================
// DATA MANAGEMENT
// ========================

let allProducts = [];
let mitraData = null;
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let purchaseHistory = JSON.parse(localStorage.getItem('history')) || [];
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || {
    name: 'Pengguna',
    email: 'pengguna@example.com'
};

let currentModalProduct = null;

// ========================
// INITIALIZE APP
// ========================

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    updateCartBadge();
    
    // Trigger splash screen and animations
    setTimeout(() => {
        animatePageEntry();
    }, 2800);
    
    showPage('beranda');
});

// ========================
// DATA LOADING
// ========================

async function loadData() {
    try {
        // Load Produk Data
        const produkResponse = await fetch('DATA/Tabel Produk_rows.json');
        allProducts = await produkResponse.json();
        console.log('✅ Produk data loaded:', allProducts.length, 'items');

        // Load Mitra Data
        const mitraResponse = await fetch('DATA/Tabel_mitra_rows.json');
        mitraData = await mitraResponse.json()[0];
        console.log('✅ Mitra data loaded:', mitraData);

        // Initialize pages
        displayProducts('Semua', 'featured-products', 6);
        displayProducts('Semua', 'all-products', allProducts.length);
        updateProfilePage();
    } catch (error) {
        console.error('❌ Error loading data:', error);
        alert('Gagal memuat data. Silakan refresh halaman.');
    }
}

// ========================
// PRODUCT DISPLAY
// ========================

function displayProducts(category, containerId, limit = null) {
    const container = document.getElementById(containerId);
    
    let products = allProducts;
    if (category !== 'Semua') {
        products = allProducts.filter(p => p.produk_category === category);
    }

    if (limit) {
        products = products.slice(0, limit);
    }

    container.innerHTML = products.map(product => `
        <div class="product-card" onclick="openProductModal('${product.produk_id}')">
            <div class="product-image">
                <img src="${product.produk_image}" alt="${product.produk_name}" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="image-fallback" style="display: none; align-items: center; justify-content: center; width: 100%; height: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 48px;">
                    <i class="fas fa-image"></i>
                </div>
            </div>
            <div class="product-info">
                <div class="product-name">${product.produk_name}</div>
                <div class="product-category">${product.produk_category}</div>
                <div class="product-footer">
                    <div class="product-price">Rp ${formatPrice(product.produk_price)}</div>
                    <button class="btn-add" onclick="event.stopPropagation(); addToCartQuick('${product.produk_id}', this)">
                        Beli
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ========================
// MODAL FUNCTIONALITY
// ========================

function openProductModal(productId) {
    const product = allProducts.find(p => p.produk_id === productId);
    if (!product) return;

    currentModalProduct = product;

    document.getElementById('modal-name').textContent = product.produk_name;
    document.getElementById('modal-category').textContent = product.produk_category;
    document.getElementById('modal-price').textContent = `Rp ${formatPrice(product.produk_price)}`;
    document.getElementById('modal-stock').textContent = `${product.produk_stock} tersedia`;
    document.getElementById('modal-image').src = product.produk_image;
    document.getElementById('modal-image').alt = product.produk_name;
    document.getElementById('modal-image').onerror = function() {
        this.style.display = 'none';
        const fallback = document.querySelector('.modal-image-fallback');
        if (fallback) {
            fallback.style.display = 'flex';
        }
    };
    document.getElementById('qty-input').value = 1;
    document.getElementById('qty-input').max = product.produk_stock;

    const modal = document.getElementById('product-modal');
    modal.classList.add('show');
}

function closeProductModal() {
    const modal = document.getElementById('product-modal');
    modal.classList.remove('show');
    currentModalProduct = null;
}

// Quantity controls
document.getElementById('qty-plus')?.addEventListener('click', () => {
    const input = document.getElementById('qty-input');
    input.value = Math.min(parseInt(input.value) + 1, parseInt(input.max));
});

document.getElementById('qty-minus')?.addEventListener('click', () => {
    const input = document.getElementById('qty-input');
    input.value = Math.max(parseInt(input.value) - 1, 1);
});

document.getElementById('btn-modal-add-cart')?.addEventListener('click', () => {
    if (!currentModalProduct) return;
    
    const quantity = parseInt(document.getElementById('qty-input').value);
    addToCart(currentModalProduct.produk_id, quantity);
    closeProductModal();
});

document.getElementById('product-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'product-modal') {
        closeProductModal();
    }
});

document.querySelector('.modal-close')?.addEventListener('click', closeProductModal);

// WhatsApp modal close
document.getElementById('whatsapp-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'whatsapp-modal') {
        closeWhatsAppModal();
    }
});

// ========================
// CART MANAGEMENT
// ========================

function addToCart(productId, quantity = 1) {
    const product = allProducts.find(p => p.produk_id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.produk_id === productId);

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            ...product,
            quantity: quantity
        });
    }

    saveCart();
    updateCartBadge();
    showNotification(`${product.produk_name} ditambahkan ke keranjang!`);
}

function addToCartQuick(productId, element) {
    // Add ripple effect
    if (element) {
        createRipple(element);
    }
    addToCart(productId, 1);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.produk_id !== productId);
    saveCart();
    displayCart();
    updateCartBadge();
}

function updateCartQuantity(productId, newQuantity) {
    const item = cart.find(item => item.produk_id === productId);
    if (item) {
        item.quantity = Math.max(1, newQuantity);
        saveCart();
        displayCart();
    }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    badge.textContent = count;
    
    // Animate badge
    badge.classList.remove('bounce');
    // Trigger reflow to restart animation
    void badge.offsetWidth;
    badge.classList.add('bounce');
    
    if (count === 0) {
        badge.classList.add('hidden');
    } else {
        badge.classList.remove('hidden');
    }
}

function displayCart() {
    const cartContainer = document.getElementById('cart-container');
    const cartSummary = document.getElementById('cart-summary');
    const emptyCart = document.getElementById('empty-cart');
    const whatsappBtn = document.getElementById('btn-whatsapp-order');

    if (cart.length === 0) {
        cartContainer.innerHTML = '';
        cartSummary.style.display = 'none';
        emptyCart.style.display = 'flex';
        whatsappBtn.style.display = 'none';
        return;
    }

    emptyCart.style.display = 'none';
    cartSummary.style.display = 'block';
    whatsappBtn.style.display = 'block';

    cartContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-image">
                <img src="${item.produk_image}" alt="${item.produk_name}" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="image-fallback" style="display: none; align-items: center; justify-content: center; width: 100%; height: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 32px;">
                    <i class="fas fa-image"></i>
                </div>
            </div>
            <div class="cart-item-details">
                <div class="cart-item-name">${item.produk_name}</div>
                <div class="cart-item-price">Rp ${formatPrice(item.produk_price)}</div>
                <div class="cart-item-controls">
                    <button class="cart-qty-btn" onclick="updateCartQuantity('${item.produk_id}', ${item.quantity - 1})">−</button>
                    <span class="cart-qty-display">${item.quantity}</span>
                    <button class="cart-qty-btn" onclick="updateCartQuantity('${item.produk_id}', ${item.quantity + 1})">+</button>
                    <button class="cart-remove" onclick="removeFromCart('${item.produk_id}')">Hapus</button>
                </div>
            </div>
        </div>
    `).join('');

    updateCartSummary();
}

function updateCartSummary() {
    const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.produk_price) * item.quantity), 0);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    document.getElementById('subtotal').textContent = `Rp ${formatPrice(subtotal.toString())}`;
    document.getElementById('tax').textContent = `Rp ${formatPrice(tax.toString())}`;
    document.getElementById('total').textContent = `Rp ${formatPrice(total.toString())}`;
}

// ========================
// NAVIGATION
// ========================

function setupEventListeners() {
    // Bottom nav buttons
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            showPage(page);
        });
    });

    // Category filters
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const category = btn.dataset.category;
            displayProducts(category, 'all-products', allProducts.length);
        });
    });

    // Checkout button
    document.querySelector('.btn-checkout')?.addEventListener('click', checkout);

    // WhatsApp Order button
    document.getElementById('btn-whatsapp-order')?.addEventListener('click', orderViaWhatsApp);

    // Logout button
    document.querySelector('.btn-logout')?.addEventListener('click', logout);
}

function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Show selected page
    const page = document.getElementById(`page-${pageName}`);
    if (page) {
        page.classList.add('active');
    }

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-page="${pageName}"]`)?.classList.add('active');

    // Update header title with animation
    const titles = {
        beranda: 'Beranda',
        keranjang: 'Keranjang Belanja',
        riwayat: 'Riwayat Pembelian',
        profile: 'Profile'
    };
    
    animateHeaderTitle(titles[pageName] || 'Kantin Mbak Sari');

    // Load page-specific data
    if (pageName === 'keranjang') {
        displayCart();
    } else if (pageName === 'riwayat') {
        displayHistory();
    }
}

// ========================
// PROFILE PAGE
// ========================

function animateHeaderTitle(newTitle) {
    const titleElement = document.getElementById('page-title');
    
    // Remove animation class if exists
    titleElement.classList.remove('page-title-animated');
    
    // Trigger reflow to restart animation
    void titleElement.offsetWidth;
    
    // Update text
    titleElement.textContent = newTitle;
    
    // Add animation class
    titleElement.classList.add('page-title-animated');
}

function animatePageEntry() {
    // Add animation to elements
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    const headerIcon = document.querySelector('.header-icon');
    
    if (pageTitle) pageTitle.classList.add('page-title-animated');
    if (pageSubtitle) pageSubtitle.classList.add('page-subtitle-animated');
    if (headerIcon) headerIcon.classList.add('animated');
}

function updateProfilePage() {
    if (mitraData) {
        document.getElementById('store-name').textContent = mitraData.mitra_name || '-';
        document.getElementById('store-owner').textContent = mitraData.owner_name || '-';
        document.getElementById('store-phone').textContent = mitraData.phone_owner || '-';
        document.getElementById('store-email').textContent = mitraData.email_owner || '-';
        document.getElementById('store-address').textContent = mitraData.addres_owner || '-';
        document.getElementById('store-category').textContent = mitraData.kategori || '-';
        document.getElementById('store-school').textContent = mitraData.sekolah || '-';
        document.getElementById('total-products').textContent = allProducts.length;
    }

    document.getElementById('user-name').textContent = currentUser.name;
    document.getElementById('user-email').textContent = currentUser.email;
    document.getElementById('total-orders').textContent = purchaseHistory.length;
}

// ========================
// HISTORY PAGE
// ========================

function displayHistory() {
    const historyContainer = document.getElementById('history-container');
    const emptyHistory = document.getElementById('empty-history');

    if (purchaseHistory.length === 0) {
        historyContainer.innerHTML = '';
        emptyHistory.style.display = 'flex';
        return;
    }

    emptyHistory.style.display = 'none';

    historyContainer.innerHTML = purchaseHistory.reverse().map((order, index) => `
        <div class="history-item">
            <div class="history-header">
                <span class="history-order-id">Pesanan #${order.orderId}</span>
                <span class="history-date">${new Date(order.date).toLocaleDateString('id-ID')}</span>
            </div>
            <div class="history-products">
                ${order.items.map(item => `${item.produk_name} x${item.quantity}`).join('<br>')}
            </div>
            <div class="history-total">
                <span>Total</span>
                <span>Rp ${formatPrice(order.total.toString())}</span>
            </div>
            <div class="history-status">Selesai</div>
        </div>
    `).join('');
}

// ========================
// CHECKOUT
// ========================

function checkout() {
    if (cart.length === 0) {
        alert('Keranjang Anda kosong!');
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.produk_price) * item.quantity), 0);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    const orderId = 'ORD-' + Date.now();
    const order = {
        orderId: orderId,
        date: new Date().toISOString(),
        items: cart.map(item => ({
            produk_id: item.produk_id,
            produk_name: item.produk_name,
            produk_price: item.produk_price,
            quantity: item.quantity
        })),
        subtotal: subtotal,
        tax: tax,
        total: total
    };

    purchaseHistory.push(order);
    localStorage.setItem('history', JSON.stringify(purchaseHistory));

    alert(`Pesanan berhasil!\n\nNomor Pesanan: ${orderId}\nTotal: Rp ${formatPrice(total.toString())}`);

    // Clear cart
    cart = [];
    saveCart();
    updateCartBadge();
    displayCart();

    // Update profile
    document.getElementById('total-orders').textContent = purchaseHistory.length;

    // Show confirmation
    showPage('riwayat');
}

// ========================
// WHATSAPP ORDER
// ========================

function orderViaWhatsApp() {
    console.log('🔵 orderViaWhatsApp called');
    console.log('mitraData:', mitraData);
    console.log('cart length:', cart.length);
    
    if (cart.length === 0 || !mitraData) {
        console.error('❌ Cart kosong atau mitraData tidak tersedia');
        alert('Keranjang kosong atau data toko tidak tersedia!');
        return;
    }

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.produk_price) * item.quantity), 0);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    // Fill modal with data
    console.log('📝 Filling modal with data...');
    const nameElement = document.getElementById('wa-store-name');
    const ownerElement = document.getElementById('wa-store-owner');
    const phoneElement = document.getElementById('wa-store-phone');
    
    if (nameElement) nameElement.textContent = mitraData.mitra_name || '-';
    if (ownerElement) ownerElement.textContent = mitraData.owner_name || '-';
    if (phoneElement) {
        phoneElement.textContent = mitraData.phone_owner || '-';
        console.log('✅ Phone number set:', mitraData.phone_owner);
    } else {
        console.error('❌ Phone element not found!');
    }
    
    // Display order items
    const waOrderItems = document.getElementById('wa-order-items');
    if (waOrderItems) {
        waOrderItems.innerHTML = cart.map((item, index) => `
            <div class="wa-item">
                <span class="wa-item-name">${index + 1}. ${item.produk_name}</span>
                <span class="wa-item-qty">x${item.quantity}</span>
                <span class="wa-item-price">Rp ${formatPrice((parseFloat(item.produk_price) * item.quantity).toString())}</span>
            </div>
        `).join('');
    }

    // Display total
    const totalElement = document.getElementById('wa-total-price');
    if (totalElement) {
        totalElement.textContent = `Rp ${formatPrice(total.toString())}`;
    }

    // Show modal
    const modal = document.getElementById('whatsapp-modal');
    if (modal) {
        modal.classList.add('show');
        console.log('✅ Modal shown');
    } else {
        console.error('❌ Modal element not found!');
    }
}

function closeWhatsAppModal() {
    const modal = document.getElementById('whatsapp-modal');
    modal.classList.remove('show');
}

function sendWhatsAppOrder() {
    if (cart.length === 0 || !mitraData) {
        alert('Karena error, silakan coba lagi!');
        return;
    }

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.produk_price) * item.quantity), 0);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    // Generate order message
    let message = `*PESANAN BARU - KANTIN MBAK SARI*\n\n`;
    message += `👤 *Pelanggan:* ${currentUser.name}\n`;
    message += `📧 *Email:* ${currentUser.email}\n`;
    message += `📅 *Tanggal:* ${new Date().toLocaleDateString('id-ID')}\n\n`;

    message += `*📋 DETAIL PESANAN:*\n`;
    cart.forEach((item, index) => {
        message += `${index + 1}. ${item.produk_name}\n`;
        message += `   Jumlah: ${item.quantity} x Rp ${formatPrice(item.produk_price)}\n`;
        message += `   Subtotal: Rp ${formatPrice((parseFloat(item.produk_price) * item.quantity).toString())}\n\n`;
    });

    message += `*💰 RINGKASAN PEMBAYARAN:*\n`;
    message += `Subtotal: Rp ${formatPrice(subtotal.toString())}\n`;
    message += `Pajak (10%): Rp ${formatPrice(tax.toString())}\n`;
    message += `*TOTAL: Rp ${formatPrice(total.toString())}*\n\n`;

    message += `🏫 *Alamat Pengiriman:* ${mitraData.sekolah}\n`;
    message += `📍 *Lokasi Toko:* ${mitraData.addres_owner}\n\n`;

    message += `Mohon konfirmasi pesanan ini. Terima kasih! 🙏`;

    // Clean phone number (remove any non-numeric characters except +)
    const phoneNumber = mitraData.phone_owner.replace(/[^\d+]/g, '');
    
    // Ensure it starts with country code (assuming Indonesia +62)
    let whatsappNumber = phoneNumber;
    if (phoneNumber.startsWith('0')) {
        whatsappNumber = '62' + phoneNumber.substring(1);
    } else if (!phoneNumber.startsWith('+') && !phoneNumber.startsWith('62')) {
        whatsappNumber = '62' + phoneNumber;
    }

    // Create WhatsApp URL
    const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    // Close modal
    closeWhatsAppModal();

    // Open WhatsApp
    setTimeout(() => {
        window.open(whatsappURL, '_blank');
        showNotification('Membuka WhatsApp untuk pemesanan...');
    }, 300);
}

// ========================
// LOGOUT
// ========================

function logout() {
    const confirmed = confirm('Apakah Anda yakin ingin logout?');
    if (confirmed) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('cart');
        localStorage.removeItem('history');
        
        currentUser = { name: 'Pengguna', email: 'pengguna@example.com' };
        cart = [];
        purchaseHistory = [];
        
        updateProfilePage();
        updateCartBadge();
        showPage('beranda');
        
        alert('Anda telah logout.');
    }
}

// ========================
// UTILITY FUNCTIONS
// ========================

function formatPrice(price) {
    return parseInt(price).toLocaleString('id-ID');
}

function showNotification(message) {
    // Fun notification with animation
    const notification = document.createElement('div');
    notification.className = 'fun-notification';
    
    // Fun icon options
    const icons = ['🛒', '✨', '🎉', '💫', '⭐', '🌟'];
    const randomIcon = icons[Math.floor(Math.random() * icons.length)];
    
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${randomIcon}</span>
            <span class="notification-text">${message}</span>
            <span class="notification-icon">${randomIcon}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Create floating particles
    createFloatingParticles(notification);
    
    // Remove after animation
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

function createFloatingParticles(targetElement) {
    // Create fun floating particles
    for (let i = 0; i < 5; i++) {
        const particle = document.createElement('div');
        particle.className = 'floating-particle';
        particle.innerHTML = '💚';
        
        const rect = targetElement.getBoundingClientRect();
        particle.style.left = rect.left + rect.width / 2 + 'px';
        particle.style.top = rect.top + rect.height / 2 + 'px';
        
        document.body.appendChild(particle);
        
        // Remove particle after animation
        setTimeout(() => {
            particle.remove();
        }, 2000);
    }
}

function createRipple(element) {
    const ripple = document.createElement('span');
    ripple.classList.add('ripple-effect');
    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// ========================
// SEARCH FUNCTIONALITY
// ========================

function searchProducts(keyword) {
    if (!keyword) {
        displayProducts('Semua', 'all-products', allProducts.length);
        return;
    }

    const results = allProducts.filter(product =>
        product.produk_name.toLowerCase().includes(keyword.toLowerCase()) ||
        product.produk_category.toLowerCase().includes(keyword.toLowerCase())
    );

    const container = document.getElementById('all-products');
    container.innerHTML = results.map(product => `
        <div class="product-card" onclick="openProductModal('${product.produk_id}')">
            <div class="product-image">
                <img src="${product.produk_image}" alt="${product.produk_name}" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="image-fallback" style="display: none; align-items: center; justify-content: center; width: 100%; height: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 48px;">
                    <i class="fas fa-image"></i>
                </div>
            </div>
            <div class="product-info">
                <div class="product-name">${product.produk_name}</div>
                <div class="product-category">${product.produk_category}</div>
                <div class="product-footer">
                    <div class="product-price">Rp ${formatPrice(product.produk_price)}</div>
                    <button class="btn-add" onclick="event.stopPropagation(); addToCartQuick('${product.produk_id}', this)">
                        Beli
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}
