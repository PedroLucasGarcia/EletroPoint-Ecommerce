/* CAROUSEL */

// Botões
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");

// Slides e indicadores
const items = document.querySelectorAll(".item");
const dots = document.querySelectorAll(".dot");

// Slide atual
let active = 0;
const total = items.length;

// Autoplay
let timer;

/* Atualiza o slide */
function update(direction) {

    // Remove slide e dot ativos
    document.querySelector(".item.active").classList.remove("active");
    document.querySelector(".dot.active").classList.remove("active");

    // Ajusta índice conforme direção
    if (direction !== null) {
        if (direction > 0) active++;
        if (direction < 0) active--;

        // Loop infinito
        if (active === total) active = 0;
        if (active < 0) active = total - 1;
    }

    // Ativa novo slide e dot
    items[active].classList.add("active");
    dots[active].classList.add("active");
}

/* Reinicia o autoplay */
function resetTimer() {
    clearInterval(timer);
    timer = setInterval(() => update(1), 5000);
}

// Inicia autoplay
resetTimer();

/* Setas de navegação */
prevBtn.addEventListener("click", () => {
    update(-1);
    resetTimer();
});

nextBtn.addEventListener("click", () => {
    update(1);
    resetTimer();
});

/* Dots (indicadores) */
dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {

        // Vai direto para o slide clicado
        active = index;

        // Atualiza sem direção
        update(null);

        // Reinicia autoplay
        resetTimer();
    });
});