# CarRental

A production-style full-stack MERN application for car discovery, booking, and owner-side fleet management.

[![Client Build](https://github.com/HetPatel2111/CarRental/actions/workflows/client-build.yml/badge.svg)](https://github.com/HetPatel2111/CarRental/actions/workflows/client-build.yml)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](./LICENSE)
[![Frontend: React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Backend: Express](https://img.shields.io/badge/Backend-Express%205-000000?logo=express)](https://expressjs.com/)
[![Live Demo](https://img.shields.io/badge/Live-Demo-success?logo=vercel)](https://car-rental-lake-two.vercel.app/)

## Live Preview

- Public App URL: https://car-rental-lake-two.vercel.app/
- Share this link with recruiters/users for instant preview (no local setup needed)

## Recruiter Snapshot

- Full-stack architecture with separated `client` (React + Vite) and `server` (Express + MongoDB)
- Role-based flows for customers and owners
- Booking lifecycle support: availability check, booking creation, and status management
- Owner dashboard for inventory and booking operations
- Mobile responsive UI across customer and owner pages
- Deployed workflow with Vercel + GitHub integration

## Tech Stack

### Frontend
- React 19
- Vite 7
- Tailwind CSS 4
- React Router 7
- Axios
- Motion (Framer Motion API)

### Backend
- Node.js + Express 5
- MongoDB + Mongoose
- JWT authentication
- Multer (file uploads)
- ImageKit (media hosting)

### Deployment
- Vercel (client and server)
- GitHub for source control and CI

## Core Features

### User Side
- Register and login with JWT auth
- Browse all listed cars
- Search and filter available cars
- Check car availability by location and rental dates
- Book cars and view booking history

### Owner Side
- Switch to owner role
- Add, remove, and toggle car availability
- Manage incoming bookings and update booking status
- Track dashboard metrics (cars, bookings, revenue)
- Update owner profile image

## Project Structure

```text
CarRental/
  client/                 # React frontend
    src/
      components/
      pages/
      contex/
  server/                 # Express API
    controllers/
    routes/
    middleware/
    models/
    configs/
```

## Environment Variables

Copy example files and fill real values.

### Client (`client/.env`)

```env
VITE_BASE_URL=http://localhost:3000
VITE_CURRENCY=$
```

### Server (`server/.env`)

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_key
IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=your_imagekit_url_endpoint
```

## Local Setup

### 1) Clone

```bash
git clone https://github.com/HetPatel2111/CarRental.git
cd CarRental
```

### 2) Install dependencies

```bash
cd client && npm install
cd ../server && npm install
```

### 3) Start backend

```bash
cd server
npm run dev
```

### 4) Start frontend

```bash
cd client
npm run dev
```

## Available Scripts

### Client
- `npm run dev` - Start Vite dev server
- `npm run build` - Production build
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

### Server
- `npm run dev` - Start server with nodemon
- `npm start` - Start server in production mode

## API Surface (High-Level)

### User Routes
- `POST /api/user/register`
- `POST /api/user/login`
- `GET /api/user/data`
- `GET /api/user/cars`

### Owner Routes
- `POST /api/owner/change-role`
- `POST /api/owner/add-car`
- `GET /api/owner/cars`
- `POST /api/owner/toggle-car`
- `POST /api/owner/delete-car`
- `GET /api/owner/dashboard`
- `POST /api/owner/update-image`

### Booking Routes
- `POST /api/bookings/check-availability`
- `POST /api/bookings/create`
- `GET /api/bookings/user`
- `GET /api/bookings/owner`
- `POST /api/bookings/change-status`

## Quality Signals

- Clean component-level separation in frontend
- API organized by domain routes/controllers
- CI workflow for frontend build verification on push/PR
- Responsive design support for mobile, tablet, and desktop

## Roadmap

- Add automated tests (frontend + backend)
- Add role-based route guards on backend policy layer
- Add payment integration for online checkout
- Add booking cancellation policies and audit logs

## License

Licensed under the ISC License. See `LICENSE`.

## Author

Het Patel
