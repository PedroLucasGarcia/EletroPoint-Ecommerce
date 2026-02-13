// MENU HAMBURGUER 
const hamburger = document.getElementById('hamburgerBtn');
const navList = document.querySelector('.nav-list');

hamburger.addEventListener('click', () => {
    navList.classList.toggle('mobile-active');
});