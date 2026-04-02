// Pinpoint v4.3 — 防重复注入 + 自适应输入框
(function() {
  'use strict';

  // 防止重复注入（多扩展或多次 executeScript）
  if (window.__pinpoint_loaded__) return;
  window.__pinpoint_loaded__ = true;

  const state = {
    isOpen: false,
    isPicking: false,
    messages: [],
    currentRefs: [],
    hoverEl: null
  };

  // ===================== INIT =====================

  function initComposer() {
    if (document.getElementById('oc-sidebar')) return;

    const el = document.createElement('div');
    el.id = 'oc-sidebar';
    el.className = 'oc-hidden oc-wrapper';
    el.innerHTML = `
      <button id="oc-collapse" class="oc-collapse-btn" title="收起面板 (C)">▶</button>
      <div class="oc-header">
        <span class="oc-logo">Pinpoint</span>
        <button id="oc-close" class="oc-close-btn" title="复制并关闭">复制并关闭 ✕</button>
      </div>
      <div class="oc-history" id="oc-history">
        <div class="oc-empty">
          ✨ 开始你的标注之旅！<br><br>
          👆 点击页面元素，引用到下方输入框<br>
          ✏️ 写下你的修改意见<br>
          📋 一键复制，发给 AI 执行
        </div>
      </div>
      <div class="oc-composer">
        <div class="oc-toolbar">
          <button class="oc-pick-btn" id="oc-pick">🎯 选取元素</button>
          <button class="oc-send-btn" id="oc-send">✅ 提交任务</button>
        </div>
        <div class="oc-input-wrap">
          <textarea id="oc-input" placeholder="✏️ 写下修改意见，例：把 @[按钮] 移到 @[顶栏] 里"></textarea>
        </div>
        <button class="oc-copy-all" id="oc-copy-all" disabled>📋 复制所有任务</button>
      </div>
      <div class="oc-shortcuts">
        <div class="oc-shortcuts-title">⌨️ 快捷键</div>
        <div class="oc-shortcuts-grid">
          <kbd>P</kbd><span>🎯 选取</span>
          <kbd>S</kbd><span>🛑 停止</span>
          <kbd>A</kbd><span>✅ 提交</span>
          <kbd>C</kbd><span>👈 收起</span>
          <kbd>E</kbd><span>👉 展开</span>
          <kbd>Esc</kbd><span>📋 复制并退出</span>
        </div>
      </div>
    `;
    document.body.appendChild(el);

    // Expand button
    if (!document.getElementById('oc-expand')) {
      var expandBtn = document.createElement('button');
      expandBtn.id = 'oc-expand';
      expandBtn.className = 'oc-expand-btn oc-hidden';
      expandBtn.textContent = '◀';
      expandBtn.title = '展开面板 (E)';
      document.body.appendChild(expandBtn);
      expandBtn.addEventListener('click', expandSidebar);
    }

    document.getElementById('oc-close').addEventListener('click', copyAndClose);
    document.getElementById('oc-collapse').addEventListener('click', collapseSidebar);
    document.getElementById('oc-pick').addEventListener('click', togglePick);
    document.getElementById('oc-send').addEventListener('click', commitMsg);
    document.getElementById('oc-copy-all').addEventListener('click', copyAll);
    var ocInput = document.getElementById('oc-input');
    ocInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitMsg(); }
    });
    // 自适应高度
    ocInput.addEventListener('input', function() { autoResize(ocInput); });
    setupRefDeletion(ocInput);
  }

  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }

  // ===================== OPEN / CLOSE =====================

  function open() {
    initComposer();
    state.isOpen = true;
    state.isPicking = true;
    document.getElementById('oc-sidebar').classList.remove('oc-hidden');
    syncPickUI();
  }

  async function copyAndClose() {
    // 有任务时先复制
    if (state.messages.length > 0) {
      await copyAll();
    }
    close();
  }

  function close() {
    state.isOpen = false;
    state.isPicking = false;
    document.getElementById('oc-sidebar').classList.add('oc-hidden');
    // 同时隐藏展开按钮
    var expandBtn = document.getElementById('oc-expand');
    if (expandBtn) expandBtn.classList.add('oc-hidden');
    syncPickUI();
    document.body.style.cursor = '';
    clearHover();
    clearBadges();
  }

  function collapseSidebar() {
    document.getElementById('oc-sidebar').classList.add('oc-collapsed');
    document.getElementById('oc-expand').classList.remove('oc-hidden');
  }

  function expandSidebar() {
    document.getElementById('oc-sidebar').classList.remove('oc-collapsed');
    document.getElementById('oc-expand').classList.add('oc-hidden');
  }

  // ===================== PICK MODE =====================

  function togglePick() {
    state.isPicking = !state.isPicking;
    syncPickUI();
  }

  function syncPickUI() {
    var btn = document.getElementById('oc-pick');
    if (!btn) return;
    if (state.isPicking) {
      btn.classList.add('oc-picking');
      btn.textContent = '🛑 停止选取';
      document.body.style.cursor = 'crosshair';
    } else {
      btn.classList.remove('oc-picking');
      btn.textContent = '🎯 选取元素';
      document.body.style.cursor = '';
      clearHover();
    }
  }

  // ===================== PAGE EVENTS =====================

  // Resolve click/hover target to a meaningful element
  // Bubbles up from SVG internals, empty spans, etc.
  function resolveTarget(el) {
    // SVG 内部元素 -> 找最近的 HTML 父级
    var svgTags = ['path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'g', 'use', 'tspan', 'defs', 'clippath'];
    var tag = el.tagName ? el.tagName.toLowerCase() : '';
    // 只对 SVG 内部子元素冒泡，保留 <svg> 本身和所有 HTML 元素
    if (svgTags.indexOf(tag) !== -1) {
      while (el && svgTags.indexOf(el.tagName.toLowerCase()) !== -1) {
        el = el.parentElement;
      }
    }
    return el || document.body;
  }

  document.addEventListener('mouseover', function(e) {
    if (!state.isPicking) return;
    if (e.target.closest('#oc-sidebar') || e.target.closest('#oc-expand')) return;
    var target = resolveTarget(e.target);
    if (state.hoverEl && state.hoverEl !== target) state.hoverEl.classList.remove('oc-hover');
    state.hoverEl = target;
    state.hoverEl.classList.add('oc-hover');
  }, true);

  document.addEventListener('mouseout', function(e) {
    if (!state.isPicking) return;
    if (e.target) e.target.classList.remove('oc-hover');
    if (state.hoverEl) state.hoverEl.classList.remove('oc-hover');
  }, true);

  document.addEventListener('click', function(e) {
    if (!state.isPicking) return;
    if (e.target.closest('#oc-sidebar') || e.target.closest('#oc-expand')) return;
    e.preventDefault();
    e.stopPropagation();
    insertRef(resolveTarget(e.target));
  }, true);

  document.addEventListener('keydown', function(e) {
    var tag = e.target.tagName.toLowerCase();
    var isTyping = (tag === 'textarea' || tag === 'input' || e.target.isContentEditable);

    // Esc = 复制并退出（仅在非输入状态生效）
    if (e.key === 'Escape' && state.isOpen && !isTyping) { e.preventDefault(); copyAndClose(); return; }
    if (isTyping) return;

    if (e.key === 'p' && !state.isPicking && state.isOpen) { e.preventDefault(); state.isPicking = true; syncPickUI(); }
    if (e.key === 's' && state.isPicking) { e.preventDefault(); state.isPicking = false; syncPickUI(); }
    if (e.key === 'a' && state.isOpen) { e.preventDefault(); commitMsg(); }
    if (e.key === 'c' && state.isOpen) { e.preventDefault(); collapseSidebar(); }
    if (e.key === 'e' && state.isOpen) { e.preventDefault(); expandSidebar(); }
  });

  // ===================== REFS =====================

  function insertRef(el) {
    var refId = state.currentRefs.length + 1;
    var tag = el.tagName.toLowerCase();
    if (el.id) tag += '#' + el.id;
    else if (el.className && typeof el.className === 'string') {
      var c = el.className.split(' ')[0];
      if (c && c.indexOf('oc-') !== 0) tag += '.' + c;
    }

    var ref = {
      id: refId,
      uiLabel: '@[' + tag + ']',
      selector: buildSelector(el),
      text: el.innerText.substring(0, 50).replace(/\n/g, ' ').trim(),
      html: el.outerHTML.substring(0, 400) + '...',
      source: getSource(el)
    };
    state.currentRefs.push(ref);

    var input = document.getElementById('oc-input');
    var s = input.selectionStart;
    var e = input.selectionEnd;
    var v = input.value;
    var prefix = (s > 0 && v[s - 1] !== ' ' && v[s - 1] !== '\n') ? ' ' : '';
    var ins = prefix + ref.uiLabel + ' ';
    input.value = v.substring(0, s) + ins + v.substring(e);
    input.selectionStart = input.selectionEnd = s + ins.length;
    input.focus();
    autoResize(input);

    var badgeId = addBadge(el, ref.uiLabel);
    ref.badgeId = badgeId;

    // Sync: clean up refs that were overwritten by this insertion
    syncRefsWithText(input.value);
  }

  // Find @[...] token around cursor position
  function findRefTokenAtCursor(value, pos) {
    // Search backwards from cursor for @[
    var searchStart = Math.max(0, pos - 60); // reasonable max tag length
    var before = value.substring(searchStart, pos);
    var bracketOpen = before.lastIndexOf('@[');
    if (bracketOpen === -1) return null;

    var absStart = searchStart + bracketOpen;
    // Find closing ]
    var closeBracket = value.indexOf(']', absStart + 2);
    if (closeBracket === -1) return null;
    var absEnd = closeBracket + 1;

    // Cursor must be right at the end (or inside) the token
    if (pos < absStart || pos > absEnd + 1) return null; // +1 for trailing space

    var token = value.substring(absStart, absEnd);
    // Include trailing space if present
    var endWithSpace = absEnd;
    if (value[absEnd] === ' ') endWithSpace = absEnd + 1;

    return { token: token, start: absStart, end: endWithSpace };
  }

  // Remove ref from currentRefs by uiLabel and clear only its badge
  function removeRefByLabel(label) {
    var idx = -1;
    for (var i = 0; i < state.currentRefs.length; i++) {
      if (state.currentRefs[i].uiLabel === label) { idx = i; break; }
    }
    if (idx === -1) return;

    var removed = state.currentRefs.splice(idx, 1)[0];

    // Use badgeId to precisely remove the badge and element highlight
    if (removed.badgeId) {
      var badge = document.querySelector('.oc-badge[data-ref-id="' + removed.badgeId + '"]');
      if (badge) badge.remove();
      var refEl = document.querySelector('[data-ref-id="' + removed.badgeId + '"]');
      if (refEl) {
        refEl.classList.remove('oc-ref');
        refEl.removeAttribute('data-ref-id');
      }
    }
  }

  // Setup textarea handlers for ref token deletion
  function setupRefDeletion(input) {
    // Method 1: Backspace/Delete on single token — select first, delete second
    input.addEventListener('keydown', function(e) {
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;

      var v = input.value;
      var s = input.selectionStart;
      var selEnd = input.selectionEnd;

      // Has selection — let default delete happen, sync after
      if (s !== selEnd) return;

      // No selection: check if cursor is next to a ref token
      var token;
      if (e.key === 'Backspace') {
        token = findRefTokenAtCursor(v, s);
      } else {
        token = findRefTokenAtCursor(v, s + 1);
      }

      if (token) {
        e.preventDefault();
        // First press: select the token
        input.selectionStart = token.start;
        input.selectionEnd = token.end;
        // Next press will delete the selection normally, then syncRefs picks it up
      }
    });

    // Method 2: After ANY content change, sync refs with actual text
    input.addEventListener('input', function() {
      syncRefsWithText(input.value);
    });
  }

  // Remove any currentRefs whose uiLabel count in text < count in refs
  function syncRefsWithText(text) {
    // Count occurrences of each uiLabel in text
    function countInText(label) {
      var count = 0;
      var pos = 0;
      while ((pos = text.indexOf(label, pos)) !== -1) { count++; pos += label.length; }
      return count;
    }

    // Count how many refs use each label
    var labelCounts = {};
    state.currentRefs.forEach(function(r) {
      labelCounts[r.uiLabel] = (labelCounts[r.uiLabel] || 0) + 1;
    });

    // For each label, if text has fewer than refs, remove excess (from the end)
    var removed = [];
    Object.keys(labelCounts).forEach(function(label) {
      var inText = countInText(label);
      var inRefs = labelCounts[label];
      if (inText < inRefs) {
        // Remove (inRefs - inText) refs from the end
        var toRemove = inRefs - inText;
        for (var i = state.currentRefs.length - 1; i >= 0 && toRemove > 0; i--) {
          if (state.currentRefs[i].uiLabel === label) {
            removed.push(state.currentRefs.splice(i, 1)[0]);
            toRemove--;
          }
        }
      }
    });

    // Clean up badges for removed refs
    removed.forEach(function(r) {
      if (r.badgeId) {
        var badge = document.querySelector('.oc-badge[data-ref-id="' + r.badgeId + '"]');
        if (badge) badge.remove();
        var refEl = document.querySelector('[data-ref-id="' + r.badgeId + '"]');
        if (refEl) {
          refEl.classList.remove('oc-ref');
          refEl.removeAttribute('data-ref-id');
        }
      }
    });
  }

  // ===================== MESSAGES =====================

  function commitMsg() {
    var input = document.getElementById('oc-input');
    var text = input.value.trim();
    if (!text) return;

    state.messages.push({
      id: Date.now(),
      text: text,
      refs: state.currentRefs.slice()
    });

    input.value = '';
    state.currentRefs = [];
    render();
    clearBadges();
  }

  // ===================== RENDER =====================

  function render() {
    var hist = document.getElementById('oc-history');
    var copyBtn = document.getElementById('oc-copy-all');

    if (state.messages.length === 0) {
      hist.innerHTML = '<div class="oc-empty">✨ 开始你的标注之旅！<br><br>👆 点击页面元素<br>✏️ 写下修改意见<br>📋 复制发给 AI</div>';
      copyBtn.textContent = '📋 复制所有任务';
      copyBtn.disabled = true;
      return;
    }

    copyBtn.disabled = false;
    copyBtn.textContent = '📋 复制全部 ' + state.messages.length + ' 条任务';

    hist.innerHTML = state.messages.map(function(msg) {
      var html = esc(msg.text);
      var placeholders = [];
      msg.refs.forEach(function(r, i) {
        var ph = '___REF_' + i + '___';
        html = html.replace(r.uiLabel, ph);
        placeholders.push({ ph: ph, html: '<span class="oc-tag" title="' + r.selector + '">' + r.uiLabel + '</span>' });
      });
      placeholders.forEach(function(p) { html = html.replace(p.ph, p.html); });

      return '<div class="oc-bubble" data-id="' + msg.id + '">' +
        '<div class="oc-bubble-text">' + html + '</div>' +
        '<div class="oc-bubble-meta">' +
          '<span>' + (msg.refs.length > 0 ? '🔗 ' + msg.refs.length + ' 个引用' : '💬 纯文本') + '</span>' +
          '<span class="oc-bubble-actions">' +
            '<button class="oc-btn-copy" data-id="' + msg.id + '" title="复制此条">📋</button>' +
            '<button class="oc-btn-del" data-id="' + msg.id + '" title="删除">🗑️</button>' +
          '</span>' +
        '</div>' +
      '</div>';
    }).join('');

    hist.querySelectorAll('.oc-btn-copy').forEach(function(btn) {
      btn.addEventListener('click', function() { copySingle(Number(btn.dataset.id)); });
    });
    hist.querySelectorAll('.oc-btn-del').forEach(function(btn) {
      btn.addEventListener('click', function() { confirmDelete(Number(btn.dataset.id)); });
    });

    hist.scrollTop = hist.scrollHeight;
  }

  // ===================== DELETE =====================

  function confirmDelete(id) {
    var old = document.getElementById('oc-confirm');
    if (old) old.remove();

    var bubble = document.querySelector('.oc-bubble[data-id="' + id + '"]');
    if (!bubble) return;

    var modal = document.createElement('div');
    modal.id = 'oc-confirm';
    modal.innerHTML = '<div class="oc-confirm-box"><p>🗑️ 确认删除该任务？</p>' +
      '<div class="oc-confirm-btns"><button class="oc-no">取消</button><button class="oc-yes">删除</button></div></div>';

    bubble.style.position = 'relative';
    bubble.appendChild(modal);

    modal.querySelector('.oc-no').addEventListener('click', function(e) {
      e.stopPropagation(); modal.remove();
    });
    modal.querySelector('.oc-yes').addEventListener('click', function(e) {
      e.stopPropagation(); modal.remove(); doDelete(id);
    });
  }

  function doDelete(id) {
    state.messages = state.messages.filter(function(m) { return m.id !== id; });
    render();
    clearBadges();
    refreshBadges();
  }

  // ===================== COPY =====================

  function copySingle(id) {
    var msg = state.messages.find(function(m) { return m.id === id; });
    if (!msg) return;
    navigator.clipboard.writeText(fmtMsg(msg, 1)).then(function() {
      var btn = document.querySelector('.oc-btn-copy[data-id="' + id + '"]');
      if (btn) { btn.textContent = '✅'; setTimeout(function() { btn.textContent = '📋'; }, 1000); }
    });
  }

  function copyAll() {
    if (state.messages.length === 0) return Promise.resolve();
    var out = '# Pinpoint UI Tasks\n\n' +
      '**AI System Instructions**:\n' +
      '1. Locate each element using the provided **Context & References** below.\n' +
      '2. Match the `@[tag]` in the Instruction to the Reference list.\n' +
      '3. Use Text Content and Selectors to pinpoint the exact code location.\n' +
      '4. Apply the requested changes.\n\n---\n\n';
    state.messages.forEach(function(msg, i) {
      out += fmtMsg(msg, i + 1) + '\n---\n';
    });

    return navigator.clipboard.writeText(out).then(function() {
      var btn = document.getElementById('oc-copy-all');
      var orig = btn.textContent;
      btn.textContent = '✅ 已复制！';
      btn.style.background = 'linear-gradient(135deg, #34c759, #30d158)';
      setTimeout(function() { btn.textContent = orig; btn.style.background = ''; }, 2000);
    });
  }

  function fmtMsg(msg, idx) {
    var out = '## Instruction ' + idx + '\n\n> ' + msg.text + '\n\n';
    if (msg.refs.length > 0) {
      out += '### Context & References\n';
      msg.refs.forEach(function(r, i) {
        out += '- **Reference ' + (i + 1) + '** (' + r.uiLabel + '):\n';
        if (r.text) out += '  - **Text Content**: "' + r.text + '"\n';
        out += '  - **Selector**: `' + r.selector + '`\n';
        if (r.source !== 'Unknown') out += '  - **Source File**: `' + r.source + '`\n';
        out += '  - **HTML**: `' + r.html.replace(/\n/g, ' ') + '`\n\n';
      });
    }
    return out;
  }

  // ===================== BADGES =====================

  function addBadge(el, label, refId) {
    var rid = refId || ('r' + Date.now() + Math.random().toString(36).substr(2,4));
    el.classList.add('oc-ref');
    el.setAttribute('data-ref-id', rid);
    var badge = document.createElement('div');
    badge.className = 'oc-badge';
    badge.textContent = label;
    badge.setAttribute('data-ref-id', rid);
    var rect = el.getBoundingClientRect();
    badge.style.top = (rect.top + window.scrollY) + 'px';
    badge.style.left = (rect.left + window.scrollX) + 'px';
    document.body.appendChild(badge);
    return rid;
  }

  function clearBadges() {
    document.querySelectorAll('.oc-ref').forEach(function(e) { e.classList.remove('oc-ref'); });
    document.querySelectorAll('.oc-badge').forEach(function(e) { e.remove(); });
  }

  function refreshBadges() {
    state.messages.forEach(function(msg) {
      msg.refs.forEach(function(r) {
        var el = document.querySelector(r.selector);
        if (el) addBadge(el, r.uiLabel);
      });
    });
  }

  // ===================== HELPERS =====================

  function clearHover() {
    if (state.hoverEl) { state.hoverEl.classList.remove('oc-hover'); state.hoverEl = null; }
  }

  function esc(t) {
    return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function getSource(el) {
    var k = Object.keys(el).find(function(x) { return x.startsWith('__reactFiber$'); });
    if (k) {
      var f = el[k];
      while (f) { if (f._debugSource) return f._debugSource.fileName + ':' + f._debugSource.lineNumber; f = f.return; }
    }
    return 'Unknown';
  }

  function buildSelector(el) {
    if (el.id) return '#' + el.id;
    var path = [];
    while (el && el.nodeType === 1) {
      var s = el.nodeName.toLowerCase();
      if (el.className && typeof el.className === 'string') {
        var cls = el.className.split(' ').filter(function(c) { return c.indexOf('oc-') !== 0; }).join('.');
        if (cls) s += '.' + cls;
      }
      path.unshift(s);
      el = el.parentNode;
      if (path.length > 3) break;
    }
    return path.join(' > ');
  }

  // ===================== MESSAGE LISTENER =====================

  chrome.runtime.onMessage.addListener(function(req) {
    if (req.action === 'toggle') {
      if (req.state) open(); else close();
    }
  });

})();
