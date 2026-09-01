#!/usr/bin/env python3
"""Upload project files to GitHub via Contents API (no local git required)."""
import base64
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OWNER = "lporter425"
REPO = "oh-norman-order-confirmation"
MESSAGE = "Use hosted CDN URLs for Facebook and Instagram social icons"
GH = os.environ.get(
    "GH",
    "/tmp/gh-extract/gh_2.67.0_macOS_arm64/bin/gh",
)

FILES = [
    "oh-norman-order-confirmation.liquid",
    "email-preview.html",
    "PREVIEW-SETUP.md",
    ".env.example",
    ".gitignore",
    "preview-assets.json",
    "scripts/fetch-order-preview.rb",
    "scripts/setup-env.sh",
    "scripts/email-preview.template.js",
    "scripts/build-email-preview.rb",
]


def gh_token():
    result = subprocess.run(
        [GH, "auth", "token"],
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()


def api_request(method, path, payload=None):
    token = gh_token()
    url = f"https://api.github.com/repos/{OWNER}/{REPO}/contents/{path}"
    data = None
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "oh-norman-upload",
    }
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body) if body else None
    except urllib.error.HTTPError as err:
        if err.code == 404:
            return None
        detail = err.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {path} failed ({err.code}): {detail}") from err


def upload_file(rel_path):
    full_path = os.path.join(ROOT, rel_path)
    if not os.path.isfile(full_path):
        print(f"SKIP (missing): {rel_path}")
        return

    with open(full_path, "rb") as handle:
        content = base64.b64encode(handle.read()).decode("ascii")

    existing = api_request("GET", rel_path)
    payload = {
        "message": MESSAGE,
        "content": content,
    }
    if existing and existing.get("sha"):
        payload["sha"] = existing["sha"]

    api_request("PUT", rel_path, payload)
    action = "Updated" if existing else "Added"
    print(f"{action} {rel_path} ({os.path.getsize(full_path)} bytes)")


def main():
    if not os.path.isfile(GH):
        print(f"GitHub CLI not found at {GH}", file=sys.stderr)
        sys.exit(1)
    for rel_path in FILES:
        upload_file(rel_path)
    print(f"\nRepository: https://github.com/{OWNER}/{REPO}")


if __name__ == "__main__":
    main()
