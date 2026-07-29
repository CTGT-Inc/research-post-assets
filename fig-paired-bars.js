/*  CTGT — FIG-2 · sensitive vs control paired bars
 *  Self-contained. Vanilla JS, inline SVG/CSS. No deps, no network, no fonts.
 *  Mounts into <div id="fig-paired-bars"></div> automatically on load.
 *  Programmatic: window.CTGTFigPairedBars.render(el, opts)
 *  opts = { accent, showSampleSizes, highlightTeacher, showTitle }
 */
(function () {
  'use strict';

  /* ---- DATA — verbatim, never re-derived ------------------------------- */
  var DATA = {"rows":[
    {"model":"DeepSeek V4 Flash (teacher)","sensitive":57.39,"control":25.37,"n_s":152,"n_c":152},
    {"model":"GPT-OSS-120B base","sensitive":22.68,"control":18.76,"n_s":151,"n_c":151},
    {"model":"CTGT 120B (self-distilled)","sensitive":22.36,"control":18.75,"n_s":152,"n_c":150},
    {"model":"CTGT 120B (Flash-taught)","sensitive":21.67,"control":19.10,"n_s":150,"n_c":151},
    {"model":"GPT-OSS-20B base","sensitive":34.75,"control":32.38,"n_s":104,"n_c":105},
    {"model":"CTGT 20B (self-distilled)","sensitive":33.61,"control":33.61,"n_s":109,"n_c":111}
  ]};

  var CAPTION = "Mean response-level censorship, pooled political + finance-adjacent set, after exclusion of mechanically invalid generations. Sensitive and control columns are marginal means over valid responses; pairwise matched gaps (reported in the text) can differ from the column difference where exclusions are asymmetric.";
  var SUBNOTE = "20B rows rest on a reduced sample; see the degeneracy audit.";
  var TITLE = "Sensitive vs. control censorship rate, by model";

  /* ---- TOKENS (CTGT design system) ------------------------------------- */
  var INK = 'rgb(23,32,27)';
  var BODY = 'rgba(23,32,27,0.70)';
  var MUTE = 'rgba(23,32,27,0.70)';
  var HAIR = 'rgba(23,32,27,0.10)';
  var RULE = 'rgba(23,32,27,0.24)';
  var BONE = 'rgb(247,246,240)';
  var CTRL_FILL = 'rgba(23,32,27,0.14)';
  var CTRL_STROKE = 'rgba(23,32,27,0.36)';
  var ACCENT = 'rgb(64,92,80)';
  var FOCUS = 'rgb(95,144,136)';

  var STYLE_ID = 'ctgt-fig2-style';
  var CSS = [
    '.ctgtf2{position:relative;margin:0;font-family:inherit;color:' + INK + ';-webkit-font-smoothing:antialiased}',
    '.ctgtf2 *{box-sizing:border-box}',
    '.ctgtf2 svg{display:block;overflow:visible;max-width:none}',
    '.ctgtf2-row{outline:none}',
    '.ctgtf2-hl{opacity:0;transition:opacity 150ms cubic-bezier(.4,0,.2,1)}',
    '.ctgtf2-row:hover .ctgtf2-hl,.ctgtf2-row:focus .ctgtf2-hl{opacity:1}',
    '.ctgtf2-ring{opacity:0;fill:none;stroke:' + FOCUS + ';stroke-width:2}',
    '.ctgtf2-row:focus .ctgtf2-ring{opacity:1}',
    '.ctgtf2-row:focus:not(:focus-visible) .ctgtf2-ring{opacity:0}',
    '.ctgtf2-sr{position:absolute;left:0;top:0;width:1px;height:1px;min-width:0;margin:-1px;' +
      'padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}',
    '.ctgtf2-sr table{table-layout:fixed;width:1px;min-width:0}',
    '@media (prefers-reduced-motion: reduce){.ctgtf2-hl{transition:none}}'
  ].join('');

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  /* ---- helpers ---------------------------------------------------------- */
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fmt(v) { return v.toFixed(2); }
  function isTeacher(m) { return /\(teacher\)/i.test(m); }
  function is20B(m) { return /\b20B\b/.test(m); }

  var NUM = 'font-variant-numeric:tabular-nums;font-feature-settings:\'tnum\' 1';

  function txt(x, y, str, style, anchor) {
    return '<text x="' + x + '" y="' + y + '"' +
      (anchor ? ' text-anchor="' + anchor + '"' : '') +
      ' style="' + style + '">' + str + '</text>';
  }

  /* ---- chart ----------------------------------------------------------- */
  function chartSVG(rows, W, o) {
    var wide = W >= 640;
    var barH = wide ? 15 : 14;
    var barGap = wide ? 9 : 8;
    var rowH = wide ? 62 : 88;
    var labelW = wide ? Math.round(Math.max(196, Math.min(262, W * 0.30))) : 0;
    var x0 = wide ? labelW + 38 : 20;
    var x1 = W - (wide ? 52 : 48);
    var plotW = Math.max(60, x1 - x0);
    var top = 12;
    var chartH = rows.length * rowH;
    var axisH = 32;
    var H = top + chartH + axisH;
    var block = barH * 2 + barGap;
    var sx = function (v) { return x0 + (v / 100) * plotW; };

    var fLabel = wide ? 13.5 : 12.5;
    var sLabel = 'font-size:' + fLabel + 'px;font-weight:400;letter-spacing:-0.005em;fill:' + INK;
    var sLabelT = 'font-size:' + fLabel + 'px;font-weight:500;letter-spacing:-0.005em;fill:' + INK;
    var sN = 'font-size:10px;font-weight:400;letter-spacing:0.01em;fill:' + MUTE + ';' + NUM;
    var sSC = 'font-size:9.5px;font-weight:500;letter-spacing:0.10em;fill:' + MUTE;
    var sVal = 'font-size:' + (wide ? 13 : 12) + 'px;font-weight:500;letter-spacing:-0.01em;fill:' + INK + ';' + NUM;
    var sValC = 'font-size:' + (wide ? 13 : 12) + 'px;font-weight:400;letter-spacing:-0.01em;fill:' + BODY + ';' + NUM;
    var sTick = 'font-size:10.5px;font-weight:400;letter-spacing:0.02em;fill:' + MUTE + ';' + NUM;

    var p = [];
    p.push('<svg width="100%" height="' + H + '" viewBox="0 0 ' + W + ' ' + H +
      '" preserveAspectRatio="xMinYMin meet" role="img" aria-labelledby="ctgtf2-t ctgtf2-d" ' +
      'style="font-family:inherit">');
    p.push('<title id="ctgtf2-t">' + esc(TITLE) + '</title>');
    p.push('<desc id="ctgtf2-d">Paired horizontal bars. Only the teacher model, DeepSeek V4 Flash, ' +
      'separates its sensitive and control rates; the five open-weight rows sit near parity.</desc>');

    /* teacher band, behind gridlines */
    if (o.highlightTeacher) {
      rows.forEach(function (r, i) {
        if (!isTeacher(r.model)) return;
        var y = top + i * rowH;
        p.push('<rect x="0" y="' + y + '" width="' + W + '" height="' + rowH + '" fill="' + BONE + '"/>');
        p.push('<line x1="0" y1="' + y + '" x2="' + W + '" y2="' + y + '" stroke="' + RULE + '" stroke-width="1"/>');
        p.push('<line x1="0" y1="' + (y + rowH) + '" x2="' + W + '" y2="' + (y + rowH) +
          '" stroke="' + RULE + '" stroke-width="1"/>');
      });
    }

    /* gridlines — full height on wide; on narrow the label lane sits inside the
       plot band, so they are clipped to each row's bar block instead. */
    var barTopOf = function (i) {
      var y = top + i * rowH;
      return wide ? y + Math.round((rowH - block) / 2) : y + 40;
    };
    [0, 25, 50, 75, 100].forEach(function (t) {
      var x = Math.round(sx(t)) + 0.5;
      var stroke = t === 0 ? RULE : HAIR;
      if (wide) {
        p.push('<line x1="' + x + '" y1="' + top + '" x2="' + x + '" y2="' + (top + chartH) +
          '" stroke="' + stroke + '" stroke-width="1"/>');
      } else {
        rows.forEach(function (r, i) {
          p.push('<line x1="' + x + '" y1="' + (barTopOf(i) - 5) + '" x2="' + x + '" y2="' +
            (barTopOf(i) + block + 5) + '" stroke="' + stroke + '" stroke-width="1"/>');
        });
      }
    });

    /* rows */
    rows.forEach(function (r, i) {
      var y = top + i * rowH;
      var teacher = isTeacher(r.model);
      var barTop = barTopOf(i);
      var yS = barTop, yC = barTop + barH + barGap;
      var label = esc(r.model) + (is20B(r.model) ? '<tspan style="fill:' + MUTE + '">\u2009†</tspan>' : '');
      var nStr = 'n ' + r.n_s + ' / ' + r.n_c;

      p.push('<g class="ctgtf2-row" tabindex="0" role="img" aria-label="' +
        esc(r.model + '. Sensitive ' + fmt(r.sensitive) + ' percent, n ' + r.n_s +
          '. Control ' + fmt(r.control) + ' percent, n ' + r.n_c + '.') + '">');
      p.push('<rect class="ctgtf2-hl" x="0" y="' + y + '" width="' + W + '" height="' + rowH +
        '" fill="rgba(23,32,27,0.05)"/>');

      if (wide) {
        p.push(txt(labelW, y + 28, label, teacher ? sLabelT : sLabel, 'end'));
        if (o.showSampleSizes) p.push(txt(labelW, y + 42, nStr, sN, 'end'));
      } else {
        p.push(txt(0, y + 15, label, teacher ? sLabelT : sLabel));
        if (o.showSampleSizes) p.push(txt(0, y + 30, nStr, sN));
      }

      /* S / C row keys */
      p.push(txt(x0 - 8, yS + barH / 2 + 3.5, 'S', sSC, 'end'));
      p.push(txt(x0 - 8, yC + barH / 2 + 3.5, 'C', sSC, 'end'));

      /* sensitive — solid */
      var wS = Math.max(1, sx(r.sensitive) - x0);
      p.push('<rect x="' + x0 + '" y="' + yS + '" width="' + wS + '" height="' + barH + '" fill="' + INK + '"/>');
      p.push(txt(x0 + wS + 9, yS + barH / 2 + 4.5, fmt(r.sensitive), sVal));

      /* control — hairline outline */
      var wC = Math.max(1, sx(r.control) - x0);
      p.push('<rect x="' + (x0 + 0.5) + '" y="' + (yC + 0.5) + '" width="' + wC + '" height="' + (barH - 1) +
        '" fill="' + CTRL_FILL + '" stroke="' + CTRL_STROKE + '" stroke-width="1"/>');
      p.push(txt(x0 + wC + 9, yC + barH / 2 + 4.5, fmt(r.control), sValC));

      p.push('<rect class="ctgtf2-ring" x="1" y="' + (y + 1) + '" width="' + (W - 2) + '" height="' + (rowH - 2) + '"/>');
      p.push('</g>');
    });

    /* axis */
    var ay = top + chartH;
    p.push('<line x1="' + x0 + '" y1="' + (ay + 0.5) + '" x2="' + x1 + '" y2="' + (ay + 0.5) +
      '" stroke="' + HAIR + '" stroke-width="1"/>');
    [0, 25, 50, 75, 100].forEach(function (t) {
      p.push('<line x1="' + (Math.round(sx(t)) + 0.5) + '" y1="' + ay + '" x2="' + (Math.round(sx(t)) + 0.5) +
        '" y2="' + (ay + 4) + '" stroke="' + RULE + '" stroke-width="1"/>');
      p.push(txt(sx(t), ay + 17, t === 100 ? '100%' : String(t), sTick, t === 0 ? 'start' : (t === 100 ? 'end' : 'middle')));
    });
    p.push('</svg>');
    return p.join('');
  }

  /* ---- surrounding figure furniture ------------------------------------ */
  function swatch(kind) {
    var base = 'display:inline-block;width:20px;height:9px;flex:none;';
    return kind === 'solid'
      ? '<span style="' + base + 'background:' + INK + '"></span>'
      : '<span style="' + base + 'background:' + CTRL_FILL + ';box-shadow:inset 0 0 0 1px ' + CTRL_STROKE + '"></span>';
  }

  function legend(o) {
    var key = 'font-size:11.5px;font-weight:500;letter-spacing:0.10em;color:' + MUTE + ';';
    var word = 'font-size:12px;font-weight:500;letter-spacing:0.01em;color:' + o.accent + ';';
    var word2 = 'font-size:12px;font-weight:400;letter-spacing:0.01em;color:' + BODY + ';';
    var item = 'display:inline-flex;align-items:center;gap:8px;';
    return '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px 24px;padding:0 0 14px;">' +
      '<span style="' + item + '">' + swatch('solid') +
        '<span style="' + key + '">S</span><span style="' + word + '">sensitive</span>' +
        '<span style="' + word2 + '">set</span></span>' +
      '<span style="' + item + '">' + swatch('outline') +
        '<span style="' + key + '">C</span><span style="' + word2 + '">control set</span></span>' +
      (o.showSampleSizes
        ? '<span style="font-size:11px;font-weight:400;letter-spacing:0.01em;color:' + MUTE +
          ';margin-left:auto">n = sensitive / control</span>'
        : '') +
      '</div>';
  }

  function srTable(rows) {
    var h = '<div class="ctgtf2-sr"><table><caption>' + esc(TITLE) + '</caption><thead><tr>' +
      '<th scope="col">Model</th><th scope="col">Sensitive, mean percent censored</th>' +
      '<th scope="col">Sensitive n</th><th scope="col">Control, mean percent censored</th>' +
      '<th scope="col">Control n</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      h += '<tr><th scope="row">' + esc(r.model) + '</th><td>' + fmt(r.sensitive) + '</td><td>' + r.n_s +
        '</td><td>' + fmt(r.control) + '</td><td>' + r.n_c + '</td></tr>';
    });
    return h + '</tbody></table></div>';
  }

  /* ---- render ---------------------------------------------------------- */
  function render(el, opts) {
    if (!el) return;
    injectStyle();
    var o = {
      accent: (opts && opts.accent) || ACCENT,
      showSampleSizes: !opts || opts.showSampleSizes !== false,
      highlightTeacher: !opts || opts.highlightTeacher !== false,
      showTitle: !opts || opts.showTitle !== false
    };
    var rows = DATA.rows;

    function paint() {
      var W = Math.max(300, Math.round(el.clientWidth || el.getBoundingClientRect().width || 720));
      el.__ctgtf2W = W;
      var head = o.showTitle
        ? '<div style="font-size:10.5px;font-weight:500;letter-spacing:0.11em;text-transform:uppercase;' +
            'color:' + MUTE + ';padding-bottom:8px">Fig. 2</div>' +
          '<div style="font-size:' + (W >= 640 ? 16 : 15) + 'px;font-weight:500;line-height:1.25;' +
            'letter-spacing:-0.015em;color:' + INK + ';padding-bottom:14px;max-width:38em;' +
            'text-wrap:pretty">' + esc(TITLE) + '</div>'
        : '';
      el.innerHTML =
        '<figure class="ctgtf2" style="border-top:1px solid ' + RULE + ';padding-top:16px">' +
          head + legend(o) +
          '<div>' + chartSVG(rows, W, o) + '</div>' +
          '<figcaption style="border-top:1px solid ' + HAIR + ';margin-top:18px;padding-top:12px;' +
            'display:flex;flex-direction:column;gap:8px">' +
            '<p style="margin:0;font-size:12.5px;font-weight:300;line-height:1.5;letter-spacing:0.002em;' +
              'color:' + BODY + ';text-wrap:pretty">' + esc(CAPTION) + '</p>' +
            '<p style="margin:0;font-size:11.5px;font-weight:400;line-height:1.5;color:' + MUTE +
              ';text-wrap:pretty"><span style="' + NUM + '">†</span>&nbsp;' + esc(SUBNOTE) + '</p>' +
          '</figcaption>' +
          srTable(rows) +
        '</figure>';
      wireKeys(el);
    }

    paint();

    if (typeof ResizeObserver === 'function') {
      if (el.__ctgtf2RO) el.__ctgtf2RO.disconnect();
      var timer = 0;
      el.__ctgtf2RO = new ResizeObserver(function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          timer = 0;
          var W = Math.max(300, Math.round(el.clientWidth || 720));
          if (Math.abs(W - (el.__ctgtf2W || 0)) > 3) paint();
        }, 60);
      });
      el.__ctgtf2RO.observe(el);
    } else {
      window.addEventListener('resize', function () {
        var W = Math.max(300, Math.round(el.clientWidth || 720));
        if (Math.abs(W - (el.__ctgtf2W || 0)) > 3) paint();
      });
    }
  }

  function wireKeys(el) {
    var groups = [].slice.call(el.querySelectorAll('.ctgtf2-row'));
    el.addEventListener('keydown', function (e) {
      var i = groups.indexOf(document.activeElement);
      if (i < 0) return;
      var next = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = groups[Math.min(groups.length - 1, i + 1)];
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = groups[Math.max(0, i - 1)];
      else if (e.key === 'Home') next = groups[0];
      else if (e.key === 'End') next = groups[groups.length - 1];
      if (next) { e.preventDefault(); next.focus(); }
    });
  }

  function boot() {
    var el = document.getElementById('fig-paired-bars');
    if (el) render(el);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.CTGTFigPairedBars = { render: render, DATA: DATA, CAPTION: CAPTION, SUBNOTE: SUBNOTE };
})();
