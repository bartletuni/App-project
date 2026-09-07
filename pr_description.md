🎯 What
Optimizes the rendering performance of the animated background and build plate components to reduce lag on slower devices while preserving visual parity.

💡 Why
The `InteractiveBackground` and `BuildPlate` components heavily utilize Canvas 2D API for animations. Prior to these changes, they were computationally expensive due to:
- Changing the `ctx.fillStyle` for every single particle in the background (`~10,000` times per frame).
- Sub-pixel anti-aliasing caused by drawing paths and rects with floating-point coordinates.
- Using `Math.hypot` inside tight loops, which is significantly slower than standard Pythagorean square roots.

✅ Verification
- Ensured Next.js builds properly via `pnpm build`.
- Verified all Jest tests pass via `npx jest`.
- Verified no linting errors exist via `pnpm lint`.

✨ Result
- Interactive Background batches `fillRect` calls by quantizing particle opacities and grouping them, reducing state changes to ~40 per frame.
- Build Plate drawing forces pixel-aligned paths via `Math.round`.
- Distance calculations utilize faster `Math.sqrt` instead of `Math.hypot`.
