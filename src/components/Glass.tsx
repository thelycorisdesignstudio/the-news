/**
 * Liquid glass, after Apple's material and the liquid-glass-react technique, rebuilt for a feed that never
 * stops moving.
 *
 * liquid-glass-react bends the backdrop with an SVG displacement filter. In Chromium that filter runs on
 * the CPU and has to be recomputed every frame behind an animated gradient: measured here, it took the feed
 * from ~59fps to ~14fps (one glass pill alone: ~31fps), and Safari can't render it at all. So the same optics
 * are built from GPU-composited layers instead:
 *  - body:  backdrop blur + saturation + a touch of brightness (the frosted body of the glass)
 *  - lens:  a thin ring of sharper, brighter, more saturated backdrop at the edge (the refracting rim)
 *  - tint:  a translucent wash for legibility, tinted red/blue for liked/saved
 *  - rim:   a specular gradient border and inner highlight, with a faint warm/cool chromatic fringe
 * It runs at full frame rate everywhere, including iPhone Safari.
 */
export function GlassBg() {
  return (
    <span className="lg__bg" aria-hidden>
      <span className="lg__body" />
      <span className="lg__lens" />
      <span className="lg__tint" />
      <span className="lg__rim" />
    </span>
  );
}
