# Critical Mass Training Program Tracker

A mobile-friendly web app for tracking the Critical Mass Training Program by Justin Harris / Troponin Nutrition.

## Features

- **9-day rotating cycle tracking** - Automatically tracks your position in the program
- **PR sets highlighted** - Red indicators for sets where you should be chasing PRs
- **Previous performance reference** - See your last workout's numbers when logging new sessions
- **Exercise variations** - Dropdown selectors for exercises with multiple options
- **Session notes** - Add notes for each workout
- **Cross-device sync** - Access your data from any device via unique session link

## Deployment to Vercel

### 1. Create Vercel KV Store

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on "Storage" in the top navigation
3. Click "Create Database" → Select "KV"
4. Name it something like `critical-mass-data`
5. Select your preferred region
6. Click "Create"

### 2. Deploy the App

**Option A: Deploy via GitHub**

1. Push this code to a GitHub repository
2. Go to [Vercel](https://vercel.com/new)
3. Import your GitHub repository
4. Vercel will auto-detect it's a Next.js app
5. In the "Environment Variables" section, click "Add from Vercel KV"
6. Select your KV store - it will auto-populate the env vars
7. Click "Deploy"

**Option B: Deploy via Vercel CLI**

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (from the project directory)
vercel

# Link your KV store
vercel link
vercel env pull
```

### 3. Connect KV Store to Project

If you deployed before creating the KV store:

1. Go to your project in Vercel Dashboard
2. Click "Storage" tab
3. Click "Connect Store"
4. Select your KV store
5. Redeploy the project

## Usage

1. Open the deployed URL on your phone
2. The app will generate a unique session ID in the URL (e.g., `?session=cm_abc123xyz`)
3. **Bookmark this URL** - it's your unique link to access your data
4. Share the same URL between devices to sync your data

## Program Structure

The Critical Mass program is a 9-day rotating cycle:

| Day | Workout | Focus |
|-----|---------|-------|
| 1 | Push 1 | Chest/Side Delt Hypertrophy, Front Delt/Triceps PR |
| 2 | Legs 1 | Quads/Calves Hypertrophy, Hams/Adductors/Glutes PR |
| 3 | Rest | Recovery |
| 4 | Pull 1 | Lats/Rear Delts/Biceps Hypertrophy, Mid/Lower Back/Traps PR |
| 5 | Push 2 | Delt/Triceps Hypertrophy, Chest PR |
| 6 | Rest | Recovery |
| 7 | Legs 2 | Hams/Adductors/Glutes/Calves Hypertrophy, Quads PR |
| 8 | Pull 2 | Mid/Lower Back/Traps Hypertrophy, Lats/Rear Delts/Biceps PR |
| 9 | Rest | Recovery |

**Red PR Sets** = Primary goal is progressive overload, hit new PRs
**Black Sets** = Focus on pump, blood flow, time under tension

## Local Development

```bash
# Install dependencies
npm install

# Create .env.local with your Vercel KV credentials
cp .env.example .env.local
# Then fill in your KV credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- Next.js 14 (App Router)
- Vercel KV (Redis-based storage)
- React 18
- CSS (no external UI libraries for minimal bundle size)

## Credits

Training program by Justin Harris / Troponin Nutrition
