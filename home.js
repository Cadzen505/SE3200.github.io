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

    img_index++;

    if(img_index >= halo_imgs.length){
        img_index = 0;
    }

    halo_img.src = halo_imgs[img_index];
});