## SocioPilot Redesign Plan

### Phase 1: Design System
- Update `index.css` with new color palette (Primary Blue #2563EB, AI Purple #7C3AED, etc.)
- Update `tailwind.config.ts` with new fonts (Inter) and custom colors
- Add gradient utilities and design tokens

### Phase 2: Landing Page (`Index.tsx`)
- Hero section with gradient text and CTAs
- Features section (card-based, 6 features)
- Dashboard preview mockup section
- How It Works (4 steps)
- Social Proof / Testimonials
- CTA section (gradient background)
- Footer

### Phase 3: Dashboard Redesign
- Add sidebar layout using shadcn Sidebar
- Redesign Dashboard.tsx with new branding
- Update header, cards, and content grid styling

### Phase 4: Auth Page Styling
- Update Auth.tsx to match new brand

### Files to create/modify:
- `src/index.css` - new design tokens
- `tailwind.config.ts` - new colors/fonts
- `src/pages/Index.tsx` - full landing page
- `src/pages/Dashboard.tsx` - redesigned dashboard
- `src/components/DashboardLayout.tsx` - sidebar layout
- `src/components/AppSidebar.tsx` - sidebar component
- `src/pages/Auth.tsx` - updated styling
- `src/App.tsx` - layout wrapping
