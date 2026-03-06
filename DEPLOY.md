# HCT-Pantheon — Deployment Guide
## Omkar Kapade | AI Forward Deployed Engineer | okapade@hct-world.com

---

## FIRST TIME SETUP (do once)

### 1. Create the GitHub repo
- Go to github.com → New Repository
- Name: `HCT-Pantheon`
- Visibility: **Private**
- Don't initialize with README (we'll push our code)

### 2. Connect your local code to GitHub
```bash
cd /path/to/HCT-Pantheon
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/HCT-Pantheon.git
git push -u origin main
```

### 3. Connect Vercel
- Go to vercel.com → Sign up with your GitHub account (okapade@hct-world.com)
- "Import Project" → Select `HCT-Pantheon` from your repos
- Set environment variables in Vercel dashboard:
  - `ANTHROPIC_API_KEY` = your key
  - `ADMIN_PASSWORD` = your chosen password
  - `FLASK_SECRET` = any random string
  - `SIM_LIMIT_PER_WEEK` = 3
  - `TRIAL_DAYS` = 90
- Deploy → You get a URL like `hct-pantheon.vercel.app`

---

## EVERY TIME YOU UPDATE (3 commands)

```bash
git add .
git commit -m "description of what changed"
git push
```

That's it. Vercel auto-deploys on every push.

---

## HOW TO INVITE USERS

1. Go to `your-url.vercel.app/admin`
2. Enter the admin password
3. Type their email/phone, name, org
4. Click "Generate Access Code"
5. Click "Copy invite message" → paste it in an email/text to them
6. They go to `your-url.vercel.app/login`, enter their email + code, they're in

---

## URLS

| URL | Who | What |
|-----|-----|------|
| `/login` | Prospects | Login screen with access code |
| `/` | Authenticated users | Full Pantheon dashboard |
| `/admin` | HCT team | Invite users, manage access |

---

## COSTS

| Item | Cost |
|------|------|
| GitHub Private Repo | Free |
| Vercel Hosting | Free (100GB bandwidth) |
| Claude API (30 users, 90 days) | ~$80-$250 |
| Twilio SMS (optional, later) | ~$4 |
| **Total** | **~$85-$255** |

---

## FILE STRUCTURE

```
HCT-Pantheon/
├── app.py                    # Flask backend (auth, API, AI streaming)
├── vercel.json               # Vercel deployment config
├── requirements.txt          # Python dependencies
├── .env.example              # Environment variable template
├── .gitignore                # Keeps secrets out of repo
├── data/
│   └── incident.json         # Incident scenario data
├── static/
│   ├── assets/
│   │   └── PantheonLogoGold.png
│   ├── css/
│   │   └── dashboard.css     # 1015 lines
│   └── js/
│       └── dashboard.js      # 3599 lines
└── templates/
    ├── dashboard.html        # Main app (653 lines)
    ├── login.html            # Login screen
    └── admin.html            # Admin panel
```
