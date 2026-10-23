# C++ Quiz (verified on Compiler Explorer)

Pick a C++ standard (C++98, 11, 14, 26 are enabled; 17/20/23 are written but switched off in `lib/standards.js`)
and the site keeps generating random questions. Each one is compiled and run on godbolt.org with
`-std=... -pedantic-errors`; only questions whose real result matches the expected answer are shown.

No npm dependencies. Run locally: `node server.js` (needs internet access to godbolt.org).

## Deploy on Render
1. Push this folder to a GitHub repo.
2. Render dashboard -> New -> Blueprint -> select the repo (reads `render.yaml`), or New -> Web Service with
   Build Command `echo ok`, Start Command `node server.js`.
3. URL will be `https://<service-name>.onrender.com`. Free instances sleep when idle (first load ~30s).

Optional env vars: `COMPILER_ID`, `POOL_TARGET`, `GODBOLT_CONCURRENCY`.
Offline template test: `VERIFY_BACKEND=local node test/validate-templates.js 5`.
