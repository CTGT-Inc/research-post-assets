/* FIG-5 — cost/quality scatter with budget toggle.
   Self-mounts into <div id="fig-cost-quality">. Vanilla JS, no dependencies. */
(function () {
  'use strict';

  var ID = 'fig-cost-quality';
  var SVGNS = 'http://www.w3.org/2000/svg';
  var FONT = "'Switzer Variable','Switzer',-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif";
  var INK = 'rgb(23,32,27)';
  var SAGE = 'rgb(95,144,136)';

  var DATA = {"budget_8k":[ {"m":"GPT-OSS-20B base","acc":64.71,"cost":0.00034637,"cls":"base"}, {"m":"CTGT 20B (self-distilled)","acc":74.79,"cost":0.00026553,"cls":"ctgt"}, {"m":"GPT-OSS-120B base","acc":81.09,"cost":0.00018487,"cls":"base"}, {"m":"CTGT 120B (self-distilled)","acc":83.61,"cost":0.00025939,"cls":"ctgt","completion":"98.7%"}, {"m":"CTGT 120B (Flash-taught)","acc":84.03,"cost":0.00025727,"cls":"ctgt"}, {"m":"DeepSeek V4 Flash","acc":85.71,"cost":0.00088235,"cls":"ext"}, {"m":"Inkling","acc":65.13,"cost":0.01605415,"cls":"ext","completion":"71.01%"}, {"m":"Kimi K3","acc":81.93,"cost":0.04141355,"cls":"ext","completion":"90.76%"}], "budget_100k":[ {"m":"GPT-OSS-20B base","acc":68.07,"cost":0.00065327,"cls":"base"}, {"m":"CTGT 20B (self-distilled)","acc":75.21,"cost":0.00030717,"cls":"ctgt"}, {"m":"GPT-OSS-120B base","acc":81.09,"cost":0.00018487,"cls":"base"}, {"m":"CTGT 120B (self-distilled)","acc":83.61,"cost":0.00025939,"cls":"ctgt"}, {"m":"CTGT 120B (Flash-taught)","acc":84.03,"cost":0.00025727,"cls":"ctgt"}, {"m":"DeepSeek V4 Flash","acc":85.71,"cost":0.00088235,"cls":"ext"}, {"m":"Inkling","acc":88.24,"cost":0.02394958,"cls":"ext"}, {"m":"Kimi K3","acc":89.92,"cost":0.05025210,"cls":"ext"}]};

  var CAPTION = 'Completion rates within the 8k budget: CTGT 120B 98.7%, Kimi K3 90.76%, Inkling 71.01%. Truncated generations score as incorrect, which is why the ordering differs between budgets. Costs are OpenRouter list rates \u00D7 measured tokens, identical basis for every model; CTGT costs are best-checkpoint.';

  /* label offsets: [dx, dy, anchor, leader?, deltaDy?] per budget */
  var LC = {
    'GPT-OSS-20B base':           { '8k': [11, 23, 'start'], '100k': [11, 23, 'start'] },
    'CTGT 20B (self-distilled)':  { '8k': [13, 4, 'start'],  '100k': [13, 4, 'start'] },
    'GPT-OSS-120B base':          { '8k': [11, 22, 'start'], '100k': [11, 22, 'start'] },
    'CTGT 120B (Flash-taught)':   { '8k': [206, -74, 'start', 1], '100k': [206, -74, 'start', 1] },
    'CTGT 120B (self-distilled)': { '8k': [206, -50, 'start', 1], '100k': [206, -50, 'start', 1] },
    'DeepSeek V4 Flash':          { '8k': [13, 4, 'start'],  '100k': [13, 4, 'start'] },
    'Inkling':                    { '8k': [0, -18, 'middle'], '100k': [-14, 22, 'end'] },
    'Kimi K3':                    { '8k': [-14, 4, 'end'],   '100k': [-14, 4, 'end', 0, -15] }
  };
  var NUM_OFF = {
    'CTGT 120B (Flash-taught)':   [12, -7],
    'CTGT 120B (self-distilled)': [12, 10],
    'Kimi K3':                    [-12, -9]
  };
  var FILLS = {
    base: { fill: '#ffffff', stroke: 'rgba(23,32,27,0.85)', sw: 1.6 },
    ctgt: { fill: 'rgb(64,92,80)', stroke: 'none', sw: 0 },
    ext:  { fill: 'rgba(23,32,27,0.30)', stroke: 'rgba(23,32,27,0.60)', sw: 1.1 }
  };

  function d(style, text) {
    var n = document.createElement('div');
    if (style) n.style.cssText = style;
    if (text != null) n.textContent = text;
    return n;
  }
  function sv(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag), k;
    if (attrs) for (k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function fmtCost(c) { return '$' + c.toFixed(8).replace(/0+$/, ''); }
  function px(v) { return v.toFixed(2) + 'px'; }
  function log10(v) { return Math.log(v) / Math.LN10; }

  function shapePath(cls, r) {
    if (cls === 'base') return 'M ' + (-r) + ' 0 a ' + r + ' ' + r + ' 0 1 0 ' + (2 * r) + ' 0 a ' + r + ' ' + r + ' 0 1 0 ' + (-2 * r) + ' 0';
    if (cls === 'ctgt') return 'M 0 ' + (-r * 1.1) + ' L ' + (r * 1.02) + ' ' + (r * 0.78) + ' L ' + (-r * 1.02) + ' ' + (r * 0.78) + ' Z';
    var s = r * 0.88;
    return 'M ' + (-s) + ' ' + (-s) + ' H ' + s + ' V ' + s + ' H ' + (-s) + ' Z';
  }
  function deltaTxt(n, o) {
    var v = n.acc - o.acc;
    if (Math.abs(v) < 0.001 && Math.abs(n.cost - o.cost) < 1e-9) return '';
    return (v >= 0 ? '+' : '\u2212') + Math.abs(v).toFixed(2) + ' pts \u00B7 \u00D7' + (n.cost / o.cost).toFixed(2) + ' cost';
  }
  function anchorTf(a) {
    return a === 'end' ? 'translate(-100%, -50%)' : (a === 'middle' ? 'translate(-50%, -50%)' : 'translate(0, -50%)');
  }
  function legendItem(mark, label, dim) {
    var row = d('display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500;' + (dim ? 'opacity:0.6;' : ''));
    row.appendChild(mark);
    row.appendChild(d('', label));
    return row;
  }

  function build(root) {
    var E8 = DATA.budget_8k, E100 = DATA.budget_100k, N = E8.length;
    var st = { budget: '8k', active: -1, w: 0, motion: true, narrow: false };
    var G = null;

    root.textContent = '';
    root.style.cssText = 'font-family:' + FONT + ';color:' + INK + ';width:100%;max-width:900px;margin:0 auto;padding:24px 0 0;letter-spacing:-0.01em;box-sizing:border-box;';

    /* ── header ─────────────────────────────────────────────── */
    var head = d('display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:16px;padding-bottom:14px;border-bottom:1px solid rgba(23,32,27,0.10);');
    var headL = d('display:flex;flex-direction:column;gap:9px;min-width:200px;flex:1 1 240px;');
    var eyebrow = d('display:flex;align-items:center;gap:7px;font-size:12px;font-weight:500;opacity:0.7;');
    eyebrow.appendChild(d('width:6px;height:6px;background:' + INK + ';display:block;'));
    eyebrow.appendChild(d('', 'figure 5'));
    headL.appendChild(eyebrow);
    headL.appendChild(d('font-size:24px;font-weight:400;line-height:1.1;letter-spacing:-0.02em;', 'Accuracy against cost per query'));

    var group = d('display:flex;border:1px solid rgba(23,32,27,0.20);align-self:flex-end;');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Token budget');
    function mkBtn(label, budget, divider) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.cssText = 'appearance:none;border:0;' + (divider ? 'border-right:1px solid rgba(23,32,27,0.20);' : '') +
        'font-family:inherit;font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:0.08em;white-space:nowrap;padding:12px 14px;cursor:pointer;transition:background 150ms linear,color 150ms linear;';
      b.addEventListener('click', function () {
        if (st.budget === budget) return;
        st.budget = budget;
        render();
      });
      return b;
    }
    var btn8 = mkBtn('Normal budget \u00B7 8k', '8k', true);
    var btn100 = mkBtn('Expanded budget \u00B7 100k', '100k', false);
    group.appendChild(btn8);
    group.appendChild(btn100);
    head.appendChild(headL);
    head.appendChild(group);
    root.appendChild(head);

    /* ── legend ─────────────────────────────────────────────── */
    var legend = d('display:flex;flex-wrap:wrap;gap:8px 20px;padding:13px 0 6px;');
    var lc = sv('svg', { width: 16, height: 16, viewBox: '0 0 16 16', 'aria-hidden': 'true', style: 'display:block' });
    lc.appendChild(sv('circle', { cx: 8, cy: 8, r: 6, fill: '#fff', stroke: 'rgba(23,32,27,0.85)', 'stroke-width': 1.6 }));
    var lt = sv('svg', { width: 16, height: 16, viewBox: '0 0 16 16', 'aria-hidden': 'true', style: 'display:block' });
    lt.appendChild(sv('path', { d: 'M 8 1.6 L 14.6 12.8 L 1.4 12.8 Z', fill: 'rgb(64,92,80)' }));
    var ls = sv('svg', { width: 16, height: 16, viewBox: '0 0 16 16', 'aria-hidden': 'true', style: 'display:block' });
    ls.appendChild(sv('rect', { x: 2.6, y: 2.6, width: 10.8, height: 10.8, fill: 'rgba(23,32,27,0.30)', stroke: 'rgba(23,32,27,0.60)', 'stroke-width': 1.1 }));
    var ld = sv('svg', { width: 22, height: 16, viewBox: '0 0 22 16', 'aria-hidden': 'true', style: 'display:block' });
    ld.appendChild(sv('path', { d: 'M 1 12 L 21 4', stroke: INK, 'stroke-width': 1, 'stroke-dasharray': '3 3', fill: 'none' }));
    legend.appendChild(legendItem(lc, 'GPT-OSS base'));
    legend.appendChild(legendItem(lt, 'CTGT'));
    legend.appendChild(legendItem(ls, 'External model'));
    legend.appendChild(legendItem(ld, 'shift between budgets', true));
    root.appendChild(legend);

    /* ── plot ───────────────────────────────────────────────── */
    var wrap = d('position:relative;width:100%;overflow:visible;');
    var svg = sv('svg', { role: 'img', style: 'display:block;overflow:visible', 'aria-label': 'Scatter plot of accuracy against cost per query for eight models, two token budgets' });
    var gGrid = sv('g'), gMinor = sv('g'), gAxes = sv('g'), gConn = sv('g'), gLead = sv('g'), gMarks = sv('g');
    svg.appendChild(gGrid); svg.appendChild(gMinor); svg.appendChild(gAxes);
    svg.appendChild(gConn); svg.appendChild(gLead); svg.appendChild(gMarks);
    wrap.appendChild(svg);

    var overlay = d('position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:visible;');
    overlay.setAttribute('aria-hidden', 'true');
    var tickLayer = d('position:absolute;left:0;top:0;width:100%;height:100%;');
    var xTitle = d('', 'cost per query \u00B7 usd \u00B7 log scale');
    var yTitle = d('', 'accuracy');
    overlay.appendChild(tickLayer);
    overlay.appendChild(xTitle);
    overlay.appendChild(yTitle);
    wrap.appendChild(overlay);

    var axX = sv('line', { stroke: INK, 'stroke-width': 1, opacity: 0.45 });
    var axY = sv('line', { stroke: INK, 'stroke-width': 1, opacity: 0.45 });
    gAxes.appendChild(axX); gAxes.appendChild(axY);

    var conns = [], i;
    for (i = 0; i < N; i++) {
      if (Math.abs(E8[i].acc - E100[i].acc) < 0.001 && Math.abs(E8[i].cost - E100[i].cost) < 1e-9) { conns.push(null); continue; }
      var cp = sv('path', { fill: 'none', stroke: INK, 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0.32 });
      gConn.appendChild(cp);
      conns.push(cp);
    }

    var marks = [], notes = [], leaders = [];
    for (i = 0; i < N; i++) {
      var g = sv('g', { 'data-i': i, tabindex: 0, role: 'button', style: 'cursor:pointer;outline:none' });
      g.appendChild(sv('circle', { cx: 0, cy: 0, r: 15, fill: 'transparent' }));
      var ring = sv('circle', { cx: 0, cy: 0, r: 13, fill: 'none', stroke: SAGE, 'stroke-width': 1.5, opacity: 0 });
      var path = sv('path', {});
      g.appendChild(ring); g.appendChild(path);
      gMarks.appendChild(g);
      marks.push({ g: g, ring: ring, path: path });
      bindMark(g, i);

      var lead = sv('path', { fill: 'none', stroke: INK, 'stroke-width': 1, opacity: 0.3 });
      gLead.appendChild(lead);
      leaders.push(lead);

      var nw = d('position:absolute;left:0;top:0;');
      var nl = d(''), nd = d('');
      nw.appendChild(nl); nw.appendChild(nd);
      overlay.appendChild(nw);
      notes.push({ wrap: nw, label: nl, delta: nd });
    }

    var tip = d('position:absolute;pointer-events:none;z-index:5;width:max-content;max-width:250px;background:' + INK + ';color:#fff;padding:10px 12px;visibility:hidden;opacity:0;transition:opacity 140ms linear;');
    tip.setAttribute('aria-hidden', 'true');
    var tipModel = d('font-size:12.5px;font-weight:500;line-height:1.25;');
    var tipBody = d('display:flex;flex-direction:column;gap:3px;padding-top:7px;font-size:12px;font-weight:400;color:rgba(255,255,255,0.8);');
    var tipAcc = d(''), tipCost = d(''), tipComp = d(''), tipBudget = d('');
    tipBody.appendChild(tipAcc); tipBody.appendChild(tipCost); tipBody.appendChild(tipComp); tipBody.appendChild(tipBudget);
    tip.appendChild(tipModel); tip.appendChild(tipBody);
    wrap.appendChild(tip);
    root.appendChild(wrap);

    /* ── narrow-mode key ───────────────────────────────────── */
    var list = document.createElement('ol');
    list.style.cssText = 'list-style:none;margin:18px 0 0;padding:0;border-top:1px solid rgba(23,32,27,0.10);display:none;';
    var rows = [];
    for (i = 0; i < N; i++) {
      var li = document.createElement('li');
      li.style.cssText = 'display:grid;grid-template-columns:22px 16px 1fr;gap:9px;padding:9px 0;border-bottom:1px solid rgba(23,32,27,0.08);align-items:start;';
      var num = d('font-size:11px;font-weight:500;opacity:0.6;padding-top:3px;', String(i + 1));
      var gl = sv('svg', { width: 16, height: 16, viewBox: '-8 -8 16 16', 'aria-hidden': 'true', style: 'display:block;margin-top:2px' });
      var glp = sv('path', {});
      gl.appendChild(glp);
      var col = d('display:flex;flex-direction:column;gap:3px;');
      var nm = d('font-size:13px;font-weight:500;line-height:1.2;');
      var stats = d('font-size:12px;font-weight:400;opacity:0.7;');
      var dl = d('font-size:12px;font-weight:500;opacity:0.7;');
      col.appendChild(nm); col.appendChild(stats); col.appendChild(dl);
      li.appendChild(num); li.appendChild(gl); li.appendChild(col);
      list.appendChild(li);
      rows.push({ glyph: glp, name: nm, stats: stats, delta: dl });
    }
    root.appendChild(list);

    var caption = document.createElement('p');
    caption.style.cssText = 'margin:18px 0 0;padding-top:14px;border-top:1px solid rgba(23,32,27,0.10);font-size:13px;font-weight:300;line-height:1.5;opacity:0.7;max-width:68ch;text-wrap:pretty;';
    caption.textContent = CAPTION;
    root.appendChild(caption);

    /* ── interaction ────────────────────────────────────────── */
    function bindMark(g, idx) {
      g.addEventListener('mouseenter', function () { setActive(idx); });
      g.addEventListener('mouseleave', function () { setActive(-1); });
      g.addEventListener('focus', function () { setActive(idx); });
      g.addEventListener('blur', function () { setActive(-1); });
      g.addEventListener('click', function () { setActive(idx); });
      g.addEventListener('keydown', function (e) {
        var k = e.key;
        if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); focusMark(idx + 1); }
        else if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); focusMark(idx - 1); }
        else if (k === 'Enter' || k === ' ') { e.preventDefault(); setActive(idx); }
        else if (k === 'Escape') { setActive(-1); }
      });
    }
    function focusMark(n) {
      var j = (n + N) % N, el = gMarks.querySelector('[data-i="' + j + '"]');
      if (el && el.focus) el.focus();
    }
    function setActive(idx) {
      if (st.active === idx) return;
      st.active = idx;
      paintActive();
    }

    function paintActive() {
      var series = st.budget === '100k' ? E100 : E8, k;
      for (k = 0; k < N; k++) marks[k].ring.setAttribute('opacity', st.active === k ? 1 : 0);
      if (st.active < 0 || !G) { tip.style.visibility = 'hidden'; tip.style.opacity = 0; return; }
      var p = series[st.active];
      tipModel.textContent = p.m;
      tipAcc.textContent = 'accuracy ' + p.acc.toFixed(2) + '%';
      tipCost.textContent = 'cost ' + fmtCost(p.cost) + ' / query';
      tipComp.textContent = 'completion ' + (p.completion ? p.completion : 'not reported');
      tipBudget.textContent = st.budget === '100k' ? 'expanded budget \u00B7 100k tokens' : 'normal budget \u00B7 8k tokens';
      var x = G.X(p.cost), y = G.Y(p.acc);
      var flip = x > G.padL + G.iw * 0.56;
      tip.style.left = px(x);
      tip.style.top = px(y);
      tip.style.transform = flip ? 'translate(calc(-100% - 16px), -50%)' : 'translate(16px, -50%)';
      tip.style.visibility = 'visible';
      tip.style.opacity = 1;
    }

    /* ── layout + paint ─────────────────────────────────────── */
    function layout() {
      var W = Math.max(300, Math.min(st.w || 700, 960));
      var narrow = W < 580;
      var padL = narrow ? 40 : 52, padR = narrow ? 18 : 22, padT = narrow ? 20 : 26, padB = narrow ? 50 : 54;
      var H = narrow ? 400 : 470;
      var iw = W - padL - padR, ih = H - padT - padB;
      var L0 = log10(0.0001), L1 = log10(0.06), LS = L1 - L0;
      st.narrow = narrow;
      G = {
        W: W, H: H, padL: padL, iw: iw, ih: ih, padT: padT, narrow: narrow,
        r: narrow ? 6.2 : 7,
        X: function (c) { return padL + iw * ((log10(c) - L0) / LS); },
        Y: function (a) { return padT + ih * (1 - (a - 60) / 32); }
      };

      wrap.style.height = H + 'px';
      svg.setAttribute('width', W);
      svg.setAttribute('height', H);
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

      axX.setAttribute('x1', padL); axX.setAttribute('x2', padL + iw);
      axX.setAttribute('y1', padT + ih); axX.setAttribute('y2', padT + ih);
      axY.setAttribute('x1', padL); axY.setAttribute('x2', padL);
      axY.setAttribute('y1', padT); axY.setAttribute('y2', padT + ih);

      gGrid.textContent = ''; gMinor.textContent = ''; tickLayer.textContent = '';
      var accs = [60, 65, 70, 75, 80, 85, 90], j;
      for (j = 0; j < accs.length; j++) {
        gGrid.appendChild(sv('line', {
          x1: padL, x2: padL + iw, y1: G.Y(accs[j]), y2: G.Y(accs[j]),
          stroke: INK, 'stroke-width': 1, opacity: accs[j] % 10 === 0 ? 0.1 : 0.05
        }));
      }
      var majors = [0.0001, 0.001, 0.01, 0.06];
      var tickS = 'position:absolute;white-space:nowrap;font-size:12px;font-weight:500;color:rgba(23,32,27,0.7);';
      for (j = 0; j < majors.length; j++) {
        gGrid.appendChild(sv('line', { x1: G.X(majors[j]), x2: G.X(majors[j]), y1: padT, y2: padT + ih, stroke: INK, 'stroke-width': 1, opacity: 0.1 }));
        tickLayer.appendChild(d(tickS + 'left:' + px(G.X(majors[j])) + ';top:' + (padT + ih + 17) + 'px;transform:translate(-50%,-50%);', '$' + majors[j].toFixed(8).replace(/0+$/, '')));
      }
      var yl = [60, 70, 80, 90];
      for (j = 0; j < yl.length; j++) {
        tickLayer.appendChild(d(tickS + 'left:' + (padL - 10) + 'px;top:' + px(G.Y(yl[j])) + ';transform:translate(-100%,-50%);', yl[j] + '%'));
      }
      var decs = [0.0001, 0.001, 0.01], m;
      for (j = 0; j < decs.length; j++) {
        for (m = 2; m <= 9; m++) {
          var v = decs[j] * m;
          if (v > 0.06) break;
          gMinor.appendChild(sv('line', { x1: G.X(v), x2: G.X(v), y1: padT + ih, y2: padT + ih + 4, stroke: INK, 'stroke-width': 1, opacity: 0.2 }));
        }
      }
      xTitle.style.cssText = 'position:absolute;white-space:nowrap;font-size:12px;font-weight:500;color:rgba(23,32,27,0.6);left:' + px(padL + iw / 2) + ';top:' + (padT + ih + 40) + 'px;transform:translate(-50%,-50%);';
      yTitle.style.cssText = 'position:absolute;white-space:nowrap;font-size:12px;font-weight:500;color:rgba(23,32,27,0.6);left:8px;top:' + px(padT + ih / 2) + ';transform:translate(-50%,-50%) rotate(-90deg);transform-origin:center;';

      for (j = 0; j < N; j++) {
        if (!conns[j]) continue;
        conns[j].setAttribute('d', 'M ' + G.X(E8[j].cost).toFixed(2) + ' ' + G.Y(E8[j].acc).toFixed(2) +
          ' L ' + G.X(E100[j].cost).toFixed(2) + ' ' + G.Y(E100[j].acc).toFixed(2));
      }
      list.style.display = narrow ? 'block' : 'none';
    }

    function render() {
      if (!G) layout();
      var series = st.budget === '100k' ? E100 : E8;
      var key = st.budget === '100k' ? '100k' : '8k';
      var trans = st.motion ? 'transform 180ms cubic-bezier(0.4,0,0.2,1)' : 'none';
      var base = 'position:absolute;white-space:nowrap;line-height:1.15;';
      var j;

      btn8.style.background = key === '8k' ? INK : 'transparent';
      btn8.style.color = key === '8k' ? '#fff' : INK;
      btn8.setAttribute('aria-pressed', key === '8k');
      btn100.style.background = key === '100k' ? INK : 'transparent';
      btn100.style.color = key === '100k' ? '#fff' : INK;
      btn100.setAttribute('aria-pressed', key === '100k');

      for (j = 0; j < N; j++) {
        var p = series[j], f = FILLS[p.cls], cfg = LC[p.m][key];
        var dx = cfg[0], dy = cfg[1], anchor = cfg[2], lead = cfg[3];
        var ddy = cfg[4] === undefined ? dy + 12 : cfg[4];
        var x = G.X(p.cost), y = G.Y(p.acc);
        var tf = 'translate(' + px(x) + ', ' + px(y) + ')';
        var dtxt = deltaTxt(E100[j], E8[j]);
        var nOff = NUM_OFF[p.m] || [12, 4];

        var mk = marks[j];
        mk.g.style.transform = tf;
        mk.g.style.transition = trans;
        mk.ring.setAttribute('r', G.r + 6);
        mk.path.setAttribute('d', shapePath(p.cls, G.r));
        mk.path.setAttribute('fill', f.fill);
        mk.path.setAttribute('stroke', f.stroke);
        mk.path.setAttribute('stroke-width', f.sw);
        mk.g.setAttribute('aria-label', p.m + ', accuracy ' + p.acc.toFixed(2) + ' percent, cost ' + fmtCost(p.cost) + ' per query' +
          (p.completion ? ', completion rate ' + p.completion : '') + ', ' +
          (key === '100k' ? 'expanded budget 100k tokens' : 'normal budget 8k tokens'));

        leaders[j].setAttribute('d', (lead && !G.narrow) ? 'M 0 0 L ' + (dx - 20) + ' ' + (dy - 4) + ' L ' + (dx - 5) + ' ' + (dy - 4) : '');
        leaders[j].style.transform = tf;
        leaders[j].style.transition = trans;

        var nt = notes[j];
        nt.wrap.style.transform = tf;
        nt.wrap.style.transition = trans;
        nt.label.style.cssText = base + 'left:' + (G.narrow ? nOff[0] : dx) + 'px;top:' + (G.narrow ? nOff[1] : dy - 4) + 'px;' +
          'transform:' + anchorTf(G.narrow ? (nOff[0] < 0 ? 'end' : 'start') : anchor) + ';' +
          'font-size:' + (G.narrow ? '11px' : '12.5px') + ';font-weight:500;color:' + INK + ';';
        nt.label.textContent = G.narrow ? String(j + 1) : p.m;
        if (G.narrow) {
          nt.delta.style.cssText = 'display:none;';
          nt.delta.textContent = '';
        } else {
          nt.delta.style.cssText = base + 'left:' + dx + 'px;top:' + ddy + 'px;transform:' + anchorTf(anchor) +
            ';font-size:12px;font-weight:500;color:rgba(23,32,27,0.7);opacity:' + ((key === '100k' && dtxt) ? 1 : 0) + ';transition:opacity 160ms linear;';
          nt.delta.textContent = dtxt;
        }

        var rw = rows[j];
        rw.glyph.setAttribute('d', shapePath(p.cls, 6.2));
        rw.glyph.setAttribute('fill', f.fill);
        rw.glyph.setAttribute('stroke', f.stroke);
        rw.glyph.setAttribute('stroke-width', f.sw);
        rw.name.textContent = p.m;
        rw.stats.textContent = p.acc.toFixed(2) + '% \u00B7 ' + fmtCost(p.cost) + (p.completion ? ' \u00B7 completion ' + p.completion : '');
        rw.delta.textContent = (key === '100k' && dtxt) ? dtxt : '';
      }
      paintActive();
    }

    function measure() {
      var w = Math.round(wrap.getBoundingClientRect().width);
      if (!w || w === st.w) return;
      st.w = w;
      layout();
      render();
    }

    measure();
    if (!st.w) { st.w = 700; layout(); render(); }
    window.addEventListener('resize', measure);
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(measure).observe(wrap);
    if (typeof window.matchMedia === 'function') {
      var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      st.motion = !mq.matches;
      var onMq = function () { st.motion = !mq.matches; render(); };
      if (mq.addEventListener) mq.addEventListener('change', onMq);
      else if (mq.addListener) mq.addListener(onMq);
    }
    render();
  }

  function init() {
    var root = document.getElementById(ID);
    if (root && !root.getAttribute('data-fig-mounted')) {
      root.setAttribute('data-fig-mounted', '1');
      build(root);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
