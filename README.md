# Vortex - Cyber Threat Intelligence Dashboard

A modern, full-stack Cyber Threat Intelligence (CTI) platform for tracking, analyzing, and enriching Indicators of Compromise (IOCs).

## Features

- 🔍 **IOC Management** - Track URLs, IPs, domains, and file hashes
- 🔄 **Auto-Ingestion** - Automatic URLHaus threat feed ingestion
- 🎯 **Enrichment** - VirusTotal & AbuseIPDB integration
- 🏷️ **Tagging System** - Organize IOCs with custom tags
- 📊 **Dashboard** - Real-time metrics and visualizations
- 👥 **User Management** - Role-based access control (Admin, Analyst, Viewer)
- 📤 **Export** - Export IOCs in CSV/JSON formats

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express.js, MongoDB
- **Authentication**: JWT tokens
- **External APIs**: VirusTotal, AbuseIPDB, URLHaus

---

## Deployment Guide

### Prerequisites

1. MongoDB Atlas account (free tier works)
2. Vercel account
3. GitHub account
4. (Optional) VirusTotal API key (free tier)
5. (Optional) AbuseIPDB API key (free tier)

---

## Step 1: Push to GitHub

```bash
cd /Users/aniketpandey/Desktop/cti/cti-me

# Initialize git if not already
git init

# Add the remote repository
git remote add origin https://github.com/pentoshi007/vortex.git

# Stage all files
git add .

# Commit
git commit -m "Initial commit: Vortex CTI Dashboard"

# Push to main branch
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy Backend to Vercel

### 2.1 Create Backend Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import from GitHub: `pentoshi007/vortex`
4. Configure the project:
   - **Root Directory**: `backend`
   - **Framework Preset**: Other
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)

### 2.2 Set Backend Environment Variables

In Vercel project settings → Environment Variables, add:

| Variable                 | Value                                    | Description                                                  |
| ------------------------ | ---------------------------------------- | ------------------------------------------------------------ |
| `MONGO_URI`              | `mongodb+srv://...`                      | Your MongoDB Atlas connection string                         |
| `JWT_SECRET`             | `your-secure-random-string-min-32-chars` | Secret for JWT tokens (generate with `openssl rand -hex 32`) |
| `CRON_SECRET`            | `your-cron-secret`                       | Secret for cron job authentication                           |
| `NODE_ENV`               | `production`                             | Environment mode                                             |
| `CORS_ORIGINS`           | `https://vortex-frontend.vercel.app`     | Frontend URL (update after deploying frontend)               |
| `VT_API_KEY`             | `your-virustotal-api-key`                | (Optional) VirusTotal API key                                |
| `ABUSEIPDB_API_KEY`      | `your-abuseipdb-api-key`                 | (Optional) AbuseIPDB API key                                 |
| `DEFAULT_ADMIN_PASSWORD` | `your-secure-admin-password`             | Initial admin password                                       |
| `DEFAULT_ADMIN_EMAIL`    | `admin@yourdomain.com`                   | Initial admin email                                          |

### 2.3 Deploy Backend

Click **"Deploy"** and wait for completion. Note the deployment URL (e.g., `https://vortex-backend.vercel.app`).

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Create Frontend Project

1. In Vercel, click **"Add New Project"** again
2. Import the same repo: `pentoshi007/vortex`
3. Configure the project:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 3.2 Set Frontend Environment Variables

| Variable       | Value                               | Description                  |
| -------------- | ----------------------------------- | ---------------------------- |
| `VITE_API_URL` | `https://vortex-backend.vercel.app` | Your backend URL from Step 2 |

### 3.3 Deploy Frontend

Click **"Deploy"** and wait for completion.

---

## Step 4: Update Backend CORS

After deploying the frontend, go back to your **backend** Vercel project:

1. Go to Settings → Environment Variables
2. Update `CORS_ORIGINS` to your frontend URL: `https://vortex-frontend.vercel.app`
3. Redeploy the backend (Deployments → ... → Redeploy)

---

## Step 5: Create Initial Admin User

The first time you access the app, if `DEFAULT_ADMIN_PASSWORD` is set, an admin user will be created automatically.

**Default Credentials:**

- Username: `admin` (or value of `DEFAULT_ADMIN_USERNAME`)
- Password: Value of `DEFAULT_ADMIN_PASSWORD` env var
- Email: Value of `DEFAULT_ADMIN_EMAIL` env var

---

## Automatic Cron Jobs (Vercel Pro)

If you have Vercel Pro, cron jobs are configured automatically:

- **Ingestion**: Every 2 hours (`0 */2 * * *`)
- **Enrichment**: Every 2 hours, offset by 30 min (`30 */2 * * *`)

For free tier, use external cron services like [cron-job.org](https://cron-job.org):

```
# Ingestion (every 2 hours)
GET https://your-backend.vercel.app/api/cron/ingest?secret=YOUR_CRON_SECRET

# Enrichment (every 2 hours)
GET https://your-backend.vercel.app/api/cron/enrich?secret=YOUR_CRON_SECRET&limit=10
```

---

## Environment Variables Reference

### Backend (.env)

```env
# Required
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/vortex
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters

# Optional - Initial Admin
DEFAULT_ADMIN_PASSWORD=your-secure-admin-password
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@example.com

# Optional - CORS
CORS_ORIGINS=https://your-frontend.vercel.app

# Optional - Cron
CRON_SECRET=your-cron-secret

# Optional - External APIs (Free Tier)
VT_API_KEY=your-virustotal-api-key
ABUSEIPDB_API_KEY=your-abuseipdb-api-key

# Optional - Rate Limits (defaults to free tier)
VT_RATE_LIMIT_PER_MIN=4
VT_RATE_LIMIT_PER_DAY=500
ABUSEIPDB_RATE_LIMIT_PER_DAY=1000
```

### Frontend (.env)

```env
VITE_API_URL=https://your-backend.vercel.app
```

---

## Local Development

### Backend

```bash
cd backend
npm install
cp .env.example .env  # Edit with your values
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token

### IOCs

- `GET /api/iocs` - List IOCs
- `POST /api/iocs` - Create IOC
- `GET /api/iocs/:id` - Get IOC details
- `PUT /api/iocs/:id` - Update IOC
- `DELETE /api/iocs/:id` - Delete IOC

### Lookup

- `POST /api/lookup` - Perform IOC lookup with enrichment
- `GET /api/lookup/history` - Get lookup history

### Admin

- `GET /api/admin/system/stats` - System statistics
- `POST /api/admin/ingest/run` - Trigger ingestion
- `POST /api/admin/enrichment/run` - Trigger enrichment
- `GET /api/admin/users` - List users

### Cron (Protected)

- `GET /api/cron/ingest` - Cron ingestion endpoint
- `GET /api/cron/enrich` - Cron enrichment endpoint
- `GET /api/cron/health` - Cron health check

---

## License

MIT
