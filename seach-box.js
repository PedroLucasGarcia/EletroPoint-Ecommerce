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