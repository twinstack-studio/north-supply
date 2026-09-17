# NORTH SUPPLY

[![CI](https://github.com/twinstack-studio/north-supply/actions/workflows/ci.yml/badge.svg)](https://github.com/twinstack-studio/north-supply/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-f4511e.svg)](./LICENSE)
[![Live Demo](https://img.shields.io/badge/Live_Demo-Open_Store-f4511e.svg)](https://north-supply.onrender.com/)

A production-minded e-commerce experience for a modern streetwear brand. NORTH
SUPPLY combines a polished customer storefront with the operational tools a
retail team needs to manage products, orders, customers, promotions, and returns.

[**Open the live storefront**](https://north-supply.onrender.com/) ·
[**Work with TwinStack Studio**](mailto:hello.twinstackstudio@gmail.com)

![NORTH SUPPLY storefront](./assets/north-supply-homepage.png)

> **Portfolio demo:** Payments are simulated. No real card is charged, and the
> application stores only the card brand and last four digits.

## What the product delivers

### Customer experience

- Responsive catalogue with search, filters, sorting, pagination, and shareable URLs
- Product galleries, variants, live stock visibility, reviews, wishlist, and persistent cart
- Server-priced checkout with delivery options, promo codes, and saved addresses
- Account management, order history, guest tracking, returns, email OTP, and password reset

### Retail operations

- Admin dashboard for revenue, orders, customers, and inventory health
- Product and variant management with stock, visibility, and featured controls
- Order fulfilment, customer insights, promotion management, and return workflows

### Engineering highlights

- Server-authoritative pricing and transactional stock checks prevent cart tampering and overselling
- HTTP-only cookie authentication, rate-limited auth routes, and validated request payloads
- Responsive React interface backed by an Express and PostgreSQL API
- Automated unit tests and GitHub Actions CI for every push and pull request

## Demo access

Use the customer account shown on the sign-in screen:

- Email: `jordan@example.com`
- Password: `password123`

This account contains seeded, disposable demo data. Admin credentials are not
published. The live deployment currently accepts the customer credentials
without an email OTP.

## Technology

| Layer | Stack |
| --- | --- |
| Frontend | React 19, React Router 7, TypeScript, Vite, Tailwind CSS 4 |
| Backend | Node.js 20+, Express 5, TypeScript, Zod 4 |
| Data | PostgreSQL, transactional SQL |
| Authentication | JWT in HTTP-only cookies, bcrypt, optional email OTP and Google sign-in |
| Quality | Node test runner, TypeScript builds, GitHub Actions, Dependabot |

## Run locally

Requirements: Node.js 20+ and PostgreSQL.

```bash
git clone https://github.com/twinstack-studio/north-supply.git
cd north-supply
npm install
cp server/.env.example server/.env
sudo -u postgres psql -f scripts/setup-db.sql
npm run db:migrate
npm run db:seed
npm run dev
```

| Service | URL |
| --- | --- |
| Storefront | http://localhost:5173 |
| API | http://localhost:4000 |
| Health check | http://localhost:4000/api/health |

## Useful commands

```bash
npm run dev          # Start the API and storefront in watch mode
npm test             # Run automated unit tests
npm run build        # Type-check and build both workspaces
npm run db:migrate   # Recreate the demo database schema (destructive)
npm run db:seed      # Load the demo catalogue and accounts
```

Configuration is documented in [`server/.env.example`](./server/.env.example).
Production deployments must use private values for `DATABASE_URL`, `JWT_SECRET`,
`ADMIN_PASSWORD`, and any SMTP or Google credentials.

## Production note

This repository is a portfolio-grade demo. Before handling real customers or
payments, integrate a payment provider and webhooks, use incremental database
migrations, move product media to an owned CDN, configure transactional email,
and extend rate limiting to checkout and user-generated content.

## Built by TwinStack Studio

TwinStack Studio builds full-stack websites, web applications, dashboards,
portals, automation, and AI-powered products.

[GitHub](https://github.com/twinstack-studio) ·
[Website](https://twinstackstudio.com) ·
[Email](mailto:hello.twinstackstudio@gmail.com)

Licensed under the [MIT License](./LICENSE).
