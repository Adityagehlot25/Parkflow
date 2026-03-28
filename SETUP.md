# 🚀 Quick Start Guide

Get the Aqua Imagicaa Dashboard running in 5 minutes!

## Prerequisites Check

```bash
# Check Node version (need 16+)
node --version

# Check Python version (need 3.8+)
python --version

# Check npm
npm --version
```

---

## One-Command Setup

### Windows (PowerShell)

```powershell
# 1. Navigate to project
cd "e:\Water park"

# 2. Install all dependencies
cd backend; npm install; cd ../waterpark-frontend; npm install; cd ..

# 3. Create .env file
@"
OPENROUTER_API_KEY=your_key_here
PORT=5000
"@ | Set-Content backend\.env

# 4. Start backend (new terminal)
cd backend; node server.js

# 5. Start frontend (another terminal)
cd waterpark-frontend; npm run dev
```

### macOS/Linux (Bash)

```bash
# 1. Navigate to project
cd Water\ park

# 2. Install backend
cd backend && npm install && cd ..

# 3. Install frontend
cd waterpark-frontend && npm install && cd ..

# 4. Create .env file
echo "OPENROUTER_API_KEY=your_key_here" > backend/.env
echo "PORT=5000" >> backend/.env

# 5. Start backend (new terminal)
cd backend && node server.js

# 6. Start frontend (another terminal)
cd waterpark-frontend && npm run dev
```

---

## Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **API Docs**: Check `/rides`, `/crowd`, `/wait-times`

---

## Get Your API Key

1. Go to https://openrouter.ai
2. Sign up (free tier available)
3. Navigate to API Keys
4. Copy your key
5. Paste in `backend/.env` → `OPENROUTER_API_KEY`

---

## Common Issues

| Issue | Solution |
|-------|----------|
| Port 5000 already in use | Change `PORT` in `.env` |
| Frontend blank screen | Check backend is running on correct port |
| Chat doesn't work | Verify OPENROUTER_API_KEY in .env |
| CORS errors | Backend must be running (port 5000) |

---

## Verify Setup

### Backend Health Check

```bash
curl http://localhost:5000/rides
```

Should return ride data in JSON.

### Frontend Health Check

- Open http://localhost:5173
- Should see "Aqua Imagicaa Live Dashboard"
- Map should load with ride positions

---

## Next Steps

- Read [README.md](./README.md) for full documentation
- Check [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for endpoint details
- Customize in [CUSTOMIZATION.md](./CUSTOMIZATION.md) (coming soon)

---

**Questions?** Check the troubleshooting section in README.md
