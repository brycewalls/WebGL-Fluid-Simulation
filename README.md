# FLUX — Fluid Studio

A modern, **liquid-glass** interface for the classic real-time WebGL fluid
simulation. The original dat.GUI control panel has been replaced with a
glassmorphic control deck featuring custom sliders, toggles, segmented
controls, a live stats HUD, and smooth GSAP-powered motion — fully responsive
down to mobile.

![screenshot](/screenshot.jpg?raw=true)

## Highlights

- **Liquid-glass UI** — frosted, backdrop-blurred panels with vibrant gradient accents over a dark canvas.
- **Live control deck** — dynamics, appearance, quality and capture controls bound directly to the simulation.
- **Stats HUD** — real-time FPS, render quality and engine readout.
- **Mobile-first** — the panel becomes a bottom sheet; touch painting fully supported.
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
