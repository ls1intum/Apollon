;(function () {
  var e = { value: () => {} }
  function t() {
    for (var e = 0, t = arguments.length, r = {}, i; e < t; ++e) {
      if (!(i = arguments[e] + ``) || i in r || /[\s.]/.test(i))
        throw Error(`illegal type: ` + i)
      r[i] = []
    }
    return new n(r)
  }
  function n(e) {
    this._ = e
  }
  function r(e, t) {
    return e
      .trim()
      .split(/^|\s+/)
      .map(function (e) {
        var n = ``,
          r = e.indexOf(`.`)
        if (
          (r >= 0 && ((n = e.slice(r + 1)), (e = e.slice(0, r))),
          e && !t.hasOwnProperty(e))
        )
          throw Error(`unknown type: ` + e)
        return { type: e, name: n }
      })
  }
  n.prototype = t.prototype = {
    constructor: n,
    on: function (e, t) {
      var n = this._,
        o = r(e + ``, n),
        s,
        c = -1,
        l = o.length
      if (arguments.length < 2) {
        for (; ++c < l; )
          if ((s = (e = o[c]).type) && (s = i(n[s], e.name))) return s
        return
      }
      if (t != null && typeof t != `function`)
        throw Error(`invalid callback: ` + t)
      for (; ++c < l; )
        if ((s = (e = o[c]).type)) n[s] = a(n[s], e.name, t)
        else if (t == null) for (s in n) n[s] = a(n[s], e.name, null)
      return this
    },
    copy: function () {
      var e = {},
        t = this._
      for (var r in t) e[r] = t[r].slice()
      return new n(e)
    },
    call: function (e, t) {
      if ((i = arguments.length - 2) > 0)
        for (var n = Array(i), r = 0, i, a; r < i; ++r) n[r] = arguments[r + 2]
      if (!this._.hasOwnProperty(e)) throw Error(`unknown type: ` + e)
      for (a = this._[e], r = 0, i = a.length; r < i; ++r)
        a[r].value.apply(t, n)
    },
    apply: function (e, t, n) {
      if (!this._.hasOwnProperty(e)) throw Error(`unknown type: ` + e)
      for (var r = this._[e], i = 0, a = r.length; i < a; ++i)
        r[i].value.apply(t, n)
    },
  }
  function i(e, t) {
    for (var n = 0, r = e.length, i; n < r; ++n)
      if ((i = e[n]).name === t) return i.value
  }
  function a(t, n, r) {
    for (var i = 0, a = t.length; i < a; ++i)
      if (t[i].name === n) {
        ;((t[i] = e), (t = t.slice(0, i).concat(t.slice(i + 1))))
        break
      }
    return (r != null && t.push({ name: n, value: r }), t)
  }
  function o(e) {
    return function () {
      return this.matches(e)
    }
  }
  function s(e) {
    return function (t) {
      return t.matches(e)
    }
  }
  var c = {
    svg: `http://www.w3.org/2000/svg`,
    xhtml: `http://www.w3.org/1999/xhtml`,
    xlink: `http://www.w3.org/1999/xlink`,
    xml: `http://www.w3.org/XML/1998/namespace`,
    xmlns: `http://www.w3.org/2000/xmlns/`,
  }
  function l(e) {
    var t = (e += ``),
      n = t.indexOf(`:`)
    return (
      n >= 0 && (t = e.slice(0, n)) !== `xmlns` && (e = e.slice(n + 1)),
      c.hasOwnProperty(t) ? { space: c[t], local: e } : e
    )
  }
  function u() {}
  function d(e) {
    return e == null
      ? u
      : function () {
          return this.querySelector(e)
        }
  }
  function f(e) {
    typeof e != `function` && (e = d(e))
    for (var t = this._groups, n = t.length, r = Array(n), i = 0; i < n; ++i)
      for (
        var a = t[i], o = a.length, s = (r[i] = Array(o)), c, l, u = 0;
        u < o;
        ++u
      )
        (c = a[u]) &&
          (l = e.call(c, c.__data__, u, a)) &&
          (`__data__` in c && (l.__data__ = c.__data__), (s[u] = l))
    return new ht(r, this._parents)
  }
  function p(e) {
    return e == null ? [] : Array.isArray(e) ? e : Array.from(e)
  }
  function m() {
    return []
  }
  function h(e) {
    return e == null
      ? m
      : function () {
          return this.querySelectorAll(e)
        }
  }
  function g(e) {
    return function () {
      return p(e.apply(this, arguments))
    }
  }
  function _(e) {
    e = typeof e == `function` ? g(e) : h(e)
    for (var t = this._groups, n = t.length, r = [], i = [], a = 0; a < n; ++a)
      for (var o = t[a], s = o.length, c, l = 0; l < s; ++l)
        (c = o[l]) && (r.push(e.call(c, c.__data__, l, o)), i.push(c))
    return new ht(r, i)
  }
  var v = Array.prototype.find
  function y(e) {
    return function () {
      return v.call(this.children, e)
    }
  }
  function b() {
    return this.firstElementChild
  }
  function x(e) {
    return this.select(e == null ? b : y(typeof e == `function` ? e : s(e)))
  }
  var S = Array.prototype.filter
  function C() {
    return Array.from(this.children)
  }
  function w(e) {
    return function () {
      return S.call(this.children, e)
    }
  }
  function T(e) {
    return this.selectAll(e == null ? C : w(typeof e == `function` ? e : s(e)))
  }
  function E(e) {
    typeof e != `function` && (e = o(e))
    for (var t = this._groups, n = t.length, r = Array(n), i = 0; i < n; ++i)
      for (var a = t[i], s = a.length, c = (r[i] = []), l, u = 0; u < s; ++u)
        (l = a[u]) && e.call(l, l.__data__, u, a) && c.push(l)
    return new ht(r, this._parents)
  }
  function ee(e) {
    return Array(e.length)
  }
  function te() {
    return new ht(this._enter || this._groups.map(ee), this._parents)
  }
  function D(e, t) {
    ;((this.ownerDocument = e.ownerDocument),
      (this.namespaceURI = e.namespaceURI),
      (this._next = null),
      (this._parent = e),
      (this.__data__ = t))
  }
  D.prototype = {
    constructor: D,
    appendChild: function (e) {
      return this._parent.insertBefore(e, this._next)
    },
    insertBefore: function (e, t) {
      return this._parent.insertBefore(e, t)
    },
    querySelector: function (e) {
      return this._parent.querySelector(e)
    },
    querySelectorAll: function (e) {
      return this._parent.querySelectorAll(e)
    },
  }
  function O(e) {
    return function () {
      return e
    }
  }
  function ne(e, t, n, r, i, a) {
    for (var o = 0, s, c = t.length, l = a.length; o < l; ++o)
      (s = t[o]) ? ((s.__data__ = a[o]), (r[o] = s)) : (n[o] = new D(e, a[o]))
    for (; o < c; ++o) (s = t[o]) && (i[o] = s)
  }
  function re(e, t, n, r, i, a, o) {
    var s,
      c,
      l = new Map(),
      u = t.length,
      d = a.length,
      f = Array(u),
      p
    for (s = 0; s < u; ++s)
      (c = t[s]) &&
        ((f[s] = p = o.call(c, c.__data__, s, t) + ``),
        l.has(p) ? (i[s] = c) : l.set(p, c))
    for (s = 0; s < d; ++s)
      ((p = o.call(e, a[s], s, a) + ``),
        (c = l.get(p))
          ? ((r[s] = c), (c.__data__ = a[s]), l.delete(p))
          : (n[s] = new D(e, a[s])))
    for (s = 0; s < u; ++s) (c = t[s]) && l.get(f[s]) === c && (i[s] = c)
  }
  function k(e) {
    return e.__data__
  }
  function A(e, t) {
    if (!arguments.length) return Array.from(this, k)
    var n = t ? re : ne,
      r = this._parents,
      i = this._groups
    typeof e != `function` && (e = O(e))
    for (
      var a = i.length, o = Array(a), s = Array(a), c = Array(a), l = 0;
      l < a;
      ++l
    ) {
      var u = r[l],
        d = i[l],
        f = d.length,
        p = ie(e.call(u, u && u.__data__, l, r)),
        m = p.length,
        h = (s[l] = Array(m)),
        g = (o[l] = Array(m))
      n(u, d, h, g, (c[l] = Array(f)), p, t)
      for (var _ = 0, v = 0, y, b; _ < m; ++_)
        if ((y = h[_])) {
          for (_ >= v && (v = _ + 1); !(b = g[v]) && ++v < m; );
          y._next = b || null
        }
    }
    return ((o = new ht(o, r)), (o._enter = s), (o._exit = c), o)
  }
  function ie(e) {
    return typeof e == `object` && `length` in e ? e : Array.from(e)
  }
  function ae() {
    return new ht(this._exit || this._groups.map(ee), this._parents)
  }
  function j(e, t, n) {
    var r = this.enter(),
      i = this,
      a = this.exit()
    return (
      typeof e == `function`
        ? ((r = e(r)), (r &&= r.selection()))
        : (r = r.append(e + ``)),
      t != null && ((i = t(i)), (i &&= i.selection())),
      n == null ? a.remove() : n(a),
      r && i ? r.merge(i).order() : i
    )
  }
  function M(e) {
    for (
      var t = e.selection ? e.selection() : e,
        n = this._groups,
        r = t._groups,
        i = n.length,
        a = r.length,
        o = Math.min(i, a),
        s = Array(i),
        c = 0;
      c < o;
      ++c
    )
      for (
        var l = n[c], u = r[c], d = l.length, f = (s[c] = Array(d)), p, m = 0;
        m < d;
        ++m
      )
        (p = l[m] || u[m]) && (f[m] = p)
    for (; c < i; ++c) s[c] = n[c]
    return new ht(s, this._parents)
  }
  function N() {
    for (var e = this._groups, t = -1, n = e.length; ++t < n; )
      for (var r = e[t], i = r.length - 1, a = r[i], o; --i >= 0; )
        (o = r[i]) &&
          (a &&
            o.compareDocumentPosition(a) ^ 4 &&
            a.parentNode.insertBefore(o, a),
          (a = o))
    return this
  }
  function oe(e) {
    e ||= se
    function t(t, n) {
      return t && n ? e(t.__data__, n.__data__) : !t - !n
    }
    for (var n = this._groups, r = n.length, i = Array(r), a = 0; a < r; ++a) {
      for (
        var o = n[a], s = o.length, c = (i[a] = Array(s)), l, u = 0;
        u < s;
        ++u
      )
        (l = o[u]) && (c[u] = l)
      c.sort(t)
    }
    return new ht(i, this._parents).order()
  }
  function se(e, t) {
    return e < t ? -1 : e > t ? 1 : e >= t ? 0 : NaN
  }
  function ce() {
    var e = arguments[0]
    return ((arguments[0] = this), e.apply(null, arguments), this)
  }
  function le() {
    return Array.from(this)
  }
  function ue() {
    for (var e = this._groups, t = 0, n = e.length; t < n; ++t)
      for (var r = e[t], i = 0, a = r.length; i < a; ++i) {
        var o = r[i]
        if (o) return o
      }
    return null
  }
  function de() {
    let e = 0
    for (let t of this) ++e
    return e
  }
  function fe() {
    return !this.node()
  }
  function pe(e) {
    for (var t = this._groups, n = 0, r = t.length; n < r; ++n)
      for (var i = t[n], a = 0, o = i.length, s; a < o; ++a)
        (s = i[a]) && e.call(s, s.__data__, a, i)
    return this
  }
  function me(e) {
    return function () {
      this.removeAttribute(e)
    }
  }
  function he(e) {
    return function () {
      this.removeAttributeNS(e.space, e.local)
    }
  }
  function ge(e, t) {
    return function () {
      this.setAttribute(e, t)
    }
  }
  function _e(e, t) {
    return function () {
      this.setAttributeNS(e.space, e.local, t)
    }
  }
  function P(e, t) {
    return function () {
      var n = t.apply(this, arguments)
      n == null ? this.removeAttribute(e) : this.setAttribute(e, n)
    }
  }
  function F(e, t) {
    return function () {
      var n = t.apply(this, arguments)
      n == null
        ? this.removeAttributeNS(e.space, e.local)
        : this.setAttributeNS(e.space, e.local, n)
    }
  }
  function ve(e, t) {
    var n = l(e)
    if (arguments.length < 2) {
      var r = this.node()
      return n.local ? r.getAttributeNS(n.space, n.local) : r.getAttribute(n)
    }
    return this.each(
      (t == null
        ? n.local
          ? he
          : me
        : typeof t == `function`
          ? n.local
            ? F
            : P
          : n.local
            ? _e
            : ge)(n, t)
    )
  }
  function ye(e) {
    return (
      (e.ownerDocument && e.ownerDocument.defaultView) ||
      (e.document && e) ||
      e.defaultView
    )
  }
  function be(e) {
    return function () {
      this.style.removeProperty(e)
    }
  }
  function I(e, t, n) {
    return function () {
      this.style.setProperty(e, t, n)
    }
  }
  function xe(e, t, n) {
    return function () {
      var r = t.apply(this, arguments)
      r == null ? this.style.removeProperty(e) : this.style.setProperty(e, r, n)
    }
  }
  function L(e, t, n) {
    return arguments.length > 1
      ? this.each(
          (t == null ? be : typeof t == `function` ? xe : I)(e, t, n ?? ``)
        )
      : R(this.node(), e)
  }
  function R(e, t) {
    return (
      e.style.getPropertyValue(t) ||
      ye(e).getComputedStyle(e, null).getPropertyValue(t)
    )
  }
  function Se(e) {
    return function () {
      delete this[e]
    }
  }
  function Ce(e, t) {
    return function () {
      this[e] = t
    }
  }
  function we(e, t) {
    return function () {
      var n = t.apply(this, arguments)
      n == null ? delete this[e] : (this[e] = n)
    }
  }
  function Te(e, t) {
    return arguments.length > 1
      ? this.each((t == null ? Se : typeof t == `function` ? we : Ce)(e, t))
      : this.node()[e]
  }
  function Ee(e) {
    return e.trim().split(/^|\s+/)
  }
  function De(e) {
    return e.classList || new Oe(e)
  }
  function Oe(e) {
    ;((this._node = e), (this._names = Ee(e.getAttribute(`class`) || ``)))
  }
  Oe.prototype = {
    add: function (e) {
      this._names.indexOf(e) < 0 &&
        (this._names.push(e),
        this._node.setAttribute(`class`, this._names.join(` `)))
    },
    remove: function (e) {
      var t = this._names.indexOf(e)
      t >= 0 &&
        (this._names.splice(t, 1),
        this._node.setAttribute(`class`, this._names.join(` `)))
    },
    contains: function (e) {
      return this._names.indexOf(e) >= 0
    },
  }
  function ke(e, t) {
    for (var n = De(e), r = -1, i = t.length; ++r < i; ) n.add(t[r])
  }
  function Ae(e, t) {
    for (var n = De(e), r = -1, i = t.length; ++r < i; ) n.remove(t[r])
  }
  function je(e) {
    return function () {
      ke(this, e)
    }
  }
  function Me(e) {
    return function () {
      Ae(this, e)
    }
  }
  function Ne(e, t) {
    return function () {
      ;(t.apply(this, arguments) ? ke : Ae)(this, e)
    }
  }
  function Pe(e, t) {
    var n = Ee(e + ``)
    if (arguments.length < 2) {
      for (var r = De(this.node()), i = -1, a = n.length; ++i < a; )
        if (!r.contains(n[i])) return !1
      return !0
    }
    return this.each((typeof t == `function` ? Ne : t ? je : Me)(n, t))
  }
  function Fe() {
    this.textContent = ``
  }
  function Ie(e) {
    return function () {
      this.textContent = e
    }
  }
  function Le(e) {
    return function () {
      var t = e.apply(this, arguments)
      this.textContent = t ?? ``
    }
  }
  function Re(e) {
    return arguments.length
      ? this.each(e == null ? Fe : (typeof e == `function` ? Le : Ie)(e))
      : this.node().textContent
  }
  function ze() {
    this.innerHTML = ``
  }
  function Be(e) {
    return function () {
      this.innerHTML = e
    }
  }
  function Ve(e) {
    return function () {
      var t = e.apply(this, arguments)
      this.innerHTML = t ?? ``
    }
  }
  function He(e) {
    return arguments.length
      ? this.each(e == null ? ze : (typeof e == `function` ? Ve : Be)(e))
      : this.node().innerHTML
  }
  function Ue() {
    this.nextSibling && this.parentNode.appendChild(this)
  }
  function We() {
    return this.each(Ue)
  }
  function Ge() {
    this.previousSibling &&
      this.parentNode.insertBefore(this, this.parentNode.firstChild)
  }
  function Ke() {
    return this.each(Ge)
  }
  function qe(e) {
    return function () {
      var t = this.ownerDocument,
        n = this.namespaceURI
      return n === `http://www.w3.org/1999/xhtml` &&
        t.documentElement.namespaceURI === `http://www.w3.org/1999/xhtml`
        ? t.createElement(e)
        : t.createElementNS(n, e)
    }
  }
  function Je(e) {
    return function () {
      return this.ownerDocument.createElementNS(e.space, e.local)
    }
  }
  function Ye(e) {
    var t = l(e)
    return (t.local ? Je : qe)(t)
  }
  function Xe(e) {
    var t = typeof e == `function` ? e : Ye(e)
    return this.select(function () {
      return this.appendChild(t.apply(this, arguments))
    })
  }
  function Ze() {
    return null
  }
  function z(e, t) {
    var n = typeof e == `function` ? e : Ye(e),
      r = t == null ? Ze : typeof t == `function` ? t : d(t)
    return this.select(function () {
      return this.insertBefore(
        n.apply(this, arguments),
        r.apply(this, arguments) || null
      )
    })
  }
  function Qe() {
    var e = this.parentNode
    e && e.removeChild(this)
  }
  function $e() {
    return this.each(Qe)
  }
  function et() {
    var e = this.cloneNode(!1),
      t = this.parentNode
    return t ? t.insertBefore(e, this.nextSibling) : e
  }
  function tt() {
    var e = this.cloneNode(!0),
      t = this.parentNode
    return t ? t.insertBefore(e, this.nextSibling) : e
  }
  function nt(e) {
    return this.select(e ? tt : et)
  }
  function rt(e) {
    return arguments.length
      ? this.property(`__data__`, e)
      : this.node().__data__
  }
  function it(e) {
    return function (t) {
      e.call(this, t, this.__data__)
    }
  }
  function at(e) {
    return e
      .trim()
      .split(/^|\s+/)
      .map(function (e) {
        var t = ``,
          n = e.indexOf(`.`)
        return (
          n >= 0 && ((t = e.slice(n + 1)), (e = e.slice(0, n))),
          { type: e, name: t }
        )
      })
  }
  function ot(e) {
    return function () {
      var t = this.__on
      if (t) {
        for (var n = 0, r = -1, i = t.length, a; n < i; ++n)
          ((a = t[n]),
            (!e.type || a.type === e.type) && a.name === e.name
              ? this.removeEventListener(a.type, a.listener, a.options)
              : (t[++r] = a))
        ++r ? (t.length = r) : delete this.__on
      }
    }
  }
  function st(e, t, n) {
    return function () {
      var r = this.__on,
        i,
        a = it(t)
      if (r) {
        for (var o = 0, s = r.length; o < s; ++o)
          if ((i = r[o]).type === e.type && i.name === e.name) {
            ;(this.removeEventListener(i.type, i.listener, i.options),
              this.addEventListener(i.type, (i.listener = a), (i.options = n)),
              (i.value = t))
            return
          }
      }
      ;(this.addEventListener(e.type, a, n),
        (i = { type: e.type, name: e.name, value: t, listener: a, options: n }),
        r ? r.push(i) : (this.__on = [i]))
    }
  }
  function ct(e, t, n) {
    var r = at(e + ``),
      i,
      a = r.length,
      o
    if (arguments.length < 2) {
      var s = this.node().__on
      if (s) {
        for (var c = 0, l = s.length, u; c < l; ++c)
          for (i = 0, u = s[c]; i < a; ++i)
            if ((o = r[i]).type === u.type && o.name === u.name) return u.value
      }
      return
    }
    for (s = t ? st : ot, i = 0; i < a; ++i) this.each(s(r[i], t, n))
    return this
  }
  function lt(e, t, n) {
    var r = ye(e),
      i = r.CustomEvent
    ;(typeof i == `function`
      ? (i = new i(t, n))
      : ((i = r.document.createEvent(`Event`)),
        n
          ? (i.initEvent(t, n.bubbles, n.cancelable), (i.detail = n.detail))
          : i.initEvent(t, !1, !1)),
      e.dispatchEvent(i))
  }
  function ut(e, t) {
    return function () {
      return lt(this, e, t)
    }
  }
  function dt(e, t) {
    return function () {
      return lt(this, e, t.apply(this, arguments))
    }
  }
  function ft(e, t) {
    return this.each((typeof t == `function` ? dt : ut)(e, t))
  }
  function* pt() {
    for (var e = this._groups, t = 0, n = e.length; t < n; ++t)
      for (var r = e[t], i = 0, a = r.length, o; i < a; ++i)
        (o = r[i]) && (yield o)
  }
  var mt = [null]
  function ht(e, t) {
    ;((this._groups = e), (this._parents = t))
  }
  function gt() {
    return new ht([[document.documentElement]], mt)
  }
  function _t() {
    return this
  }
  ht.prototype = gt.prototype = {
    constructor: ht,
    select: f,
    selectAll: _,
    selectChild: x,
    selectChildren: T,
    filter: E,
    data: A,
    enter: te,
    exit: ae,
    join: j,
    merge: M,
    selection: _t,
    order: N,
    sort: oe,
    call: ce,
    nodes: le,
    node: ue,
    size: de,
    empty: fe,
    each: pe,
    attr: ve,
    style: L,
    property: Te,
    classed: Pe,
    text: Re,
    html: He,
    raise: We,
    lower: Ke,
    append: Xe,
    insert: z,
    remove: $e,
    clone: nt,
    datum: rt,
    on: ct,
    dispatch: ft,
    [Symbol.iterator]: pt,
  }
  function vt(e, t, n) {
    ;((e.prototype = t.prototype = n), (n.constructor = e))
  }
  function yt(e, t) {
    var n = Object.create(e.prototype)
    for (var r in t) n[r] = t[r]
    return n
  }
  function bt() {}
  var xt = 0.7,
    St = 1 / xt,
    Ct = `\\s*([+-]?\\d+)\\s*`,
    wt = `\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*`,
    Tt = `\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*`,
    Et = /^#([0-9a-f]{3,8})$/,
    Dt = RegExp(`^rgb\\(${Ct},${Ct},${Ct}\\)$`),
    Ot = RegExp(`^rgb\\(${Tt},${Tt},${Tt}\\)$`),
    kt = RegExp(`^rgba\\(${Ct},${Ct},${Ct},${wt}\\)$`),
    At = RegExp(`^rgba\\(${Tt},${Tt},${Tt},${wt}\\)$`),
    jt = RegExp(`^hsl\\(${wt},${Tt},${Tt}\\)$`),
    Mt = RegExp(`^hsla\\(${wt},${Tt},${Tt},${wt}\\)$`),
    Nt = {
      aliceblue: 15792383,
      antiquewhite: 16444375,
      aqua: 65535,
      aquamarine: 8388564,
      azure: 15794175,
      beige: 16119260,
      bisque: 16770244,
      black: 0,
      blanchedalmond: 16772045,
      blue: 255,
      blueviolet: 9055202,
      brown: 10824234,
      burlywood: 14596231,
      cadetblue: 6266528,
      chartreuse: 8388352,
      chocolate: 13789470,
      coral: 16744272,
      cornflowerblue: 6591981,
      cornsilk: 16775388,
      crimson: 14423100,
      cyan: 65535,
      darkblue: 139,
      darkcyan: 35723,
      darkgoldenrod: 12092939,
      darkgray: 11119017,
      darkgreen: 25600,
      darkgrey: 11119017,
      darkkhaki: 12433259,
      darkmagenta: 9109643,
      darkolivegreen: 5597999,
      darkorange: 16747520,
      darkorchid: 10040012,
      darkred: 9109504,
      darksalmon: 15308410,
      darkseagreen: 9419919,
      darkslateblue: 4734347,
      darkslategray: 3100495,
      darkslategrey: 3100495,
      darkturquoise: 52945,
      darkviolet: 9699539,
      deeppink: 16716947,
      deepskyblue: 49151,
      dimgray: 6908265,
      dimgrey: 6908265,
      dodgerblue: 2003199,
      firebrick: 11674146,
      floralwhite: 16775920,
      forestgreen: 2263842,
      fuchsia: 16711935,
      gainsboro: 14474460,
      ghostwhite: 16316671,
      gold: 16766720,
      goldenrod: 14329120,
      gray: 8421504,
      green: 32768,
      greenyellow: 11403055,
      grey: 8421504,
      honeydew: 15794160,
      hotpink: 16738740,
      indianred: 13458524,
      indigo: 4915330,
      ivory: 16777200,
      khaki: 15787660,
      lavender: 15132410,
      lavenderblush: 16773365,
      lawngreen: 8190976,
      lemonchiffon: 16775885,
      lightblue: 11393254,
      lightcoral: 15761536,
      lightcyan: 14745599,
      lightgoldenrodyellow: 16448210,
      lightgray: 13882323,
      lightgreen: 9498256,
      lightgrey: 13882323,
      lightpink: 16758465,
      lightsalmon: 16752762,
      lightseagreen: 2142890,
      lightskyblue: 8900346,
      lightslategray: 7833753,
      lightslategrey: 7833753,
      lightsteelblue: 11584734,
      lightyellow: 16777184,
      lime: 65280,
      limegreen: 3329330,
      linen: 16445670,
      magenta: 16711935,
      maroon: 8388608,
      mediumaquamarine: 6737322,
      mediumblue: 205,
      mediumorchid: 12211667,
      mediumpurple: 9662683,
      mediumseagreen: 3978097,
      mediumslateblue: 8087790,
      mediumspringgreen: 64154,
      mediumturquoise: 4772300,
      mediumvioletred: 13047173,
      midnightblue: 1644912,
      mintcream: 16121850,
      mistyrose: 16770273,
      moccasin: 16770229,
      navajowhite: 16768685,
      navy: 128,
      oldlace: 16643558,
      olive: 8421376,
      olivedrab: 7048739,
      orange: 16753920,
      orangered: 16729344,
      orchid: 14315734,
      palegoldenrod: 15657130,
      palegreen: 10025880,
      paleturquoise: 11529966,
      palevioletred: 14381203,
      papayawhip: 16773077,
      peachpuff: 16767673,
      peru: 13468991,
      pink: 16761035,
      plum: 14524637,
      powderblue: 11591910,
      purple: 8388736,
      rebeccapurple: 6697881,
      red: 16711680,
      rosybrown: 12357519,
      royalblue: 4286945,
      saddlebrown: 9127187,
      salmon: 16416882,
      sandybrown: 16032864,
      seagreen: 3050327,
      seashell: 16774638,
      sienna: 10506797,
      silver: 12632256,
      skyblue: 8900331,
      slateblue: 6970061,
      slategray: 7372944,
      slategrey: 7372944,
      snow: 16775930,
      springgreen: 65407,
      steelblue: 4620980,
      tan: 13808780,
      teal: 32896,
      thistle: 14204888,
      tomato: 16737095,
      turquoise: 4251856,
      violet: 15631086,
      wheat: 16113331,
      white: 16777215,
      whitesmoke: 16119285,
      yellow: 16776960,
      yellowgreen: 10145074,
    }
  vt(bt, Rt, {
    copy(e) {
      return Object.assign(new this.constructor(), this, e)
    },
    displayable() {
      return this.rgb().displayable()
    },
    hex: Pt,
    formatHex: Pt,
    formatHex8: Ft,
    formatHsl: It,
    formatRgb: Lt,
    toString: Lt,
  })
  function Pt() {
    return this.rgb().formatHex()
  }
  function Ft() {
    return this.rgb().formatHex8()
  }
  function It() {
    return Xt(this).formatHsl()
  }
  function Lt() {
    return this.rgb().formatRgb()
  }
  function Rt(e) {
    var t, n
    return (
      (e = (e + ``).trim().toLowerCase()),
      (t = Et.exec(e))
        ? ((n = t[1].length),
          (t = parseInt(t[1], 16)),
          n === 6
            ? zt(t)
            : n === 3
              ? new B(
                  ((t >> 8) & 15) | ((t >> 4) & 240),
                  ((t >> 4) & 15) | (t & 240),
                  ((t & 15) << 4) | (t & 15),
                  1
                )
              : n === 8
                ? Bt(
                    (t >> 24) & 255,
                    (t >> 16) & 255,
                    (t >> 8) & 255,
                    (t & 255) / 255
                  )
                : n === 4
                  ? Bt(
                      ((t >> 12) & 15) | ((t >> 8) & 240),
                      ((t >> 8) & 15) | ((t >> 4) & 240),
                      ((t >> 4) & 15) | (t & 240),
                      (((t & 15) << 4) | (t & 15)) / 255
                    )
                  : null)
        : (t = Dt.exec(e))
          ? new B(t[1], t[2], t[3], 1)
          : (t = Ot.exec(e))
            ? new B(
                (t[1] * 255) / 100,
                (t[2] * 255) / 100,
                (t[3] * 255) / 100,
                1
              )
            : (t = kt.exec(e))
              ? Bt(t[1], t[2], t[3], t[4])
              : (t = At.exec(e))
                ? Bt(
                    (t[1] * 255) / 100,
                    (t[2] * 255) / 100,
                    (t[3] * 255) / 100,
                    t[4]
                  )
                : (t = jt.exec(e))
                  ? Yt(t[1], t[2] / 100, t[3] / 100, 1)
                  : (t = Mt.exec(e))
                    ? Yt(t[1], t[2] / 100, t[3] / 100, t[4])
                    : Nt.hasOwnProperty(e)
                      ? zt(Nt[e])
                      : e === `transparent`
                        ? new B(NaN, NaN, NaN, 0)
                        : null
    )
  }
  function zt(e) {
    return new B((e >> 16) & 255, (e >> 8) & 255, e & 255, 1)
  }
  function Bt(e, t, n, r) {
    return (r <= 0 && (e = t = n = NaN), new B(e, t, n, r))
  }
  function Vt(e) {
    return (
      e instanceof bt || (e = Rt(e)),
      e ? ((e = e.rgb()), new B(e.r, e.g, e.b, e.opacity)) : new B()
    )
  }
  function Ht(e, t, n, r) {
    return arguments.length === 1 ? Vt(e) : new B(e, t, n, r ?? 1)
  }
  function B(e, t, n, r) {
    ;((this.r = +e), (this.g = +t), (this.b = +n), (this.opacity = +r))
  }
  vt(
    B,
    Ht,
    yt(bt, {
      brighter(e) {
        return (
          (e = e == null ? St : St ** +e),
          new B(this.r * e, this.g * e, this.b * e, this.opacity)
        )
      },
      darker(e) {
        return (
          (e = e == null ? xt : xt ** +e),
          new B(this.r * e, this.g * e, this.b * e, this.opacity)
        )
      },
      rgb() {
        return this
      },
      clamp() {
        return new B(qt(this.r), qt(this.g), qt(this.b), Kt(this.opacity))
      },
      displayable() {
        return (
          -0.5 <= this.r &&
          this.r < 255.5 &&
          -0.5 <= this.g &&
          this.g < 255.5 &&
          -0.5 <= this.b &&
          this.b < 255.5 &&
          0 <= this.opacity &&
          this.opacity <= 1
        )
      },
      hex: Ut,
      formatHex: Ut,
      formatHex8: Wt,
      formatRgb: Gt,
      toString: Gt,
    })
  )
  function Ut() {
    return `#${Jt(this.r)}${Jt(this.g)}${Jt(this.b)}`
  }
  function Wt() {
    return `#${Jt(this.r)}${Jt(this.g)}${Jt(this.b)}${Jt((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`
  }
  function Gt() {
    let e = Kt(this.opacity)
    return `${e === 1 ? `rgb(` : `rgba(`}${qt(this.r)}, ${qt(this.g)}, ${qt(this.b)}${e === 1 ? `)` : `, ${e})`}`
  }
  function Kt(e) {
    return isNaN(e) ? 1 : Math.max(0, Math.min(1, e))
  }
  function qt(e) {
    return Math.max(0, Math.min(255, Math.round(e) || 0))
  }
  function Jt(e) {
    return ((e = qt(e)), (e < 16 ? `0` : ``) + e.toString(16))
  }
  function Yt(e, t, n, r) {
    return (
      r <= 0
        ? (e = t = n = NaN)
        : n <= 0 || n >= 1
          ? (e = t = NaN)
          : t <= 0 && (e = NaN),
      new Qt(e, t, n, r)
    )
  }
  function Xt(e) {
    if (e instanceof Qt) return new Qt(e.h, e.s, e.l, e.opacity)
    if ((e instanceof bt || (e = Rt(e)), !e)) return new Qt()
    if (e instanceof Qt) return e
    e = e.rgb()
    var t = e.r / 255,
      n = e.g / 255,
      r = e.b / 255,
      i = Math.min(t, n, r),
      a = Math.max(t, n, r),
      o = NaN,
      s = a - i,
      c = (a + i) / 2
    return (
      s
        ? ((o =
            t === a
              ? (n - r) / s + (n < r) * 6
              : n === a
                ? (r - t) / s + 2
                : (t - n) / s + 4),
          (s /= c < 0.5 ? a + i : 2 - a - i),
          (o *= 60))
        : (s = c > 0 && c < 1 ? 0 : o),
      new Qt(o, s, c, e.opacity)
    )
  }
  function Zt(e, t, n, r) {
    return arguments.length === 1 ? Xt(e) : new Qt(e, t, n, r ?? 1)
  }
  function Qt(e, t, n, r) {
    ;((this.h = +e), (this.s = +t), (this.l = +n), (this.opacity = +r))
  }
  vt(
    Qt,
    Zt,
    yt(bt, {
      brighter(e) {
        return (
          (e = e == null ? St : St ** +e),
          new Qt(this.h, this.s, this.l * e, this.opacity)
        )
      },
      darker(e) {
        return (
          (e = e == null ? xt : xt ** +e),
          new Qt(this.h, this.s, this.l * e, this.opacity)
        )
      },
      rgb() {
        var e = (this.h % 360) + (this.h < 0) * 360,
          t = isNaN(e) || isNaN(this.s) ? 0 : this.s,
          n = this.l,
          r = n + (n < 0.5 ? n : 1 - n) * t,
          i = 2 * n - r
        return new B(
          tn(e >= 240 ? e - 240 : e + 120, i, r),
          tn(e, i, r),
          tn(e < 120 ? e + 240 : e - 120, i, r),
          this.opacity
        )
      },
      clamp() {
        return new Qt($t(this.h), en(this.s), en(this.l), Kt(this.opacity))
      },
      displayable() {
        return (
          ((0 <= this.s && this.s <= 1) || isNaN(this.s)) &&
          0 <= this.l &&
          this.l <= 1 &&
          0 <= this.opacity &&
          this.opacity <= 1
        )
      },
      formatHsl() {
        let e = Kt(this.opacity)
        return `${e === 1 ? `hsl(` : `hsla(`}${$t(this.h)}, ${en(this.s) * 100}%, ${en(this.l) * 100}%${e === 1 ? `)` : `, ${e})`}`
      },
    })
  )
  function $t(e) {
    return ((e = (e || 0) % 360), e < 0 ? e + 360 : e)
  }
  function en(e) {
    return Math.max(0, Math.min(1, e || 0))
  }
  function tn(e, t, n) {
    return (
      (e < 60
        ? t + ((n - t) * e) / 60
        : e < 180
          ? n
          : e < 240
            ? t + ((n - t) * (240 - e)) / 60
            : t) * 255
    )
  }
  var nn = (e) => () => e
  function rn(e, t) {
    return function (n) {
      return e + n * t
    }
  }
  function an(e, t, n) {
    return (
      (e **= +n),
      (t = t ** +n - e),
      (n = 1 / n),
      function (r) {
        return (e + r * t) ** +n
      }
    )
  }
  function on(e) {
    return (e = +e) == 1
      ? sn
      : function (t, n) {
          return n - t ? an(t, n, e) : nn(isNaN(t) ? n : t)
        }
  }
  function sn(e, t) {
    var n = t - e
    return n ? rn(e, n) : nn(isNaN(e) ? t : e)
  }
  var cn = (function e(t) {
    var n = on(t)
    function r(e, t) {
      var r = n((e = Ht(e)).r, (t = Ht(t)).r),
        i = n(e.g, t.g),
        a = n(e.b, t.b),
        o = sn(e.opacity, t.opacity)
      return function (t) {
        return (
          (e.r = r(t)),
          (e.g = i(t)),
          (e.b = a(t)),
          (e.opacity = o(t)),
          e + ``
        )
      }
    }
    return ((r.gamma = e), r)
  })(1)
  function ln(e, t) {
    return (
      (e = +e),
      (t = +t),
      function (n) {
        return e * (1 - n) + t * n
      }
    )
  }
  var un = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,
    dn = new RegExp(un.source, `g`)
  function fn(e) {
    return function () {
      return e
    }
  }
  function pn(e) {
    return function (t) {
      return e(t) + ``
    }
  }
  function mn(e, t) {
    var n = (un.lastIndex = dn.lastIndex = 0),
      r,
      i,
      a,
      o = -1,
      s = [],
      c = []
    for (e += ``, t += ``; (r = un.exec(e)) && (i = dn.exec(t)); )
      ((a = i.index) > n &&
        ((a = t.slice(n, a)), s[o] ? (s[o] += a) : (s[++o] = a)),
        (r = r[0]) === (i = i[0])
          ? s[o]
            ? (s[o] += i)
            : (s[++o] = i)
          : ((s[++o] = null), c.push({ i: o, x: ln(r, i) })),
        (n = dn.lastIndex))
    return (
      n < t.length && ((a = t.slice(n)), s[o] ? (s[o] += a) : (s[++o] = a)),
      s.length < 2
        ? c[0]
          ? pn(c[0].x)
          : fn(t)
        : ((t = c.length),
          function (e) {
            for (var n = 0, r; n < t; ++n) s[(r = c[n]).i] = r.x(e)
            return s.join(``)
          })
    )
  }
  var hn = 180 / Math.PI,
    gn = {
      translateX: 0,
      translateY: 0,
      rotate: 0,
      skewX: 0,
      scaleX: 1,
      scaleY: 1,
    }
  function _n(e, t, n, r, i, a) {
    var o, s, c
    return (
      (o = Math.sqrt(e * e + t * t)) && ((e /= o), (t /= o)),
      (c = e * n + t * r) && ((n -= e * c), (r -= t * c)),
      (s = Math.sqrt(n * n + r * r)) && ((n /= s), (r /= s), (c /= s)),
      e * r < t * n && ((e = -e), (t = -t), (c = -c), (o = -o)),
      {
        translateX: i,
        translateY: a,
        rotate: Math.atan2(t, e) * hn,
        skewX: Math.atan(c) * hn,
        scaleX: o,
        scaleY: s,
      }
    )
  }
  var vn
  function yn(e) {
    let t = new (typeof DOMMatrix == `function` ? DOMMatrix : WebKitCSSMatrix)(
      e + ``
    )
    return t.isIdentity ? gn : _n(t.a, t.b, t.c, t.d, t.e, t.f)
  }
  function bn(e) {
    return e == null ||
      ((vn ||= document.createElementNS(`http://www.w3.org/2000/svg`, `g`)),
      vn.setAttribute(`transform`, e),
      !(e = vn.transform.baseVal.consolidate()))
      ? gn
      : ((e = e.matrix), _n(e.a, e.b, e.c, e.d, e.e, e.f))
  }
  function xn(e, t, n, r) {
    function i(e) {
      return e.length ? e.pop() + ` ` : ``
    }
    function a(e, r, i, a, o, s) {
      if (e !== i || r !== a) {
        var c = o.push(`translate(`, null, t, null, n)
        s.push({ i: c - 4, x: ln(e, i) }, { i: c - 2, x: ln(r, a) })
      } else (i || a) && o.push(`translate(` + i + t + a + n)
    }
    function o(e, t, n, a) {
      e === t
        ? t && n.push(i(n) + `rotate(` + t + r)
        : (e - t > 180 ? (t += 360) : t - e > 180 && (e += 360),
          a.push({ i: n.push(i(n) + `rotate(`, null, r) - 2, x: ln(e, t) }))
    }
    function s(e, t, n, a) {
      e === t
        ? t && n.push(i(n) + `skewX(` + t + r)
        : a.push({ i: n.push(i(n) + `skewX(`, null, r) - 2, x: ln(e, t) })
    }
    function c(e, t, n, r, a, o) {
      if (e !== n || t !== r) {
        var s = a.push(i(a) + `scale(`, null, `,`, null, `)`)
        o.push({ i: s - 4, x: ln(e, n) }, { i: s - 2, x: ln(t, r) })
      } else (n !== 1 || r !== 1) && a.push(i(a) + `scale(` + n + `,` + r + `)`)
    }
    return function (t, n) {
      var r = [],
        i = []
      return (
        (t = e(t)),
        (n = e(n)),
        a(t.translateX, t.translateY, n.translateX, n.translateY, r, i),
        o(t.rotate, n.rotate, r, i),
        s(t.skewX, n.skewX, r, i),
        c(t.scaleX, t.scaleY, n.scaleX, n.scaleY, r, i),
        (t = n = null),
        function (e) {
          for (var t = -1, n = i.length, a; ++t < n; ) r[(a = i[t]).i] = a.x(e)
          return r.join(``)
        }
      )
    }
  }
  var Sn = xn(yn, `px, `, `px)`, `deg)`),
    Cn = xn(bn, `, `, `)`, `)`),
    wn = 0,
    Tn = 0,
    En = 0,
    Dn = 1e3,
    On,
    kn,
    An = 0,
    jn = 0,
    Mn = 0,
    Nn = typeof performance == `object` && performance.now ? performance : Date,
    Pn =
      typeof window == `object` && window.requestAnimationFrame
        ? window.requestAnimationFrame.bind(window)
        : function (e) {
            setTimeout(e, 17)
          }
  function Fn() {
    return (jn ||= (Pn(In), Nn.now() + Mn))
  }
  function In() {
    jn = 0
  }
  function Ln() {
    this._call = this._time = this._next = null
  }
  Ln.prototype = Rn.prototype = {
    constructor: Ln,
    restart: function (e, t, n) {
      if (typeof e != `function`) throw TypeError(`callback is not a function`)
      ;((n = (n == null ? Fn() : +n) + (t == null ? 0 : +t)),
        !this._next &&
          kn !== this &&
          (kn ? (kn._next = this) : (On = this), (kn = this)),
        (this._call = e),
        (this._time = n),
        Un())
    },
    stop: function () {
      this._call && ((this._call = null), (this._time = 1 / 0), Un())
    },
  }
  function Rn(e, t, n) {
    var r = new Ln()
    return (r.restart(e, t, n), r)
  }
  function zn() {
    ;(Fn(), ++wn)
    for (var e = On, t; e; )
      ((t = jn - e._time) >= 0 && e._call.call(void 0, t), (e = e._next))
    --wn
  }
  function Bn() {
    ;((jn = (An = Nn.now()) + Mn), (wn = Tn = 0))
    try {
      zn()
    } finally {
      ;((wn = 0), Hn(), (jn = 0))
    }
  }
  function Vn() {
    var e = Nn.now(),
      t = e - An
    t > Dn && ((Mn -= t), (An = e))
  }
  function Hn() {
    for (var e, t = On, n, r = 1 / 0; t; )
      t._call
        ? (r > t._time && (r = t._time), (e = t), (t = t._next))
        : ((n = t._next), (t._next = null), (t = e ? (e._next = n) : (On = n)))
    ;((kn = e), Un(r))
  }
  function Un(e) {
    wn ||
      ((Tn &&= clearTimeout(Tn)),
      e - jn > 24
        ? (e < 1 / 0 && (Tn = setTimeout(Bn, e - Nn.now() - Mn)),
          (En &&= clearInterval(En)))
        : ((En ||= ((An = Nn.now()), setInterval(Vn, Dn))), (wn = 1), Pn(Bn)))
  }
  function Wn(e, t, n) {
    var r = new Ln()
    return (
      (t = t == null ? 0 : +t),
      r.restart(
        (n) => {
          ;(r.stop(), e(n + t))
        },
        t,
        n
      ),
      r
    )
  }
  var Gn = t(`start`, `end`, `cancel`, `interrupt`),
    Kn = []
  function qn(e, t, n, r, i, a) {
    var o = e.__transition
    if (!o) e.__transition = {}
    else if (n in o) return
    Zn(e, n, {
      name: t,
      index: r,
      group: i,
      on: Gn,
      tween: Kn,
      time: a.time,
      delay: a.delay,
      duration: a.duration,
      ease: a.ease,
      timer: null,
      state: 0,
    })
  }
  function Jn(e, t) {
    var n = Xn(e, t)
    if (n.state > 0) throw Error(`too late; already scheduled`)
    return n
  }
  function Yn(e, t) {
    var n = Xn(e, t)
    if (n.state > 3) throw Error(`too late; already running`)
    return n
  }
  function Xn(e, t) {
    var n = e.__transition
    if (!n || !(n = n[t])) throw Error(`transition not found`)
    return n
  }
  function Zn(e, t, n) {
    var r = e.__transition,
      i
    ;((r[t] = n), (n.timer = Rn(a, 0, n.time)))
    function a(e) {
      ;((n.state = 1),
        n.timer.restart(o, n.delay, n.time),
        n.delay <= e && o(e - n.delay))
    }
    function o(a) {
      var l, u, d, f
      if (n.state !== 1) return c()
      for (l in r)
        if (((f = r[l]), f.name === n.name)) {
          if (f.state === 3) return Wn(o)
          f.state === 4
            ? ((f.state = 6),
              f.timer.stop(),
              f.on.call(`interrupt`, e, e.__data__, f.index, f.group),
              delete r[l])
            : +l < t &&
              ((f.state = 6),
              f.timer.stop(),
              f.on.call(`cancel`, e, e.__data__, f.index, f.group),
              delete r[l])
        }
      if (
        (Wn(function () {
          n.state === 3 &&
            ((n.state = 4), n.timer.restart(s, n.delay, n.time), s(a))
        }),
        (n.state = 2),
        n.on.call(`start`, e, e.__data__, n.index, n.group),
        n.state === 2)
      ) {
        for (
          n.state = 3, i = Array((d = n.tween.length)), l = 0, u = -1;
          l < d;
          ++l
        )
          (f = n.tween[l].value.call(e, e.__data__, n.index, n.group)) &&
            (i[++u] = f)
        i.length = u + 1
      }
    }
    function s(t) {
      for (
        var r =
            t < n.duration
              ? n.ease.call(null, t / n.duration)
              : (n.timer.restart(c), (n.state = 5), 1),
          a = -1,
          o = i.length;
        ++a < o;
      )
        i[a].call(e, r)
      n.state === 5 && (n.on.call(`end`, e, e.__data__, n.index, n.group), c())
    }
    function c() {
      for (var i in ((n.state = 6), n.timer.stop(), delete r[t], r)) return
      delete e.__transition
    }
  }
  function Qn(e, t) {
    var n = e.__transition,
      r,
      i,
      a = !0,
      o
    if (n) {
      for (o in ((t = t == null ? null : t + ``), n)) {
        if ((r = n[o]).name !== t) {
          a = !1
          continue
        }
        ;((i = r.state > 2 && r.state < 5),
          (r.state = 6),
          r.timer.stop(),
          r.on.call(
            i ? `interrupt` : `cancel`,
            e,
            e.__data__,
            r.index,
            r.group
          ),
          delete n[o])
      }
      a && delete e.__transition
    }
  }
  function $n(e) {
    return this.each(function () {
      Qn(this, e)
    })
  }
  function er(e, t) {
    var n, r
    return function () {
      var i = Yn(this, e),
        a = i.tween
      if (a !== n) {
        r = n = a
        for (var o = 0, s = r.length; o < s; ++o)
          if (r[o].name === t) {
            ;((r = r.slice()), r.splice(o, 1))
            break
          }
      }
      i.tween = r
    }
  }
  function tr(e, t, n) {
    var r, i
    if (typeof n != `function`) throw Error()
    return function () {
      var a = Yn(this, e),
        o = a.tween
      if (o !== r) {
        i = (r = o).slice()
        for (var s = { name: t, value: n }, c = 0, l = i.length; c < l; ++c)
          if (i[c].name === t) {
            i[c] = s
            break
          }
        c === l && i.push(s)
      }
      a.tween = i
    }
  }
  function nr(e, t) {
    var n = this._id
    if (((e += ``), arguments.length < 2)) {
      for (var r = Xn(this.node(), n).tween, i = 0, a = r.length, o; i < a; ++i)
        if ((o = r[i]).name === e) return o.value
      return null
    }
    return this.each((t == null ? er : tr)(n, e, t))
  }
  function rr(e, t, n) {
    var r = e._id
    return (
      e.each(function () {
        var e = Yn(this, r)
        ;(e.value ||= {})[t] = n.apply(this, arguments)
      }),
      function (e) {
        return Xn(e, r).value[t]
      }
    )
  }
  function ir(e, t) {
    var n
    return (
      typeof t == `number`
        ? ln
        : t instanceof Rt
          ? cn
          : (n = Rt(t))
            ? ((t = n), cn)
            : mn
    )(e, t)
  }
  function ar(e) {
    return function () {
      this.removeAttribute(e)
    }
  }
  function or(e) {
    return function () {
      this.removeAttributeNS(e.space, e.local)
    }
  }
  function sr(e, t, n) {
    var r,
      i = n + ``,
      a
    return function () {
      var o = this.getAttribute(e)
      return o === i ? null : o === r ? a : (a = t((r = o), n))
    }
  }
  function cr(e, t, n) {
    var r,
      i = n + ``,
      a
    return function () {
      var o = this.getAttributeNS(e.space, e.local)
      return o === i ? null : o === r ? a : (a = t((r = o), n))
    }
  }
  function lr(e, t, n) {
    var r, i, a
    return function () {
      var o,
        s = n(this),
        c
      return s == null
        ? void this.removeAttribute(e)
        : ((o = this.getAttribute(e)),
          (c = s + ``),
          o === c
            ? null
            : o === r && c === i
              ? a
              : ((i = c), (a = t((r = o), s))))
    }
  }
  function ur(e, t, n) {
    var r, i, a
    return function () {
      var o,
        s = n(this),
        c
      return s == null
        ? void this.removeAttributeNS(e.space, e.local)
        : ((o = this.getAttributeNS(e.space, e.local)),
          (c = s + ``),
          o === c
            ? null
            : o === r && c === i
              ? a
              : ((i = c), (a = t((r = o), s))))
    }
  }
  function dr(e, t) {
    var n = l(e),
      r = n === `transform` ? Cn : ir
    return this.attrTween(
      e,
      typeof t == `function`
        ? (n.local ? ur : lr)(n, r, rr(this, `attr.` + e, t))
        : t == null
          ? (n.local ? or : ar)(n)
          : (n.local ? cr : sr)(n, r, t)
    )
  }
  function fr(e, t) {
    return function (n) {
      this.setAttribute(e, t.call(this, n))
    }
  }
  function pr(e, t) {
    return function (n) {
      this.setAttributeNS(e.space, e.local, t.call(this, n))
    }
  }
  function mr(e, t) {
    var n, r
    function i() {
      var i = t.apply(this, arguments)
      return (i !== r && (n = (r = i) && pr(e, i)), n)
    }
    return ((i._value = t), i)
  }
  function hr(e, t) {
    var n, r
    function i() {
      var i = t.apply(this, arguments)
      return (i !== r && (n = (r = i) && fr(e, i)), n)
    }
    return ((i._value = t), i)
  }
  function gr(e, t) {
    var n = `attr.` + e
    if (arguments.length < 2) return (n = this.tween(n)) && n._value
    if (t == null) return this.tween(n, null)
    if (typeof t != `function`) throw Error()
    var r = l(e)
    return this.tween(n, (r.local ? mr : hr)(r, t))
  }
  function _r(e, t) {
    return function () {
      Jn(this, e).delay = +t.apply(this, arguments)
    }
  }
  function vr(e, t) {
    return (
      (t = +t),
      function () {
        Jn(this, e).delay = t
      }
    )
  }
  function yr(e) {
    var t = this._id
    return arguments.length
      ? this.each((typeof e == `function` ? _r : vr)(t, e))
      : Xn(this.node(), t).delay
  }
  function br(e, t) {
    return function () {
      Yn(this, e).duration = +t.apply(this, arguments)
    }
  }
  function xr(e, t) {
    return (
      (t = +t),
      function () {
        Yn(this, e).duration = t
      }
    )
  }
  function Sr(e) {
    var t = this._id
    return arguments.length
      ? this.each((typeof e == `function` ? br : xr)(t, e))
      : Xn(this.node(), t).duration
  }
  function Cr(e, t) {
    if (typeof t != `function`) throw Error()
    return function () {
      Yn(this, e).ease = t
    }
  }
  function wr(e) {
    var t = this._id
    return arguments.length ? this.each(Cr(t, e)) : Xn(this.node(), t).ease
  }
  function Tr(e, t) {
    return function () {
      var n = t.apply(this, arguments)
      if (typeof n != `function`) throw Error()
      Yn(this, e).ease = n
    }
  }
  function Er(e) {
    if (typeof e != `function`) throw Error()
    return this.each(Tr(this._id, e))
  }
  function Dr(e) {
    typeof e != `function` && (e = o(e))
    for (var t = this._groups, n = t.length, r = Array(n), i = 0; i < n; ++i)
      for (var a = t[i], s = a.length, c = (r[i] = []), l, u = 0; u < s; ++u)
        (l = a[u]) && e.call(l, l.__data__, u, a) && c.push(l)
    return new ni(r, this._parents, this._name, this._id)
  }
  function Or(e) {
    if (e._id !== this._id) throw Error()
    for (
      var t = this._groups,
        n = e._groups,
        r = t.length,
        i = n.length,
        a = Math.min(r, i),
        o = Array(r),
        s = 0;
      s < a;
      ++s
    )
      for (
        var c = t[s], l = n[s], u = c.length, d = (o[s] = Array(u)), f, p = 0;
        p < u;
        ++p
      )
        (f = c[p] || l[p]) && (d[p] = f)
    for (; s < r; ++s) o[s] = t[s]
    return new ni(o, this._parents, this._name, this._id)
  }
  function kr(e) {
    return (e + ``)
      .trim()
      .split(/^|\s+/)
      .every(function (e) {
        var t = e.indexOf(`.`)
        return (t >= 0 && (e = e.slice(0, t)), !e || e === `start`)
      })
  }
  function Ar(e, t, n) {
    var r,
      i,
      a = kr(t) ? Jn : Yn
    return function () {
      var o = a(this, e),
        s = o.on
      ;(s !== r && (i = (r = s).copy()).on(t, n), (o.on = i))
    }
  }
  function jr(e, t) {
    var n = this._id
    return arguments.length < 2
      ? Xn(this.node(), n).on.on(e)
      : this.each(Ar(n, e, t))
  }
  function Mr(e) {
    return function () {
      var t = this.parentNode
      for (var n in this.__transition) if (+n !== e) return
      t && t.removeChild(this)
    }
  }
  function Nr() {
    return this.on(`end.remove`, Mr(this._id))
  }
  function Pr(e) {
    var t = this._name,
      n = this._id
    typeof e != `function` && (e = d(e))
    for (var r = this._groups, i = r.length, a = Array(i), o = 0; o < i; ++o)
      for (
        var s = r[o], c = s.length, l = (a[o] = Array(c)), u, f, p = 0;
        p < c;
        ++p
      )
        (u = s[p]) &&
          (f = e.call(u, u.__data__, p, s)) &&
          (`__data__` in u && (f.__data__ = u.__data__),
          (l[p] = f),
          qn(l[p], t, n, p, l, Xn(u, n)))
    return new ni(a, this._parents, t, n)
  }
  function Fr(e) {
    var t = this._name,
      n = this._id
    typeof e != `function` && (e = h(e))
    for (var r = this._groups, i = r.length, a = [], o = [], s = 0; s < i; ++s)
      for (var c = r[s], l = c.length, u, d = 0; d < l; ++d)
        if ((u = c[d])) {
          for (
            var f = e.call(u, u.__data__, d, c),
              p,
              m = Xn(u, n),
              g = 0,
              _ = f.length;
            g < _;
            ++g
          )
            (p = f[g]) && qn(p, t, n, g, f, m)
          ;(a.push(f), o.push(u))
        }
    return new ni(a, o, t, n)
  }
  var Ir = gt.prototype.constructor
  function Lr() {
    return new Ir(this._groups, this._parents)
  }
  function Rr(e, t) {
    var n, r, i
    return function () {
      var a = R(this, e),
        o = (this.style.removeProperty(e), R(this, e))
      return a === o ? null : a === n && o === r ? i : (i = t((n = a), (r = o)))
    }
  }
  function zr(e) {
    return function () {
      this.style.removeProperty(e)
    }
  }
  function Br(e, t, n) {
    var r,
      i = n + ``,
      a
    return function () {
      var o = R(this, e)
      return o === i ? null : o === r ? a : (a = t((r = o), n))
    }
  }
  function Vr(e, t, n) {
    var r, i, a
    return function () {
      var o = R(this, e),
        s = n(this),
        c = s + ``
      return (
        s ?? (c = s = (this.style.removeProperty(e), R(this, e))),
        o === c ? null : o === r && c === i ? a : ((i = c), (a = t((r = o), s)))
      )
    }
  }
  function Hr(e, t) {
    var n,
      r,
      i,
      a = `style.` + t,
      o = `end.` + a,
      s
    return function () {
      var c = Yn(this, e),
        l = c.on,
        u = c.value[a] == null ? (s ||= zr(t)) : void 0
      ;((l !== n || i !== u) && (r = (n = l).copy()).on(o, (i = u)), (c.on = r))
    }
  }
  function Ur(e, t, n) {
    var r = (e += ``) == `transform` ? Sn : ir
    return t == null
      ? this.styleTween(e, Rr(e, r)).on(`end.style.` + e, zr(e))
      : typeof t == `function`
        ? this.styleTween(e, Vr(e, r, rr(this, `style.` + e, t))).each(
            Hr(this._id, e)
          )
        : this.styleTween(e, Br(e, r, t), n).on(`end.style.` + e, null)
  }
  function Wr(e, t, n) {
    return function (r) {
      this.style.setProperty(e, t.call(this, r), n)
    }
  }
  function Gr(e, t, n) {
    var r, i
    function a() {
      var a = t.apply(this, arguments)
      return (a !== i && (r = (i = a) && Wr(e, a, n)), r)
    }
    return ((a._value = t), a)
  }
  function Kr(e, t, n) {
    var r = `style.` + (e += ``)
    if (arguments.length < 2) return (r = this.tween(r)) && r._value
    if (t == null) return this.tween(r, null)
    if (typeof t != `function`) throw Error()
    return this.tween(r, Gr(e, t, n ?? ``))
  }
  function qr(e) {
    return function () {
      this.textContent = e
    }
  }
  function Jr(e) {
    return function () {
      var t = e(this)
      this.textContent = t ?? ``
    }
  }
  function Yr(e) {
    return this.tween(
      `text`,
      typeof e == `function`
        ? Jr(rr(this, `text`, e))
        : qr(e == null ? `` : e + ``)
    )
  }
  function Xr(e) {
    return function (t) {
      this.textContent = e.call(this, t)
    }
  }
  function Zr(e) {
    var t, n
    function r() {
      var r = e.apply(this, arguments)
      return (r !== n && (t = (n = r) && Xr(r)), t)
    }
    return ((r._value = e), r)
  }
  function Qr(e) {
    var t = `text`
    if (arguments.length < 1) return (t = this.tween(t)) && t._value
    if (e == null) return this.tween(t, null)
    if (typeof e != `function`) throw Error()
    return this.tween(t, Zr(e))
  }
  function $r() {
    for (
      var e = this._name,
        t = this._id,
        n = ii(),
        r = this._groups,
        i = r.length,
        a = 0;
      a < i;
      ++a
    )
      for (var o = r[a], s = o.length, c, l = 0; l < s; ++l)
        if ((c = o[l])) {
          var u = Xn(c, t)
          qn(c, e, n, l, o, {
            time: u.time + u.delay + u.duration,
            delay: 0,
            duration: u.duration,
            ease: u.ease,
          })
        }
    return new ni(r, this._parents, e, n)
  }
  function ei() {
    var e,
      t,
      n = this,
      r = n._id,
      i = n.size()
    return new Promise(function (a, o) {
      var s = { value: o },
        c = {
          value: function () {
            --i === 0 && a()
          },
        }
      ;(n.each(function () {
        var n = Yn(this, r),
          i = n.on
        ;(i !== e &&
          ((t = (e = i).copy()),
          t._.cancel.push(s),
          t._.interrupt.push(s),
          t._.end.push(c)),
          (n.on = t))
      }),
        i === 0 && a())
    })
  }
  var ti = 0
  function ni(e, t, n, r) {
    ;((this._groups = e), (this._parents = t), (this._name = n), (this._id = r))
  }
  function ri(e) {
    return gt().transition(e)
  }
  function ii() {
    return ++ti
  }
  var ai = gt.prototype
  ni.prototype = ri.prototype = {
    constructor: ni,
    select: Pr,
    selectAll: Fr,
    selectChild: ai.selectChild,
    selectChildren: ai.selectChildren,
    filter: Dr,
    merge: Or,
    selection: Lr,
    transition: $r,
    call: ai.call,
    nodes: ai.nodes,
    node: ai.node,
    size: ai.size,
    empty: ai.empty,
    each: ai.each,
    on: jr,
    attr: dr,
    attrTween: gr,
    style: Ur,
    styleTween: Kr,
    text: Yr,
    textTween: Qr,
    remove: Nr,
    tween: nr,
    delay: yr,
    duration: Sr,
    ease: wr,
    easeVarying: Er,
    end: ei,
    [Symbol.iterator]: ai[Symbol.iterator],
  }
  function oi(e) {
    return ((e *= 2) <= 1 ? e * e * e : (e -= 2) * e * e + 2) / 2
  }
  var si = { time: null, delay: 0, duration: 250, ease: oi }
  function ci(e, t) {
    for (var n; !(n = e.__transition) || !(n = n[t]); )
      if (!(e = e.parentNode)) throw Error(`transition ${t} not found`)
    return n
  }
  function li(e) {
    var t, n
    e instanceof ni
      ? ((t = e._id), (e = e._name))
      : ((t = ii()), ((n = si).time = Fn()), (e = e == null ? null : e + ``))
    for (var r = this._groups, i = r.length, a = 0; a < i; ++a)
      for (var o = r[a], s = o.length, c, l = 0; l < s; ++l)
        (c = o[l]) && qn(c, e, t, l, o, n || ci(c, t))
    return new ni(r, this._parents, e, t)
  }
  ;((gt.prototype.interrupt = $n), (gt.prototype.transition = li))
  function ui(e, t, n) {
    ;((this.k = e), (this.x = t), (this.y = n))
  }
  ui.prototype = {
    constructor: ui,
    scale: function (e) {
      return e === 1 ? this : new ui(this.k * e, this.x, this.y)
    },
    translate: function (e, t) {
      return (e === 0) & (t === 0)
        ? this
        : new ui(this.k, this.x + this.k * e, this.y + this.k * t)
    },
    apply: function (e) {
      return [e[0] * this.k + this.x, e[1] * this.k + this.y]
    },
    applyX: function (e) {
      return e * this.k + this.x
    },
    applyY: function (e) {
      return e * this.k + this.y
    },
    invert: function (e) {
      return [(e[0] - this.x) / this.k, (e[1] - this.y) / this.k]
    },
    invertX: function (e) {
      return (e - this.x) / this.k
    },
    invertY: function (e) {
      return (e - this.y) / this.k
    },
    rescaleX: function (e) {
      return e.copy().domain(e.range().map(this.invertX, this).map(e.invert, e))
    },
    rescaleY: function (e) {
      return e.copy().domain(e.range().map(this.invertY, this).map(e.invert, e))
    },
    toString: function () {
      return `translate(` + this.x + `,` + this.y + `) scale(` + this.k + `)`
    },
  }
  var di = new ui(1, 0, 0)
  fi.prototype = ui.prototype
  function fi(e) {
    for (; !e.__zoom; ) if (!(e = e.parentNode)) return di
    return e.__zoom
  }
  let pi = {
    error001: (e = `react`) =>
      `Seems like you have not used ${e === `svelte` ? `SvelteFlowProvider` : `ReactFlowProvider`} as an ancestor. Help: https://${e}flow.dev/error#001`,
    error002: () =>
      `It looks like you've created a new nodeTypes or edgeTypes object. If this wasn't on purpose please define the nodeTypes/edgeTypes outside of the component or memoize them.`,
    error003: (e) =>
      `Node type "${e}" not found. Using fallback type "default".`,
    error004: () =>
      `The parent container needs a width and a height to render the graph.`,
    error005: () => `Only child nodes can use a parent extent.`,
    error006: () => `Can't create edge. An edge needs a source and a target.`,
    error007: (e) => `The old edge with id=${e} does not exist.`,
    error009: (e) => `Marker type "${e}" doesn't exist.`,
    error008: (e, { id: t, sourceHandle: n, targetHandle: r }) =>
      `Couldn't create edge for ${e} handle id: "${e === `source` ? n : r}", edge id: ${t}.`,
    error010: () =>
      `Handle: No node id found. Make sure to only use a Handle inside a custom Node.`,
    error011: (e) =>
      `Edge type "${e}" not found. Using fallback type "default".`,
    error012: (e) =>
      `Node with id "${e}" does not exist, it may have been removed. This can happen when a node is deleted before the "onNodeClick" handler is called.`,
    error013: (e = `react`) =>
      `It seems that you haven't loaded the styles. Please import '@xyflow/${e}/dist/style.css' or base.css to make sure everything is working properly.`,
    error014: () =>
      `useNodeConnections: No node ID found. Call useNodeConnections inside a custom Node or provide a node ID.`,
    error015: () =>
      `It seems that you are trying to drag a node that is not initialized. Please use onNodesChange as explained in the docs.`,
    error016: (e) =>
      `Edge with id "${e}" does not exist, it may have been removed. This can happen when an edge is deleted before the "onEdgeClick" handler is called.`,
  }
  var mi
  ;(function (e) {
    ;((e.Strict = `strict`), (e.Loose = `loose`))
  })((mi ||= {}))
  var hi
  ;(function (e) {
    ;((e.Free = `free`),
      (e.Vertical = `vertical`),
      (e.Horizontal = `horizontal`))
  })((hi ||= {}))
  var gi
  ;(function (e) {
    ;((e.Partial = `partial`), (e.Full = `full`))
  })((gi ||= {}))
  var _i
  ;(function (e) {
    ;((e.Bezier = `default`),
      (e.Straight = `straight`),
      (e.Step = `step`),
      (e.SmoothStep = `smoothstep`),
      (e.SimpleBezier = `simplebezier`))
  })((_i ||= {}))
  var vi
  ;(function (e) {
    ;((e.Arrow = `arrow`), (e.ArrowClosed = `arrowclosed`))
  })((vi ||= {}))
  var V
  ;((function (e) {
    ;((e.Left = `left`),
      (e.Top = `top`),
      (e.Right = `right`),
      (e.Bottom = `bottom`))
  })((V ||= {})),
    V.Left,
    V.Right,
    V.Right,
    V.Left,
    V.Top,
    V.Bottom,
    V.Bottom,
    V.Top)
  function yi(e) {
    return {
      width: e.measured?.width ?? e.width ?? e.initialWidth ?? 0,
      height: e.measured?.height ?? e.height ?? e.initialHeight ?? 0,
    }
  }
  function bi({ sourceX: e, sourceY: t, targetX: n, targetY: r }) {
    let i = Math.abs(n - e) / 2,
      a = n < e ? n + i : n - i,
      o = Math.abs(r - t) / 2
    return [a, r < t ? r + o : r - o, i, o]
  }
  let xi = {
      [V.Left]: { x: -1, y: 0 },
      [V.Right]: { x: 1, y: 0 },
      [V.Top]: { x: 0, y: -1 },
      [V.Bottom]: { x: 0, y: 1 },
    },
    Si = ({ source: e, sourcePosition: t = V.Bottom, target: n }) =>
      t === V.Left || t === V.Right
        ? e.x < n.x
          ? { x: 1, y: 0 }
          : { x: -1, y: 0 }
        : e.y < n.y
          ? { x: 0, y: 1 }
          : { x: 0, y: -1 },
    Ci = (e, t) => Math.sqrt((t.x - e.x) ** 2 + (t.y - e.y) ** 2)
  function wi({
    source: e,
    sourcePosition: t = V.Bottom,
    target: n,
    targetPosition: r = V.Top,
    center: i,
    offset: a,
    stepPosition: o,
  }) {
    let s = xi[t],
      c = xi[r],
      l = { x: e.x + s.x * a, y: e.y + s.y * a },
      u = { x: n.x + c.x * a, y: n.y + c.y * a },
      d = Si({ source: l, sourcePosition: t, target: u }),
      f = d.x === 0 ? `y` : `x`,
      p = d[f],
      m = [],
      h,
      g,
      _ = { x: 0, y: 0 },
      v = { x: 0, y: 0 },
      [, , y, b] = bi({
        sourceX: e.x,
        sourceY: e.y,
        targetX: n.x,
        targetY: n.y,
      })
    if (s[f] * c[f] === -1) {
      f === `x`
        ? ((h = i.x ?? l.x + (u.x - l.x) * o), (g = i.y ?? (l.y + u.y) / 2))
        : ((h = i.x ?? (l.x + u.x) / 2), (g = i.y ?? l.y + (u.y - l.y) * o))
      let e = [
          { x: h, y: l.y },
          { x: h, y: u.y },
        ],
        t = [
          { x: l.x, y: g },
          { x: u.x, y: g },
        ]
      m = s[f] === p ? (f === `x` ? e : t) : f === `x` ? t : e
    } else {
      let i = [{ x: l.x, y: u.y }],
        o = [{ x: u.x, y: l.y }]
      if (
        ((m = f === `x` ? (s.x === p ? o : i) : s.y === p ? i : o), t === r)
      ) {
        let t = Math.abs(e[f] - n[f])
        if (t <= a) {
          let r = Math.min(a - 1, a - t)
          s[f] === p
            ? (_[f] = (l[f] > e[f] ? -1 : 1) * r)
            : (v[f] = (u[f] > n[f] ? -1 : 1) * r)
        }
      }
      if (t !== r) {
        let e = f === `x` ? `y` : `x`,
          t = s[f] === c[e],
          n = l[e] > u[e],
          r = l[e] < u[e]
        ;((s[f] === 1 && ((!t && n) || (t && r))) ||
          (s[f] !== 1 && ((!t && r) || (t && n)))) &&
          (m = f === `x` ? i : o)
      }
      let d = { x: l.x + _.x, y: l.y + _.y },
        y = { x: u.x + v.x, y: u.y + v.y }
      Math.max(Math.abs(d.x - m[0].x), Math.abs(y.x - m[0].x)) >=
      Math.max(Math.abs(d.y - m[0].y), Math.abs(y.y - m[0].y))
        ? ((h = (d.x + y.x) / 2), (g = m[0].y))
        : ((h = m[0].x), (g = (d.y + y.y) / 2))
    }
    let x = { x: l.x + _.x, y: l.y + _.y },
      S = { x: u.x + v.x, y: u.y + v.y }
    return [
      [
        e,
        ...(x.x !== m[0].x || x.y !== m[0].y ? [x] : []),
        ...m,
        ...(S.x !== m[m.length - 1].x || S.y !== m[m.length - 1].y ? [S] : []),
        n,
      ],
      h,
      g,
      y,
      b,
    ]
  }
  function Ti(e, t, n, r) {
    let i = Math.min(Ci(e, t) / 2, Ci(t, n) / 2, r),
      { x: a, y: o } = t
    if ((e.x === a && a === n.x) || (e.y === o && o === n.y))
      return `L${a} ${o}`
    if (e.y === o) {
      let t = e.x < n.x ? -1 : 1,
        r = e.y < n.y ? 1 : -1
      return `L ${a + i * t},${o}Q ${a},${o} ${a},${o + i * r}`
    }
    let s = e.x < n.x ? 1 : -1
    return `L ${a},${o + i * (e.y < n.y ? -1 : 1)}Q ${a},${o} ${a + i * s},${o}`
  }
  function Ei({
    sourceX: e,
    sourceY: t,
    sourcePosition: n = V.Bottom,
    targetX: r,
    targetY: i,
    targetPosition: a = V.Top,
    borderRadius: o = 5,
    centerX: s,
    centerY: c,
    offset: l = 20,
    stepPosition: u = 0.5,
  }) {
    let [d, f, p, m, h] = wi({
        source: { x: e, y: t },
        sourcePosition: n,
        target: { x: r, y: i },
        targetPosition: a,
        center: { x: s, y: c },
        offset: l,
        stepPosition: u,
      }),
      g = `M${d[0].x} ${d[0].y}`
    for (let e = 1; e < d.length - 1; e++) g += Ti(d[e - 1], d[e], d[e + 1], o)
    return (
      (g += `L${d[d.length - 1].x} ${d[d.length - 1].y}`),
      [g, f, p, m, h]
    )
  }
  function Di(e) {
    return (
      e &&
      !!(e.internals.handleBounds || e.handles?.length) &&
      !!(e.measured.width || e.width || e.initialWidth)
    )
  }
  function Oi(e) {
    let { sourceNode: t, targetNode: n } = e
    if (!Di(t) || !Di(n)) return null
    let r = t.internals.handleBounds || ki(t.handles),
      i = n.internals.handleBounds || ki(n.handles),
      a = ji(r?.source ?? [], e.sourceHandle),
      o = ji(
        e.connectionMode === mi.Strict
          ? (i?.target ?? [])
          : (i?.target ?? []).concat(i?.source ?? []),
        e.targetHandle
      )
    if (!a || !o)
      return (
        e.onError?.(
          `008`,
          pi.error008(a ? `target` : `source`, {
            id: e.id,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
          })
        ),
        null
      )
    let s = a?.position || V.Bottom,
      c = o?.position || V.Top,
      l = Ai(t, a, s),
      u = Ai(n, o, c)
    return {
      sourceX: l.x,
      sourceY: l.y,
      targetX: u.x,
      targetY: u.y,
      sourcePosition: s,
      targetPosition: c,
    }
  }
  function ki(e) {
    if (!e) return null
    let t = [],
      n = []
    for (let r of e)
      ((r.width = r.width ?? 1),
        (r.height = r.height ?? 1),
        r.type === `source` ? t.push(r) : r.type === `target` && n.push(r))
    return { source: t, target: n }
  }
  function Ai(e, t, n = V.Left, r = !1) {
    let i = (t?.x ?? 0) + e.internals.positionAbsolute.x,
      a = (t?.y ?? 0) + e.internals.positionAbsolute.y,
      { width: o, height: s } = t ?? yi(e)
    if (r) return { x: i + o / 2, y: a + s / 2 }
    switch (t?.position ?? n) {
      case V.Top:
        return { x: i + o / 2, y: a }
      case V.Right:
        return { x: i + o, y: a + s / 2 }
      case V.Bottom:
        return { x: i + o / 2, y: a + s }
      case V.Left:
        return { x: i, y: a + s / 2 }
    }
  }
  function ji(e, t) {
    return (e && (t ? e.find((e) => e.id === t) : e[0])) || null
  }
  var Mi
  ;(function (e) {
    ;((e.Line = `line`), (e.Handle = `handle`))
  })((Mi ||= {}))
  let H = Object.freeze({
      MIN_SCALE_TO_ZOOM_OUT: 0.4,
      MAX_SCALE_TO_ZOOM_IN: 2.5,
      MOUSE_UP_OFFSET_PX: 5,
      SNAP_TO_GRID_PX: 5,
      EXTRA_SPACE_FOR_EXTENSION: 10,
      PASTE_OFFSET_PX: 20,
    }),
    Ni = Object.freeze({
      SIZE: 30,
      RADIUS: 15,
      STROKE_WIDTH: 2,
      SOCKET_GAP: 4,
    }),
    U = Object.freeze({
      MARKER_PADDING: -3,
      SOURCE_CONNECTION_POINT_PADDING: 3,
      STEP_BORDER_RADIUS: 0,
      EDGE_HIGHLIGHT_STROKE_WIDTH: 15,
      EDGE_LINE_JUMP_HEIGHT: 10,
      EDGE_LINE_JUMP_WIDTH: 16,
      STUB_LENGTH: 30,
      NODE_CLEARANCE_PX: 5 * H.SNAP_TO_GRID_PX,
      MIN_NODE_CLEARANCE_PX: 2 * H.SNAP_TO_GRID_PX,
      MIN_STUB_LENGTH: H.SNAP_TO_GRID_PX,
      BEND_HANDLE_SCREEN_LENGTH_PX: 34,
      BEND_HANDLE_MIN_SCREEN_LENGTH_PX: 18,
      MIN_ENDPOINT_HIT_TARGET_PX: 15,
      BEND_HANDLE_CORNER_CLEARANCE_PX: 10,
      BEND_HANDLE_SAFE_AREA_PX: 25,
      ENDPOINT_HIT_TARGET_SIZE: 24,
      ENDPOINT_HANDLE_CLEARANCE_PX: 4,
      BEND_SNAP_GRID_PX: H.SNAP_TO_GRID_PX,
      ORTHOGONAL_DOGLEG_TOLERANCE_PX: 2,
      ORTHOGONAL_ARM_OVERLAP_PX: 10,
      LABEL_GAP: 14,
      LABEL_LINE_HEIGHT: 14,
      LABEL_NOMINAL_HALF_EXTENT: 40,
      WAYPOINT_DRAG_THRESHOLD_PX: 6,
      WAYPOINT_COLLINEAR_TOLERANCE_PX: 4,
      WAYPOINT_COLLAPSE_SNAP_SCREEN_PX: 10,
      WAYPOINT_HANDLE_RADIUS_PX: 5,
      WAYPOINT_HIT_TARGET_PX: 24,
      WAYPOINT_GHOST_MIN_SEGMENT_PX: 64,
    }),
    Pi = (e, t) => {
      if (e !== `package`) return t
      let n = Math.min(10, Math.max(0, t.height))
      return { ...t, y: t.y + n, height: Math.max(0, t.height - n) }
    },
    Fi = (e, t) => {
      let n = { x: e.position.x, y: e.position.y },
        r = e.parentId ? t.find((t) => t.id === e.parentId) : null
      for (; r; )
        ((n.x += r.position.x),
          (n.y += r.position.y),
          (r = r.parentId ? t.find((e) => e.id === r.parentId) : null))
      return n
    },
    Ii = new Set([
      `package`,
      `activity`,
      `activitySwimlane`,
      `useCaseSystem`,
      `componentSubsystem`,
      `deploymentNode`,
      `deploymentComponent`,
      `bpmnPool`,
      `bpmnGroup`,
      `bpmnSubprocess`,
      `bpmnTransaction`,
      `bpmnCallActivity`,
    ]),
    Li = (e) => e !== void 0 && Ii.has(e)
  function Ri(e, t) {
    let [n, r] = e,
      [i, a] = t,
      o = Math.max(n, i),
      s = Math.min(r, a)
    return o <= s ? [o, s] : null
  }
  function zi(e, t, n, r) {
    let i = n === U.MARKER_PADDING ? 0 : n === -Ni.RADIUS ? Ni.RADIUS : 15,
      a = e.direction,
      o = t.direction,
      s = r === void 0 ? null : (r.sourceY + r.targetY) / 2,
      c = r === void 0 ? null : (r.sourceX + r.targetX) / 2
    if (
      a === V.Right &&
      o === V.Left &&
      t.position.x >= e.position.x + e.width
    ) {
      if (r && Math.abs(r.sourceY - r.targetY) > 1) return null
      let n = Ri(
        [e.position.y, e.position.y + Math.max(40, e.height)],
        [t.position.y, t.position.y + Math.max(40, t.height)]
      )
      if (n !== null && n[1] - n[0] >= 40) {
        let a = s ?? (n[0] + n[1]) / 2
        return [
          { x: r?.sourceX ?? e.position.x + e.width, y: a },
          { x: r?.targetX ?? t.position.x - i, y: a },
        ]
      }
    }
    if (
      a === V.Left &&
      o === V.Right &&
      e.position.x >= t.position.x + t.width
    ) {
      if (r && Math.abs(r.sourceY - r.targetY) > 1) return null
      let n = Ri(
        [e.position.y, e.position.y + Math.max(40, e.height)],
        [t.position.y, t.position.y + Math.max(40, t.height)]
      )
      if (n !== null && n[1] - n[0] >= 40) {
        let a = s ?? (n[0] + n[1]) / 2
        return [
          { x: r?.sourceX ?? e.position.x, y: a },
          { x: r?.targetX ?? t.position.x + t.width + i, y: a },
        ]
      }
    }
    if (
      a === V.Bottom &&
      o === V.Top &&
      t.position.y >= e.position.y + e.height
    ) {
      if (r && Math.abs(r.sourceX - r.targetX) > 1) return null
      let n = Ri(
        [e.position.x, e.position.x + e.width],
        [t.position.x, t.position.x + t.width]
      )
      if (n !== null && n[1] - n[0] >= 40) {
        let a = c ?? (n[0] + n[1]) / 2
        return [
          { x: a, y: r?.sourceY ?? e.position.y + e.height },
          { x: a, y: r?.targetY ?? t.position.y - i },
        ]
      }
    }
    if (
      a === V.Top &&
      o === V.Bottom &&
      e.position.y >= t.position.y + t.height
    ) {
      if (r && Math.abs(r.sourceX - r.targetX) > 1) return null
      let n = Ri(
        [e.position.x, e.position.x + e.width],
        [t.position.x, t.position.x + t.width]
      )
      if (n !== null && n[1] - n[0] >= 40) {
        let a = c ?? (n[0] + n[1]) / 2
        return [
          { x: a, y: r?.sourceY ?? e.position.y },
          { x: a, y: r?.targetY ?? t.position.y + t.height + i },
        ]
      }
    }
    return null
  }
  let W = (e, t, n) => Math.max(t, Math.min(n, e)),
    Bi = (e, t) => {
      for (let n = 0; n < e.length; n++) if (e[n] !== t[n]) return e[n] < t[n]
      return !1
    },
    G = Object.freeze({
      bendInGridCells: 8,
      edgeCrossing: 400,
      crossingNearCorner: 600,
      crossingCornerClearance: 15,
      parallelCrowdingClearanceInGridCells: 2,
      crowdingPerPx: 3,
      overlapPerPx: 25,
      softCrossingPerPx: 50,
      clearancePerPxAtFullDeficit: 1,
      huggingPerPx: 8,
      channelImbalanceTieBreakPerPx: 1e-6,
      preferredSideChangeInGridCells: 7,
      preferredPortDisplacementPerPx: 3,
    }),
    Vi = (e, t, n) => {
      if (e <= 0) return []
      let r = Math.max(0, t),
        i = Math.max(1, n),
        a = Array(e)
      for (let t = 0; t < Math.ceil(e / 2); t++) {
        let n = e - 1 - t,
          o = Math.max(
            0,
            Math.min(r, Math.round((r * (t + 1)) / (e + 1) / i) * i)
          )
        ;((a[t] = o), n !== t && (a[n] = r - o))
      }
      return a
    },
    Hi = (e, t, n) => {
      let r = Math.max(0, t),
        i = Math.max(1, n)
      if (e.length === 0 || r === 0)
        return { cost: 0, maxGapErrorPx: 0, totalGapErrorPx: 0 }
      let a = (e) => Math.max(0, Math.min(r, Math.round(e / i) * i)),
        o = e
          .map((e) => a(Math.max(0, Math.min(1, e)) * r))
          .sort((e, t) => e - t),
        s = Vi(e.length, r, i),
        c = (e) => [
          e[0],
          ...e.slice(1).map((t, n) => t - e[n]),
          r - e[e.length - 1],
        ],
        l = c(o),
        u = c(s),
        d = l.map((e, t) => Math.abs(e - u[t])),
        f = d.reduce((e, t) => e + t, 0),
        p = Math.max(...d)
      return { cost: Math.round(f), maxGapErrorPx: p, totalGapErrorPx: f }
    },
    Ui = (e, t, n) => Hi([e.ratio], t, n).cost,
    Wi = (e, t, n, r) => {
      if (!t) return 0
      let i = Math.max(0, G.preferredSideChangeInGridCells * r)
      if (e.side !== t.side) return i
      let a = Math.round(
        Math.abs(e.ratio - t.ratio) *
          Math.max(0, n) *
          G.preferredPortDisplacementPerPx
      )
      return a === 0 ? 0 : a + 1
    },
    Gi = (e, t) =>
      (e.lengthPx ?? 0) +
      (e.bends ?? 0) * G.bendInGridCells * t +
      (e.crossings ?? 0) * G.edgeCrossing +
      (e.overlapPx ?? 0) * G.overlapPerPx +
      (e.crowdingPx ?? 0) * G.crowdingPerPx,
    Ki = (e) =>
      e.slice(1).flatMap((t, n) => {
        let r = e[n]
        return t.x === r.x && t.y === r.y ? [] : [{ a: r, b: t }]
      }),
    qi = (e, t, n) => (t.x - e.x) * (n.y - e.y) - (t.y - e.y) * (n.x - e.x),
    Ji = (e, t) => {
      let n = qi(e.a, e.b, t.a),
        r = qi(e.a, e.b, t.b),
        i = qi(t.a, t.b, e.a),
        a = qi(t.a, t.b, e.b)
      return n * r < 0 && i * a < 0
    },
    Yi = (e, t) => {
      let n = e.b.x - e.a.x,
        r = e.b.y - e.a.y,
        i = t.b.x - t.a.x
      if (n * (t.b.y - t.a.y) - r * i !== 0) return null
      let a = Math.abs(n) >= Math.abs(r),
        o = Math.min(a ? e.a.x : e.a.y, a ? e.b.x : e.b.y),
        s = Math.max(a ? e.a.x : e.a.y, a ? e.b.x : e.b.y),
        c = Math.min(a ? t.a.x : t.a.y, a ? t.b.x : t.b.y),
        l = Math.max(a ? t.a.x : t.a.y, a ? t.b.x : t.b.y),
        u = Math.min(s, l) - Math.max(o, c)
      if (u <= 0) return null
      let d = Math.max(Math.abs(n), Math.abs(r))
      return d === 0
        ? null
        : { overlap: u, gap: Math.abs(qi(e.a, e.b, t.a)) / d }
    },
    Xi = (e, t, n) => {
      let r = e.a[t],
        i = e.b[t] - r,
        a = t === `x` ? `y` : `x`
      return e.a[a] + ((n - r) / i) * (e.b[a] - e.a[a])
    },
    Zi = (e, t, n, r, i) => {
      if (i <= 0) return 0
      let a = { a: e, b: t },
        o = { a: n, b: r }
      if (Ji(a, o)) return 0
      let s = t.x - e.x,
        c = t.y - e.y,
        l = r.x - n.x,
        u = r.y - n.y,
        d = s !== 0 && l !== 0,
        f = c !== 0 && u !== 0
      if (!d && !f) return 0
      let p =
          d &&
          (!f ||
            Math.min(Math.abs(s), Math.abs(l)) >=
              Math.min(Math.abs(c), Math.abs(u)))
            ? `x`
            : `y`,
        m = Math.max(Math.min(e[p], t[p]), Math.min(n[p], r[p])),
        h = Math.min(Math.max(e[p], t[p]), Math.max(n[p], r[p])),
        g = h - m
      if (g <= 0) return 0
      let _ = Xi(a, p, m) - Xi(o, p, m),
        v = Xi(a, p, h) - Xi(o, p, h)
      if (_ * v <= 0) return 0
      let y = Math.abs(_),
        b = Math.abs(v)
      if (y >= i && b >= i) return 0
      if (y < i && b < i) return (g * (i - (y + b) / 2)) / i
      let x = Math.min(y, b),
        S = Math.max(y, b)
      return (g * ((i - x) / (S - x)) * (i - x)) / (2 * i)
    },
    Qi = (e, t, n) => {
      let r = 0,
        i = 0,
        a = 0,
        o = Ki(e)
      for (let e of t) {
        let t = Ki(e)
        for (let e of o)
          for (let o of t) {
            let t = Yi(e, o)
            if (t) {
              t.gap === 0
                ? (i += t.overlap)
                : t.gap < n && (a += (t.overlap * (n - t.gap)) / n)
              continue
            }
            Ji(e, o) ? r++ : (a += Zi(e.a, e.b, o.a, o.b, n))
          }
      }
      return (
        (i = Math.round(i)),
        (a = Math.round(a)),
        {
          crossings: r,
          overlapPx: i,
          crowdingPx: a,
          cost: Gi({ crossings: r, overlapPx: i, crowdingPx: a }, 1),
        }
      )
    },
    $i = (e) => {
      let t = e ?? 0
      if (!Number.isFinite(t) || t < 0)
        throw RangeError(`Route endpoint cost must be finite and non-negative`)
      return t
    },
    ea = (e) => {
      switch (e) {
        case V.Top:
          return 0
        case V.Right:
          return 1
        case V.Bottom:
          return 2
        case V.Left:
        default:
          return 3
      }
    },
    ta = (e) => (e + 2) % 4,
    na = new Uint8Array([0, 1, 3, 0, 1, 2, 1, 2, 3, 0, 2, 3]),
    ra = (() => {
      let e = new Uint8Array(256).fill(255),
        t = (n, r, i, a) => {
          let o = (n * 4 + r) * 16
          for (let t = 0; t < 16; t++)
            (i & t) === t && a < e[o + t] && (e[o + t] = a)
          if (a !== 4)
            for (let e = 0; e <= 3; e++) e !== r && t(n, e, i | (1 << e), a + 1)
        }
      for (let e = 0; e <= 3; e++) t(e, e, 1 << e, 0)
      return e
    })(),
    ia = G.bendInGridCells,
    aa = G.edgeCrossing,
    oa = G.crossingNearCorner,
    sa = G.crossingCornerClearance,
    ca = sa * sa,
    la = G.parallelCrowdingClearanceInGridCells,
    ua = G.crowdingPerPx,
    da = G.overlapPerPx,
    fa = G.softCrossingPerPx,
    pa = G.clearancePerPxAtFullDeficit,
    ma = G.huggingPerPx,
    ha = G.channelImbalanceTieBreakPerPx,
    ga = (e, t, n, r) => {
      let i = e.y === t.y,
        a = i ? Math.min(e.x, t.x) : Math.min(e.y, t.y),
        o = i ? Math.max(e.x, t.x) : Math.max(e.y, t.y),
        s = 2 * H.SNAP_TO_GRID_PX,
        c = 1 / 0,
        l = 1 / 0
      for (let t of n) {
        let n = i ? t.x : t.y,
          r = i ? t.x + t.width : t.y + t.height
        if (Math.min(o, r) - Math.max(a, n) < s) continue
        let u = i ? e.y : e.x,
          d = i ? t.y : t.x,
          f = i ? t.y + t.height : t.x + t.width
        u <= d ? (l = Math.min(l, d - u)) : u >= f && (c = Math.min(c, u - f))
      }
      let u = (c + l) / 2
      return { nearest: Math.min(c, l), achievable: Math.min(u, r) }
    },
    _a = (e, t, n) =>
      e.x === t.x
        ? { x: e.x, y: e.y + Math.sign(t.y - e.y) * n }
        : { x: e.x + Math.sign(t.x - e.x) * n, y: e.y },
    va = (e, t, n, r, i, a = 0) => {
      if (t.length === 0) return !1
      let o = [],
        s = 0
      for (let t = 0; t < e.length - 1; t++) {
        let n = Math.abs(e[t + 1].x - e[t].x) + Math.abs(e[t + 1].y - e[t].y)
        ;(o.push(n), (s += n))
      }
      let c = 0
      for (let l = 0; l < e.length - 1; l++) {
        let u = c
        c += o[l]
        let d = Math.max(0, a - u),
          f = Math.min(o[l], s - a - u)
        if (f - d <= 0) continue
        let { nearest: p, achievable: m } = ga(
          _a(e[l], e[l + 1], d),
          _a(e[l], e[l + 1], f),
          t,
          n
        )
        if (p !== 1 / 0 && (p === 0 || p < m - i || (p < r && m >= r)))
          return !0
      }
      return !1
    },
    ya = (e, t) =>
      !va(
        e,
        t,
        U.NODE_CLEARANCE_PX,
        U.MIN_NODE_CLEARANCE_PX,
        H.SNAP_TO_GRID_PX,
        U.STUB_LENGTH
      ),
    ba = (e) => {
      let t = []
      for (let n of e)
        for (let e = 0; e < n.length - 1; e++)
          t.push({
            x1: n[e].x,
            y1: n[e].y,
            x2: n[e + 1].x,
            y2: n[e + 1].y,
            startTerminal: e === 0,
            endTerminal: e === n.length - 2,
          })
      return t
    },
    xa = (e, t, n, r) => {
      let i = 4 * H.SNAP_TO_GRID_PX + U.NODE_CLEARANCE_PX,
        a = [e.x, ...t.map((e) => e.x)],
        o = [e.y, ...t.map((e) => e.y)],
        s = Math.min(...a, ...n.map((e) => e.x)) - i,
        c = Math.max(...a, ...n.map((e) => e.x + e.width)) + i,
        l = Math.min(...o, ...n.map((e) => e.y)) - i,
        u = Math.max(...o, ...n.map((e) => e.y + e.height)) + i,
        d = (e, t) => e >= s && e <= c && t >= l && t <= u,
        f = (e, t, n) => Math.max(t, Math.min(n, e))
      return ba(r).flatMap((e) => {
        if (
          !(
            Math.min(e.x1, e.x2) <= c &&
            Math.max(e.x1, e.x2) >= s &&
            Math.min(e.y1, e.y2) <= u &&
            Math.max(e.y1, e.y2) >= l
          )
        )
          return []
        let t = e.startTerminal && d(e.x1, e.y1),
          n = e.endTerminal && d(e.x2, e.y2)
        return e.y1 === e.y2
          ? [
              {
                ...e,
                x1: f(e.x1, s, c),
                x2: f(e.x2, s, c),
                startTerminal: t,
                endTerminal: n,
              },
            ]
          : e.x1 === e.x2
            ? [
                {
                  ...e,
                  y1: f(e.y1, l, u),
                  y2: f(e.y2, l, u),
                  startTerminal: t,
                  endTerminal: n,
                },
              ]
            : [{ ...e, startTerminal: t, endTerminal: n }]
      })
    },
    Sa = (e) => (e > 0 ? 1 : e < 0 ? -1 : 0),
    Ca = (e, t, n, r, i, a) => Sa((n - e) * (a - t) - (r - t) * (i - e)),
    wa = (e, t) => {
      if (
        !(
          Ca(e.x1, e.y1, e.x2, e.y2, t.x1, t.y1) *
            Ca(e.x1, e.y1, e.x2, e.y2, t.x2, t.y2) <
          0
        )
      )
        return !1
      let n = Ca(t.x1, t.y1, t.x2, t.y2, e.x1, e.y1),
        r = Ca(t.x1, t.y1, t.x2, t.y2, e.x2, e.y2)
      return (n < 0 && r >= 0) || (n > 0 && r <= 0)
    },
    Ta = (e, t) => {
      let n = e.y1 === e.y2,
        r = t.y1 === t.y2,
        i = e.x1 === e.x2,
        a = t.x1 === t.x2
      return n && r
        ? Math.min(Math.max(e.x1, e.x2), Math.max(t.x1, t.x2)) -
            Math.max(Math.min(e.x1, e.x2), Math.min(t.x1, t.x2)) >
          0
          ? Math.abs(e.y1 - t.y1)
          : null
        : i &&
            a &&
            Math.min(Math.max(e.y1, e.y2), Math.max(t.y1, t.y2)) -
              Math.max(Math.min(e.y1, e.y2), Math.min(t.y1, t.y2)) >
              0
          ? Math.abs(e.x1 - t.x1)
          : null
    },
    Ea = (e, t) => {
      let n = e.x1 * e.y2 - e.y1 * e.x2,
        r = t.x1 * t.y2 - t.y1 * t.x2,
        i = (e.x1 - e.x2) * (t.y1 - t.y2) - (e.y1 - e.y2) * (t.x1 - t.x2)
      return {
        x: (n * (t.x1 - t.x2) - (e.x1 - e.x2) * r) / i,
        y: (n * (t.y1 - t.y2) - (e.y1 - e.y2) * r) / i,
      }
    },
    Da = (e, t) =>
      Math.min(
        (e.x - t.x1) ** 2 + (e.y - t.y1) ** 2,
        (e.x - t.x2) ** 2 + (e.y - t.y2) ** 2
      ),
    Oa = (e, t, n, r) => {
      for (let i = 0; i < n.hy.length; i++)
        if (
          Math.max(n.hxLo[i] - e, e - n.hxHi[i], 0) + Math.abs(t - n.hy[i]) <
          r
        )
          return !0
      for (let i = 0; i < n.vx.length; i++) {
        let a = Math.max(n.vyLo[i] - t, t - n.vyHi[i], 0)
        if (Math.abs(e - n.vx[i]) + a < r) return !0
      }
      let i = r * r
      for (let r = 0; r < n.dx1.length; r++) {
        let a = n.dx1[r],
          o = n.dy1[r],
          s = n.dx2[r] - a,
          c = n.dy2[r] - o,
          l = s * s + c * c,
          u = Math.max(0, Math.min(1, ((e - a) * s + (t - o) * c) / l)),
          d = e - (a + u * s),
          f = t - (o + u * c)
        if (d * d + f * f < i) return !0
      }
      return !1
    },
    ka = (e) => {
      let t = e.filter((e) => e.y1 === e.y2 && e.x1 !== e.x2),
        n = e.filter((e) => e.x1 === e.x2 && e.y1 !== e.y2),
        r = e.filter((e) => e.x1 !== e.x2 && e.y1 !== e.y2),
        i = {
          hy: new Float64Array(t.length),
          hxLo: new Float64Array(t.length),
          hxHi: new Float64Array(t.length),
          vx: new Float64Array(n.length),
          vyLo: new Float64Array(n.length),
          vyHi: new Float64Array(n.length),
          dx1: new Float64Array(r.length),
          dy1: new Float64Array(r.length),
          dx2: new Float64Array(r.length),
          dy2: new Float64Array(r.length),
        }
      return (
        t.forEach((e, t) => {
          ;((i.hy[t] = e.y1),
            (i.hxLo[t] = Math.min(e.x1, e.x2)),
            (i.hxHi[t] = Math.max(e.x1, e.x2)))
        }),
        n.forEach((e, t) => {
          ;((i.vx[t] = e.x1),
            (i.vyLo[t] = Math.min(e.y1, e.y2)),
            (i.vyHi[t] = Math.max(e.y1, e.y2)))
        }),
        r.forEach((e, t) => {
          ;((i.dx1[t] = e.x1),
            (i.dy1[t] = e.y1),
            (i.dx2[t] = e.x2),
            (i.dy2[t] = e.y2))
        }),
        i
      )
    },
    Aa = (e, t, n, r, i, a) => {
      let o = t === r,
        s = 0,
        c = o ? t : e,
        l = o ? Math.min(e, n) : Math.min(t, r),
        u = o ? Math.max(e, n) : Math.max(t, r),
        d = o ? i.hy : i.vx,
        f = o ? i.hxLo : i.vyLo,
        p = o ? i.hxHi : i.vyHi
      for (let e = 0; e < d.length; e++) {
        let t = Math.min(u, p[e]) - Math.max(l, f[e])
        if (t <= 0) continue
        let n = Math.abs(c - d[e])
        n === 0 ? (s += da * t) : n < a && (s += ua * t)
      }
      let m = o ? e : t,
        h = o ? n : r,
        g = o ? i.vx : i.hy,
        _ = o ? i.vyLo : i.hxLo,
        v = o ? i.vyHi : i.hxHi
      for (let e = 0; e < g.length; e++) {
        if (!(_[e] < c && c < v[e])) continue
        let t = g[e]
        ;(h > m ? m < t && t <= h : h <= t && t < m) &&
          ((s += aa),
          Math.min(Math.abs(c - _[e]), Math.abs(c - v[e])) < sa && (s += oa))
      }
      for (let c = 0; c < i.dx1.length; c++) {
        let l = i.dx1[c],
          u = i.dy1[c],
          d = i.dx2[c],
          f = i.dy2[c]
        if (!(Ca(e, t, n, r, l, u) * Ca(e, t, n, r, d, f) < 0)) {
          s +=
            ua *
            Zi(
              { x: e, y: t },
              { x: n, y: r },
              { x: l, y: u },
              { x: d, y: f },
              a
            )
          continue
        }
        let p = Ca(l, u, d, f, e, t),
          m = Ca(l, u, d, f, n, r)
        if (!((p < 0 && m >= 0) || (p > 0 && m <= 0))) {
          s +=
            ua *
            Zi(
              { x: e, y: t },
              { x: n, y: r },
              { x: l, y: u },
              { x: d, y: f },
              a
            )
          continue
        }
        s += aa
        let h = o ? (t - u) / (f - u) : (e - l) / (d - l),
          g = l + h * (d - l),
          _ = u + h * (f - u)
        Math.min((g - l) ** 2 + (_ - u) ** 2, (g - d) ** 2 + (_ - f) ** 2) <
          ca && (s += oa)
      }
      return s
    },
    ja = (e, t) => {
      let n = ba(t)
      if (n.length === 0) return !1
      let r = la * H.SNAP_TO_GRID_PX
      for (let t = 0; t < e.length - 1; t++) {
        let i = { x1: e[t].x, y1: e[t].y, x2: e[t + 1].x, y2: e[t + 1].y }
        for (let e of n) {
          let t = Ta(i, e)
          if (t !== null) {
            if (t < r) return !0
            continue
          }
          if (!wa(i, e)) {
            if (
              Zi(
                { x: i.x1, y: i.y1 },
                { x: i.x2, y: i.y2 },
                { x: e.x1, y: e.y1 },
                { x: e.x2, y: e.y2 },
                r
              ) > 0
            )
              return !0
            continue
          }
          let n = Ea(i, e)
          if (Da(n, i) < ca || Da(n, e) < ca) return !0
        }
      }
      return !1
    },
    Ma = (e, t) =>
      e.y1 === e.y2 && t.y1 === t.y2
        ? Math.max(
            0,
            Math.min(Math.max(e.x1, e.x2), Math.max(t.x1, t.x2)) -
              Math.max(Math.min(e.x1, e.x2), Math.min(t.x1, t.x2))
          )
        : e.x1 === e.x2 && t.x1 === t.x2
          ? Math.max(
              0,
              Math.min(Math.max(e.y1, e.y2), Math.max(t.y1, t.y2)) -
                Math.max(Math.min(e.y1, e.y2), Math.min(t.y1, t.y2))
            )
          : 0,
    Na = (e, t) => {
      let n = ba(t),
        r = 0,
        i = 0
      if (n.length === 0) return { crossings: r, proximityPx: i }
      let a = la * H.SNAP_TO_GRID_PX
      for (let t = 0; t < e.length - 1; t++) {
        let o = { x1: e[t].x, y1: e[t].y, x2: e[t + 1].x, y2: e[t + 1].y }
        for (let e of n) {
          let t = Ta(o, e)
          t === null
            ? wa(o, e)
              ? r++
              : (i += Zi(
                  { x: o.x1, y: o.y1 },
                  { x: o.x2, y: o.y2 },
                  { x: e.x1, y: e.y1 },
                  { x: e.x2, y: e.y2 },
                  a
                ))
            : t < a && (i += (Ma(o, e) * (a - t)) / a)
        }
      }
      return { crossings: r, proximityPx: Math.round(i) }
    },
    Pa = (e, t, n) => {
      let r = (e) => Math.round(e / n) * n,
        i = new Set()
      for (let t of e) i.add(t)
      for (let e of t) i.add(r(e))
      return [...i].sort((e, t) => e - t)
    }
  var Fa = class {
    priorities
    seqs
    states
    count = 0
    constructor(e) {
      let t = Math.max(16, e)
      ;((this.priorities = new Float64Array(t)),
        (this.seqs = new Float64Array(t)),
        (this.states = new Int32Array(t)))
    }
    grow() {
      let e = this.priorities.length * 2,
        t = new Float64Array(e),
        n = new Float64Array(e),
        r = new Int32Array(e)
      ;(t.set(this.priorities),
        n.set(this.seqs),
        r.set(this.states),
        (this.priorities = t),
        (this.seqs = n),
        (this.states = r))
    }
    less(e, t) {
      let n = this.priorities[e],
        r = this.priorities[t]
      return n < r || (n === r && this.seqs[e] < this.seqs[t])
    }
    push(e, t, n) {
      this.count === this.priorities.length && this.grow()
      let r = this.count++
      for (; r > 0; ) {
        let n = (r - 1) >> 2,
          i = this.priorities[n],
          a = this.seqs[n]
        if (i < e || (i === e && a < t)) break
        ;((this.priorities[r] = i),
          (this.seqs[r] = a),
          (this.states[r] = this.states[n]),
          (r = n))
      }
      ;((this.priorities[r] = e), (this.seqs[r] = t), (this.states[r] = n))
    }
    pop() {
      if (this.count === 0) return -1
      let e = this.states[0]
      if ((this.count--, this.count > 0)) {
        let e = this.priorities[this.count],
          t = this.seqs[this.count],
          n = this.states[this.count],
          r = 0
        for (;;) {
          let n = 4 * r + 1
          if (n >= this.count) break
          let i = n,
            a = Math.min(n + 4, this.count)
          for (let e = n + 1; e < a; e++) this.less(e, i) && (i = e)
          let o = this.priorities[i],
            s = this.seqs[i]
          if (e < o || (e === o && t < s)) break
          ;((this.priorities[r] = o),
            (this.seqs[r] = s),
            (this.states[r] = this.states[i]),
            (r = i))
        }
        ;((this.priorities[r] = e), (this.seqs[r] = t), (this.states[r] = n))
      }
      return e
    }
    peekPriority() {
      return this.count === 0 ? 1 / 0 : this.priorities[0]
    }
    get size() {
      return this.count
    }
  }
  let Ia = (e, t, n, r = [], i, a) => {
      if (e.length === 0 || t.length === 0) return null
      let o = 0,
        s = 0,
        c = 0,
        l = 0,
        u = H.SNAP_TO_GRID_PX,
        d = U.NODE_CLEARANCE_PX,
        f = U.MIN_NODE_CLEARANCE_PX,
        p = ia * u,
        m = la * u,
        h = pa / (d / u),
        g = (e, t) =>
          e.point.x - t.point.x ||
          e.point.y - t.point.y ||
          (e.position < t.position ? -1 : +(e.position > t.position)) ||
          e.stubLength - t.stubLength ||
          $i(e.cost) - $i(t.cost) ||
          Number(e.forceStubTurn ?? !1) - Number(t.forceStubTurn ?? !1),
        _ = (e, t) =>
          g(e.candidate, t.candidate) || e.inputIndex - t.inputIndex,
        v = e.map((e, t) => ({ candidate: e, inputIndex: t })).sort(_),
        y = t.map((e, t) => ({ candidate: e, inputIndex: t })).sort(_)
      if (
        v.length === 1 &&
        y.length === 1 &&
        ((e, t) => {
          let n = Math.min(e.length, t.length)
          for (let r = 0; r < n; r++) {
            let n = g(e[r].candidate, t[r].candidate)
            if (n !== 0) return n
          }
          return e.length - t.length
        })(v, y) > 0
      ) {
        let o = Ia(
          t,
          e,
          n,
          r,
          i ? [...i].reverse() : void 0,
          a ? { source: a.target, target: a.source } : void 0
        )
        return o
          ? {
              route: [...o.route].reverse(),
              sourceIndex: o.targetIndex,
              targetIndex: o.sourceIndex,
              cost: o.cost,
            }
          : null
      }
      let b = v.map(({ candidate: e, inputIndex: t }) => {
          let n = ea(e.position)
          return {
            inputIndex: t,
            point: e.point,
            heading: n,
            exit: Ba(e.point, n, e.stubLength),
            minExit: Ba(e.point, n, u),
            cost: $i(e.cost),
            forceStubTurn: e.forceStubTurn ?? !1,
          }
        }),
        x = y.map(({ candidate: e, inputIndex: t }) => {
          let n = ea(e.position)
          return {
            inputIndex: t,
            point: e.point,
            requiredArrival: ta(n),
            exit: Ba(e.point, n, e.stubLength),
            minExit: Ba(e.point, n, u),
            cost: $i(e.cost),
            forceStubTurn: e.forceStubTurn ?? !1,
          }
        }),
        S = n.filter((e) => !e.soft),
        C = n.filter((e) => e.soft),
        w = 1 / 0
      for (let e of b)
        for (let t of x)
          w = Math.min(
            w,
            e.cost +
              t.cost +
              Math.abs(e.point.x - t.point.x) +
              Math.abs(e.point.y - t.point.y)
          )
      let T = (e, t) =>
          e.x === t.x
            ? e.y === t.y
              ? null
              : t.y > e.y
                ? 2
                : 0
            : e.y === t.y
              ? t.x > e.x
                ? 1
                : 3
              : null,
        E = (e, t, n) =>
          Math.min(e.x, t.x) < n.x + n.width &&
          Math.max(e.x, t.x) > n.x &&
          Math.min(e.y, t.y) < n.y + n.height &&
          Math.max(e.y, t.y) > n.y,
        ee = (e, t) =>
          e.x === t.x &&
          e.y === t.y &&
          e.width === t.width &&
          e.height === t.height,
        te = (e) => a !== void 0 && (ee(e, a.source) || ee(e, a.target)),
        D = S.filter((e) => !te(e))
      for (let e = 0; e < b.length; e++) {
        let t = b[e]
        for (let e = 0; e < x.length; e++) {
          let n = x[e],
            i =
              Math.abs(t.point.x - n.point.x) + Math.abs(t.point.y - n.point.y)
          if (t.cost + n.cost + i !== w || t.forceStubTurn || n.forceStubTurn)
            continue
          let a = T(t.point, n.point),
            o = i === 0
          if (
            !(o
              ? t.heading !== n.requiredArrival
              : a !== t.heading || a !== n.requiredArrival) &&
            !(
              D.some((e) => E(t.point, n.point, e)) ||
              C.some((e) => E(t.point, n.point, e))
            )
          ) {
            if (!o) {
              let { nearest: e, achievable: i } = ga(t.point, n.point, D, d)
              if (e === 0 || (e !== 1 / 0 && e < i)) continue
              let a = Na([t.point, n.point], r)
              if (a.crossings > 0 || a.proximityPx > 0) continue
            }
            return {
              route: o ? [t.point] : [t.point, n.point],
              sourceIndex: t.inputIndex,
              targetIndex: n.inputIndex,
              cost: w,
            }
          }
        }
      }
      let O = x.length,
        ne = new Float64Array(O),
        re = new Float64Array(O),
        k = new Uint8Array(O),
        A = new Float64Array(O),
        ie = !1
      for (let e = 0; e < O; e++) {
        let t = x[e]
        ;((ne[e] = t.point.x),
          (re[e] = t.point.y),
          (k[e] = t.requiredArrival),
          (A[e] = t.cost),
          (ie ||= t.forceStubTurn))
      }
      let ae = xa(
          b[0].point,
          [...b.slice(1).map((e) => e.point), ...x.map((e) => e.point)],
          n,
          r
        ),
        j = ka(ae),
        M = 4 * u,
        N = [
          ...b.flatMap((e) => [e.point.x, e.exit.x]),
          ...x.flatMap((e) => [e.point.x, e.exit.x]),
          ...n.flatMap((e) => [e.x, e.x + e.width]),
        ],
        oe = [
          ...b.flatMap((e) => [e.point.y, e.exit.y]),
          ...x.flatMap((e) => [e.point.y, e.exit.y]),
          ...n.flatMap((e) => [e.y, e.y + e.height]),
        ],
        se = [
          ...b.flatMap((e) => [e.point.x, e.exit.x, e.minExit.x]),
          ...x.flatMap((e) => [e.point.x, e.exit.x, e.minExit.x]),
          Math.min(...N) - M,
          Math.max(...N) + M,
        ],
        ce = [
          ...b.flatMap((e) => [e.point.y, e.exit.y, e.minExit.y]),
          ...x.flatMap((e) => [e.point.y, e.exit.y, e.minExit.y]),
          Math.min(...oe) - M,
          Math.max(...oe) + M,
        ],
        le = (e) => Math.floor((e - m) / u) * u,
        ue = (e) => Math.ceil((e + m) / u) * u,
        de = (e, t, n, r) => {
          let i = []
          return (
            n && i.push(e < t ? le(e) : ue(e)),
            r && i.push(t < e ? le(t) : ue(t)),
            i
          )
        },
        fe = ae.flatMap((e) => {
          if (e.x1 === e.x2) return [le(e.x1), ue(e.x1)]
          if (e.y1 === e.y2) {
            let t = [
              ...de(e.x1, e.x2, e.startTerminal ?? !1, e.endTerminal ?? !1),
            ]
            return (
              Math.abs(e.x2 - e.x1) >= 2 * sa + u && t.push((e.x1 + e.x2) / 2),
              t
            )
          }
          return de(e.x1, e.x2, e.startTerminal ?? !1, e.endTerminal ?? !1)
        }),
        pe = ae.flatMap((e) => {
          if (e.y1 === e.y2) return [le(e.y1), ue(e.y1)]
          if (e.x1 === e.x2) {
            let t = [
              ...de(e.y1, e.y2, e.startTerminal ?? !1, e.endTerminal ?? !1),
            ]
            return (
              Math.abs(e.y2 - e.y1) >= 2 * sa + u && t.push((e.y1 + e.y2) / 2),
              t
            )
          }
          return de(e.y1, e.y2, e.startTerminal ?? !1, e.endTerminal ?? !1)
        }),
        me = [...n.flatMap((e) => [e.x, e.x + e.width]), ...fe],
        he = [...n.flatMap((e) => [e.y, e.y + e.height]), ...pe],
        ge = (e, t) =>
          e.flatMap((e) =>
            t === `x`
              ? [e.x - d, e.x + e.width + d]
              : [e.y - d, e.y + e.height + d]
          ),
        _e = (e, t) => {
          let n = []
          for (let r of e)
            for (let i of e) {
              if (r === i) continue
              let e = t === `x` ? r.x + r.width : r.y + r.height,
                a = t === `x` ? i.x : i.y,
                o = a - e
              if (o <= 0 || o >= 4 * d) continue
              let s = t === `x` ? r.y : r.x,
                c = t === `x` ? r.y + r.height : r.x + r.width,
                l = t === `x` ? i.y : i.x,
                f = t === `x` ? i.y + i.height : i.x + i.width
              if (Math.min(c, f) < Math.max(s, l)) continue
              let p = (e + a) / 2
              n.push(Math.floor(p / u) * u, Math.ceil(p / u) * u)
            }
          return n
        },
        P = Pa(se, [...me, ...ge(n, `x`), ..._e(n, `x`)], u),
        F = Pa(ce, [...he, ...ge(n, `y`), ..._e(n, `y`)], u),
        ve = new Map(P.map((e, t) => [e, t])),
        ye = new Map(F.map((e, t) => [e, t])),
        be = (e, t) => ({ x: P[e], y: F[t] }),
        I = F.length,
        xe = P.length * F.length
      if (xe > 4e4) return null
      let L = xe * 4,
        R = (e, t, n) => (e * I + t) * 4 + n,
        Se = new Int32Array(L).fill(-1),
        Ce = new Int32Array(L).fill(-1),
        we = new Float64Array(L),
        Te = new Uint8Array(L),
        Ee = new Uint8Array(xe),
        De = new Uint8Array(xe)
      ;(b.forEach((e) => {
        let t = ve.get(e.point.x),
          n = ye.get(e.point.y)
        t !== void 0 && n !== void 0 && (De[t * I + n] = 1)
      }),
        x.forEach((e, t) => {
          let n = ve.get(e.point.x) * I + ye.get(e.point.y),
            r = n * 4 + e.requiredArrival
          ;((Se[r] === -1 ||
            e.cost < we[r] ||
            (e.cost === we[r] && Te[r] === 1 && !e.forceStubTurn)) &&
            ((Se[r] = e.inputIndex),
            (Ce[r] = t),
            (we[r] = e.cost),
            (Te[r] = +!!e.forceStubTurn)),
            (Ee[n] = 1))
        }))
      let Oe = (e, t, n, r, i) => {
          let a = r.x - e,
            o = r.y - t,
            s = 0
          ;(a > 0 ? (s |= 2) : a < 0 && (s |= 8),
            o > 0 ? (s |= 4) : o < 0 && (s |= 1))
          let c = ra[(n * 4 + i) * 16 + s]
          return Math.abs(a) + Math.abs(o) + c * p
        },
        ke = new Float64Array(xe * 4).fill(NaN),
        Ae = new Uint16Array(xe * 4),
        je = (e, t, n) => {
          let r = R(e, t, n),
            i = ke[r]
          if (!Number.isNaN(i)) return i
          s++
          let a = 1 / 0,
            o = 0
          if (!ie) {
            let i = P[e],
              s = F[t]
            for (let e = 0; e < O; e++) {
              let t = ne[e] - i,
                r = re[e] - s,
                c = 0
              ;(t > 0 ? (c |= 2) : t < 0 && (c |= 8),
                r > 0 ? (c |= 4) : r < 0 && (c |= 1))
              let l = ra[(n * 4 + k[e]) * 16 + c],
                u = Math.abs(t) + Math.abs(r) + l * p + A[e]
              u < a && ((a = u), (o = e))
            }
            return ((ke[r] = a), (Ae[r] = o), a)
          }
          for (let r = 0; r < x.length; r++) {
            let i = x[r],
              s
            if (
              i.forceStubTurn &&
              !(
                P[e] === i.point.x &&
                F[t] === i.point.y &&
                n === i.requiredArrival
              )
            ) {
              s = 1 / 0
              for (let r = 0; r <= 3; r++)
                r !== i.requiredArrival &&
                  (s = Math.min(
                    s,
                    Oe(P[e], F[t], n, i.exit, r) +
                      p +
                      Math.abs(i.exit.x - i.point.x) +
                      Math.abs(i.exit.y - i.point.y)
                  ))
            } else s = Oe(P[e], F[t], n, i.point, i.requiredArrival)
            let c = s + i.cost
            c < a && ((a = c), (o = r))
          }
          return ((ke[r] = a), (Ae[r] = o), a)
        },
        Me = new Float64Array(xe * 4).fill(-2),
        Ne = new Float64Array(xe * 2).fill(-2),
        Pe = new Int8Array(xe).fill(-1),
        Fe = S.length,
        Ie = new Float64Array(Fe),
        Le = new Float64Array(Fe),
        Re = new Float64Array(Fe),
        ze = new Float64Array(Fe)
      S.forEach((e, t) => {
        ;((Ie[t] = e.x),
          (Le[t] = e.y),
          (Re[t] = e.x + e.width),
          (ze[t] = e.y + e.height))
      })
      let Be = (e, t, n, r, i) => {
          let a = (e * I + t) * 4 + i,
            s = Me[a]
          if (s !== -2) return s
          o++
          let c = P[e],
            l = F[t],
            p = P[n],
            g = F[r],
            _ = l === g,
            v = c < p ? c : p,
            y = c < p ? p : c,
            b = l < g ? l : g,
            x = l < g ? g : l,
            S = (_ ? Math.min(e, n) * I + t : e * I + Math.min(t, r)) * 2 + +!_,
            w = Ne[S]
          if (w === -2) {
            let e = 1 / 0,
              t = 1 / 0,
              n = !1
            for (let r = 0; r < Fe; r++) {
              if (v < Re[r] && y > Ie[r] && b < ze[r] && x > Le[r])
                return ((Ne[S] = -1), (Me[a] = -1), -1)
              let i = _
                  ? Math.min(y, Re[r]) - Math.max(v, Ie[r])
                  : Math.min(x, ze[r]) - Math.max(b, Le[r]),
                o = _ ? l >= Le[r] && l <= ze[r] : c >= Ie[r] && c <= Re[r]
              i === 0 && o && (n = !0)
              let s = _ ? Ie[r] : Le[r],
                u = _ ? Re[r] : ze[r]
              if ((_ ? y : x) <= s || (_ ? v : b) >= u) continue
              let d = _ ? l : c,
                f = _ ? Le[r] : Ie[r],
                p = _ ? ze[r] : Re[r]
              if (d <= f) {
                let e = f - d
                e < t && (t = e)
              } else {
                let t = d - p
                t < e && (e = t)
              }
            }
            let r = _ ? y - v : x - b,
              i = 0
            for (let e of C)
              if (
                v < e.x + e.width &&
                y > e.x &&
                b < e.y + e.height &&
                x > e.y
              ) {
                let t = _
                  ? Math.min(y, e.x + e.width) - Math.max(v, e.x)
                  : Math.min(x, e.y + e.height) - Math.max(b, e.y)
                i += fa * t
              }
            let o = 0,
              s = e < t ? e : t
            if (s !== 1 / 0) {
              let n = (e + t) / 2,
                i = n < d ? n : d,
                a = Math.max(0, Math.ceil((i - s) / u))
              if (
                (a > 0 && (o += a * h * r),
                (s === 0 || (s < f && i >= f)) && (o += ma * r),
                e !== 1 / 0 && t !== 1 / 0 && e + t < 4 * d)
              ) {
                let n = Math.abs(e - t) / (e + t)
                o += ha * n * r
              }
            }
            ;((w = r + i + o + (n ? ma * r : 0)), (Ne[S] = w))
          }
          if (w === -1) return ((Me[a] = -1), -1)
          let T = w + Aa(c, l, p, g, j, m)
          return ((Me[a] = T), T)
        },
        Ve = (() => {
          if (!i || i.length === 0) return 1 / 0
          let e = i.filter(
            (e, t) => t === 0 || e.x !== i[t - 1].x || e.y !== i[t - 1].y
          )
          if (e.length === 0) return 1 / 0
          let t = (e, t) =>
              e.x === t.x
                ? e.y < t.y
                  ? 2
                  : e.y > t.y
                    ? 0
                    : null
                : e.y === t.y
                  ? e.x < t.x
                    ? 1
                    : 3
                  : null,
            n = (e, t) => e.x === t.x && e.y === t.y,
            r = e.length > 1 ? t(e[0], e[1]) : null,
            a = e.length > 1 ? t(e[e.length - 2], e[e.length - 1]) : null,
            o = 1 / 0
          for (let i of b)
            if (
              n(e[0], i.point) &&
              !(r !== null && r !== i.heading) &&
              !(i.forceStubTurn && (e.length < 3 || !n(e[1], i.exit)))
            )
              for (let r of x) {
                if (!n(e[e.length - 1], r.point)) continue
                if (e.length === 1) {
                  if (i.heading !== r.requiredArrival) continue
                  o = Math.min(o, i.cost + r.cost)
                  continue
                }
                if (
                  a !== r.requiredArrival ||
                  (r.forceStubTurn &&
                    (e.length < 3 || !n(e[e.length - 2], r.exit)))
                )
                  continue
                let s = i.cost,
                  c = null,
                  l = !0
                for (let n = 0; n < e.length - 1; n++) {
                  let i = e[n],
                    a = e[n + 1],
                    o = t(i, a),
                    u = ve.get(i.x),
                    d = ye.get(i.y),
                    f = ve.get(a.x),
                    m = ye.get(a.y)
                  if (
                    o === null ||
                    u === void 0 ||
                    d === void 0 ||
                    f === void 0 ||
                    m === void 0 ||
                    (c !== null && o === ta(c))
                  ) {
                    l = !1
                    break
                  }
                  if (c !== null && o !== c) {
                    s += p
                    let e = u * I + d,
                      t = Pe[e]
                    ;(t === -1 && ((t = +!!Oa(i.x, i.y, j, sa)), (Pe[e] = t)),
                      t === 1 && (s += oa))
                  }
                  let h = u,
                    g = d
                  for (; h !== f || g !== m; ) {
                    let t = o === 3 ? h - 1 : o === 1 ? h + 1 : h,
                      i = o === 0 ? g - 1 : o === 2 ? g + 1 : g
                    if (t < 0 || t >= P.length || i < 0 || i >= F.length) {
                      l = !1
                      break
                    }
                    let a = Be(h, g, t, i, o)
                    if (a === -1) {
                      l = !1
                      break
                    }
                    ;((s += a), (h = t), (g = i))
                    let c = n === e.length - 2 && h === f && g === m,
                      u = h * I + g
                    if (
                      De[u] === 1 ||
                      (Ee[u] === 1 &&
                        (!c || R(h, g, o) !== R(f, m, r.requiredArrival)))
                    ) {
                      l = !1
                      break
                    }
                  }
                  if (!l) break
                  c = o
                }
                l && (o = Math.min(o, s + r.cost))
              }
          return o
        })(),
        He = new Float64Array(L).fill(NaN),
        Ue = new Int32Array(L).fill(-1),
        We = new Int32Array(L).fill(-1),
        Ge = new Int32Array(L).fill(-1),
        Ke = new Uint8Array(L),
        qe = new Fa(Math.min(L, 1024)),
        Je = 0,
        Ye = new Uint8Array(L)
      b.forEach((e, t) => {
        let n = ve.get(e.point.x),
          r = ye.get(e.point.y),
          i = n * I + r,
          a = R(n, r, e.heading)
        ;((De[i] = 1), (Ye[a] = 1))
        let o = He[a]
        if (!Number.isNaN(o) && o <= e.cost) return
        ;((He[a] = e.cost), (We[a] = e.inputIndex), (Ge[a] = t))
        let s = je(n, r, e.heading)
        if (Se[a] === -1) {
          let t = e.heading === 3 ? n - 1 : e.heading === 1 ? n + 1 : n,
            i = e.heading === 0 ? r - 1 : e.heading === 2 ? r + 1 : r
          if (t < 0 || t >= P.length || i < 0 || i >= F.length) return
          let a = Be(n, r, t, i, e.heading)
          if (a === -1) return
          s = a + je(t, i, e.heading)
        }
        let u = e.cost + s
        if (u > Ve) {
          l++
          return
        }
        ;(qe.push(u, Je++, a), c++)
      })
      let Xe = (e) => {
          let t = e & 3,
            n = (e - t) / 4
          return { xi: Math.floor(n / I), yi: n % I, h: t }
        },
        Ze = 0,
        z = null
      for (
        ;
        qe.size > 0 &&
        qe.peekPriority() <= Ve &&
        (!z ||
          qe.peekPriority() < z.total ||
          (qe.peekPriority() === z.total &&
            (z.sourceRank > 0 || z.targetCanonicalIndex > 0)));
      ) {
        let e = qe.pop()
        if (Ke[e]) continue
        let t = e & 3,
          n = (e - t) / 4,
          r = (n / I) | 0,
          i = n - r * I
        if (z && He[e] + je(r, i, t) === z.total) {
          let t = Ge[e],
            n = Ae[e]
          if (
            t > z.sourceRank ||
            (t === z.sourceRank && n >= z.targetCanonicalIndex)
          )
            continue
        }
        if (((Ke[e] = 1), ++Ze > 6e4)) return null
        let a = Se[e]
        if (a !== -1) {
          let t = He[e] + we[e],
            n = Ge[e],
            r = Ce[e]
          ;(!z ||
            t < z.total ||
            (t === z.total &&
              (n < z.sourceRank ||
                (n === z.sourceRank && r < z.targetCanonicalIndex)))) &&
            (z = {
              state: e,
              total: t,
              sourceRank: n,
              targetInputIndex: a,
              targetCanonicalIndex: r,
            })
          continue
        }
        let o = He[e],
          s = Ye[e] === 1 && Ue[e] === -1,
          u = b[Ge[e]],
          d =
            (u?.forceStubTurn ?? !1) && P[r] === u.exit.x && F[i] === u.exit.y,
          f = s ? 1 : 3,
          m = t * 3
        for (let n = 0; n < f; n++) {
          let a = s ? t : na[m + n],
            u = a === 3 ? r - 1 : a === 1 ? r + 1 : r,
            f = a === 0 ? i - 1 : a === 2 ? i + 1 : i
          if (u < 0 || u >= P.length || f < 0 || f >= F.length) continue
          let h = u * I + f
          if (De[h] === 1) continue
          let g = R(u, f, a)
          if (Ke[g]) continue
          let _ = Se[g]
          if (Ee[h] === 1 && _ === -1) continue
          if (Te[g] === 1) {
            let e = x[Ce[g]]
            if (!(P[r] === e.exit.x && F[i] === e.exit.y) || a === t) continue
          }
          if (d && a === t) continue
          let v = Be(r, i, u, f, a)
          if (v === -1) continue
          let y = 0
          if (a !== t) {
            y = p
            let e = r * I + i,
              t = Pe[e]
            ;(t === -1 && ((t = +!!Oa(P[r], F[i], j, sa)), (Pe[e] = t)),
              t === 1 && (y += oa))
          }
          let b = o + v + y,
            S = He[g],
            C = Number.isNaN(S),
            w = !C && b === S && Ge[e] < Ge[g]
          if ((!C && b > S) || (!C && b === S && !w)) continue
          let T = b + je(u, f, a)
          if (T > Ve) {
            l++
            continue
          }
          ;((He[g] = b),
            (Ue[g] = e),
            (We[g] = We[e]),
            (Ge[g] = Ge[e]),
            qe.push(T, Je++, g),
            c++)
        }
      }
      if (z) {
        let e = [],
          t = z.state,
          n = L
        for (; t !== -1; ) {
          if (n-- === 0) return null
          let r = Xe(t)
          ;(e.push(be(r.xi, r.yi)), (t = Ue[t]))
        }
        return (
          e.reverse(),
          {
            route: za(e),
            sourceIndex: We[z.state],
            targetIndex: z.targetInputIndex,
            cost: z.total,
          }
        )
      }
      return Ve === 1 / 0 ? null : Ia(e, t, n, r)
    },
    La = (e, t, n, r, i, a = []) => {
      let o = Ia([{ point: e, position: t, stubLength: n }], r, i, a)
      return o ? { route: o.route, targetIndex: o.targetIndex } : null
    },
    Ra = (e, t, n, r, i, a, o, s = []) => {
      let c = La(e, n, a, [{ point: t, position: r, stubLength: o }], i, s)
      return c ? c.route : null
    },
    za = (e) => {
      if (e.length < 3) return e
      let t = [e[0]]
      for (let n = 1; n < e.length - 1; n++) {
        let r = t[t.length - 1],
          i = e[n],
          a = e[n + 1],
          o = r.x === i.x && i.x === a.x && (r.y - i.y) * (a.y - i.y) < 0,
          s = r.y === i.y && i.y === a.y && (r.x - i.x) * (a.x - i.x) < 0
        !o && !s && t.push(i)
      }
      return (t.push(e[e.length - 1]), t)
    },
    Ba = (e, t, n) => {
      switch (t) {
        case 0:
          return { x: e.x, y: e.y - n }
        case 1:
          return { x: e.x + n, y: e.y }
        case 2:
          return { x: e.x, y: e.y + n }
        default:
          return { x: e.x - n, y: e.y }
      }
    },
    Va = (e, t, n, r) => (
      n === `left`
        ? (e -= r)
        : n === `right`
          ? (e += r)
          : n === `top`
            ? (t -= r)
            : n === `bottom` && (t += r),
      { targetX: e, targetY: t }
    ),
    Ha = (e, t, n, r) => (
      n === `left`
        ? (e += r)
        : n === `right`
          ? (e -= r)
          : n === `top`
            ? (t += r)
            : n === `bottom` && (t -= r),
      { sourceX: e, sourceY: t }
    ),
    Ua = (e, t) => (t ? e - U.MARKER_PADDING : e),
    Wa = (e, t) => ({
      x:
        t === V.Left
          ? Math.floor(e.x)
          : t === V.Right
            ? Math.ceil(e.x)
            : Math.round(e.x),
      y:
        t === V.Top
          ? Math.floor(e.y)
          : t === V.Bottom
            ? Math.ceil(e.y)
            : Math.round(e.y),
    })
  function Ga(e) {
    switch (e) {
      case `ClassBidirectional`:
      case `DeploymentAssociation`:
      case `ObjectLink`:
      case `SyntaxTreeLink`:
      case `CommunicationLink`:
        return {
          markerPadding: U.MARKER_PADDING,
          strokeDashArray: `0`,
          offset: 0,
        }
      case `ActivityControlFlow`:
      case `ClassUnidirectional`:
      case `FlowChartFlowline`:
      case `ReachabilityGraphArc`:
        return {
          markerPadding: U.MARKER_PADDING,
          markerEnd: `url(#black-arrow)`,
          strokeDashArray: `0`,
          offset: 0,
        }
      case `ClassAggregation`:
        return {
          markerPadding: U.MARKER_PADDING,
          markerEnd: `url(#white-rhombus)`,
          strokeDashArray: `0`,
          offset: 0,
        }
      case `ClassComposition`:
        return {
          markerPadding: U.MARKER_PADDING,
          markerEnd: `url(#black-rhombus)`,
          strokeDashArray: `0`,
          offset: 0,
        }
      case `ClassInheritance`:
        return {
          markerPadding: U.MARKER_PADDING,
          markerEnd: `url(#white-triangle)`,
          strokeDashArray: `0`,
          offset: 0,
        }
      case `PetriNetArc`:
        return {
          markerPadding: U.MARKER_PADDING,
          markerEnd: `url(#black-triangle)`,
          strokeDashArray: `0`,
          offset: 0,
        }
      case `ComponentDependency`:
      case `ClassDependency`:
      case `DeploymentDependency`:
        return {
          markerPadding: U.MARKER_PADDING,
          markerEnd: `url(#black-arrow)`,
          strokeDashArray: `10`,
          offset: 0,
        }
      case `ClassRealization`:
        return {
          markerPadding: U.MARKER_PADDING,
          markerEnd: `url(#white-triangle)`,
          strokeDashArray: `10`,
          offset: 0,
        }
      case `BPMNSequenceFlow`:
        return {
          markerPadding: U.MARKER_PADDING,
          markerEnd: `url(#bpmn-black-triangle)`,
          strokeDashArray: `0`,
          offset: 8,
        }
      case `BPMNMessageFlow`:
        return {
          markerPadding: U.MARKER_PADDING,
          markerEnd: `url(#bpmn-white-triangle)`,
          markerStart: `url(#bpmn-white-circle)`,
          strokeDashArray: `10`,
          offset: 8,
        }
      case `BPMNAssociationFlow`:
        return {
          markerPadding: U.MARKER_PADDING,
          strokeDashArray: `10`,
          offset: 0,
        }
      case `BPMNDataAssociationFlow`:
        return {
          markerPadding: U.MARKER_PADDING,
          markerEnd: `url(#bpmn-arrow)`,
          strokeDashArray: `10`,
          offset: 8,
        }
      case `UseCaseAssociation`:
        return {
          markerPadding: U.MARKER_PADDING,
          strokeDashArray: `0`,
          offset: 0,
        }
      case `UseCaseInclude`:
        return {
          markerPadding: U.MARKER_PADDING,
          markerEnd: `url(#black-arrow)`,
          strokeDashArray: `10`,
          offset: 0,
        }
      case `UseCaseExtend`:
        return {
          markerPadding: U.MARKER_PADDING,
          markerEnd: `url(#black-arrow)`,
          strokeDashArray: `10`,
          offset: 0,
        }
      case `UseCaseGeneralization`:
        return {
          markerPadding: U.MARKER_PADDING,
          markerEnd: `url(#white-triangle)`,
          strokeDashArray: `0`,
          offset: 0,
        }
      case `ComponentProvidedInterface`:
      case `DeploymentProvidedInterface`:
        return {
          markerPadding: U.MARKER_PADDING,
          strokeDashArray: `0`,
          offset: 0,
        }
      case `ComponentRequiredInterface`:
      case `DeploymentRequiredInterface`:
        return {
          markerPadding: U.MARKER_PADDING + Ni.SOCKET_GAP,
          markerEnd: `url(#required-interface)`,
          strokeDashArray: `0`,
          offset: 0,
        }
      case `ComponentRequiredQuarterInterface`:
      case `DeploymentRequiredQuarterInterface`:
        return {
          markerPadding: U.MARKER_PADDING + Ni.SOCKET_GAP,
          markerEnd: `url(#required-interface-quarter)`,
          strokeDashArray: `0`,
          offset: 0,
        }
      case `ComponentRequiredThreeQuarterInterface`:
      case `DeploymentRequiredThreeQuarterInterface`:
        return {
          markerPadding: U.MARKER_PADDING + Ni.SOCKET_GAP,
          markerEnd: `url(#required-interface-threequarter)`,
          strokeDashArray: `0`,
          offset: 0,
        }
      default:
        return {
          markerPadding: U.MARKER_PADDING,
          strokeDashArray: `0`,
          offset: 0,
        }
    }
  }
  function Ka(e, t) {
    return Math.sqrt((e.x - t.x) ** 2 + (e.y - t.y) ** 2)
  }
  function qa(e) {
    if (!e || typeof e != `object`) return !1
    let t = e
    return (
      (t.side === `top` ||
        t.side === `right` ||
        t.side === `bottom` ||
        t.side === `left`) &&
      typeof t.ratio == `number` &&
      Number.isFinite(t.ratio)
    )
  }
  function Ja(e, t) {
    let n = t.x + t.width,
      r = t.y + t.height,
      i = e.x < t.x ? -1 : +(e.x > n),
      a = e.y < t.y ? -1 : +(e.y > r),
      o = (e, t) => (t > 0 ? W(Math.round(e), 0, t) / t : 0.5)
    if (i !== 0 && a !== 0)
      return (i > 0 ? e.x - n : t.x - e.x) >= (a > 0 ? e.y - r : t.y - e.y)
        ? { side: i > 0 ? `right` : `left`, ratio: +(a > 0) }
        : { side: a > 0 ? `bottom` : `top`, ratio: +(i > 0) }
    if (i !== 0)
      return { side: i > 0 ? `right` : `left`, ratio: o(e.y - t.y, t.height) }
    if (a !== 0)
      return { side: a > 0 ? `bottom` : `top`, ratio: o(e.x - t.x, t.width) }
    let s = W(e.x, t.x, n),
      c = W(e.y, t.y, r),
      l = [
        {
          side: `top`,
          point: { x: s, y: t.y },
          axisLength: t.width,
          offset: s - t.x,
        },
        {
          side: `right`,
          point: { x: n, y: c },
          axisLength: t.height,
          offset: c - t.y,
        },
        {
          side: `bottom`,
          point: { x: s, y: r },
          axisLength: t.width,
          offset: s - t.x,
        },
        {
          side: `left`,
          point: { x: t.x, y: c },
          axisLength: t.height,
          offset: c - t.y,
        },
      ],
      u = l[0],
      d = Ka(e, u.point)
    for (let t of l.slice(1)) {
      let n = Ka(e, t.point)
      n < d && ((u = t), (d = n))
    }
    let f = W(Math.round(u.offset), 0, u.axisLength)
    return { side: u.side, ratio: u.axisLength > 0 ? f / u.axisLength : 0.5 }
  }
  function Ya(e, t) {
    let n = W(t.ratio, 0, 1)
    switch (t.side) {
      case V.Top: {
        let t = Math.round(e.width * n)
        return { point: { x: e.x + t, y: e.y }, position: V.Top }
      }
      case V.Right: {
        let t = Math.round(e.height * n)
        return { point: { x: e.x + e.width, y: e.y + t }, position: V.Right }
      }
      case V.Bottom: {
        let t = Math.round(e.width * n)
        return { point: { x: e.x + t, y: e.y + e.height }, position: V.Bottom }
      }
      case V.Left: {
        let t = Math.round(e.height * n)
        return { point: { x: e.x, y: e.y + t }, position: V.Left }
      }
      default: {
        let e = t.side
        throw Error(`getFreeformAnchorPoint: unhandled side ${e}`)
      }
    }
  }
  function Xa(e) {
    let t = (e) => Math.round(e),
      n = e
        .replace(/([MLQ])(?=[-0-9])/gi, `$1 `)
        .replace(/,/g, ` `)
        .trim()
        .split(/\s+/),
      r = [],
      i = 0
    for (; i < n.length; ) {
      let e = n[i].toUpperCase()
      if (e === `M` || e === `L`) {
        let a = parseFloat(n[i + 1]),
          o = parseFloat(n[i + 2])
        ;(!isNaN(a) && !isNaN(o) && r.push(e, t(a).toString(), t(o).toString()),
          (i += 3))
      } else if (e === `Q`) {
        let e = parseFloat(n[i + 1]),
          a = parseFloat(n[i + 2]),
          o = parseFloat(n[i + 3]),
          s = parseFloat(n[i + 4])
        ;(e === o && a === s
          ? r.push(`L`, t(o).toString(), t(s).toString())
          : r.push(
              `Q`,
              t(e).toString(),
              t(a).toString(),
              t(o).toString(),
              t(s).toString()
            ),
          (i += 5))
      } else {
        let e = parseFloat(n[i]),
          a = parseFloat(n[i + 1])
        ;(!isNaN(e) && !isNaN(a) && r.push(t(e).toString(), t(a).toString()),
          (i += 2))
      }
    }
    return r.join(` `)
  }
  function Za(e) {
    if (e.length < 3) return e
    let t = [e[0]]
    for (let n = 1; n < e.length - 1; n++) {
      let r = t[t.length - 1],
        i = e[n],
        a = e[n + 1]
      ;(r.x === i.x && i.x === a.x) || (r.y === i.y && i.y === a.y) || t.push(i)
    }
    return (t.push(e[e.length - 1]), t)
  }
  function Qa(e) {
    let t = Xa(e).replace(/,/g, ` `).trim().split(/\s+/),
      n = [],
      r = 0
    for (; r < t.length; ) {
      let e = t[r]
      if (e === `M` || e === `L`) {
        let e = parseFloat(t[r + 1]),
          i = parseFloat(t[r + 2])
        ;(!isNaN(e) && !isNaN(i) && n.push({ x: e, y: i }), (r += 3))
      } else {
        let e = parseFloat(t[r]),
          i = parseFloat(t[r + 1])
        ;(!isNaN(e) && !isNaN(i) && n.push({ x: e, y: i }), (r += 2))
      }
    }
    return Za(n)
  }
  function K(e) {
    if (e.length === 0) return e
    let t = [e[0]]
    for (let n = 1; n < e.length; n++) {
      let r = t[t.length - 1],
        i = e[n]
      ;(i.x !== r.x || i.y !== r.y) && t.push(i)
    }
    return t
  }
  let $a = (e) => {
      switch (e) {
        case V.Left:
        case V.Right:
          return `horizontal`
        case V.Top:
        case V.Bottom:
          return `vertical`
        default:
          return `vertical`
      }
    },
    eo = (e, t) =>
      t % 2 == 0 ? e : e === `horizontal` ? `vertical` : `horizontal`,
    to = (e, t, n) => (n === `horizontal` ? e.y === t.y : e.x === t.x)
  function no(e, t, n, r) {
    return n === r ? (to(e, t, n) ? 1 : 3) : 2
  }
  let ro = (e, t, n, r) => {
      let i = e[Math.min(t, e.length - 1)] ?? r
      return n === `horizontal` ? i.x : i.y
    },
    io = (e, t, n, r, i, a) => {
      let o = [{ ...n }]
      for (let n = 1; n < t; n++) {
        let t = o[o.length - 1],
          r = eo(i, n - 1)
        o.push(r === `horizontal` ? { x: e[n], y: t.y } : { x: t.x, y: e[n] })
      }
      let s = o[o.length - 1]
      return (
        s && (a === `horizontal` ? (s.y = r.y) : (s.x = r.x)),
        o.push({ ...r }),
        K(o)
      )
    },
    ao = (e, t, n) => {
      switch (e) {
        case V.Left:
          return n < t.x
        case V.Right:
          return n > t.x
        case V.Top:
          return n < t.y
        case V.Bottom:
          return n > t.y
        default:
          return !1
      }
    },
    oo = (e, t, n) => {
      switch (e) {
        case V.Left:
          return t.x < n.x
        case V.Right:
          return t.x > n.x
        case V.Top:
          return t.y < n.y
        case V.Bottom:
          return t.y > n.y
        default:
          return !1
      }
    },
    so = (e, t, n) => {
      switch (e) {
        case V.Right:
          return t.x + n
        case V.Left:
          return t.x - n
        case V.Bottom:
          return t.y + n
        case V.Top:
        default:
          return t.y - n
      }
    },
    co = (e, t, n) => {
      switch (e) {
        case V.Right:
          return { x: t.x + n, y: t.y }
        case V.Left:
          return { x: t.x - n, y: t.y }
        case V.Bottom:
          return { x: t.x, y: t.y + n }
        case V.Top:
        default:
          return { x: t.x, y: t.y - n }
      }
    },
    lo = (e, t, n, r) =>
      n === V.Right && r === V.Left
        ? t.x - e.x
        : n === V.Left && r === V.Right
          ? e.x - t.x
          : n === V.Bottom && r === V.Top
            ? t.y - e.y
            : n === V.Top && r === V.Bottom
              ? e.y - t.y
              : null,
    uo = (e, t, n, r) => {
      let i = lo(e, t, n, r)
      return i === null || i <= 0
        ? !1
        : $a(n) === `horizontal`
          ? e.y === t.y
          : e.x === t.x
    },
    fo = (e, t, n, r) => {
      let i = lo(e, t, n, r)
      if (i === null || i <= 0) return U.STUB_LENGTH
      if (uo(e, t, n, r)) return Math.min(U.STUB_LENGTH, i)
      let a = Math.floor(i / 2 / H.SNAP_TO_GRID_PX) * H.SNAP_TO_GRID_PX
      return Math.max(U.MIN_STUB_LENGTH, Math.min(U.STUB_LENGTH, a))
    },
    po = (e) => Math.round(e / H.SNAP_TO_GRID_PX) * H.SNAP_TO_GRID_PX,
    mo = (e, t, n, r, i) => {
      let a = (t, n) => (n ? e >= t : e <= t),
        o = (t) => Math.abs(e - t) >= H.SNAP_TO_GRID_PX
      switch (r) {
        case V.Right:
          return t === `x` ? a(n.x + i, !0) : o(n.y)
        case V.Left:
          return t === `x` ? a(n.x - i, !1) : o(n.y)
        case V.Bottom:
          return t === `y` ? a(n.y + i, !0) : o(n.x)
        case V.Top:
        default:
          return t === `y` ? a(n.y - i, !1) : o(n.x)
      }
    },
    ho = (e, t, n, r, i, a) => {
      if (e.length < 4) return e
      let o = e.map((e) => ({ ...e })),
        s = o.length - 3
      for (let e = 1; e <= s; e++) {
        let c = o[e],
          l = o[e + 1],
          u = c.x === l.x ? `x` : c.y === l.y ? `y` : null
        if (!u) continue
        let d = c[u],
          f = po(d),
          p = H.SNAP_TO_GRID_PX,
          m =
            [f, f - p, f + p]
              .sort((e, t) => Math.abs(e - d) - Math.abs(t - d))
              .find(
                (o) =>
                  (e !== 1 || mo(o, u, t, r, a)) &&
                  (e !== s || mo(o, u, n, i, a)) &&
                  go(o, u, t, r) &&
                  go(o, u, n, i)
              ) ?? d
        ;((c[u] = m), (l[u] = m))
      }
      return o
    },
    go = (e, t, n, r) =>
      t === ($a(r) === `horizontal` ? `x` : `y`)
        ? !0
        : Math.abs(e - n[t]) >= H.SNAP_TO_GRID_PX,
    _o = (e, t, n, r, i) =>
      e.length >= 2 &&
      !Mo(e) &&
      !Ao(e) &&
      ao(r, t, ro(e, 1, $a(r), n)) &&
      oo(i, e[e.length - 2], n),
    vo = (e, t, n, r, i, a) => {
      if (e.length < 4) return e
      let o = e.map((e) => ({ ...e })),
        s = o.length - 3,
        c = Fo(t, n, r, i),
        l = U.STUB_LENGTH,
        u = [
          { point: t, position: r, from: o[0], to: o[1], adjacentLane: 1 },
          {
            point: n,
            position: i,
            from: o[o.length - 2],
            to: o[o.length - 1],
            adjacentLane: s,
          },
        ]
      for (let e = 1; e <= s; e++) {
        let d = o[e],
          f = o[e + 1],
          p = d.x === f.x ? `x` : d.y === f.y ? `y` : null
        if (!p) continue
        let m = p === `x` ? `y` : `x`,
          h = u
            .filter((t) => {
              if (
                ($a(t.position) === `horizontal` ? `y` : `x`) !== p ||
                t.adjacentLane === e
              )
                return !1
              let n = Math.min(d[m], f[m]),
                r = Math.max(d[m], f[m]),
                i = Math.min(t.from[m], t.to[m]),
                a = Math.max(t.from[m], t.to[m])
              return Math.max(n, i) < Math.min(r, a)
            })
            .map((e) => e.point[p])
        if (h.length === 0) continue
        let g = a?.[e]?.[p],
          _ = (e) => h.every((t) => Math.abs(e - t) >= l)
        if (
          !(
            g !== void 0 &&
            h.some((e) => g !== e && Math.sign(d[p] - e) !== Math.sign(g - e))
          ) &&
          (_(d[p]) || g !== void 0)
        )
          continue
        let v = g ?? d[p],
          y = h
            .flatMap((e) => [e - l, e + l])
            .map(po)
            .filter(
              (a) =>
                _(a) &&
                (e !== 1 || mo(a, p, t, r, c)) &&
                (e !== s || mo(a, p, n, i, c))
            )
            .sort((e, t) => Math.abs(e - v) - Math.abs(t - v) || e - t)
        y.length !== 0 && ((d[p] = y[0]), (f[p] = y[0]))
      }
      return o
    },
    yo = (e, t, n) => {
      let r = Math.min(e.x, t.x),
        i = Math.max(e.x, t.x),
        a = Math.min(e.y, t.y),
        o = Math.max(e.y, t.y)
      return r < n.x + n.width && i > n.x && a < n.y + n.height && o > n.y
    },
    bo = (e, t) => {
      let n = 0,
        r = 0
      for (let i of t) {
        let t = !1
        for (let n = 0; n < e.length - 1 && !t; n++) t = yo(e[n], e[n + 1], i)
        t && (i.soft ? (r += 1) : (n += 1))
      }
      return { hard: n, soft: r }
    },
    xo = (e, t) => bo(e, t).hard > 0,
    So = (e, t, n) => {
      let { hard: r, soft: i } = bo(e, t),
        a = 0
      for (let t = 0; t < e.length - 1; t++)
        a += Math.abs(e[t + 1].x - e[t].x) + Math.abs(e[t + 1].y - e[t].y)
      return [r, i, Math.max(e.length - 2, 0), a, n]
    },
    Co = (e, t) => {
      for (let n = 0; n < e.length; n++) if (e[n] !== t[n]) return e[n] < t[n]
      return !1
    },
    wo = (e, t, n, r, i, a) => {
      let o = co(n, e, i),
        s = co(r, t, i)
      return $a(n) === `horizontal`
        ? K([e, o, { x: o.x, y: a }, { x: s.x, y: a }, s, t])
        : K([e, o, { x: a, y: o.y }, { x: a, y: s.y }, s, t])
    },
    To = (e, t) => {
      let n = H.SNAP_TO_GRID_PX,
        r = $a(t) === `horizontal`,
        i = new Set()
      for (let t of e)
        r
          ? (i.add(po(t.y - n)), i.add(po(t.y + t.height + n)))
          : (i.add(po(t.x - n)), i.add(po(t.x + t.width + n)))
      return [...i]
    },
    Eo = (e, t, n, r, i = [], a = []) => {
      let o = fo(e, t, n, r),
        s = Fo(e, t, n, r),
        c = (i) => {
          let [a] = Ei({
            sourceX: e.x,
            sourceY: e.y,
            sourcePosition: n,
            targetX: t.x,
            targetY: t.y,
            targetPosition: r,
            borderRadius: U.STEP_BORDER_RADIUS,
            offset: i,
          })
          return K(vo(ho(K(Qa(Xa(a))), e, t, n, r, i), e, t, n, r))
        },
        l = H.SNAP_TO_GRID_PX,
        u = [o, o + l, o - l, o + 2 * l].filter((e) => e >= s).map(c),
        d = u.find((i) => _o(i, e, t, n, r)),
        f = i.filter((e) => !e.soft),
        p = d !== void 0 && bo(d, f).hard === 0,
        m =
          d !== void 0 &&
          !va(
            d,
            f,
            U.NODE_CLEARANCE_PX,
            U.MIN_NODE_CLEARANCE_PX,
            H.SNAP_TO_GRID_PX,
            o
          ),
        h = d !== void 0 && !ja(d, a)
      if (d && p && m && h) return d
      if (f.length === 0 && a.length === 0) return d ?? Oo(e, t, n, r)
      let g = Ra(e, t, n, r, i, o, o, a)
      if (g && _o(g, e, t, n, r)) return g
      for (let a of To(i, n)) u.push(wo(e, t, n, r, o, a))
      u.push(Oo(e, t, n, r))
      let _ = null,
        v = null
      return (
        u.forEach((a, o) => {
          if (!_o(a, e, t, n, r)) return
          let s = So(a, i, o)
          ;(!v || Co(s, v)) && ((_ = a), (v = s))
        }),
        _ ?? Oo(e, t, n, r)
      )
    },
    Do = (e, t) => {
      let n = H.SNAP_TO_GRID_PX,
        r = Math.min(e, t),
        i = Math.max(e, t)
      if (i - r >= 2 * n) {
        let e = (r + i) / 2,
          t = Math.ceil((r + n) / n) * n,
          a = Math.floor((i - n) / n) * n
        if (t <= a) {
          let n = po(e)
          return n >= t && n <= a
            ? n
            : Math.abs(t - e) <= Math.abs(a - e)
              ? t
              : a
        }
      }
      return po(r - U.STUB_LENGTH)
    },
    Oo = (e, t, n, r) => {
      let i = Math.abs(U.SOURCE_CONNECTION_POINT_PADDING - U.MARKER_PADDING),
        a = co(n, e, U.STUB_LENGTH),
        o = co(r, t, U.STUB_LENGTH)
      if ($a(n) === `horizontal`) {
        let n = Math.abs(a.x - o.x)
        if (e.y !== t.y && n > 0 && n <= i) {
          let n = Math.round((a.x + o.x) / 2)
          return K([e, { x: n, y: e.y }, { x: n, y: t.y }, t])
        }
        let r = Do(e.y, t.y)
        return K([e, a, { x: a.x, y: r }, { x: o.x, y: r }, o, t])
      }
      let s = Math.abs(a.y - o.y)
      if (e.x !== t.x && s > 0 && s <= i) {
        let n = Math.round((a.y + o.y) / 2)
        return K([e, { x: e.x, y: n }, { x: t.x, y: n }, t])
      }
      let c = Do(e.x, t.x)
      return K([e, a, { x: c, y: a.y }, { x: c, y: o.y }, o, t])
    },
    ko = (e, t, n) => {
      if (e.length < 3) return e
      let r = (e) =>
          (e.x === t.x && e.y === t.y) || (e.x === n.x && e.y === n.y),
        i = [e[0]]
      for (let t = 1; t < e.length - 1; t++) {
        let n = i[i.length - 1],
          a = e[t],
          o = e[t + 1]
        ;(((n.x === a.x && a.x === o.x) || (n.y === a.y && a.y === o.y)) &&
          !r(a)) ||
          i.push(a)
      }
      return (i.push(e[e.length - 1]), i)
    },
    Ao = (e) => {
      for (let t = 1; t < e.length - 2; t++) {
        let n = e[t - 1],
          r = e[t],
          i = e[t + 1],
          a = n.y === r.y && r.y === i.y && (r.x - n.x) * (i.x - r.x) < 0,
          o = n.x === r.x && r.x === i.x && (r.y - n.y) * (i.y - r.y) < 0
        if (a || o) return !0
      }
      return !1
    },
    jo = (e, t, n, r, i) =>
      uo(e, t, n, r)
        ? !1
        : n === V.Right && r === V.Left
          ? e.x < t.x && e.x + i > t.x - i
          : n === V.Left && r === V.Right
            ? e.x > t.x && e.x - i < t.x + i
            : n === V.Bottom && r === V.Top
              ? e.y < t.y && e.y + i > t.y - i
              : n === V.Top && r === V.Bottom
                ? e.y > t.y && e.y - i < t.y + i
                : !1,
    Mo = (e) =>
      e.some((t, n) => {
        if (n === 0) return !1
        let r = e[n - 1]
        return r.x !== t.x && r.y !== t.y
      }),
    No = (e, t, n) => {
      let r = e[1]
      if (!r) return 0
      switch (n) {
        case V.Right:
          return r.y === t.y ? r.x - t.x : -1 / 0
        case V.Left:
          return r.y === t.y ? t.x - r.x : -1 / 0
        case V.Bottom:
          return r.x === t.x ? r.y - t.y : -1 / 0
        case V.Top:
        default:
          return r.x === t.x ? t.y - r.y : -1 / 0
      }
    },
    Po = (e, t, n) => {
      let r = e[e.length - 2]
      if (!r) return 0
      switch (n) {
        case V.Left:
          return r.y === t.y ? t.x - r.x : -1 / 0
        case V.Right:
          return r.y === t.y ? r.x - t.x : -1 / 0
        case V.Top:
          return r.x === t.x ? t.y - r.y : -1 / 0
        case V.Bottom:
        default:
          return r.x === t.x ? r.y - t.y : -1 / 0
      }
    },
    Fo = (e, t, n, r) => Math.min(U.MIN_STUB_LENGTH, fo(e, t, n, r)),
    Io = (e, t, n, r, i) => {
      let a = Fo(t, n, r, i)
      return No(e, t, r) < a || Po(e, n, i) < a
    },
    Lo = (e, t) => {
      if (e.length < 5) return e
      let n = e.map((e) => ({ ...e })),
        r = !0
      for (; r; ) {
        r = !1
        for (let e = 1; e <= n.length - 4; e++) {
          let i = n[e],
            a = n[e + 1],
            o = n[e + 2],
            s = n[e + 3],
            c = i.x === a.x,
            l = i.y === a.y,
            u = o.x === s.x,
            d = o.y === s.y
          if (c && u && a.y === o.y) {
            let c = Math.abs(o.x - a.x),
              l = (a.y - i.y) * (s.y - o.y) > 0
            if (c > 0 && c <= t && l) {
              let t = e + 3 === n.length - 2 ? o.x : i.x
              ;((n[e] = { ...i, x: t }),
                (n[e + 1] = { ...a, x: t }),
                (n[e + 2] = { ...o, x: t }),
                (n[e + 3] = { ...s, x: t }),
                (n = K(Za(n))),
                (r = !0))
              break
            }
          }
          if (l && d && a.x === o.x) {
            let c = Math.abs(o.y - a.y),
              l = (a.x - i.x) * (s.x - o.x) > 0
            if (c > 0 && c <= t && l) {
              let t = e + 3 === n.length - 2 ? o.y : i.y
              ;((n[e] = { ...i, y: t }),
                (n[e + 1] = { ...a, y: t }),
                (n[e + 2] = { ...o, y: t }),
                (n[e + 3] = { ...s, y: t }),
                (n = K(Za(n))),
                (r = !0))
              break
            }
          }
        }
      }
      return n
    },
    Ro = (e, t) => e.x === t.x && e.y === t.y,
    zo = (e, t) => [{ ...e }, { ...t }]
  function Bo(e, t, n, r, i, a = []) {
    if (Ro(t, n)) return zo(t, n)
    let o = $a(r),
      s = $a(i),
      c = Eo(t, n, r, i, a),
      l = fo(t, n, r, i),
      u = Fo(t, n, r, i),
      d = e.length >= 2 ? Eo(e[0], e[e.length - 1], r, i, a) : c,
      f = No(d, e[0] ?? t, r),
      p = Po(d, e[e.length - 1] ?? n, i),
      m = No(c, t, r),
      h = Po(c, n, i),
      g = lo(t, n, r, i),
      _ = g !== null && g > 0 ? Math.max(u, g - u) : 1 / 0,
      v = (e, t) => Number.isFinite(t) && Math.abs(e - t) <= 1,
      y = (e) => e >= u - 1 && e <= U.STUB_LENGTH + 1,
      b = (e) => Math.max(Math.min(e, _), u)
    if (jo(t, n, r, i, U.MIN_STUB_LENGTH)) return Oo(t, n, r, i)
    let x = Math.max(e.length - 1, 1),
      S = Math.max(c.length - 1, 1),
      C = no(t, n, o, s)
    if (x < C) return c
    let w = Math.max(x, S, C)
    for (; eo(o, w - 1) !== s; ) w += 1
    let T = [NaN]
    for (let t = 1; t < w; t++) {
      let r = eo(o, t - 1)
      T[t] = ro(e, t, r, n)
    }
    let E = [NaN]
    for (let e = 1; e < w; e++) {
      let t = eo(o, e - 1)
      E[e] = ro(c, e, t, n)
    }
    let ee = o === `horizontal` ? e[0].x : e[0].y,
      te = e.length > 1 ? (o === `horizontal` ? e[1].x : e[1].y) : ee,
      D = Math.abs(te - ee),
      O = (() => {
        for (let e = w - 1; e >= 1; e--) if (eo(o, e - 1) === s) return e
        return 1
      })(),
      ne = e.length - 1,
      re = s === `horizontal` ? e[ne].x : e[ne].y,
      k = O < e.length ? (s === `horizontal` ? e[O].x : e[O].y) : re,
      A = Math.abs(re - k),
      ie = v(D, f) || y(D),
      ae = v(A, p) || y(A),
      j = v(D, f) ? m : b(D),
      M = v(A, p) ? h : b(A)
    if (
      (g !== null && g > 0 && ie && ae && j + M > g && ((j = l), (M = l)),
      ie && (T[1] = so(r, t, j)),
      ao(r, t, T[1]) || (T[1] = E[1]),
      (O !== 1 || !ie) && ae && (T[O] = so(i, n, M)),
      o === s && O > 1)
    ) {
      let e = o === `horizontal` ? `x` : `y`,
        a = T[1],
        s = T[O],
        c = po((a + s) / 2)
      Math.abs(a - s) <= H.SNAP_TO_GRID_PX &&
        mo(c, e, t, r, u) &&
        mo(c, e, n, i, u) &&
        ((T[1] = c), (T[O] = c))
    }
    if (w >= 3 && e.length >= 3) {
      let n = o === `horizontal` ? e[1].y : e[1].x,
        r = o === `horizontal` ? e[2].y : e[2].x
      Math.abs(n - r) <= 1 && (T[2] = o === `horizontal` ? t.y : t.x)
    }
    let N = io(T, w, t, n, o, s)
    if (N.length < 2) return c
    if (!oo(i, N[N.length - 2], n))
      if (o === s && e.length >= 6) {
        let e = so(i, n, l),
          r = s === `horizontal` ? { x: e, y: n.y } : { x: n.x, y: e },
          a = K([...N.slice(0, -1), r, n])
        oo(i, a[a.length - 2], n)
          ? (N = a)
          : ((T[O] = E[O]), (N = io(T, w, t, n, o, s)))
      } else ((T[O] = E[O]), (N = io(T, w, t, n, o, s)))
    return (
      (N = Lo(N, U.ORTHOGONAL_DOGLEG_TOLERANCE_PX)),
      !ao(r, t, ro(N, 1, eo(o, 0), n)) ||
      !oo(i, N[N.length - 2], n) ||
      Ao(N) ||
      Io(N, t, n, r, i)
        ? c
        : ko(vo(N, t, n, r, i, e), co(r, t, l), co(i, n, l))
    )
  }
  let Vo = {
    colorDescription: `none`,
    titleAndDesctiption: `none`,
    bpmnAnnotation: `none`,
    activitySwimlane: `none`,
    package: `package`,
    useCase: `ellipse`,
    activityInitialNode: `four-center`,
    activityFinalNode: `four-center`,
    activityMergeNode: `four-center`,
    bpmnStartEvent: `four-center`,
    bpmnIntermediateEvent: `four-center`,
    bpmnEndEvent: `four-center`,
    bpmnGateway: `four-center`,
    flowchartDecision: `four-center`,
    petriNetPlace: `four-center`,
    petriNetTransition: `four-center`,
    componentInterface: `four-center`,
    deploymentInterface: `four-center`,
    sfcTransitionBranch: `four-center`,
    flowchartInputOutput: `parallelogram`,
  }
  function Ho(e) {
    return (e ? Vo[e] : void 0) ?? `freeform-rect`
  }
  let Uo = (e) => ({ x: e.x + e.width / 2, y: e.y + e.height / 2 }),
    Wo = (e, t, n, r) =>
      Math.abs(e) / (n || 1) >= Math.abs(t) / (r || 1)
        ? e >= 0
          ? V.Right
          : V.Left
        : t >= 0
          ? V.Bottom
          : V.Top,
    Go = (e, t) => {
      let n = Uo(e),
        r = e.width / 2 || 1,
        i = e.height / 2 || 1,
        a = t.x - n.x,
        o = t.y - n.y,
        s = a === 0 && o === 0 ? -1 : o,
        c = 1 / Math.hypot(a / r, s / i)
      return {
        point: { x: n.x + c * a, y: n.y + c * s },
        position: Wo(a, s, r, i),
      }
    }
  function Ko(e) {
    let t = Uo(e)
    return {
      [V.Top]: { x: t.x, y: e.y },
      [V.Right]: { x: e.x + e.width, y: t.y },
      [V.Bottom]: { x: t.x, y: e.y + e.height },
      [V.Left]: { x: e.x, y: t.y },
    }
  }
  let qo = (e, t) => {
      let { point: n, position: r } = Ya(e, t),
        i = (n.y - e.y) / (e.height || 1)
      switch (r) {
        case V.Left:
          return { point: { x: e.x + 20 * (1 - i), y: n.y }, position: r }
        case V.Right:
          return { point: { x: e.x + e.width - 20 * i, y: n.y }, position: r }
        case V.Top:
          return { point: { x: Math.max(n.x, e.x + 20), y: e.y }, position: r }
        case V.Bottom:
          return {
            point: { x: Math.min(n.x, e.x + e.width - 20), y: e.y + e.height },
            position: r,
          }
        default:
          return { point: n, position: r }
      }
    },
    Jo = (e, t) => {
      let n = Uo(e)
      return Wo(t.x - n.x, t.y - n.y, e.width / 2, e.height / 2)
    },
    Yo = (e) => (e < 0 ? 0 : e > 1 ? 1 : e),
    Xo = (e, t) => {
      let n = Uo(e),
        r = t.x - n.x,
        i = t.y - n.y
      if (r === 0 && i === 0) return { side: V.Top, ratio: 0.5 }
      let a = r === 0 ? 1 / 0 : e.width / 2 / Math.abs(r),
        o = i === 0 ? 1 / 0 : e.height / 2 / Math.abs(i)
      if (a <= o) {
        let t = n.y + a * i
        return {
          side: r > 0 ? V.Right : V.Left,
          ratio: Yo((t - e.y) / e.height),
        }
      }
      let s = n.x + o * r
      return { side: i > 0 ? V.Bottom : V.Top, ratio: Yo((s - e.x) / e.width) }
    }
  function Zo(e, t, n) {
    switch (Ho(e)) {
      case `none`:
        return null
      case `four-center`:
        return { side: Jo(n, t), ratio: 0.5 }
      case `ellipse`:
        return Xo(n, t)
      case `package`:
        return Ja(t, Pi(e, n))
      default:
        return Ja(t, n)
    }
  }
  function Qo(e, t, n) {
    switch (Ho(e)) {
      case `four-center`:
        return { point: Ko(t)[n.side], position: n.side }
      case `ellipse`:
        return Go(t, Ya(t, n).point)
      case `parallelogram`:
        return qo(t, n)
      case `package`:
        return Ya(Pi(e, t), n)
      default:
        return Ya(t, n)
    }
  }
  let $o = (e, t) =>
      t.x >= e.x && t.x <= e.x + e.width && t.y >= e.y && t.y <= e.y + e.height,
    es = (e, t) => {
      let n = new Set(),
        r = e.parentId ? t.get(e.parentId) : void 0
      for (; r && !n.has(r.id); )
        (n.add(r.id), (r = r.parentId ? t.get(r.parentId) : void 0))
      return n
    },
    ts = (e) => ({
      width: e.width ?? e.measured?.width ?? 0,
      height: e.height ?? e.measured?.height ?? 0,
    }),
    ns = (e, t, n, r = rs(e)) => {
      let { byId: i, entries: a } = r,
        o = new Set()
      for (let e of [t, n]) {
        let t = i.get(e)
        if (t) for (let e of es(t, i)) o.add(e)
      }
      let s = []
      for (let e of o) {
        let t = a.get(e)
        if (!t) continue
        let { x: n, y: r, width: i, height: o } = t.body
        s.push([
          { x: n, y: r },
          { x: n + i, y: r },
          { x: n + i, y: r + o },
          { x: n, y: r + o },
          { x: n, y: r },
        ])
      }
      return s
    },
    rs = (e) => {
      let t = new Map(e.map((e) => [e.id, e])),
        n = new Map()
      for (let r of e) {
        if (r.hidden) continue
        let { width: i, height: a } = ts(r)
        if (!i || !a) continue
        let { x: o, y: s } = Fi(r, e)
        n.set(r.id, {
          body: { id: r.id, x: o, y: s, width: i, height: a, soft: Li(r.type) },
          ancestors: es(r, t),
        })
      }
      return { byId: t, entries: n }
    },
    is = (e, t, n, r, i, a = rs(e), o) => {
      let { byId: s, entries: c } = a,
        l = s.get(t),
        u = s.get(n),
        d = new Set()
      if (l) for (let e of es(l, s)) d.add(e)
      if (u) for (let e of es(u, s)) d.add(e)
      let f = []
      for (let [e, a] of [
        [t, i],
        [n, r],
      ]) {
        let t = c.get(e)
        !t || $o(t.body, a) || f.push({ ...t.body, soft: !1 })
      }
      let p = []
      for (let [e, a] of c)
        e === t ||
          e === n ||
          d.has(e) ||
          a.ancestors.has(t) ||
          a.ancestors.has(n) ||
          $o(a.body, r) ||
          $o(a.body, i) ||
          p.push(a.body)
      let m = 2 * U.STUB_LENGTH + U.NODE_CLEARANCE_PX,
        h = (o?.x ?? Math.min(r.x, i.x)) - m,
        g = (o ? o.x + o.width : Math.max(r.x, i.x)) + m,
        _ = (o?.y ?? Math.min(r.y, i.y)) - m,
        v = (o ? o.y + o.height : Math.max(r.y, i.y)) + m,
        y = new Set()
      for (let e = 0; e < 2; e++) {
        let e = []
        for (let t of p)
          y.has(t) ||
            (t.x - m < g &&
              t.x + t.width + m > h &&
              t.y - m < v &&
              t.y + t.height + m > _ &&
              e.push(t))
        if (e.length === 0) break
        for (let t of e)
          (y.add(t),
            (h = Math.min(h, t.x)),
            (g = Math.max(g, t.x + t.width)),
            (_ = Math.min(_, t.y)),
            (v = Math.max(v, t.y + t.height)))
      }
      return (f.push(...p.filter((e) => y.has(e))), f)
    }
  function as(e) {
    let t = { x: e.adjustedSource.x, y: e.adjustedSource.y },
      n = { x: e.adjustedTarget.x, y: e.adjustedTarget.y }
    if (e.enableStraightPath) {
      let r = zi(
          {
            position: {
              x: e.sourceAbsolutePosition.x,
              y: e.sourceAbsolutePosition.y,
            },
            width: e.sourceSize.width,
            height: e.sourceSize.height,
            direction: e.sourcePosition,
          },
          {
            position: {
              x: e.targetAbsolutePosition.x,
              y: e.targetAbsolutePosition.y,
            },
            width: e.targetSize.width,
            height: e.targetSize.height,
            direction: e.targetPosition,
          },
          e.padding,
          { sourceX: t.x, sourceY: t.y, targetX: n.x, targetY: n.y }
        ),
        i = e.obstacles.filter((e) => !e.soft)
      if (
        r !== null &&
        !xo(r, e.obstacles) &&
        ya(r, i) &&
        !ja(r, e.neighborEdges)
      )
        return K(r)
    }
    return Eo(
      t,
      n,
      e.sourcePosition,
      e.targetPosition,
      e.obstacles,
      e.neighborEdges
    )
  }
  let q = {
      [V.Top]: { x: 0, y: -1 },
      [V.Bottom]: { x: 0, y: 1 },
      [V.Left]: { x: -1, y: 0 },
      [V.Right]: { x: 1, y: 0 },
    },
    os = {
      [V.Top]: V.Bottom,
      [V.Bottom]: V.Top,
      [V.Left]: V.Right,
      [V.Right]: V.Left,
    },
    ss = { [V.Top]: 0, [V.Right]: 1, [V.Bottom]: 2, [V.Left]: 3 },
    cs = [V.Top, V.Right, V.Bottom, V.Left],
    ls = (e) => e === V.Left || e === V.Right,
    J = (e) => ({ x: e.x + e.width / 2, y: e.y + e.height / 2 }),
    Y = (e, t) => (ls(e) ? t.height : t.width),
    us = (e, t) => {
      let n = J(e),
        r = t.x - n.x,
        i = t.y - n.y,
        a = e.width / 2 || 1,
        o = e.height / 2 || 1
      return Math.abs(r) * o >= Math.abs(i) * a
        ? r >= 0
          ? V.Right
          : V.Left
        : i >= 0
          ? V.Bottom
          : V.Top
    },
    ds = (e, t, n, r) => Math.max(0, Math.min(t, r) - Math.max(e, n)),
    fs = (e, t) => Math.min(2 * H.SNAP_TO_GRID_PX, Math.min(e, t) * 0.3),
    ps = (e, t, n) =>
      (e
        ? ds(t.y, t.y + t.height, n.y, n.y + n.height)
        : ds(t.x, t.x + t.width, n.x, n.x + n.width)) >=
      2 * fs(e ? t.height : t.width, e ? n.height : n.width),
    X = H.SNAP_TO_GRID_PX,
    ms = [],
    hs = [],
    gs = (e, t) => {
      let n = us(e, t)
      return [n, ...(ls(n) ? [V.Top, V.Bottom] : [V.Left, V.Right]), os[n]]
    },
    _s = (e, t) => {
      if (t <= 0) return 0.5
      let n = Math.min(2 * X, t * 0.3),
        r = W(e, n, t - n)
      return ((r = Math.round(r / X) * X), W(r, n, t - n) / t)
    },
    vs = (e, t, n) => _s(ls(e) ? n.y - t.y : n.x - t.x, Y(e, t)),
    ys = (e, t, n) => {
      let { point: r, position: i } = Qo(e, t, n)
      return { anchor: n, point: r, position: i }
    },
    bs = (e, t, n) => {
      let r = Ho(e),
        i = Pi(e, t),
        a = r === `four-center`,
        o = new Set(),
        s = [],
        c = (n, r) => {
          let i = `${n}:${Math.round(r * 1e3)}`
          o.has(i) || (o.add(i), s.push(ys(e, t, { side: n, ratio: r })))
        }
      for (let e of gs(i, n)) {
        if (a) {
          c(e, 0.5)
          continue
        }
        ;(c(e, vs(e, i, n)), c(e, _s(Y(e, i) / 2, Y(e, i))))
      }
      return s
    },
    xs = (e, t, n, r) => {
      if (Ho(n) === `four-center` || Ho(r) === `four-center`) return null
      let i = Pi(n, e),
        a = Pi(r, t),
        o = us(i, J(a)),
        s = us(a, J(i))
      if (os[o] !== s) return null
      let c = ls(o),
        l = c ? i.y : i.x,
        u = c ? i.y + i.height : i.x + i.width,
        d = c ? a.y : a.x,
        f = c ? a.y + a.height : a.x + a.width,
        p = c ? i.height : i.width,
        m = c ? a.height : a.width
      if (!ps(c, i, a)) return null
      let h = fs(p, m),
        g = Math.max(l, d) + h,
        _ = Math.min(u, f) - h,
        v = ((l + u) / 2 + (d + f) / 2) / 2,
        y = W(Math.round(W(v, g, _) / X) * X, g, _)
      return {
        source: ys(n, e, { side: o, ratio: (y - l) / p }),
        target: ys(r, t, { side: s, ratio: (y - d) / m }),
      }
    },
    Ss = (e, t, n, r) => {
      if (Ho(e) === `four-center`) return null
      let i = Pi(e, t),
        a = os[r],
        o = ls(a),
        s = Y(a, i)
      if (s <= 0) return null
      let c = o ? i.y : i.x,
        l = o ? n.y : n.x,
        u = Math.min(2 * X, s * 0.3)
      return l < c + u || l > c + s - u
        ? null
        : ys(e, t, { side: a, ratio: (l - c) / s })
    },
    Cs = (e) => {
      let t = 0
      for (let n = 1; n < e.length; n++)
        ((t += Math.abs(e[n].x - e[n - 1].x)),
          (t += Math.abs(e[n].y - e[n - 1].y)))
      return t
    },
    ws = (e, t, n) =>
      Math.max(
        0,
        Math.min(e.x, t.x) - (n.x + n.width),
        n.x - Math.max(e.x, t.x)
      ) +
      Math.max(
        0,
        Math.min(e.y, t.y) - (n.y + n.height),
        n.y - Math.max(e.y, t.y)
      ),
    Ts = (e, t, n) => {
      let r = 0,
        i = e.length - 2
      for (let a = 0; a <= i; a++) {
        let o = e[a],
          s = e[a + 1],
          c = a === 0 ? 1 / 0 : ws(o, s, t),
          l = a === i ? 1 / 0 : ws(o, s, n),
          u = Math.min(c, l)
        u < U.MIN_NODE_CLEARANCE_PX && (r += U.MIN_NODE_CLEARANCE_PX - u)
      }
      return r
    },
    Es = (e, t) => {
      let n = 0
      for (let r of t) {
        let t = r.x + 1,
          i = r.x + r.width - 1,
          a = r.y + 1,
          o = r.y + r.height - 1
        for (let r = 0; r < e.length - 1; r++) {
          let s = e[r],
            c = e[r + 1]
          if (
            Math.min(s.x, c.x) < i &&
            Math.max(s.x, c.x) > t &&
            Math.min(s.y, c.y) < o &&
            Math.max(s.y, c.y) > a
          ) {
            n++
            break
          }
        }
      }
      return n
    },
    Ds = (e, t) => {
      if (t.length === 0) return 0
      let n = 0
      for (let r = 0; r < e.length - 1; r++) {
        let i = e[r],
          a = e[r + 1]
        for (let e of t) {
          let t = ws(i, a, e)
          t < U.NODE_CLEARANCE_PX && (n += U.NODE_CLEARANCE_PX - t)
        }
      }
      return n
    },
    Os = (e, t, n, r) =>
      +(n !== null && e.position !== n) + +(r !== null && t.position !== r),
    ks = (e, t, n) => {
      let r = J(t),
        i = J(n),
        a = q[e]
      return a.x * (i.x - r.x) + a.y * (i.y - r.y)
    },
    As = (e, t, n, r, i, a, o, s, c, l, u) => {
      let d = Math.max(0, e.length - 2),
        f = Math.round(1e3 * Math.abs(t.anchor.ratio - 0.5)),
        p = Math.round(1e3 * Math.abs(n.anchor.ratio - 0.5)),
        m =
          Ui(t.anchor, Y(t.anchor.side, r), X) +
          Ui(n.anchor, Y(n.anchor.side, i), X),
        h =
          Wi(t.anchor, l, Y(t.anchor.side, r), X) +
          Wi(n.anchor, u, Y(n.anchor.side, i), X),
        g = Math.round(Ts(e, r, i) / X),
        _ = d === 0 ? Math.round(Ds(e, s) / X) : 0,
        v = Es(e, s),
        y = c.length === 0 ? { crossings: 0, proximityPx: 0 } : Na(e, c),
        b = Qi(e, c, G.parallelCrowdingClearanceInGridCells * X),
        x = Cs(e),
        S =
          Gi(
            {
              lengthPx: x,
              bends: d,
              crossings: y.crossings,
              overlapPx: b.overlapPx,
              crowdingPx: b.crowdingPx,
            },
            X
          ) +
          m +
          h +
          g * G.huggingPerPx +
          _ * G.huggingPerPx +
          v * G.edgeCrossing,
        C = Math.round(x / X)
      return [
        S,
        Os(t, n, a, o),
        C,
        Math.max(f, p),
        -(ks(t.position, r, i) + ks(n.position, i, r)),
        ss[t.position],
        ss[n.position],
        Math.round(t.anchor.ratio * 1e3),
        Math.round(n.anchor.ratio * 1e3),
      ]
    },
    js = (e, t, n, r) => ({
      enableStraightPath: r,
      adjustedSource: e.adjustedSource,
      adjustedTarget: e.adjustedTarget,
      sourcePosition: e.sourcePosition,
      targetPosition: e.targetPosition,
      padding: e.padding,
      rounded: e.rounded,
      sourceAbsolutePosition: e.sourceAbsolutePosition,
      targetAbsolutePosition: e.targetAbsolutePosition,
      sourceSize: e.sourceSize,
      targetSize: e.targetSize,
      obstacles: t,
      neighborEdges: n,
    }),
    Ms = (e, t, n, r) => as(js(e, t, n, r)),
    Ns = (e) => {
      let t = e.thirdPartyObstacles ?? ms,
        n = Pi(e.sourceType, e.sourceRect),
        r = Pi(e.targetType, e.targetRect),
        i =
          !e.sourceCustom && Ho(e.sourceType) === `four-center`
            ? us(n, J(r))
            : null,
        a =
          !e.targetCustom && Ho(e.targetType) === `four-center`
            ? us(r, J(n))
            : null,
        o = e.sourceCustom
          ? [ys(e.sourceType, e.sourceRect, e.sourceCustom)]
          : bs(e.sourceType, e.sourceRect, J(r)),
        s = e.targetCustom
          ? [ys(e.targetType, e.targetRect, e.targetCustom)]
          : bs(e.targetType, e.targetRect, J(n)),
        c = (e, t, n, r) => {
          if (!t) return
          let i = (t) => {
            let i = `${t.side}:${Math.round(t.ratio * 1e3)}`
            e.some(
              (e) =>
                `${e.anchor.side}:${Math.round(e.anchor.ratio * 1e3)}` === i
            ) || e.push(ys(n, r, t))
          }
          ;(i(t),
            Ho(n) !== `four-center` && i({ side: t.side, ratio: 1 - t.ratio }))
        }
      ;(e.sourceCustom || c(o, e.sourcePreferred, e.sourceType, e.sourceRect),
        e.targetCustom || c(s, e.targetPreferred, e.targetType, e.targetRect))
      let l =
        !e.sourceCustom && !e.targetCustom
          ? xs(e.sourceRect, e.targetRect, e.sourceType, e.targetType)
          : null
      l && (o.push(l.source), s.push(l.target))
      let u = (e, t) => {
        if (!t) return
        let n = `${t.anchor.side}:${Math.round(t.anchor.ratio * 1e3)}`
        e.some(
          (e) => `${e.anchor.side}:${Math.round(e.anchor.ratio * 1e3)}` === n
        ) || e.push(t)
      }
      if (!e.sourceCustom && e.targetPreferred) {
        let t = ys(e.targetType, e.targetRect, e.targetPreferred)
        u(o, Ss(e.sourceType, e.sourceRect, t.point, t.position))
      }
      if (!e.targetCustom && e.sourcePreferred) {
        let t = ys(e.sourceType, e.sourceRect, e.sourcePreferred)
        u(s, Ss(e.targetType, e.targetRect, t.point, t.position))
      }
      if (e.sourceCustom && !e.targetCustom) {
        let t = Ss(e.targetType, e.targetRect, o[0].point, o[0].position)
        t && s.push(t)
      } else if (e.targetCustom && !e.sourceCustom) {
        let t = Ss(e.sourceType, e.sourceRect, s[0].point, s[0].position)
        t && o.push(t)
      }
      let d = (e, t) => ({
          adjustedSource: e.adjustedSource,
          adjustedTarget: t.adjustedTarget,
          sourcePosition: e.sourcePosition,
          targetPosition: t.targetPosition,
          rounded: {
            sourceX: e.rounded.sourceX,
            sourceY: e.rounded.sourceY,
            targetX: t.rounded.targetX,
            targetY: t.rounded.targetY,
          },
          sourceAbsolutePosition: e.sourceAbsolutePosition,
          targetAbsolutePosition: t.targetAbsolutePosition,
          sourceSize: e.sourceSize,
          targetSize: t.targetSize,
          padding: e.padding,
        }),
        f = Array(o.length),
        p = Array(s.length),
        m = Array(o.length),
        h = Array(s.length),
        g = (e, t) => {
          let n = Y(e.side, t)
          return (
            Math.min(e.ratio * n, (1 - e.ratio) * n) <= U.MIN_NODE_CLEARANCE_PX
          )
        },
        _ = (() => {
          if (!e.sourceCustom || !e.targetCustom) return null
          let t = o[0],
            n = s[0],
            r = t.point,
            i = n.point,
            a =
              (t.position === V.Top && n.position === V.Bottom && r.y > i.y) ||
              (t.position === V.Bottom && n.position === V.Top && r.y < i.y),
            c =
              (t.position === V.Left && n.position === V.Right && r.x > i.x) ||
              (t.position === V.Right && n.position === V.Left && r.x < i.x)
          if (!a && !c) return null
          let l = a ? r.y : r.x,
            u = a ? i.y : i.x,
            d = Math.round((l + u) / 2 / X) * X,
            f = Math.abs(l - d),
            p = Math.abs(u - d)
          return f < X || p < X
            ? null
            : {
                sourceLength: f,
                targetLength: p,
                requiresTurn: a ? r.x !== i.x : r.y !== i.y,
              }
        })(),
        v = o[0],
        y = s[0]
      for (let t = 0; t < o.length; t++) {
        let r = o[t],
          i = e.resolve({ sourceAnchor: r.anchor, targetAnchor: y.anchor })
        i &&
          ((f[t] = i),
          (m[t] = {
            point: i.adjustedSource,
            position: i.sourcePosition,
            stubLength: _?.sourceLength ?? U.STUB_LENGTH,
            cost: e.sourceCustom
              ? 0
              : Ui(r.anchor, Y(r.anchor.side, n), X) +
                Wi(r.anchor, e.sourcePreferred, Y(r.anchor.side, n), X),
            forceStubTurn:
              (!!e.sourceCustom && g(r.anchor, n)) || (_?.requiresTurn ?? !1),
          }))
      }
      for (let t = 0; t < s.length; t++) {
        let n = s[t],
          i = e.resolve({ sourceAnchor: v.anchor, targetAnchor: n.anchor })
        i &&
          ((p[t] = i),
          (h[t] = {
            point: i.adjustedTarget,
            position: i.targetPosition,
            stubLength: _?.targetLength ?? U.STUB_LENGTH,
            cost: e.targetCustom
              ? 0
              : Ui(n.anchor, Y(n.anchor.side, r), X) +
                Wi(n.anchor, e.targetPreferred, Y(n.anchor.side, r), X),
            forceStubTurn:
              (!!e.targetCustom && g(n.anchor, r)) || (_?.requiresTurn ?? !1),
          }))
      }
      let b = [],
        x = [],
        S = Ia(
          m.flatMap((e, t) => (e ? (b.push(t), [e]) : [])),
          h.flatMap((e, t) => (e ? (x.push(t), [e]) : [])),
          e.obstacles,
          e.neighborEdges,
          e.incumbentRoute,
          { source: e.sourceRect, target: e.targetRect }
        )
      if (S) {
        let t = b[S.sourceIndex],
          n = x[S.targetIndex],
          r = f[t],
          i = p[n]
        if (r && i)
          return {
            endpoints: d(r, i),
            route: S.route,
            sourceAnchor: e.sourceCustom ? void 0 : o[t].anchor,
            targetAnchor: e.targetCustom ? void 0 : s[n].anchor,
          }
      }
      let C = null
      for (let c = 0; c < o.length; c++) {
        let l = o[c]
        for (let o = 0; o < s.length; o++) {
          let u = s[o],
            m = f[c],
            h = p[o]
          if (!m || !h) continue
          let g = d(m, h),
            _ = as(js(g, ms, hs, e.enableStraightPath)),
            v = As(
              _,
              l,
              u,
              n,
              r,
              i,
              a,
              t,
              e.neighborEdges,
              e.sourcePreferred,
              e.targetPreferred
            )
          ;(!C || Bi(v, C.key)) &&
            (C = { endpoints: g, idealRoute: _, source: l, target: u, key: v })
        }
      }
      if (!C) return null
      let w = e.sourceCustom ? void 0 : C.source.anchor,
        T = e.targetCustom ? void 0 : C.target.anchor,
        E =
          e.obstacles.length === 0 && e.neighborEdges.length === 0
            ? C.idealRoute
            : Ms(
                C.endpoints,
                e.obstacles,
                e.neighborEdges,
                e.enableStraightPath
              )
      return {
        endpoints: C.endpoints,
        route: E,
        sourceAnchor: w,
        targetAnchor: T,
      }
    },
    Ps = H.SNAP_TO_GRID_PX,
    Fs = 3 * Ps,
    Is = 2 * Ps,
    Ls = G.edgeCrossing / (G.bendInGridCells * H.SNAP_TO_GRID_PX),
    Rs = (e, t, n) => {
      let r = J(t),
        i = J(n),
        a = q[e]
      return a.x * (i.x - r.x) + a.y * (i.y - r.y) <= 0 ? 3 : +!ps(ls(e), t, n)
    },
    zs = (e, t, n, r) => {
      let i = J(n),
        a = J(r),
        o = a.x - i.x,
        s = a.y - i.y,
        c = q[e],
        l = q[t],
        u = c.x * o + c.y * s,
        d = -(l.x * o + l.y * s)
      return u <= 0 && d <= 0
        ? 4
        : u <= 0 || d <= 0
          ? 3
          : c.x === -l.x && c.y === -l.y
            ? ps(ls(e), n, r)
              ? 0
              : 2
            : c.x === l.x && c.y === l.y
              ? 2
              : 1
    },
    Bs = (e, t) => (e < t ? -1 : +(e > t)),
    Vs = (e, t) => {
      switch (e) {
        case V.Top:
          return { x: t.x + t.width / 2, y: t.y }
        case V.Bottom:
          return { x: t.x + t.width / 2, y: t.y + t.height }
        case V.Left:
          return { x: t.x, y: t.y + t.height / 2 }
        default:
          return { x: t.x + t.width, y: t.y + t.height / 2 }
      }
    },
    Hs = (e, t, n) => {
      let r = { x: n.x + 1, y: n.y + 1 },
        i = { x: n.x + n.width - 1, y: n.y + n.height - 1 }
      return (
        Math.min(e.x, t.x) < i.x &&
        Math.max(e.x, t.x) > r.x &&
        Math.min(e.y, t.y) < i.y &&
        Math.max(e.y, t.y) > r.y
      )
    },
    Us = (e, t) => {
      let n = 0
      for (let r of t)
        for (let t = 0; t < e.length - 1; t++)
          if (Hs(e[t], e[t + 1], r)) {
            n++
            break
          }
      return n
    },
    Ws = (e, t, n, r, i, a) => {
      let o = (r) =>
          n === 0
            ? r >= Math.min(e, t) && r <= Math.max(e, t)
            : n > 0
              ? r >= e
              : r <= e,
        s = new Set([e])
      n === 0 && s.add((e + t) / 2)
      for (let e of a) for (let t of r(e)) o(t) && s.add(t)
      let c = e,
        l = 1 / 0,
        u = 1 / 0
      for (let t of [...s].sort((e, t) => e - t)) {
        let n = Us(i(t), a),
          r = Math.abs(t - e)
        ;(n < l || (n === l && r < u)) && ((c = t), (l = n), (u = r))
      }
      return c
    },
    Gs = (e, t, n, r) =>
      e < 0 && t < 0
        ? { anchor: Math.min(n, r), other: Math.max(n, r), dir: -1 }
        : e > 0 && t > 0
          ? { anchor: Math.max(n, r), other: Math.min(n, r), dir: 1 }
          : { anchor: n, other: r, dir: 0 },
    Ks = (e, t, n, r, i = []) => {
      let a = Vs(e, n),
        o = Vs(t, r),
        s = ls(e)
      if (s !== ls(t))
        return s ? [a, { x: o.x, y: a.y }, o] : [a, { x: a.x, y: o.y }, o]
      if (s) {
        if (a.y === o.y) return [a, o]
        let { anchor: n, other: r, dir: s } = Gs(q[e].x, q[t].x, a.x, o.x),
          c = Ws(
            n,
            r,
            s,
            (e) => [e.x - Is, e.x + e.width + Is],
            (e) => [a, { x: e, y: a.y }, { x: e, y: o.y }, o],
            i
          )
        return [a, { x: c, y: a.y }, { x: c, y: o.y }, o]
      }
      if (a.x === o.x) return [a, o]
      let { anchor: c, other: l, dir: u } = Gs(q[e].y, q[t].y, a.y, o.y),
        d = Ws(
          c,
          l,
          u,
          (e) => [e.y - Is, e.y + e.height + Is],
          (e) => [a, { x: a.x, y: e }, { x: o.x, y: e }, o],
          i
        )
      return [a, { x: a.x, y: d }, { x: o.x, y: d }, o]
    },
    qs = (e, t = new Map(), n = new Set(), r = [], i = []) => {
      let a = new Map(),
        o = (e, t, n) => {
          let r = `${e}|${t}`,
            i = a.get(r)
          i ? i.add(n) : a.set(r, new Set([n]))
        },
        s = (e, t, n) => {
          let r = a.get(`${e}|${t}`)
          return r ? (r.has(n) ? r.size - 1 : r.size) : 0
        }
      for (let e of r) o(e.nodeId, e.side, e.partnerNodeId)
      let c = (e, t, r) => (n.has(e) ? s(e, t, r) : 0),
        l = (e) =>
          cs.some((t) =>
            cs.some((n) => zs(t, n, e.sourceRect, e.targetRect) === 0)
          ),
        u = [...e].sort((e, t) => {
          let n = +!l(e),
            r = +!l(t)
          if (n !== r) return n - r
          let i = [
              e.sourceRect.x,
              e.sourceRect.y,
              e.sourceRect.width,
              e.sourceRect.height,
              e.targetRect.x,
              e.targetRect.y,
              e.targetRect.width,
              e.targetRect.height,
              e.sourceNodeId,
              e.targetNodeId,
              e.edgeId,
            ],
            a = [
              t.sourceRect.x,
              t.sourceRect.y,
              t.sourceRect.width,
              t.sourceRect.height,
              t.targetRect.x,
              t.targetRect.y,
              t.targetRect.width,
              t.targetRect.height,
              t.sourceNodeId,
              t.targetNodeId,
              t.edgeId,
            ]
          for (let e = 0; e < i.length; e++)
            if (i[e] !== a[e]) return i[e] < a[e] ? -1 : 1
          return 0
        }),
        d = i.map((e) => [...e]),
        f = (e) => {
          let t = 0,
            n = 0
          return (
            d.forEach((r, a) => {
              let o = Qi(e, [r], G.parallelCrowdingClearanceInGridCells * Ps)
              ;((t += o.crossings),
                a < i.length &&
                  (n +=
                    o.overlapPx * G.overlapPerPx +
                    o.crowdingPx * G.crowdingPerPx))
            }),
            Ls * t + n / (G.bendInGridCells * Ps)
          )
        },
        p = (e, n) => {
          let r = 0
          for (let [i, a] of t) {
            if (i === e.sourceNodeId || i === e.targetNodeId) continue
            let t = { x: a.x + 1, y: a.y + 1 },
              o = { x: a.x + a.width - 1, y: a.y + a.height - 1 }
            for (let e = 0; e < n.length - 1; e++) {
              let i = n[e],
                a = n[e + 1],
                s = Math.min(i.x, a.x),
                c = Math.max(i.x, a.x),
                l = Math.min(i.y, a.y),
                u = Math.max(i.y, a.y)
              if (s < o.x && c > t.x && l < o.y && u > t.y) {
                r++
                break
              }
            }
          }
          return r
        },
        m = new Map()
      for (let e of u) {
        let { sourceRect: n, targetRect: r } = e,
          i = J(r).x - J(n).x,
          a = J(r).y - J(n).y,
          l = (e) => Math.abs(q[e].x * i + q[e].y * a),
          u = (e) => Math.abs(q[e].x * -i + q[e].y * -a),
          h = []
        for (let [n, r] of t)
          n !== e.sourceNodeId && n !== e.targetNodeId && h.push(r)
        if (e.sourceBand && e.targetBand) {
          let t = null,
            i = null
          for (let a of cs)
            for (let o of cs) {
              let d = Ks(a, o, n, r, h),
                m = [
                  p(e, d),
                  c(e.sourceNodeId, a, e.targetNodeId) +
                    c(e.targetNodeId, o, e.sourceNodeId),
                  zs(a, o, n, r) + f(d),
                  -(l(a) + u(o)),
                  s(e.sourceNodeId, a, e.targetNodeId) +
                    s(e.targetNodeId, o, e.sourceNodeId),
                  -l(a),
                  ss[a] + ss[o],
                  ss[a],
                ]
              ;(!i || Bi(m, i)) && ((t = { sU: a, sV: o }), (i = m))
            }
          ;(m.set(Z(e.edgeId, `source`), t.sU),
            m.set(Z(e.edgeId, `target`), t.sV),
            o(e.sourceNodeId, t.sU, e.targetNodeId),
            o(e.targetNodeId, t.sV, e.sourceNodeId),
            d.push(Ks(t.sU, t.sV, n, r, h)))
        } else if (e.sourceBand || e.targetBand) {
          let t = e.sourceBand ? e.sourceNodeId : e.targetNodeId,
            i = e.sourceBand ? e.targetNodeId : e.sourceNodeId,
            a = e.sourceBand ? l : u,
            d = null,
            p = null
          for (let o of cs) {
            let l = e.sourceBand ? e.targetFixedSide : e.sourceFixedSide,
              u = 1 / 0
            if (l !== void 0) {
              let t = e.sourceBand ? Ks(o, l, n, r, h) : Ks(l, o, n, r, h)
              u = (e.sourceBand ? zs(o, l, n, r) : zs(l, o, n, r)) + f(t)
            } else
              for (let t of cs) {
                let i = e.sourceBand ? Ks(o, t, n, r, h) : Ks(t, o, n, r, h),
                  a = (e.sourceBand ? zs(o, t, n, r) : zs(t, o, n, r)) + f(i)
                a < u && (u = a)
              }
            let m = [c(t, o, i), u, -a(o), s(t, o, i), ss[o]]
            ;(!p || Bi(m, p)) && ((d = o), (p = m))
          }
          ;(m.set(Z(e.edgeId, e.sourceBand ? `source` : `target`), d),
            o(t, d, i))
        }
      }
      return m
    },
    Js = (e, t, n) => {
      let r, i
      switch (e) {
        case V.Top:
          ;((r = -n), (i = t))
          break
        case V.Bottom:
          ;((r = n), (i = t))
          break
        case V.Left:
          ;((r = -t), (i = n))
          break
        default:
          ;((r = t), (i = n))
          break
      }
      let a = Math.abs(r) + Math.abs(i)
      if (a === 0) return 0
      let o = i / a
      return r >= 0 ? o : i >= 0 ? 2 - o : -2 - o
    },
    Ys = (e, t, n, r) => {
      let i, a
      switch (e) {
        case V.Top:
          ;((i = -n), (a = t))
          break
        case V.Bottom:
          ;((i = n), (a = t))
          break
        case V.Left:
          ;((i = -t), (a = n))
          break
        default:
          ;((i = t), (a = n))
          break
      }
      let o = Math.max(r, 1),
        s = Math.abs(i),
        c = s / (s + 300)
      return a >= o ? 2 - c : a <= -o ? -2 + c : a / o
    },
    Xs = (e, t) => {
      let n = t.map((t) => ({ m: t, k: Js(e, t.dx, t.dy) }))
      return (
        n.sort((e, t) =>
          e.k === t.k
            ? e.m.edgeId < t.m.edgeId
              ? -1
              : +(e.m.edgeId > t.m.edgeId)
            : e.k < t.k
              ? -1
              : 1
        ),
        n.map((e) => e.m)
      )
    },
    Zs = (e) => (e === V.Top || e === V.Right ? 1 : -1),
    Qs = (e, t) => Zs(e) === Zs(t),
    Z = (e, t) => `${e}|${t}`,
    $s = (e, t, n) => {
      if (Rs(e, t, n) !== 0) return null
      let r = !ls(e),
        i = r ? t.x : t.y,
        a = r ? t.width : t.height,
        o = r ? n.x : n.y,
        s = r ? n.width : n.height,
        c = Math.max(i, o),
        l = Math.min(i + a, o + s)
      if (!ps(!r, t, n)) return null
      let u = fs(a, s)
      return { lo: c + u, hi: l - u, myLo: i, myAxis: a }
    },
    ec = (e, t, n, r) => {
      if (n <= 0) return []
      let i = (e + t) / 2
      if (n === 1) return [i]
      let a = Vi(n, t - e, Ps).map((t) => e + t)
      if (a[1] - a[0] >= r) return a
      let o = r
      return Array.from(
        { length: n },
        (e, t) => i + ((2 * t - (n - 1)) * o) / 2
      )
    },
    tc = (e, t, n, r) => {
      if (n.length === 0) return []
      let i = ec(e, t, n.length, r)
      if (n.length === 1) return [W(i[0], n[0].lo, n[0].hi)]
      let a = i[1] - i[0]
      for (let e = 1; e < n.length; e++)
        for (let t = 0; t < e; t++)
          a = Math.min(a, (n[e].hi - n[t].lo) / (e - t))
      a = Math.max(0, a)
      let o = i.map((e, t) => W(e, n[t].lo, n[t].hi))
      for (let e = 0; e < n.length; e++) {
        for (let e = 1; e < o.length; e++)
          o[e] = W(Math.max(o[e], o[e - 1] + a), n[e].lo, n[e].hi)
        for (let e = o.length - 2; e >= 0; e--)
          o[e] = W(Math.min(o[e], o[e + 1] - a), n[e].lo, n[e].hi)
      }
      return o
    },
    nc = (e, t = Fs) => {
      let n = new Map()
      for (let t of e) {
        let e = `${t.nodeId}|${t.side}`,
          r = n.get(e)
        r ? r.push(t) : n.set(e, [t])
      }
      let r = new Map()
      for (let [, e] of n) {
        let n = e[0].side,
          i = e[0].rect,
          a = e[0].nodeId
        if (e[0].fourCenter) {
          for (let t of e)
            r.set(Z(t.edgeId, t.end), {
              side: n,
              ratio: t.immutableRatio ?? 0.5,
            })
          continue
        }
        let o = Y(n, i)
        if (o <= 0) {
          for (let t of e)
            r.set(Z(t.edgeId, t.end), {
              side: n,
              ratio: t.immutableRatio ?? 0.5,
            })
          continue
        }
        let s = ls(n) ? i.y : i.x,
          c = Math.min(Is, o * 0.3),
          l = [],
          u = Y(n, i) / 2,
          d = (e) => {
            let t = J(e.rect)
            return Ys(n, e.partnerCenter.x - t.x, e.partnerCenter.y - t.y, u)
          },
          f = new Map()
        for (let t of e) {
          let e = f.get(t.partnerNodeId)
          e ? e.push(t) : f.set(t.partnerNodeId, [t])
        }
        let p = []
        for (let [e, r] of f) {
          let c = $s(n, i, r[0].partnerRect)
          if (c) {
            let e = [...r].sort((e, t) =>
                e.edgeId < t.edgeId ? -1 : +(e.edgeId > t.edgeId)
              ),
              n = ec(c.lo, c.hi, e.length, t)
            e.forEach((e, t) => {
              let r =
                e.immutableRatio === void 0 ? null : s + e.immutableRatio * o
              l.push({
                edgeId: e.edgeId,
                end: e.end,
                coord: r ?? n[t],
                fixed: !0,
                immutable: r !== null,
                minCoord: r ?? c.lo,
                maxCoord: r ?? c.hi,
                partnerX: e.partnerRect.x,
                partnerY: e.partnerRect.y,
                partnerWidth: e.partnerRect.width,
                partnerHeight: e.partnerRect.height,
                partnerNodeId: e.partnerNodeId,
                rot: d(e),
              })
            })
            continue
          }
          let u = Xs(
              n,
              r.map((e) => ({
                edgeId: e.edgeId,
                end: e.end,
                dx: e.partnerCenter.x - J(e.rect).x,
                dy: e.partnerCenter.y - J(e.rect).y,
              }))
            ),
            f = r[0].partnerSide
          r.length > 1 &&
            a > e &&
            f !== void 0 &&
            Qs(n, f) &&
            (u = [...u].reverse())
          let m = new Map(r.map((e) => [Z(e.edgeId, e.end), e]))
          u.forEach((e, t) => {
            let n = m.get(Z(e.edgeId, e.end))
            p.push({ e: n, rot: d(n), rank: t })
          })
        }
        p.sort(
          (e, t) =>
            e.rot - t.rot ||
            e.rank - t.rank ||
            e.e.partnerRect.x - t.e.partnerRect.x ||
            e.e.partnerRect.y - t.e.partnerRect.y ||
            e.e.partnerRect.width - t.e.partnerRect.width ||
            e.e.partnerRect.height - t.e.partnerRect.height ||
            Bs(e.e.partnerNodeId, t.e.partnerNodeId) ||
            Bs(e.e.edgeId, t.e.edgeId) ||
            Bs(e.e.end, t.e.end)
        )
        let m = ec(s, s + o, p.length, t)
        ;(p.forEach(({ e, rot: t }, n) => {
          let r = e.immutableRatio === void 0 ? null : s + e.immutableRatio * o
          l.push({
            edgeId: e.edgeId,
            end: e.end,
            coord: r ?? m[n],
            fixed: r !== null,
            immutable: r !== null,
            minCoord: r ?? s + c,
            maxCoord: r ?? s + o - c,
            partnerX: e.partnerRect.x,
            partnerY: e.partnerRect.y,
            partnerWidth: e.partnerRect.width,
            partnerHeight: e.partnerRect.height,
            partnerNodeId: e.partnerNodeId,
            rot: t,
          })
        }),
          l.sort(
            (e, t) =>
              e.rot - t.rot ||
              e.coord - t.coord ||
              e.partnerX - t.partnerX ||
              e.partnerY - t.partnerY ||
              e.partnerWidth - t.partnerWidth ||
              e.partnerHeight - t.partnerHeight ||
              Bs(e.partnerNodeId, t.partnerNodeId) ||
              Bs(e.edgeId, t.edgeId) ||
              Bs(e.end, t.end)
          ))
        let h = s + c,
          g = s + o - c,
          _ = f.size > 1 && l.length > 1 && l.every((e) => e.fixed)
        if (_) {
          let e = tc(
            h,
            g,
            l.map((e) => ({ lo: e.minCoord, hi: e.maxCoord })),
            t
          )
          l.forEach((t, n) => {
            t.coord = e[n]
          })
        }
        let v = l.length > 1 ? Math.min(t, (g - h) / (l.length - 1)) : 0,
          y = l
            .map((e, t) => ({ seat: e, index: t }))
            .filter(({ seat: e }) => e.immutable)
        for (let { seat: e, index: t } of y) {
          t > 0 && (v = Math.min(v, Math.max(0, (e.coord - h) / t)))
          let n = l.length - 1 - t
          n > 0 && (v = Math.min(v, Math.max(0, (g - e.coord) / n)))
        }
        for (let e = 1; e < y.length; e++)
          for (let t = 0; t < e; t++) {
            let n = y[t],
              r = y[e]
            v = Math.min(
              v,
              Math.max(0, (r.seat.coord - n.seat.coord) / (r.index - n.index))
            )
          }
        let b = _
            ? Math.max(
                0,
                Math.min(v, ...l.slice(1).map((e, t) => e.coord - l[t].coord))
              )
            : v,
          x = l.map((e) => (e.immutable ? e.coord : W(e.coord, h, g)))
        for (let e = 1; e < x.length; e++)
          !l[e].fixed && x[e] < x[e - 1] + b && (x[e] = x[e - 1] + b)
        for (let e = x.length - 2; e >= 0; e--)
          !l[e].fixed && x[e] > x[e + 1] - b && (x[e] = x[e + 1] - b)
        if (x.some((e, t) => t > 0 && e < x[t - 1] + b))
          for (let e = 0; e < l.length; e++) {
            for (let e = 1; e < x.length; e++)
              !l[e].immutable &&
                x[e] < x[e - 1] + b &&
                (x[e] = Math.min(g, x[e - 1] + b))
            for (let e = x.length - 2; e >= 0; e--)
              !l[e].immutable &&
                x[e] > x[e + 1] - b &&
                (x[e] = Math.max(h, x[e + 1] - b))
          }
        l.forEach((t, i) =>
          r.set(Z(t.edgeId, t.end), {
            side: n,
            ratio: t.immutable
              ? e.find((e) => e.edgeId === t.edgeId && e.end === t.end)
                  .immutableRatio
              : (W(x[i], h, g) - s) / o,
          })
        )
      }
      return r
    },
    rc = (e) => e.width ?? e.measured?.width,
    ic = (e) => e.height ?? e.measured?.height
  function ac(e, t, n, r, i, a, o, s) {
    let c = r.get(e.source),
      l = r.get(e.target)
    if (!c || !l) return null
    let u = n.get(e.source),
      d = n.get(e.target),
      f =
        s?.entries.get(e.source)?.body ??
        (u && (rc(u) ?? 0) > 0
          ? { ...Fi(u, t), width: rc(u), height: ic(u) ?? 0 }
          : null),
      p =
        s?.entries.get(e.target)?.body ??
        (d && (rc(d) ?? 0) > 0
          ? { ...Fi(d, t), width: rc(d), height: ic(d) ?? 0 }
          : null),
      m = a?.sourceAnchor ?? e.data?.sourceAnchor,
      h = a?.targetAnchor ?? e.data?.targetAnchor,
      g = f && qa(m) ? Qo(u?.type, f, m) : null,
      _ = p && qa(h) ? Qo(d?.type, p, h) : null,
      v =
        o && g && _
          ? null
          : Oi({
              id: e.id,
              sourceNode: c,
              targetNode: l,
              sourceHandle: e.sourceHandle ?? null,
              targetHandle: e.targetHandle ?? null,
              connectionMode: i,
            })
    if (!v && !(g && _)) return null
    let y = f ? { x: f.x, y: f.y } : { x: v.sourceX, y: v.sourceY },
      b = p ? { x: p.x, y: p.y } : { x: v.targetX, y: v.targetY },
      { markerPadding: x } = Ga(e.type ?? ``),
      S = x ?? U.MARKER_PADDING,
      C = g?.point.x ?? v.sourceX,
      w = g?.point.y ?? v.sourceY,
      T = _?.point.x ?? v.targetX,
      E = _?.point.y ?? v.targetY,
      ee = g?.position ?? v.sourcePosition,
      te = _?.position ?? v.targetPosition,
      D = g ? 0 : U.SOURCE_CONNECTION_POINT_PADDING,
      O = Ua(S, _ !== null),
      ne = g ? Wa(g.point, ee) : { x: Math.round(C), y: Math.round(w) },
      re = _ ? Wa(_.point, te) : { x: Math.round(T), y: Math.round(E) },
      k = ne.x,
      A = ne.y,
      ie = re.x,
      ae = re.y,
      j = Va(ie, ae, te, O),
      M = Ha(k, A, ee, D)
    return {
      adjustedSource: { x: M.sourceX, y: M.sourceY },
      adjustedTarget: { x: j.targetX, y: j.targetY },
      sourcePosition: ee,
      targetPosition: te,
      rounded: { sourceX: k, sourceY: A, targetX: ie, targetY: ae },
      sourceAbsolutePosition: y,
      targetAbsolutePosition: b,
      sourceSize: {
        width: f?.width ?? rc(u) ?? 100,
        height: f?.height ?? ic(u) ?? 160,
      },
      targetSize: {
        width: p?.width ?? rc(d) ?? 100,
        height: p?.height ?? ic(d) ?? 160,
      },
      padding: S,
    }
  }
  function oc(e, t, n) {
    let r = e.data?.points,
      i = !!(r && r.length > 0)
    if (t.length === 2 && !i) return t
    let a = r && r.length > 0 ? r : t
    return i && a.length >= 2
      ? Bo(
          a,
          n.adjustedSource,
          n.adjustedTarget,
          n.sourcePosition,
          n.targetPosition
        )
      : a
  }
  function sc(e, t) {
    let n = e.data?.points
    return [t.adjustedSource, ...(Array.isArray(n) ? n : []), t.adjustedTarget]
  }
  let cc = (e, t) => `${e},${t}`
  function lc(e, t, n) {
    let r = (n, r) => {
        let i = cc(n, r),
          a = e.get(i)
        a ? a[a.length - 1] !== t && a.push(t) : e.set(i, [t])
      },
      i = (e) => Math.floor(e / 256)
    if (n.length === 1) {
      r(i(n[0].x), i(n[0].y))
      return
    }
    for (let e = 0; e < n.length - 1; e++) {
      let t = n[e],
        a = n[e + 1],
        o = Math.min(i(t.x), i(a.x)),
        s = Math.max(i(t.x), i(a.x)),
        c = Math.min(i(t.y), i(a.y)),
        l = Math.max(i(t.y), i(a.y))
      for (let e = o; e <= s; e++) for (let t = c; t <= l; t++) r(e, t)
    }
  }
  function uc(e, t, n, r, i) {
    for (let a = 0; a < e.length - 1; a++) {
      let o = e[a],
        s = e[a + 1]
      if (
        Math.min(o.x, s.x) <= n &&
        Math.max(o.x, s.x) >= t &&
        Math.min(o.y, s.y) <= i &&
        Math.max(o.y, s.y) >= r
      )
        return !0
    }
    return !1
  }
  let dc = (e, t) => {
      let n = t === `source` ? e.data?.sourceAnchor : e.data?.targetAnchor
      return qa(n) ? n : void 0
    },
    fc = (e, t) =>
      e !== void 0 &&
      t !== void 0 &&
      e.side === t.side &&
      Math.abs(e.ratio - t.ratio) <= 1e-9,
    pc = [],
    mc = (e, t) => {
      let n = dc(e, `source`),
        r = dc(e, `target`),
        i = dc(t, `source`),
        a = dc(t, `target`)
      if ((!n && !r) || (!i && !a)) return pc
      let o = []
      return (
        e.source === t.source &&
          fc(n, i) &&
          o.push({ firstEnd: `source`, secondEnd: `source` }),
        e.source === t.target &&
          fc(n, a) &&
          o.push({ firstEnd: `source`, secondEnd: `target` }),
        e.target === t.source &&
          fc(r, i) &&
          o.push({ firstEnd: `target`, secondEnd: `source` }),
        e.target === t.target &&
          fc(r, a) &&
          o.push({ firstEnd: `target`, secondEnd: `target` }),
        o
      )
    }
  function hc(e, t, n, r, i, a, o, s) {
    let c = ns(n, e.source, e.target, r),
      l = t.sourceAbsolutePosition.x,
      u = t.sourceAbsolutePosition.y,
      d = l + t.sourceSize.width,
      f = u + t.sourceSize.height,
      p = t.targetAbsolutePosition.x,
      m = t.targetAbsolutePosition.y,
      h = p + t.targetSize.width,
      g = m + t.targetSize.height,
      _ = U.STUB_LENGTH * 6,
      v = Math.min(l, p),
      y = Math.max(d, h),
      b = Math.min(u, m),
      x = Math.max(f, g)
    for (let e of i)
      (e.x < v && (v = e.x),
        e.x + e.width > y && (y = e.x + e.width),
        e.y < b && (b = e.y),
        e.y + e.height > x && (x = e.y + e.height))
    ;((v -= _), (y += _), (b -= _), (x += _))
    let S = new Set(),
      C = Math.floor(v / 256),
      w = Math.floor(y / 256),
      T = Math.floor(b / 256),
      E = Math.floor(x / 256)
    for (let e = C; e <= w; e++)
      for (let t = T; t <= E; t++) {
        let n = o.get(cc(e, t))
        if (n) for (let e of n) S.add(e)
      }
    let ee = (e) => e.map((e) => `${e.x},${e.y}`).join(`;`),
      te = new Map([...S].map((e) => [e, ee(a[e] ?? [])])),
      D = [...S].sort((e, t) => {
        let n = te.get(e),
          r = te.get(t)
        return n < r ? -1 : n > r ? 1 : e < t ? -1 : +(e > t)
      }),
      O = []
    for (let t of D) {
      let n = a[t]
      if (!n || n.length < 2) continue
      let r = s.get(t)
      ;(r && mc(e, r).length > 0) || (uc(n, v, y, b, x) && O.push(n))
    }
    return { edgeRoutes: O, containerBorders: c }
  }
  function gc(e, t) {
    if (t?.strategy !== `predicted` || t.edge === void 0)
      return { edges: e, liveOverride: t ?? null }
    let n = t.edge
    return {
      edges: e.map((e) => (e.id === t.edgeId ? n : e)),
      liveOverride: null,
    }
  }
  let _c = (e, t, n) => {
      let r = e?.get(t)
      if (!r) return
      if (r.sig === n) return r
      let i = r.alternatives?.find((e) => e.sig === n)
      if (!i || !e) return i
      let a = [r, ...(r.alternatives ?? [])]
          .filter((e) => e.sig !== i.sig)
          .slice(0, 4)
          .map(({ alternatives: e, ...t }) => t),
        o = { ...i, alternatives: a }
      return (e.set(t, o), o)
    },
    vc = (e, t, n) => {
      if (!e) return
      let r = e.get(t)
      if (!r || r.sig === n.sig) {
        e.set(t, n)
        return
      }
      let i = [r, ...(r.alternatives ?? [])]
        .filter((e) => e.sig !== n.sig)
        .slice(0, 4)
        .map(({ alternatives: e, ...t }) => t)
      e.set(t, { ...n, alternatives: i })
    }
  function yc(e, t, n, r) {
    let i = t,
      a = i.rounded,
      o = [
        e ? `1` : `0`,
        `${i.adjustedSource.x},${i.adjustedSource.y},${i.adjustedTarget.x},${i.adjustedTarget.y}`,
        `${i.sourcePosition},${i.targetPosition},${i.padding}`,
        `${a.sourceX},${a.sourceY},${a.targetX},${a.targetY}`,
        `${i.sourceAbsolutePosition.x},${i.sourceAbsolutePosition.y},${i.targetAbsolutePosition.x},${i.targetAbsolutePosition.y}`,
        `${i.sourceSize.width},${i.sourceSize.height},${i.targetSize.width},${i.targetSize.height}`,
      ]
    return (o.push(bc(n), r), o.join(`|`))
  }
  let bc = (e) => {
    let t = `O`
    for (let n of e) t += `;${n.x},${n.y},${n.width},${n.height},${+!!n.soft}`
    return t
  }
  function xc(e, t, n, r) {
    let i = wc(e.sourceAbsolutePosition, e.sourceSize),
      a = wc(e.targetAbsolutePosition, e.targetSize),
      o = (e) => [
        { x: e.x, y: e.y },
        { x: e.x + e.width, y: e.y },
        { x: e.x + e.width, y: e.y + e.height },
        { x: e.x, y: e.y + e.height },
      ],
      s = r ? [...o(i), ...o(a)] : [e.adjustedSource, e.adjustedTarget],
      c = xa(s[0], s.slice(1), t, n),
      l = `N`
    for (let e of c)
      l += `;${e.x1},${e.y1},${e.x2},${e.y2},${+!!e.startTerminal},${+!!e.endTerminal}`
    return l
  }
  function Sc(e, t, n, r) {
    return {
      enableStraightPath: r,
      adjustedSource: e.adjustedSource,
      adjustedTarget: e.adjustedTarget,
      sourcePosition: e.sourcePosition,
      targetPosition: e.targetPosition,
      padding: e.padding,
      rounded: e.rounded,
      sourceAbsolutePosition: e.sourceAbsolutePosition,
      targetAbsolutePosition: e.targetAbsolutePosition,
      sourceSize: e.sourceSize,
      targetSize: e.targetSize,
      obstacles: t,
      neighborEdges: n,
    }
  }
  function Cc(e, t, n, r, i, a, o, s, c, l) {
    let u = e,
      d = (e) => (e ? `${e.side},${e.ratio}` : `-`)
    return [
      s ? `1` : `0`,
      `${t ?? ``},${n ?? ``}`,
      `${u.padding}`,
      `${u.sourceAbsolutePosition.x},${u.sourceAbsolutePosition.y},${u.sourceSize.width},${u.sourceSize.height}`,
      `${u.targetAbsolutePosition.x},${u.targetAbsolutePosition.y},${u.targetSize.width},${u.targetSize.height}`,
      `${d(r)};${d(i)}`,
      `${d(a)};${d(o)}`,
      bc(c),
      l,
    ].join(`|`)
  }
  let wc = (e, t) => ({ x: e.x, y: e.y, width: t.width, height: t.height }),
    Q = (e) => (qa(e) ? e : void 0)
  function $(e, t, n) {
    let r = n.get(e)
    if (!r) return null
    let i = rc(r)
    return !i || i <= 0 ? null : { ...Fi(r, t), width: i, height: ic(r) ?? 0 }
  }
  function Tc(e, t, n, r, i, a, o, s, c) {
    let l = new Map()
    for (let u of e) {
      let e = Q(u.data?.sourceAnchor),
        d = Q(u.data?.targetAnchor)
      if (
        (e && l.set(Z(u.id, `source`), e),
        d && l.set(Z(u.id, `target`), d),
        !(
          u.id === o?.edgeId ||
          a.has(u.type ?? ``) ||
          u.source === u.target ||
          (Array.isArray(u.data?.points) && u.data.points.length > 0) ||
          s[u.id] !== void 0
        ) ||
          (e && d))
      )
        continue
      let f = ac(u, t, n, r, i, void 0, void 0, c)
      if (!f) continue
      let p = u.id === o?.edgeId ? o.points : s[u.id],
        m = p?.[0] ?? f.adjustedSource,
        h = p?.[p.length - 1] ?? f.adjustedTarget
      if (!e) {
        let e = $(u.source, t, n),
          r = e && Zo(n.get(u.source)?.type, m, e)
        r && l.set(Z(u.id, `source`), r)
      }
      if (!d) {
        let e = $(u.target, t, n),
          r = e && Zo(n.get(u.target)?.type, h, e)
        r && l.set(Z(u.id, `target`), r)
      }
    }
    return l
  }
  function Ec(e, t, n, r, i, a) {
    let o = new Map()
    for (let t of e)
      t.source !== t.target &&
        (o.set(t.source, (o.get(t.source) ?? 0) + 1),
        o.set(t.target, (o.get(t.target) ?? 0) + 1))
    let s = (e, t, n) => !r.has(Z(t, n)) && (o.get(e) ?? 0) > 1,
      c = [],
      l = new Map(),
      u = (e) => (l.has(e) || l.set(e, $(e, t, n)), l.get(e) ?? null),
      d = new Map(),
      f = (e) => {
        if (!d.has(e)) {
          let t = u(e)
          d.set(e, t ? Pi(n.get(e)?.type, t) : null)
        }
        return d.get(e) ?? null
      }
    for (let t of e) {
      if (t.source === t.target) continue
      let e = f(t.source),
        n = f(t.target)
      if (!e || !n) continue
      let i = s(t.source, t.id, `source`),
        a = s(t.target, t.id, `target`)
      ;(!i && !a) ||
        c.push({
          edgeId: t.id,
          sourceNodeId: t.source,
          targetNodeId: t.target,
          sourceRect: e,
          targetRect: n,
          sourceBand: i,
          targetBand: a,
          sourceFixedSide: r.get(Z(t.id, `source`))?.side,
          targetFixedSide: r.get(Z(t.id, `target`))?.side,
        })
    }
    let p = new Map()
    for (let e of t) {
      let t = u(e.id)
      t && p.set(e.id, t)
    }
    let m = (e) => Ho(n.get(e)?.type) === `four-center`,
      h = new Set()
    for (let e of t) m(e.id) && h.add(e.id)
    let g = []
    for (let t of e) {
      let e = r.get(Z(t.id, `source`)),
        n = r.get(Z(t.id, `target`))
      ;(e &&
        g.push({ nodeId: t.source, partnerNodeId: t.target, side: e.side }),
        n &&
          g.push({ nodeId: t.target, partnerNodeId: t.source, side: n.side }))
    }
    let _ = qs(c, p, h, g, i),
      v = []
    for (let t of e) {
      if (t.source === t.target) continue
      let e = f(t.source),
        n = f(t.target)
      if (!e || !n) continue
      let i = r.get(Z(t.id, `source`)),
        s = r.get(Z(t.id, `target`)),
        c = i?.side ?? a?.get(Z(t.id, `source`)) ?? _.get(Z(t.id, `source`)),
        l = s?.side ?? a?.get(Z(t.id, `target`)) ?? _.get(Z(t.id, `target`))
      ;(c !== void 0 &&
        (o.get(t.source) ?? 0) > 1 &&
        v.push({
          edgeId: t.id,
          end: `source`,
          nodeId: t.source,
          rect: e,
          side: c,
          partnerCenter: J(n),
          partnerNodeId: t.target,
          partnerRect: n,
          partnerSide: l,
          fourCenter: m(t.source),
          immutableRatio: i?.ratio,
        }),
        l !== void 0 &&
          (o.get(t.target) ?? 0) > 1 &&
          v.push({
            edgeId: t.id,
            end: `target`,
            nodeId: t.target,
            rect: n,
            side: l,
            partnerCenter: J(e),
            partnerNodeId: t.source,
            partnerRect: e,
            partnerSide: c,
            fourCenter: m(t.target),
            immutableRatio: s?.ratio,
          }))
    }
    return v
  }
  function Dc(e, t, n = {}, r) {
    let {
        nodes: i,
        nodeLookup: a,
        connectionMode: o,
        edges: s,
        straightPathTypes: c,
        straightHookTypes: l,
        fixedEdges: u = [],
        liveOverride: d,
        previous: f,
        solveCache: p,
      } = e,
      m = e.nodeIndex ?? rs(i),
      h = m.byId,
      g = new Map(s.map((e) => [e.id, e])),
      _ = (e) => !!Q(e.data?.sourceAnchor) || !!Q(e.data?.targetAnchor),
      v = (e) =>
        l.has(e.type ?? ``) ||
        (Array.isArray(e.data?.points) && e.data.points.length > 0),
      y = (e) => (e.id === d?.edgeId ? 0 : v(e) ? 1 : _(e) ? 2 : 3),
      b = (e) => y(e) < 2,
      x = (e) => y(e) === 2,
      S = (e) => y(e) < 3,
      C = (e) => {
        let t = $(e.source, i, h),
          n = $(e.target, i, h),
          r = Q(e.data?.sourceAnchor),
          a = Q(e.data?.targetAnchor),
          o = t && n && (ps(!0, t, n) || ps(!1, t, n)),
          s = (e) =>
            e === V.Top
              ? 0
              : e === V.Right
                ? 1
                : e === V.Bottom
                  ? 2
                  : e === V.Left
                    ? 3
                    : -1
        return [
          y(e),
          +!o,
          t?.x ?? 1 / 0,
          t?.y ?? 1 / 0,
          t?.width ?? 0,
          t?.height ?? 0,
          n?.x ?? 1 / 0,
          n?.y ?? 1 / 0,
          n?.width ?? 0,
          n?.height ?? 0,
          e.type ?? ``,
          s(r?.side),
          r?.ratio ?? -1,
          s(a?.side),
          a?.ratio ?? -1,
          e.source,
          e.target,
          e.id,
        ]
      },
      w = new Map(s.map((e) => [e, C(e)])),
      T = (e, t) => {
        let n = w.get(e),
          r = w.get(t)
        for (let e = 0; e < n.length; e++)
          if (n[e] !== r[e]) return n[e] < r[e] ? -1 : 1
        return 0
      },
      E = [...s].sort((e, t) => {
        let n = +!S(e),
          r = +!S(t)
        return n === r ? T(e, t) : n - r
      }),
      ee = E.filter(b),
      te = E.filter(x),
      D = E.filter((e) => !S(e) && w.get(e)[1] === 0),
      O = E.filter((e) => !S(e) && w.get(e)[1] !== 0),
      ne = (e, t) => {
        if (e.length < 2) return [...e]
        let n = t % e.length
        return [...e.slice(n), ...e.slice(0, n)]
      },
      re =
        t === 0
          ? E
          : [
              ...ee,
              ...(t === `reverse` ? [...te].reverse() : ne(te, t)),
              ...(t === `reverse` ? [...D].reverse() : D),
              ...(t === `reverse` ? [...O].reverse() : ne(O, t)),
            ],
      k = { ...n },
      A = new Map()
    for (let [e, t] of Object.entries(n)) lc(A, e, t)
    let ie = [...re, ...u],
      ae = Tc(ie, i, h, a, o, l, d, n, m),
      j = new Map(Object.entries(n))
    for (let e of ie) {
      if (e.id === d?.edgeId) {
        j.set(e.id, d.points)
        continue
      }
      if (l.has(e.type ?? ``)) {
        let t = ac(e, i, h, a, o, void 0, void 0, m)
        t && j.set(e.id, sc(e, t))
        continue
      }
      let t = e.data?.points
      if (Array.isArray(t) && t.length >= 2) {
        let n = ac(e, i, h, a, o, void 0, void 0, m)
        j.set(
          e.id,
          n
            ? Bo(
                t,
                n.adjustedSource,
                n.adjustedTarget,
                n.sourcePosition,
                n.targetPosition
              )
            : t
        )
        continue
      }
    }
    let M = nc(Ec(ie, i, h, ae, [...j.values()], r))
    for (let e of re) {
      if (d && d.edgeId === e.id) {
        ;((k[e.id] = d.points), lc(A, e.id, d.points))
        continue
      }
      let t = ac(e, i, h, a, o, void 0, void 0, m)
      if (!t) {
        f?.[e.id] && ((k[e.id] = f[e.id]), lc(A, e.id, f[e.id]))
        continue
      }
      if (l.has(e.type ?? ``)) {
        let n = sc(e, t)
        ;((k[e.id] = n), lc(A, e.id, n))
        continue
      }
      let n = {
          x: Math.min(t.sourceAbsolutePosition.x, t.targetAbsolutePosition.x),
          y: Math.min(t.sourceAbsolutePosition.y, t.targetAbsolutePosition.y),
          width:
            Math.max(
              t.sourceAbsolutePosition.x + t.sourceSize.width,
              t.targetAbsolutePosition.x + t.targetSize.width
            ) -
            Math.min(t.sourceAbsolutePosition.x, t.targetAbsolutePosition.x),
          height:
            Math.max(
              t.sourceAbsolutePosition.y + t.sourceSize.height,
              t.targetAbsolutePosition.y + t.targetSize.height
            ) -
            Math.min(t.sourceAbsolutePosition.y, t.targetAbsolutePosition.y),
        },
        r = is(i, e.source, e.target, t.adjustedSource, t.adjustedTarget, m, n),
        s = r.filter((t) => !t.soft && t.id !== e.source && t.id !== e.target),
        { edgeRoutes: u, containerBorders: _ } = hc(e, t, i, m, r, k, A, g),
        v = [...u, ..._],
        y = xc(t, r, v, !0),
        b = c.has(e.type ?? ``),
        x = Q(e.data?.sourceAnchor),
        S = Q(e.data?.targetAnchor),
        C = Array.isArray(e.data?.points) && e.data.points.length > 0,
        w = e.source !== e.target && !C,
        T = t,
        E
      if (w) {
        let n = h.get(e.source)?.type,
          c = h.get(e.target)?.type,
          l = M.get(Z(e.id, `source`)),
          d = M.get(Z(e.id, `target`)),
          f = p ? Cc(t, n, c, x, S, l, d, b, r, y) : ``,
          g = p?.get(e.id),
          C = _c(p, e.id, f)
        if (C)
          ((T =
            ac(
              e,
              i,
              h,
              a,
              o,
              { sourceAnchor: C.sourceAnchor, targetAnchor: C.targetAnchor },
              !0,
              m
            ) ?? t),
            (E = C.computed))
        else {
          let y = Ns({
            sourceRect: wc(t.sourceAbsolutePosition, t.sourceSize),
            targetRect: wc(t.targetAbsolutePosition, t.targetSize),
            sourceType: n,
            targetType: c,
            sourceCustom: x,
            targetCustom: S,
            sourcePreferred: l,
            targetPreferred: d,
            resolve: (t) => ac(e, i, h, a, o, t, !0, m),
            obstacles: r,
            thirdPartyObstacles: s,
            neighborEdges: u,
            enableStraightPath: b,
            incumbentRoute: g?.computed,
          })
          y
            ? ((T = y.endpoints),
              (E = ja(y.route, _) ? Ms(y.endpoints, r, v, b) : y.route),
              vc(p, e.id, {
                sig: f,
                routeSig: ``,
                computed: E,
                sourceAnchor: y.sourceAnchor,
                targetAnchor: y.targetAnchor,
              }))
            : ((E = as(Sc(t, r, u, b))), ja(E, _) && (E = as(Sc(t, r, v, b))))
        }
      } else {
        let n = p ? yc(b, t, r, xc(t, r, v, !1)) : ``,
          i = _c(p, e.id, n)
        i
          ? (E = i.computed)
          : ((E = as(Sc(t, r, u, b))),
            ja(E, _) && (E = as(Sc(t, r, v, b))),
            vc(p, e.id, { sig: n, routeSig: ``, computed: E }))
      }
      ;((k[e.id] = oc(e, E, T)), lc(A, e.id, k[e.id]))
    }
    if (p && p.size > g.size) for (let e of p.keys()) g.has(e) || p.delete(e)
    return { routeById: k }
  }
  let Oc = (e, t) => {
      let n = [
        {
          side: V.Left,
          distance: Math.abs(e.x - t.x),
          ratio: (e.y - t.y) / t.height,
        },
        {
          side: V.Right,
          distance: Math.abs(e.x - (t.x + t.width)),
          ratio: (e.y - t.y) / t.height,
        },
        {
          side: V.Top,
          distance: Math.abs(e.y - t.y),
          ratio: (e.x - t.x) / t.width,
        },
        {
          side: V.Bottom,
          distance: Math.abs(e.y - (t.y + t.height)),
          ratio: (e.x - t.x) / t.width,
        },
      ].sort((e, t) => e.distance - t.distance || (e.side < t.side ? -1 : 1))
      return { side: n[0].side, ratio: Math.max(0, Math.min(1, n[0].ratio)) }
    },
    kc = (e, t, n) => {
      let r = new Map(),
        i = new Map(n.map((e) => [e.id, e]))
      for (let a of t) {
        let t = e[a.id]
        if (!t || t.length === 0) continue
        let o = $(a.source, n, i),
          s = $(a.target, n, i)
        ;(o && r.set(Z(a.id, `source`), Oc(t[0], o).side),
          s && r.set(Z(a.id, `target`), Oc(t[t.length - 1], s).side))
      }
      return r
    },
    Ac = (e) => [
      e.hardInvalidity,
      e.weightedCost,
      e.maxSideGapImbalancePx,
      e.totalSideGapImbalancePx,
      e.maxCornerJamPermille,
      e.totalCornerJamPermille,
      e.straightBroken,
      e.bends,
      e.length,
    ],
    jc = (e, t) => Bi(Ac(e), Ac(t)),
    Mc = (e) =>
      e.hardInvalidity > 0 ||
      e.crossings > 0 ||
      e.proximityPx > 0 ||
      e.straightBroken > 0 ||
      e.maxSideGapImbalancePx > 0 ||
      e.maxCornerJamPermille > 800,
    Nc = (e) => {
      let t = 1 / 0,
        n = -1 / 0,
        r = 1 / 0,
        i = -1 / 0
      for (let a of e)
        (a.x < t && (t = a.x),
          a.x > n && (n = a.x),
          a.y < r && (r = a.y),
          a.y > i && (i = a.y))
      return { minX: t, maxX: n, minY: r, maxY: i }
    },
    Pc = (e, t, n) =>
      !(
        e.maxX + n <= t.minX ||
        t.maxX + n <= e.minX ||
        e.maxY + n <= t.minY ||
        t.maxY + n <= e.minY
      ),
    Fc = (e, t) => e.x === t.x && e.y === t.y,
    Ic = (e, t, n) =>
      e.x >= Math.min(t.x, n.x) &&
      e.x <= Math.max(t.x, n.x) &&
      e.y >= Math.min(t.y, n.y) &&
      e.y <= Math.max(t.y, n.y) &&
      (t.x === n.x ? e.x === t.x : e.y === t.y),
    Lc = (e, t) => {
      for (let n = 0; n < e.length - 1; n++)
        if (Ic(t, e[n], e[n + 1]))
          return (
            Fc(t, e[n + 1]) ? e.slice(n + 1) : [t, ...e.slice(n + 1)]
          ).map(({ x: e, y: t }) => ({ x: e, y: t }))
      return e.map(({ x: e, y: t }) => ({ x: e, y: t }))
    },
    Rc = (e, t, n, r) => {
      let i = t === `source` ? [...e] : [...e].reverse(),
        a = r === `source` ? [...n] : [...n].reverse()
      if (i.length < 2 || a.length < 2 || !Fc(i[0], a[0]))
        return [[...e], [...n]]
      let o = 0,
        s = 0,
        c = i[0]
      for (; o < i.length - 1 && s < a.length - 1; ) {
        let e = i[o + 1],
          t = a[s + 1],
          n = Math.sign(e.x - c.x),
          r = Math.sign(e.y - c.y),
          l = Math.sign(t.x - c.x),
          u = Math.sign(t.y - c.y)
        if (n !== l || r !== u) break
        let d = Math.abs(e.x - c.x) + Math.abs(e.y - c.y),
          f = Math.abs(t.x - c.x) + Math.abs(t.y - c.y),
          p = Math.min(d, f)
        if (((c = { x: c.x + n * p, y: c.y + r * p }), d !== f)) break
        ;(o++, s++)
      }
      if (Fc(c, i[0])) return [[...e], [...n]]
      let l = Lc(i, c),
        u = Lc(a, c)
      return [
        t === `source` ? l : l.reverse(),
        r === `source` ? u : u.reverse(),
      ]
    },
    zc = (e, t, n, r, i, a = new Set()) => {
      let o = 0,
        s = 0,
        c = 0,
        l = 0,
        u = 0,
        d = 0,
        f = 0,
        p = 0,
        m = 0,
        h = new Map(),
        g = new Map(n.map((e) => [e.id, e])),
        _ = i
          ? new Set(
              t.filter((e) => i.has(e.id)).flatMap((e) => [e.source, e.target])
            )
          : void 0,
        v = (e, t, r, i) => {
          if (_ && !_.has(e)) return
          let a = $(e, n, g)
          if (!a || a.width <= 0 || a.height <= 0) return
          let o = Oc(t, a)
          if (r) {
            let e = Math.round(2e3 * Math.abs(o.ratio - 0.5))
            ;((p = Math.max(p, e)), (m += e))
          }
          let s = `${e}|${o.side}`,
            c = h.get(s),
            l = Math.round(o.ratio * 1e9)
          if (c) {
            if (i && c.pinnedRatios.has(l)) return
            ;(c.ratios.push(o.ratio), i && c.pinnedRatios.add(l))
          } else
            h.set(s, {
              ratios: [o.ratio],
              pinnedRatios: new Set(i ? [l] : []),
              sideLength: Y(o.side, a),
            })
        },
        y = t.flatMap((t) => {
          let c = !i || i.has(t.id),
            l = e[t.id]
          if (!l || l.length === 0) return (c && o++, [])
          let p = a.has(t.id),
            m = Q(t.data?.sourceAnchor),
            h = Q(t.data?.targetAnchor)
          ;(v(t.source, l[0], !p && !m, m !== void 0),
            v(t.target, l[l.length - 1], !p && !h, h !== void 0))
          let _ = $(t.source, n, g),
            y = $(t.target, n, g),
            b =
              !Q(t.data?.sourceAnchor) &&
              !Q(t.data?.targetAnchor) &&
              !(Array.isArray(t.data?.points) && t.data.points.length > 0)
          if (
            (c &&
              b &&
              _ &&
              y &&
              r.has(t.type ?? ``) &&
              (ps(!0, _, y) || ps(!1, _, y)) &&
              l.length > 2 &&
              u++,
            c)
          ) {
            let e = Math.max(0, l.length - 2)
            d += e
            let t = 0
            for (let e = 0; e < l.length - 1; e++)
              t += Math.abs(l[e + 1].x - l[e].x) + Math.abs(l[e + 1].y - l[e].y)
            ;((f += t), (s += Gi({ lengthPx: t, bends: e }, H.SNAP_TO_GRID_PX)))
          }
          return [{ edge: t, route: l, focused: c, bounds: Nc(l) }]
        }),
        b = G.parallelCrowdingClearanceInGridCells * H.SNAP_TO_GRID_PX
      for (let e = 0; e < y.length; e++)
        if (y[e].focused)
          for (let t = 0; t < y.length; t++) {
            if (
              e === t ||
              (y[t].focused && t < e) ||
              !Pc(y[e].bounds, y[t].bounds, b)
            )
              continue
            let n = y[e].route,
              r = y[t].route
            for (let i of mc(y[e].edge, y[t].edge))
              [n, r] = Rc(n, i.firstEnd, r, i.secondEnd)
            let i = Na(n, [r]),
              a = Na(r, [n]),
              o = Math.max(i.crossings, a.crossings),
              u = Qi(n, [r], b)
            ;((c += o),
              (l += u.overlapPx + u.crowdingPx),
              (s += Gi(
                {
                  crossings: o,
                  overlapPx: u.overlapPx,
                  crowdingPx: u.crowdingPx,
                },
                H.SNAP_TO_GRID_PX
              )))
          }
      let x = 0,
        S = 0
      for (let { ratios: e, sideLength: t } of h.values()) {
        let n = Hi(e, t, H.SNAP_TO_GRID_PX)
        ;((s += n.cost),
          (x = Math.max(x, n.maxGapErrorPx)),
          (S += n.totalGapErrorPx))
      }
      return {
        hardInvalidity: o,
        weightedCost: s,
        crossings: c,
        proximityPx: l,
        straightBroken: u,
        bends: d,
        maxSideGapImbalancePx: x,
        totalSideGapImbalancePx: S,
        maxCornerJamPermille: p,
        totalCornerJamPermille: m,
        length: f,
      }
    },
    Bc = (e, t, n) => {
      let r = $(e.source, t, n),
        i = $(e.target, t, n)
      return [
        r?.x ?? 1 / 0,
        r?.y ?? 1 / 0,
        r?.width ?? 0,
        r?.height ?? 0,
        i?.x ?? 1 / 0,
        i?.y ?? 1 / 0,
        i?.width ?? 0,
        i?.height ?? 0,
        e.type ?? ``,
        e.source,
        e.target,
        e.id,
      ]
    },
    Vc = (e, t) => {
      for (let n = 0; n < e.length; n++)
        if (e[n] !== t[n]) return e[n] < t[n] ? -1 : 1
      return 0
    },
    Hc = (e, t) => {
      let n = new Int32Array(e.length)
      for (let t = 0; t < e.length; t++) n[t] = t
      let r = (e) => {
          let t = e
          for (; n[t] !== t; ) t = n[t]
          for (; n[e] !== e; ) {
            let r = n[e]
            ;((n[e] = t), (e = r))
          }
          return t
        },
        i = (e, t) => {
          let i = r(e),
            a = r(t)
          i !== a && (n[a] = i)
        },
        a = new Map()
      e.forEach((e, t) => {
        for (let n of [e.source, e.target]) {
          let e = a.get(n)
          e === void 0 ? a.set(n, t) : i(e, t)
        }
      })
      let o = G.parallelCrowdingClearanceInGridCells * H.SNAP_TO_GRID_PX,
        s = e.map((e) => {
          let n = t[e.id]
          return n && n.length >= 2 ? Nc(n) : null
        })
      for (let n = 0; n < e.length; n++) {
        let a = t[e[n].id]
        if (!(!a || a.length < 2))
          for (let c = n + 1; c < e.length; c++) {
            if (r(n) === r(c)) continue
            let l = t[e[c].id]
            if (!l || l.length < 2) continue
            let u = s[n],
              d = s[c]
            if (u && d && !Pc(u, d, o)) continue
            let f = Na(a, [l]),
              p = Na(l, [a])
            ;(f.crossings > 0 ||
              p.crossings > 0 ||
              f.proximityPx > 0 ||
              p.proximityPx > 0 ||
              ja(a, [l]) ||
              ja(l, [a])) &&
              i(n, c)
          }
      }
      let c = new Map()
      return (
        e.forEach((e, t) => {
          let n = r(t),
            i = c.get(n)
          i ? i.push(e) : c.set(n, [e])
        }),
        [...c.values()]
      )
    }
  function Uc(e) {
    let t = gc(e.edges, e.liveOverride),
      n = {
        ...e,
        edges: t.edges,
        liveOverride: t.liveOverride,
        nodeIndex: e.nodeIndex ?? rs(e.nodes),
      },
      r = Dc(n, 0),
      i = (e) =>
        e.id === n.liveOverride?.edgeId ||
        n.straightHookTypes.has(e.type ?? ``) ||
        (Array.isArray(e.data?.points) && e.data.points.length > 0),
      a = new Set(n.edges.filter(i).map((e) => e.id))
    if (!Mc(zc(r.routeById, n.edges, n.nodes, n.straightPathTypes, void 0, a)))
      return r
    let o = r.routeById,
      s = new Map(n.nodes.map((e) => [e.id, e])),
      c = new Map(n.edges.map((e) => [e, Bc(e, n.nodes, s)])),
      l = (e, t) => Vc(c.get(e), c.get(t)),
      u = Hc(n.edges, r.routeById).map((e) => e.sort(l))
    u.sort((e, t) => l(e[0], t[0]))
    for (let e of u) {
      let t = e.filter(i),
        r = e.filter((e) => !i(e))
      if (r.length < 2 || r.length > 8) continue
      let s = new Set(e.map((e) => e.id)),
        c = zc(o, n.edges, n.nodes, n.straightPathTypes, s, a)
      if (!Mc(c)) continue
      let l = new Set(r.map((e) => e.id)),
        u = Object.fromEntries(Object.entries(o).filter(([e]) => !l.has(e))),
        d = [{ routeById: o }],
        f = [`reverse`]
      for (let e = 1; e < r.length && e <= 2; e++) f.push(e)
      for (let e of f) {
        let i = Dc({ ...n, edges: r, fixedEdges: t, solveCache: void 0 }, e, u),
          l = zc(i.routeById, n.edges, n.nodes, n.straightPathTypes, s, a)
        ;(d.push(i), jc(l, c) && ((o = i.routeById), (c = l)))
      }
      let p = kc(o, n.edges, n.nodes),
        m = Dc({ ...n, edges: r, fixedEdges: t, solveCache: void 0 }, 0, u, p),
        h = zc(m.routeById, n.edges, n.nodes, n.straightPathTypes, s, a)
      ;(d.push(m), jc(h, c) && ((o = m.routeById), (c = h)))
      for (let e = 0; e < r.length; e++) {
        let e = !1
        for (let t of r)
          for (let r of d) {
            let i = r.routeById[t.id]
            if (!i || i === o[t.id]) continue
            let l = { ...o, [t.id]: i },
              u = zc(l, n.edges, n.nodes, n.straightPathTypes, s, a)
            jc(u, c) && ((o = l), (c = u), (e = !0))
          }
        if (!e) break
      }
    }
    return { routeById: o }
  }
  let Wc = ({ x: e, y: t }) => ({ x: e, y: t }),
    Gc = (e) => e.map(Wc),
    Kc = (e, t) => ({
      sig: e.sig,
      routeSig: e.routeSig,
      computed: Gc(e.computed),
      sourceAnchor: e.sourceAnchor ? { ...e.sourceAnchor } : void 0,
      targetAnchor: e.targetAnchor ? { ...e.targetAnchor } : void 0,
      alternatives: t
        ? e.alternatives?.slice(0, 4).map((e) => Kc(e, !1))
        : void 0,
    }),
    qc = (e) => new Map(e.map(([e, t]) => [e, Kc(t, !0)])),
    Jc = (e) =>
      e
        ? Object.fromEntries(Object.entries(e).map(([e, t]) => [e, Gc(t)]))
        : void 0,
    Yc = (e) => ({
      ...e,
      position: Wc(e.position),
      measured: e.measured ? { ...e.measured } : void 0,
      data: {},
    }),
    Xc = (e) => ({ ...e }),
    Zc = (e) => ({
      ...e,
      data: e.data
        ? {
            points: e.data.points ? Gc(e.data.points) : void 0,
            sourceAnchor: e.data.sourceAnchor
              ? { ...e.data.sourceAnchor }
              : void 0,
            targetAnchor: e.data.targetAnchor
              ? { ...e.data.targetAnchor }
              : void 0,
          }
        : void 0,
    }),
    Qc = (e) => {
      let t = Yc(e)
      return {
        ...t,
        handles: e.handles?.map(Xc),
        measured: e.measured ? { ...e.measured } : {},
        internals: {
          positionAbsolute: Wc(e.positionAbsolute),
          z: 0,
          userNode: t,
          handleBounds: e.handleBounds
            ? {
                source: e.handleBounds.source?.map(Xc) ?? null,
                target: e.handleBounds.target?.map(Xc) ?? null,
              }
            : void 0,
        },
      }
    },
    $c = (e) =>
      e === void 0
        ? void 0
        : e === null
          ? null
          : {
              edgeId: e.edgeId,
              points: Gc(e.points),
              edge: e.edge ? Zc(e.edge) : void 0,
              strategy: e.strategy,
            },
    el = (e) => ({
      nodes: e.nodes.map(Yc),
      nodeLookup: new Map(e.nodeLookup.map(([e, t]) => [e, Qc(t)])),
      connectionMode: e.connectionMode,
      edges: e.edges.map(Zc),
      straightPathTypes: new Set(e.straightPathTypes),
      straightHookTypes: new Set(e.straightHookTypes),
      fixedEdges: e.fixedEdges?.map(Zc),
      liveOverride: $c(e.liveOverride),
      previous: Jc(e.previous),
    }),
    tl = (e, t = new Map()) => {
      let n = performance.now()
      try {
        let r = el(e.input)
        if (t.size === 0 && e.initialCache)
          for (let [n, r] of qc(e.initialCache)) t.set(n, r)
        let { routeById: i } = Uc({ ...r, solveCache: t })
        return {
          protocol: 2,
          sessionId: e.sessionId,
          revision: e.revision,
          kind: `result`,
          routeById: i,
          durationMs: performance.now() - n,
          perfDelta: void 0,
        }
      } catch (t) {
        return {
          protocol: 2,
          sessionId: e.sessionId,
          revision: e.revision,
          kind: `error`,
          message:
            t instanceof Error ? t.message : `Edge geometry solve failed`,
        }
      }
    },
    nl = globalThis,
    rl = new Map()
  nl.onmessage = ({ data: e }) => {
    nl.postMessage(tl(e, rl))
  }
})()
