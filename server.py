import http.server
import json
import os
import re
import sqlite3

PORT = 8000
DB_FILENAME = "questions.db"

class DatabaseManager:
    def __init__(self, db_name=DB_FILENAME):
        self.db_name = db_name
        self.init_db()

    def get_connection(self):
        conn = sqlite3.connect(self.db_name)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        with self.get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS questions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    question TEXT NOT NULL,
                    correct_answer TEXT,
                    incorrect_answers TEXT
                )
            """)
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM questions")
            if cursor.fetchone()[0] == 0:
                conn.execute(
                    """INSERT INTO questions (question, correct_answer, incorrect_answers) 
                       VALUES (?, ?, ?)""",
                    ("What is the ship the Master Chief is on in the first Mission?", "Cario Station", json.dumps(["Pillar of Autumn", "Absolute", "Aada"]))
                )
            conn.commit()

    def get_all_questions(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM questions")
            rows = cursor.fetchall()
            results = []
            for row in rows:
                results.append({
                    "id": row["id"],
                    "question": row["question"],
                    "correct_answer": row["correct_answer"],
                    "incorrect_answers": json.loads(row["incorrect_answers"]) if row["incorrect_answers"] else []
                })
            return results

    def get_question_by_id(self, item_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM questions WHERE id = ?", (item_id,))
            row = cursor.fetchone()
            if row:
                return {
                    "id": row["id"],
                    "question": row["question"],
                    "correct_answer": row["correct_answer"],
                    "incorrect_answers": json.loads(row["incorrect_answers"]) if row["incorrect_answers"] else []
                }
            return None

    def add_question(self, data):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            question = data.get("question", "")
            correct_answer = data.get("correct_answer", "None")
            incorrect_answers = json.dumps(data.get("incorrect_answers", ["None"]))
            
            cursor.execute(
                "INSERT INTO questions (question, correct_answer, incorrect_answers) VALUES (?, ?, ?)",
                (question, correct_answer, incorrect_answers)
            )
            conn.commit()
            new_id = cursor.lastrowid
            return self.get_question_by_id(new_id)

    def update_question(self, item_id, data):
        existing = self.get_question_by_id(item_id)
        if not existing:
            return None
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            question = data.get("question", existing["question"])
            correct_answer = data.get("correct_answer", existing["correct_answer"])
            incorrect_answers = json.dumps(data.get("incorrect_answers", existing["incorrect_answers"]))
            
            cursor.execute(
                "UPDATE questions SET question = ?, correct_answer = ?, incorrect_answers = ? WHERE id = ?",
                (question, correct_answer, incorrect_answers, item_id)
            )
            conn.commit()
            return self.get_question_by_id(item_id)

    def delete_question(self, item_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM questions WHERE id = ?", (item_id,))
            conn.commit()
            return cursor.rowcount > 0

db = DatabaseManager()

class CRUDRequestHandler(http.server.BaseHTTPRequestHandler):

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def send_json_response(self, status_code, data): 
        response_bytes = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(response_bytes)

    def send_error_response(self, status_code, message):
        error_payload = {
            "error": message,
            "status": status_code
        }
        self.send_json_response(status_code, error_payload)

    def parse_item_id(self, path):
        match = re.match(r"^/questions/(\d+)$", path)
        if match:
            return int(match.group(1))
        return None

    def read_json_body(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            return None
        body = self.rfile.read(content_length).decode("utf-8")
        try:
            return json.loads(body)
        except json.JSONDecodeError:
            return None

    def do_GET(self):
        if self.path == "/questions" or self.path == "/questions/":
            questions = db.get_all_questions()
            self.send_json_response(200, questions)
            return

        item_id = self.parse_item_id(self.path)
        if item_id is not None:
            item = db.get_question_by_id(item_id)
            if item:
                self.send_json_response(200, item)
            else:
                self.send_error_response(404, f"Question with ID {item_id} was not found.")
            return

        self.send_error_response(404, "Invalid endpoint route.")

    def do_POST(self):
        if self.path == "/questions" or self.path == "/questions/":
            data = self.read_json_body()
            if data is None:
                self.send_error_response(400, "Request body cannot be empty.")
                return

            if isinstance(data, dict):
                new_question = db.add_question(data)
            else:
                new_question = db.add_question({"question": str(data)})

            self.send_json_response(201, new_question)
            return

        self.send_error_response(404, "Invalid endpoint route.")

    def do_PUT(self):
        item_id = self.parse_item_id(self.path)
        if item_id is not None:
            if item_id == 1:
                self.send_error_response(400, "You cannot replace the holder (ID 1).")
                return

            data = self.read_json_body()
            if not isinstance(data, dict):
                self.send_error_response(400, "PUT request requires a valid JSON object body.")
                return

            updated_item = db.update_question(item_id, data)
            if updated_item:
                self.send_json_response(200, updated_item)
            else:
                self.send_error_response(404, f"Cannot replace: Question with ID {item_id} was not found.")
            return

        self.send_error_response(404, "Invalid endpoint route.")

    def do_DELETE(self):
        item_id = self.parse_item_id(self.path)
        if item_id is not None:
            if item_id == 1:
                self.send_error_response(400, "You cannot delete the holder (ID 1).")
                return

            success = db.delete_question(item_id)
            if success:
                self.send_response(204)
                self.send_cors_headers()
                self.end_headers()
            else:
                self.send_error_response(404, f"Cannot delete: Question with ID {item_id} was not found.")
            return

        self.send_error_response(404, "Invalid endpoint route.")


if __name__ == "__main__":
    server_address = ("", PORT)
    httpd = http.server.HTTPServer(server_address, CRUDRequestHandler)
    print(f"SQLite-backed CRUD REST API server running on port {PORT}...")
    httpd.serve_forever()