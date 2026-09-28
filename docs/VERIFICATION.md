# Verification and code review — 2026-09-28

## Status

Deployed to **https://treinoparaojoao.vercel.app**. GitHub: `ghcastellano/treinoparaojoao` (private), production branch `main`, automatic Vercel Git deployment verified. The owner explicitly requested passwordless entry on 2026-09-28: activities and the parent dashboard are accessible to anyone with the link. Signed session cookies remain flow controls, not private access control.

## Automated checks executed

- ESLint: passed, zero errors/warnings.
- TypeScript: passed.
- Next.js production build: passed.
- 18 tests: passed after removing the obsolete password validation test and updating the API integration test for passwordless sessions.
- Content: 7 activities × 6 stages × 200 seeds = 8,400 generated questions checked for four distinct options and exactly one correct answer.
- Arithmetic answers recomputed independently in tests.
- Robot paths simulated independently: exactly one valid option reaches the target without obstacles/out-of-bounds moves.
- Classification rules checked independently for a single correct match.
- Variety: each activity/stage produces at least three variants.
- Session state: duplicate correct AND incorrect submissions; duplicate advance; help attribution; across-day progression; repeated items; difficulty adjustment; five-round end; time not used for ability scoring.
- Sessions: signatures, roles, expiry and malformed cookies.
- API handler integration: passwordless session -> start -> hint -> answer -> reread -> parent session -> settings -> note -> export -> pause -> logout. This automated suite uses local QA storage; separate real Neon/production checks are recorded below.
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
- Server-only secrets and gabarito; parent reports require a parent cookie, now opened without a password through the Responsáveis button.
- Development auth/viewport helpers return 404 in production/Vercel.
- Leaving the parent panel through either navigation control clears the parent cookie.
- API requests time out after 15 seconds with a retry message; temporary DB failure is distinguished from missing configuration.
- No secret or QA history is included in git or the delivery archive.

## Production infrastructure and verification — 2026-09-28

- Vercel project `treinoparaojoao`, team `gustavo-s`, Next.js, Node 24, functions in `gru1`. Production domain assigned and deployment Ready.
- Pushing passwordless commit `c9c921f` to `main` automatically built and promoted Git deployment `dpl_2F8GJFPhrLrvdLLXs7eyQbhFDL7D`; Git integration is operational.
- Dedicated Neon project `calm-dawn-40336600`, region `aws-sa-east-1`. Production branch `main`; isolated branch `preview` with distinct session secret and `HOUSEHOLD_ID=preview`.
- Versioned migration applied to both branches using direct URLs. Runtime uses pooled URLs; local fallback disabled. Database credentials and session secrets are encrypted in Vercel and ignored by Git locally. `FAMILY_PASSWORD` removed from both environments.
- Public `/api/health` returns `ready: true`, `storage: neon`. `/dev-preview` and `/dev-qa` both return 404.
- Fresh browser enters without a password and displays all seven activities. Started arithmetic, requested a hint, answered and reloaded; answer/hint persisted in Neon and were restored in the browser.
- A second independent browser context at 390px entered without a password and restored the same adventure and answer. This is browser emulation, not a physical phone test.
- Completed five rounds; Neon and parent dashboard agreed on one completed adventure, five answers, four independent and one supported.
- Opened parent dashboard without a password, changed duration, saved a technical note and downloaded the JSON export. Export matched persisted attempts and note. Leaving the dashboard cleared parent access from that browser session.
- Actual production cookies use HttpOnly, Secure and SameSite=Strict. Invalid origins and expired sessions are rejected. Anyone can create a new session without a password, intentionally.
- Four parallel writes against an isolated production-database QA household persisted without lost updates. Production API duplicate wrong answers, correct answers and advances were also exercised concurrently; attempts and rounds were not duplicated. Adult help and pause persisted.
- Technical QA rows/history were backed up locally and cleaned with a version-checked update only after verifying their IDs/counts. No pre-existing family history existed. Production starts with empty history and default settings.
- Error-level Vercel log query returned no entries during verification. This is a point-in-time check, not continuous monitoring or a restore-drill guarantee.
- Browser inspection found narrow skill-stage columns in the parent panel at 390px; mobile skill rows now use two grid columns with stage/track below the activity description.
- Private local evidence (screenshots, JSON export, QA scripts) is under `.vercel/`, excluded from Git and deployment uploads.

## Remaining checks — do not report as passed

- Physical cross-device testing; automated second-browser restoration does not prove behavior on real hardware.
- Physical iPad/iPhone/Android audio, touch and orientation behavior.
- Observation with João; automated and adult testing cannot validate child usability or educational effectiveness.
- Disaster recovery/point-in-time restore drill and continuous production monitoring.
