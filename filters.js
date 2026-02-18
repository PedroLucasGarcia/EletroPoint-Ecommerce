/* FILTROS DOS PRODUTOS */

// Selects de marca e ordenação
const brandSelect = document.getElementById("brand");
const sortSelect = document.getElementById("sort");

// Todos os produtos
const allProducts = document.querySelectorAll(".containers");

// Container onde os produtos são exibidos
const container = document.querySelector(".section-container");

// Aplica filtros sempre que o usuário mudar algo
brandSelect.addEventListener("change", applyFilters);
sortSelect.addEventListener("change", applyFilters);

/* Aplica filtro e ordenação */
function applyFilters() {

    // Marca selecionada
    const brand = brandSelect.value;

    // Tipo de ordenação
    const sort = sortSelect.value;

    // Filtra por marca
    allProducts.forEach(product => {
        if (brand === "all") {
            product.style.display = "flex";
        } else {
            product.style.display = product.classList.contains(`produto-${brand}`)
                ? "flex"
                : "none";
        }
    });

    // Produtos visíveis após o filtro
    const visibleProducts = Array.from(allProducts)
        .filter(product => product.style.display !== "none");

    // Ordena por preço
    visibleProducts.sort((a, b) => {
        const priceA = getPriceValue(a);
        const priceB = getPriceValue(b);

        if (sort === "price-asc") return priceA - priceB;
        if (sort === "price-desc") return priceB - priceA;

        return 0;
    });

    // Reinsere os produtos na nova ordem
    visibleProducts.forEach(product => {
        container.appendChild(product);
    });
}

/* Extrai o valor numérico do preço */
function getPriceValue(product) {

    // Texto do preço
    const text = product.querySelector(".price").textContent;

    // Remove texto e símbolo, deixando só o número
    return parseFloat(
        text.replace("Desde", "").replace("€", "").trim()
    );
}