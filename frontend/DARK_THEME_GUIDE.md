# Dark Theme Implementation Guide

## Overview
Dark theme has been implemented across the entire ImmunoDetect frontend using Tailwind CSS dark mode with class-based strategy.

## How It Works

### Theme Provider
- Located in `lib/theme-context.tsx`
- Manages theme state (light/dark)
- Persists preference to localStorage
- Respects system preference on first visit
- Toggles `dark` class on `<html>` element

### Theme Toggle Component
- Located in `components/ui/theme-toggle.tsx`
- Shows sun icon in dark mode, moon icon in light mode
- Available in dashboard header and home page navigation

## Usage

### For New Components
Add dark mode variants using Tailwind's `dark:` prefix:

```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  Content
</div>
```

### Common Patterns

**Backgrounds:**
- `bg-white dark:bg-gray-900` - Main backgrounds
- `bg-gray-50 dark:bg-gray-800` - Secondary backgrounds
- `bg-gray-100 dark:bg-gray-700` - Tertiary backgrounds

**Text:**
- `text-gray-900 dark:text-white` - Primary text
- `text-gray-600 dark:text-gray-300` - Secondary text
- `text-gray-500 dark:text-gray-400` - Tertiary text

**Borders:**
- `border-gray-200 dark:border-gray-800` - Main borders
- `border-gray-300 dark:border-gray-700` - Secondary borders

**Interactive Elements:**
- `hover:bg-gray-100 dark:hover:bg-gray-800`
- `focus:ring-blue-500` (works in both modes)

## Components Updated

✅ All UI components (Button, Card, Input, Select, Badge, Label)
✅ Login page
✅ Register page
✅ Home page
✅ Dashboard layout (sidebar, header, navigation)
✅ Patient dashboard
✅ Admin dashboard
✅ Counselor dashboard

## Testing
1. Toggle theme using the sun/moon button
2. Refresh page - theme should persist
3. Check all pages for proper contrast
4. Verify forms are readable in both modes
