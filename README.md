# Tech Support Agentic POC

An agentic AI copilot that assists a customer service representative on a live support call.
This repo contains a Python backend (FastAPI + Claude via AWS Bedrock) and a Next.js frontend UI.

---

## Project Structure

```
├── tech-support-copilot-poc/   # Backend (Python / FastAPI)
├── copilot-ui/                 # Frontend (Next.js / TypeScript)
├── venv/                       # Python virtual environment (not committed)
└── .gitignore
```

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Python 3.11+ | `python --version` |
| Node.js 18+ | `node --version` |
| AWS CLI configured | `aws configure` or `~/.aws/credentials` |
| Bedrock model access | Enable `anthropic.claude-haiku-4-5-20251001-v1:0` in the [Bedrock console](https://console.aws.amazon.com/bedrock) |

---

## Backend Setup

```bash
cd tech-support-copilot-poc

# Create and activate virtual environment
python -m venv ../venv
# Windows
..\venv\Scripts\activate
# macOS/Linux
source ../venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the API server
uvicorn server:app --port 8000 --reload
```

Server runs at `http://localhost:8000`.

---

## Frontend Setup

```bash
cd copilot-ui

# Install dependencies (node_modules is not committed)
npm install

# Start the dev server
npm run dev
```

UI runs at `http://localhost:3000`.

---

## Running Both

Open two terminals:

**Terminal 1 — Backend**
```bash
cd tech-support-copilot-poc
..\venv\Scripts\activate
uvicorn server:app --port 8000 --reload
```

**Terminal 2 — Frontend**
```bash
cd copilot-ui
npm run dev
```

Then open `http://localhost:3000` in your browser.
