import http.server
import json
import os
import re
import sqlite3
import hashlib
import uuid
import webbrowser
import threading
from urllib.parse import urlparse
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT = 8000
DB_FILENAME = "questions.db"
conn = sqlite3.connect(DB_FILENAME, check_same_thread=False)
cursor = conn.cursor()

active_sessions = {}

def hash_password(password):
    salt = os.urandom(16)
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return salt.hex() + ':' + pwd_hash.hex()

def verify_password(stored_password, provided_password):
    try:
        salt_hex, hash_hex = stored_password.split(':')
        salt = bytes.fromhex(salt_hex)
        stored_hash = bytes.fromhex(hash_hex)
        provided_hash = hashlib.pbkdf2_hmac('sha256', provided_password.encode('utf-8'), salt, 100000)
        return provided_hash == stored_hash
    except Exception:
        return False

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
            conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    first_name TEXT NOT NULL,
                    last_name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL
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

    def add_user(self, first_name, last_name, email, password):
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                pwd_hash = hash_password(password)
                cursor.execute(
                    "INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)",
                    (first_name, last_name, email, pwd_hash)
                )
                conn.commit()
                return cursor.lastrowid
        except sqlite3.IntegrityError:
            return None

    def get_user_by_email(self, email):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
            return cursor.fetchone()

    def get_user_by_id(self, user_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, first_name, last_name, email FROM users WHERE id = ?", (user_id,))
            return cursor.fetchone()

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

class CRUDRequestHandler(http.server.SimpleHTTPRequestHandler):

    def send_cors_headers(self):
        origin = self.headers.get("Origin", "http://localhost:8000")
        self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Access-Control-Allow-Credentials", "true")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def send_json_response(self, status_code, data, extra_headers=None): 
        response_bytes = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_cors_headers()
        if extra_headers:
            for key, val in extra_headers.items():
                self.send_header(key, val)
        self.end_headers()
        self.wfile.write(response_bytes)

    def send_error_response(self, status_code, message):
        error_payload = {
            "error": message,
            "status": status_code
        }
        self.send_json_response(status_code, error_payload)

    def parse_item_id(self, path):
        parsed_url = urlparse(path)
        path_parts = parsed_url.path.strip('/').split('/')
        if len(path_parts) == 2 and path_parts[0] == 'questions':
            try:
                return int(path_parts[1])
            except ValueError:
                return None
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

    def get_authenticated_user(self):
        cookie_header = self.headers.get("Cookie")
        if not cookie_header:
            return None
        
        cookies = {}
        for cookie in cookie_header.split(";"):
            if "=" in cookie:
                key, val = cookie.strip().split("=", 1)
                cookies[key] = val
        
        session_id = cookies.get("session_id")
        if not session_id or session_id not in active_sessions:
            return None
            
        user_id = active_sessions[session_id]
        return db.get_user_by_id(user_id)

    def do_GET(self):
        if self.path == "/check-auth":
            user = self.get_authenticated_user()
            if user:
                self.send_json_response(200, {
                    "id": user["id"],
                    "first_name": user["first_name"],
                    "last_name": user["last_name"],
                    "email": user["email"]
                })
            else:
                self.send_error_response(401, "Not authenticated")
            return

        if self.path.startswith("/questions"):
            if not self.get_authenticated_user():
                self.send_error_response(401, "Unauthorized")
                return

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
                    self.send_error_response(404, f"Question not found.")
                return

        return super().do_GET()

    def do_POST(self):
        if self.path == "/register" or self.path == "/register/":
            data = self.read_json_body()
            if not data or not all(k in data for k in ("first_name", "last_name", "email", "password")):
                self.send_error_response(400, "Missing required registration fields.")
                return

            user_id = db.add_user(data["first_name"], data["last_name"], data["email"], data["password"])
            if user_id is None:
                self.send_error_response(400, "Email address is already registered.")
                return

            self.send_json_response(201, {"message": "User registered successfully", "id": user_id})
            return

        if self.path == "/login" or self.path == "/login/":
            data = self.read_json_body()
            if not data or not all(k in data for k in ("email", "password")):
                self.send_error_response(400, "Email and password are required.")
                return

            user = db.get_user_by_email(data["email"])
            if not user or not verify_password(user["password_hash"], data["password"]):
                self.send_error_response(401, "Invalid email or password.")
                return

            session_id = str(uuid.uuid4())
            active_sessions[session_id] = user["id"]

            cookie_val = f"session_id={session_id}; Path=/; HttpOnly"
            self.send_json_response(200, {
                "id": user["id"],
                "first_name": user["first_name"],
                "last_name": user["last_name"],
                "email": user["email"]
            }, extra_headers={"Set-Cookie": cookie_val})
            return

        if self.path == "/logout" or self.path == "/logout/":
            cookie_header = self.headers.get("Cookie")
            if cookie_header:
                for cookie in cookie_header.split(";"):
                    if "session_id=" in cookie:
                        sid = cookie.strip().split("=")[1]
                        if sid in active_sessions:
                            del active_sessions[sid]

            clear_cookie = "session_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly"
            self.send_json_response(200, {"message": "Logged out successfully"}, extra_headers={"Set-Cookie": clear_cookie})
            return

        if self.path == "/questions" or self.path == "/questions/":
            if not self.get_authenticated_user():
                self.send_error_response(401, "Unauthorized")
                return

            data = self.read_json_body()
            if data is None:
                self.send_error_response(400, "Request body cannot be empty.")
                return

            new_question = db.add_question(data if isinstance(data, dict) else {"question": str(data)})
            self.send_json_response(201, new_question)
            return

        self.send_error_response(404, "Invalid endpoint route.")

    def do_PUT(self):
        item_id = self.parse_item_id(self.path)
        if item_id is not None:
            if not self.get_authenticated_user():
                self.send_error_response(401, "Unauthorized")
                return

            if item_id == 1:
                self.send_error_response(400, "Cannot replace holder (ID 1).")
                return

            data = self.read_json_body()
            updated_item = db.update_question(item_id, data)
            if updated_item:
                self.send_json_response(200, updated_item)
            else:
                self.send_error_response(404, "Question not found.")
            return

        self.send_error_response(404, "Invalid endpoint route.")

    def do_DELETE(self):
        item_id = self.parse_item_id(self.path)
        if item_id is not None:
            if not self.get_authenticated_user():
                self.send_error_response(401, "Unauthorized")
                return

            if item_id == 1:
                self.send_error_response(400, "You cannot delete the holder (ID 1).")
                return

            success = db.delete_question(item_id)
            if success:
                self.send_response(204)
                self.end_headers()
            else:
                self.send_error_response(404, "Question ID not found.")
            return

        self.send_error_response(404, "Invalid endpoint route.")


if __name__ == "__main__":
    server_address = ("127.0.0.1", PORT)
    httpd = http.server.HTTPServer(server_address, CRUDRequestHandler)
    print(f"Server running at http://127.0.0.1:{PORT} ...")
    
    threading.Timer(0.5, lambda: webbrowser.open(f"http://127.0.0.1:{PORT}/index.html")).start()
    
    httpd.serve_forever()

