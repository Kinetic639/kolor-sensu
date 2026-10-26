// Reusable prototype enhancement. The ordinary anchor and text stay usable
// before this script loads, without GSAP, or with reduced motion enabled.
(() => {
  const assetBase = new URL(".", document.currentScript.src);
  const sources = new Map();

  function source(name) {
    if (!sources.has(name)) {
      sources.set(
        name,
        fetch(new URL(name, assetBase)).then((response) => {
          if (!response.ok) throw new Error("Link artwork unavailable");
          return response.text();
        }),
      );
    }
    return sources.get(name);
  }

  async function mount(link, { gsap } = {}) {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let timeline;
    let observer;
    let disposed = false;
    try {
      const art = await Promise.all([
        source("handdrawn-underline.svg"),
        source("handdrawn-arrow.svg"),
      ]);
      ["underline", "arrow"].forEach((kind, index) => {
        const svg = new DOMParser().parseFromString(
          art[index],
          "image/svg+xml",
        ).documentElement;
        svg.setAttribute("class", `handdrawn-link__${kind}`);
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        link.querySelector(`.handdrawn-link__${kind}`).replaceWith(svg);
      });
    } catch {
      return { replay() {}, destroy() {} };
    }

    const strokes = [...link.querySelectorAll("[data-ink-part]")];
    function play() {
      link.dataset.drawing = "drawing";
      timeline = gsap.timeline({
        onComplete: () => {
          link.dataset.drawing = "complete";
        },
      });
      timeline.to(
        link.querySelectorAll('[data-ink-part="underline"]'),
        {
          strokeDashoffset: 0,
          duration: 1.6,
          ease: "power2.inOut",
        },
        0,
      );
      timeline.to(
        link.querySelectorAll('[data-ink-part="shaft"]'),
        {
          strokeDashoffset: 0,
          duration: 1.1,
          ease: "power2.inOut",
        },
        0.3,
      );
      timeline.to(
        link.querySelectorAll('[data-ink-part="head"]'),
        {
          strokeDashoffset: 0,
          duration: 0.42,
          ease: "power2.out",
        },
        1.15,
      );
    }

    function replay() {
      if (disposed) return;
      timeline?.kill();
      observer?.disconnect();
      const animate = Boolean(gsap) && !reduced.matches;
      strokes.forEach((stroke) => {
        const length = stroke.getTotalLength();
        stroke.style.strokeDasharray = `${length} ${length}`;
        stroke.style.strokeDashoffset = animate ? String(length) : "0";
      });
      if (!animate) {
        link.dataset.drawing = "complete";
        return;
      }
      link.dataset.drawing = "waiting";
      observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer.disconnect();
          play();
        },
        { threshold: 0.5 },
      );
      observer.observe(link);
    }

    reduced.addEventListener("change", replay);
    return {
      replay,
      destroy() {
        disposed = true;
        timeline?.kill();
        observer?.disconnect();
        reduced.removeEventListener("change", replay);
        strokes.forEach((stroke) => {
          stroke.style.strokeDashoffset = "0";
        });
      },
    };
  }

  window.HandDrawnLink = { mount };
})();
