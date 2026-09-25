/* SageSyncs: interactions and motion for every page */
(function () {
  "use strict";

  var doc = document;
  var body = doc.body;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hasIO = "IntersectionObserver" in window;

  doc.documentElement.classList.add("js");

  function $(sel, root) { return (root || doc).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ---------- split headings into words for the reveal ---------- */
  function splitWords(el) {
    var index = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = doc.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(part)); return; }
            var span = doc.createElement("span");
            span.className = "w";
            span.textContent = part;
            span.style.setProperty("--wi", index++);
            frag.appendChild(span);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    })(el);
  }
  $$(".split, .reveal-words").forEach(splitWords);

  /* ---------- nav, progress bar, parallax, scroll-linked lines ---------- */
  var nav = $(".nav");
  var bar = $(".progress");
  var parallax = $$("[data-parallax]");
  var lines = $$("[data-scrollline]");
  var lastY = window.scrollY;
  var ticking = false;

  function onScroll() {
    var y = window.scrollY;
    var vh = window.innerHeight;
    if (nav) {
      nav.classList.toggle("glass", y > 40);
      if (y > lastY + 4 && y > 260 && !body.classList.contains("menu-open")) nav.classList.add("away");
      else if (y < lastY - 4) nav.classList.remove("away");
    }
    lastY = y;
    var max = doc.documentElement.scrollHeight - vh;
    if (bar) bar.style.scale = (max > 0 ? clamp(y / max, 0, 1) : 0) + " 1";
    if (!reduce) {
      parallax.forEach(function (el) {
        el.style.translate = "0 " + (y * parseFloat(el.getAttribute("data-parallax"))).toFixed(1) + "px";
      });
    }
    lines.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var p = reduce ? 1 : clamp((vh * 0.85 - r.top) / (r.height + vh * 0.3), 0, 1);
      el.style.setProperty("--p", p.toFixed(3));
      var steps = $$(".step", el);
      steps.forEach(function (s, i) {
        var at = steps.length > 1 ? i / (steps.length - 1) : 0;
        s.classList.toggle("lit", p > 0 && p >= at - 0.02);
      });
    });
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ---------- mobile menu ---------- */
  var burger = $(".burger");
  var menu = $("#menu");
  if (burger && menu) {
    burger.addEventListener("click", function () {
      var open = burger.getAttribute("aria-expanded") !== "true";
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.hidden = !open;
      body.classList.toggle("menu-open", open);
      if (open && nav) nav.classList.remove("away");
    });
  }

  /* ---------- reveal as you scroll ---------- */
  $$("[data-stagger]").forEach(function (group) {
    Array.prototype.slice.call(group.children).forEach(function (child, i) {
      if (!child.hasAttribute("data-reveal")) child.setAttribute("data-reveal", group.getAttribute("data-stagger") || "");
      child.style.setProperty("--i", i);
    });
  });
  var revealables = $$("[data-reveal], .reveal-words");
  if (reduce || !hasIO) {
    revealables.forEach(function (el) { el.classList.add("in"); });
  } else {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    revealables.forEach(function (el) { revealIO.observe(el); });
  }

  /* ---------- counters ---------- */
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var suffix = el.getAttribute("data-suffix") || "";
    if (reduce) { el.textContent = target + suffix; return; }
    var start = null;
    function frame(t) {
      if (start === null) start = t;
      var k = clamp((t - start) / 1600, 0, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))) + suffix;
      if (k < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  var counters = $$("[data-count]");
  if (hasIO) {
    var countIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { countUp(entry.target); countIO.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { countIO.observe(c); });
  }

  /* ---------- flowing network backgrounds ---------- */
  function Network(canvas) {
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var host = canvas.parentElement;
    var nodes = [];
    var w = 0;
    var h = 0;
    var running = false;
    var pointer = { x: -9999, y: -9999 };
    var palette = ["90,225,255", "90,225,255", "90,225,255", "90,225,255", "90,225,255", "205,175,255", "205,175,255", "255,213,74"];

    function make() {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        r: Math.random() * 1.7 + 0.9,
        c: palette[Math.floor(Math.random() * palette.length)]
      };
    }
    function resize() {
      var r = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.min(110, Math.round((w * h) / 11000));
      while (nodes.length < count) nodes.push(make());
      nodes.length = count;
    }
    function step() {
      for (var i = 0; i < nodes.length; i++) {
        var p = nodes[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        var dx = pointer.x - p.x;
        var dy = pointer.y - p.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < 150 && d > 0) { p.x -= (dx / d) * 0.8; p.y -= (dy / d) * 0.8; }
      }
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      var reach = 140;
      var reach2 = reach * reach;
      ctx.lineWidth = 1;
      for (var i = 0; i < nodes.length; i++) {
        var a = nodes[i];
        for (var j = i + 1; j < nodes.length; j++) {
          var b = nodes[j];
          var dx = a.x - b.x;
          var dy = a.y - b.y;
          var d2 = dx * dx + dy * dy;
          if (d2 < reach2) {
            ctx.strokeStyle = "rgba(90,225,255," + ((1 - Math.sqrt(d2) / reach) * 0.4).toFixed(3) + ")";
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        var md = Math.sqrt((pointer.x - a.x) * (pointer.x - a.x) + (pointer.y - a.y) * (pointer.y - a.y));
        if (md < 200) {
          ctx.strokeStyle = "rgba(205,175,255," + ((1 - md / 200) * 0.7).toFixed(3) + ")";
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(pointer.x, pointer.y); ctx.stroke();
        }
      }
      for (var k = 0; k < nodes.length; k++) {
        var n = nodes[k];
        ctx.fillStyle = "rgba(" + n.c + ",0.95)";
        ctx.shadowColor = "rgba(" + n.c + ",0.9)";
        ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;
    }
    function loop() {
      if (!running) return;
      step();
      draw();
      requestAnimationFrame(loop);
    }
    function start() { if (reduce || running) return; running = true; requestAnimationFrame(loop); }
    function stop() { running = false; }

    resize();
    draw();
    if ("ResizeObserver" in window) new ResizeObserver(function () { resize(); if (reduce) draw(); }).observe(canvas);
    if (hasIO) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? start() : stop();
      }).observe(canvas);
    } else {
      start();
    }
    if (finePointer) {
      host.addEventListener("pointermove", function (e) {
        var r = canvas.getBoundingClientRect();
        pointer.x = e.clientX - r.left;
        pointer.y = e.clientY - r.top;
      }, { passive: true });
      host.addEventListener("pointerleave", function () { pointer.x = -9999; pointer.y = -9999; });
    }
  }
  $$("canvas.net").forEach(function (c) { Network(c); });

  /* ---------- cursor dot and trailing ring ---------- */
  if (finePointer) {
    var dot = doc.createElement("div");
    var ring = doc.createElement("div");
    dot.className = "cursor-dot";
    ring.className = "cursor-ring";
    dot.setAttribute("aria-hidden", "true");
    ring.setAttribute("aria-hidden", "true");
    body.appendChild(ring);
    body.appendChild(dot);
    body.classList.add("has-cursor");

    var mx = -100, my = -100, rx = -100, ry = -100, scale = 1, targetScale = 1;
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType && e.pointerType !== "mouse") return;
      mx = e.clientX;
      my = e.clientY;
      if (!body.classList.contains("cursor-visible")) { rx = mx; ry = my; body.classList.add("cursor-visible"); }
      dot.style.transform = "translate3d(" + mx + "px," + my + "px,0)";
    }, { passive: true });
    doc.addEventListener("pointerover", function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      body.classList.toggle("cursor-typing", !!t.closest("input, textarea"));
      var hot = !!t.closest("a, button, select, label, [data-cursor]");
      ring.classList.toggle("hover", hot);
      targetScale = hot ? 1.7 : 1;
    });
    window.addEventListener("pointerdown", function () { targetScale = 0.7; });
    window.addEventListener("pointerup", function () { targetScale = ring.classList.contains("hover") ? 1.7 : 1; });
    doc.documentElement.addEventListener("pointerleave", function () { body.classList.remove("cursor-visible"); });
    (function follow() {
      var k = reduce ? 1 : 0.18;
      rx += (mx - rx) * k;
      ry += (my - ry) * k;
      scale += (targetScale - scale) * (reduce ? 1 : 0.2);
      ring.style.transform = "translate3d(" + rx.toFixed(1) + "px," + ry.toFixed(1) + "px,0) scale(" + scale.toFixed(3) + ")";
      requestAnimationFrame(follow);
    })();

    /* glow inside glass cards follows the mouse */
    doc.addEventListener("pointermove", function (e) {
      var card = e.target.closest && e.target.closest(".card");
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", (e.clientX - r.left) + "px");
      card.style.setProperty("--my", (e.clientY - r.top) + "px");
    }, { passive: true });

    /* magnetic buttons */
    if (!reduce) {
      $$("[data-magnetic]").forEach(function (btn) {
        btn.addEventListener("pointermove", function (e) {
          var r = btn.getBoundingClientRect();
          var x = (e.clientX - r.left - r.width / 2) * 0.22;
          var y = (e.clientY - r.top - r.height / 2) * 0.32;
          btn.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)";
        });
        btn.addEventListener("pointerleave", function () { btn.style.transform = ""; });
      });
    }
  }

  /* ---------- testimonial carousel ---------- */
  $$("[data-carousel]").forEach(function (c) {
    var slides = $$(".slide", c);
    var dots = $$(".dots button", c);
    var index = 0;
    var timer = null;
    var paused = false;
    function go(n) {
      index = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) {
        s.classList.toggle("active", k === index);
        s.setAttribute("aria-hidden", String(k !== index));
      });
      dots.forEach(function (d, k) { d.setAttribute("aria-current", String(k === index)); });
    }
    function restart() {
      clearInterval(timer);
      if (!reduce) timer = setInterval(function () { if (!paused) go(index + 1); }, 5000);
    }
    dots.forEach(function (d, k) { d.addEventListener("click", function () { go(k); restart(); }); });
    c.addEventListener("pointerenter", function () { paused = true; });
    c.addEventListener("pointerleave", function () { paused = false; });
    c.addEventListener("focusin", function () { paused = true; });
    c.addEventListener("focusout", function () { paused = false; });
    go(0);
    restart();
  });

  /* ---------- lead response chat demo ---------- */
  $$("[data-chat]").forEach(function (chat) {
    if (reduce || !hasIO) return;
    var seq = [["0", 500], ["1", 900], ["2", 1600], ["3", 700], ["4", 4200]];
    var timer = null;
    function run(k) {
      chat.setAttribute("data-step", seq[k][0]);
      timer = setTimeout(function () { run((k + 1) % seq.length); }, seq[k][1]);
    }
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { if (!timer) run(0); }
      else { clearTimeout(timer); timer = null; chat.setAttribute("data-step", "4"); }
    }, { threshold: 0.4 }).observe(chat);
  });

  /* ---------- flip cards (tap on touch screens) ---------- */
  $$(".flip").forEach(function (card) {
    card.addEventListener("click", function () {
      var on = !card.classList.contains("flipped");
      card.classList.toggle("flipped", on);
      card.setAttribute("aria-pressed", String(on));
    });
  });

  /* ---------- FAQ ---------- */
  $$(".faq-item").forEach(function (item) {
    var q = $(".faq-q", item);
    if (!q) return;
    q.addEventListener("click", function () {
      var open = !item.classList.contains("open");
      item.classList.toggle("open", open);
      q.setAttribute("aria-expanded", String(open));
    });
  });

  /* ---------- contact form: opens the visitor's email app ---------- */
  var form = $("[data-contact]");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var data = new FormData(form);
      var subject = "New enquiry from " + data.get("name") + " (" + data.get("type") + ")";
      var text = "Name: " + data.get("name") + "\nEmail: " + data.get("email") + "\nBusiness type: " + data.get("type") +
        "\n\nWhat takes up most of my week:\n" + data.get("week");
      var btn = $(".submit", form);
      var note = $(".form-note", form);
      if (btn) btn.classList.add("sent");
      if (note) {
        note.textContent = "Your email app is opening with your message ready. Press send there and I'll reply within 24 hours.";
        note.classList.add("ok");
      }
      window.location.href = "mailto:sage1webdev@gmail.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(text);
    });
  }

  /* ---------- soft fade between pages ---------- */
  if (!reduce) {
    doc.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target === "_blank" || a.hasAttribute("download")) return;
      var url = new URL(a.getAttribute("href"), window.location.href);
      if (url.origin !== window.location.origin || url.protocol.indexOf("http") !== 0) return;
      if (url.pathname === window.location.pathname) return;
      e.preventDefault();
      body.classList.add("leaving");
      setTimeout(function () { window.location.href = url.href; }, 240);
    });
    window.addEventListener("pageshow", function () { body.classList.remove("leaving"); });
  }
})();
