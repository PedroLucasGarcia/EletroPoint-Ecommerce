/* MENU MOBILE */

const hamburger = document.getElementById("hamburgerBtn");
const mobileMenu = document.getElementById("mobileMenu");
const closeMenu = document.getElementById("closeMenu");

/* Abrir menu mobile */
hamburger.addEventListener("click", () => {
    mobileMenu.classList.add("active");

    // Bloqueia o scroll da página
    document.body.classList.add("no-scroll");
});

/* Fechar menu mobile */
closeMenu.addEventListener("click", () => {
    mobileMenu.classList.remove("active");

    // Libera o scroll novamente
    document.body.classList.remove("no-scroll");
});

/* Accordion do menu mobile */
document.querySelectorAll(".mobile-btn").forEach(btn => {
    btn.addEventListener("click", () => {

        // Submenu ligado ao botão
        const submenu = btn.nextElementSibling;

        // Se não tiver submenu, sai
        if (!submenu || !submenu.classList.contains("mobile-submenu")) return;

        // Fecha outros submenus
        document.querySelectorAll(".mobile-submenu").forEach(sm => {
            if (sm !== submenu) sm.classList.remove("open");
        });

        // Abre/fecha o submenu atual
        submenu.classList.toggle("open");

        // Reseta todos os ícones para "+"
        document.querySelectorAll(".mobile-btn .icon").forEach(icon => {
            icon.textContent = "+";
        });

        // Mostra "−" no submenu aberto
        if (submenu.classList.contains("open")) {
            btn.querySelector(".icon").textContent = "−";
        }
    });
});

/* Fechar menu mobile com a tecla ESC */
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mobileMenu.classList.contains("active")) {
        mobileMenu.classList.remove("active");
        document.body.classList.remove("no-scroll");
    }
});
