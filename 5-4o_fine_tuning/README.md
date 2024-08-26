# Static analysis gpt-4o fine-tuning


Demo code used in the gpt-4o fine-tuning webinar on Aug 26, 2024.

- Training dataset: https://huggingface.co/datasets/patched-codes/synth-vuln-fixes
- Evals: https://huggingface.co/datasets/patched-codes/static-analysis-eval

## Setup

- Set your OpenAI API key ([docs](https://platform.openai.com/docs/quickstart)).

```bash
export OPENAI_API_KEY="sk_XXX..."
```


## Running Evals

To run evaluations, use the `eval.py` script with the following arguments:

- `--model`: Specifies the OpenAI model name, either base or fine-tuned. Default is `gpt-4o-mini`.
- `--n_shot`: Sets the number of examples for few-shot learning. Default is 0, indicating zero-shot.
- `--use_similarity`: Enables similarity-based retrieval of dataset examples if set to `True`.

Example command to run an evaluation with the `gpt-4o` 5-shot:

```bash
python eval.py --model gpt-4o --n_shot 5
```

#### Example chat completion input

```text

system message

You are an AI assistant specialized in fixing code vulnerabilities. Your task is to provide corrected code that addresses the reported security issue. Always maintain the original functionality while improving security. Be precise and make only necessary changes. Maintain the original code style and formatting unless it directly relates to the vulnerability. Pay attention to data flow between sources and sinks when provided.

user message

Vulnerability Report:\n- Type: CWE-287\n- Location: lines 92-93\n- Description: The vulnerable code uses the \"verify_signature\": False option when decoding the JWT token, which bypasses signature verification. This allows an attacker to forge or tamper with the token, potentially gaining unauthorized access to user data.\n\nOriginal Code:\n\nimport jwt\nimport sqlite3\nimport logging\nfrom flask import Flask, request, jsonify\nimport os\nfrom werkzeug.security import generate_password_hash, check_password_hash\nfrom datetime import datetime, timedelta\n\napp = Flask(__name__)\nSECRET_KEY = os.environ.get('SECRET_KEY', 'my_default_secret_key')\nlogging.basicConfig(level=logging.INFO)\n\ndef get_db_connection():\n    conn = sqlite3.connect('users.db')\n    conn.row_factory = sqlite3.Row\n    return conn\n\ndef init_db():\n    conn = get_db_connection()\n    conn.execute('CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password TEXT, email TEXT, created_at DATETIME)')\n    conn.execute('CREATE TABLE IF NOT EXISTS tokens (token TEXT PRIMARY KEY, username TEXT, expires_at DATETIME)')\n    conn.close()\n\ninit_db()\n\ndef validate_email(email):\n    return '@' in email and '.' in email.split('@')[1]\n\ndef generate_token(username):\n    expires_at = datetime.utcnow() + timedelta(hours=1)\n    token = jwt.encode({'username': username, 'exp': expires_at}, SECRET_KEY, algorithm='HS256')\n    conn = get_db_connection()\n    conn.execute('INSERT INTO tokens (token, username, expires_at) VALUES (?, ?, ?)', (token, username, expires_at))\n    conn.commit()\n    conn.close()\n    return token\n\ndef invalidate_token(token):\n    conn = get_db_connection()\n    conn.execute('DELETE FROM tokens WHERE token = ?', (token,))\n    conn.commit()\n    conn.close()\n\n@app.route('/register', methods=['POST'])\ndef register():\n    data = request.get_json()\n    username = data.get('username')\n    password = data.get('password')\n    email = data.get('email')\n    \n    if not username or not password or not email:\n        return jsonify({\"error\": \"Missing required fields\"}), 400\n    \n    if not validate_email(email):\n        return jsonify({\"error\": \"Invalid email format\"}), 400\n    \n    hashed_password = generate_password_hash(password)\n    \n    conn = get_db_connection()\n    try:\n        conn.execute('INSERT INTO users (username, password, email, created_at) VALUES (?, ?, ?, ?)',\n                     (username, hashed_password, email, datetime.utcnow()))\n        conn.commit()\n        logging.info(f\"User registered: {username}\")\n        return jsonify({\"message\": \"User registered successfully\"}), 201\n    except sqlite3.IntegrityError:\n        return jsonify({\"error\": \"Username already exists\"}), 400\n    finally:\n        conn.close()\n\n@app.route('/login', methods=['POST'])\ndef login():\n    data = request.get_json()\n    username = data.get('username')\n    password = data.get('password')\n    \n    if not username or not password:\n        return jsonify({\"error\": \"Missing username or password\"}), 400\n    \n    conn = get_db_connection()\n    user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()\n    conn.close()\n    \n    if user and check_password_hash(user['password'], password):\n        token = generate_token(username)\n        logging.info(f\"User logged in: {username}\")\n        return jsonify({\"token\": token}), 200\n    else:\n        return jsonify({\"error\": \"Invalid username or password\"}), 401\n\n@app.route('/user/data', methods=['GET'])\ndef user_data():\n    token = request.headers.get('Authorization')\n    if not token:\n        return jsonify({\"error\": \"Missing token\"}), 401\n    try:\n        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'], options={\"verify_signature\": False})\n        conn = get_db_connection()\n        user = conn.execute('SELECT username, email, created_at FROM users WHERE username = ?', (payload['username'],)).fetchone()\n        conn.close()\n        if user:\n            return jsonify({\n                \"username\": user['username'],\n                \"email\": user['email'],\n                \"created_at\": user['created_at']\n            }), 200\n        else:\n            return jsonify({\"error\": \"User not found\"}), 404\n    except jwt.DecodeError:\n        return jsonify({\"error\": \"Invalid token\"}), 403\n\n@app.route('/user/update', methods=['PUT'])\ndef update_user():\n    token = request.headers.get('Authorization')\n    if not token:\n        return jsonify({\"error\": \"Missing token\"}), 401\n    try:\n        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])\n        data = request.get_json()\n        new_email = data.get('email')\n        \n        if not new_email or not validate_email(new_email):\n            return jsonify({\"error\": \"Invalid or missing email\"}), 400\n        \n        conn = get_db_connection()\n        conn.execute('UPDATE users SET email = ? WHERE username = ?', (new_email, payload['username']))\n        conn.commit()\n        conn.close()\n        logging.info(f\"User updated: {payload['username']}\")\n        return jsonify({\"message\": \"User updated successfully\"}), 200\n    except jwt.DecodeError:\n        return jsonify({\"error\": \"Invalid token\"}), 403\n\n@app.route('/logout', methods=['POST'])\ndef logout():\n    token = request.headers.get('Authorization')\n    if not token:\n        return jsonify({\"error\": \"Missing token\"}), 401\n    invalidate_token(token)\n    logging.info(\"User logged out\")\n    return jsonify({\"message\": \"Logged out successfully\"}), 200\n\n@app.route('/users', methods=['GET'])\ndef list_users():\n    conn = get_db_connection()\n    users = conn.execute('SELECT username, email, created_at FROM users').fetchall()\n    conn.close()\n    return jsonify([dict(user) for user in users]), 200\n\n@app.route('/user/delete', methods=['DELETE'])\ndef delete_user():\n    token = request.headers.get('Authorization')\n    if not token:\n        return jsonify({\"error\": \"Missing token\"}), 401\n    try:\n        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])\n        conn = get_db_connection()\n        conn.execute('DELETE FROM users WHERE username = ?', (payload['username'],))\n        conn.execute('DELETE FROM tokens WHERE username = ?', (payload['username'],))\n        conn.commit()\n        conn.close()\n        logging.info(f\"User deleted: {payload['username']}\")\n        return jsonify({\"message\": \"User deleted successfully\"}), 200\n    except jwt.DecodeError:\n        return jsonify({\"error\": \"Invalid token\"}), 403\n\nif __name__ == '__main__':\n    app.run(debug=True)\n\nTask: Fix the vulnerability in the code above. Provide only the complete fixed code without explanations or comments. Make minimal changes necessary to address the security issue while preserving the original functionality.

```
<img width="670" alt="image" src="https://github.com/user-attachments/assets/679a3505-57f5-4cb1-9e71-695660356ea1">

### Acknowledgements

The [training dataset](https://huggingface.co/datasets/patched-codes/synth-vuln-fixes) and evals utilized in this project are sourced from patched.codes. We extend our gratitude to the [patched.codes](https://www.patched.codes/) (S24) team for their valuable contributions.

