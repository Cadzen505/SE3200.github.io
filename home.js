fetch('/check-auth', {
    method: 'GET',
    credentials: 'include'
})
.then(res => {
    if (!res.ok) throw new Error("Unauthorized");
    return res.json();
})
.then(user => {
    const welcomeEl = document.querySelector('#user-welcome');
    if (welcomeEl) {
        welcomeEl.textContent = `Welcome, ${user.first_name} ${user.last_name}!`;
    }
    loadQuestions();
})
.catch(() => {
    window.location.href = 'index.html';
})

const logoutBtn = document.querySelector('#logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
        fetch('/logout', {
            method: 'POST',
            credentials: 'include'
        })
        .then(() => {
            window.location.href = 'index.html';
        });
    });
}

const triviaContainer = document.querySelector('#trivia-container');
const fetchBtn = document.querySelector('#fetch-btn');
const errorBanner = document.querySelector('#error-banner');
const questionInput = document.querySelector('#new-question');

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

function resetFormTemplate() {
    if (questionInput) {
        questionInput.value = 
`Question: 
Correct Answer: 
Incorrect Answers: `;
    }
}

resetFormTemplate();

function loadQuestions() {
    clearError();
    if (triviaContainer) {
        triviaContainer.innerHTML = "<p>Loading questions from server...</p>";
    }

    fetch('/questions', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => {
        if (response.status === 401) {
            window.location.href = 'index.html';
            return;
        }
        return response.json();
    })
    .then(data => {
        if (!triviaContainer) return;
        triviaContainer.innerHTML = "";
        
        data.forEach((q, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'trivia-item';
            questionDiv.style.margin = "15px 0";
            questionDiv.style.padding = "15px";
            questionDiv.style.border = "1px solid #ddd";
            questionDiv.style.borderRadius = "5px";
            questionDiv.style.backgroundColor = "#2a2a2a";
            questionDiv.style.color = "#fff";
            questionDiv.style.textAlign = "center";
            
            const qId = q.id !== undefined ? q.id : (index + 1);
            const label = qId === 1 ? "Holder (ID 1)" : `Question ID ${qId}`;

            const incorrects = Array.isArray(q.incorrect_answers) 
                ? q.incorrect_answers.join(", ") 
                : (q.incorrect_answers || "N/A");

            const isHolder = qId === 1;

            questionDiv.innerHTML = `
                <p><strong>${label}:</strong> <span class="question-text" data-id="${qId}">${q.question}</span></p>
                <p><em>Correct Answer:</em> <span class="correct-text">${q.correct_answer || "N/A"}</span></p>
                <p><em>Incorrect Answers:</em> <span class="incorrect-text">${incorrects}</span></p>
                ${!isHolder ? `
                    <div class="card-button-container">
                        <button type="button" class="edit-btn" data-id="${qId}" data-question="${encodeURIComponent(q.question)}" data-correct="${encodeURIComponent(q.correct_answer || '')}" data-incorrect="${encodeURIComponent(incorrects)}" style="padding: 4px 10px; cursor: pointer;">Edit</button>
                        <button type="button" class="delete-btn" data-id="${qId}" style="background-color: #8b0000; color: white; padding: 4px 10px; cursor: pointer;">Delete</button>
                    </div>
                ` : ''}
            `;

            triviaContainer.appendChild(questionDiv);
        });
    })
    .catch(error => {
        console.error("Error fetching questions:", error);
        showError("Failed to connect to the Python server.");
    });
}

if (triviaContainer) {
    triviaContainer.addEventListener('click', function(event) {
        const button = event.target.closest('button');
        if (!button) return;

        const id = button.getAttribute('data-id');

        if (button.classList.contains('edit-btn')) {
            const questionDiv = button.closest('.trivia-item');
            
            const qText = decodeURIComponent(button.getAttribute('data-question'));
            const cText = decodeURIComponent(button.getAttribute('data-correct'));
            const iText = decodeURIComponent(button.getAttribute('data-incorrect'));

            questionDiv.querySelector('p:nth-child(1)').innerHTML = `<strong>${questionDiv.querySelector('strong').textContent}</strong> <input type="text" class="edit-question-input" value="${qText}" style="width: 80%; padding: 4px; background: #1e1e1e; color: #fff; border: 1px solid #444;">`;
            questionDiv.querySelector('p:nth-child(2)').innerHTML = `<em>Correct Answer:</em> <input type="text" class="edit-correct-input" value="${cText}" style="width: 80%; padding: 4px; background: #1e1e1e; color: #fff; border: 1px solid #444;">`;
            questionDiv.querySelector('p:nth-child(3)').innerHTML = `<em>Incorrect Answers:</em> <input type="text" class="edit-incorrect-input" value="${iText}" style="width: 80%; padding: 4px; background: #1e1e1e; color: #fff; border: 1px solid #444;">`;

            button.textContent = 'Save';
            button.classList.remove('edit-btn');
            button.classList.add('save-btn');
        } 
        else if (button.classList.contains('save-btn')) {
            const questionDiv = button.closest('.trivia-item');
            
            const updatedQuestion = questionDiv.querySelector('.edit-question-input').value.trim();
            const updatedCorrect = questionDiv.querySelector('.edit-correct-input').value.trim();
            const updatedIncorrectStr = questionDiv.querySelector('.edit-incorrect-input').value.trim();

            if (!updatedQuestion) {
                alert("Question text cannot be empty!");
                return;
            }

            const incorrectArray = updatedIncorrectStr.split(',').map(ans => ans.trim()).filter(Boolean);

            fetch(`/questions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    question: updatedQuestion,
                    correct_answer: updatedCorrect,
                    incorrect_answers: incorrectArray
                })
            })
            .then(response => {
                if (!response.ok) throw new Error("Failed to update question.");
                loadQuestions();
            })
            .catch(error => {
                alert(error.message);
            });
        }

        else if (button.classList.contains('delete-btn')) {
            if (!confirm("Are you sure you want to delete this question?")) return;

            fetch(`/questions/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            })
            .then(async response => {
                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.error || `Server responded with status ${response.status}`);
                }
                loadQuestions();
            })
            .catch(error => {
                alert("Delete failed: " + error.message);
            });
        }
    });
}

if (fetchBtn) {
    fetchBtn.addEventListener('click', loadQuestions);
}

const form = document.querySelector('#question-form');

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
            questionText = parts[0].replace(/^question\s*:/i, "").replace(/^question/i, "").trim();
            if (!questionText) questionText = "Custom Question";
            
            const remainder = parts[1];
            if (remainder.includes("Incorrect Answers:")) {
                const subParts = remainder.split("Incorrect Answers:");
                correctAnswer = subParts[0].replace(":", "").trim();
                incorrectAnswers = subParts[1].replace(":", "").split(",").map(ans => ans.trim()).filter(Boolean);
            } else {
                correctAnswer = remainder.replace(":", "").trim();
            }
        }

        fetch('/questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                question: questionText,
                correct_answer: correctAnswer,
                incorrect_answers: incorrectAnswers
            })
        })
        .then(response => {
            if (response.status === 201) {
                console.log("Question successfully recorded in SQLite database!");
                resetFormTemplate();
                loadQuestions();
            } else if (response.status === 401) {
                window.location.href = 'index.html';
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