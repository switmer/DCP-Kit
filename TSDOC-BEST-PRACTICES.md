# TSDoc Best Practices for DCP-Transformer

> **TL;DR**: Use proper TypeScript interfaces, JSDoc comments, and CVA patterns for optimal component extraction and mutation capabilities.

## Table of Contents
- [Component Documentation](#component-documentation)
- [Props & Variants](#props--variants)
- [CVA Pattern Best Practices](#cva-pattern-best-practices)
- [Composition Patterns](#composition-patterns)
- [Examples & Usage](#examples--usage)
- [AI-Friendly Documentation](#ai-friendly-documentation)

---

## Component Documentation

### ✅ **Recommended**: JSDoc Component Description
```tsx
/**
 * Button component with multiple variants and sizes.
 * Supports various visual styles from primary actions to subtle ghost buttons.
 * 
 * @example
 * <Button variant="primary" size="medium">Click me</Button>
 * <Button variant="ghost" size="small">Cancel</Button>
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, className, ...props }, ref) => {
    // implementation
  }
)
```

### ✅ **Recommended**: Export Components with Display Names
```tsx
Button.displayName = "Button"

export { Button, buttonVariants }
```

---

## Props & Variants

### ✅ **Recommended**: Explicit TypeScript Interfaces
```tsx
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as child component via Radix Slot */
  asChild?: boolean
  /** Custom className for additional styling */  
  className?: string
}
```

### ✅ **Recommended**: Document Individual Props
```tsx
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card visual variant affecting background and border */
  variant?: 'default' | 'outline' | 'elevated'
  /** Card size affecting padding and typography */
  size?: 'sm' | 'md' | 'lg'
  /** Whether card should have hover effects */
  interactive?: boolean
}
```

### ❌ **Avoid**: Undocumented Union Types
```tsx
// BAD: No description of what these variants do
variant?: 'a' | 'b' | 'c'

// GOOD: Clear descriptions
/** Visual style: 'primary' for main actions, 'secondary' for less important actions, 'ghost' for minimal styling */
variant?: 'primary' | 'secondary' | 'ghost'
```

---

## CVA Pattern Best Practices

### ✅ **Recommended**: Well-Structured CVA Definitions
```tsx
const buttonVariants = cva(
  // Base classes that apply to all variants
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

### ✅ **Recommended**: Use Descriptive Variant Names
```tsx
// GOOD: Semantic names that describe purpose/appearance
variants: {
  variant: {
    primary: "...",     // Main call-to-action
    secondary: "...",   // Secondary actions  
    destructive: "...", // Dangerous actions
    ghost: "...",       // Minimal styling
  },
  size: {
    sm: "...",         // Small size
    default: "...",    // Standard size  
    lg: "...",         // Large size
  }
}

// AVOID: Generic names without clear meaning
variants: {
  variant: {
    a: "...",
    b: "...", 
    c: "...",
  }
}
```

### ✅ **Recommended**: Define Default Variants
```tsx
const cardVariants = cva("rounded-lg border", {
  variants: {
    variant: {
      default: "bg-card text-card-foreground",
      outline: "border-2 border-muted",
    },
  },
  // Always specify defaults for predictable behavior
  defaultVariants: {
    variant: "default",
  },
})
```

---

## Composition Patterns

### ✅ **Recommended**: Clear Parent-Child Naming Convention
```tsx
// Parent component
const Card = React.forwardRef<HTMLDivElement, CardProps>(...)

// Child components with consistent prefix
const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(...)
const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(...)  
const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(...)

// Export all related components together
export { Card, CardHeader, CardContent, CardFooter }
```

### ✅ **Recommended**: Document Composition Relationships
```tsx
/**
 * Card component for grouping related content.
 * 
 * @example
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Card Title</CardTitle>
 *     <CardDescription>Card description text</CardDescription>
 *   </CardHeader>
 *   <CardContent>
 *     Main card content goes here
 *   </CardContent>
 *   <CardFooter>
 *     <Button>Action</Button>
 *   </CardFooter>
 * </Card>
 */
```

### ✅ **Recommended**: Consistent Component Structure
```tsx
// Dialog family - all share "Dialog" prefix
export {
  Dialog,           // Root component
  DialogTrigger,    // Trigger component  
  DialogContent,    // Content wrapper
  DialogHeader,     // Header section
  DialogTitle,      // Title element
  DialogDescription, // Description element
  DialogFooter,     // Footer section
  DialogClose,      // Close button
}
```

---

## Examples & Usage

### ✅ **Recommended**: Comprehensive JSDoc Examples
```tsx
/**
 * Button component supporting multiple variants and sizes.
 *
 * @example Basic usage
 * <Button>Click me</Button>
 * 
 * @example With variants
 * <Button variant="destructive" size="lg">Delete</Button>
 * <Button variant="outline" size="sm">Cancel</Button>
 * 
 * @example As child component
 * <Button asChild>
 *   <Link href="/home">Go Home</Link>  
 * </Button>
 *
 * @example With custom styling
 * <Button className="w-full mt-4" variant="secondary">
 *   Full Width Button
 * </Button>
 */
```

### ✅ **Recommended**: Document Complex Patterns
```tsx
/**
 * Form component with validation and error handling.
 * 
 * @example Complete form
 * <Form onSubmit={handleSubmit}>
 *   <FormField name="email" label="Email">
 *     <Input type="email" required />
 *   </FormField>
 *   <FormField name="password" label="Password">  
 *     <Input type="password" required />
 *   </FormField>
 *   <Button type="submit">Submit</Button>
 * </Form>
 */
```

---

## AI-Friendly Documentation

### ✅ **Recommended**: Use Semantic Descriptions
```tsx
interface ButtonProps {
  /** 
   * Visual variant affecting appearance and meaning:
   * - 'default': Standard button for general actions
   * - 'destructive': Red styling for dangerous actions like delete
   * - 'outline': Bordered button for secondary actions  
   * - 'ghost': Minimal styling for subtle actions
   */
  variant?: 'default' | 'destructive' | 'outline' | 'ghost'
  
  /**
   * Button size affecting dimensions and text:
   * - 'sm': Compact button for tight spaces
   * - 'default': Standard size for most use cases
   * - 'lg': Large button for primary actions
   * - 'icon': Square button optimized for icons only
   */
  size?: 'sm' | 'default' | 'lg' | 'icon'
}
```

### ✅ **Recommended**: Include Mutation Hints
```tsx
/**
 * Avatar component for displaying user profile images.
 * 
 * @mutationHints
 * - Change size to make avatars larger/smaller
 * - Switch to square variant for brand logos
 * - Add status indicator for online/offline states
 * - Modify fallback text generation logic
 * 
 * @example
 * <Avatar size="lg" src="/user.jpg" fallback="JD" />
 */
```

### ✅ **Recommended**: Document Design System Tokens
```tsx
/**
 * Uses design tokens:
 * - Colors: primary, secondary, destructive, muted
 * - Spacing: padding, margin from spacing scale  
 * - Typography: font-medium, text-sm from type scale
 * - Radius: rounded-md from border radius tokens
 */
const buttonVariants = cva(
  "font-medium text-sm rounded-md", // <- References design tokens
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground", // <- Token-based colors
        secondary: "bg-secondary text-secondary-foreground",
      }
    }
  }
)
```

---

## Quick Checklist

When documenting components, ensure:

- [ ] Component has JSDoc description with purpose
- [ ] All props have meaningful comments
- [ ] Variants are semantically named and documented
- [ ] CVA patterns follow consistent structure  
- [ ] Examples show common usage patterns
- [ ] Related components use consistent naming
- [ ] Export structure is clean and logical
- [ ] TypeScript interfaces are explicit and complete

---

## DCP-Transformer Benefits

Following these practices ensures:

✅ **Better Extraction**: Components are correctly identified and parsed  
✅ **Rich Metadata**: Variants, props, and relationships are captured  
✅ **Mutation Ready**: AI can understand component purposes and suggest changes  
✅ **Team Clarity**: Consistent documentation helps developers understand usage  
✅ **Design System**: Clear patterns support scalable component libraries