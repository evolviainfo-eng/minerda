/* MINERDA — interaction layer.
   Fails to visible: every reveal is un-hidden by CSS class, a safety timer,
   a load sweep and a reduced-motion branch. No JS → full content.
   Motion: transform/opacity only, ease-out, 400–700ms. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* ?qa=1 — static capture mode used for screenshot QA; no effect in normal use. */
  var qa = /[?&]qa=1/.test(location.search);
  if (qa) document.documentElement.classList.add('qa');
  var still = reduce || qa;
  var mobile = window.matchMedia('(max-width:760px)').matches;

  var EASE_OUT = function (t) { return 1 - Math.pow(1 - t, 3); };
  var raf = window.requestAnimationFrame.bind(window);

  /* Where the enquiry form posts. FormSubmit needs one activation click in the
     inbox below before the first message is delivered. */
  var FORM_ENDPOINT = 'https://formsubmit.co/bfr082@gmail.com';

  /* ── smooth scroll: Lenis, lerp only, desktop only ─────────────
     rAF loop is self-stopping: it runs while the user scrolls and dies a
     few hundred ms after the last input, so an idle page schedules no frames. */
  var lenis = null;
  if (!still && window.Lenis && window.matchMedia('(min-width:761px)').matches) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false, autoRaf: false });
    var rafId = null, lastHit = 0;
    var tick = function (t) {
      lenis.raf(t);
      if (lenis.isScrolling || performance.now() - lastHit < 400) {
        rafId = raf(tick);
      } else { rafId = null; }
    };
    var wake = function () {
      lastHit = performance.now();
      if (rafId === null) rafId = raf(tick);
    };
    ['wheel', 'touchstart', 'keydown'].forEach(function (ev) {
      window.addEventListener(ev, wake, { passive: true });
    });
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a || a.getAttribute('href').length < 2) return;
      var target = document.getElementById(a.getAttribute('href').slice(1));
      if (!target) return;
      e.preventDefault();
      wake();
      lenis.scrollTo(target, { offset: -96 });
    });
  }

  /* ── nav ─────────────────────────────────────────────── */
  var nav = document.getElementById('nav');
  var toggle = document.getElementById('navToggle');
  var panel = document.getElementById('navPanel');

  var onScroll = function () {
    nav.classList.toggle('is-stuck', window.scrollY > 24);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  /* embedded webviews can swallow scroll events — a sentinel observer
     drives the same class from layout position instead */
  if ('IntersectionObserver' in window) {
    var sentinel = document.createElement('div');
    sentinel.style.cssText = 'position:absolute;top:24px;left:0;width:1px;height:1px;pointer-events:none';
    document.body.prepend(sentinel);
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        nav.classList.toggle('is-stuck', !e.isIntersecting && e.boundingClientRect.top < 0);
      });
    }).observe(sentinel);
  }

  var menuY = 0;
  var setMenu = function (open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Uždaryti meniu' : 'Atidaryti meniu');
    panel.hidden = !open;
    /* iOS Safari ignoruoja body overflow:hidden — fonas rakinamas per position:fixed */
    if (open) {
      menuY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = -menuY + 'px';
      document.body.style.width = '100%';
    } else if (document.body.style.position === 'fixed') {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, menuY);
    }
  };
  toggle.addEventListener('click', function () {
    setMenu(toggle.getAttribute('aria-expanded') !== 'true');
  });
  panel.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') setMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) setMenu(false);
  });

  /* ── F2 reveal ───────────────────────────────────────── */
  var revealables = [].slice.call(document.querySelectorAll('.rv'));
  /* 70ms stagger, restarted per section, capped at six steps */
  [].slice.call(document.querySelectorAll('section, footer')).forEach(function (sec) {
    [].slice.call(sec.querySelectorAll('.rv')).forEach(function (el, i) {
      el.style.setProperty('--rd', Math.min(i, 5) * 70 + 'ms');
    });
  });
  /* F3 — the hairline between sections draws itself in */
  var sections = [].slice.call(document.querySelectorAll('.sec, .foot'));
  var showAll = function () {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
    sections.forEach(function (el) { el.classList.add('is-in'); });
  };

  if (still || !('IntersectionObserver' in window)) {
    showAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.12 });
    revealables.concat(sections).forEach(function (el) { io.observe(el); });
    /* IO can stay silent in embedded/hidden viewers — a scroll-driven sweep
       reveals whatever is on screen, the timer reveals the rest */
    var pending = revealables.concat(sections);
    var sweepRv = function () {
      var vh = window.innerHeight;
      pending = pending.filter(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < vh + 120 && r.bottom > -120) { el.classList.add('is-in'); return false; }
        return true;
      });
    };
    var rvT = null;
    window.addEventListener('scroll', function () {
      if (rvT) return;
      rvT = setTimeout(function () { rvT = null; sweepRv(); }, 120);
    }, { passive: true });
    setTimeout(sweepRv, 600);
    setTimeout(showAll, 2500);
    window.addEventListener('load', function () {
      revealables.concat(sections).forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight) el.classList.add('is-in');
      });
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) setTimeout(showAll, 1200);
    });
  }

  /* ── F1 · hero parallax — image travels at 0.3× scroll speed ── */
  var heroImg = document.querySelector('.hero__plate img');
  var heroPlate = document.querySelector('.hero__plate');
  if (heroImg && heroPlate && !still) {
    var pTicking = false;
    var applyParallax = function () {
      pTicking = false;
      var h = heroPlate.offsetHeight;
      var y = window.scrollY;
      if (y > h) return;                       /* out of view — stop writing style */
      heroImg.style.transform = 'translate3d(0,' + (y * 0.3).toFixed(1) + 'px,0)';
    };
    window.addEventListener('scroll', function () {
      if (pTicking) return;
      pTicking = true;
      raf(applyParallax);
    }, { passive: true });
    /* the settle keyframe owns transform for its first 1.8s, and `fill: both`
       would keep outranking an inline transform for good — so drop the
       animation once it has landed, then the parallax can write. */
    var releaseHero = function () {
      heroImg.style.animation = 'none';
      applyParallax();
    };
    if (heroImg.getAnimations) {
      var anims = heroImg.getAnimations();
      if (anims.length) {
        anims[0].finished.then(releaseHero).catch(function () {});
      }
    }
    setTimeout(releaseHero, 1900);
  }

  /* ── D1 · before / after slider ──────────────────────── */
  var ARROWS =
    '<svg viewBox="0 0 7 11" aria-hidden="true"><path d="M5 1 1.5 5.5 5 10"/></svg>' +
    '<svg viewBox="0 0 7 11" aria-hidden="true"><path d="M2 1 5.5 5.5 2 10"/></svg>';

  var buildSlider = function (root) {
    var pairs;
    try { pairs = JSON.parse(root.getAttribute('data-pairs')); }
    catch (e) { return null; }
    if (!pairs || !pairs.length) return null;

    var stage = document.createElement('div');
    stage.className = 'cw__stage';
    stage.innerHTML =
      '<div class="cw__l cw__l--a"><img alt="" loading="lazy" decoding="async"></div>' +
      '<div class="cw__l cw__l--b"><img alt="" loading="lazy" decoding="async"></div>' +
      '<p class="cw__lbl cw__lbl--b">Prieš</p>' +
      '<p class="cw__lbl cw__lbl--a">Po</p>' +
      '<div class="cw__line"></div>' +
      '<button type="button" class="cw__knob" aria-label="Slinkti prieš ir po vaizdą"' +
      ' role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">' + ARROWS + '</button>';

    var cap = document.createElement('p');
    cap.className = 'cw__cap';

    var imgA = stage.querySelector('.cw__l--a img');
    var imgB = stage.querySelector('.cw__l--b img');
    var knob = stage.querySelector('.cw__knob');

    root.appendChild(stage);
    root.appendChild(cap);

    var thumbs = null, tBtns = [];
    if (pairs.length > 1) {
      thumbs = document.createElement('ul');
      thumbs.className = 'cw__thumbs';
      pairs.forEach(function (p, i) {
        var li = document.createElement('li');
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'cw__t';
        b.setAttribute('aria-label', p.t);
        var th = 'img/th/' + p.a.split('/').pop().replace(/-after\.webp$/, '.webp');
        b.innerHTML = '<img src="' + th + '" alt="" loading="lazy" width="56" height="56">';
        b.addEventListener('click', function () { setPair(i); });
        li.appendChild(b); thumbs.appendChild(li);
        tBtns.push(b);
      });
      root.appendChild(thumbs);
    }

    var pos = 50, cur = -1, touched = false;

    var paint = function (v) {
      pos = Math.max(0, Math.min(100, v));
      stage.style.setProperty('--p', pos + '%');
      knob.setAttribute('aria-valuenow', Math.round(pos));
    };

    function setPair(i) {
      if (i === cur) return;
      cur = i;
      var p = pairs[i];
      var sm = function (u) { return u.replace('.webp', '-sm.webp'); };
      var SIZES = '(max-width:760px) 100vw, 60vw';
      imgA.srcset = sm(p.a) + ' 800w, ' + p.a + ' 1284w'; imgA.sizes = SIZES;
      imgA.src = p.a; imgA.alt = p.aa;
      imgB.srcset = sm(p.b) + ' 800w, ' + p.b + ' 1284w'; imgB.sizes = SIZES;
      imgB.src = p.b; imgB.alt = p.ab;
      cap.textContent = p.c;
      root.id = root.id || '';
      tBtns.forEach(function (b, n) { b.classList.toggle('is-cur', n === i); });
      paint(50);
    }
    setPair(0);

    /* pointer drag — no libraries */
    var dragging = false;
    var toPct = function (clientX) {
      var r = stage.getBoundingClientRect();
      return ((clientX - r.left) / r.width) * 100;
    };
    var down = function (e) {
      dragging = true; touched = true;
      stage.setPointerCapture && e.pointerId !== undefined && stage.setPointerCapture(e.pointerId);
      paint(toPct(e.clientX));
    };
    var move = function (e) {
      if (!dragging) return;
      e.preventDefault();
      paint(toPct(e.clientX));
    };
    var up = function () { dragging = false; };
    stage.addEventListener('pointerdown', down);
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    knob.addEventListener('click', function (e) { e.preventDefault(); });
    knob.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowLeft' ? -4 : e.key === 'ArrowRight' ? 4 : 0;
      if (!d) return;
      e.preventDefault(); touched = true; paint(pos + d);
    });

    /* one slow hint on first appearance: 50 → 25 → 50 over 2s, then it rests
       (only the first slider gets it — see hintIO below) */
    root._hint = function () {
      if (touched || still) return;
      var t0 = performance.now(), DUR = 2000;
      var step = function (t) {
        if (touched) return;
        var k = Math.min(1, (t - t0) / DUR);
        /* ease-in-out there and back */
        var e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        var tri = e < 0.5 ? e * 2 : (1 - e) * 2;
        paint(50 - 25 * tri);
        if (k < 1) raf(step); else paint(50);
      };
      raf(step);
    };
    return root;
  };

  var sliders = [].slice.call(document.querySelectorAll('[data-ba]')).map(buildSlider).filter(Boolean);
  if ('IntersectionObserver' in window && !still) {
    var hintIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        hintIO.unobserve(e.target);
        setTimeout(function () { e.target._hint && e.target._hint(); }, 450);
      });
    }, { threshold: 0.5 });
    /* the demonstration runs once, on the first slider only */
    if (sliders[0]) hintIO.observe(sliders[0]);
  }

  /* desktop index rail switches the #darbas pair */
  var baIndex = document.getElementById('baIndex');
  var baMain = document.getElementById('baMain');
  if (baIndex && baMain) {
    var links = [].slice.call(baIndex.querySelectorAll('a'));
    var tset = [].slice.call(baMain.querySelectorAll('.cw__t'));
    links.forEach(function (a, i) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        if (tset[i]) tset[i].click();
        links.forEach(function (x, n) { x.parentNode.classList.toggle('is-cur', n === i); });
      });
    });
    if (links[0]) links[0].parentNode.classList.add('is-cur');
    /* keep the rail in step when the thumbnails are used directly */
    tset.forEach(function (b, i) {
      b.addEventListener('click', function () {
        links.forEach(function (x, n) { x.parentNode.classList.toggle('is-cur', n === i); });
      });
    });
  }

  /* ── C · video: lazy source, play only while visible ───
     self!==top: QA/fit harnesses load the page in an iframe — a looping video
     there deadlocks virtual-time measurement. */
  var vids = [].slice.call(document.querySelectorAll('video.v'));
  /* only the ?qa=1 capture mode holds media back — an embedded/previewed page
     must still load and play like the real thing */
  var live = !qa;
  var wanted = [];   /* videos that should be running right now */

  /* Every iOS browser is WebKit, and Safari's WebM/VP9 answer to canPlayType
     is not to be trusted (software decode, battery, stalls on Low Power) —
     Safari and iOS always get the H.264 file. */
  var ua = navigator.userAgent;
  var safariLike = /iP(hone|ad|od)/.test(ua) ||
    (/Safari\//.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR|SamsungBrowser/.test(ua));
  var pickSrc = function (v) {
    var webm = v.getAttribute('data-webm'), mp4 = v.getAttribute('data-mp4');
    if (safariLike || !webm) return mp4;
    /* '' = no, 'maybe'/'probably' = yes */
    return v.canPlayType('video/webm; codecs="vp9,vp8"') ? webm : mp4;
  };

  var loadVid = function (v) {
    if (v.dataset.loaded) return;
    var src = pickSrc(v);
    if (!src) return;
    v.dataset.loaded = '1';
    v.src = src;          /* set on the element, not a <source> child */
    v.load();
  };

  var tryPlay = function (v) {
    /* prefers-reduced-motion calms page animation (Lenis, reveals, slider hint)
       only — silent loop clips keep their autoplay */
    if (!live || document.hidden) return;
    if (wanted.indexOf(v) < 0) return;
    var pr = v.play();
    /* Whatever play() does, look again 300 ms after it settles: if the clip
       is wanted and still paused, autoplay is blocked (Low Power Mode, an
       embedded view, a policy) and the only way in is a tap. A NotAllowedError
       is shown at once; transient AbortErrors from a load() in flight are
       covered by the same settle check without flashing the button. */
    var settle = function () {
      setTimeout(function () {
        if (wanted.indexOf(v) > -1 && v.paused) showPlay(v);
      }, 300);
    };
    if (pr && pr.then) {
      pr.then(settle, function (err) {
        if (err && err.name === 'NotAllowedError') showPlay(v);
        settle();
      });
    } else { settle(); }
  };

  var wantPlay = function (v) {
    if (wanted.indexOf(v) < 0) wanted.push(v);
    loadVid(v);
    tryPlay(v);
    checkStuck(v);
  };
  var stopPlay = function (v) {
    var i = wanted.indexOf(v);
    if (i > -1) wanted.splice(i, 1);
    if (!v.paused) v.pause();
  };

  /* iOS Low Power Mode refuses every programmatic play(). The only way in is a
     tap, so each video gets a thin play button that shows up when autoplay
     fails (play() rejects, or 1 s after wanting it the clip still sits at 0). */
  var PLAY_SVG = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 1.5v11l9-5.5z"/></svg>';
  var playBtn = function (v) {
    if (v._btn) return v._btn;
    var wrap = v.parentNode;
    if (!wrap.classList.contains('vwrap')) wrap.classList.add('vwrap');
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'v-play';
    b.setAttribute('aria-label', 'Paleisti video');
    b.innerHTML = PLAY_SVG;
    b.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      loadVid(v);
      var pr = v.play();
      if (pr && pr.catch) pr.catch(function () {});
    });
    wrap.appendChild(b);
    v._btn = b;
    return b;
  };
  var showPlay = function (v) { playBtn(v).classList.add('is-on'); };
  var hidePlay = function (v) { if (v._btn) v._btn.classList.remove('is-on'); };
  var checkStuck = function (v) {
    clearTimeout(v._stuckT);
    v._stuckT = setTimeout(function () {
      if (wanted.indexOf(v) > -1 && v.paused && v.currentTime === 0) showPlay(v);
    }, 1000);
  };

  vids.forEach(function (v) {
    /* the icon is part of the poster from the first paint — it says "this is
       a video" and is the way in wherever autoplay is refused; `playing`
       takes it away, and it only comes back if the clip stalls while wanted */
    showPlay(v);
    v.addEventListener('playing', function () { hidePlay(v); });
    ['loadeddata', 'canplay', 'canplaythrough'].forEach(function (ev) {
      v.addEventListener(ev, function () { tryPlay(v); });
    });
    /* iOS can silently stall a loop; nudge it back if it is still wanted */
    v.addEventListener('stalled', function () { tryPlay(v); });
    v.addEventListener('pause', function () {
      if (wanted.indexOf(v) > -1 && !document.hidden) setTimeout(function () { tryPlay(v); }, 120);
    });
  });

  var railVids = [].slice.call(document.querySelectorAll('[data-rail] video.v'));
  var plainVids = vids.filter(function (v) { return railVids.indexOf(v) < 0; });

  if (vids.length && 'IntersectionObserver' in window) {
    /* lazy: fetch once the block is within 300px of the viewport */
    var lazyIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        lazyIO.unobserve(e.target);
        loadVid(e.target);
      });
    }, { rootMargin: '600px 0px' });
    vids.forEach(function (v) { if (live) lazyIO.observe(v); });

    /* a rail's off-screen siblings are one swipe away — fetch the whole rail
       as soon as it is near, so card 3 is never a bare poster */
    if (live) {
      [].slice.call(document.querySelectorAll('[data-rail]')).forEach(function (rail) {
        new IntersectionObserver(function (es, ob) {
          es.forEach(function (e) {
            if (!e.isIntersecting) return;
            ob.unobserve(e.target);
            [].slice.call(e.target.querySelectorAll('video.v')).forEach(loadVid);
          });
        }, { rootMargin: '400px' }).observe(rail);
      });
    }

    /* plain blocks play whenever they are on screen at all */
    var plainIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) wantPlay(e.target); else stopPlay(e.target);
      });
    }, { rootMargin: '0px', threshold: 0.15 });
    plainVids.forEach(function (v) { if (live) plainIO.observe(v); });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) vids.forEach(function (v) { v.pause(); });
      else wanted.slice().forEach(tryPlay);
    });
  }

  /* Belt and braces: 2.5 s after load every clip still without a source gets
     one, and anything on screen is asked to play — for viewers where
     IntersectionObserver never fires (hidden preview panes, some webviews). */
  if (live) {
    var sweepVids = function () {
      vids.forEach(function (v) {
        if (!v.dataset.loaded) loadVid(v);
        var r = v.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth) wantPlay(v);
      });
    };
    setTimeout(sweepVids, 2500);
    window.addEventListener('scroll', function () {
      if (v_sweepT) return;
      v_sweepT = setTimeout(function () { v_sweepT = null; sweepVids(); }, 250);
    }, { passive: true });
  }
  var v_sweepT = null;

  /* ── E1 · sticky bar appears once the hero has left ──── */
  var callbar = document.getElementById('callbar');
  var hero = document.getElementById('top');
  if (callbar && !hero) {
    /* subpuslapiai (straipsniai): juosta po pirmo ekrano */
    var syncBarSub = function () { callbar.classList.toggle('is-on', window.scrollY > 320); };
    syncBarSub();
    window.addEventListener('scroll', syncBarSub, { passive: true });
  }
  if (callbar && hero) {
    /* the bar belongs to the page below the hero — drive it from the hero's
       own bottom edge so it is right on the very first frame, before any
       observer has had a chance to fire */
    var syncBar = function () {
      callbar.classList.toggle('is-on', window.scrollY >= hero.offsetHeight);
    };
    syncBar();
    window.addEventListener('scroll', syncBar, { passive: true });
    window.addEventListener('resize', syncBar, { passive: true });
    window.addEventListener('load', syncBar);
  }

  /* ── lightbox ────────────────────────────────────────── */
  var shots = [
    ['gal-m4', 'BMW M4 · matinis žalias kėbulas'],
    ['gal-i5-front', 'BMW i5 · šešiakampis atspindys kapote'],
    ['gal-i5-rear', 'BMW i5 · galas studijos šviesoje']
  ];

  var lb = document.getElementById('lb');
  if (lb) {
  var lbImg = document.getElementById('lbImg');
  var lbCap = document.getElementById('lbCap');
  var idx = 0;
  var lastFocus = null;

  var render = function () {
    var s = shots[idx];
    lbImg.src = 'img/' + s[0] + '.webp';
    lbImg.alt = s[1];
    lbCap.textContent = s[1];
  };
  var lockY = 0;
  var open = function (i) {
    idx = i; lastFocus = document.activeElement;
    render(); lb.hidden = false;
    lockY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = -lockY + 'px';
    document.body.style.width = '100%';
    if (lenis) lenis.stop();
    document.getElementById('lbX').focus();
  };
  var close = function () {
    lb.hidden = true;
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, lockY);
    if (lenis) lenis.start();
    if (lastFocus) lastFocus.focus();
  };
  var step = function (d) {
    idx = (idx + d + shots.length) % shots.length;
    render();
  };

  [].slice.call(document.querySelectorAll('.gal__i')).forEach(function (b) {
    b.addEventListener('click', function () { open(parseInt(b.dataset.i, 10)); });
  });
  document.getElementById('lbX').addEventListener('click', close);
  document.getElementById('lbP').addEventListener('click', function () { step(-1); });
  document.getElementById('lbN').addEventListener('click', function () { step(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
  }

  /* ── form ────────────────────────────────────────────── */
  var form = document.getElementById('form');
  if (form) {
  var status = document.getElementById('status');
  var submit = document.getElementById('submit');
  var fileIn = document.getElementById('f-file');
  var fileNote = document.getElementById('fileNote');
  var MAX = 8 * 1024 * 1024;

  var setErr = function (id, msg) {
    var field = document.getElementById(id).closest('.field');
    field.classList.toggle('is-bad', !!msg);
    field.querySelector('[data-err-for="' + id + '"]').textContent = msg || '';
    return !msg;
  };

  fileIn.addEventListener('change', function () {
    var f = fileIn.files[0];
    if (!f) { fileNote.hidden = true; setErr('f-file', ''); return; }
    if (f.size > MAX) {
      fileNote.hidden = true;
      setErr('f-file', 'Nuotrauka per didelė (' + Math.round(f.size / 1048576) + ' MB). Riba yra 8 MB.');
      return;
    }
    setErr('f-file', '');
    fileNote.hidden = false;
    fileNote.textContent = f.name + ' · ' + Math.max(1, Math.round(f.size / 1024)) + ' KB';
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = document.getElementById('f-name');
    var tel = document.getElementById('f-tel');
    var ok = true;

    ok = setErr('f-name', name.value.trim().length < 2 ? 'Įrašykite vardą.' : '') && ok;
    var digits = tel.value.replace(/\D/g, '');
    ok = setErr('f-tel', digits.length < 8 ? 'Įrašykite telefono numerį, kad galėtume atsakyti.' : '') && ok;
    var f = fileIn.files[0];
    if (f && f.size > MAX) ok = setErr('f-file', 'Nuotrauka per didelė. Riba yra 8 MB.') && ok;

    if (!ok) {
      status.className = 'form__status is-bad';
      status.textContent = 'Patikrinkite pažymėtus laukus.';
      form.querySelector('.is-bad input, .is-bad textarea').focus();
      return;
    }

    var data = new FormData(form);
    data.append('_subject', 'Minerda — užklausa iš svetainės');
    data.append('_captcha', 'false');
    data.append('_template', 'table');

    submit.disabled = true;
    submit.textContent = 'Siunčiama…';
    status.className = 'form__status';
    status.textContent = '';

    fetch(FORM_ENDPOINT, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        form.reset();
        fileNote.hidden = true;
        status.className = 'form__status is-ok';
        status.textContent = 'Užklausa išsiųsta. Susisieksime telefonu artimiausiu metu.';
        submit.textContent = 'Išsiųsta';
      })
      .catch(function () {
        status.className = 'form__status is-bad';
        status.innerHTML = 'Nepavyko išsiųsti. Paskambinkite <a href="tel:+37063333969">+370 633 33969</a> arba parašykite per Messenger.';
        submit.disabled = false;
        submit.textContent = 'Įvertinti pagal nuotrauką';
      });
  });

  }

  /* ?qa=1&y=N — park the page at a fixed offset for screenshot QA. */
  if (qa) {
    var yq = /[?&]y=(\d+)/.exec(location.search);
    if (yq) {
      var jump = function () { window.scrollTo(0, parseInt(yq[1], 10)); };
      jump(); window.addEventListener('load', jump); setTimeout(jump, 300);
    }
  }

  /* ── atsiliepimai: 6 matomi, „Rodyti visus" atveria likusius ── */
  var revList = document.getElementById('rev');
  var revMore = document.getElementById('revMore');
  if (revList && revMore) {
    var revItems = [].slice.call(revList.querySelectorAll('.rev__i'));
    var SHOW = 6;
    if (revItems.length > SHOW) {
      revItems.slice(SHOW).forEach(function (li) { li.hidden = true; });
      revMore.hidden = false;
      revMore.addEventListener('click', function () {
        revItems.slice(SHOW).forEach(function (li) { li.hidden = false; li.classList.add('is-in'); });
        revMore.setAttribute('aria-expanded', 'true');
        revMore.hidden = true;
      });
    }
  }

  /* ── year ────────────────────────────────────────────── */
  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();
})();
