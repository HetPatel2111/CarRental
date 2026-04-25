# CarRental

A production-style MERN application for car discovery, booking, and owner-side fleet management. This project includes customer authentication, owner workflows, booking validation, dashboard analytics, and deployment-ready structure.

[![Client Build](https://github.com/HetPatel2111/CarRental/actions/workflows/client-build.yml/badge.svg)](https://github.com/HetPatel2111/CarRental/actions/workflows/client-build.yml)
[![Live Demo](https://img.shields.io/badge/Live-Demo-success?logo=vercel)](https://car-rental-lake-two.vercel.app/)

## Live Preview

- Public App URL: https://car-rental-lake-two.vercel.app/

## Features

- User registration and login with JWT authentication
- Browse and filter available cars
- Backend-powered advanced car search with optional MongoDB Atlas Search support
- Search cars by location and travel dates
- AI trip planner chatbot that turns natural-language requests into car suggestions and filters
- Only logged-in users can open protected features such as chatbot and booking history
- Book cars with date validation, availability checks, and payment options
- View booking history with status tracking
- Upgrade a user to owner and manage listed vehicles
- Owner dashboard with booking and revenue summaries
- Admin dashboard for pricing, coupons, settlements, and platform analytics
- In-memory caching for high-read endpoints
- Security hardening with Helmet and route-specific rate limiting
- Dedicated health and keep-alive system endpoints for monitoring and scheduled warm-up
- Image uploads for cars and owner profile pictures using ImageKit

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, React Router, Axios
- Backend: Node.js, Express, MongoDB, Mongoose
- Performance: In-memory cache layer, MongoDB indexes
- Authentication: JWT, bcrypt
- Media storage: ImageKit
- Payments: Razorpay
- Deployment: Vercel + GitHub Actions

## Project Structure

```text
CarRental/
├── .github/workflows/client-build.yml
├── client/   # React frontend
├── server/   # Express API
└── README.md
```

## Environment Variables

Create these files before running the project:

- `client/.env`
- `server/.env`

Use the provided example files:

- `client/.env.example`
- `server/.env.example`

Chatbot-specific server settings:

- `OPENAI_API_KEY` to enable AI responses
- `OPENAI_MODEL` optional, defaults to `gpt-5.4-mini`

Performance/search settings:

- `ENABLE_ATLAS_SEARCH=true` optional, enables MongoDB Atlas Search path
- `MONGODB_SEARCH_INDEX` optional, defaults to `cars_search`

Demo data maintenance:

- `npm run seed:demo` recreates the demo dataset
- `npm run update:demo-images` updates the Honda City 2023 and Toyota Innova Crysta image links in existing demo cars

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
- Helmet security headers and rate limiting for auth, booking, and chat routes
- In-memory cache layer for public car listing, search, owner dashboard, owner bookings, admin dashboard, settlements, and coupons
- MongoDB indexes for cars and bookings to improve query performance
- Public performance summary endpoint at `/api/user/performance-summary`
- Dedicated system routes at `/api/system/health`, `/api/system/keep-alive`, and `/api/system/performance-summary`
- Vercel cron-ready keep-alive endpoint that can warm the server every 30 minutes
- File upload validation and size limits
- Better booking date validation and price calculation
- Professional empty states and loading states
- Improved route guarding for owner pages
- AI chatbot flow for search, booking, and booking management


## Verification

- Frontend build passes with `npm run build`
- Backend route and chatbot controller syntax checks pass with `node --check`
- Backend request validation and route protection were tightened during refactor

## Placement Snapshot

- Role-based car rental platform with customer, owner, and admin workflows
- Advanced backend search with optional Atlas Search integration
- In-memory cache strategy for repeated high-read API responses
- Security-focused Express API using Helmet and rate limiting
- Dynamic pricing, coupon system, settlements, and analytics dashboards

## Resource Note

- Hosted Redis was planned for deployment-scale caching, but I did not use it in the final project because consistent free Redis resources were not available for reliable demo/deployment.
- The project keeps a lightweight in-memory cache so the performance optimization concept is still implemented and demonstrable locally.

## GitHub Actions

- `Client Build` runs automatically on pushes and pull requests to `main`.
- The status badge at the top of this README links to the workflow run details.
