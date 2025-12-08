## Overview
- Unify scoring, points, and leaderboard updates across all games and quizzes.
- Remove or hide non-working/too-easy games; upgrade question banks and difficulty-based scoring.
- Ensure points update Supabase (`users.points`) and game history (`game_scores`), and show immediate user feedback.

## Current Findings
- Points are inconsistently updated: some games use `base44.auth.updateMe`, others use `awardPointsForGame` in `src/api/points.js`.
- Leaderboard reads Supabase users via `usersApi.list` in `src/api/firebase.js`; Base44-only point updates do not appear on the leaderboard.
- `awardPointsForGame` no-ops if `fallbackScore` is falsy, or if not signed in, leading to “nothing happens”.
- Examples:
  - Quizzes award points via `awardPointsForGame` (`src/pages/Quizzes.jsx:399–430`).
  - Layout auth source is Supabase (`src/pages/Layout.jsx:111–131`).

## Unified Points Service
- Extend `awardPointsForGame` to:
  - Require Supabase auth for real awards; otherwise prompt sign-in.
  - Always write to `users.points` and insert a row in `game_scores` with `{ user_id, game_type, points_awarded, perfect, at, metadata }`.
  - Support `idempotencyKey` to prevent duplicate awards on reload.
- Add a helper `reportGameResult(user, gameType, { score, isPerfect, metadata })` that wraps validation, points calculation, and persistence.

## Game Updates
- Standardize end-of-game handlers to call `reportGameResult` with non-zero `fallbackScore` and meaningful `metadata`.
- Replace Base44 point updates with the unified service to ensure leaderboard consistency.
- Add a lightweight UI result banner per game: “You earned X points! Total: Y” with a button to view the leaderboard.
- Ensure all games check auth early and degrade gracefully: playable for guests, but awards only after sign-in.

## Quiz And Questions Upgrade
- Use `AdminQuestions.jsx` and `AdminQuizManager.jsx` to seed advanced question banks with difficulty labels.
- Implement difficulty-based scoring multipliers (e.g., easy=5, medium=10, hard=15) applied by `reportGameResult`.
- Store question sets in Supabase tables or versioned JSON; load via React Query for reliability.

## Remove/Hide Non-Working Games
- Audit `src/components/games` and flag:
  - Non-functional (no completion or no scoring)
  - Too easy (below threshold)
- Update `Games` listing page to hide flagged entries; retain code behind a feature flag for future.
- Provide an admin toggle in `AdminGameSettings.jsx` for visibility and points per game.

## Leaderboard Consistency
- Ensure `usersApi.list` continues to source from Supabase and map `full_name` correctly.
- Confirm `MyPoints` reflects recent `game_scores` (`src/pages/MyPoints.jsx:11–45`).
- Show username and points on the leaderboard; if `full_name` is missing, fallback to email prefix.

## UX Enhancements
- Inline success banner after each game/quiz with points earned and next actions.
- Add a header badge for current total points and quick link to `MyRewards` and `Leaderboard`.

## Testing
- Unit tests: points calculations, `reportGameResult`, idempotency, validation.
- Integration tests: simulated game completion flows with Supabase mocked client.
- E2E tests: login → play game → see points → check leaderboard.
- Performance: load tests for `game_scores` inserts and leaderboard reads under concurrent awards.

## Data And Config
- Supabase: ensure `users` has `points` and `full_name`; ensure `game_scores` exists.
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` set; authorized domains configured.
- Observability: console warnings on guest awards, optional telemetry hooks.

## Rollout
- Feature flag the unified points service and new question banks.
- Dark launch on a subset of games, then roll out widely.

## Approval
- On approval, I will:
  - Implement `reportGameResult` and update `awardPointsForGame`.
  - Refactor all games/quizzes to call the unified service and add result banners.
  - Hide non-working/too-easy games from the `Games` page, with admin visibility controls.
  - Add tests and verify the leaderboard reflects points with usernames.