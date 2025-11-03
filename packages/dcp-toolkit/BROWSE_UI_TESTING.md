# Browse UI Testing Checklist

## Quick Test (5 minutes)

```bash
# 1. Build a test registry
cd /tmp && mkdir dcp-test && cd dcp-test
mkdir -p src/components
echo 'export const Button = () => <button>Click</button>' > src/components/Button.tsx
echo 'export const Card = () => <div>Card</div>' > src/components/Card.tsx

# 2. Extract & build packs
npx dcp extract ./src/components --out ./registry
npx dcp registry build-packs ./registry/registry.json --out ./dist/packs --base-url http://localhost:7401

# 3. Serve and test
npx dcp registry serve ./dist/packs --port 7401

# 4. Open http://localhost:7401 in your browser
```

## Cross-Browser Testing Matrix

### Desktop Browsers

#### Chrome/Edge (Chromium)
- [ ] Page loads without errors
- [ ] Search filters cards correctly
- [ ] Facet chips toggle on/off
- [ ] Modal opens on card click
- [ ] Copy buttons work (install command, share link, AI prompt)
- [ ] Toast notifications appear
- [ ] PM switcher tabs work
- [ ] Deep links work (`#ui/button`)
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Responsive grid (resize window)

#### Firefox
- [ ] Page loads without errors
- [ ] Clipboard API works or fallback execCommand works
- [ ] CSS Grid layout renders correctly
- [ ] Modal backdrop blur works
- [ ] All interactive elements functional

#### Safari (macOS)
- [ ] Page loads without errors
- [ ] Clipboard permission prompt appears
- [ ] Modal dialog works correctly
- [ ] Touch targets are 44px minimum
- [ ] All fonts and icons load

### Mobile Browsers

#### iOS Safari
- [ ] Page loads and is responsive
- [ ] Touch targets ≥ 44px
- [ ] Clipboard works (may need user gesture)
- [ ] Modal scrolls correctly
- [ ] Search input works with iOS keyboard
- [ ] Facet chips are tappable
- [ ] No horizontal scroll issues

#### Chrome Android
- [ ] Page loads and is responsive
- [ ] All interactive elements work
- [ ] Clipboard API works
- [ ] Modal is full-screen friendly
- [ ] Search input works with Android keyboard

## Feature Testing

### Search & Filter
- [ ] Search by component name
- [ ] Search by description
- [ ] Debouncing works (300ms delay)
- [ ] Result count updates
- [ ] Empty state shows when no results
- [ ] Clear filters button works

### Facet Filters
- [ ] Namespace chips render
- [ ] Type chips render
- [ ] Category chips render (if present)
- [ ] Chips show count badges
- [ ] Active state toggles
- [ ] Multiple filters work together
- [ ] Filters combine with search

### Component Modal
- [ ] Opens on card click
- [ ] Shows component name and description
- [ ] PM switcher works (npm/pnpm/yarn/bun)
- [ ] Install command updates when PM changes
- [ ] Copy install command works
- [ ] Copy share link works
- [ ] Copy AI prompt works
- [ ] Props table renders correctly
- [ ] Dependencies list shows (if present)
- [ ] Close button works
- [ ] Escape key closes modal
- [ ] Click outside closes modal

### Deep Linking
- [ ] `#ui/button` opens Button modal
- [ ] Invalid hash shows 404 modal
- [ ] 404 modal has search fallback
- [ ] Hash updates when modal opens
- [ ] Hash clears when modal closes
- [ ] Back button works with hash navigation

### Staleness Badge
- [ ] Shows "fresh" for recent registries (< 7 days)
- [ ] Shows "warning" for old registries (> 7 days)
- [ ] Displays correct day count
- [ ] "How to update" link works

### Accessibility
- [ ] All interactive elements are keyboard accessible
- [ ] Tab order is logical
- [ ] Focus visible on all elements
- [ ] Modal traps focus
- [ ] Focus returns to card after modal close
- [ ] Screen reader announcements work (search results)
- [ ] ARIA labels present
- [ ] Color contrast meets WCAG AA
- [ ] Touch targets ≥ 44px

### Performance
- [ ] Initial load < 1s (Lighthouse)
- [ ] Search debounce prevents lag
- [ ] Modal opens instantly
- [ ] No memory leaks (open/close modal 50x)
- [ ] Handles 100+ components smoothly

### Error Handling
- [ ] Missing index.json shows error state
- [ ] 404 on component fetch shows 404 modal
- [ ] Malformed JSON shows error
- [ ] Clipboard permission denied shows fallback
- [ ] Network errors show toast

## Edge Cases

### Data Variations
- [ ] Components with no props
- [ ] Components with no description
- [ ] Components with no namespace (defaults to 'ui')
- [ ] Components with no type (defaults to 'component')
- [ ] Empty registry (0 components)
- [ ] Large registry (100+ components)
- [ ] Multi-namespace registry
- [ ] Components with special characters in names

### Browser Quirks
- [ ] Safari clipboard permissions
- [ ] Firefox dialog backdrop
- [ ] Chrome autofill in search
- [ ] Mobile keyboard covering search
- [ ] iOS Safari bottom bar
- [ ] Android back button behavior

## Security Testing
- [ ] XSS prevention (try `<script>alert(1)</script>` in search)
- [ ] HTML escaping in component names
- [ ] HTML escaping in descriptions
- [ ] CSP headers present
- [ ] No inline scripts (except Tailwind CDN)

## Lighthouse Audit Targets
- [ ] Performance: 90+
- [ ] Accessibility: 95+
- [ ] Best Practices: 90+
- [ ] SEO: 80+

## Known Limitations (Document These)
1. **Clipboard API**: Requires HTTPS in production (localhost works)
2. **Safari**: May prompt for clipboard permission on first copy
3. **Thumbnails**: Not yet implemented (v3.2.0)
4. **Live Previews**: Not yet implemented (v3.4.0)
5. **Telemetry**: Console-only, opt-in via `?telemetry` query param

## Quick Smoke Test Script

```bash
# Run this to validate basic functionality
cd /tmp/dcp-test

# Test 1: Search
# Open http://localhost:7401
# Type "button" in search → should filter to Button only

# Test 2: Modal
# Click Button card → modal should open
# Press Escape → modal should close

# Test 3: Copy
# Open modal → click "Copy Install Command"
# Should see toast "Install command copied!"

# Test 4: Deep Link
# Navigate to http://localhost:7401#ui/button
# Modal should auto-open for Button

# Test 5: Facets
# Click namespace chip → should filter components
# Click again → should unfilter

# All tests pass? ✅ Ship it!
```

## Post-Launch Monitoring

Track these metrics after release:
- Time to find component (target: < 15s)
- Copy action rate (target: > 30%)
- Registry freshness (target: > 80% under 7 days)
- Error rate (target: < 5%)
- Bounce rate on Browse UI (target: < 40%)

## Reporting Issues

If you find bugs, report with:
1. Browser + version
2. Steps to reproduce
3. Expected vs actual behavior
4. Console errors (if any)
5. Screenshot/video (if visual bug)

File issues at: https://github.com/stevewitmer/DCP-Transformer/issues

