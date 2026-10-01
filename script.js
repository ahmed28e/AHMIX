/* ==========================================================================
   AHMIX — أحمد عبدالفتاح | التفاعلات والحركات
   وحدات مستقلة: Preloader, Cursor, Particles, Typing, Scroll, Tilt,
   Magnetic, Marquee, Gallery, Lightbox, Toast
   ========================================================================== */

(() => {
  'use strict';

  /* ---------- أدوات مساعدة ---------- */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const rafThrottle = (fn) => {
    let ticking = false;
    return (...args) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { fn(...args); ticking = false; });
    };
  };

  /* ==========================================================================
     1) شاشة الافتتاح
     ========================================================================== */
  const Preloader = (() => {
    const el = $('#preloader');
    const bar = $('#preloaderBar');
    if (!el) return { init: () => {} };

    const start = performance.now();
    const DURATION = 1900;

    const tick = (now) => {
      const t = Math.min((now - start) / DURATION, 1);
      // منحنى تسارع يبدأ سريعًا ويتباطأ في النهاية
      bar.style.width = `${Math.round((1 - Math.pow(1 - t, 3)) * 100)}%`;
      if (t < 1) requestAnimationFrame(tick);
      else finish();
    };

    const finish = () => {
      setTimeout(() => {
        el.classList.add('is-done');
        document.body.classList.remove('is-loading');
        setTimeout(() => el.remove(), 800);
      }, 250);
    };

    return {
      init() {
        document.body.classList.add('is-loading');
        if (prefersReducedMotion) { bar.style.width = '100%'; finish(); return; }
        requestAnimationFrame(tick);
      }
    };
  })();

  /* ==========================================================================
     2) المؤشر المخصص + تأثير مغناطيسي للأزرار
     ========================================================================== */
  const Cursor = (() => {
    if (!isFinePointer || prefersReducedMotion) return { init: () => {} };

    const dot = $('#cursorDot');
    const glow = $('#cursorGlow');
    let mx = -100, my = -100, gx = -100, gy = -100;

    document.body.classList.add('custom-cursor');

    const loop = () => {
      gx += (mx - gx) * 0.16;
      gy += (my - gy) * 0.16;
      dot.style.transform  = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
      glow.style.transform = `translate(${gx}px, ${gy}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    };

    return {
      init() {
        window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
        requestAnimationFrame(loop);

        // تكبير المؤشر فوق العناصر التفاعلية
        const hoverables = 'a, button, [role="button"], .work-media, .g-item, input, textarea';
        document.addEventListener('mouseover', (e) => {
          if (e.target.closest(hoverables)) document.body.classList.add('cursor-hover');
        });
        document.addEventListener('mouseout', (e) => {
          if (e.target.closest(hoverables)) document.body.classList.remove('cursor-hover');
        });

        Magnetic.init();
      }
    };
  })();

  /* تأثير المغناطيس: الأزرار تنجذب نحو المؤشر */
  const Magnetic = (() => {
    const STRENGTH = 0.32;
    return {
      init() {
        if (prefersReducedMotion) return;
        $$('.magnet').forEach((el) => {
          el.addEventListener('mousemove', (e) => {
            const r = el.getBoundingClientRect();
            const x = e.clientX - (r.left + r.width / 2);
            const y = e.clientY - (r.top + r.height / 2);
            el.style.transform = `translate(${x * STRENGTH}px, ${y * STRENGTH}px)`;
          });
          el.addEventListener('mouseleave', () => { el.style.transform = ''; });
        });
      }
    };
  })();

  /* ==========================================================================
     3) جسيمات الخلفية في الواجهة (شبكة مدارات خفيفة)
     ========================================================================== */
  const Particles = (() => {
    const canvas = $('#heroParticles');
    if (!canvas || prefersReducedMotion) return { init: () => {} };

    const ctx = canvas.getContext('2d');
    let particles = [], w = 0, h = 0, dpr = 1;
    const COUNT = 55, LINK_DIST = 130;
    const mouse = { x: -9999, y: -9999 };

    const COLORS = ['139, 92, 246', '79, 124, 255', '47, 217, 255'];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.offsetWidth; h = canvas.offsetHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const create = () => {
      particles = Array.from({ length: COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.8 + 0.6,
        c: COLORS[(Math.random() * COLORS.length) | 0]
      }));
    };

    const step = () => {
      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        // انجذاب خفيف نحو المؤشر
        const dx = mouse.x - p.x, dy = mouse.y - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 160 && dist > 0.001) { p.x += dx / dist * 0.25; p.y += dy / dist * 0.25; }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.c}, 0.75)`;
        ctx.fill();
      }

      // خطوط بين الجسيمات القريبة
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK_DIST) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${(1 - d / LINK_DIST) * 0.16})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(step);
    };

    return {
      init() {
        resize(); create();
        window.addEventListener('resize', rafThrottle(() => { resize(); create(); }), { passive: true });
        canvas.closest('.hero').addEventListener('mousemove', (e) => {
          const r = canvas.getBoundingClientRect();
          mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
        }, { passive: true });
        canvas.closest('.hero').addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });
        requestAnimationFrame(step);
      }
    };
  })();

  /* ==========================================================================
     4) كاتب الأدوار المتغيرة
     ========================================================================== */
  const TypeRotator = (() => {
    const el = $('#typeRotator');
    const WORDS = [
      'صانع محتوى الذكاء الاصطناعي',
      'مطوّر ويب',
      'مصمم جرافيك',
      'مونتير فيديو',
      'مبدع أدوات AI'
    ];
    const TYPE_MS = 55, DELETE_MS = 28, HOLD_MS = 1700;

    return {
      init() {
        if (!el || prefersReducedMotion) { if (el) el.textContent = WORDS[0]; return; }
        let word = 0, char = 0, deleting = false;

        const tick = () => {
          const current = WORDS[word];
          char += deleting ? -1 : 1;
          el.textContent = current.slice(0, char);

          let delay = deleting ? DELETE_MS : TYPE_MS;
          if (!deleting && char === current.length) { delay = HOLD_MS; deleting = true; }
          else if (deleting && char === 0) { deleting = false; word = (word + 1) % WORDS.length; delay = 420; }
          setTimeout(tick, delay);
        };
        setTimeout(tick, 2200); // يبدأ بعد انتهاء شاشة الافتتاح
      }
    };
  })();

  /* ==========================================================================
     5) التمرير: ترويسة ذكية + رابط نشط + شريط تقدم + زر الأعلى
     ========================================================================== */
  const Scroll = (() => {
    const header = $('#siteHeader');
    const bar = $('#scrollProgressBar');
    const toTop = $('#toTop');
    let lastY = 0;

    const onScroll = rafThrottle(() => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;

      header.classList.toggle('is-scrolled', y > 30);
      // إخفاء الترويسة عند النزول وإظهارها عند الصعود
      header.classList.toggle('is-hidden', y > 320 && y > lastY && !document.body.classList.contains('menu-open'));
      lastY = y;

      bar.style.width = `${max > 0 ? (y / max) * 100 : 0}%`;
      toTop.classList.toggle('is-visible', y > 600);

      // الرابط النشط حسب القسم الظاهر (من روابط القائمة نفسها)
      let active = 'home';
      $$('.nav-link').forEach((link) => {
        const sec = $(link.getAttribute('href'));
        if (sec && y >= sec.offsetTop - window.innerHeight * 0.4) active = sec.id;
      });
      $$('.nav-link').forEach((link) => {
        link.classList.toggle('is-active', link.getAttribute('href') === `#${active}`);
      });
    });

    return {
      init() {
        window.addEventListener('scroll', onScroll, { passive: true });
        toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
      }
    };
  })();

  /* ==========================================================================
     6) قائمة الجوال
     ========================================================================== */
  const MobileMenu = (() => {
    const toggle = $('#navToggle');
    const menu = $('#mobileMenu');

    const close = () => {
      toggle.classList.remove('is-open');
      menu.classList.remove('is-open');
      document.body.classList.remove('menu-open');
      document.body.style.overflow = '';
      toggle.setAttribute('aria-expanded', 'false');
    };

    return {
      init() {
        toggle.addEventListener('click', () => {
          const open = !menu.classList.contains('is-open');
          toggle.classList.toggle('is-open', open);
          menu.classList.toggle('is-open', open);
          document.body.classList.toggle('menu-open', open);
          document.body.style.overflow = open ? 'hidden' : '';
          toggle.setAttribute('aria-expanded', String(open));
        });
        $$('.m-link, .m-cta', menu).forEach((a) => a.addEventListener('click', close));
        window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
      }
    };
  })();

  /* ==========================================================================
     7) الظهور عند التمرير
     ========================================================================== */
  const Reveal = (() => {
    return {
      init() {
        if (prefersReducedMotion) { $$('.reveal').forEach((el) => el.classList.add('in-view')); return; }
        const io = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('in-view');
              io.unobserve(entry.target);
            }
          });
        }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
        $$('.reveal').forEach((el) => io.observe(el));
      }
    };
  })();

  /* ==========================================================================
     8) ميلان ثلاثي الأبعاد للبطاقات + توهج يتبع المؤشر
     ========================================================================== */
  const Tilt = (() => {
    const MAX = 8;
    const bind = (el) => {
      let raf = null;
      el.addEventListener('mousemove', (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          el.style.transform = `rotateY(${(px - 0.5) * MAX}deg) rotateX(${(0.5 - py) * MAX}deg)`;
          el.style.setProperty('--mx', `${px * 100}%`);
          el.style.setProperty('--my', `${py * 100}%`);
          raf = null;
        });
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    };
    return {
      init() {
        if (!isFinePointer || prefersReducedMotion) return;
        $$('[data-tilt]').forEach(bind);
      }
    };
  })();

  /* ==========================================================================
     9) الشريط المتحرك (Marquee)
     ========================================================================== */
  const Marquee = (() => {
    const track = $('#marqueeTrack');
    const ITEMS = ['AHMIX', 'AI TOOLS', 'WEB DEVELOPMENT', 'GRAPHIC DESIGN', 'VIDEO EDITING', 'MORE THAN JUST AI'];

    const buildGroup = () => {
      const group = document.createElement('div');
      group.className = 'marquee-item';
      group.innerHTML = ITEMS.map((t, i) =>
        `<span class="${i % 2 ? 'hl' : ''}">${t}</span><span class="star">✦</span>`
      ).join('');
      return group;
    };

    return {
      init() {
        if (!track) return;
        // مجموعتان متطابقتان لتحقيق حلقة لا نهائية (الأنيميشن ينقل 50%)
        track.append(buildGroup(), buildGroup());
      }
    };
  })();

  /* ==========================================================================
     10) المعرض: صفان متعاكسان بتمرير تلقائي
     ========================================================================== */
  const Gallery = (() => {
    const rows = $('#galleryRows');
    const IMAGES = [
      { src: './assets/img/g1_10.jpg', alt: 'من كواليس فيديو نصائح ChatGPT' },
      { src: './assets/img/g2_8.jpg',  alt: 'مشهد من الإعلان المولد بالذكاء الاصطناعي' },
      { src: './assets/img/g1_40.jpg', alt: 'أحمد عبدالفتاح في الاستوديو' },
      { src: './assets/img/g2_15.jpg', alt: 'واجهة كتابة البرومبت بالذكاء الاصطناعي' },
      { src: './assets/img/g1_20.jpg', alt: 'مشهد انتقال بصري من الفيديو التعليمي' },
      { src: './assets/img/g2_22.jpg', alt: 'لقطة من فيديو الذكاء الاصطناعي' },
      { src: './assets/img/creative.jpg', alt: 'الصورة الإبداعية بالذكاء الاصطناعي' },
      { src: './assets/img/g1_2.jpg', alt: 'مقدمة فيديو نصائح ChatGPT' }
    ];
    // تحليل مسار الصورة إلى نسخة كبيرة للعرض المكبر (نستخدم الأصلية للصور المعالجة)
    const FULL = {
      './assets/img/creative.jpg': './assets/img/creative.jpg'
    };

    const buildRow = (items, reverse, widths) => {
      const row = document.createElement('div');
      row.className = `g-row ${reverse ? 'rev' : ''}`;
      // نكرر المجموعة مرتين لحلقة تمرير سلسة
      for (let pass = 0; pass < 2; pass++) {
        items.forEach((img, i) => {
          const btn = document.createElement('button');
          btn.className = 'g-item';
          btn.style.setProperty('--w', widths[i % widths.length]);
          btn.setAttribute('aria-label', `تكبير الصورة: ${img.alt}`);
          btn.innerHTML = `<img src="${img.src}" alt="${img.alt}" loading="lazy">`;
          btn.addEventListener('click', () =>
            Lightbox.openImage(FULL[img.src] || img.src, img.alt)
          );
          row.appendChild(btn);
        });
      }
      return row;
    };

    return {
      init() {
        if (!rows) return;
        const first  = IMAGES.filter((_, i) => i % 2 === 0);
        const second = IMAGES.filter((_, i) => i % 2 === 1);
        rows.append(
          buildRow(first, false, ['300px', '260px', '320px']),
          buildRow(second, true, ['280px', '320px', '260px'])
        );
      }
    };
  })();

  /* ==========================================================================
     11) نافذة العرض: فيديو أو صورة
     ========================================================================== */
  const Lightbox = (() => {
    const box = $('#lightbox');
    const stage = $('#lbStage');
    const title = $('#lbTitle');
    let currentVideo = null;

    const close = () => {
      box.classList.remove('is-open');
      document.body.style.overflow = '';
      if (currentVideo) { currentVideo.pause(); currentVideo = null; }
      setTimeout(() => {
        if (!box.classList.contains('is-open')) { stage.innerHTML = ''; stage.classList.remove('is-wide'); }
      }, 400);
    };

    return {
      openVideo(src, name) {
        stage.classList.remove('is-wide');
        stage.innerHTML = `<video src="${src}" controls autoplay playsinline></video>`;
        title.textContent = name;
        box.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        currentVideo = $('video', stage);
      },
      openImage(src, name) {
        stage.classList.add('is-wide');
        stage.innerHTML = `<img src="${src}" alt="${name}">`;
        title.textContent = name;
        box.classList.add('is-open');
        document.body.style.overflow = 'hidden';
      },
      init() {
        // بطاقات الأعمال + إطارات الشهادات
        $$('.work-media, .cert-frame').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (btn.dataset.video) Lightbox.openVideo(btn.dataset.video, btn.dataset.title);
            else if (btn.dataset.image) Lightbox.openImage(btn.dataset.image, btn.dataset.title);
          });
        });
        $('#lbClose').addEventListener('click', close);
        box.addEventListener('click', (e) => { if (e.target === box) close(); });
        window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && box.classList.contains('is-open')) close(); });
      }
    };
  })();

  /* ==========================================================================
     12) نسخ البريد + رسالة التأكيد
     ========================================================================== */
  const CopyEmail = (() => {
    const card = $('#emailCard');
    const toast = $('#toast');
    let toastTimer = null;

    const showToast = () => {
      toast.classList.add('is-visible');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2400);
    };

    return {
      init() {
        if (!card) return;
        const copy = async () => {
          const email = $('#emailText').textContent.trim();
          try {
            await navigator.clipboard.writeText(email);
          } catch {
            // بديل للمتصفحات التي لا تدعم الحافظة
            const ta = document.createElement('textarea');
            ta.value = email;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
          }
          showToast();
        };
        card.addEventListener('click', copy);
        card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copy(); } });
      }
    };
  })();

  /* ==========================================================================
     13) حركة خفيفة للعناصر العائمة بحركة المؤشر (Parallax)
     ========================================================================== */
  const HeroParallax = (() => {
    return {
      init() {
        if (!isFinePointer || prefersReducedMotion) return;
        const frame = $('#heroFrame');
        const glows = $$('.hero-glow');
        const chips = $$('.float-chip, .float-badge');

        window.addEventListener('mousemove', rafThrottle((e) => {
          const cx = (e.clientX / window.innerWidth - 0.5);
          const cy = (e.clientY / window.innerHeight - 0.5);
          glows.forEach((g, i) => {
            const f = (i + 1) * 14;
            g.style.transform = `translate(${cx * f}px, ${cy * f}px)`;
          });
          chips.forEach((c, i) => {
            const f = 6 + (i % 3) * 4;
            c.style.translate = `${cx * f}px ${cy * f}px`;
          });
          if (frame) frame.style.translate = `${cx * 8}px ${cy * 8}px`;
        }), { passive: true });
      }
    };
  })();

  /* ==========================================================================
     13) العرض المميز: فيديو يعزف تلقائيًا عند الظهور + أوامر متزامنة + صوت
     ========================================================================== */
  const Featured = (() => {
    return {
      init() {
        const stage = $('#featuredStage');
        const video = $('#featuredVideo');
        const playBtn = $('#featuredPlay');
        const soundBtn = $('#featuredSound');
        const soundLabel = $('#featuredSoundLabel');
        const cmds = $$('.featured-commands .cmd');
        if (!video || !stage) return;

        const isPlaying = () => !video.paused && !video.ended;
        const syncStage = () => stage.classList.toggle('is-playing', isPlaying());
        video.addEventListener('play', syncStage);
        video.addEventListener('pause', syncStage);
        video.addEventListener('ended', syncStage);

        // تشغيل تلقائي صامت عند الظهور، وإيقاف عند الخروج — لا تحميل قبل الحاجة
        // مع preload="none" قد يُرفض أول play() أثناء بدء التحميل، لذا نعيد المحاولة عند الجاهزية
        // وقد يوقف موفّر الطاقة الفيديو مؤقتًا — نعيد المحاولة بعدًا محدودًا وعند تفاعل المستخدم
        let wantPlay = false, retries = 0;
        const tryPlay = () => {
          if (!wantPlay || !video.paused) return;
          if (retries >= 8) return;
          retries += 1;
          const p = video.play();
          if (p && p.catch) p.catch(() => setTimeout(tryPlay, 700));
        };
        const io = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            wantPlay = entry.isIntersecting && !prefersReducedMotion;
            retries = 0;
            if (wantPlay) tryPlay();
            else video.pause();
          });
        }, { threshold: 0.35 });
        io.observe(video);
        video.addEventListener('canplay', tryPlay);
        video.addEventListener('loadedmetadata', tryPlay);
        // أي حركة/تفاعل حقيقي داخل القسم إشارة قوية أن الفيديو مشاهد فعلًا
        stage.addEventListener('pointerenter', () => { retries = 0; tryPlay(); });
        stage.addEventListener('click', () => { retries = 0; tryPlay(); });

        // نقر الفيديو أو زر التشغيل
        playBtn.addEventListener('click', () => video.play());
        video.addEventListener('click', () => (video.paused ? video.play() : video.pause()));

        // زر الصوت
        if (soundBtn) {
          soundBtn.addEventListener('click', () => {
            video.muted = !video.muted;
            if (!video.muted && video.paused) video.play().catch(() => {});
            if (soundLabel) soundLabel.textContent = video.muted ? 'شغّل الصوت' : 'اكتم الصوت';
            soundBtn.setAttribute('aria-pressed', String(!video.muted));
          });
        }

        // أزرار الأوامر تضيء بالتزامن مع مشاهد الفيديو: عصف ذهني → إنشاء → تسليم
        if (cmds.length === 3) {
          const MARKS = [8, 20, 39]; // ثواني بداية كل مرحلة (تقريبية حسب الفيديو)
          const syncCmds = () => {
            const t = video.currentTime;
            let idx = 0;
            if (t >= MARKS[2]) idx = 2;
            else if (t >= MARKS[1]) idx = 1;
            cmds.forEach((c, i) => c.classList.toggle('on', isPlaying() && i === idx));
          };
          video.addEventListener('timeupdate', syncCmds);
          video.addEventListener('seeked', syncCmds);
        }
      }
    };
  })();

  /* ==========================================================================
     التشغيل
     ========================================================================== */
  const init = () => {
    Preloader.init();
    Cursor.init();
    Particles.init();
    TypeRotator.init();
    Scroll.init();
    MobileMenu.init();
    Reveal.init();
    Tilt.init();
    Marquee.init();
    Gallery.init();
    Lightbox.init();
    CopyEmail.init();
    HeroParallax.init();
    Featured.init();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
