const triviaContainer = document.querySelector('#trivia-container');
const fetchBtn = document.querySelector('#fetch-btn');
const errorBanner = document.querySelector('#error-banner');

function showError(message) {
    if (errorBanner) {
        errorBanner.textContent = message;
    }
}

function clearError() {
    if (errorBanner) {
        errorBanner.textContent = "";
    }
}

function loadQuestions() {
    clearError();
    triviaContainer.innerHTML = "<p>Loading questions from server...</p>";

    fetch('http://localhost:8000/questions')
        .then(response => response.json())
        .then(data => {
            triviaContainer.innerHTML = "";
            
            data.forEach((q, index) => {
                const questionDiv = document.createElement('div');
                questionDiv.style.margin = "15px 0";
                questionDiv.style.padding = "10px";
                questionDiv.style.border = "1px solid #ddd";
                questionDiv.style.borderRadius = "5px";
                
                const qId = q.id !== undefined ? q.id : (index + 1);
const label = qId === 1 ? "Holder (ID 1)" : `Question ID ${qId}`;

const incorrects = Array.isArray(q.incorrect_answers) 
    ? q.incorrect_answers.join(", ") 
    : (q.incorrect_answers || "N/A");

const editButtonHtml = qId === 1 
    ? ''
    : `<button type="button" class="edit-btn" data-id="${qId}" data-question="${q.question}" data-correct="${q.correct_answer || 'None'}" data-incorrect="${incorrects}" style="margin-top: 5px; padding: 4px 8px; cursor: pointer;">Edit / Pre-fill</button>`;

questionDiv.innerHTML = `
    <p><strong>${label}:</strong> ${q.question}</p>
    <p><em>Correct Answer:</em> ${q.correct_answer || "N/A"}</p>
    <p><em>Incorrect Answers:</em> ${incorrects}</p>
    ${editButtonHtml}
`;

const editBtn = questionDiv.querySelector('.edit-btn');
if (editBtn) {
    editBtn.addEventListener('click', function() {
        const id = this.getAttribute('data-id');
        const text = this.getAttribute('data-question');
        const correct = this.getAttribute('data-correct');
        const incorrect = this.getAttribute('data-incorrect');

        const replaceInput = document.querySelector('#replace-question');
        if (replaceInput) {
            replaceInput.value = `${id} ${text} Correct Answer: ${correct} Incorrect Answers: ${incorrect}`;
            window.scrollTo({ top: replaceInput.offsetTop - 50, behavior: 'smooth' });
        }
    });
}
                
                triviaContainer.appendChild(questionDiv);
            });
        })
        .catch(error => {
            console.error("Error fetching questions:", error);
            showError("Failed to connect to the Python server.");
        });
}

if (fetchBtn) {
    fetchBtn.addEventListener('click', loadQuestions);
} else {
    console.error("Could not find element with ID #fetch-btn");
}

const form = document.querySelector('#question-form');
const questionInput = document.querySelector('#new-question');

if (form) {
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        clearError();

        const rawText = questionInput.value.trim();
        if (!rawText) return;

        let questionText = rawText;
        let correctAnswer = "None";
        let incorrectAnswers = ["None"];

        if (rawText.includes("Correct Answer:")) {
            const parts = rawText.split("Correct Answer:");
            questionText = parts[0].replace(/^question/i, "").trim();
            if (!questionText) questionText = "Custom Question";
            
            const remainder = parts[1];
            if (remainder.includes("Incorrect Answers:")) {
                const subParts = remainder.split("Incorrect Answers:");
                correctAnswer = subParts[0].trim();
                incorrectAnswers = subParts[1].split(",").map(ans => ans.trim()).filter(Boolean);
            } else {
                correctAnswer = remainder.trim();
            }
        }

        fetch('http://localhost:8000/questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: questionText,
                correct_answer: correctAnswer,
                incorrect_answers: incorrectAnswers
            })
        })
        .then(response => {
            if (response.status === 201) {
                console.log("Question successfully recorded in SQLite database!");
                questionInput.value = "";
                loadQuestions();
            } else {
                showError("Failed to save question to server.");
            }
        })
        .catch(error => {
            console.error("Error with POST request:", error);
            showError("Network error while submitting question.");
        });
    });
}

const replaceForm = document.querySelector('#replace-form');
const replaceQuestionInput = document.querySelector('#replace-question');

if (replaceForm) {
    replaceForm.addEventListener('submit', function(event) {
        event.preventDefault();
        clearError();

        const rawText = replaceQuestionInput.value.trim();
        if (!rawText) {
            showError("Please enter a Question ID followed by the question text.");
            return;
        }

        const parts = rawText.split(/\s+/);
        const questionIdStr = parts[0];
        const questionId = parseInt(questionIdStr, 10);

        if (isNaN(questionId)) {
            showError("The very first word must be a valid Question ID number (e.g., '2 What is...').");
            return;
        }

        const textWithoutId = rawText.slice(questionIdStr.length).trim();
        if (!textWithoutId) {
            showError("Please include the question text after the ID.");
            return;
        }

        let questionText = textWithoutId;
        let correctAnswer = "None";
        let incorrectAnswers = ["None"];

        if (textWithoutId.includes("Correct Answer:")) {
            const qParts = textWithoutId.split("Correct Answer:");
            questionText = qParts[0].replace(/^question/i, "").trim();
            if (!questionText) questionText = "Updated Question";
            
            const remainder = qParts[1];
            if (remainder.includes("Incorrect Answers:")) {
                const subParts = remainder.split("Incorrect Answers:");
                correctAnswer = subParts[0].trim();
                incorrectAnswers = subParts[1].split(",").map(ans => ans.trim()).filter(Boolean);
            } else {
                correctAnswer = remainder.trim();
            }
        }

        fetch(`http://localhost:8000/questions/${questionId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: questionText,
                correct_answer: correctAnswer,
                incorrect_answers: incorrectAnswers
            })
        })
        .then(response => {
            if (response.status === 200) {
                console.log(`Question ID ${questionId} successfully replaced in SQLite!`);
                replaceQuestionInput.value = "";
                loadQuestions();
            } else if (response.status === 400) {
                showError("You cannot replace the holder (ID 1).");
            } else if (response.status === 404) {
                showError(`Cannot update: Question ID ${questionId} was not found.`);
            } else {
                showError("Failed to update question on server.");
            }
        })
        .catch(error => {
            console.error("Error with PUT request:", error);
            showError("Network error while updating question.");
        });
    });
}

const deleteForm = document.querySelector('#delete-form');
const questionDeleteInput = document.querySelector('#delete-question');

if (deleteForm) {
    deleteForm.addEventListener('submit', function(event) {
        event.preventDefault();
        clearError();

        const questionId = questionDeleteInput.value.trim();
        if (!questionId) {
            showError("Please enter a valid question ID to delete.");
            return;
        }

        const confirmed = confirm(`Are you sure you want to delete Question ID ${questionId}?`);
        if (!confirmed) {
            return;
        }

        fetch(`http://localhost:8000/questions/${questionId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (response.status === 204) {
                console.log(`Question ID ${questionId} successfully deleted from SQLite!`);
                questionDeleteInput.value = "";
                loadQuestions();
            } else if (response.status === 404) {
                showError(`Question ID ${questionId} was not found.`);
            } else if (response.status === 400) {
                showError(`You cannot replace the holder (ID 1).`);
            } else {
                showError("Failed to delete question.");
            }
        })
        .catch(error => {
            console.error("Error with DELETE request:", error);
            showError("Network error while attempting to delete.");
        });
    });
}