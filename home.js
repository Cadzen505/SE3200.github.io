const halo_img = document.querySelector('#halo_img');
const btn = document.querySelector('#nxt_btn');

let halo_imgs = [
    "https://raw.githubusercontent.com/Cadzen505/SE3200.github.io/main/halo1.webp",
    "https://raw.githubusercontent.com/Cadzen505/SE3200.github.io/main/best_halo.jpeg",
    "https://raw.githubusercontent.com/Cadzen505/SE3200.github.io/main/halo3_odst.webp",
    "https://raw.githubusercontent.com/Cadzen505/SE3200.github.io/main/halo3.jpeg",
    "https://raw.githubusercontent.com/Cadzen505/SE3200.github.io/main/halo_reach.jpeg"
]


let img_index = 0;

btn.addEventListener('click', function() {

    const random_halo_img = Math.floor(Math.random() * halo_imgs.length);

    halo_img.src = halo_imgs[random_halo_img];
});

const triviaContainer = document.querySelector('#title');

