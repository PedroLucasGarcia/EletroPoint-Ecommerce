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
    timer = setInterval(() => update(1), 5000)
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
