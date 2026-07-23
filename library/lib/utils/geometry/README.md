# Orthogonal edge routing

Four stages turn a diagram into edge polylines. Each solve is a pure function of the
current geometry, so two collaborators and a page reload derive the same picture. Runtime
caches retain only proven results and exact search bounds between frames; cold and warm
execution are required to produce byte-identical routes.

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

## Incremental and Worker execution

The React integration keeps one persistent solve cache per editor. A complete signature
covers each edge's endpoint candidates, local obstacle corridor, relevant neighbouring
segments, port proposals, and authored constraints. Unchanged edges therefore reuse their
exact route; a small bounded history also makes reversible A → B → A gestures reuse the
already-proven A result instead of searching again. When a changed signature still has a
representable previous route, A\* re-prices that route under the new cost field and uses it
as an exact upper bound. It may prune work strictly above the bound, but it must still
explore equal-cost states so deterministic canonical tie-breaking remains identical to a
cold solve.

The first solve and small diagrams run synchronously so geometry is available before
paint. Larger subsequent solves run in a versioned module Worker with one request in
flight and one replaceable pending snapshot. This gives the solver backpressure: a pointer
storm cannot build an obsolete FIFO queue. Above the measured large-scene crossover,
the newest changing snapshot is sampled at an 80 ms cadence. A successful superseded
generation cannot commit, but it can become the display-only route baseline projected onto
the current pointer position. This keeps neighboring edges flowing holistically throughout
a sustained drag without putting routing on the interaction frame. Pointer-up dispatches
the final revision immediately, and only a matching session and latest revision may replace
settled geometry. Because sampled Worker generations can lag a fast pointer, preview-only
hysteresis requires a changed side, port, or route-direction sequence to appear in two
consecutive exact samples before displaying it. Coordinate refinements within the current
decision still flow immediately, and a displayed route that now crosses a solid unrelated
node yields immediately rather than preserving invalid geometry. This filter never enters
the exact cost model, so collaboration and reload determinism remain history-independent. A
customized edge's authored preview stays authoritative throughout. The exact accepted result
then becomes authoritative atomically. When its topology differs from the last display
preview, the rendered path takes a 120 ms orthogonal handoff to the exact route: alternating
horizontal/vertical segments are aligned with zero-length segments before interpolation, so
even different bend counts never produce a diagonal. Exact spatial consumers already see
the accepted generation, and `waitForSettled` resolves only after the display handoff,
preventing export from capturing an intermediate path. Reduced-motion clients skip the
handoff. Label obstacle queries read the node snapshot paired with the same accepted
generation, so a transient drag cannot wake every edge through a second geometry channel.
The interactive React Flow mount viewport-culls DOM elements, while the dedicated export
mount explicitly renders the whole model. Export also waits for the accepted generation
rather than racing a fixed timeout.

`routingConstants.ts` is the Worker-safe leaf for canvas and connector geometry values.
The public constants module re-exports those same objects; the routing kernel must import
the leaf directly so its dependency graph never traverses React components.

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

Container frames are synthetic boundaries, not diagram edges. The solver first prices real
neighbouring routes with the crossing model above, then consults package/pool borders only if
the result would run along or crowd a frame. A clean perpendicular exit from a container is
therefore free, while lying on its outline still triggers a reroute. Keeping those geometries
distinct prevents a necessary package exit from masquerading as an edge crossing and pushing
sibling connectors into the same detour lane.

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

Port balance is measured over the complete side, not just by the ports' centroid. `n` ports
make `n + 1` stretches (one port makes two, two make three), and `sideGapBalance` compares
that whole gap vector with the most even placement available on the 5 px canvas grid. This
catches both a lone off-centre endpoint and a symmetric-but-too-tight group. The joint router
may legitimately move an edge to a different side after node-local coordination; one bounded
feedback candidate therefore reassigns seats from the sides the routes actually chose. That
closes the side → port → route loop without weakening pins, authored bends, or live drag
geometry, and a candidate is accepted only when the whole component score strictly improves.

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
  computation reads, but only the clipped obstacle/edge corridor the search can actually
  reach — remote changes outside that corridor cannot influence or invalidate a route;
- heuristics may change the order of exact A\* work, never the cost being optimized. A
  stronger lower bound is retained only when profiling shows that it saves more work than
  it spends; exact cost/validity checks remain authoritative either way.

`edge-routing-quality.spec.ts` parses the rendered `M`/`L` vertices exactly and guards the
output as measurements — crossings, collinear overlap, corners, straightness, corner-jam,
shared-side centroid balance, lone-port balance, and complete shared-side `n + 1` gap balance
— rather than screenshots or sampled paths. One-grid-cell doglegs therefore remain visible
to the regression suite, while the router can still be rewritten freely as long as the
drawing does not get worse.
