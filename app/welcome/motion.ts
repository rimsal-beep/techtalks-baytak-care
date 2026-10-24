

type Pos = { x: number; y: number; h: number; w: number; sx: number; sy: number; rot: number };

export function initLandingMotion(root: HTMLElement): () => void {
  const cleanups: Array<() => void> = [];
  let stopped = false;
  cleanups.push(() => {
    stopped = true;
  });

  const $ = (s: string, r: ParentNode = root) => r.querySelector<HTMLElement>(s);
  const $$ = (s: string, r: ParentNode = root) => Array.from(r.querySelectorAll<HTMLElement>(s));
  const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;

  const listen = (target: EventTarget, type: string, fn: (e: Event) => void, opts?: AddEventListenerOptions) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    cleanups.push(() => window.clearTimeout(id));
  };

  /* ---------- state classes live on the wrapper ---------- */
  root.classList.add("js");
  if (reduce) root.classList.add("no-anim");
  later(() => root.classList.add("hero-in"), reduce ? 0 : 1450);
  const heroH1 = $(".hero h1");
  later(() => heroH1?.classList.add("in"), reduce ? 0 : 1550);

  /* ---------- split headings into words (animated in by CSS) ---------- */
  function split(el: HTMLElement) {
    if (el.dataset.splitDone) return; // safe to run twice
    el.dataset.splitDone = "1";
    let i = 0;
    const walk = (node: Node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          (n.textContent ?? "").split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(" "));
              return;
            }
            const w = document.createElement("span");
            w.className = "w";
            const s = document.createElement("span");
            s.textContent = part;
            s.style.setProperty("--i", String(i++));
            w.appendChild(s);
            frag.appendChild(w);
          });
          (n as ChildNode).replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    el.classList.add("split");
  }
  $$("[data-split]").forEach(split);

  /* ---------- reveal on scroll ---------- */
  const hooks = new Map<Element, () => void>();
  // clip-path on a target confuses IntersectionObserver, so masked elements are watched through a proxy
  const proxyOf = new Map<Element, Element>();
  const proxies: HTMLElement[] = [];
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const t = proxyOf.get(e.target) || e.target;
        t.classList.add("in");
        const h = hooks.get(t);
        if (h) {
          h();
          hooks.delete(t);
        }
        io.unobserve(e.target);
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -6% 0px" },
  );
  cleanups.push(() => {
    io.disconnect();
    proxies.forEach((p) => p.remove());
  });

  const ioObserve = (el: HTMLElement) => {
    const host = el.parentElement;
    if (el.dataset.reveal === "mask" && host) {
      const px = document.createElement("div");
      px.style.cssText = "position:absolute;inset:0;pointer-events:none;visibility:hidden";
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      px.style.top = el.offsetTop + "px";
      px.style.height = el.offsetHeight + "px";
      px.style.bottom = "auto";
      host.appendChild(px);
      proxies.push(px);
      proxyOf.set(px, el);
      io.observe(px);
    } else io.observe(el);
  };
  const observeAll = () => {
    $$("[data-reveal], [data-split]").forEach((el) => {
      if (el !== heroH1 && !el.classList.contains("in")) ioObserve(el);
    });
  };
  const onView = (el: HTMLElement | null, fn: () => void) => {
    if (!el) return;
    hooks.set(el, fn);
    if (!el.dataset.reveal) io.observe(el);
  };

  /* ---------- counters ---------- */
  function countTo(el: HTMLElement, to: number, dur = 1600, from = 0) {
    if (reduce) {
      el.textContent = String(to);
      return;
    }
    const t0 = performance.now();
    const f = (now: number) => {
      if (stopped) return;
      const t = clamp((now - t0) / dur);
      el.textContent = String(Math.round(lerp(from, to, 1 - Math.pow(2, -10 * t))));
      if (t < 1) requestAnimationFrame(f);
      else el.textContent = String(to);
    };
    requestAnimationFrame(f);
  }
  $$("[data-count]").forEach((el) => {
    el.textContent = "0";
    onView(el.closest<HTMLElement>(".stat"), () => countTo(el, Number(el.dataset.count ?? 0), 1800));
  });

  /* ---------- nav, mobile menu, in-page links ---------- */
  const nav = $("#nav");
  const mnav = $("#mnav");
  const menuBtn = $("#menuBtn");
  if (nav && mnav && menuBtn) {
    const toggleMenu = () => {
      const open = !mnav.classList.contains("open");
      mnav.classList.toggle("open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
      const bar = menuBtn.querySelector("span");
      if (bar) {
        bar.style.transform = open ? "rotate(45deg)" : "";
        bar.style.setProperty("--x", open ? "1" : "0");
      }
      root.classList.toggle("lock", open);
      document.body.style.overflow = open ? "hidden" : "";
      nav.style.color = open ? "var(--beige)" : "";
    };
    listen(menuBtn, "click", toggleMenu);
    $$("a", mnav).forEach((a) =>
      listen(a, "click", () => {
        if (mnav.classList.contains("open")) toggleMenu();
      }),
    );
    cleanups.push(() => {
      document.body.style.overflow = "";
    });
  }
  // smooth-scroll to #sections, leaving room for the fixed nav
  listen(root, "click", (e) => {
    const a = (e.target as Element).closest("a[href^='#']");
    if (!a) return;
    const id = decodeURIComponent((a.getAttribute("href") ?? "").slice(1));
    if (!id) return;
    const target = id === "top" ? root : document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const top = id === "top" ? 0 : target.getBoundingClientRect().top + window.scrollY - 70;
    window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  });

  /* ---------- custom cursor + magnetic buttons ---------- */
  const cur = $(".cursor");
  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let cx = mx;
  let cy = my;
  if (fine && !reduce && cur) {
    root.classList.add("has-cursor");
    listen(
      window,
      "pointermove",
      (e) => {
        const pe = e as PointerEvent;
        mx = pe.clientX;
        my = pe.clientY;
        const t = pe.target as Element;
        const lab = t.closest?.<HTMLElement>("[data-cursor]");
        const hov = t.closest?.("a, button, [role='slider']");
        cur.style.opacity = "1"; // appears on the first mouse move
        cur.style.opacity = "1"; // appears on the first mouse move
        cur.style.opacity = "1"; // appears on the first mouse move
        cur.style.opacity = "1"; // appears on the first mouse move
        cur.classList.toggle("label", !!lab);
        cur.classList.toggle("hover", !!hov && !lab);
        cur.classList.toggle("dark", !!t.closest?.("[data-dark], #curtain") && !lab);
        const span = cur.querySelector("span");
        if (lab && span) span.textContent = lab.dataset.cursor ?? "";
      },
      { passive: true },
    );
    listen(window, "pointerdown", () => cur.classList.add("down"));
    listen(window, "pointerup", () => cur.classList.remove("down"));
    listen(window, "pointerdown", () => cur.classList.add("down"));
    listen(window, "pointerup", () => cur.classList.remove("down"));
    listen(window, "pointerdown", () => cur.classList.add("down"));
    listen(window, "pointerup", () => cur.classList.remove("down"));
    listen(window, "pointerdown", () => cur.classList.add("down"));
    listen(window, "pointerup", () => cur.classList.remove("down"));
    listen(document, "pointerleave", () => (cur.style.opacity = "0"));
    listen(document, "pointerenter", () => (cur.style.opacity = "1"));
    listen(
      document,
      "pointermove",
      (e) => {
        const pe = e as PointerEvent;
        $$("[data-magnetic]").forEach((el) => {
          const r = el.getBoundingClientRect();
          const dx = pe.clientX - (r.left + r.width / 2);
          const dy = pe.clientY - (r.top + r.height / 2);
          const near = Math.abs(dx) < r.width / 2 + 40 && Math.abs(dy) < r.height / 2 + 40;
          el.style.transform = near ? `translate(${dx * 0.22}px, ${dy * 0.32}px)` : "";
        });
      },
      { passive: true },
    );
  }

  /* ---------- hero parallax ---------- */
  const hero = $(".hero");
  const heroVis = $("#heroVisual");
  let hx = 0;
  let hy = 0;
  let thx = 0;
  let thy = 0;
  if (hero && heroVis && !reduce) {
    listen(hero, "pointermove", (e) => {
      const pe = e as PointerEvent;
      const r = heroVis.getBoundingClientRect();
      thx = clamp((pe.clientX - (r.left + r.width / 2)) / (r.width / 2), -1.4, 1.4);
      thy = clamp((pe.clientY - (r.top + r.height / 2)) / (r.height / 2), -1.4, 1.4);
    });
    listen(hero, "pointerleave", () => {
      thx = 0;
      thy = 0;
    });
  }
  const heroLayers = $$("#heroScene .pl");
  const floats = $$(".hero .float");
  const heroScene = $("#heroScene");

  /* ---------- "the problem" section: messages scatter, then collapse into one tidy card ---------- */
  const problem = $(".problem");
  const msgsEl = $("#msgs");
  const unread = $("#unread");
  const org = $("#organized");
  const pbar = $("#pbar");
  const msgEls = msgsEl ? $$(".msg", msgsEl) : [];
  let msgPos: Pos[] = [];

  function layoutChat() {
    if (!msgsEl) return;
    const W = msgsEl.clientWidth;
    const H = msgsEl.clientHeight;
    let y = 14;
    const r = (i: number) => {
      const s = Math.sin(i * 91.7) * 10000;
      return s - Math.floor(s);
    };
    msgPos = msgEls.map((el, i) => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const me = el.classList.contains("me");
      const x = me ? W - w - 14 : 14;
      const pos: Pos = { x, y, h, w, sx: r(i) * (W - w * 0.6) - w * 0.2, sy: r(i + 7) * (H - h) - 20, rot: (r(i + 3) - 0.5) * 26 };
      y += h + 8;
      return pos;
    });
  }
  function renderChat(p: number) {
    if (!msgsEl || !msgEls.length || !msgPos.length) return;
    const H = msgsEl.clientHeight;
    const W = msgsEl.clientWidth;
    const N = msgEls.length;
    const k = clamp(p / 0.55) * N;
    const tS = easeIO(clamp((p - 0.56) / 0.22));
    const tC = easeIO(clamp((p - 0.8) / 0.14));
    const shown = Math.min(N, Math.floor(k));
    const last = msgPos[Math.max(0, Math.min(N - 1, Math.ceil(k) - 1))];
    const off = last ? Math.max(0, last.y + last.h - H + 16) : 0;
    msgEls.forEach((el, i) => {
      const m = msgPos[i];
      if (!m) return;
      const vis = clamp(k - i);
      let x = lerp(m.x, m.sx, tS);
      let y = lerp(m.y - off, m.sy, tS) + (1 - vis) * 18;
      const rot = m.rot * tS;
      let sc = 1 - 0.1 * tS;
      x = lerp(x, W / 2 - m.w / 2, tC);
      y = lerp(y, H / 2 - m.h / 2 - 40, tC);
      sc *= 1 - 0.7 * tC;
      el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${sc})`;
      el.style.opacity = String(vis * (1 - tC));
    });
    if (unread) unread.textContent = `${Math.max(0, shown)} unread`;
    if (org) {
      org.style.opacity = String(tC);
      org.style.transform = `translate(-50%, -50%) scale(${0.86 + 0.14 * tC})`;
    }
    const idx = p < 0.26 ? 0 : p < 0.52 ? 1 : 2;
    $$(".pitem").forEach((el, i) => el.classList.toggle("on", i === idx));
    if (pbar) pbar.style.transform = `scaleX(${p})`;
  }
  layoutChat();

  /* ---------- fan of property cards ---------- */
  const fan = $("#fan");
  const fanCards = fan ? $$(".pc", fan) : [];
  function renderFan(q: number) {
    const mob = window.innerWidth < 720;
    fanCards.forEach((c, j) => {
      const i = j - 1;
      const spread = mob ? 40 : 58;
      const x = i * spread * q;
      const rot = i * (q * 7 + (1 - q) * 3);
      const y = Math.abs(i) * 22 * q + (1 - q) * 20;
      c.style.transform = `translate(-50%, -50%) translate(${x}%, ${y}px) rotate(${rot}deg)`;
      c.style.zIndex = i === 0 ? "3" : "1";
    });
  }

  /* ---------- monthly checklist demo: items tick themselves once visible ---------- */
  const clist = $("#clist");
  const ringFg = root.querySelector<SVGElement>("#ring .fg");
  const ringVal = $("#ringVal");
  if (clist && ringFg && ringVal) {
    const lis = $$("li", clist);
    const setRing = (n: number) => {
      ringFg.style.strokeDashoffset = String(364.4 * (1 - n / lis.length));
    };
    onView($("#checkDemo"), () => {
      let n = 0;
      const step = () => {
        if (stopped || n >= lis.length) return;
        lis[n].classList.add("ticked");
        n++;
        setRing(n);
        countTo(ringVal, Math.round((n / lis.length) * 100), 380, Number(ringVal.textContent) || 0);
        later(step, reduce ? 0 : 420);
      };
      later(step, reduce ? 0 : 400);
    });
  }

  /* ---------- before / after slider ---------- */
  const ba = $("#ba");
  let baSwept = false;
  if (ba) {
    let baDrag = false;
    const setBa = (pct: number) => {
      const v = clamp(pct, 2, 98);
      ba.style.setProperty("--x", v + "%");
      ba.setAttribute("aria-valuenow", String(Math.round(v)));
    };
    const fromEvent = (e: PointerEvent) => {
      const r = ba.getBoundingClientRect();
      setBa(((e.clientX - r.left) / r.width) * 100);
    };
    listen(ba, "pointerdown", (e) => {
      const pe = e as PointerEvent;
      baDrag = true;
      baSwept = true;
      ba.setPointerCapture(pe.pointerId);
      fromEvent(pe);
    });
    listen(ba, "pointermove", (e) => {
      if (baDrag) fromEvent(e as PointerEvent);
    });
    listen(ba, "pointerup", () => {
      baDrag = false;
    });
    listen(ba, "keydown", (e) => {
      const key = (e as KeyboardEvent).key;
      const v = parseFloat(ba.style.getPropertyValue("--x")) || 50;
      if (key === "ArrowLeft") setBa(v - 5);
      if (key === "ArrowRight") setBa(v + 5);
    });
    // a short automatic sweep to show it can be dragged
    onView(ba, () => {
      if (reduce) return;
      const keys: Array<[number, number]> = [
        [0, 50],
        [900, 22],
        [1900, 78],
        [2700, 50],
      ];
      const t0 = performance.now() + 700;
      const run = (now: number) => {
        if (stopped || baSwept) return;
        const t = now - t0;
        if (t < 0) {
          requestAnimationFrame(run);
          return;
        }
        for (let i = 0; i < keys.length - 1; i++) {
          if (t <= keys[i + 1][0]) {
            const k = easeIO((t - keys[i][0]) / (keys[i + 1][0] - keys[i][0]));
            setBa(lerp(keys[i][1], keys[i + 1][1], k));
            requestAnimationFrame(run);
            return;
          }
        }
        setBa(50);
      };
      requestAnimationFrame(run);
    });
  }

  /* ---------- main scroll loop ---------- */
  const stage = $("#stage");
  const solFrame = $("#solFrame");
  const finalSec = $("#final");
  const callouts = $$(".callout");
  const finalLayers = $$("#finalBg .pl");
  const darkSecs = $$("[data-dark]");
  let chatP = 0;
  let solP = 0;
  let fanP = 0;
  const secProgress = (el: HTMLElement, start = 1, end = 0) => {
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    return clamp((vh * start - r.top) / (vh * (start - end) || 1));
  };

  let raf = 0;
  const frame = () => {
    if (stopped) return;
    raf = requestAnimationFrame(frame);
    const sy = window.scrollY;
    const vh = window.innerHeight;

    if (nav) {
      nav.classList.toggle("scrolled", sy > 30);
      nav.classList.toggle(
        "dark",
        darkSecs.some((d) => {
          const r = d.getBoundingClientRect();
          return r.top <= 44 && r.bottom >= 44;
        }),
      );
    }
    // hero
    hx = lerp(hx, thx, 0.06);
    hy = lerp(hy, thy, 0.06);
  if (sy < vh * 1.4) {
  heroLayers.forEach((g, i) => {
    const depth = (i % 5 + 1) * 2;
    g.style.transform = `translate3d(${hx * depth}px, ${hy * depth}px, 0)`;
  });

  if (heroScene) {
    heroScene.style.translate = "";
  }
}
    // problem section (pinned while you scroll through it)
    // Keep the chat preview static while scrolling.
if (problem) {
  // Keep the WhatsApp preview static.
  renderChat(0.55);
}
    // dashboard frame tilts flat as it scrolls into view
    if (stage && solFrame) {
      const st = secProgress(stage, 1.05, 0.25);
      solP = reduce ? 1 : lerp(solP, st, 0.1);
      solFrame.style.transform = `rotateX(${(1 - solP) * 24}deg) scale(${0.86 + 0.14 * solP}) translateY(${(1 - solP) * 40}px)`;
      callouts.forEach((c) => {
        const d = Number(c.dataset.depth ?? 0);
        c.style.transform = `translateY(${d * (1 - solP) + Math.sin(performance.now() / 1400 + d) * 5}px)`;
        c.style.opacity = String(clamp(solP * 1.6 - 0.3));
      });
    }
    // property cards fan out
    if (fan) {
      const fq = secProgress(fan, 0.95, 0.45);
      fanP = reduce ? 1 : lerp(fanP, fq, 0.1);
      renderFan(easeIO(fanP));
    }
    // closing scene parallax
    if (finalSec) {
      const fr = finalSec.getBoundingClientRect();
      if (fr.top < vh && fr.bottom > 0) {
        const fp = (vh - fr.top) / (vh + fr.height);
        finalLayers.forEach((g) => {
          const d = Number(g.dataset.depth ?? 0);
          g.style.transform = `translateY(${(fp - 0.5) * d * -60}px)`;
        });
      }
    }
    // cursor
    if (fine && cur && cur.firstElementChild && cur.lastElementChild) {
      cx = lerp(cx, mx, 0.2);
      cy = lerp(cy, my, 0.2);
      (cur.firstElementChild as HTMLElement).style.transform = `translate(${cx}px, ${cy}px)`;
      (cur.lastElementChild as HTMLElement).style.transform = `translate(${mx}px, ${my}px)`;
    }
  };
  listen(window, "resize", layoutChat);

  /* ---------- go ---------- */
  observeAll();
  raf = requestAnimationFrame(frame);
  cleanups.push(() => cancelAnimationFrame(raf));

  return () => {
    for (let i = cleanups.length - 1; i >= 0; i--) cleanups[i]();
  };
}