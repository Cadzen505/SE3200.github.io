const triviaContainer = document.querySelector('#trivia-container');
const fetchBtn = document.querySelector('#fetch-btn');

function loadQuestions() {
    triviaContainer.innerHTML = "<p>Loading questions from server...</p>";

    fetch('http://localhost:8000/questions')
        .then(response => response.json())
        .then(data => {
            triviaContainer.innerHTML = "";
            
            data.forEach((q, index) => {
                const questionDiv = document.createElement('div');
                questionDiv.style.margin = "15px 0";
                
                questionDiv.innerHTML = `
                    <p><strong>Q${index + 1}:</strong> ${q.question}</p>
                    <p><em>Correct Answer:</em> ${q.correct_answer}</p>
                    <p><em>Incorrect Answers:</em> ${q.incorrect_answers.join(", ")}</p>
                `;
                
                triviaContainer.appendChild(questionDiv);
            });
        })
        .catch(error => {
            console.error("Error fetching questions:", error);
            triviaContainer.textContent = "Failed to connect to the Python server.";
        });
}

fetchBtn.addEventListener('click', loadQuestions);


const form = document.querySelector('#question-form');
const questionInput = document.querySelector('#new-question');

form.addEventListener('submit', function(event) {
    event.preventDefault();

    const newQuestionText = questionInput.value;

    fetch('http://localhost:8000/questions', {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain'
        },
        body: newQuestionText
    })
    .then(response => {
        if (response.status === 201) {
            console.log("Question successfully recorded!");
            questionInput.value = "";
            
            loadQuestions();
        } else {
            console.error("Failed to save question.");
        }
    })
    .catch(error => {
        console.error("Error with POST request:", error);
    });
});