# Verification and code review — 2026-09-28

## Status

Implementation tested locally. GitHub destination: `ghcastellano/treinoparaojoao` (private). **NOT deployed yet.** Vercel production and Neon provisioning are not yet verified. Production goal remains open.

## Automated checks executed

- ESLint: passed, zero errors/warnings.
- TypeScript: passed.
- Next.js production build: passed.
- 19 tests: passed.
- Content: 7 activities × 6 stages × 200 seeds = 8,400 generated questions checked for four distinct options and exactly one correct answer.
- Arithmetic answers recomputed independently in tests.
- Robot paths simulated independently: exactly one valid option reaches the target without obstacles/out-of-bounds moves.
- Classification rules checked independently for a single correct match.
- Variety: each activity/stage produces at least three variants.
- Session state: duplicate correct AND incorrect submissions; duplicate advance; help attribution; across-day progression; repeated items; difficulty adjustment; five-round end; time not used for ability scoring.
- Auth: signatures, roles, expiry, malformed cookies and invalid passwords.
- API handler integration: login -> start -> hint -> answer -> reread -> parent -> settings -> note -> export -> pause -> logout. Uses explicitly local QA storage, not Neon.
- Production dependency audit: 0 reported vulnerabilities at check time.

## Browser checks executed

Desktop browser:
- Home and seven activity cards render.
- Started arithmetic, answered addition and subtraction.
- Reloaded: resolved answer restored from server storage.
- Requested hint: hint appeared and answer recorded as supported.
- Completed five-round adventure and received off-screen suggestion.
- Parent panel showed one complete adventure, five explored tasks, four independent answers and one supported answer.

Responsive iframe viewports (CSS layout, not physical device emulation):
- 390 px phone: rendered and inspected screenshot; document clientWidth=390, scrollWidth=390.
- 768 px tablet: rendered and inspected screenshot; clientWidth=768, scrollWidth=768.
- 360 px compact phone: clientWidth=360, scrollWidth=360.

## Code-review corrections

- Fixed retry idempotency for wrong answers so a network retry does not consume another try.
- Replaced repetitive robot boards with generated boards, BFS-validated solutions and invalid distractors.
- Corrected same-origin verification for reverse-proxied requests while retaining CSRF enforcement.
- Development React requires eval; CSP permits it ONLY in development, not production.
- Added explicit accessible name to icon-only parent control on mobile.
- Pause modal has initial focus, Tab cycling, Escape close, and inert background.
- Server-only secrets and gabarito; parent reports require fresh parent cookie.
- Development auth/viewport helpers return 404 in production/Vercel.
- Leaving the parent panel through either navigation control clears the parent cookie.
- API requests time out after 15 seconds with a retry message; temporary DB failure is distinguished from missing configuration.
- No secret or QA history is included in git or the delivery archive.

## Remaining gates — do not report as passed

- Vercel production deployment, domain availability and automatic Git integration.
- Neon project, migration and real Postgres persistence/concurrency.
- Production authentication/cookies, runtime errors and data restore.
- Physical iPad/iPhone/Android audio, touch and orientation behavior.
- Observation with João; automated and adult testing cannot validate child usability or educational effectiveness.
