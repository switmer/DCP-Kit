#!/bin/bash
set -e

# DCP v3.0.0 - Smoke Test Suite
# Tests: Extract → Build → Serve → Install workflow

echo "🧪 DCP v3.0.0 Smoke Test Suite"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Cleanup function
cleanup() {
  echo ""
  echo "${YELLOW}🧹 Cleaning up...${NC}"
  pkill -f "dcp registry serve" || true
  rm -rf /tmp/dcp-smoke /tmp/dcp-app
  echo "${GREEN}✓ Cleanup complete${NC}"
}

trap cleanup EXIT

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

run_test() {
  local test_name="$1"
  local test_cmd="$2"
  
  TESTS_RUN=$((TESTS_RUN + 1))
  echo ""
  echo "${BLUE}▶ Test $TESTS_RUN: $test_name${NC}"
  
  if eval "$test_cmd"; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo "${GREEN}  ✓ PASS${NC}"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo "${RED}  ✗ FAIL${NC}"
    return 1
  fi
}

# ============================================
# TEST 1: Create Sample Project
# ============================================
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}Phase 1: Create Sample Project${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

run_test "Create test directory" "
  mkdir -p /tmp/dcp-smoke &&
  cd /tmp/dcp-smoke &&
  npm init -y > /dev/null 2>&1
"

run_test "Create sample Button component" "
  mkdir -p /tmp/dcp-smoke/src/components/ui &&
  cat > /tmp/dcp-smoke/src/components/ui/button.tsx << 'EOF'
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        outline: 'border border-input bg-background hover:bg-accent',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
EOF
"

run_test "Create sample Card component" "
  cat > /tmp/dcp-smoke/src/components/ui/card.tsx << 'EOF'
import * as React from 'react'

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={'rounded-lg border bg-card text-card-foreground shadow-sm'}
    {...props}
  />
))
Card.displayName = 'Card'

export { Card }
EOF
"

