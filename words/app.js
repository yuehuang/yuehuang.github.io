/* 英语单词卡 · 背 + 默写（纯前端，不收集数据） */
(function () {
  'use strict';
  var MM = 96 / 25.4, SVGNS = 'http://www.w3.org/2000/svg';
  var PAGE_H = 273 * MM;                    // A4 去掉上下页边
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var el = function (t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };

  var cfg = {
    words: '', mode: 'card', cols: 3, rows: 4,
    ipa: 1, syl: 1, zh: 1, en: 1, cn: 1,        // 卡片显示项
    hintZh: 1, hintIpa: 1, hintBlank: 1,        // 默写纸提示
    shuffle: 0, headText: '英语单词卡', footText: ''
  };
  var BOOLK = ['ipa', 'syl', 'zh', 'en', 'cn', 'hintZh', 'hintIpa', 'hintBlank', 'shuffle'];
  var NUMK = ['cols', 'rows'];

  function readURL() {
    var q = new URLSearchParams(location.search);
    if (q.has('words')) cfg.words = q.get('words');
    if (q.has('mode')) cfg.mode = q.get('mode');
    NUMK.forEach(function (k) { if (q.has(k)) { var v = parseInt(q.get(k), 10); if (!isNaN(v)) cfg[k] = v; } });
    BOOLK.forEach(function (k) { if (q.has(k)) cfg[k] = q.get(k) === '0' ? 0 : 1; });
    if (q.has('head')) cfg.headText = q.get('head');
    if (q.has('foot')) cfg.footText = q.get('foot');
  }
  function writeURL() {
    var q = new URLSearchParams();
    q.set('words', cfg.words); q.set('mode', cfg.mode);
    NUMK.concat(BOOLK).forEach(function (k) { q.set(k, cfg[k]); });
    q.set('head', cfg.headText); q.set('foot', cfg.footText);
    history.replaceState(null, '', location.pathname + '?' + q.toString());
  }

  /* ---------- 查词：内置示例词表 → 离线词典 → 联网补音标 ---------- */
  var netCache = {};
  function lookup(w) {
    var k = w.toLowerCase();
    if (window.UNIT1 && window.UNIT1[k]) {
      var u = window.UNIT1[k];
      return Promise.resolve({ w: w, ipa: u.ipa, syl: u.syl, zh: u.zh, en: u.en, cn: u.cn, src: 'unit' });
    }
    var e = window.ENZH && window.ENZH[k];
    if (e) return Promise.resolve({ w: w, ipa: e[0], syl: '', zh: e[1], en: '', cn: '', src: 'dict' });
    if (netCache[k]) return Promise.resolve(netCache[k]);
    return fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(k))
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) {
        var p = (d[0].phonetics || []).filter(function (x) { return x.text; })[0];
        var o = { w: w, ipa: (p && p.text) || '', syl: '', zh: '', en: '', cn: '', src: 'net' };
        netCache[k] = o; return o;
      })
      .catch(function () { var o = { w: w, ipa: '', syl: '', zh: '', en: '', cn: '', src: 'none' }; netCache[k] = o; return o; });
  }
  function parseWords() {
    var out = [];
    cfg.words.split(/[\n,，、;；\t]+/).forEach(function (x) {
      x = x.trim().replace(/[^A-Za-z' \-]/g, '').trim();
      if (!x) return;
      x.split(/\s+/).forEach(function (w) {
        if (w && out.indexOf(w) < 0) out.push(w);
      });
    });
    if (cfg.shuffle) for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)); var t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  /* ---------- 朗读（屏幕用，不打印）---------- */
  function speak(w) {
    if (!('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(w);
      u.lang = 'en-US'; u.rate = 0.8;
      var v = (speechSynthesis.getVoices() || []).filter(function (x) { return /^en/i.test(x.lang); })[0];
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) { }
  }
  function spkBtn(w) {
    var b = el('button', 'spk no-print', '🔊');
    b.title = '朗读 ' + w;
    b.addEventListener('click', function (e) { e.stopPropagation(); speak(w); });
    return b;
  }

  /* ---------- 三种输出 ---------- */
  function cardItem(it) {
    var c = el('div', 'wcard');
    var top = el('div', 'wtop');
    top.appendChild(el('b', 'wword', it.w));
    top.appendChild(spkBtn(it.w));
    c.appendChild(top);
    var l2 = el('div', 'wsub');
    if (cfg.ipa && it.ipa) l2.appendChild(el('span', 'wipa', '/' + it.ipa.replace(/^\/|\/$/g, '') + '/'));
    if (cfg.syl && it.syl) l2.appendChild(el('span', 'wsyl', it.syl));
    if (l2.childNodes.length) c.appendChild(l2);
    if (cfg.zh && it.zh) c.appendChild(el('div', 'wzh', it.zh));
    if (cfg.en && it.en) c.appendChild(el('div', 'wen', it.en));
    if (cfg.cn && it.cn) c.appendChild(el('div', 'wcn', it.cn));
    if (it.src === 'net') c.appendChild(el('div', 'wtip', '音标来自联网'));
    if (it.src === 'none') c.appendChild(el('div', 'wtip', '词典未收录'));
    return c;
  }
  function dictItem(it, i) {
    var b = el('div', 'ditem');
    var head = el('div', 'dhead');
    head.appendChild(el('span', 'dno', String(i + 1)));
    if (cfg.hintZh && it.zh) head.appendChild(el('span', 'dzh', it.zh));
    if (cfg.hintIpa && it.ipa) head.appendChild(el('span', 'dipa', '/' + it.ipa.replace(/^\/|\/$/g, '') + '/'));
    head.appendChild(spkBtn(it.w));
    b.appendChild(head);
    if (it.en) {
      var s = el('div', 'dsen');
      if (cfg.hintBlank && it.en.toLowerCase().indexOf(it.w.toLowerCase()) >= 0) {
        var re = new RegExp('(' + it.w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'i');
        it.en.split(re).forEach(function (p) {
          if (re.test(p) && p.toLowerCase() === it.w.toLowerCase()) s.appendChild(el('u', 'blank', '　　　　'));
          else s.appendChild(document.createTextNode(p));
        });
        if (it.cn) s.appendChild(el('span', 'dcn', '（' + it.cn + '）'));
      } else {
        s.appendChild(document.createTextNode(it.en));
        if (it.cn) s.appendChild(el('span', 'dcn', '（' + it.cn + '）'));
      }
      b.appendChild(s);
    }
    b.appendChild(el('div', 'dline'));
    return b;
  }
  function listRow(it, i) {
    var t = el('tr');
    t.appendChild(el('td', 'c', String(i + 1)));
    t.appendChild(el('td', 'zh', it.zh || ''));
    t.appendChild(el('td', 'en', it.w));
    t.appendChild(el('td', 'ipa', it.ipa ? '/' + it.ipa.replace(/^\/|\/$/g, '') + '/' : ''));
    t.appendChild(el('td', 'sp', ''));
    return t;
  }

  function render() {
    var words = parseWords();
    var stage = $('#preview');
    if (!words.length) { stage.innerHTML = '<p class="empty">请在上面填词表</p>'; $('#count').textContent = ''; return; }
    $('#status').textContent = '正在查词…';
    Promise.all(words.map(lookup)).then(function (items) {
      var pages = [], sheet = null, addSheet = function () {
        sheet = el('div', 'sheet');
        var t = el('div', 'sheettitle');
        t.appendChild(el('h1', '', cfg.headText || '英语单词卡'));
        t.appendChild(el('div', 'sub', '共 ' + items.length + ' 词 · 第 ' + (pages.length + 1) + ' 页 · '
          + ({ card: '单词卡', dictate: '默写纸', list: '听写表' })[cfg.mode]));
        sheet.appendChild(t); pages.push(sheet);
      };
      if (cfg.mode === 'card') {
        var perPage = cfg.cols * cfg.rows;
        for (var i = 0; i < items.length; i++) {
          if (i % perPage === 0) addSheet();
          if (i % perPage === 0) { }
          var grid = sheet.querySelector('.wgrid');
          if (!grid) { grid = el('div', 'wgrid'); grid.style.gridTemplateColumns = 'repeat(' + cfg.cols + ',1fr)'; grid.style.setProperty('--cardh', ((273 - 26 - (cfg.rows - 1) * 3) / cfg.rows).toFixed(1) + 'mm'); sheet.appendChild(grid); }
          grid.appendChild(cardItem(items[i]));
        }
      } else if (cfg.mode === 'dictate') {
        var perD = 8;
        items.forEach(function (it, i) {
          if (i % perD === 0) addSheet();
          sheet.appendChild(dictItem(it, i));
        });
      } else {
        var perL = 16;
        items.forEach(function (it, i) {
          if (i % perL === 0) {
            addSheet();
            var tb = el('table', 'wtable');
            var thead = el('thead'); var tr = el('tr');
            ['#', '中文（家长念）', 'English（答案）', '音标', '孩子写'].forEach(function (h) { tr.appendChild(el('th', '', h)); });
            thead.appendChild(tr); tb.appendChild(thead);
            tb.appendChild(el('tbody')); sheet.appendChild(tb);
            sheet._tb = tb.querySelector('tbody');
          }
          sheet._tb.appendChild(listRow(it, i));
        });
      }
      var wrap = stage;
      wrap.innerHTML = '';
      pages.forEach(function (p) { var w = el('div', 'sheet-wrap'); w.appendChild(p); wrap.appendChild(w); });
      if (cfg.footText) pages.forEach(function (p) { p.appendChild(el('div', 'sheetfoot', cfg.footText)); });
      $('#count').textContent = '共 ' + pages.length + ' 页 · ' + items.length + ' 个词';
      var miss = items.filter(function (x) { return x.src === 'none' || x.src === 'net'; }).length;
      $('#status').textContent = miss ? ('已生成 ' + items.length + ' 个词（' + miss + ' 个不在离线词典，已联网补/待补）') : ('已生成 ' + items.length + ' 个词');
      fit();
    });
  }
  function fit() {
    var s = Math.min(1, ($('#preview').clientWidth - 8) / (210 * MM));
    document.documentElement.style.setProperty('--fit', s);
  }

  /* ---------- 控件 ---------- */
  function syncLabels() {
    NUMK.forEach(function (k) { var v = $('#' + k + 'V'); if (v) v.textContent = cfg[k]; });
    $$('.seg[data-mode]').forEach(function (b) { b.classList.toggle('on', b.dataset.mode === cfg.mode); });
    $$('input[type=checkbox]').forEach(function (n) { if (n.id in cfg) n.checked = !!cfg[n.id]; });
    document.body.dataset.mode = cfg.mode;
  }
  function bind() {
    var ta = $('#words');
    ta.value = cfg.words;
    ta.addEventListener('input', function () { cfg.words = this.value; onChange(); });
    $$('.seg[data-mode]').forEach(function (b) { b.addEventListener('click', function () { cfg.mode = b.dataset.mode; onChange(); }); });
    NUMK.forEach(function (k) { var n = $('#' + k); n.value = cfg[k]; n.addEventListener('input', function () { cfg[k] = parseInt(this.value, 10); onChange(); }); });
    BOOLK.forEach(function (k) { var n = $('#' + k); if (!n) return; n.checked = !!cfg[k]; n.addEventListener('change', function () { cfg[k] = this.checked ? 1 : 0; onChange(); }); });
    $('#headText').value = cfg.headText;
    $('#headText').addEventListener('input', function () { cfg.headText = this.value; onChange(); });
    $('#footText').value = cfg.footText;
    $('#footText').addEventListener('input', function () { cfg.footText = this.value; onChange(); });
    $('#demo').addEventListener('click', function () { cfg.words = DEMO; $('#words').value = DEMO; onChange(); });
    $('#shuffleNow').addEventListener('click', function () { var w = parseWords(); cfg.shuffle = 0; $('#shuffle').checked = false;
      for (var i = w.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = w[i]; w[i] = w[j]; w[j] = t; }
      cfg.words = w.join('\n'); $('#words').value = cfg.words; onChange(); });
    $('#print').addEventListener('click', function () { window.print(); });
    $('#copy').addEventListener('click', function () { var b = this;
      (navigator.clipboard ? navigator.clipboard.writeText(location.href) : Promise.reject())
        .then(function () { b.textContent = '✓ 已复制'; setTimeout(function () { b.textContent = '复制分享链接'; }, 1500); })
        .catch(function () { prompt('复制这个链接：', location.href); }); });
    window.addEventListener('resize', fit);
  }
  var DEMO = (window.UNIT1 ? Object.keys(window.UNIT1) : ['family', 'mother', 'father']).join('\n');
  var t = null;
  function onChange() { writeURL(); syncLabels(); clearTimeout(t); t = setTimeout(render, 150); }

  readURL();
  if (!cfg.words) cfg.words = DEMO;
  bind(); syncLabels(); render();
})();
