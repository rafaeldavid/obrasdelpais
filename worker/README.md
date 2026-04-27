# Obras del País — feedback worker

A Cloudflare Worker that receives feedback from the website and appends a row to `data/feedback.csv` in this GitHub repo.

## Architecture

```
[ visitor ]  →  feedback button (top-right, every page)
                    ↓
                opens modal · types message · submit
                    ↓
                POST /feedback  →  Cloudflare Worker
                                       ↓
                                   sanitize + rate-limit
                                       ↓
                                   GitHub Contents API
                                   GET data/feedback.csv → append row → PUT
                                       ↓
                                   commit lands on main
```

## Why this shape

- **CSV in the repo, not a separate DB.** Easy to read, easy to triage in pull-requests, no new infra. Open in Google Sheets / Excel / `csvkit`.
- **Worker, not a serverless function on the static host.** The static site is on here.now (no server runtime). The Worker is the smallest possible piece of compute.
- **Public repo, public CSV.** Surfaced in the modal: "Tu mensaje se guarda en nuestro repositorio público de GitHub para transparencia. No incluyas datos sensibles." If you decide that's the wrong call later, swap `GITHUB_REPO` for a private companion repo and the front-end stays unchanged.
- **No build step in the Worker.** Single file, ESM, deploys in seconds.

## Deploy

### 0) Node ≥ 20 required

Wrangler needs **Node.js 20 or newer**. Check yours:

```bash
node -v          # must show v20.x or v22.x
```

If you see v18.x or older, upgrade:

| You have | Fix |
|---|---|
| nvm installed (likely if you've ever run `nvm`) | `nvm install 22 && nvm alias default 22` |
| Homebrew on Mac | `brew install node@22 && brew link --overwrite node@22` |
| Nothing yet | Download the **LTS installer** from https://nodejs.org/ and run it |
| Windows | Install [`nvm-windows`](https://github.com/coreybutler/nvm-windows) → `nvm install 22 && nvm use 22`, or use the LTS installer from nodejs.org |

### 1) Wrangler

```bash
cd worker
npm install -g wrangler        # one-time
wrangler login                 # opens browser, links to your Cloudflare account
```

### 2) Create the GitHub PAT

Go to https://github.com/settings/personal-access-tokens/new and create a **fine-grained** PAT:
- **Resource owner**: `rafaeldavid` (your account)
- **Repository access**: only this repo (`rafaeldavid/obrasdelpais`)
- **Permissions** → **Repository permissions**:
  - **Contents**: **Read and write**
  - (everything else: No access)
- **Expiration**: 1 year (or whatever your security policy is)

Copy the token (starts with `github_pat_…`). You'll only see it once.

### 3) Set the token as a Worker secret

```bash
wrangler secret put GITHUB_TOKEN
# paste the github_pat_… token when prompted
```

### 4) (Optional) Create a KV namespace for rate limiting

```bash
wrangler kv namespace create RATE_KV
# wrangler prints something like:
#   id = "abc123…"
# Paste it into wrangler.toml under the [[kv_namespaces]] block (currently commented).
```

If you skip this, rate limiting is silently disabled — fine for low traffic.

### 5) Deploy

```bash
wrangler deploy
```

Wrangler prints the deployed URL, typically `https://obras-del-pais-feedback.<your-subdomain>.workers.dev`. Copy that URL.

### 6) Wire it to the front-end

Edit `preview-site/assets/data/feedback-config.json` and set:

```json
{ "endpoint": "https://obras-del-pais-feedback.YOUR-SUBDOMAIN.workers.dev/feedback" }
```

Re-publish:

```bash
cd ../preview-site
~/.claude/skills/here-now/scripts/publish.sh . --slug steady-glacier-drz3 --client claude-code
```

The button on the live site now points at your Worker.

## Local dev

```bash
wrangler dev
# in another terminal:
curl -X POST http://127.0.0.1:8787/feedback \
     -H "Content-Type: application/json" \
     -d '{"message":"local test","page":"/","lang":"es"}'
```

The local Worker uses the same `GITHUB_TOKEN` secret you set with `wrangler secret put` (it's read from the Cloudflare account, not from a `.env`).

## Health check

```bash
curl https://obras-del-pais-feedback.YOUR-SUBDOMAIN.workers.dev/
# → {"ok":true,"service":"obras-del-pais-feedback"}
```

## Triaging incoming feedback

Each submission lands as a commit on `main` with the message `feedback: <first 60 chars>`. To watch them:

```bash
git log --grep "^feedback:" --oneline
# or, with one-liner content
git log --grep "^feedback:" --pretty=format:"%h %s"
```

To see the latest 10 submissions in the CSV:

```bash
tail -10 data/feedback.csv | csvlook
# or, if you don't have csvkit:
tail -10 data/feedback.csv
```

To convert to JSON:

```bash
python3 -c "
import csv, json, sys
r = csv.DictReader(open('data/feedback.csv'))
print(json.dumps(list(r), indent=2, ensure_ascii=False))
"
```

## Switching the destination

| Want | Change |
|---|---|
| Private repo | Set `GITHUB_REPO` to your private repo in `wrangler.toml`. Re-grant the PAT to that repo. |
| GitHub Issues instead of CSV | Replace `ghCommitFile` in `feedback.js` with a POST to `/repos/{owner}/{repo}/issues`. ~10 lines. |
| Cloudflare D1 (SQL) instead of CSV | Add a D1 binding in `wrangler.toml`, replace the GitHub calls with `env.DB.prepare(…).bind(…).run()`. |

The Worker is ~150 lines — easy to swap.

## Hardening notes for later

- The modal disclosure makes it clear the destination is a public repo. If feedback volume picks up, consider routing PII (anything with `@`) through GitHub Issues instead, where the repo can be private.
- The honeypot (`hp` field) catches the dumbest bots. Add Cloudflare Turnstile if you start seeing real abuse — frontend script tag + Worker validates the token, ~20 minutes of work.
- The PAT only has write access to one repo's contents — minimum blast radius. Rotate annually.
