## Data Hack CRP

This repository contains a multi-tenant ERP application built with Next.js 16, React 19, MongoDB, and a custom PIN-based authentication flow.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Main Scripts

- `npm run dev` starts local Next.js development.
- `npm run build` runs the standard Next.js production build.
- `npm run preview` builds the app for Cloudflare Workers and runs a local Worker preview.
- `npm run deploy` builds and deploys the app to Cloudflare Workers.

## Cloudflare Workers

The project is prepared for Cloudflare Workers deployment through OpenNext.

Deployment notes and the exact CLI steps are documented in [docs/cloudflare-workers.md](docs/cloudflare-workers.md).

## Notes

- MongoDB remains the current database.
- SMTP email remains enabled through environment variables.
- WhatsApp configuration is optional and can be added later.

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
