# Orthogonal edge routing

Four stages turn a diagram into edge polylines. Each is a pure function of the current
geometry — nothing is remembered between frames, so two collaborators and a page reload
derive the same picture.

| Stage            | File                                  | Decides                                                       |
| ---------------- | ------------------------------------- | ------------------------------------------------------------- |
| Side assignment  | `portAssignment.ts` (`assignSides`)   | which side of each node an edge leaves from                   |
| Port assignment  | `portAssignment.ts` (`assignPorts`)   | where along that side, and in what order                      |
| Anchor selection | `edgeAnchoring.ts`                    | the winning anchor pair for edges the stages above leave free |
| Routing          | `orthogonalRouter.ts`, `edgeRoute.ts` | the polyline between two fixed anchors                        |

`rectSides.ts` owns the vocabulary they share — side normals, facing side, straightness.
Anything both a stage and the router must agree on belongs there; a second copy that
drifts is how this subsystem has broken before.

## Why it is shaped this way

The literature is consistent that fixed-node connector routing wants **one per-edge cost
inside the search, plus one deterministic ordering stage** — not a single global
optimiser, and not a stack of special cases.

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
  Near-90° crossings are barely harmful, which is why a crossing is priced at ~3 bends here
  rather than the 5 yFiles uses: every crossing in an orthogonal drawing is a right angle.

## The constraint that governs everything

Anchors are derived, never stored. If two peers derive different anchors the document is
still converged but the drawings differ, and the difference is invisible to every test
that checks one client. So decisions must be **totally ordered and exactly computed**:

- no `Math.hypot` / `atan2` on a path that chooses — ECMA-262 leaves their results to the
  engine ([spec](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-function-properties-of-the-math-object));
- comparators must return 0 for equal keys and end in a unique discriminator, or
  `Array.prototype.sort` is free to differ between engines
  ([MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort));
- caches may make things faster, never different: a key must cover every input its
  computation reads.

`edge-routing-quality.spec.ts` guards the output as measurements — crossings, corners,
straightness, corner-jam — rather than pixels, so the router can be rewritten freely as
long as the drawing does not get worse.
