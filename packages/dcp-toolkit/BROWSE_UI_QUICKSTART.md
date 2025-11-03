# Browse UI Quick Start

## 🚀 Test It Now (2 minutes)

```bash
# Navigate to your DCP project
cd /Users/stevewitmer/local_AI_Projects/DCP-Transformer/packages/dcp-toolkit

# Create a test registry (if you don't have one)
mkdir -p /tmp/dcp-browse-test/src/components
cd /tmp/dcp-browse-test

# Create sample components
cat > src/components/Button.tsx << 'EOF'
import React from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
  onClick?: () => void;
}

/**
 * Button component for triggering actions.
 * Use for form submissions, CTAs, and interactive elements.
 */
export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'medium',
  children,
  onClick 
}) => {
  return (
    <button 
      className={`btn btn-${variant} btn-${size}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
EOF

cat > src/components/Card.tsx << 'EOF'
import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Card component for grouping related content.
 * Use for displaying information in a contained, elevated surface.
 */
export const Card: React.FC<CardProps> = ({ title, children, footer }) => {
  return (
    <div className="card">
      {title && <div className="card-header">{title}</div>}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
};
EOF

cat > src/components/Input.tsx << 'EOF'
import React from 'react';

interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number';
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  required?: boolean;
}

/**
 * Input component for user text entry.
 * Use for forms, search fields, and data entry.
 */
export const Input: React.FC<InputProps> = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  required = false
}) => {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      className="input"
    />
  );
};
EOF

# Extract components
npx dcp extract ./src/components --out ./registry --verbose

# Build packs with Browse UI
npx dcp registry build-packs ./registry/registry.json \
  --out ./dist/packs \
  --namespace demo \
  --version 1.0.0 \
  --base-url http://localhost:7401 \
  --verbose

# Serve with Browse UI
npx dcp registry serve ./dist/packs --port 7401 --verbose
```

## 🌐 Open in Browser

Navigate to: **http://localhost:7401**

You should see:
- ✅ 3 component cards (Button, Card, Input)
- ✅ Search bar at the top
- ✅ Facet filter chips (namespace: demo, type: component)
- ✅ Staleness badge showing "Updated 0 days ago"

## 🧪 Test Features

### 1. Search (5 seconds)
- Type "button" in search bar
- Only Button card should remain visible
- Clear search to see all cards again

### 2. Facet Filters (10 seconds)
- Click "demo" namespace chip → should highlight (active)
- Click again → should unhighlight (inactive)
- Try filtering by type

### 3. Component Modal (15 seconds)
- Click on Button card
- Modal should open with:
  - Component name and description
  - PM switcher tabs (npm, pnpm, yarn, bun)
  - Install command
  - Props table (variant, size, children, onClick)
  - Copy buttons (Install Command, Share Link, Ask AI)

### 4. Copy Buttons (10 seconds)
- Click "Copy Install Command"
- Toast notification should appear: "Install command copied!"
- Check clipboard: `npx dcp registry add "http://localhost:7401/r/demo/button"`

### 5. PM Switcher (10 seconds)
- In modal, click "pnpm" tab
- Install command should update to: `pnpm dlx dcp registry add ...`
- Try other tabs (yarn, bun)

### 6. Share Link (10 seconds)
- Click "Copy Link to Component"
- Toast should appear: "Link copied!"
- Paste in browser: `http://localhost:7401#demo/button`
- Modal should auto-open for Button

### 7. Deep Linking (10 seconds)
- Close modal
- Manually navigate to: `http://localhost:7401#demo/card`
- Card modal should auto-open

### 8. 404 Handling (10 seconds)
- Navigate to: `http://localhost:7401#demo/nonexistent`
- 404 modal should appear with search fallback

### 9. Keyboard Navigation (15 seconds)
- Press `Ctrl+K` (or `Cmd+K` on Mac) → search should focus
- Tab through cards → focus outline should be visible
- Press Enter on a card → modal should open
- Press Escape → modal should close

### 10. AI Prompt (10 seconds)
- Open any component modal
- Click "🤖 Ask AI About This"
- Toast should appear: "AI prompt copied!"
- Paste in Claude/ChatGPT to test

## ✅ Success Checklist

- [ ] All 3 components visible in grid
- [ ] Search filters correctly
- [ ] Facet chips toggle on/off
- [ ] Modal opens and displays props
- [ ] Copy buttons work and show toasts
- [ ] PM switcher updates command
- [ ] Deep links work (`#demo/button`)
- [ ] 404 modal shows for invalid links
- [ ] Keyboard navigation works
- [ ] Staleness badge shows

## 🎯 Next Steps

### Test with Your Own Registry

```bash
# Navigate to your project
cd /path/to/your/project

# Extract your components
npx dcp extract ./src/components --out ./registry

# Build packs
npx dcp registry build-packs ./registry/registry.json \
  --out ./dist/packs \
  --namespace your-namespace \
  --base-url http://localhost:7401

# Serve
npx dcp registry serve ./dist/packs --port 7401

# Browse at http://localhost:7401
```

### Deploy to Production

```bash
# Build with production URL
npx dcp registry build-packs ./registry/registry.json \
  --out ./dist/packs \
  --namespace your-namespace \
  --base-url https://registry.yourcompany.com

# Publish to S3 (or any static host)
npx dcp registry publish ./dist/packs \
  --bucket your-registry-bucket \
  --region us-east-1

# Browse UI will be available at:
# https://registry.yourcompany.com/browse.html
```

## 🐛 Troubleshooting

### "Cannot find module" error when building
- Ensure you're in the correct directory
- Run `npm install` in the dcp-toolkit directory

### Browse UI shows "Failed to load registry"
- Check that `index.json` exists in `./dist/packs/`
- Verify server is running: `curl http://localhost:7401/index.json`
- Check browser console for errors

### Clipboard not working
- Ensure you're on `localhost` or `https://`
- Check browser clipboard permissions
- Try in a different browser (Chrome, Firefox, Safari)

### Static files not found
- Verify files exist: `ls /Users/stevewitmer/local_AI_Projects/DCP-Transformer/packages/dcp-toolkit/static/`
- Re-run `build-packs` with `--verbose` to see copy logs

## 📚 More Resources

- [Browse UI Testing Checklist](./BROWSE_UI_TESTING.md) - Full testing guide
- [Browse UI Implementation Summary](./BROWSE_UI_IMPLEMENTATION_SUMMARY.md) - Technical details
- [Component Packs Guide](./docs/COMPONENT_PACKS.md) - Distribution docs

## 🎉 You're Done!

The Browse UI is now live and ready to use. Share the URL with your team:
- **Designers**: Browse components visually, copy share links
- **Engineers**: Copy install commands for their package manager
- **PMs**: Share deep links in Slack/Jira
- **AI Users**: Copy AI prompts to use with Claude/ChatGPT

Enjoy! 🚀

