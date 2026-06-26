/* =========================================================
   FLUX — Liquid Glass Interface controller
   Builds the control deck and binds it to the fluid sim.
   Exposes window.FluidUI.init(ctx) called from script.js.
   ========================================================= */

(function () {
    'use strict';

    const SVG = {
        play:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path class="ico-play" d="M7 5l12 7-12 7V5z" fill="currentColor" stroke="none"/><g class="ico-pause"><rect x="7" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="13.5" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none"/></g></svg>',
        burst:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none"/></svg>',
        camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5A2.5 2.5 0 015.5 6h1.2l1-1.6A1.5 1.5 0 019 3.7h6a1.5 1.5 0 011.3.7l1 1.6h1.2A2.5 2.5 0 0121 8.5v8A2.5 2.5 0 0118.5 19h-13A2.5 2.5 0 013 16.5z"/><circle cx="12" cy="12.5" r="3.3"/></svg>',
        reset:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4"/></svg>'
    };

    function el(tag, cls, html) {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (html != null) n.innerHTML = html;
        return n;
    }

    function fmt(v, step) {
        if (step >= 1) return Math.round(v).toString();
        return (Math.round(v * 100) / 100).toFixed(2);
    }

    /* -------------------------------------------------------
       Build the scrollable control body (re-runnable on reset)
       ------------------------------------------------------- */
    function buildControls(ctx, onStatsChange) {
        const { config, actions } = ctx;
        const body = document.getElementById('panel-body');
        body.innerHTML = '';

        function section(title) {
            const s = el('div', 'section');
            s.appendChild(el('div', 'section-label', title));
            body.appendChild(s);
            return s;
        }

        function slider(parent, key, name, min, max, step) {
            const wrap = el('div', 'ctrl');
            const top = el('div', 'ctrl-top');
            top.appendChild(el('span', 'ctrl-name', name));
            const val = el('span', 'ctrl-val', fmt(config[key], step));
            top.appendChild(val);
            wrap.appendChild(top);

            const input = el('input');
            input.type = 'range';
            input.min = min; input.max = max; input.step = step;
            input.value = config[key];
            const setFill = () => {
                const p = ((input.value - min) / (max - min)) * 100;
                input.style.setProperty('--p', p + '%');
            };
            setFill();
            input.addEventListener('input', () => {
                config[key] = parseFloat(input.value);
                val.textContent = fmt(config[key], step);
                setFill();
            });
            wrap.appendChild(input);
            parent.appendChild(wrap);
        }

        function toggle(parent, key, name, onChange) {
            const row = el('div', 'toggle-row');
            row.appendChild(el('span', 'ctrl-name', name));
            const sw = el('div', 'switch' + (config[key] ? ' on' : ''));
            sw.setAttribute('role', 'switch');
            sw.setAttribute('aria-checked', String(!!config[key]));
            sw.addEventListener('click', () => {
                config[key] = !config[key];
                sw.classList.toggle('on', config[key]);
                sw.setAttribute('aria-checked', String(config[key]));
                if (onChange) onChange();
            });
            row.appendChild(sw);
            parent.appendChild(row);
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
                    if (onStatsChange) onStatsChange();
                });
                seg.appendChild(b);
            });
            wrap.appendChild(seg);
            parent.appendChild(wrap);
        }

        /* Dynamics */
        const dyn = section('Dynamics');
        slider(dyn, 'DENSITY_DISSIPATION', 'Density Diffusion', 0, 4, 0.01);
        slider(dyn, 'VELOCITY_DISSIPATION', 'Velocity Diffusion', 0, 4, 0.01);
        slider(dyn, 'PRESSURE', 'Pressure', 0, 1, 0.01);
        slider(dyn, 'CURL', 'Vorticity', 0, 50, 1);
        slider(dyn, 'SPLAT_RADIUS', 'Splat Size', 0.01, 1, 0.01);

        /* Appearance */
        const app = section('Appearance');
        toggle(app, 'SHADING', 'Shading', actions.updateKeywords);
        toggle(app, 'COLORFUL', 'Animated Color');
        toggle(app, 'BLOOM', 'Bloom Glow', actions.updateKeywords);
        slider(app, 'BLOOM_INTENSITY', 'Bloom Intensity', 0.1, 2, 0.01);
        toggle(app, 'SUNRAYS', 'Sunrays', actions.updateKeywords);
        slider(app, 'SUNRAYS_WEIGHT', 'Sunray Weight', 0.3, 1, 0.01);

        /* Quality */
        const qual = section('Quality');
        segmented(qual, 'DYE_RESOLUTION', 'Render Quality',
            [['Low', 256], ['Med', 512], ['High', 1024]], actions.initFramebuffers);
        segmented(qual, 'SIM_RESOLUTION', 'Simulation',
            [['64', 64], ['128', 128], ['256', 256]], actions.initFramebuffers);

        /* Capture */
        const cap = section('Capture');
        const colorRow = el('div', 'color-row');
        colorRow.appendChild(el('span', 'ctrl-name', 'Background'));
        const swatch = el('div', 'swatch');
        const color = el('input');
        color.type = 'color';
        const toHex = c => '#' + [c.r, c.g, c.b].map(x => {
            const h = Math.round(x).toString(16); return h.length === 1 ? '0' + h : h;
        }).join('');
        color.value = toHex(config.BACK_COLOR);
        swatch.style.background = color.value;
        color.addEventListener('input', () => {
            const hex = color.value;
            config.BACK_COLOR = {
                r: parseInt(hex.substr(1, 2), 16),
                g: parseInt(hex.substr(3, 2), 16),
                b: parseInt(hex.substr(5, 2), 16)
            };
            swatch.style.background = hex;
        });
        swatch.appendChild(color);
        colorRow.appendChild(swatch);
        cap.appendChild(colorRow);
        toggle(cap, 'TRANSPARENT', 'Transparent');

        const shot = el('button', 'btn btn-accent', SVG.camera + '<span>Save Snapshot</span>');
        shot.style.marginTop = '8px';
        shot.addEventListener('click', actions.captureScreenshot);
        cap.appendChild(shot);

        /* Reset */
        const reset = el('button', 'btn btn-ghost', SVG.reset + '<span>Reset to defaults</span>');
        reset.addEventListener('click', () => {
            actions.reset();
            buildControls(ctx, onStatsChange);
            if (onStatsChange) onStatsChange();
        });
        body.appendChild(reset);
    }

    /* -------------------------------------------------------
       One-time wiring of header, stats, intro
       ------------------------------------------------------- */
    function init(ctx) {
        const { config, splatStack, actions } = ctx;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const g = window.gsap;

        /* Live stats */
        const fpsEl = document.getElementById('stat-fps');
        const qEl = document.getElementById('stat-quality');
        const qualityLabel = () => ({ 256: 'Low', 512: 'Med', 1024: 'High' }[config.DYE_RESOLUTION] || config.DYE_RESOLUTION);
        const updateStats = () => { if (qEl) qEl.textContent = qualityLabel(); };

        buildControls(ctx, updateStats);
        updateStats();

        /* Header buttons */
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

        let panelOpen = window.innerWidth > 720;
        const isDesktop = () => window.innerWidth > 720;
        function setPanel(v, animate) {
            panelOpen = v;
            settingsBtn.classList.toggle('active', v);
            const offY = isDesktop() ? -14 : 40;
            if (g && !reduce && animate) {
                if (v) {
                    panel.style.display = 'flex';
                    g.fromTo(panel, { autoAlpha: 0, y: offY, scale: 0.98 },
                        { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' });
                } else {
                    g.to(panel, { autoAlpha: 0, y: offY, scale: 0.98, duration: 0.32, ease: 'power2.in',
                        onComplete: () => { panel.style.display = 'none'; } });
                }
            } else {
                panel.style.display = v ? 'flex' : 'none';
                if (g) g.set(panel, { autoAlpha: 1, y: 0, scale: 1 });
            }
        }
        settingsBtn.addEventListener('click', () => setPanel(!panelOpen, true));
        closeBtn.addEventListener('click', () => setPanel(false, true));
        setPanel(panelOpen, false);

        /* Keep play/pause icon in sync with the P keyboard shortcut */
        window.addEventListener('keydown', e => { if (e.code === 'KeyP') setTimeout(syncPlay, 0); });

        /* FPS meter, fed by the render loop via FluidUI.onFrame */
        let frames = 0, last = performance.now();
        window.FluidUI.onFrame = function () {
            frames++;
            const now = performance.now();
            if (now - last >= 500) {
                if (fpsEl) fpsEl.textContent = Math.round((frames * 1000) / (now - last));
                frames = 0; last = now;
            }
        };

        /* Dismiss the hint on first interaction */
        const hint = document.getElementById('hint');
        let hinted = false;
        const dismissHint = () => {
            if (hinted || !hint) return;
            hinted = true;
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
            tl.from('[data-anim]', { autoAlpha: 0, y: -18, duration: 0.7, ease: 'power3.out', stagger: 0.07 }, '-=0.2');
            tl.from('#hud', { autoAlpha: 0, y: 18, duration: 0.6, ease: 'power3.out' }, '-=0.4');
            if (isDesktop()) tl.from('#panel', { autoAlpha: 0, x: 26, duration: 0.6, ease: 'power3.out' }, '-=0.5');
        }
    }

    window.FluidUI = {
        init: init,
        onFrame: function () {}
    };
})();
