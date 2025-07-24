Yes —treat what we have today as the **“React / TSX adaptor”** rather than “the one true extractor.”  
That framing makes both architecture and roadmap clearer.

1. Clean separation of concerns  
   • Core engine = file-watching, graph store, schema validation, JSON-Patch, MCP export.  
   • Adaptors = language/framework–specific AST walkers that feed the engine a normalized “ComponentDescriptor”.

2. Straight path to multi-framework support  
   ```
   /adaptors
     ├── react-tsx/
     ├── vue-sfc/
     ├── svelte/
     ├── stencil-wc/
     └── shadcn-registry-import/
   ```
   Each adaptor implements:
   ```ts
   interface Extractor {
     canProcess(filePath: string, source: string): boolean
     extractComponents(...): ComponentDescriptor[]
   }
   ```
   The watcher pipes every changed file through the registered adaptors in order.

3. Explicit feature flags  
   ```
   dcp extract ./src --adaptor react-tsx
   dcp extract ./packages --adaptor vue-sfc
   ```
   Or auto-detect by file-extension / loader hints.

4. Easier contribution surface  
   • Someone with Vue expertise can write `vue-sfc` without touching mutation logic.  
   • Opt-in experimental adaptors live under `adaptors/experimental/*`.

5. Clear docs & expectations  
   “React adaptor supports: named export functions, arrow const exports, default exports, forwardRef / memo chains. It ignores barrel files unless you pass --follow-barrel.”

6. Incremental rollout  
   • Rename current parser directory to `adaptors/react-tsx`.  
   • Adapter registry (tiny, maybe 50 lines).  
   • Leave CLI default to `react-tsx` for now; pass `--adaptor` for others as they land.

7. Why not one giant universal parser?  
   • Complexity explodes (Vue SFC blocks, Svelte syntax, Solid signals…).  
   • Per-framework edge cases become untestable tangles.  
   • Versioning becomes a nightmare—React 19 vs Vue 3.5 etc.

Bottom line:  
Call the existing code “React TSX adaptor”, move it under an `adaptors/` folder, and keep the core engine framework-agnostic. That lets us fix today’s React default-export gap while paving a clean road to Vue, Svelte, Web-Components, or even MDX in the future.