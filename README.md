# Football Match

Futsal (extensible to 11-a-side) court booking web application.

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Express.js + TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** JWT (HttpOnly cookies), email/password

## Structure
```
client/   # React frontend
server/   # Express backend + Prisma schema
```

## Getting Started

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL

### 2. Backend
```bash
cd server
cp .env.example .env   # configure DATABASE_URL, JWT_SECRET, PORT
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

### 3. Frontend
```bash
cd client
npm install
npm run dev
```

## Roles
- **PLAYER** — find friends, join/create teams, book courts
- **OWNER** — manage courts, slots, bookings, events
- **ADMIN** — platform moderation (future)