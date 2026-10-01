# Landing page (`/welcome`)

Marketing page for Baytak Care. Payments / expenses are intentionally not mentioned yet. Visitors who are not logged in are sent here from `/`.

## How it is organised

```
app/welcome/
  page.tsx            route + page title + fonts (next/font)
  landing.css         all styles, every rule scoped under `.bcl` (cannot leak into the app)
  motion.ts           scroll / reveal / pointer effects (runs after the page loads)
  toast.ts            tiny confirmation popup used by the request demo
  components/
    Landing.tsx       the page, top to bottom. Add / reorder sections here
    Nav, Hero, Problem, Solution, Features, Trust, Preview, FinalCta, Footer
    features/         one file per feature block (+ RequestDemo, the only interactive piece)
    Svg.tsx           <Icon name="..." /> and <Logo n={9} />
  data/               icons, logo, illustration (scenes) and large SVG art
public/landing/       dashboard preview image used in the browser frame
```

## Common changes

- **Change text / a button**: edit the section file, e.g. `components/Hero.tsx`.
- **Add a section**: create `components/MySection.tsx` (a `<section className="section">` with a
  `<div className="wrap">` inside), then add `<MySection />` in `Landing.tsx`.
- **Add a feature block**: create a file in `components/features/` and place it in `Features.tsx`.
- **Reveal animation**: add `data-reveal="up"` (or `fade`, `scale`, `mask`) to an element.
  Headings with `data-split` animate word by word.
- **New icon**: add it to `data/icons.ts`, then use `<Icon name="yourName" />`.
- **Colours / fonts**: CSS variables at the top of `landing.css` (`--navy`, `--beige`, `--f-display`...).
- **Sign in / Get started buttons** go to `/login` and `/signup`.

## Notes

- The dashboard frame shows a screenshot of the design prototype's dashboard (with sample names), not the real one.
  Replace `public/landing/sol-*.webp` with real screenshots when you have them.
- Sample content (cities, names, numbers) is illustrative.