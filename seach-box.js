// SEARCH BOX (Pesquisa dinâmica)
const searchIcon = document.getElementById("searchIcon");
const searchBox = document.getElementById("searchBox");
const searchInput = document.getElementById("searchInput");
const results = document.getElementById("results");

// Lista de produtos do site
const products = [
    { name: "Apple iPad", link: "../tablets/ipad.html" },
    { name: "Apple iPad Air", link: "../tablets/ipad-air.html" },
    { name: "Apple iPad Pro", link: "../tablets/ipad-pro.html" },
    { name: "Apple iPhone 16", link: "../smartphones/iphone16.html" },
    { name: "Apple iPhone 16e", link: "../smartphones/iphone16e.html" },
    { name: "Apple iPhone 17", link: "../smartphones/iphone17.html" },
    { name: "Apple iPhone 17 Pro", link: "../smartphones/iphone17Pro.html" },
    { name: "Apple iPhone Air", link: "../smartphones/iphone-air.html" },
    { name: "Apple Macbook Air", link: "../portateis/macbook-air.html" },
    { name: "Apple Macbook Pro", link: "../portateis/macbook-pro.html" },
    { name: "Daitona PC Intel Core I5-14400f", link: "../computadores/core-i5-14400f.html" },
    { name: "Galaxy Book 3 Pro", link: "../portateis/book3Pro.html" },
    { name: "Galaxy Book 4", link: "../portateis/book4.html" },
    { name: "Galaxy Book 5 Pro 360", link: "../portateis/book5Pro-360.html" },
    { name: "Galaxy S25", link: "../smartphones/s25.html" },
    { name: "Galaxy S25 Edge", link: "../smartphones/s25-edge.html" },
    { name: "Galaxy S25 Ultra", link: "../smartphones/s25-ultra.html" },
    { name: "Galaxy Tab S10 Fe", link: "../tablets/tab-s10-fe.html" },
    { name: "Galaxy Tab S10 Plus", link: "../tablets/tab-s10-plus.html" },
    { name: "Galaxy Z Flip 7", link: "../smartphones/z-flip-7.html" },
    { name: "Galaxy Z Fold 7", link: "../smartphones/z-fold-7.html" },
    { name: "Gaming PC RACING Intel Core I5-12400f", link: "../computadores/core-i5-12400f.html" },
    { name: "Gaming TrendingPC AMD Ryzen 7 5800x", link: "../computadores/ryzen7-5800x.html" },
    { name: "Gaming TrendingPC AMD Ryzen 7 8700f", link: "../computadores/ryzen7-8700f.html" },
    { name: "Gaming TrendingPC AMD Ryzen 9 5900x", link: "../computadores/ryzen9-5900x.html" },
    { name: "Google Pixel 10", link: "../smartphones/s25.html" },
    { name: "Google Pixel 10 Pro", link: "../smartphones/s25-edge.html" },
    { name: "Google Pixel 10 Pro XL", link: "../smartphones/s25-ultra.html" },
    { name: "Lenovo IdeaPad Slim 5", link: "../portateis/ideapad-slim5.html" },
    { name: "Nintendo Swich", link: "../consolas/switch.html" },
    { name: "Nintendo Swich 2", link: "../consolas/switch2.html" },
    { name: "Playstation 5", link: "../consolas/playstation5.html" },
    { name: "Playstation 5 Pro", link: "../consolas/playstation5pro.html" },
    { name: "Redmi Pad 2 Pro", link: "../tablets/redmi-pad2-pro.html" },
    { name: "Redmi Note 15", link: "../smartphones/redmi-note15-pro-plus.html" },
    { name: "Xbox Series S", link: "../consolas/xbox-s.html" },
    { name: "Xbox Series X", link: "../consolas/xbox-x.html" },
    { name: "Xiaomi 15", link: "../smartphonesxiaomi15.html" },
    { name: "Xiaomi 15t", link: "../smartphonesxiaomi15t.html" },
    { name: "Xiaomi 15t Pro", link: "../smartphonesxiaomi15t-pro.html" },
    { name: "Xiaomi 15 Ultra", link: "../smartphonesxiaomi15-ultra.html" },
];

// Abrir / Fechar caixa de pesquisa
searchIcon.addEventListener("click", () => {

    // Alterna classe active
    searchBox.classList.toggle("active");

    // Se abriu → bloqueia scroll
    if (searchBox.classList.contains("active")) {
        document.body.classList.add("no-scroll");

        setTimeout(() => {
            searchInput.focus();
        }, 200);

    } else {
        // Se fechou → libera scroll
        document.body.classList.remove("no-scroll");
    }
});


// Pesquisa dinâmica ao digitar
searchInput.addEventListener("input", () => {

    const value = searchInput.value.toLowerCase();
    results.innerHTML = "";

    // Se estiver vazio, não mostra nada
    if (value.trim() === "") return;

    // Filtra produtos pelo texto digitado
    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(value)
  );

    // Caso não encontre nada
    if (filteredProducts.length === 0) {
        results.innerHTML = "<div>Nenhum produto encontrado.</div>";
        return;
    }

    // Criar lista de resultados
    filteredProducts.forEach(product => {

        const div = document.createElement("div");
        div.textContent = product.name;

        // Clique → redireciona para a página do produto
        div.addEventListener("click", () => {
            window.location.href = product.link;
        });

        results.appendChild(div);
    });
});

// Fechar pesquisa ao clicar fora
document.addEventListener("click", (e) => {

    if (!searchBox.contains(e.target) && !searchIcon.contains(e.target)) {
        searchBox.classList.remove("active");

        // Libera scroll novamente
        document.body.classList.remove("no-scroll");
    }
});

// Fechar com tecla ESC
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        searchBox.classList.remove("active");
        document.body.classList.remove("no-scroll");
    }
});
