// SEARCH BOX
const searchIcon = document.getElementById('searchIcon');
const searchBox = document.getElementById('searchBox');
const searchInput = document.getElementById('searchInput');
const results = document.getElementById('results');

const products = [
'iPhone 17 Pro',
'iPhone 16',
'Xiaomi 14',
'Redmi Note 13',
'Mi Band 8',
'Apple Watch Ultra'
];

searchIcon.addEventListener('click', () => {
searchBox.style.display = searchBox.style.display === 'block' ? 'none' : 'block';
searchInput.focus();
});

searchInput.addEventListener('input', () => {
const value = searchInput.value.toLowerCase();
results.innerHTML = '';

products
    .filter(p => p.toLowerCase().includes(value))
    .forEach(p => {
    const div = document.createElement('div');
    div.textContent = p;
    div.onclick = () => alert('Redirecionar para: ' + p);
    results.appendChild(div);
    });
});


document.querySelectorAll('.menu-item').forEach(item => {
    let timer;
    const dropdown = item.querySelector('.dropdown');

    item.addEventListener('mouseenter', () => {
        clearTimeout(timer);
        dropdown.style.display = 'block';
    });

    item.addEventListener('mouseleave', () => {
        timer = setTimeout(() => {
        dropdown.style.display = 'none';
        }, 200);
    });
});
// --------------------------------------------------------------------------------
// CAROUSEL 
const prevBtn = document.getElementById('prev-btn')
const nextBtn = document.getElementById('next-btn')
const items = document.querySelectorAll('.item')
const dots = document.querySelectorAll('.dot')

let active = 0
const total = items.length
let timer

function update(direction) {
    document.querySelector('.item.active').classList.remove('active')
    document.querySelector('.dot.active').classList.remove('active')

    if (direction !== null) {
        if (direction > 0) active++
        if (direction < 0) active--

        if (active === total) active = 0
        if (active < 0) active = total - 1
    }

    items[active].classList.add('active')
    dots[active].classList.add('active')
}

function resetTimer() {
    clearInterval(timer)
    timer = setInterval(() => update(1), 8000)
}

// AUTOPLAY
resetTimer()

// SETAS
prevBtn.addEventListener('click', () => {
    update(-1)
    resetTimer()
})

nextBtn.addEventListener('click', () => {
    update(1)
    resetTimer()
})

// DOTS
dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        active = index
        update(null)
        resetTimer()
    })
})
// --------------------------------------------------------------------------------
// FILTERS
const brandSelect = document.getElementById('brand');
const sortSelect = document.getElementById('sort');

const allProducts = document.querySelectorAll('.containers');
const container = document.querySelector('.section-container');

brandSelect.addEventListener('change', applyFilters);
sortSelect.addEventListener('change', applyFilters);

function applyFilters() {
const brand = brandSelect.value;
const sort = sortSelect.value;

// ===== FILTRO POR MARCA =====
allProducts.forEach(product => {
    if (brand === 'all') {
    product.style.display = 'flex';
    } else {
    product.style.display = product.classList.contains(`produto-${brand}`)
        ? 'flex'
        : 'none';
    }
});

// ===== ORDENAÇÃO POR PREÇO =====
const visibleProducts = Array.from(allProducts)
    .filter(product => product.style.display !== 'none');

visibleProducts.sort((a, b) => {
    const priceA = getPriceValue(a);
    const priceB = getPriceValue(b);

    if (sort === 'price-asc') return priceA - priceB;
    if (sort === 'price-desc') return priceB - priceA;
    return 0; // relevância
});

// Reinsere no DOM na nova ordem
visibleProducts.forEach(product => container.appendChild(product));
}

function getPriceValue(product) {
const text = product.querySelector('.price').textContent;

return parseFloat(
    text.replace('Desde', '').replace('€', '').trim()
);
}