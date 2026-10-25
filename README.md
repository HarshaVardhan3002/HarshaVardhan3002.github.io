# Sai Harshavardhan

My personal site: **https://harshavardhan3002.github.io**

The whole browser window is a CRT television. The menu is a wall of live channels; pick one and it grows until it fills the tube as that project's page. Scroll past the end, press Escape or Back, and it shrinks back into its tile.

## How it works

- A 2D canvas paints every frame of the picture: text, tiles, live video and teletext pages.
- [react-three-fiber](https://github.com/pmndrs/react-three-fiber) runs the picture through WebGL passes: a [shadergradient](https://github.com/ruucm/shadergradient) background, liquid-glass panels (after [liquid-glass-js](https://github.com/dashersw/liquid-glass-js)), then the CRT tube with curve, scanlines, static and channel changes.
- Clicks are mapped back through the tube's curve, so they land on what you see, even near the bowed edges.
- A hidden HTML copy of every page sits behind the picture for keyboards and screen readers. Without WebGL the site falls back to a plain page.
- Keys: `0` to `9` change channel, arrows choose, Enter opens, Escape goes back.

Built with React, TypeScript, Three.js and Vite, designed and engineered with Claude Code. Deployed by GitHub Actions on every push to `main`.
