# 🚀 Render Deployment Guide

This repository is pre-configured to deploy on [Render](https://render.com) seamlessly. You can choose either **Option A (Recommended: All-in-One Service)** or **Option B (Two Separate Services)**.

---

## 🗄️ Step 0: Ensure You Have a Cloud MongoDB Database
Because Render services run in the cloud, they cannot access `mongodb://127.0.0.1:27017` on your local laptop.
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Go to **Database Access** → Add a Database User (e.g. `admin` and a password).
3. Go to **Network Access** → Add IP Address → Click **Allow Access from Anywhere (`0.0.0.0/0`)**.
4. In your Cluster view, click **Connect** → **Drivers** (Node.js) → Copy the connection string:
   ```text
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/internship?retryWrites=true&w=majority
   ```

---

## 🌟 Option A: All-in-One Fullstack Web Service (Recommended)
This deploys the React Frontend, Vanilla JS, and Express Backend together in **a single Render Web Service** (uses only 1 free service quota, zero CORS issues!).

1. Push your latest code to your GitHub repository:
   ```bash
   git add .
   git commit -m "chore: prepare for render deployment"
   git push -u origin main
   ```
2. Log in to [dashboard.render.com](https://dashboard.render.com/).
3. Click **New +** → **Web Service**.
4. Connect your GitHub repository.
5. Configure the service settings:
   * **Name**: `video-platform` (or any name you choose)
   * **Region**: Choose closest to you (e.g. `Oregon (US West)` or `Frankfurt (EU)`)
   * **Branch**: `main`
   * **Root Directory**: *(Leave empty / blank)*
   * **Runtime**: `Node`
   * **Build Command**: `npm run build`
   * **Start Command**: `npm run start`
   * **Instance Type**: `Free`
6. Scroll down to **Environment Variables** → Click **Add Environment Variable**:
   * **Key**: `NODE_ENV` | **Value**: `production`
   * **Key**: `MONGO_URI` | **Value**: `<Your MongoDB Atlas connection string from Step 0>`
7. Click **Deploy Web Service**!
8. When the deployment finishes, open your Render URL (e.g. `https://video-platform.onrender.com`):
   * `/` → Full React App Dashboard
   * `/vanilla` → Vanilla HTML/CSS/JS version
   * `/api/*` → Backend API endpoints

---

## ⚡ Option B: Two Separate Services (Static Site + Web Service)
If you prefer hosting the React frontend as a CDN Static Site and the Node server as a Web Service:

### Service 1: Backend API (Web Service)
1. In Render Dashboard, click **New +** → **Web Service**.
2. Connect your repository.
3. Settings:
   * **Name**: `video-platform-backend`
   * **Root Directory**: `backend`
   * **Build Command**: `npm install`
   * **Start Command**: `node server.js`
   * **Environment Variables**:
     * `NODE_ENV`: `production`
     * `MONGO_URI`: `<Your MongoDB Atlas connection string>`
4. Click **Deploy Web Service**.
5. Once deployed, copy your backend URL (e.g. `https://video-platform-backend.onrender.com`).

### Service 2: Frontend App (Static Site)
1. In Render Dashboard, click **New +** → **Static Site**.
2. Connect your repository.
3. Settings:
   * **Name**: `video-platform-frontend`
   * **Root Directory**: `frontend`
   * **Build Command**: `npm install && npm run build`
   * **Publish Directory**: `dist`
   * **Environment Variables**:
     * `VITE_API_URL`: `https://video-platform-backend.onrender.com/api`
     * `VITE_BACKEND_URL`: `https://video-platform-backend.onrender.com`
4. Under **Redirects/Rewrites**:
   * **Source**: `/*`
   * **Destination**: `/index.html`
   * **Action**: `Rewrite`
5. Click **Create Static Site**!

---

## 💡 Notes on Render Free Tier
* **Sleep Mode**: Free Render Web Services automatically spin down after 15 minutes of inactivity. When a new request arrives, it may take 30–50 seconds to wake up (cold start). Once awake, it runs normally.
* **Database Connection**: Always ensure MongoDB Atlas Network Access has `0.0.0.0/0` enabled so Render's cloud servers can connect to your database.
