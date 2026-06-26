# FLUX — Fluid Studio

A modern, **liquid-glass** interface for the classic real-time WebGL fluid
simulation. The original dat.GUI control panel has been replaced with a
glassmorphic control deck featuring custom sliders, toggles, segmented
controls, a live stats HUD, and smooth GSAP-powered motion — fully responsive
down to mobile.

![screenshot](/screenshot.jpg?raw=true)

## Highlights

- **Liquid-glass UI** — frosted, backdrop-blurred panels with vibrant gradient accents over a dark canvas.
- **SaaS dashboard shell** — left nav rail, top header with profile, and a card-based inspector.
- **Presets** — one-tap looks (Spectrum, Aurora, Inferno, Neon, Ocean, Glacier) that retune the engine and palette.
- **Live KPI cards** — real-time frame-rate sparkline, render quality and sim resolution.
- **Light & dark themes** — toggle from the header; choice is remembered.
- **Mobile-first** — the inspector becomes a bottom sheet; touch painting fully supported.
- **Motion** — GSAP entrance choreography and micro-interactions (respects `prefers-reduced-motion`).

## Run locally

It's a static site — serve the folder and open it:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

Drag to paint, tap for a burst, and open the controls (top-right) to tune the fluid.

## Credits

Fluid simulation by [Pavel Dobryakov](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation).
Interface redesign uses [GSAP](https://gsap.com).

## References

- https://developer.nvidia.com/gpugems/gpugems/part-vi-beyond-triangles/chapter-38-fast-fluid-dynamics-simulation-gpu
- https://github.com/mharrys/fluids-2d
- https://github.com/haxiomic/GPU-Fluid-Experiments

## License

The code is available under the [MIT license](LICENSE)
