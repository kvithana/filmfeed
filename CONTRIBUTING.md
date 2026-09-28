# Contributing

Thanks for looking at filmfeed. Issues and pull requests are welcome.

## Setup

```bash
npm install
npm test
npm run typecheck
```

`npm start` runs the Node server on port 3000. `npm run dev` runs the Cloudflare Workers dev server.

## What fits this project

- New sources that have a public feed or an official API.
- Clearer errors, tests, and docs.
- Deploy fixes for Cloudflare Workers, Vercel, or another free host.

## What does not

Do not add HTML scraping, Cloudflare challenge solving, or anything else that works around a site's published access rules. Letterboxd list pages are the example this project is deliberately not solving that way.

Keep changes small enough to review. Add or update a test when you change feed parsing or HTTP behavior.
