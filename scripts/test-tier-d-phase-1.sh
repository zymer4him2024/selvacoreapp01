#!/usr/bin/env bash
# Tier D Phase 1 verification runner.
#
# Verifies the technician portal i18n migration:
#   1. Locale symmetry — t.technician.{layout,dashboard,jobsList} present in
#      en/pt/es/ko (tsc enforces shape, but we also grep so missing top-level
#      blocks fail loudly with a readable message).
#   2. No regressed hardcoded strings — the 3 migrated files should not
#      reintroduce raw English in the patterns we converted.
#   3. tsc --noEmit, lint, unit tests, production build.

set -u

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
BOLD=$'\033[1m'
RESET=$'\033[0m'

step() { printf '\n%s==> %s%s\n' "$BOLD" "$1" "$RESET"; }
ok()   { printf '%s  PASS%s %s\n' "$GREEN" "$RESET" "$1"; }
fail() { printf '%s  FAIL%s %s\n' "$RED" "$RESET" "$1"; exit 1; }

# ------------------------------------------------------------------
# 1. Locale symmetry — every locale must expose the 3 new namespaces
# ------------------------------------------------------------------
step "1/6 Locale symmetry (layout / dashboard / jobsList in all 4 locales)"
for locale in en pt es ko; do
  for ns in layout dashboard jobsList; do
    if ! grep -q "^    ${ns}:" "lib/translations/${locale}.ts"; then
      fail "lib/translations/${locale}.ts missing technician.${ns}"
    fi
  done
done
ok "all 4 locales expose technician.{layout,dashboard,jobsList}"

# ------------------------------------------------------------------
# 2. No regressed hardcoded strings in the 3 migrated files
# ------------------------------------------------------------------
step "2/6 Migrated files free of known hardcoded English"
declare -a forbidden=(
  "components/technician/TechnicianLayoutClient.tsx:Technician Portal"
  "components/technician/TechnicianLayoutClient.tsx:Available Jobs"
  "app/technician/page.tsx:Welcome back,"
  "app/technician/page.tsx:Loading your dashboard"
  "app/technician/jobs/page.tsx:My Jobs"
  "app/technician/jobs/page.tsx:Loading your jobs"
  "app/technician/jobs/page.tsx:View Details"
)
for entry in "${forbidden[@]}"; do
  file="${entry%%:*}"
  needle="${entry#*:}"
  if grep -Fq "$needle" "$file"; then
    fail "$file still contains hardcoded \"$needle\""
  fi
done
ok "no known hardcoded strings remain"

# ------------------------------------------------------------------
# 3. TypeScript — TranslationKeys = typeof en enforces locale shape
# ------------------------------------------------------------------
step "3/6 TypeScript (npx tsc --noEmit)"
if npx tsc --noEmit; then
  ok "tsc clean"
else
  fail "tsc reported errors"
fi

# ------------------------------------------------------------------
# 4. Lint
# ------------------------------------------------------------------
step "4/6 Lint (npm run lint)"
if npm run lint --silent; then
  ok "eslint clean"
else
  fail "eslint reported errors"
fi

# ------------------------------------------------------------------
# 5. Unit tests
# ------------------------------------------------------------------
step "5/6 Unit tests (npm test)"
if npm test --silent; then
  ok "unit tests pass"
else
  fail "unit tests failed"
fi

# ------------------------------------------------------------------
# 6. Production build
# ------------------------------------------------------------------
step "6/6 Production build (npm run build)"
if npm run build --silent > /tmp/tier-d-phase-1-build.log 2>&1; then
  if grep -q '/technician/jobs' /tmp/tier-d-phase-1-build.log; then
    ok "next build succeeded; /technician/jobs registered"
  else
    fail "build ran but /technician/jobs not in build manifest"
  fi
else
  tail -n 30 /tmp/tier-d-phase-1-build.log
  fail "next build failed — see /tmp/tier-d-phase-1-build.log"
fi

printf '\n%s%sAll Tier D Phase 1 gates passed.%s\n' "$BOLD" "$GREEN" "$RESET"
