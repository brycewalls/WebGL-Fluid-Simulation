/* =========================================================
   FLUX — Fluid Studio interface controller
   SaaS dashboard shell bound to the WebGL fluid sim.
   Exposes window.FluidUI.init(ctx), called from script.js.
   ========================================================= */

(function () {
    'use strict';

    const ICON = {
        presets:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linejoin="round"><rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6"/></svg>',
        dynamics: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M5 8h9M18 8h1M5 16h1M10 16h9"/><circle cx="16" cy="8" r="2.1"/><circle cx="8" cy="16" r="2.1"/></svg>',
        appearance:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>',
        quality:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 13a5 5 0 015-5M12 21a9 9 0 119-9"/><circle cx="12" cy="13" r="1.4" fill="currentColor" stroke="none"/></svg>',
        capture:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5A2.5 2.5 0 015.5 6h1.2l1-1.6A1.5 1.5 0 019 3.7h6a1.5 1.5 0 011.3.7l1 1.6h1.2A2.5 2.5 0 0121 8.5v8A2.5 2.5 0 0118.5 19h-13A2.5 2.5 0 013 16.5z"/><circle cx="12" cy="12.5" r="3.3"/></svg>',
        reset:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4"/></svg>'
    };

    // Each preset retunes the fluid and constrains the colour palette (hue range).
    const PRESETS = [
        { id: 'spectrum', name: 'Spectrum', sub: 'Full colour', dots: ['#2fe6ff', '#9b6bff', '#ff5ccf'],
          palette: null, config: { COLORFUL: true, CURL: 30, BLOOM_INTENSITY: 0.8, DENSITY_DISSIPATION: 1.0, VELOCITY_DISSIPATION: 0.2 } },
        { id: 'aurora', name: 'Aurora', sub: 'Green · teal', dots: ['#8df56b', '#2fe6ff', '#1bd4a0'],
          palette: { min: 0.33, max: 0.52 }, config: { COLORFUL: true, CURL: 38, BLOOM_INTENSITY: 1.1, DENSITY_DISSIPATION: 0.9, SUNRAYS: true } },
        { id: 'inferno', name: 'Inferno', sub: 'Fire tones', dots: ['#ffb04d', '#ff6a3d', '#ff3d7f'],
          palette: { min: 0.95, max: 1.10 }, config: { COLORFUL: true, CURL: 26, BLOOM_INTENSITY: 1.3, DENSITY_DISSIPATION: 1.1 } },
        { id: 'neon', name: 'Neon', sub: 'Magenta · violet', dots: ['#ff5ccf', '#9b6bff', '#1b96ff'],
          palette: { min: 0.74, max: 0.92 }, config: { COLORFUL: true, CURL: 34, BLOOM_INTENSITY: 1.2 } },
        { id: 'ocean', name: 'Ocean', sub: 'Blue · cyan', dots: ['#1b96ff', '#2fe6ff', '#6a8bff'],
          palette: { min: 0.50, max: 0.66 }, config: { COLORFUL: true, CURL: 30, BLOOM_INTENSITY: 0.9 } },
        { id: 'mono', name: 'Glacier', sub: 'Icy blue', dots: ['#7db8ff', '#9fd0ff', '#5a8bff'],
          palette: { min: 0.55, max: 0.60 }, config: { COLORFUL: true, CURL: 22, BLOOM_INTENSITY: 0.7 } }
    ];

    function el(tag, cls, html) {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (html != null) n.innerHTML = html;
        return n;
    }
    const fmt = (v, step) => step >= 1 ? Math.round(v).toString() : (Math.round(v * 100) / 100).toFixed(2);

    const state = { activePreset: null };

    function animatePresetApply() {
        const g = window.gsap;
        if (!g || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const body = document.getElementById('panel-body');
        if (!body) return;
        g.fromTo(body, { opacity: 0.5 }, { opacity: 1, duration: 0.35, ease: 'power2.out' });
        const active = body.querySelector('.preset.on');
        if (active) g.fromTo(active, { scale: 0.92 }, { scale: 1, duration: 0.55, ease: 'back.out(2.2)' });
    }

    /* -------------------------------------------------------
       Build the inspector body (re-runnable on preset/reset)
       ------------------------------------------------------- */
    function buildControls(ctx, refreshKpis) {
        const { config, splatStack, actions } = ctx;
        const body = document.getElementById('panel-body');
        body.innerHTML = '';

        /* ---- KPI cards ---- */
        const kpis = el('div', 'kpis');
        kpis.appendChild(el('div', 'kpi kpi-fps',
            '<div class="k-row"><div class="k-label"><span class="live-dot"></span>Frame Rate</div>' +
            '<div class="k-val"><span id="stat-fps">60</span><span class="unit"> fps</span></div></div>' +
            '<canvas class="spark" id="fps-spark"></canvas>'));
        kpis.appendChild(el('div', 'kpi',
            '<div class="k-label">Quality</div><div class="k-val" id="stat-quality">High</div>'));
        kpis.appendChild(el('div', 'kpi',
            '<div class="k-label">Sim</div><div class="k-val" id="stat-sim">128</div>'));
        body.appendChild(kpis);
        if (ctx.onKpiBuilt) ctx.onKpiBuilt();

        function card(id, icon, title, meta) {
            const c = el('div', 'card');
            c.id = id;
            const head = el('div', 'card-head');
            head.appendChild(el('div', 'card-ico', icon));
            head.appendChild(el('h3', null, title));
            if (meta) head.appendChild(el('span', 'meta', meta));
            c.appendChild(head);
            body.appendChild(c);
            return c;
        }
        function slider(parent, key, name, min, max, step) {
            const wrap = el('div', 'ctrl');
            const top = el('div', 'ctrl-top');
            top.appendChild(el('span', 'ctrl-name', name));
            const val = el('span', 'ctrl-val', fmt(config[key], step));
            top.appendChild(val); wrap.appendChild(top);
            const input = el('input');
            input.type = 'range'; input.min = min; input.max = max; input.step = step; input.value = config[key];
            const fill = () => input.style.setProperty('--p', ((input.value - min) / (max - min)) * 100 + '%');
            fill();
            input.addEventListener('input', () => {
                config[key] = parseFloat(input.value);
                val.textContent = fmt(config[key], step); fill();
            });
            wrap.appendChild(input); parent.appendChild(wrap);
        }
        function toggle(parent, key, name, onChange) {
            const row = el('div', 'toggle-row');
            row.appendChild(el('span', 'ctrl-name', name));
            const sw = el('div', 'switch' + (config[key] ? ' on' : ''));
            sw.setAttribute('role', 'switch'); sw.setAttribute('aria-checked', String(!!config[key]));
            sw.addEventListener('click', () => {
                config[key] = !config[key];
                sw.classList.toggle('on', config[key]); sw.setAttribute('aria-checked', String(config[key]));
                if (onChange) onChange();
            });
            row.appendChild(sw); parent.appendChild(row);
        }
        function segmented(parent, key, name, options, onChange) {
            const wrap = el('div', 'ctrl');
            wrap.appendChild(el('div', 'ctrl-top', '<span class="ctrl-name">' + name + '</span>'));
            const seg = el('div', 'segmented');
            options.forEach(([label, value]) => {
                const b = el('button', 'seg' + (config[key] === value ? ' on' : ''), label);
                b.addEventListener('click', () => {
                    config[key] = value;
                    seg.querySelectorAll('.seg').forEach(x => x.classList.remove('on'));
                    b.classList.add('on');
                    if (onChange) onChange();
                    if (refreshKpis) refreshKpis();
                });
                seg.appendChild(b);
            });
            wrap.appendChild(seg); parent.appendChild(wrap);
        }

        /* ---- Presets ---- */
        const pCard = card('card-presets', ICON.presets, 'Presets', 'tap to apply');
        pCard.classList.add('pad-b');
        const grid = el('div', 'presets');
        PRESETS.forEach(p => {
            const b = el('button', 'preset' + (state.activePreset === p.id ? ' on' : ''));
            const dots = el('div', 'swatch-dots');
            p.dots.forEach(col => {
                const i = el('i'); i.style.color = col; i.style.background = col; dots.appendChild(i);
            });
            b.appendChild(dots);
            b.appendChild(el('div', 'p-name', p.name));
            b.appendChild(el('div', 'p-sub', p.sub));
            b.addEventListener('click', () => {
                Object.assign(config, p.config);
                config.PALETTE = p.palette || null;
                state.activePreset = p.id;
                actions.updateKeywords();
                splatStack.push(14);
                buildControls(ctx, refreshKpis);
                if (refreshKpis) refreshKpis();
                animatePresetApply();
            });
            grid.appendChild(b);
        });
        pCard.appendChild(grid);

        /* ---- Dynamics ---- */
        const dyn = card('card-dynamics', ICON.dynamics, 'Dynamics');
        slider(dyn, 'DENSITY_DISSIPATION', 'Density Diffusion', 0, 4, 0.01);
        slider(dyn, 'VELOCITY_DISSIPATION', 'Velocity Diffusion', 0, 4, 0.01);
        slider(dyn, 'PRESSURE', 'Pressure', 0, 1, 0.01);
        slider(dyn, 'CURL', 'Vorticity', 0, 50, 1);
        slider(dyn, 'SPLAT_RADIUS', 'Splat Size', 0.01, 1, 0.01);

        /* ---- Appearance ---- */
        const app = card('card-appearance', ICON.appearance, 'Appearance');
        app.classList.add('pad-b');
        toggle(app, 'SHADING', 'Shading', actions.updateKeywords);
        toggle(app, 'COLORFUL', 'Animated Color');
        toggle(app, 'BLOOM', 'Bloom Glow', actions.updateKeywords);
        slider(app, 'BLOOM_INTENSITY', 'Bloom Intensity', 0.1, 2, 0.01);
        toggle(app, 'SUNRAYS', 'Sunrays', actions.updateKeywords);
        slider(app, 'SUNRAYS_WEIGHT', 'Sunray Weight', 0.3, 1, 0.01);

        /* ---- Quality ---- */
        const qual = card('card-quality', ICON.quality, 'Quality');
        qual.classList.add('pad-b');
        segmented(qual, 'DYE_RESOLUTION', 'Render Quality',
            [['Low', 256], ['Med', 512], ['High', 1024]], actions.initFramebuffers);
        segmented(qual, 'SIM_RESOLUTION', 'Simulation',
            [['64', 64], ['128', 128], ['256', 256]], actions.initFramebuffers);

        /* ---- Capture ---- */
        const cap = card('card-capture', ICON.capture, 'Capture');
        cap.classList.add('pad-b');
        const colorRow = el('div', 'color-row');
        colorRow.appendChild(el('span', 'ctrl-name', 'Background'));
        const swatch = el('div', 'swatch');
        const color = el('input'); color.type = 'color';
        const toHex = c => '#' + [c.r, c.g, c.b].map(x => {
            const h = Math.round(x).toString(16); return h.length === 1 ? '0' + h : h;
        }).join('');
        color.value = toHex(config.BACK_COLOR); swatch.style.background = color.value;
        color.addEventListener('input', () => {
            const hex = color.value;
            config.BACK_COLOR = { r: parseInt(hex.substr(1, 2), 16), g: parseInt(hex.substr(3, 2), 16), b: parseInt(hex.substr(5, 2), 16) };
            swatch.style.background = hex;
        });
        swatch.appendChild(color); colorRow.appendChild(swatch); cap.appendChild(colorRow);
        toggle(cap, 'TRANSPARENT', 'Transparent');
        const shot = el('button', 'btn btn-primary', ICON.capture + '<span>Save Snapshot</span>');
        shot.addEventListener('click', actions.captureScreenshot);
        cap.appendChild(shot);

        /* ---- Reset ---- */
        const reset = el('button', 'btn btn-ghost', ICON.reset + '<span>Reset to defaults</span>');
        reset.addEventListener('click', () => {
            actions.reset();
            state.activePreset = null;
            buildControls(ctx, refreshKpis);
            if (refreshKpis) refreshKpis();
        });
        body.appendChild(reset);
    }

    /* -------------------------------------------------------
       One-time wiring
       ------------------------------------------------------- */
    function init(ctx) {
        const { config, splatStack, actions } = ctx;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const g = window.gsap;

        const qualityLabel = () => ({ 256: 'Low', 512: 'Med', 1024: 'High' }[config.DYE_RESOLUTION] || config.DYE_RESOLUTION);
        const refreshKpis = () => {
            const q = document.getElementById('stat-quality');
            const s = document.getElementById('stat-sim');
            if (q) q.textContent = qualityLabel();
            if (s) s.textContent = config.SIM_RESOLUTION;
        };

        buildControls(ctx, refreshKpis);
        refreshKpis();

        const panel = document.getElementById('panel');
        const playBtn = document.getElementById('btn-play');
        const burstBtn = document.getElementById('btn-burst');
        const snapBtn = document.getElementById('btn-snap');
        const settingsBtn = document.getElementById('btn-settings');
        const closeBtn = document.getElementById('panel-close');

        const syncPlay = () => playBtn.classList.toggle('is-paused', config.PAUSED);
        playBtn.addEventListener('click', () => { config.PAUSED = !config.PAUSED; syncPlay(); });
        syncPlay();

        burstBtn.addEventListener('click', () => {
            splatStack.push(Math.floor(Math.random() * 20) + 8);
            if (g && !reduce) g.fromTo(burstBtn, { rotate: 0 }, { rotate: 180, duration: 0.6, ease: 'power2.out' });
        });
        snapBtn.addEventListener('click', actions.captureScreenshot);

        /* Theme toggle (persisted) */
        const themeBtn = document.getElementById('btn-theme');
        if (themeBtn) themeBtn.addEventListener('click', () => {
            const light = document.documentElement.classList.toggle('light');
            try { localStorage.setItem('flux-theme', light ? 'light' : 'dark'); } catch (e) {}
            drawSpark();
        });

        /* Panel open / close */
        let open = window.innerWidth > 720;
        const isDesktop = () => window.innerWidth > 720;
        function setPanel(v, animate) {
            open = v;
            settingsBtn.classList.toggle('active', v);
            const offY = isDesktop() ? 0 : 40;
            const offX = isDesktop() ? 26 : 0;
            if (g && !reduce && animate) {
                if (v) {
                    panel.style.display = 'flex';
                    g.fromTo(panel, { autoAlpha: 0, x: offX, y: offY }, { autoAlpha: 1, x: 0, y: 0, duration: 0.5, ease: 'power3.out' });
                } else {
                    g.to(panel, { autoAlpha: 0, x: offX, y: offY, duration: 0.3, ease: 'power2.in', onComplete: () => { panel.style.display = 'none'; } });
                }
            } else {
                panel.style.display = v ? 'flex' : 'none';
                if (g) g.set(panel, { autoAlpha: 1, x: 0, y: 0 });
            }
            if (v && typeof setupSpark === 'function') requestAnimationFrame(setupSpark);
        }
        settingsBtn.addEventListener('click', () => setPanel(!open, true));
        closeBtn.addEventListener('click', () => setPanel(false, true));
        setPanel(open, false);

        /* Rail nav: scroll to card + scroll-spy */
        const navBtns = Array.from(document.querySelectorAll('.nav-btn[data-target]'));
        const ghBtn = document.getElementById('nav-github');
        if (ghBtn) ghBtn.addEventListener('click', () => window.open('https://github.com/PavelDoGreat/WebGL-Fluid-Simulation', '_blank'));
        const panelBody = document.getElementById('panel-body');
        navBtns.forEach(btn => btn.addEventListener('click', () => {
            if (!open) setPanel(true, true);
            const target = document.getElementById(btn.dataset.target);
            if (target) {
                const top = target.offsetTop - 8;
                panelBody.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
            }
            navBtns.forEach(b => b.classList.remove('on'));
            btn.classList.add('on');
        }));
        panelBody.addEventListener('scroll', () => {
            const y = panelBody.scrollTop + 60;
            let current = navBtns[0];
            navBtns.forEach(btn => {
                const t = document.getElementById(btn.dataset.target);
                if (t && t.offsetTop <= y) current = btn;
            });
            navBtns.forEach(b => b.classList.toggle('on', b === current));
        }, { passive: true });

        /* Keep play icon synced with the P shortcut */
        window.addEventListener('keydown', e => { if (e.code === 'KeyP') setTimeout(syncPlay, 0); });

        /* FPS meter + live sparkline, fed by the render loop */
        const MAX_SAMPLES = 60;
        const samples = [];
        let spark = null; // { canvas, cx, w, h }

        function setupSpark() {
            const canvas = document.getElementById('fps-spark');
            if (!canvas) { spark = null; return; }
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const w = canvas.clientWidth || 300, h = canvas.clientHeight || 20;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            const cx = canvas.getContext('2d');
            cx.scale(dpr, dpr);
            spark = { canvas, cx, w, h };
            drawSpark();
        }

        function drawSpark() {
            if (!spark) return;
            const { cx, w, h } = spark;
            cx.clearRect(0, 0, w, h);
            if (samples.length < 2) return;
            const max = Math.max(60, ...samples);
            const n = samples.length;
            const x = i => (i / (MAX_SAMPLES - 1)) * w;
            const y = v => h - 2 - (v / max) * (h - 4);
            const start = MAX_SAMPLES - n;

            // soft fill under the curve
            const fill = cx.createLinearGradient(0, 0, 0, h);
            fill.addColorStop(0, 'rgba(43,150,255,0.34)');
            fill.addColorStop(1, 'rgba(43,150,255,0)');
            cx.beginPath();
            cx.moveTo(x(start), h);
            samples.forEach((v, i) => cx.lineTo(x(start + i), y(v)));
            cx.lineTo(x(MAX_SAMPLES - 1), h);
            cx.closePath();
            cx.fillStyle = fill;
            cx.fill();

            // line
            const line = cx.createLinearGradient(0, 0, w, 0);
            line.addColorStop(0, '#1b96ff');
            line.addColorStop(1, '#2fe6ff');
            cx.beginPath();
            samples.forEach((v, i) => { const px = x(start + i), py = y(v); i ? cx.lineTo(px, py) : cx.moveTo(px, py); });
            cx.strokeStyle = line;
            cx.lineWidth = 2; cx.lineJoin = 'round'; cx.lineCap = 'round';
            cx.stroke();

            // head dot
            const lastX = x(MAX_SAMPLES - 1), lastY = y(samples[n - 1]);
            cx.beginPath(); cx.arc(lastX, lastY, 2.2, 0, Math.PI * 2);
            cx.fillStyle = '#2fe6ff'; cx.fill();
        }

        // Re-acquire the sparkline canvas whenever the inspector body is rebuilt.
        ctx.onKpiBuilt = setupSpark;
        setupSpark();
        window.addEventListener('resize', setupSpark);

        let frames = 0, last = performance.now();
        window.FluidUI.onFrame = function () {
            frames++;
            const now = performance.now();
            if (now - last >= 500) {
                const fps = Math.round((frames * 1000) / (now - last));
                const fpsEl = document.getElementById('stat-fps');
                if (fpsEl) fpsEl.textContent = fps;
                samples.push(fps);
                if (samples.length > MAX_SAMPLES) samples.shift();
                drawSpark();
                frames = 0; last = now;
            }
        };

        /* Hint dismissal */
        const hint = document.getElementById('hint');
        let hinted = false;
        const dismissHint = () => {
            if (hinted || !hint) return; hinted = true;
            if (g && !reduce) g.to(hint, { autoAlpha: 0, y: 14, duration: 0.6, ease: 'power2.out' });
            else hint.style.display = 'none';
        };
        window.addEventListener('pointerdown', dismissHint, { once: true });
        setTimeout(dismissHint, 8000);

        /* Intro reveal */
        const loader = document.getElementById('loader');
        if (!g || reduce) {
            if (loader) loader.style.display = 'none';
        } else {
            const tl = g.timeline();
            tl.to(loader, { autoAlpha: 0, duration: 0.6, ease: 'power2.inOut', delay: 0.4,
                onComplete: () => { if (loader) loader.style.display = 'none'; } });
            tl.from('#rail', { autoAlpha: 0, x: -24, duration: 0.6, ease: 'power3.out' }, '-=0.2');
            tl.from('.topbar', { autoAlpha: 0, y: -18, duration: 0.6, ease: 'power3.out' }, '-=0.45');
            if (isDesktop()) tl.from('#panel', { autoAlpha: 0, x: 26, duration: 0.6, ease: 'power3.out' }, '-=0.45');
            tl.from('#hint', { autoAlpha: 0, y: 14, duration: 0.5, ease: 'power3.out' }, '-=0.35');
        }
    }

    window.FluidUI = { init: init, onFrame: function () {} };
})();
