# Premium Dark Automotive Theme - Design Guidelines

## Design Approach

**Selected Approach:** Luxury Automotive Brand Style

Inspired by high-end automotive wrap companies and luxury car configurators. The design features a sleek, dark monochromatic palette that puts focus on the vehicle imagery while conveying premium quality and professionalism.

**Key Principles:**
- Dark, sophisticated aesthetic with black and charcoal tones
- White and light gray text for high contrast and elegance
- Monochromatic color scheme - no bright accent colors
- Clean, minimal design with generous whitespace
- Premium feel through subtle shadows and refined typography

## Color Palette

**Core Colors:**
- Background: Near-black (#141414) to dark charcoal (#1f1f1f)
- Cards/Surfaces: Slightly elevated dark gray (#1a1a1a to #262626)
- Text Primary: White (#f2f2f2)
- Text Secondary: Medium gray (#999999)
- Text Muted: Darker gray (#666666)
- Borders: Subtle dark borders (#2e2e2e to #333333)
- Accent (for buttons/CTAs): White on dark background

**Interactions:**
- Hover states: Subtle lightening of surfaces
- Active states: Slightly more pronounced lightening
- Focus rings: Gray (#808080)

## Typography

**Font Stack:**
- Primary: Inter (400, 500, 600, 700) - clean, modern, excellent readability
- System fallback: system-ui, sans-serif

**Hierarchy:**
- Hero/Page Titles: text-4xl to text-5xl, font-semibold, tracking-tight
- Section Headers: text-2xl to text-3xl, font-semibold
- Card Titles: text-lg to text-xl, font-medium
- Body Text: text-base, font-normal
- Captions/Meta: text-sm, font-medium, text-muted-foreground
- Buttons: text-base, font-medium, uppercase tracking for CTAs

## Layout System

**Spacing Primitives:** Tailwind units of 4, 6, 8, 12, 16, 24
- Component padding: p-6, p-8
- Section spacing: gap-8, gap-12
- Card spacing: p-6 to p-8
- Form fields: gap-4
- Margins between major sections: mb-12, mb-16

**Grid System:**
- User Frontend: Single column focus (max-w-4xl centered)
- Admin Dashboard: Sidebar + main content (sidebar w-64, main flex-1)
- Responsive breakpoints: mobile-first, md:, lg:

## Component Styling

### Buttons

**Primary CTA:**
- White background, black text
- Rounded corners (rounded-md)
- Subtle border for definition
- Hover: Slight elevation/lightening

**Secondary/Outline:**
- Transparent background with white border
- White text
- Hover: Subtle background fill

**Icon Buttons:**
- Ghost variant with size="icon"
- White icons on dark background

### Cards

- Dark background (#1a1a1a to #262626)
- Subtle border (border-border)
- Rounded corners (rounded-lg)
- Padding: p-6 to p-8
- Minimal shadow - rely on border for definition

### Form Inputs

- Dark background matching card surfaces
- Light gray border
- White text
- Placeholder: medium gray
- Focus: Gray ring

### Sidebar

- Near-black background (#0f0f0f to #141414)
- White icons and text
- Selected state: Slightly lighter background
- Subtle borders between sections

## Visual Elements

**Icons:**
- Use Lucide React icons
- White or light gray color
- Consistent sizing (w-5 h-5 for inline, w-6 h-6 for navigation)

**Borders:**
- Use sparingly and subtly
- Color: hsl(0 0% 18%) or similar
- Width: 1px standard

**Shadows:**
- Minimal use on dark theme
- Reserve for modals/overlays
- Subtle black shadows when needed

## Animations

**Minimal, purposeful animations:**
- Button states: Subtle hover elevation
- Page transitions: None - instant
- Loading spinner: Standard rotation, white color
- Modal: Fade in backdrop, subtle scale-up content

## Imagery

**User Frontend:**
- Car images: User-uploaded, display large and prominent
- Dark overlay on image placeholders
- Color swatches: Actual wrap product images

**Admin Dashboard:**
- No decorative images
- Data visualization in monochromatic tones
- Icons for navigation and actions

## Best Practices

1. **Contrast:** Ensure sufficient contrast between text and backgrounds
2. **Consistency:** Use the same shades of gray throughout
3. **Restraint:** Avoid colorful accents - keep everything monochromatic
4. **Focus:** Let user content (car images) be the visual focus
5. **Premium Feel:** Generous spacing, refined details, subtle interactions
