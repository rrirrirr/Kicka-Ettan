# Style Guide

This document defines the design system standards for the frontend application. Follow these guidelines to maintain visual consistency across components.

---

## Design Philosophy

The design language centers on **Modern Glassmorphism** with a soft, approachable aesthetic inspired by ice and curling. Key characteristics:

- **Soft UI**: Generously rounded corners (24px default), soft shadows, gentle curves
- **Glassmorphism**: Heavy use of backdrop blur and semi-transparent overlays
- **Cool Color Palette**: Lavender and periwinkle accents with a high-contrast dark primary
- **Spring-based Animations**: Natural, bouncy interactions with fine-tuned spring constants
- **Lowercase Typography**: Headings styled in lowercase for a modern, casual feel

---

## Table of Contents

1. [Typography](#typography)
2. [Colors](#colors)
3. [Spacing](#spacing)
4. [Border Radius](#border-radius)
5. [Shadows](#shadows)
6. [Glassmorphism](#glassmorphism)
7. [Components](#components)
8. [Icons](#icons)
9. [Animations](#animations)
10. [Scrollbars](#scrollbars)
11. [Best Practices](#best-practices)

---

## Typography

### Typefaces

Two Google Fonts are used throughout the application:

| Font | Weights | Usage |
|------|---------|-------|
| **Outfit** | 300, 400, 500, 700, 900 | Primary typeface for body text and UI |
| **Syne** | 400, 500, 600, 700, 800 | Decorative headings and special emphasis |

Base typography settings:
- Line height: `1.5`
- Font weight: `400`
- Text rendering optimized for legibility

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

### Brand Colors (Ice Theme)

| Variable | Value | Usage |
|----------|-------|-------|
| `--icy-black` | `#252333` | Primary text, buttons |
| `--icy-black-hover` | `#353345` | Button hover states |
| `--icy-black-active` | `#454255` | Button active/pressed states |
| `--icy-white` | `#F0F8FF` | Backgrounds |
| `--icy-blue-medium` | `#62B6CB` | Accents, links |
| `--icy-blue-light` | `#BEE9E8` | Secondary buttons, highlights |
| `--icy-red` | `#D22730` | Accent, hog lines, emphasis |

### Lavender Scale (Primary Interactive)

Used for interactive states, toggles, and active indicators:

| Class | Hex | Usage |
|-------|-----|-------|
| `bg-lavender-50` | `#f5f3ff` | Lightest background |
| `bg-lavender-100` | `#ede9fe` | Light hover backgrounds |
| `bg-lavender-200` | `#ddd6fe` | Subtle highlights |
| `bg-lavender-300` | `#c4b5fd` | Light accents |
| `bg-lavender-400` | `#a78bfa` | Secondary interactive |
| `bg-lavender-500` | `#8b5cf6` | Active states |
| `bg-lavender-600` | `#7c3aed` | Primary interactive |
| `bg-lavender-700` | `#6d28d9` | Hover on active |
| `bg-lavender-800` | `#5b21b6` | Dark accents |
| `bg-lavender-900` | `#4c1d95` | Darkest lavender |

### Periwinkle Scale (Complementary)

Complements lavender for gradients and secondary accents:

| Class | Hex | Usage |
|-------|-----|-------|
| `bg-periwinkle-50` | `#f0f4ff` | Lightest background |
| `bg-periwinkle-100` | `#e0e7ff` | Light highlights |
| `bg-periwinkle-400` | `#818cf8` | Secondary accents |
| `bg-periwinkle-500` | `#6366f1` | Active states |
| `bg-periwinkle-600` | `#4f46e5` | Primary buttons |
| `bg-periwinkle-900` | `#312e81` | Darkest periwinkle |

### Semantic Colors

| Purpose | Variable | Hex | Usage |
|---------|----------|-----|-------|
| Destructive | `--color-destructive` | `#dc2626` | Delete actions, errors |
| Destructive Hover | | `#b91c1c` | Hover state |
| Success | `--color-success` | `#16a34a` | Confirmations, positive |
| Success Hover | | `#15803d` | Hover state |
| Warning | `--color-warning` | `#d97706` | Caution states |
| Warning Hover | | `#b45309` | Hover state |

### Measurement Type Colors

Each measurement type has a dedicated color for visual distinction:

| Type | Active | Inactive Hover |
|------|--------|----------------|
| Guard | `bg-lavender-500` | `bg-lavender-100` |
| T-Line | `bg-amber-500` | `bg-amber-100` |
| Center Line | `bg-amber-500` | `bg-amber-100` |
| Closest Ring | `bg-cyan-500` | `bg-cyan-100` |
| Stone to Stone | `bg-lime-600` | `bg-lime-100` |

### Text Colors

| Purpose | Class | When to Use |
|---------|-------|-------------|
| Primary headings | `text-icy-black` | All headings, important text |
| Primary body | `text-gray-700` | Main content |
| Secondary body | `text-gray-600` | Descriptions, hints |
| Muted | `text-gray-500` | Disabled, placeholder |
| Disabled | `text-gray-400` | Disabled elements |

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

### Radius Scale (CSS Variables)

| Variable | Value | Usage |
|----------|-------|-------|
| `--radius` | `1.5rem` (24px) | Default soft, rounded |
| `--radius-sm` | `calc(--radius - 4px)` = 20px | Smaller elements |
| `--radius-md` | `calc(--radius - 2px)` = 22px | Medium elements |
| `--radius-lg` | `--radius` = 24px | Large containers |
| `--radius-xl` | `calc(--radius + 4px)` = 28px | Extra large containers |

### Tailwind Classes

| Size | Class | Usage |
|------|-------|-------|
| Small | `rounded-lg` | Small interactive elements, badges |
| Medium | `rounded-xl` | Buttons, cards, panels |
| Large | `rounded-2xl` | Dialogs, modals, main containers |
| Extra Large | `rounded-3xl` | Cards with glassmorphism |
| Full | `rounded-full` | Circular elements, avatars, toggles |

### Component-Specific

| Component | Border Radius |
|-----------|---------------|
| Dialogs/Modals | `rounded-2xl` or `rounded-3xl` |
| Bottom Sheets | `rounded-t-3xl` (top corners only) |
| Buttons | `rounded-xl` |
| Cards/Panels | `rounded-xl` to `rounded-3xl` |
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
| Maximum | `shadow-2xl` | Modals, dialogs, glassmorphism cards |

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

## Glassmorphism

### Glass Panel Utility

Use the `.glass-panel` class for frosted glass effect:

```css
.glass-panel {
  @apply bg-white/80 backdrop-blur-md border border-white/50 shadow-lg;
}
```

### Card Gradient

For card backgrounds with subtle gradient:

```css
.card-gradient {
  background: radial-gradient(
    ellipse at top left,
    rgba(225, 242, 255, 0.95) 0%,
    rgba(230, 240, 255, 0.92) 25%,
    rgba(235, 245, 255, 0.88) 50%,
    rgba(215, 235, 250, 0.85) 75%,
    rgba(220, 238, 255, 0.82) 100%
  );
}
```

### Backdrop Overlay

For modal/dialog backdrops:

```tsx
// Standard overlay
className="bg-black/20 backdrop-blur-md"

// Dark overlay (for full-screen takeovers)
className="bg-gradient-to-b from-icy-black/80 to-icy-black/90 backdrop-blur-lg"
```

### Card Component Pattern

```tsx
<div className="card-gradient backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden">
  {/* Card content */}
</div>
```

### Background

The app uses a fixed gradient background with subtle color orbs:

```css
body {
  background:
    radial-gradient(circle at 15% 50%, rgba(98, 182, 203, 0.15) 0%, transparent 25%),
    radial-gradient(circle at 85% 30%, rgba(238, 108, 77, 0.08) 0%, transparent 25%),
    radial-gradient(circle at 50% 80%, rgba(27, 73, 101, 0.05) 0%, transparent 40%);
  background-attachment: fixed;
}
```

---

## Components

### Button Component

Always use the `<Button>` component from `components/ui/Button.tsx`.

#### Variants

| Variant | Usage | Appearance |
|---------|-------|------------|
| `primary` | Main actions | Dark background, white text, shadow |
| `secondary` | Alternative actions | Light blue background |
| `destructive` | Delete/dangerous actions | Red background |
| `outline` | Secondary/cancel actions | White with gray border |
| `ghost` | Tertiary actions | No background |
| `icon` | Icon-only buttons | Minimal styling |

#### Sizes

| Size | Class | Dimensions |
|------|-------|------------|
| `sm` | Small | `px-3 py-1.5 text-xs` |
| `md` | Default | `px-4 py-2 text-sm` |
| `lg` | Large | `px-6 py-3 text-base` |
| `icon` | Icon | `p-2` |

#### Base Styling

All buttons share these properties:
- `font-bold` - Bold text
- `lowercase tracking-tight` - Lowercase with tight letter spacing
- `rounded-xl` - Rounded corners
- `transition-colors duration-150 ease-out` - Smooth color transitions
- `disabled:opacity-50 disabled:cursor-not-allowed` - Disabled state

#### Animation Props

| Prop | Effect |
|------|--------|
| `noHoverAnimation` | Disables scale on hover |
| `noTapAnimation` | Disables scale on tap/click |

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

Features:
- Portal-based rendering (to body)
- `card-gradient` background
- `rounded-3xl` corners
- Backdrop with blur
- Escape key support
- Keyboard navigation

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

### BottomSheet Component

Use `<BottomSheet>` for mobile-friendly slide-up panels:

Features:
- Slides from bottom with spring animation
- Drag handle indicator
- `rounded-t-3xl` (top corners only)
- Safe area support for mobile

```tsx
<BottomSheet isOpen={isOpen} onClose={onClose}>
  {/* Content */}
</BottomSheet>
```

### Card Component

Use `<Card>` for content containers with glassmorphism:

```tsx
<Card className="p-6">
  <h3 className="heading-4">Card Title</h3>
  <p className="body-text-secondary">Card content</p>
</Card>
```

Features:
- `.card-gradient` background
- `backdrop-blur-md`
- `rounded-3xl`
- `shadow-2xl`
- Optional click handling with cursor and glow animation

### Settings Rows

Standard pattern for settings items:

```tsx
<div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl min-h-[72px] hover:bg-gray-100 transition-colors">
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

### Segmented Control

For toggling between 2-3 options:

```tsx
<div className="flex bg-gray-200 rounded-xl p-1">
  {options.map((option) => (
    <button
      key={option.value}
      onClick={() => setValue(option.value)}
      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
        value === option.value
          ? 'bg-white text-lavender-700 shadow-md'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {option.label}
    </button>
  ))}
</div>
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

### Spring Configurations

Import from `src/utils/animations.ts`:

| Spring | Properties | Usage |
|--------|------------|-------|
| `snappy` | stiffness: 400, damping: 25 | Buttons, toggles, quick interactions |
| `bouncy` | stiffness: 300, damping: 15 | Playful elements, attention-grabbing |
| `smooth` | stiffness: 200, damping: 20 | Modals, panels, page transitions |

### Animation Variants

| Variant | Effect | Properties |
|---------|--------|------------|
| `fadeUp` | Fade in + slide up | opacity: 0→1, y: 20→0 |
| `scaleIn` | Zoom in | opacity: 0→1, scale: 0.9→1 |
| `slideIn` | Slide from left | x: -20→0, opacity: 0→1 |
| `pageTransition` | Page-level | scale: 0.98→1, 400ms ease |

### Button Animation

```tsx
// Default button tap/hover behavior
<motion.button
  whileTap={{ scale: 0.95 }}
  whileHover={{ scale: 1.02 }}
  transition={{ duration: 0.1 }}
>
  Click Me
</motion.button>
```

### Staggered Children

For animating lists or groups:

```tsx
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};
```

### Page Transitions

Wrap page content in `AnimatePresence` and use `pageTransition` variants:

```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={page}
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.98 }}
    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
  >
    {/* Page content */}
  </motion.div>
</AnimatePresence>
```

### Glow Animation

For interactive cards and elements:

```css
.animate-glow {
  transition: transform 200ms ease-out, box-shadow 200ms ease-out;
}

.animate-glow:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}
```

---

## Scrollbars

### Custom Scrollbar Styling

Webkit browsers (Chrome, Safari, Edge):

```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(190, 233, 232, 0.1);
  border-radius: 10px;
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, var(--lavender-400), var(--periwinkle-400));
  border-radius: 10px;
}

::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, var(--lavender-500), var(--periwinkle-500));
}
```

Firefox:

```css
* {
  scrollbar-width: thin;
  scrollbar-color: var(--lavender-400) rgba(190, 233, 232, 0.1);
}
```

### Hide Scrollbar Utility

```css
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
```

---

## Best Practices

### Do

- Use the `<Button>` component for all clickable actions
- Apply typography utility classes for headings
- Use CSS variables for brand colors
- Follow the spacing scale consistently
- Use `rounded-2xl` or `rounded-3xl` for dialogs, `rounded-xl` for cards/buttons
- Use `backdrop-blur-md` for glassmorphism effects
- Apply spring animations for natural-feeling interactions
- Use lowercase for headings (built into heading classes)
- Maintain 44px+ touch targets for mobile accessibility

### Don't

- Create inline button styles - use the Button component
- Use `text-gray-900` for headings - use `text-icy-black`
- Mix inconsistent border radius values for similar elements
- Use inline `style` objects for colors - use Tailwind classes
- Hardcode color values - use CSS variables or Tailwind colors
- Skip backdrop blur on overlays - it's part of the design language
- Use linear easing for animations - prefer springs or custom easing

---

## Migration Notes

When updating existing components:

1. Replace `text-gray-900` headings with appropriate `.heading-*` class
2. Replace custom button styles with `<Button>` component
3. Add `backdrop-blur-md` to overlay elements
4. Change flat backgrounds to `card-gradient` where appropriate
5. Replace inline color styles with Tailwind color classes
6. Use `shadow-md hover:shadow-lg` pattern for elevated buttons
7. Add spring animations to interactive elements
