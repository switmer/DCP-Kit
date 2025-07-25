// Deterministic transformer pipeline for Design System Extractor
// Exports: transform(node) -> { ast, jsx }

function cloneDeep(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// 1) PRUNE -------------------------------------------------
function prune(node) {
  if (!node) return null;
  if (node.type === 'text') {
    return node.value.trim() ? node : null;
  }
  // remove zero-size or display none
  if (node.boundingBox && (node.boundingBox.width === 0 || node.boundingBox.height === 0)) return null;
  if (node.style?.display === 'none' || node.style?.opacity === '0') return null;
  const cleanedChildren = (node.children || []).map(prune).filter(Boolean);
  return { ...node, children: cleanedChildren };
}

// 2) NORMALISE --------------------------------------------
function isWrapper(node) {
  if (node.type !== 'element') return false;
  if (!node.children || node.children.length !== 1) return false;
  // no meaningful styles
  const meaningful = ['padding', 'margin', 'backgroundColor', 'border', 'gap', 'display', 'position'];
  return meaningful.every(key => !node.style?.[key] || node.style[key] === 'block' || node.style[key] === '0px' || node.style[key] === 'auto');
}
function normalize(node) {
  if (!node || node.type !== 'element') return node;
  let n = { ...node, children: node.children.map(normalize) };
  // collapse wrappers recursively
  while (isWrapper(n)) {
    n = n.children[0];
  }
  return n;
}

// 3) CLASSIFY ---------------------------------------------
function classify(node) {
  if (node.type !== 'element') return node;
  // Always-safe primitives
  let component = null;
  if (node.role === 'checkbox' || (node.tag === 'input' && node.type === 'checkbox')) component = 'Checkbox';
  if (node.tag === 'img') component = component || 'img';

  // Optional custom matchers
  const custom = matchCustom(node);
  if (custom) {
    component = custom.component;
    node.props = custom.props;
  }

  return { ...node, component, children: node.children.map(classify) };
}

// 4) PRINT -------------------------------------------------
function printJSX(node, indent = 0) {
  const pad = ' '.repeat(indent);
  if (node.type === 'text') return pad + node.value;
  const comp = node.component || node.tag;
  const opening = `${pad}<${comp}>`;
  const closing = `${pad}</${comp}>`;
  if (!node.children.length) return opening + closing.replace('</', '/>');
  const inner = node.children.map(c => printJSX(c, indent + 2)).join('\n');
  return `${opening}\n${inner}\n${closing}`;
}

function transform(root) {
  const cloned = cloneDeep(root);
  const pruned = prune(cloned);
  const norm = normalize(pruned);
  const classified = classify(norm);
  const jsx = printJSX(classified);
  return { ast: classified, jsx };
}

// -------- Matcher Registry (opt-in) ---------
const CustomMatchers = [];
export function registerMatcher(testFn, componentName, propPicker) {
  CustomMatchers.push({ testFn, componentName, propPicker });
}

// Utility to apply matchers only when enabled via global flag
function matchCustom(node) {
  if (!window.DSE_USE_MATCHERS) return null;
  for (const m of CustomMatchers) {
    try {
      if (m.testFn(node)) {
        const props = m.propPicker ? m.propPicker(node) : null;
        return { component: m.componentName, props };
      }
    } catch (_) { /* ignore matcher errors */ }
  }
  return null;
}

// Export for Node (tests) and attach to window for browser side-panel
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { transform };
}
if (typeof window !== 'undefined') {
  window.DSETransformer = { transform };
} 