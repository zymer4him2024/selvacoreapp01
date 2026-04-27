#!/usr/bin/env bash
# Phase 4.5 verification runner.
#
# Runs the four gates that must pass before shipping Phase 4.5:
#   1. Lint (eslint .)
#   2. Phase 4.5 focused tests — reviewService + reviewAdminService
#   3. Full unit test suite — vitest run
#   4. Production build — next build
#
# Exits non-zero on the first failure. Each step is announced so you can
# see which gate failed in CI-style output.

set -u

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
BOLD=$'\033[1m'
RESET=$'\033[0m'

step() { printf '\n%s==> %s%s\n' "$BOLD" "$1" "$RESET"; }
ok()   { printf '%s  PASS%s %s\n' "$GREEN" "$RESET" "$1"; }
fail() { printf '%s  FAIL%s %s\n' "$RED" "$RESET" "$1"; exit 1; }
warn() { printf '%s  WARN%s %s\n' "$YELLOW" "$RESET" "$1"; }

# ------------------------------------------------------------------
# 1. Lint
# ------------------------------------------------------------------
step "1/4 Lint"
if npm run lint --silent; then
  ok "eslint clean"
else
  fail "eslint reported errors"
fi

# ------------------------------------------------------------------
# 2. Phase 4.5 focused tests
# ------------------------------------------------------------------
step "2/4 Phase 4.5 focused tests (reviewService + reviewAdminService)"
if npx vitest run \
    lib/services/__tests__/reviewService.test.ts \
    lib/services/__tests__/reviewAdminService.test.ts; then
  ok "Phase 4.5 unit tests pass"
else
  fail "Phase 4.5 unit tests failed"
fi

# ------------------------------------------------------------------
# 3. Full unit test suite
# ------------------------------------------------------------------
step "3/4 Full unit test suite (npm test)"
if npm test; then
  ok "unit tests pass"
else
  fail "unit tests failed"
fi

# ------------------------------------------------------------------
# 4. Production build
# ------------------------------------------------------------------
step "4/4 Production build (npm run build)"
if npm run build --silent > /tmp/phase-4-5-build.log 2>&1; then
  # Verify the /admin/reviews route made it into the build manifest.
  if grep -q '/admin/reviews' /tmp/phase-4-5-build.log; then
    ok "next build succeeded and /admin/reviews is registered"
  else
    warn "build succeeded but /admin/reviews route not found in build log"
    ok "next build succeeded"
  fi
else
  tail -n 30 /tmp/phase-4-5-build.log
  fail "next build failed — see /tmp/phase-4-5-build.log"
fi

printf '\n%s%sAll gates passed.%s\n' "$BOLD" "$GREEN" "$RESET"
