/* footnotes.js · CTGT research blog
 * Usage: write [[fn: note text, inline <a> allowed]] inside CMS rich text.
 * Wiring: <script src="https://cdn.jsdelivr.net/gh/ctgt-inc/research-post-assets@<COMMIT>/footnotes.js" defer></script>
 * Targets the first .w-richtext by default; override with data-footnotes-root=".your-class" on the script tag.
 */
(function () {
  var scriptEl = document.currentScript;
  function init() {
    var sel = (scriptEl && scriptEl.getAttribute('data-footnotes-root')) || '.w-richtext';
    var root = document.querySelector(sel);
    if (!root) return;

    var css = ''
      + '.fn-ref{font-size:.72em;vertical-align:super;line-height:0}'
      + '.fn-ref a{text-decoration:none;border-bottom:none;color:rgb(64,92,80);font-weight:500;padding:0 .08em}'
      + '.fn-ref a:focus-visible{outline:2px solid rgb(64,92,80);outline-offset:2px}'
      + '.footnotes{margin-top:56px;padding-top:22px;border-top:1px solid rgba(23,32,27,.10)}'
      + '.footnotes h2{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:rgba(23,32,27,.45);font-weight:500;margin:0 0 14px}'
      + '.footnotes ol{margin:0;padding-left:1.4em}'
      + '.footnotes li{font-size:14px;line-height:1.55;color:rgba(23,32,27,.78);margin-bottom:10px}'
      + '.fn-back{margin-left:.4em;text-decoration:none;border-bottom:none}'
      + '.fn-pop{position:absolute;z-index:60;max-width:340px;background:#fff;border:1px solid rgba(23,32,27,.14);box-shadow:0 6px 24px rgba(23,32,27,.10);padding:12px 14px;font-size:13.5px;line-height:1.5;color:rgba(23,32,27,.85);border-radius:2px}'
      + '@media (min-width:1180px){'
      + ' .fn-margin{position:absolute;width:220px;font-size:12.5px;line-height:1.5;color:rgba(23,32,27,.62)}'
      + ' .fn-margin .fn-num{color:rgb(64,92,80);font-weight:500;margin-right:.35em}'
      + '}';
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // 1) Replace markers inside block elements.
    var notes = [];
    var blocks = root.querySelectorAll('p, li, h2, h3, h4, blockquote, figcaption');
    var re = /\[\[fn:\s*([\s\S]+?)\]\]/g;
    blocks.forEach(function (el) {
      if (!re.test(el.innerHTML)) return;
      el.innerHTML = el.innerHTML.replace(re, function (_, body) {
        var n = notes.length + 1;
        notes.push(body.trim());
        return '<sup class="fn-ref" role="doc-noteref"><a href="#fn-' + n + '" id="fnref-' + n + '" aria-label="Footnote ' + n + '">' + n + '</a></sup>';
      });
    });
    if (!notes.length) return;

    // 2) Endnotes section (semantic base layer; always present).
    var sec = document.createElement('section');
    sec.className = 'footnotes';
    sec.setAttribute('role', 'doc-endnotes');
    sec.innerHTML = '<h2>Notes</h2><ol>' + notes.map(function (t, i) {
      var n = i + 1;
      return '<li id="fn-' + n + '" role="doc-endnote">' + t + ' <a class="fn-back" href="#fnref-' + n + '" aria-label="Back to reference ' + n + '">\u21a9</a></li>';
    }).join('') + '</ol>';
    root.parentNode.insertBefore(sec, root.nextSibling);

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) {
      root.querySelectorAll('.fn-ref a').forEach(function (a) {
        a.addEventListener('click', function (e) {
          var t = document.querySelector(a.getAttribute('href'));
          if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'center' }); history.replaceState(null, '', a.getAttribute('href')); }
        });
      });
    }

    // 3) Hover / tap popover.
    var pop = null;
    function hidePop() { if (pop) { pop.remove(); pop = null; } }
    function showPop(a) {
      hidePop();
      var n = parseInt(a.textContent, 10);
      pop = document.createElement('div');
      pop.className = 'fn-pop';
      pop.setAttribute('role', 'tooltip');
      pop.innerHTML = notes[n - 1];
      document.body.appendChild(pop);
      var r = a.getBoundingClientRect();
      var x = Math.min(r.left + window.scrollX, window.scrollX + document.documentElement.clientWidth - pop.offsetWidth - 16);
      pop.style.left = Math.max(16, x) + 'px';
      pop.style.top = (r.bottom + window.scrollY + 8) + 'px';
    }
    root.querySelectorAll('.fn-ref a').forEach(function (a) {
      a.addEventListener('mouseenter', function () { if (window.innerWidth >= 700) showPop(a); });
      a.addEventListener('mouseleave', hidePop);
      a.addEventListener('focus', function () { showPop(a); });
      a.addEventListener('blur', hidePop);
    });
    document.addEventListener('touchstart', function (e) { if (pop && !pop.contains(e.target) && !e.target.closest('.fn-ref')) hidePop(); });

    // 4) Margin notes on wide viewports (TML-style), endnotes remain for print/anchor targets.
    function layoutMargin() {
      document.querySelectorAll('.fn-margin').forEach(function (m) { m.remove(); });
      if (window.innerWidth < 1180) return;
      var host = root.parentNode;
      if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
      var hostRect = host.getBoundingClientRect();
      var lastBottom = -1e9;
      root.querySelectorAll('.fn-ref a').forEach(function (a) {
        var n = parseInt(a.textContent, 10);
        var m = document.createElement('aside');
        m.className = 'fn-margin';
        m.innerHTML = '<span class="fn-num">' + n + '</span>' + notes[n - 1];
        host.appendChild(m);
        var r = a.getBoundingClientRect();
        var top = r.top - hostRect.top;
        if (top < lastBottom + 12) top = lastBottom + 12;
        m.style.top = top + 'px';
        m.style.left = (root.getBoundingClientRect().right - hostRect.left + 36) + 'px';
        lastBottom = top + m.offsetHeight;
      });
    }
    layoutMargin();
    var t;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(layoutMargin, 150); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutMargin);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
