# Style Guide

This document defines the design system standards for the frontend application. Follow these guidelines to maintain visual consistency across components.

---

## Table of Contents

1. [Typography](#typography)
2. [Colors](#colors)
3. [Spacing](#spacing)
4. [Border Radius](#border-radius)
5. [Shadows](#shadows)
6. [Components](#components)
7. [Icons](#icons)
8. [Animations](#animations)

---

## Typography

### Heading Hierarchy

Use the predefined typography utility classes from `index.css`:

| Class | Usage | Properties |
|-------|-------|------------|
| `.heading-1` | Page titles, hero text | `text-5xl font-black tracking-tighter` |
| `.heading-2` | Dialog titles | `text-3xl font-black tracking-tighter lowercase` |
| `.heading-3` | Section titles, confirm dialogs | `text-2xl font-black tracking-tighter lowercase` |
| `.heading-4` | Subsection titles, card headers | `text-lg font-bold` |

All headings use `--icy-black` for color consistency.

### Body Text

| Class | Usage | Properties |
|-------|-------|------------|
| `.body-text` | Primary body content | `text-sm text-gray-700 leading-relaxed` |
| `.body-text-secondary` | Secondary/muted content | `text-sm text-gray-600 leading-relaxed` |
| `.label` | Form labels, list labels | `text-sm font-medium text-gray-700` |
| `.caption` | Helper text, timestamps | `text-xs text-gray-600` |

### Font Weights

| Weight | Tailwind Class | Usage |
|--------|----------------|-------|
| 900 | `font-black` | Headings (h1, h2, h3) |
| 700 | `font-bold` | h4, buttons, emphasis |
| 600 | `font-semibold` | Labels, active states |
| 500 | `font-medium` | Secondary buttons, hints |
| 400 | `font-normal` | Body text |

### Example Usage

```tsx
// Dialog title
<h2 className="heading-2">{title}</h2>

// Section in settings
<h3 className="heading-4">Unit System</h3>

// Body content
<p className="body-text-secondary">{description}</p>
```

---

## Colors

### Brand Colors

| Variable | Value | Usage |
|----------|-------|-------|
| `--icy-black` | `#252333` | Primary text, buttons |
| `--icy-black-hover` | `#353345` | Button hover states |
| `--icy-white` | `#F0F8FF` | Backgrounds |
| `--icy-blue-medium` | `#62B6CB` | Accents, links |
| `--icy-blue-light` | `#BEE9E8` | Secondary buttons |

### Semantic Colors

| Purpose | Variable/Class | Usage |
|---------|----------------|-------|
| Destructive | `--color-destructive` / `bg-red-600` | Delete actions, warnings |
| Success | `--color-success` / `bg-green-600` | Confirmations |
| Warning | `--color-warning` / `bg-amber-500` | Caution states |

### Text Colors

| Purpose | Class | When to Use |
|---------|-------|-------------|
| Primary headings | `text-icy-black` | All headings, important text |
| Primary body | `text-gray-700` | Main content |
| Secondary body | `text-gray-600` | Descriptions, hints |
| Muted | `text-gray-500` | Disabled, placeholder |
| Disabled | `text-gray-400` | Disabled elements |

### Lavender Scale (Interactive Elements)

Used for interactive states, toggles, and active indicators:

| Class | Usage |
|-------|-------|
| `bg-lavender-100` | Light hover backgrounds |
| `bg-lavender-500` | Active states |
| `bg-lavender-600` | Primary interactive |
| `bg-lavender-700` | Hover on active |

### Measurement Type Colors

Each measurement type has a dedicated color:

| Type | Active | Inactive Hover |
|------|--------|----------------|
| Guard | `bg-lavender-500` | `bg-lavender-100` |
| T-Line | `bg-amber-500` | `bg-amber-100` |
| Center Line | `bg-amber-500` | `bg-amber-100` |
| Closest Ring | `bg-cyan-500` | `bg-cyan-100` |
| Stone to Stone | `bg-lime-600` | `bg-lime-100` |

---

## Spacing

### Padding Scale

| Size | Class | Usage |
|------|-------|-------|
| Compact | `p-2` | Tight elements, icon buttons |
| Small | `p-3` | List items, small cards |
| Medium | `p-4` | Cards, panels, settings rows |
| Large | `p-6` | Dialog content areas |
| Extra Large | `p-8` | Dialog containers |

### Gap Scale

| Size | Class | Usage |
|------|-------|-------|
| Tight | `gap-2` | Icon + text, tight groups |
| Normal | `gap-3` | List items, button groups |
| Relaxed | `gap-4` | Section spacing |

### Margin Scale

| Size | Class | Usage |
|------|-------|-------|
| Small | `mb-2` / `mt-2` | Between related items |
| Medium | `mb-3` / `mt-3` | Heading to content |
| Large | `mb-4` / `mt-4` | Between sections |
| Extra Large | `mb-6` / `mt-6` | Major section breaks |

---

## Border Radius

### Standard Scale

| Size | Class | Usage |
|------|-------|-------|
| Small | `rounded-lg` | Small interactive elements, badges |
| Medium | `rounded-xl` | Buttons, cards, panels |
| Large | `rounded-2xl` | Dialogs, modals, main containers |
| Full | `rounded-full` | Circular elements, avatars, toggles |

### Component-Specific

| Component | Border Radius |
|-----------|---------------|
| Dialogs/Modals | `rounded-2xl` |
| Buttons | `rounded-xl` |
| Cards/Panels | `rounded-xl` |
| Settings rows | `rounded-xl` |
| Icon buttons | `rounded-lg` or `rounded-full` |
| Toggles | `rounded-full` |
| Inputs | `rounded` (default) |

---

## Shadows

### Shadow Scale

| Size | Class | Usage |
|------|-------|-------|
| Subtle | `shadow-sm` | Outline buttons, inputs |
| Default | `shadow-md` | Primary buttons, cards |
| Elevated | `shadow-lg` | Hover states, dropdowns |
| Prominent | `shadow-xl` | Floating elements |
| Maximum | `shadow-2xl` | Modals, dialogs |

### Button Shadow Pattern

```tsx
// Primary/Secondary buttons
className="shadow-md hover:shadow-lg"

// Outline buttons
className="shadow-sm hover:shadow-md"

// Ghost buttons
// No shadow
```

---

## Components

### Button Component

Always use the `<Button>` component from `components/ui/Button.tsx`.

#### Variants

| Variant | Usage | Appearance |
|---------|-------|------------|
| `primary` | Main actions | Dark background, white text |
| `secondary` | Alternative actions | Light blue background |
| `destructive` | Delete/dangerous actions | Red background |
| `outline` | Secondary/cancel actions | White with border |
| `ghost` | Tertiary actions | No background |
| `icon` | Icon-only buttons | Minimal styling |

#### Sizes

| Size | Class | Dimensions |
|------|-------|------------|
| `sm` | Small | `px-3 py-1.5 text-xs` |
| `md` | Default | `px-4 py-2 text-sm` |
| `lg` | Large | `px-6 py-3 text-base` |
| `icon` | Icon | `p-2` |

#### Examples

```tsx
// Primary action
<Button onClick={handleSubmit}>Save Changes</Button>

// Cancel/secondary
<Button variant="outline" onClick={onClose}>Cancel</Button>

// Destructive
<Button variant="destructive" onClick={handleDelete}>Delete</Button>

// Icon button
<Button variant="icon" size="icon" aria-label="Settings">
  <Settings size={20} />
</Button>
```

### Dialog Component

Use `<Dialog>` from `components/ui/Dialog.tsx` for all modal dialogs.

```tsx
<Dialog
  isOpen={isOpen}
  onClose={handleClose}
  title="dialog title"
>
  <p className="body-text-secondary">Content here</p>
</Dialog>
```

### ConfirmDialog Component

Use `<ConfirmDialog>` for confirmation prompts:

```tsx
<ConfirmDialog
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={handleConfirm}
  title="confirm action"
  message="Are you sure you want to proceed?"
  confirmText="Yes, proceed"
  cancelText="Cancel"
  variant="danger" // or "warning" or "info"
/>
```

### Settings Rows

Standard pattern for settings items:

```tsx
<div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl min-h-[72px]">
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-full bg-lavender-100 text-lavender-600 flex items-center justify-center">
      <Icon size={20} />
    </div>
    <div className="text-left">
      <h3 className="heading-4">Setting Name</h3>
    </div>
  </div>
  {/* Control element (toggle, button, etc.) */}
</div>
```

### Toggle Switch

Standard toggle pattern:

```tsx
<button
  onClick={handleToggle}
  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-lavender-500 focus:ring-offset-2 ${
    isEnabled ? 'bg-lavender-600' : 'bg-gray-200'
  }`}
>
  <span
    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
      isEnabled ? 'translate-x-6' : 'translate-x-1'
    }`}
  />
</button>
```

---

## Icons

### Icon Sizes

| Context | Size | Usage |
|---------|------|-------|
| Inline with text | `16` | Labels, list items |
| Buttons | `20` | Standard buttons |
| Navigation | `24` | Menu items, nav icons |
| Feature icons | `20-24` | Settings rows |

### Icon Colors

- Default: `text-gray-600`
- Hover: `text-gray-900`
- Active: `text-lavender-600` or `text-white` (on colored bg)
- Disabled: `text-gray-400`

### Icon Library

Use [Lucide React](https://lucide.dev/) for all icons:

```tsx
import { Settings, Menu, X, ChevronRight } from 'lucide-react';

<Settings size={20} className="text-gray-600" />
```

---

## Animations

### Library

Use `framer-motion` for all UI animations.

### Configuration

Import shared configurations from `src/utils/animations.ts`.

| Export | Usage | Description |
|--------|-------|-------------|
| `springs.snappy` | Buttons, toggles | Fast, responsive spring for interactions |
| `springs.smooth` | Modals, panels | Slower, smoother spring for transitions |
| `fadeUp` | Lists, items | Fade in and slide up |
| `scaleIn` | Dialogs, popovers | Scale from 0.95 to 1 |

### Patterns

#### Page Transitions

Wrap page content in `AnimatePresence` and use `pageTransition` variants.

#### Interactive Elements

Use `whileTap` and `whileHover` for feedback.

```tsx
<motion.button
  whileTap="tap"
  whileHover="hover"
  variants={buttonTap} // or buttonHover
>
  Click Me
</motion.button>
```

---

## Best Practices

### Do

- Use the `<Button>` component for all clickable actions
- Apply typography utility classes for headings
- Use CSS variables for brand colors
- Follow the spacing scale consistently
- Use `rounded-2xl` for dialogs, `rounded-xl` for cards/buttons

### Don't

- Create inline button styles - use the Button component
- Use `text-gray-900` for headings - use `text-icy-black`
- Mix `rounded-3xl` and `rounded-2xl` for similar elements
- Use inline `style` objects for colors - use Tailwind classes
- Hardcode color values - use CSS variables or Tailwind colors

---

## Migration Notes

When updating existing components:

1. Replace `text-gray-900` headings with appropriate `.heading-*` class
2. Replace custom button styles with `<Button>` component
3. Change `rounded-3xl` to `rounded-2xl` on dialogs/containers
4. Replace inline color styles with Tailwind color classes
5. Use `shadow-md hover:shadow-lg` pattern for elevated buttons
