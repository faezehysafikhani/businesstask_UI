# businesstask UI

React 19 + TypeScript + Vite + Tailwind 4 (RTL). Backend: `businesstask_API` (host on NexusCore). Plan: `docs/FRONTEND-PLAN.md`.

```bash
npm install
npm run dev      # http://localhost:5173 ; /api is proxied to HOST_URL (default http://localhost:5252)
npm run build
```
Production: set `VITE_API_URL` at build time and add the UI origin to `Cors:AllowedOrigins` in the host.
