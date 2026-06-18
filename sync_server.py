import json
import os
import subprocess
import sys
from datetime import datetime

from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "data.json")


GIT_EXE = r"C:\Program Files\Git\bin\git.exe"

def run_git(args):
    """Run git command from BASE_DIR, return (returncode, stdout, stderr)."""
    try:
        result = subprocess.run(
            [GIT_EXE] + args,
            cwd=BASE_DIR,
            capture_output=True,
            text=True,
            timeout=30,
        )
        return result.returncode, result.stdout.strip(), result.stderr.strip()
    except FileNotFoundError:
        return -1, "", "git not found"
    except subprocess.TimeoutExpired:
        return -1, "", "git timeout"


@app.route("/sync", methods=["POST"])
def sync():
    try:
        data = request.get_json(force=True)
    except Exception as e:
        print(f"[{datetime.now()}] /sync: invalid JSON - {e}")
        return jsonify({"error": "invalid JSON"}), 400

    if not isinstance(data, dict):
        print(f"[{datetime.now()}] /sync: received non-object JSON")
        return jsonify({"error": "body must be a JSON object"}), 400

    # Write data.json
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"[{datetime.now()}] /sync: wrote {len(json.dumps(data))} bytes to data.json")
    except Exception as e:
        print(f"[{datetime.now()}] /sync: write failed - {e}")
        return jsonify({"error": "write failed"}), 500

    # git add data.json
    rc, out, err = run_git(["add", "data.json"])
    if rc != 0:
        print(f"[{datetime.now()}] git add failed: {err or out}")
        return jsonify({"error": "git add failed", "detail": err or out}), 500

    # git commit
    rc, out, err = run_git(["commit", "-m", "sync"])
    if rc != 0:
        # "nothing to commit" is not an error
        if "nothing to commit" in (out + err).lower():
            print(f"[{datetime.now()}] /sync: no changes to commit")
            return jsonify({"status": "ok", "detail": "no changes"})
        print(f"[{datetime.now()}] git commit failed: {err or out}")
        return jsonify({"error": "git commit failed", "detail": err or out}), 500

    print(f"[{datetime.now()}] git commit: {out}")

    # git push
    rc, out, err = run_git(["push", "origin", "master"])
    if rc != 0:
        print(f"[{datetime.now()}] git push failed: {err or out}")
        return jsonify({"error": "git push failed", "detail": err or out}), 500

    print(f"[{datetime.now()}] git push: {out}")
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    print(f"[{datetime.now()}] sync_server starting on 0.0.0.0:8090")
    print(f"[{datetime.now()}] base dir: {BASE_DIR}")
    app.run(host="0.0.0.0", port=8090, debug=False)
