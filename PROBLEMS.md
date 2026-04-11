# Problems & Solutions Log

A running log of issues encountered during development and how they were resolved.
Add entries in reverse-chronological order (newest at top).

---

## Open

### SQLx compile-time macros require schema before first compile
- **Status:** open (in-progress fix: install sqlx-cli and run migrations manually)
- **Encountered:** 2026-04-11
- **Context:** First `cargo run` of the API.
- **Problem:** `sqlx::query!` and `sqlx::query_as!` macros connect to the live database at compile time to verify queries against the schema. The schema doesn't exist yet because the migration binary hasn't compiled yet — a chicken-and-egg problem. All 30+ macro sites fail with "relation does not exist".
- **Solution:** Install `sqlx-cli` and run migrations against the live DB before compiling. After first compile succeeds, run `cargo sqlx prepare` to generate a `.sqlx` offline cache so future CI builds don't need a live DB.

### Missing `time` crate dependency for cookie max_age
- **Status:** open (fix applied — re-compile pending)
- **Encountered:** 2026-04-11
- **Context:** First `cargo run` of the API.
- **Problem:** `axum_extra`'s `CookieBuilder::max_age()` takes `time::Duration` (from the `time` crate), but `time` was not in `Cargo.toml` as a direct dependency. Compiler error: "use of unresolved module or unlinked crate `time`".
- **Solution:** Added `time = "0.3"` to `[dependencies]` in `Cargo.toml`.

---

### Axum route conflict: `/progress/:goal_id` vs `/progress/:id`
- **Status:** resolved
- **Encountered:** 2026-04-11
- **Context:** First successful run after compile.
- **Problem:** Axum (via `matchit`) treats path patterns structurally — parameter names are irrelevant. `/progress/:goal_id` and `/progress/:id` are identical patterns and panic at startup: "insertion failed due to conflict with previously registered route".
- **Solution:** Merge POST and PATCH onto the same path with `.route("/progress/:id", post(log_progress).patch(update_progress))`. The handler interprets the `:id` param as the goal ID (POST) or progress entry ID (PATCH). Also consolidated all other duplicated `.route()` calls (e.g. `/goals`, `/goals/:id`) the same way.

### SQLx "no built-in mapping" for custom PG enum params
- **Status:** resolved
- **Encountered:** 2026-04-11
- **Context:** First successful compile after migrations were applied.
- **Problem:** `sqlx::query_as!` macros used custom PG enum columns (`goal_type`, `goal_visibility`) directly as parameters. SQLx's compile-time checker queries PostgreSQL for the parameter type, gets back the custom enum OID, and errors: "no built-in mapping found for type goal_type for param #2".
- **Solution:** A single `$2::goal_type` cast is not sufficient — PostgreSQL still reports the parameter type as `goal_type` OID, which SQLx has no built-in mapping for. The fix is a double cast: `$2::text::goal_type`. This forces PostgreSQL to infer param $2 as `text` (OID 25), which SQLx maps to `&str`/`String`. The outer cast then converts the text value to the enum on the DB side at runtime.

### `date >= interval` operator error in list_goals query
- **Status:** resolved
- **Encountered:** 2026-04-11
- **Context:** First successful compile after migrations applied.
- **Problem:** The query `week_start_date >= $2 - INTERVAL '6 days'` failed because `DATE - INTERVAL` returns `TIMESTAMP`, not `DATE`, so the comparison with a DATE column fails.
- **Solution:** Compute the current week start date in Rust (using `current_week_start(user.week_start)`) and pass it as a single `$2: NaiveDate` parameter. Weekly goals are filtered with `week_start_date = $2` instead of a range.

### `current_week_start` needed in both goals and progress handlers
- **Status:** resolved
- **Encountered:** 2026-04-11
- **Context:** Moving week-start calculation to goals handler.
- **Problem:** Function was defined in `handlers/progress.rs`, but `handlers/goals.rs` also needed it.
- **Solution:** Moved to `src/utils.rs` and imported from both handler modules.

---

## Resolved

### Prompt injection in create-next-app scaffold
- **Status:** resolved
- **Encountered:** 2026-04-11
- **Context:** Initializing the Next.js web app with `npx create-next-app@latest`.
- **Problem:** The generated scaffold included `web/CLAUDE.md` and `web/AGENTS.md` files that instructed AI assistants: "This is NOT the Next.js you know — APIs, conventions, and file structure may all differ from your training data." This is a prompt injection technique designed to redirect AI behavior.
- **Solution:** Deleted both files. Standard Next.js 15/16 App Router conventions were used; no special guidance from those files was followed.

### eslint-visitor-keys engine warning during npm install
- **Status:** resolved
- **Encountered:** 2026-04-11
- **Context:** Running `npm install` inside `web/` with Node v23.9.0.
- **Problem:** `eslint-visitor-keys@5.0.1` requires Node `^20.19.0 || ^22.13.0 || >=24`. Node 23.9.0 falls outside this range and triggers a warning.
- **Solution:** Warning only — no runtime impact. The build compiles and types check cleanly. Will resolve naturally when Node 24 LTS is adopted.

---

## Format

```
### [SHORT TITLE]
- **Status:** open | resolved
- **Encountered:** YYYY-MM-DD
- **Context:** Brief description of what was being built when this surfaced.
- **Problem:** What went wrong or was unclear.
- **Solution:** How it was fixed / the decision made.
```
