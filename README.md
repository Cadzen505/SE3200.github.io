## Resource Name and Attributes  

Name: Halo 2 Trivia  
Attributes:
`id`: primary key assigned by the database.
`question`: The question text displayed to the user.
`correct_answer`: The correct answer corresponding to the question.
`incorrect_answers`: The incorrect answers corresponding to the question.
`User id`: The key used for the User to access their data.
`User first_name`: The Users inputed first name.
`User last_name`: The Users inputed last name.
`User email`: The Users inputed email.
`User password_hash`: The Users password hashed and salted.

## Database Schema

The application uses SQLite (`questions.db`) for storage. Below is the `CREATE TABLE` query used to initialize the database:

```sql
CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    correct_answer TEXT,
    incorrect_answers TEXT
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
);```

## All REST endpoints

get_all_questions | GET | /questions  
get_question_by_id | GET | /questions/{id}  
add_question| POST | /questions  
update_question | PUT | /questions/{id}  
delete_question | DELETE | /questions/{id}
check_auth | GET | /check-auth
register_user | POST | /register
login_user | POST | /login
logout_user | POST | /logout

## Password Security and Hashing

* **Algorithm:** I utilized the SHA-256 hashing algorithm.
* **Salt:** A cryptographically secure random 16-byte salt (`os.urandom(16)`) is generated uniquely for every user account to prevent rainbow table and precomputed hash attacks.
* **Iterations:** Configured with **100,000 iterations** of the hashing function to significantly slow down brute-force and dictionary attacks.
* **Storage Format:** The resulting salt and derived password hash are stored together as a combined hexadecimal string separated by a colon (`salt_hex:hash_hex`) in the database.