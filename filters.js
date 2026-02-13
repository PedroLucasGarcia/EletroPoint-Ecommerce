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