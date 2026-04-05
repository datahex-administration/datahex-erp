# Cloudflare Workers Deployment

This project is configured to deploy a full-stack Next.js app to Cloudflare Workers using OpenNext.

## What stays the same

- Database: MongoDB Atlas
- Auth: JWT + encrypted secrets
- Email: SMTP credentials from environment variables

## Prerequisites

1. Install dependencies.
2. Sign in to Cloudflare from this machine.

```bash
npx wrangler login
```

## Local preview on the Workers runtime

Use your existing local `.env.local` file, then run:

```bash
npm run preview
```

This validates the OpenNext build and runs the app in a local Cloudflare Worker preview.

## First deployment

Deploy to your free `*.workers.dev` subdomain:

```bash
npm run deploy
```

The worker name is currently configured as `data-hack-crp`.

## Runtime variables to set in Cloudflare

Set these values on the deployed Worker after the first deploy. Use the dashboard or `wrangler secret put`.

Required:

- `MONGODB_URI`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_APP_URL`

Optional:

- `WHATSAPP_API_URL`
- `WHATSAPP_API_SECRET`
- `WHATSAPP_ACCOUNT_ID`
- `WHATSAPP_ACCOUNT_PROVIDER`

Example CLI flow:

```bash
npx wrangler secret put MONGODB_URI
npx wrangler secret put JWT_SECRET
npx wrangler secret put ENCRYPTION_KEY
npx wrangler secret put SMTP_HOST
npx wrangler secret put SMTP_PORT
npx wrangler secret put SMTP_USER
npx wrangler secret put SMTP_PASS
npx wrangler secret put NEXT_PUBLIC_APP_NAME
npx wrangler secret put NEXT_PUBLIC_APP_URL
```

## SMTP note

Cloudflare Workers blocks SMTP port 25. Use TLS ports like 465 or 587. Your current SMTP setup should stay on one of those ports.

## Custom domain later

After the `workers.dev` deployment is working, add a custom domain from the Cloudflare Workers dashboard and set `NEXT_PUBLIC_APP_URL` to that final URL.

## Important runtime note

This project currently uses Mongoose and Nodemailer. Those are the two parts that need the most attention on Cloudflare Workers. Build success does not guarantee runtime success, so always smoke-test login, database reads, and sending mail immediately after deployment.