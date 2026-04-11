# CarRental

A production-style MERN application for car discovery, booking, and owner-side fleet management. This project includes customer authentication, owner workflows, booking validation, dashboard analytics, and deployment-ready structure.

[![Client Build](https://github.com/HetPatel2111/CarRental/actions/workflows/client-build.yml/badge.svg)](https://github.com/HetPatel2111/CarRental/actions/workflows/client-build.yml)
[![Live Demo](https://img.shields.io/badge/Live-Demo-success?logo=vercel)](https://car-rental-lake-two.vercel.app/)

## Live Preview

- Public App URL: https://car-rental-lake-two.vercel.app/

## Features

- User registration and login with JWT authentication
- Browse and filter available cars
- Search cars by location and travel dates
- Book cars with date validation and availability checks
- View booking history with status tracking
- Upgrade a user to owner and manage listed vehicles
- Owner dashboard with booking and revenue summaries
- Image uploads for cars and owner profile pictures using ImageKit

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, React Router, Axios
- Backend: Node.js, Express, MongoDB, Mongoose
- Authentication: JWT, bcrypt
- Media storage: ImageKit
- Deployment: Vercel + GitHub

## Project Structure

```text
CarRental/
├─ client/   # React frontend
├─ server/   # Express API
└─ README.md
```

## Environment Variables

Create these files before running the project:

- `client/.env`
- `server/.env`

Use the provided example files:

- `client/.env.example`
- `server/.env.example`

## Local Setup

### 1. Install dependencies

```bash
cd client
npm install
```

```bash
cd server
npm install
```

### 2. Start the backend

```bash
cd server
npm run dev
```

### 3. Start the frontend

```bash
cd client
npm run dev
```

## Important Pages

- `/` Landing page with search flow
- `/cars` Car listing and filtering page
- `/car-details/:id` Detailed booking page
- `/my-bookings` Customer booking history
- `/owner` Owner dashboard

## Improvements Added

- Cleaner React context structure
- Safer authentication handling
- File upload validation and size limits
- Better booking date validation and price calculation
- Professional empty states and loading states
- Improved route guarding for owner pages
- Cleaner README and environment setup

## Verification

- Frontend lint passes with `npm run lint`
- Frontend build passes with `npm run build`
- Backend request validation and route protection were tightened during refactor
