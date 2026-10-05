# Arthayog Dormitory ERP — Option B Cloud Deployment Guide

This guide walks you through deploying **Arthayog Dormitory ERP** to the cloud:
- **Frontend (Vite / React PWA)**: Hosted on **[Vercel](https://vercel.com)** (Free, instant global CDN, automatic SSL, custom domain support).
- **Backend (FastAPI + SQLite)**: Hosted on **[Render](https://render.com)** (Free tier web service with persistent disk for database storage).

---

## 🏗️ Architecture in Production

```
                               +-----------------------------+
                               |     Guest / Staff Phone     |
                               | (Chrome, Safari, PWA app)   |
                               +--------------+--------------+
                                              |
                   +--------------------------+--------------------------+
                   |                                                     |
        Static UI Assets & HTML                               API JSON Requests
                   |                                                     |
                   v                                                     v
      +-------------------------+                           +-------------------------+
      |      Vercel Edge        |                           |       Render.com        |
      |   (Frontend React)      |                           |    (FastAPI Backend)    |
      | https://arthayog.vercel.app |                       | https://arthayog.onrender.com |
      +-------------------------+                           +------------+------------+
                                                                         |
                                                                         v
                                                            +-------------------------+
                                                            | Persistent Disk Storage |
                                                            |  (/var/data/arthayog.db)|
                                                            +-------------------------+
```

---

## 📋 Pre-requisite: Push Code to GitHub

1. Create a new repository on your [GitHub](https://github.com/new) account (e.g. `arthayog-dormitory-erp`).
2. Run the following commands in this directory:
   ```bash
   git add .
   git commit -m "Initial commit for Arthayog Dormitory ERP production deployment"
   git branch -M main
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/arthayog-dormitory-erp.git
   git push -u origin main
   ```

---

## 🚀 Step 1: Deploy Backend to Render (Free)

1. Log in or create a free account at **[render.com](https://render.com)**.
2. Click **New +** → **Blueprint** (or **Web Service**).
   - If using **Blueprint**: Connect your GitHub repository. Render will automatically detect `render.yaml` and configure everything (Python 3.11, persistent disk, environment variables).
   - If creating a manual **Web Service**:
     - **Name**: `arthayog-backend`
     - **Region**: Singapore or Frankfurt (closest to India)
     - **Root Directory**: `backend`
     - **Runtime**: `Python 3`
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
     - **Instance Type**: `Free`
3. Add **Environment Variables** in Render Dashboard:
   - `ENVIRONMENT` = `production`
   - `SECRET_KEY` = *(click Generate or enter a random secure string)*
   - `DATABASE_URL` = `sqlite:////var/data/arthayog.db`
   - `RAZORPAY_KEY_ID` = `your_razorpay_key_id`
   - `RAZORPAY_KEY_SECRET` = `your_razorpay_key_secret`
4. Add **Persistent Disk** (under Disks tab in Render):
   - **Name**: `arthayog-data`
   - **Mount Path**: `/var/data`
   - **Size**: `1 GB` (More than enough for 100,000+ bookings)
5. Click **Create Web Service**.
6. Once deployed, copy your backend URL (e.g., `https://arthayog-backend.onrender.com`).
   - Test it by opening `https://arthayog-backend.onrender.com/api/health` in your browser. It will respond with `{"status":"healthy"}`.

---

## ⚡ Step 2: Deploy Frontend to Vercel (Free)

1. Log in or sign up at **[vercel.com](https://vercel.com)** using your GitHub account.
2. Click **Add New...** → **Project**.
3. Import your `arthayog-dormitory-erp` repository.
4. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click edit and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**, add:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://arthayog-backend.onrender.com` *(use your Render URL from Step 1)*
6. Click **Deploy**.
7. In ~30 seconds, your site is live at `https://arthayog-dormitory-xxx.vercel.app`!

---

## 🌐 Step 3: Custom Domain Setup (Optional)

In your Vercel project dashboard:
1. Go to **Settings** → **Domains**.
2. Add your custom domain (e.g., `arthayog.com` or `stay.arthayog.com`).
3. Follow the DNS instructions (add a CNAME or A record at your domain registrar). Vercel provides automatic free SSL certificate.

---

## 🔄 Making Future Changes & Continuous Updates

Whenever you want to make any UI changes, styling tweaks, or new features:
1. Edit the files on your local machine.
2. Commit and push:
   ```bash
   git add .
   git commit -m "Update styling / features"
   git push
   ```
3. **Vercel and Render will automatically detect the push and re-deploy your site within 60 seconds.**
4. You can also make operational changes directly from the **Owner Dashboard** on the live site without touching code (update room rates, UPI QR code, property rules, direct phone contact numbers, etc.).
