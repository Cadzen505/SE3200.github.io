import http.server
import json
import os

PORT = 8000
FILENAME = "questions.txt"

class MessageHandler(http.server.BaseHTTPRequestHandler):

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path == "/questions":
            
            halo2_questions = [
        
                {
                    "question": "What is the ship the Master Chief is on in the first Mission?",
                    "correct_answer": "Cario Station",
                    "incorrect_answers": ["Pillar of Autumn", "Absolute", "Aada"]
                }
            ]

            if os.path.exists(FILENAME):
                with open(FILENAME, "r") as f:
                    user_questions = [line.strip() for line in f.readlines() if line.strip()]
                    halo2_questions.extend(user_questions)
                    
            response_data = json.dumps(halo2_questions).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(response_data)
        else:
            self.send_response(404)
            self.send_header("Content-Type", "text/plain")
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(b"404 Not Found: The requested endpoint does not exist.")

    def do_POST(self):
        if self.path == "/questions":
            content_length = int(self.headers.get('Content-Length', 0))
            
            post_data = self.rfile.read(content_length).decode('utf-8')

            with open(FILENAME, "a") as f:
                f.write(post_data + "\n")

            self.send_response(201)
            self.send_cors_headers()
            self.end_headers()
        else:
            self.send_response(404)
            self.send_header("Content-Type", "text/plain")
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(b"404 Not Found: The requested endpoint does not exist.")

if __name__ == "__main__":
    server_address = ("", PORT)
    httpd = http.server.HTTPServer(server_address, MessageHandler)
    print(f"Server running on port {PORT}...")
    httpd.serve_forever()