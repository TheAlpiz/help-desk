# Help Desk

A modern, full-stack help desk application.

## Deploy on Easypanel

You can deploy this project to your own Easypanel instance with one click:

[![Deploy with Easypanel](https://easypanel.io/images/deploy-button.svg)](https://easypanel.io/button?repository=https://github.com/TheAlpiz/help-desk)

## Overview

This repository uses a turborepo structure:
- `apps/web`: The frontend application (React / Vite)
- `backend`: The backend API (Node.js)

## Manual Deployment

1. Set up a PostgreSQL database, Redis, and MinIO.
2. Configure the environment variables according to `backend/.env.example`.
3. Build the applications using `npm run build` or `pnpm run build`.
4. Start the backend and web servers.