# ============================================
# TEST 2: Extract Components
# ============================================
echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}Phase 2: Extract Components${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

run_test "Extract components to registry" "
  cd /tmp/dcp-smoke &&
  npx dcp extract ./src/components/ui --out ./registry --json > /tmp/extract-result.json 2>&1 &&
  test -f ./registry/registry.json
"

run_test "Verify registry contains Button" "
  cd /tmp/dcp-smoke &&
  grep -q '\"name\".*\"Button\"' ./registry/registry.json
"

run_test "Verify Button has props" "
  cd /tmp/dcp-smoke &&
  test -f ./registry/components/Button.dcp.json &&
  grep -q '\"props\"' ./registry/components/Button.dcp.json
"

run_test "Verify Button has variants" "
  cd /tmp/dcp-smoke &&
  grep -q '\"variants\"' ./registry/components/Button.dcp.json
"

# ============================================
# TEST 3: Build Component Packs
# ============================================
echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}Phase 3: Build Component Packs${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

run_test "Build component packs" "
  cd /tmp/dcp-smoke &&
  npx dcp registry build-packs ./registry/registry.json \
    --out ./dist/packs \
    --namespace ui \
    --version 0.0.1 \
    --base-url http://localhost:7401 \
    --verbose 2>&1 | tee /tmp/build-output.log &&
  test -d ./dist/packs
"

run_test "Verify index.json exists" "
  test -f /tmp/dcp-smoke/dist/packs/index.json
"

run_test "Verify Button pack exists" "
  test -d /tmp/dcp-smoke/dist/packs/button &&
  test -f /tmp/dcp-smoke/dist/packs/button/meta.json
"

run_test "Verify blobs directory exists" "
  test -d /tmp/dcp-smoke/dist/packs/blobs &&
  ls /tmp/dcp-smoke/dist/packs/blobs/*.tsx > /dev/null 2>&1
"

# ============================================
# TEST 4: Serve Registry
# ============================================
echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}Phase 4: Serve Registry${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

run_test "Start registry server" "
  cd /tmp/dcp-smoke &&
  npx dcp registry serve ./dist/packs --port 7401 --verbose > /tmp/server.log 2>&1 &
  sleep 3 &&
  curl -f http://localhost:7401/health > /dev/null 2>&1
"

run_test "Verify /health endpoint" "
  curl -f http://localhost:7401/health | grep -q 'healthy'
"

run_test "Verify /index.json endpoint" "
  curl -f http://localhost:7401/index.json | grep -q 'button'
"

run_test "Verify component endpoint" "
  curl -f http://localhost:7401/r/ui/button | grep -q '\"name\".*\"button\"'
"

# ============================================
# TEST 5: Install Components (HTTP)
# ============================================
echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}Phase 5: Install Components (HTTP)${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

run_test "Create test app" "
  mkdir -p /tmp/dcp-app &&
  cd /tmp/dcp-app &&
  npm init -y > /dev/null 2>&1
"

run_test "Create components.json" "
  cd /tmp/dcp-app &&
  cat > components.json << 'EOF'
{
  \"aliases\": {
    \"components\": \"./src/components\"
  }
}
EOF
"

run_test "Install Button (dry-run)" "
  cd /tmp/dcp-app &&
  npx dcp registry add 'http://localhost:7401/r/ui/button' --dry-run --verbose 2>&1 | tee /tmp/install-dryrun.log &&
  grep -q 'Dry run' /tmp/install-dryrun.log
"

run_test "Install Button (actual)" "
  cd /tmp/dcp-app &&
  npx dcp registry add 'http://localhost:7401/r/ui/button' --verbose 2>&1 | tee /tmp/install-actual.log &&
  test -d ./src/components/button
"

run_test "Verify Button files installed" "
  cd /tmp/dcp-app &&
  test -f ./src/components/button/button.tsx &&
  grep -q 'Button' ./src/components/button/button.tsx
"

# ============================================
# TEST 6: Install Components (file://)
# ============================================
echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}Phase 6: Install Components (file://)${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

run_test "Install Card from file://" "
  cd /tmp/dcp-app &&
  rm -rf ./src/components/card &&
  npx dcp registry add 'file:///tmp/dcp-smoke/dist/packs/r/ui/card' --verbose 2>&1 | tee /tmp/install-file.log &&
  test -d ./src/components/card
"

run_test "Verify Card files installed" "
  cd /tmp/dcp-app &&
  test -f ./src/components/card/card.tsx &&
  grep -q 'Card' ./src/components/card/card.tsx
"

# ============================================
# TEST 7: Overwrite Policies
# ============================================
echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}Phase 7: Overwrite Policies${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

run_test "Overwrite with skip policy" "
  cd /tmp/dcp-app &&
  echo '// modified' >> ./src/components/button/button.tsx &&
  npx dcp registry add 'http://localhost:7401/r/ui/button' --overwrite skip --verbose 2>&1 | tee /tmp/install-skip.log &&
  grep -q '// modified' ./src/components/button/button.tsx
"

run_test "Overwrite with force policy" "
  cd /tmp/dcp-app &&
  echo '// modified again' >> ./src/components/button/button.tsx &&
  npx dcp registry add 'http://localhost:7401/r/ui/button' --overwrite force --verbose 2>&1 | tee /tmp/install-force.log &&
  ! grep -q '// modified again' ./src/components/button/button.tsx
"

# ============================================
# TEST 8: Registry Formats
# ============================================
echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}Phase 8: Registry Formats${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

run_test "Install with raw format" "
  cd /tmp/dcp-app &&
  rm -rf ./src/components/card &&
  npx dcp registry add 'http://localhost:7401/r/ui/card' --registry-format raw --target ./lib --verbose 2>&1 | tee /tmp/install-raw.log &&
  test -f ./lib/card.tsx
"

# ============================================
# SUMMARY
# ============================================
echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}Test Summary${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Tests run:    $TESTS_RUN"
echo "${GREEN}Tests passed: $TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
  echo "${RED}Tests failed: $TESTS_FAILED${NC}"
else
  echo "${GREEN}Tests failed: $TESTS_FAILED${NC}"
fi
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo "${GREEN}✓ ALL TESTS PASSED - Ready for v3.0.0!${NC}"
  echo "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. git add -A"
  echo "  2. git commit -m 'feat(v3.0.0): zero-fetch installer + critical MCP fixes'"
  echo "  3. git tag v3.0.0"
  echo "  4. git push origin main --tags"
  echo "  5. pnpm -r publish --no-git-checks"
  exit 0
else
  echo "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo "${RED}✗ SOME TESTS FAILED - Fix before release${NC}"
  echo "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "Check logs:"
  echo "  - /tmp/extract-result.json"
  echo "  - /tmp/build-output.log"
  echo "  - /tmp/server.log"
  echo "  - /tmp/install-*.log"
  exit 1
fi

