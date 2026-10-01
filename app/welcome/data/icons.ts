// Inline SVG icons used across the landing page (generated from the design prototype).
export const ICONS = {
  arrow: { attrs: { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "1.6", "strokeLinecap": "round", "strokeLinejoin": "round", "aria-hidden": "true" }, inner: "<path d=\"M5 12h14M13 6l6 6-6 6\"></path>" },
  camera: { attrs: { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "1.6", "strokeLinecap": "round", "strokeLinejoin": "round", "aria-hidden": "true" }, inner: "<path d=\"M4 8h3l2-3h6l2 3h3v11H4z\"></path><circle cx=\"12\" cy=\"13\" r=\"3.5\"></circle>" },
  check: { attrs: { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "1.6", "strokeLinecap": "round", "strokeLinejoin": "round", "aria-hidden": "true" }, inner: "<path d=\"M5 12.5l4.5 4.5L19 7.5\"></path>" },
  doc: { attrs: { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "1.6", "strokeLinecap": "round", "strokeLinejoin": "round", "aria-hidden": "true" }, inner: "<path d=\"M7 3h7l4 4v14H7zM14 3v4h4\"></path>" },
  drag: { attrs: { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "1.6", "strokeLinecap": "round", "strokeLinejoin": "round", "aria-hidden": "true" }, inner: "<path d=\"M9 7l-5 5 5 5M15 7l5 5-5 5\"></path>" },
  list: { attrs: { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "1.6", "strokeLinecap": "round", "strokeLinejoin": "round", "aria-hidden": "true" }, inner: "<path d=\"M10.5 6H20M10.5 12H20M10.5 18H20M4 6l1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17\"></path>" },
  lock: { attrs: { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "1.6", "strokeLinecap": "round", "strokeLinejoin": "round", "aria-hidden": "true" }, inner: "<path d=\"M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3\"></path>" },
  play: { attrs: { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "1.6", "strokeLinecap": "round", "strokeLinejoin": "round", "aria-hidden": "true" }, inner: "<path d=\"M7 4.5v15l12-7.5z\" fill=\"currentColor\" stroke=\"none\"></path>" },
  receipt: { attrs: { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "1.6", "strokeLinecap": "round", "strokeLinejoin": "round", "aria-hidden": "true" }, inner: "<path d=\"M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21zM9 8h6M9 12h6M9 16h3\"></path>" },
  wrench: { attrs: { "viewBox": "0 0 24 24", "fill": "none", "stroke": "currentColor", "strokeWidth": "1.6", "strokeLinecap": "round", "strokeLinejoin": "round", "aria-hidden": "true" }, inner: "<path d=\"M14.5 4.5a4.5 4.5 0 0 0-4.3 5.8L4 16.5 7.5 20l6.2-6.2a4.5 4.5 0 0 0 5.8-4.3l-2.7 2.7-2.6-.6-.6-2.6z\"></path>" },
} as const;

export type IconName = keyof typeof ICONS;
