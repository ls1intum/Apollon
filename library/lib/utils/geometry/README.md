# Orthogonal edge routing

Four stages turn a diagram into edge polylines. Each is a pure function of the current
geometry — nothing is remembered between frames, so two collaborators and a page reload
derive the same picture.

| Stage                      | File                                      | Decides                                                                      |
| -------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------- |
| Node-local coordination    | `portAssignment.ts`                       | soft side/seat proposals and feasible straight-lane bands                    |
| Joint endpoint/path search | `edgeAnchoring.ts`, `orthogonalRouter.ts` | source side + port, target side + port, and the obstacle/edge-aware polyline |
| Bounded route-set repair   | `edgeGeometrySolver.ts`                   | small interacting-component variants and strictly improving recombination    |
| Final rendering            | `edgeRoute.ts`                            | straight-hook/manual topology and the committed route representation         |

Coordination never pins a free endpoint. It describes shared node capacity and ordering;
the multi-source/multi-target A\* search sees every candidate side and port and may override
the proposal against real obstacles and neighbouring routes. User-authored anchors and bend
topology remain authoritative. Customized endpoints still occupy immutable seats in that
same capacity model, so generated siblings do not disappear from and re-enter coordination
when an edge becomes pinned. During a bend drag the authored polyline is an authoritative
reservation. During an endpoint reconnect the solver instead substitutes the exact edge
semantics pointer-up will commit and routes that predicted edge normally. In both cases
neighbouring automatic routes see the same constraints immediately before and after pointer
release.

`rectSides.ts` owns the vocabulary they share — side normals, facing side, straightness.
Anything both a stage and the router must agree on belongs there; a second copy that
drifts is how this subsystem has broken before.

## Why it is shaped this way

The literature is consistent that fixed-node connector routing wants **one cohesive per-edge
cost inside the search, plus one deterministic ordering stage** — not an unbounded global
optimiser, and not a stack of special cases. `routingCost.ts` is the single scale shared by
side proposals, endpoint placement, A\*, fallback ranking, and route-set repair. A bend costs
40 px and leaving a proposed side costs 35 px, so node-local coordination breaks ties without
overruling a route that can genuinely save a corner. An open-canvas crossing costs 400 px:
enough to prefer several bends and a moderate detour, but not enough to create enormous laps
when crossing is the coherent result. Authored diagonal segments participate in this same
crossing, overlap, and crowding model rather than being approximated as staircases.

For a small interacting edge component with a crossing, overlap, or visibly displaced
shared-side band, Apollon tries a bounded family of deterministic ordering variants.
Disconnected remote edges do not enter that combinatorial budget. Their routes stay fixed,
and component scoring evaluates only focused-edge interactions against the full route set,
instead of repeatedly rescoring fixed-vs-fixed pairs. Individually obstacle-safe routes may
be recombined, but only while a named lexicographic route-set objective strictly improves.
Manual/live/plain-line topology is seeded as immutable geometry in every variant and does
not consume the eight-mutable-edge repair budget. A pinned-only edge keeps its endpoint seats
but its generated route remains mutable, so the optimizer can still remove crossings between
pins.

- **Wybrow, Marriott & Stuckey, _Orthogonal Connector Routing_ (GD 2009)** —
  [PDF](https://users.monash.edu/~mwybrow/papers/wybrow-gd-2009.pdf). Per-connector cost
  monotone in length and bends; a separate ordering/nudging stage. Theorems 3–4 give the
  result `orderSideMembers` relies on: ordering edges by the direction they diverge is
  crossing-minimal for edges sharing a node.
- **Hegemann & Wolff, _A Simple Pipeline for Orthogonal Graph Drawing_ (GD 2023)** —
  [arXiv:2309.01671](https://arxiv.org/abs/2309.01671). Closest published setting to ours
  (free-floating rectangles, no layering): partner direction decides side and order, then
  ports are distributed evenly. `assignPorts` follows this — direction never sets the
  position, only the order.
- **ELK port alignment** —
  [docs](https://eclipse.dev/elk/reference/options/org-eclipse-elk-portAlignment-default.html).
  `DISTRIBUTED` (equal space between and around ports) is what `spreadCoords` implements.
- **yFiles `OrthogonalPatternEdgeRouter`** —
  [docs](https://docs.yworks.com/yfiles/doc/api/y/layout/router/OrthogonalPatternEdgeRouter.html).
  Published cost ratios — bend 1, edge crossing 5, node crossing 50 — which the weights in
  `edgeAnchoring.ts` and `orthogonalRouter.ts` are scaled against.
- **Purchase, _Which aesthetic has the greatest effect on human understanding?_ (GD 1997)** —
  [paper](https://link.springer.com/chapter/10.1007/3-540-63938-1_67). Crossings hurt most,
  bends second. Her UML studies rank the same criteria for class diagrams.
- **Huang et al., on crossing angles** — [arXiv:0810.4431](https://arxiv.org/abs/0810.4431).
  Orthogonal crossings are the least harmful angle, so they remain a valid last resort.
  The per-edge cost still makes an ordinary diagram spend several corners and a moderate
  detour before introducing one; the bounded route-set stage then removes avoidable cases.

## The constraint that governs everything

Automatic anchors are derived, never stored; explicit user pins are document data. If two
peers derive different automatic anchors the document is still converged but the drawings
differ, and the difference is invisible to every test that checks one client. So decisions
must be **totally ordered and exactly computed**:

- no `Math.hypot` / `atan2` on a path that chooses — ECMA-262 leaves their results to the
  engine ([spec](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-function-properties-of-the-math-object));
- comparators must return 0 for equal keys and end in a unique discriminator, or
  `Array.prototype.sort` is free to differ between engines
  ([MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort));
- caches may make things faster, never different: a key must cover every input its
  computation reads.

`edge-routing-quality.spec.ts` parses the rendered `M`/`L` vertices exactly and guards the
output as measurements — crossings, collinear overlap, corners, straightness, corner-jam,
and shared-side centroid balance — rather than screenshots or sampled paths. One-grid-cell
doglegs therefore remain visible to the regression suite, while the router can still be
rewritten freely as long as the drawing does not get worse.
