## Resource Name and Attributes  

Name: Halo 2 Trivia  
Attributes:
`id`: primary key assigned by the database.
`question`: The question text displayed to the user.
`correct_answer`: The correct answer corresponding to the question.
`incorrect_answers`: The incorrect answers corresponding to the question.

## Database Schema

The application uses SQLite (`questions.db`) for storage. Below is the `CREATE TABLE` query used to initialize the database:

```sql
CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    correct_answer TEXT,
    incorrect_answers TEXT
);```

## All REST endpoints

get_all_questions | GET | /questions  
get_question_by_id| GET | /questions/{id}  
add_question| POST | /questions  
update_question | PUT | /questions/{id}  
delete_question | DELETE | /questions/{id}