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

// --- Video Game & Halo Trivia Quiz ---
const triviaContainer = document.querySelector('#title');

fetch('https://opentdb.com/api.php?amount=50&category=15&type=multiple')
    .then(response => response.json())
    .then(data => {
        const haloQuestions = data.results.filter(item => {
            return item.question.toLowerCase().includes('halo');
        });

        console.log("Found Halo Questions:", haloQuestions);

        if (haloQuestions.length > 0) {
            triviaContainer.innerHTML = `<h2>Halo Trivia Quiz (${haloQuestions.length} Found)</h2>`;

            haloQuestions.forEach((q, index) => {
                let allAnswers = [...q.incorrect_answers, q.correct_answer];
                allAnswers.sort(() => Math.random() - 0.5);

                const questionDiv = document.createElement('div');
                questionDiv.style.margin = "20px 0";
                questionDiv.innerHTML = `<p><strong>Q${index + 1}:</strong> ${q.question}</p>`;

                allAnswers.forEach(answer => {
                    const answerBtn = document.createElement('button');
                    answerBtn.innerHTML = answer;
                    answerBtn.style.margin = "5px";

                    answerBtn.addEventListener('click', function() {
                        if (answer === q.correct_answer) {
                            answerBtn.style.backgroundColor = "lightgreen";
                            alert("Correct!");
                        } else {
                            answerBtn.style.backgroundColor = "lightcoral";
                            alert(`Incorrect! The correct answer was: ${q.correct_answer}`);
                        }
                        const siblingButtons = questionDiv.querySelectorAll('button');
                        siblingButtons.forEach(b => b.disabled = true);
                    });

                    questionDiv.appendChild(answerBtn);
                });

                triviaContainer.appendChild(questionDiv);
            });

        } else {
            triviaContainer.textContent = "No Halo questions found in this batch! Refresh the page.";
        }
    })
    .catch(error => {
        console.error("Error fetching trivia:", error);
    });