# TSDoc / JSDoc Guide for DCP-Transformer Extraction

Add these annotations directly above components, props, or sub-components. The extractor will parse them and surface the text into `description` fields in the registry.

---

## 1  Component Block

```tsx
/**
 * [Required] One-sentence summary – what the component is / does.
 *
 * [Optional] Additional paragraphs: usage advice, accessibility notes,
 * variant rationale, or gotchas.
 *
 * @category Layout            // appears in `category` (overrides heuristic)
 * @status   stable|beta|deprecated
 */
export const Card: React.FC<CardProps> = ({ ... }) => {
  ...
};
```

### Supported Tags
| Tag        | Effect in Registry                     |
| ---------- | --------------------------------------- |
| `@category`| Overrides heuristic category detection  |
| `@status`  | Adds to `metadata.status`               |
| `@slot`    | Declares a named slot (`composition.slots`) |

---

## 2  Prop Doc

```ts
interface ButtonProps {
  /** Text shown on the button */
  label: string;
  
  /**
   * Visual priority of the button.
   * @default "primary"
   */
  variant?: 'primary' | 'ghost';
}
```

• The first line becomes `prop.description`.
• `@default` is captured as the default value.

---

## 3  Sub-components

```tsx
export const CardHeader = ({ ... }) => { ... };
```

If the name starts with the parent component’s name (`Card*`) it is automatically added to `composition.subComponents` of the parent.

Add a doc block if you want a richer description.

---

## 4  Events / Callbacks

Document custom events so future extractor passes can pull them:

```ts
/**
 * Fires when the modal closes.
 * @event close (reason?: 'escape' | 'backdrop')
 */
```

---

Stick to these patterns and you’ll get rich, searchable metadata with **zero runtime cost** and full agent/LLM friendliness. 