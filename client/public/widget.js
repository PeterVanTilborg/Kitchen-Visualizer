/**
 * Wrap Up AI \u2014 Widget Embed Script
 * Drop-in JS widget for partners. Usage:
 *
 * Popup mode (default \u2014 no changes to existing behaviour):
 *   <script src="https://www.wrap-up.ai/widget.js" data-token="TOKEN"></script>
 *
 * Inline mode (renders full tool directly inside a container div):
 *   <div id="wrapup-widget"></div>
 *   <script src="https://www.wrap-up.ai/widget.js" data-token="TOKEN" data-mode="inline"></script>
 */
(function () {
  'use strict';

  // \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080 1. Bootstrap \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080
  var script = document.currentScript || (function () {
    var scripts = document.querySelectorAll('script[data-token]');
    return scripts[scripts.length - 1];
  })();

  if (!script) {
    console.error('[WrapUpAI] widget.js: no script tag with data-token found');
    return;
  }

  var EMBED_TOKEN = script.getAttribute('data-token');
  var MODE = script.getAttribute('data-mode') || 'popup';
  var API_BASE = (function () {
    try { return new URL(script.src).origin; } catch (e) { return ''; }
  })();

  if (!EMBED_TOKEN) {
    console.error('[WrapUpAI] widget.js: data-token is empty');
    return;
  }

  // Shared state
  var _sessionToken = null;
  var _colors = [];
  var _selectedColorId = null;
  var _selectedFile = null;
  var _isGenerating = false;
  var _freeRenderLimit = 3; // overridden from /api/widget/init response
  var _quoteFormUrl = ''; // optional partner-configured URL for paywall "Get a Quote" button
  var _businessName = ''; // partner business name for upsell card "Contact {business}" button
  var _contactEmail = ''; // optional partner contact email for upsell card mailto: button

  // Share-to-Instagram (Tier 1 Growth Loops) — module-level so refs survive
  // across showInlineResult invocations and the Share button can read them
  // synchronously inside the click handler. Reset at the START of every
  // showInlineResult call so a second render does not share against stale
  // image refs from the previous render.
  var _shareReady = false;
  var _shareOriginalImg = null;
  var _shareRenderImg = null;
  // Logo cache survives between renders. The asset URL is static (a single
  // public PNG path) so caching the decoded Image is safe — we never need to
  // invalidate during a session. The CORS-anonymous fetch and the new asset
  // URL together also mean we do not inherit any stale no-CORS cached entry
  // from before the canvas-taint fix landed: /wrapup-ai-watermark.png is a
  // new path with no prior browser-cache entry to conflict with.
  var _shareCachedLogo = null;
  var _shareLogoLoadPromise = null;

  // \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080 Visitor render-count helpers (localStorage, keyed by embed token) \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080
  function _getVisitorRenders() {
    try { return parseInt(localStorage.getItem('wuprc_' + EMBED_TOKEN) || '0', 10) || 0; } catch (e) { return 0; }
  }
  function _incVisitorRenders() {
    try { localStorage.setItem('wuprc_' + EMBED_TOKEN, String(_getVisitorRenders() + 1)); } catch (e) {}
  }
  function _isAtRenderLimit() {
    return _freeRenderLimit > 0 && _getVisitorRenders() >= _freeRenderLimit;
  }
  function _buildPaywallEl() {
    var pw = document.createElement('div');
    pw.setAttribute('style', 'margin-top:20px;padding:28px 24px;background:#1a1a1a;border:1px solid #333333;border-radius:12px;text-align:center');
    var title = document.createElement('p');
    title.textContent = 'You\u2019ve used all your free renders';
    title.setAttribute('style', 'color:#ffffff;font-size:18px;font-weight:700;margin:0 0 8px;font-family:inherit');
    var sub = document.createElement('p');
    sub.textContent = 'Unlock unlimited renders with a WRAP-UP.AI plan.';
    sub.setAttribute('style', 'color:#888888;font-size:14px;margin:0 0 20px;font-family:inherit');
    var btnRow = document.createElement('div');
    btnRow.setAttribute('style', 'display:flex;gap:10px;justify-content:center;flex-wrap:wrap');
    var buyBtn = document.createElement('a');
    buyBtn.href = 'https://www.wrap-up.ai?pricing=true';
    buyBtn.target = '_blank';
    buyBtn.rel = 'noopener';
    buyBtn.textContent = 'Buy Credits for More Renders';
    buyBtn.setAttribute('style', 'display:inline-block;padding:13px 24px;background:#D2D915;color:#000000;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;font-family:inherit;cursor:pointer');
    btnRow.appendChild(buyBtn);
    if (_quoteFormUrl) {
      var quoteBtn = document.createElement('a');
      quoteBtn.href = _quoteFormUrl;
      quoteBtn.target = '_blank';
      quoteBtn.rel = 'noopener';
      quoteBtn.textContent = 'Get a Quote';
      quoteBtn.setAttribute('style', 'display:inline-block;padding:13px 24px;background:transparent;color:#ffffff;border:1px solid #444444;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;font-family:inherit;cursor:pointer');
      btnRow.appendChild(quoteBtn);
    }
    pw.appendChild(title);
    pw.appendChild(sub);
    pw.appendChild(btnRow);
    return pw;
  }

  // Upsell card shown below every free render. Always offers
  // "Purchase plan for more renders"; additionally offers a
  // mailto: "Contact {businessName}" button when the partner has configured
  // a contact email, and a "Get a quote for this render" button when the
  // partner has configured a quote form URL.
  function _buildUpsellCardEl() {
    var card = document.createElement('div');
    card.setAttribute('style', 'margin-top:20px;padding:20px 24px;background:#1a1a1a;border:1px solid #333333;border-radius:12px;text-align:center');
    var title = document.createElement('p');
    title.textContent = 'Want more renders?';
    title.setAttribute('style', 'color:#ffffff;font-size:16px;font-weight:700;margin:0 0 6px;font-family:inherit');
    var btnRow = document.createElement('div');
    btnRow.setAttribute('style', 'display:flex;gap:10px;justify-content:center;flex-wrap:wrap');

    // Button 1 (always): Purchase plan
    var planBtn = document.createElement('a');
    planBtn.href = 'https://www.wrap-up.ai?pricing=true';
    planBtn.target = '_blank';
    planBtn.rel = 'noopener';
    planBtn.textContent = 'Purchase plan for more renders';
    planBtn.setAttribute('style', 'display:inline-block;padding:11px 20px;background:#D2D915;color:#000000;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;font-family:inherit;cursor:pointer');
    btnRow.appendChild(planBtn);

    // Button 2 (optional): Contact the shop — mailto
    if (_contactEmail) {
      var contactBtn = document.createElement('a');
      contactBtn.href = 'mailto:' + _contactEmail;
      contactBtn.rel = 'noopener';
      contactBtn.textContent = _businessName ? ('Contact ' + _businessName) : 'Contact us';
      contactBtn.setAttribute('style', 'display:inline-block;padding:11px 20px;background:transparent;color:#ffffff;border:1px solid #444444;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;font-family:inherit;cursor:pointer');
      btnRow.appendChild(contactBtn);
    }

    // Button 3 (optional): Quote form URL
    if (_quoteFormUrl) {
      var quoteBtn = document.createElement('a');
      quoteBtn.href = _quoteFormUrl;
      quoteBtn.target = '_blank';
      quoteBtn.rel = 'noopener';
      quoteBtn.textContent = 'Get a quote for this render';
      quoteBtn.setAttribute('style', 'display:inline-block;padding:11px 20px;background:transparent;color:#ffffff;border:1px solid #444444;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;font-family:inherit;cursor:pointer');
      btnRow.appendChild(quoteBtn);
    }

    card.appendChild(title);
    card.appendChild(btnRow);
    return card;
  }

  // Detect iPhone HEIC/HEIF files by extension or MIME. Used by both popup
  // and inline upload paths. Server-side server/heicToJpeg.ts remains as a
  // safety net for files that slip past (e.g. .heic renamed to .jpg with
  // stripped MIME).
  function _isHeicFile(file) {
    if (!file) return false;
    var name = (file.name || '').toLowerCase();
    var len = name.length;
    if (len >= 5 && name.lastIndexOf('.heic') === len - 5) return true;
    if (len >= 5 && name.lastIndexOf('.heif') === len - 5) return true;
    var t = (file.type || '').toLowerCase();
    return t === 'image/heic' || t === 'image/heif';
  }

  // Inline notice rendered when a HEIC/HEIF file is detected client-side.
  // theme: 'light' (popup modal, white background) or 'dark' (inline widget,
  // #1a1a1a background). onReset is invoked when the visitor clicks
  // Try another file. The wrap stops click propagation so accidental clicks
  // inside the notice do not re-open the picker.
  function _buildHeicErrorEl(theme, onReset) {
    var dark = theme === 'dark';
    var bg          = dark ? '#1a1a1a' : '#fff5f5';
    var border      = dark ? '#3a2a2a' : '#f3c2c2';
    var headColor   = dark ? '#ff8a8a' : '#b00020';
    var bodyColor   = dark ? '#dddddd' : '#333333';
    var subtleColor = dark ? '#888888' : '#666666';
    var btnBorder   = dark ? '#555555' : '#cccccc';
    var btnColor    = dark ? '#ffffff' : '#222222';

    var wrap = document.createElement('div');
    wrap.setAttribute('style', [
      'background:' + bg, 'border:1px solid ' + border, 'border-radius:10px',
      'padding:16px', 'text-align:left', 'font-family:inherit', 'font-size:14px',
      'color:' + bodyColor
    ].join(';'));
    wrap.addEventListener('click', function (e) { e.stopPropagation(); });

    var msg = document.createElement('p');
    msg.textContent = 'This looks like a HEIC photo (Apple\u2019s iPhone format). Please convert it to JPG or PNG first.';
    msg.setAttribute('style', 'margin:0 0 10px;color:' + headColor + ';font-weight:600');
    wrap.appendChild(msg);

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.textContent = 'Show how to convert';
    toggle.setAttribute('style', [
      'background:none', 'border:0', 'padding:0', 'margin:0 0 10px',
      'color:' + headColor, 'cursor:pointer', 'font-family:inherit',
      'font-size:13px', 'font-weight:600', 'text-decoration:underline'
    ].join(';'));

    var details = document.createElement('div');
    details.setAttribute('style', 'display:none;margin:0 0 12px');

    function _platformBlock(label, body) {
      var box = document.createElement('div');
      box.setAttribute('style', 'margin-bottom:8px');
      var lbl = document.createElement('p');
      lbl.textContent = label;
      lbl.setAttribute('style', 'margin:0;font-weight:600;color:' + bodyColor);
      var p = document.createElement('p');
      p.textContent = body;
      p.setAttribute('style', 'margin:2px 0 0;color:' + subtleColor);
      box.appendChild(lbl);
      box.appendChild(p);
      return box;
    }

    details.appendChild(_platformBlock('Mac',
      'Right-click the photo > Open With > Preview > File > Export > set Format to JPEG > Save.'));
    details.appendChild(_platformBlock('Windows',
      'Right-click the photo > Open With > Photos > click the "..." menu > Save as > choose JPG.'));
    details.appendChild(_platformBlock('Android',
      'Open the photo in Google Photos > tap Share > choose "Save as JPG" or send via WhatsApp.'));
    var tip = document.createElement('p');
    tip.textContent = 'Tip: Sending the photo via WhatsApp also converts it automatically.';
    tip.setAttribute('style', 'margin:8px 0 0;font-size:12px;color:' + subtleColor);
    details.appendChild(tip);

    toggle.addEventListener('click', function () {
      var open = details.style.display !== 'none';
      details.style.display = open ? 'none' : 'block';
      toggle.textContent = open ? 'Show how to convert' : 'Hide how to convert';
    });

    wrap.appendChild(toggle);
    wrap.appendChild(details);

    var resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.textContent = 'Try another file';
    resetBtn.setAttribute('style', [
      'background:transparent', 'border:1px solid ' + btnBorder, 'border-radius:8px',
      'padding:8px 14px', 'color:' + btnColor, 'cursor:pointer', 'font-family:inherit',
      'font-size:13px', 'font-weight:600'
    ].join(';'));
    resetBtn.addEventListener('click', function () {
      if (typeof onReset === 'function') onReset();
    });
    wrap.appendChild(resetBtn);

    return wrap;
  }

  // \u2500\u2500 Share-to-Instagram helpers (Tier 1 Growth Loops) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  // Mirrors client/src/lib/share-composite.ts; the React surface uses that
  // module and the widget surface uses these inline equivalents because
  // widget.js is a self-contained vanilla bundle that cannot import from
  // src/. KEEP THE TWO IN SYNC: caption template, composite geometry,
  // footer-height formula, and PNG logo path are shared design contracts.
  // If you change either, change the other and update the cross-references
  // in both files.
  //
  // CORS / canvas tainting: every Image loaded here gets crossOrigin set
  // BEFORE src so the browser issues the request as a CORS request. The
  // widget runs cross-origin from API_BASE (host page on partner domain,
  // assets on wrap-up.ai) and without this attribute drawing the image to
  // canvas would taint the canvas and toBlob() would throw. The server
  // sends Access-Control-Allow-Origin on /api/widget/* (middleware at
  // server/partnerRoutes.ts) and on /wrapup-ai-watermark.png (narrow GET
  // route at server/static.ts). Both responses must keep that header for
  // the share button to work.

  function _shareLoadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      // crossOrigin must be set BEFORE src so the request is issued in CORS
      // mode. Setting it after src is too late — the request has already
      // been queued without the CORS flag.
      img.crossOrigin = 'anonymous';
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('Image load failed: ' + src)); };
      img.src = src;
    });
  }

  function _shareLoadLogo() {
    if (_shareCachedLogo) return Promise.resolve(_shareCachedLogo);
    if (!_shareLogoLoadPromise) {
      _shareLogoLoadPromise = _shareLoadImage(API_BASE + '/wrapup-ai-watermark.png')
        .then(function (img) { _shareCachedLogo = img; return img; })
        .catch(function (err) { _shareLogoLoadPromise = null; throw err; });
    }
    return _shareLogoLoadPromise;
  }

  // MIRROR: this footer-height formula is the canonical version at
  // server/imageProcessing.ts:60-62 (function createBannerSvg). The React
  // equivalent is in client/src/lib/share-composite.ts. KEEP THE THREE IN
  // SYNC: any change to the multiplier or the clamp bounds on the server
  // must also be applied at the two client locations.
  function _shareFooterHeight(surface, W) {
    return surface === 'widget'
      ? Math.max(84, Math.min(120, Math.round(W * 0.105)))
      : Math.max(56, Math.min(80, Math.round(W * 0.07)));
  }

  // Strips spaces and non-alphanumeric while preserving original casing and
  // accented characters. RegExp constructor (not literal) for parity with the
  // React helper.
  var _SHARE_HASHTAG_RE = new RegExp('[^\\p{L}\\p{N}]', 'gu');
  function _shareToHashtag(s) { return s.replace(_SHARE_HASHTAG_RE, ''); }

  function _shareBuildCaption(manufacturer, colorName) {
    var m = (manufacturer == null ? '' : String(manufacturer)).trim();
    var c = (colorName == null ? '' : String(colorName)).trim();
    var lines = ['Check out my custom wrap visualization made with @go_wrapup'];
    if (m && c) {
      lines.push('');
      lines.push('Wrap-color: ' + m + ' ' + c);
    }
    var tags = ['#wrapupAI', '#wrapup', '#instantcolorchanger'];
    if (m) {
      var sm = _shareToHashtag(m);
      if (sm) tags.push('#' + sm);
    }
    if (c) {
      var sc = _shareToHashtag(c);
      if (sc) tags.push('#' + sc);
    }
    lines.push('');
    lines.push(tags.join(' '));
    return lines.join('\n');
  }

  function _shareBuildComposite(original, render, surface) {
    return new Promise(function (resolve, reject) {
      var W = render.naturalWidth, H = render.naturalHeight;
      var oW = original.naturalWidth, oH = original.naturalHeight;
      if (!W || !H) return reject(new Error('Render image has zero dimensions'));
      if (!oW || !oH) return reject(new Error('Original image has zero dimensions'));

      // Crop the server-baked footer-bar off the bottom. H_eff is the
      // visible content height after the crop; both halves draw to H_eff.
      var footerH = _shareFooterHeight(surface, W);
      var H_eff = Math.max(1, H - footerH);

      var canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H_eff;
      var ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas 2d context unavailable'));

      // Symmetric top-anchored crop. The render loses its bottom footerH
      // pixels \u2014 a (1 - H_eff/H) proportion of vertical content. We apply
      // the SAME proportion crop to the original so both halves show the
      // same vertical slice of their respective sources. Source rect on
      // the original is anchored to (0, 0) and extends through the LEFT
      // HALF of the original (oW/2) and the TOP H_eff/H proportion
      // (oH * cropProp). No cover-crop, no centering \u2014 straight top-left
      // top-down crop.
      //
      // Known limitation: this preserves vertical-content symmetry between
      // the two halves but does NOT preserve aspect ratio when the
      // original's aspect (oW/oH) differs from the render's aspect (W/H).
      // drawImage will then non-uniformly scale the original to fit
      // (W/2, H_eff), producing visible horizontal or vertical distortion
      // on the LEFT (BEFORE) side. The previous cover-crop implementation
      // hid this distortion at the cost of asymmetric vertical content
      // (left half showed centered crop; right half showed top-anchored
      // crop). Vertical symmetry was the explicit user requirement;
      // aspect-mismatch distortion on arbitrary user uploads is the
      // accepted tradeoff.
      var cropProportion = H_eff / H;
      var origCropH = oH * cropProportion;
      ctx.drawImage(original, 0, 0, oW / 2, origCropH, 0, 0, W / 2, H_eff);

      // Right half: top portion of render's right half, pixel-perfect.
      // Source rect excludes the bottom footerH rows; destination matches.
      ctx.drawImage(render, W / 2, 0, W / 2, H_eff, W / 2, 0, W / 2, H_eff);

      // 2px white divider with dark glow at the seam.
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(W / 2 - 1, 0, 2, H_eff);
      ctx.restore();

      // WrapUp AI watermark logo: bottom-left of the AFTER side, flush
      // against the divider, anchored to the post-crop bottom edge. 4% of
      // effective canvas height (subtle attribution, not a foreground
      // element). Drawn directly on the photo \u2014 no badge background. The
      // PNG asset (658\u00d7152, RGBA) carries its own alpha so transparent
      // pixels reveal the photo underneath cleanly.
      //
      // Legibility tradeoff: without the previous semi-transparent black
      // background, logo readability depends on the underlying photo
      // content. On dark wraps and dim scenes the white watermark reads
      // cleanly; on light scenes (white wraps, sky, bright environments)
      // the logo may be hard to see. Accepted tradeoff for a cleaner
      // share image.
      _shareLoadLogo().then(function (logo) {
        var logoH = H_eff * 0.04;
        var logoAspect = logo.naturalWidth / logo.naturalHeight || (658 / 152);
        var logoW = logoH * logoAspect;
        var marginFromDivider = 8, marginFromBottom = 8;
        var logoX = W / 2 + marginFromDivider;
        var logoY = H_eff - marginFromBottom - logoH;
        ctx.drawImage(logo, logoX, logoY, logoW, logoH);
      }).catch(function () {
        // skip silently
      }).then(function () {
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob returned null'));
        }, 'image/jpeg', 0.85);
      });
    });
  }

  // Minimal toast: fixed top-center, dark background, fades after ~3s. No
  // existing widget toast/notice helper to reuse \u2014 setS1Status is local to
  // the inline form area; showHeicError replaces dropzone content. So this
  // is built fresh. No backdrop-blur (GR 5) and no emojis (GR 3).
  function _showShareToast(msg) {
    var el = document.createElement('div');
    el.textContent = msg;
    el.setAttribute('style', [
      'position:fixed', 'top:16px', 'left:50%',
      'transform:translateX(-50%)',
      'background:#1a1a1a', 'color:#ffffff',
      'border:1px solid #333333', 'border-radius:8px',
      'padding:10px 16px', 'font-size:13px',
      'font-family:inherit', 'font-weight:500',
      'box-shadow:0 4px 16px rgba(0,0,0,0.4)',
      'z-index:9999998',
      'max-width:90vw', 'text-align:center',
      'transition:opacity 0.3s',
      'opacity:1'
    ].join(';'));
    document.body.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; }, 2700);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 3100);
  }

  // \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  // \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080 2. Init: fetch session + colors \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080
  function init() {
    fetch(API_BASE + '/api/widget/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ widgetId: EMBED_TOKEN })
    })
      .then(function (r) {
        // Preserve HTTP status even when the body is non-JSON (proxy error pages etc.)
        return r.json().catch(function () { return {}; }).then(function (d) { d._httpStatus = r.status; return d; });
      })
      .then(function (data) {
        if (!data.sessionToken) {
          console.error('[WrapUpAI] init failed:', data.message || data);
          renderInitError(data.message || ('HTTP ' + (data._httpStatus || '???')));
          return;
        }
        _sessionToken = data.sessionToken;
        _colors = data.colors || [];
        _freeRenderLimit = typeof data.freeRenderLimit === 'number' ? data.freeRenderLimit : 3;
        _quoteFormUrl = (data.quoteFormUrl && typeof data.quoteFormUrl === 'string') ? data.quoteFormUrl : '';
        _businessName = (data.businessName && typeof data.businessName === 'string') ? data.businessName : '';
        _contactEmail = (data.contactEmail && typeof data.contactEmail === 'string') ? data.contactEmail : '';
        if (MODE === 'inline') {
          injectInline();
        } else {
          injectButton();
        }
      })
      .catch(function (err) {
        console.error('[WrapUpAI] init error:', err);
        renderInitError('Network error');
      });
  }

  // Inline mode only: if init fails we still want something visible in the
  // partner page instead of a silent black area. Popup mode has no mounted
  // container yet at page load, so we skip it there (console.error suffices).
  function renderInitError(reason) {
    if (MODE !== 'inline') return;
    var root = document.getElementById('wrapup-widget');
    if (!root) return;
    var card = document.createElement('div');
    card.setAttribute('style', 'background:#1a1a1a;border:1px solid #333333;border-radius:12px;padding:24px;color:#ffffff;font-family:inherit;text-align:center');
    var title = document.createElement('p');
    title.textContent = 'Widget unavailable';
    title.setAttribute('style', 'margin:0 0 6px;font-weight:700;font-size:16px');
    var sub = document.createElement('p');
    sub.textContent = 'We could not load the wrap visualiser right now. Please try again in a moment.';
    sub.setAttribute('style', 'margin:0;font-size:13px;color:#888888');
    var detail = document.createElement('p');
    detail.textContent = String(reason || '').slice(0, 120);
    detail.setAttribute('style', 'margin:10px 0 0;font-size:11px;color:#555555');
    card.appendChild(title);
    card.appendChild(sub);
    if (reason) card.appendChild(detail);
    root.appendChild(card);
  }

  // \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080 3. Floating trigger button (popup mode only \u2014 unchanged) \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080
  function injectButton() {
    var btn = document.createElement('button');
    btn.id = 'wrapup-trigger';
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 12l3 3 5-5"/></svg> Get My Free Renders';
    btn.setAttribute('style', [
      'position:fixed', 'bottom:24px', 'right:24px', 'z-index:999999',
      'display:flex', 'align-items:center', 'gap:8px', 'padding:12px 20px',
      'background:#D2D915', 'color:#000', 'border:none', 'border-radius:50px',
      'font-size:15px', 'font-weight:600', 'cursor:pointer',
      'box-shadow:0 4px 20px rgba(0,0,0,0.25)',
      'transition:transform 0.15s,box-shadow 0.15s',
      'font-family:system-ui,sans-serif'
    ].join(';'));
    btn.addEventListener('mouseenter', function () {
      btn.style.transform = 'scale(1.05)';
      btn.style.boxShadow = '0 6px 28px rgba(0,0,0,0.3)';
    });
    btn.addEventListener('mouseleave', function () {
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = '0 4px 20px rgba(0,0,0,0.25)';
    });
    btn.addEventListener('click', openModal);
    document.body.appendChild(btn);
  }

  // \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080 4. Modal (popup mode only \u2014 unchanged) \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080
  function openModal() {
    if (document.getElementById('wrapup-modal-overlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'wrapup-modal-overlay';
    overlay.setAttribute('style', [
      'position:fixed', 'inset:0', 'z-index:9999998',
      'background:rgba(0,0,0,0.65)',
      'display:flex', 'align-items:center', 'justify-content:center',
      'padding:16px', 'box-sizing:border-box'
    ].join(';'));
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });

    var modal = document.createElement('div');
    modal.setAttribute('style', [
      'background:#fff', 'border-radius:16px', 'width:100%', 'max-width:560px',
      'max-height:90vh', 'overflow-y:auto !important', 'padding:28px', 'box-sizing:border-box',
      'font-family:system-ui,sans-serif', 'position:relative'
    ].join(';'));

    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('style', [
      'position:absolute', 'top:16px', 'right:16px',
      'background:none', 'border:none', 'font-size:24px',
      'cursor:pointer', 'color:#666', 'line-height:1'
    ].join(';'));
    closeBtn.addEventListener('click', closeModal);

    var title = document.createElement('h2');
    title.textContent = 'Visualise a Car Wrap';
    title.setAttribute('style', 'margin:0 0 20px;font-size:20px;color:#111;font-weight:700');

    var uploadLabel = document.createElement('p');
    uploadLabel.textContent = '1. Upload a photo of your car';
    uploadLabel.setAttribute('style', 'margin:0 0 8px;font-weight:600;color:#333;font-size:14px');

    var dropzone = document.createElement('div');
    dropzone.id = 'wrapup-dropzone';
    dropzone.setAttribute('style', [
      'border:2px dashed #ddd', 'border-radius:10px', 'padding:24px',
      'text-align:center', 'cursor:pointer', 'color:#888', 'font-size:14px',
      'margin-bottom:20px', 'transition:border-color 0.2s'
    ].join(';'));
    dropzone.innerHTML = '<div>&#128247; Click or drag a photo here</div><div style="font-size:12px;margin-top:4px">JPG or PNG</div>';
    var DROPZONE_IDLE_HTML = dropzone.innerHTML;

    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    dropzone.addEventListener('click', function () { fileInput.click(); });
    dropzone.addEventListener('dragover', function (e) {
      e.preventDefault();
      dropzone.style.borderColor = '#D2D915';
    });
    dropzone.addEventListener('dragleave', function () {
      dropzone.style.borderColor = '#ddd';
    });
    dropzone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropzone.style.borderColor = '#ddd';
      var f = e.dataTransfer.files[0];
      if (!f) return;
      if (_isHeicFile(f)) { showHeicError(); return; }
      handleFile(f);
    });
    fileInput.addEventListener('change', function () {
      var f = fileInput.files[0];
      fileInput.value = '';
      if (!f) return;
      if (_isHeicFile(f)) { showHeicError(); return; }
      handleFile(f);
    });

    function showHeicError() {
      _selectedFile = null;
      dropzone.innerHTML = '';
      dropzone.appendChild(_buildHeicErrorEl('light', function () {
        dropzone.innerHTML = DROPZONE_IDLE_HTML;
        fileInput.click();
      }));
    }

    function handleFile(file) {
      _selectedFile = file;
      dropzone.innerHTML = '<div style="color:#D2D915;font-weight:600">&#10003; ' + file.name + '</div>';
    }

    var colorLabel = document.createElement('p');
    colorLabel.textContent = '2. Choose a wrap colour';
    colorLabel.setAttribute('style', 'margin:0 0 8px;font-weight:600;color:#333;font-size:14px');

    var colorGrid = document.createElement('div');
    colorGrid.setAttribute('style', [
      'display:grid', 'grid-template-columns:repeat(auto-fill,minmax(52px,1fr))',
      'gap:8px', 'max-height:300px !important', 'overflow-y:auto !important', 'padding:4px', 'margin-bottom:20px'
    ].join(';'));

    _colors.forEach(function (c) {
      var swatch = document.createElement('div');
      swatch.setAttribute('title', c.name + ' \u2014 ' + c.manufacturer);
      swatch.setAttribute('data-id', c.id);
      var bg = 'background-color:' + (c.hexColor || '#111111');
      swatch.setAttribute('style', [
        'width:52px', 'height:52px', 'border-radius:8px', 'cursor:pointer',
        'border:2px solid transparent', 'transition:border-color 0.15s,transform 0.15s',
        'overflow:hidden', 'box-sizing:border-box', bg
      ].join(';'));
      if (c.thumbnailUrl) {
        var img = document.createElement('img');
        img.src = c.thumbnailUrl;
        img.style.cssText = 'width:100%;height:100%;display:block;';
        swatch.appendChild(img);
      }
      swatch.addEventListener('click', function () {
        _selectedColorId = c.id;
        colorGrid.querySelectorAll('[data-id]').forEach(function (s) {
          s.style.borderColor = 'transparent';
          s.style.transform = 'scale(1)';
        });
        swatch.style.borderColor = '#D2D915';
        swatch.style.transform = 'scale(1.1)';
        selectedColorName.textContent = c.name + ' by ' + c.manufacturer;
      });
      colorGrid.appendChild(swatch);
    });

    var selectedColorName = document.createElement('p');
    selectedColorName.setAttribute('style', 'margin:-12px 0 20px;font-size:12px;color:#888;min-height:16px');

    var genBtn = document.createElement('button');
    genBtn.id = 'wrapup-gen-btn';
    genBtn.textContent = 'Visualise Now';
    genBtn.setAttribute('style', [
      'width:100%', 'padding:14px', 'background:#D2D915', 'color:#000',
      'border:none', 'border-radius:10px', 'font-size:16px', 'font-weight:700',
      'cursor:pointer', 'margin-bottom:16px'
    ].join(';'));
    genBtn.addEventListener('click', function() {
      if (_customerToken) {
        doGenerate();
      } else {
        step1El.style.display = 'block';
        emailInput.focus();
      }
    });

    var resultArea = document.createElement('div');
    resultArea.id = 'wrapup-result';
    resultArea.style.display = 'none';

    modal.appendChild(closeBtn);
    modal.appendChild(title);
    modal.appendChild(uploadLabel);
    modal.appendChild(dropzone);
    modal.appendChild(fileInput);
    modal.appendChild(colorLabel);
    modal.appendChild(colorGrid);
    modal.appendChild(selectedColorName);
    modal.appendChild(genBtn);
    modal.appendChild(resultArea);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  function closeModal() {
    var overlay = document.getElementById('wrapup-modal-overlay');
    if (overlay) overlay.remove();
    _selectedFile = null;
    _selectedColorId = null;
    _isGenerating = false;
  }

  // \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080 5. Generation (popup mode only \u2014 unchanged) \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080
  function runGenerate() {
    if (_isGenerating) return;
    if (!_selectedFile) { alert('Please upload a photo of your car first.'); return; }
    if (!_selectedColorId) { alert('Please select a wrap colour.'); return; }

    // Free render limit check (client-side, keyed by embed token)
    if (_isAtRenderLimit()) {
      var resultEl = document.getElementById('wrapup-result');
      if (resultEl) {
        resultEl.style.display = 'block';
        resultEl.innerHTML = '';
        resultEl.appendChild(_buildPaywallEl());
      }
      return;
    }

    _isGenerating = true;
    var btn = document.getElementById('wrapup-gen-btn');
    if (btn) { btn.textContent = 'Generating\u2026'; btn.disabled = true; }

    var formData = new FormData();
    formData.append('image', _selectedFile);
    formData.append('colorId', String(_selectedColorId));

    fetch(API_BASE + '/api/widget/generate', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + _sessionToken, 'x-customer-token': _customerToken || '' },
      body: formData
    })
      .then(function (r) {
        if (r.status === 402) {
          _isGenerating = false;
          if (btn) { btn.textContent = 'Visualise Now'; btn.disabled = false; }
          showWidgetError('No renders remaining. Please contact the wrap shop for more information.');
          return null;
        }
        if (r.status === 401) {
          _isGenerating = false;
          if (btn) { btn.textContent = 'Visualise Now'; btn.disabled = false; }
          init();
          return null;
        }
        if (!r.ok) {
          _isGenerating = false;
          if (btn) { btn.textContent = 'Visualise Now'; btn.disabled = false; }
          showWidgetError('Something went wrong. Please try again.');
          return null;
        }
        return r.json();
      })
      .then(function (data) {
        if (!data) return;
        _isGenerating = false;
        if (btn) { btn.textContent = 'Visualise Now'; btn.disabled = false; }
        _incVisitorRenders();
        showResult(data);
      })
      .catch(function (err) {
        _isGenerating = false;
        if (btn) { btn.textContent = 'Visualise Now'; btn.disabled = false; }
        console.error('[WrapUpAI] generate error:', err);
        showWidgetError('Something went wrong. Please try again.');
      });
  }

  function showWidgetError(msg) {
    var el = document.getElementById('wrapup-result');
    if (!el) return;
    el.style.display = 'block';
    el.innerHTML = '<p style="color:#c0392b;font-weight:600;text-align:center;padding:16px 0">' + msg + '</p>';
  }

  function showResult(data) {
    var resultArea = document.getElementById('wrapup-result');
    if (!resultArea) return;
    resultArea.style.display = 'block';
    resultArea.innerHTML = [
      '<hr style="margin:0 0 16px;border:none;border-top:1px solid #eee">',
      '<p style="margin:0 0 8px;font-weight:600;color:#333;font-size:14px">Your wrap visualisation</p>',
      '<p style="margin:0 0 12px;font-size:12px;color:#888">' + (data.colorName || '') + (data.manufacturer ? ' \u2014 ' + data.manufacturer : '') + '</p>',
      '<img src="' + data.imageUrl + '" alt="Wrap visualisation" style="width:100%;border-radius:10px;display:block">',
      '<p style="margin:12px 0 0;font-size:11px;color:#bbb;text-align:center">Powered by <a href="https://www.wrap-up.ai" target="_blank" rel="noopener" style="color:#D2D915;text-decoration:none">WRAP-UP.AI</a></p>'
    ].join('');
    resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080 6. Inline mode \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080
  function injectInline() {
    var rootEl = document.getElementById('wrapup-widget');
    if (!rootEl) {
      console.error('[WrapUpAI] inline mode: no element with id="wrapup-widget" found');
      return;
    }

    // \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080 State \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080
    var _verifiedEmail    = (function(){ try { return localStorage.getItem('wup_email_' + EMBED_TOKEN) || ''; } catch(e) { return ''; } })();
    var _customerToken    = (function(){ try { return localStorage.getItem('wup_ct_' + EMBED_TOKEN) || null; } catch(e) { return null; } })();
    var _consented        = (function(){ try { return !!localStorage.getItem('wup_privacy_consent_at'); } catch(e) { return false; } })();
    var _rendersUsed      = 0;
    var _rendersTotal     = 0;
    var _isFirstRender    = !_customerToken;
    var _inlineName       = '';
    var _inlinePhone      = '';
    var _inlineCarBrand   = '';
    var _inlineCarModel   = '';
    var _inlineFile       = null;
    var _inlineOriginalUrl = '';
    var _inlineColorId    = null;
    var _inlineColorName  = '';
    var _inlineGenerating = false;
    var _inlineAspectRatio = 56.25;
    // Render history — array of { imageUrl, colorName, manufacturer }. Persisted per embed token.
    var _renderHistory = (function(){
      try {
        var raw = localStorage.getItem('wup_history_' + EMBED_TOKEN);
        var parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch(e) { return []; }
    })();
    // Total render count from the server. Drives History-button visibility on
    // the strip (button shown when total > 5). Stays 0 for first-time visitors
    // and on server-fetch failure — button hidden in both cases.
    var _renderHistoryTotal = 0;

    // \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080 Container \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080
    var container = document.createElement('div');
    container.setAttribute('style', [
      'background:#111111', 'border-radius:16px', 'padding:24px',
      'font-family:inherit', 'color:#ffffff', 'width:100%',
      'box-sizing:border-box', 'position:relative',
    ].join(';'));
    rootEl.appendChild(container);

    // \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080 Result area (shared) \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080
    var resultArea = document.createElement('div');
    resultArea.style.display = 'none';
    resultArea.style.marginTop = '16px';

    // \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080
    // STEP 1 \u2014 Email Verification
    // \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080
    var step1El = document.createElement('div');
    step1El.setAttribute('style','background:#1a1a1a;border-radius:12px;padding:20px;box-sizing:border-box;margin-top:12px;display:none');
    step1El.style.display = 'none';

    var s1Title = document.createElement('p');
    s1Title.textContent = 'Visualise Your Wrap';
    s1Title.setAttribute('style','margin:0 0 6px;font-weight:700;font-size:20px;color:#ffffff;font-family:inherit');

    var s1Sub = document.createElement('p');
    s1Sub.textContent = 'We only need your email to send you the result \u2014 no spam, ever.';
    s1Sub.setAttribute('style','margin:0 0 18px;font-size:14px;color:#888888;font-family:inherit');

    var emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.placeholder = 'your@email.com';
    emailInput.setAttribute('style',[
      'width:100%','padding:12px 14px','background:#1a1a1a','border:1px solid #333333',
      'border-radius:8px','color:#ffffff','font-size:15px','font-family:inherit',
      'box-sizing:border-box','margin-bottom:8px','outline:none',
    ].join(';'));

    var s1Tagline = document.createElement('p');
    s1Tagline.textContent = 'We only need your email to send you the result \u2014 no spam, ever.';
    s1Tagline.setAttribute('style','margin:0 0 14px;font-size:12px;color:#666666;font-family:inherit');

    var sendCodeBtn = document.createElement('button');
    sendCodeBtn.textContent = 'Send Verification Code';
    sendCodeBtn.setAttribute('style',[
      'width:100%','padding:13px','background:#D2D915','color:#000000','border:none',
      'border-radius:8px','font-size:15px','font-weight:700','cursor:pointer',
      'font-family:inherit','box-sizing:border-box',
    ].join(';'));

    var codeSection = document.createElement('div');
    codeSection.style.display = 'none';
    codeSection.style.marginTop = '18px';

    var codeSentMsg = document.createElement('p');
    codeSentMsg.setAttribute('style','margin:0 0 12px;font-size:14px;color:#aaaaaa;font-family:inherit');

    var codeInput = document.createElement('input');
    codeInput.type = 'text';
    codeInput.inputMode = 'numeric';
    codeInput.maxLength = 6;
    codeInput.placeholder = '000000';
    codeInput.setAttribute('style',[
      'width:100%','padding:12px','background:#1a1a1a','border:1px solid #333333',
      'border-radius:8px','color:#ffffff','font-size:24px','letter-spacing:8px',
      'font-family:inherit','box-sizing:border-box','margin-bottom:10px',
      'text-align:center','outline:none',
    ].join(';'));

    var verifyCodeBtn = document.createElement('button');
    verifyCodeBtn.textContent = 'Verify Code';
    verifyCodeBtn.setAttribute('style',[
      'width:100%','padding:13px','background:#D2D915','color:#000000','border:none',
      'border-radius:8px','font-size:15px','font-weight:700','cursor:pointer','font-family:inherit',
    ].join(';'));

    var resendLink = document.createElement('a');
    resendLink.textContent = 'Resend code';
    resendLink.setAttribute('style','display:block;text-align:center;margin-top:10px;font-size:12px;color:#888888;cursor:pointer;text-decoration:underline;font-family:inherit');

    var s1Status = document.createElement('p');
    s1Status.setAttribute('style','margin:10px 0 0;font-size:13px;color:#e74c3c;font-family:inherit;min-height:18px');

    codeSection.appendChild(codeSentMsg);
    codeSection.appendChild(codeInput);
    codeSection.appendChild(verifyCodeBtn);
    codeSection.appendChild(resendLink);

    step1El.appendChild(s1Title);
    step1El.appendChild(s1Sub);
    step1El.appendChild(emailInput);
    step1El.appendChild(s1Tagline);
    step1El.appendChild(sendCodeBtn);
    step1El.appendChild(codeSection);
    step1El.appendChild(s1Status);

    // \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080
    // STEP 2 + 3 \u2014 Main widget (shown after verification)
    // \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080
    var mainEl = document.createElement('div');

    // Render history bar — always at the top, above the upload area. One thumb per
    // past render with color name below and a download button; click thumb to open
    // full-size. Starts empty; thumbs are appended as the visitor generates renders.
    var historyBar = document.createElement('div');
    historyBar.setAttribute('style',[
      'display:none','flex-wrap:wrap','justify-content:center',
      'gap:10px','margin-bottom:16px',
    ].join(';'));

    // Countdown block — shown after verification. Two lines, no card background:
    //   1) "free renders remaining : " (grey) + big bold brand-coloured "X / Y"
    //   2) small "Rendering for: <email>" line with the email in green
    var countdownEl = document.createElement('div');
    countdownEl.setAttribute('style','margin-bottom:14px;text-align:center;font-family:inherit;display:none');
    var countdownLine1 = document.createElement('p');
    countdownLine1.setAttribute('style','margin:0;font-size:14px;color:#888888;font-family:inherit;display:none');
    var countdownLabel = document.createTextNode('free renders remaining : ');
    var countdownXY = document.createElement('span');
    countdownXY.setAttribute('style','color:#D2D915;font-size:22px;font-weight:800;font-family:inherit;margin-left:4px;vertical-align:middle');
    countdownLine1.appendChild(countdownLabel);
    countdownLine1.appendChild(countdownXY);
    var countdownLine2 = document.createElement('p');
    countdownLine2.setAttribute('style','margin:4px 0 0;font-size:12px;color:#888888;font-family:inherit;word-break:break-all');
    countdownEl.appendChild(countdownLine1);
    countdownEl.appendChild(countdownLine2);

    // Upload section
    var uploadSection = document.createElement('div');
    uploadSection.setAttribute('style','margin-bottom:16px');
    var uploadLabel = document.createElement('p');
    uploadLabel.textContent = 'Upload a photo of your vehicle';
    uploadLabel.setAttribute('style','margin:0 0 8px;font-size:14px;font-weight:600;color:#ffffff;font-family:inherit');
    var uploadArea = document.createElement('div');
    uploadArea.setAttribute('style',[
      'border:2px dashed #333333','border-radius:12px','min-height:250px','padding:28px 20px',
      'text-align:center','cursor:pointer','background:#1a1a1a','position:relative',
    ].join(';'));
    var uploadIcon = document.createElement('div');
    uploadIcon.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#555555" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>';
    uploadIcon.style.marginBottom = '8px';
    var uploadText = document.createElement('p');
    uploadText.textContent = 'Click to upload or drag & drop';
    uploadText.setAttribute('style','margin:0 0 4px;font-size:14px;color:#888888;font-family:inherit');
    var uploadHint = document.createElement('p');
    uploadHint.textContent = 'JPG, PNG or WebP · Max 10 MB';
    uploadHint.setAttribute('style','margin:0;font-size:12px;color:#555555;font-family:inherit');
    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.setAttribute('style','position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%');
    uploadArea.appendChild(uploadIcon);
    uploadArea.appendChild(uploadText);
    uploadArea.appendChild(uploadHint);
    uploadArea.appendChild(fileInput);
    uploadSection.appendChild(uploadLabel);
    uploadSection.appendChild(uploadArea);

    // Color section
    var colorSection = document.createElement('div');
    colorSection.setAttribute('style','margin-bottom:16px');
    var colorLabel = document.createElement('p');
    colorLabel.textContent = 'Choose a wrap colour';
    colorLabel.setAttribute('style','margin:0 0 8px;font-size:14px;font-weight:600;color:#ffffff;font-family:inherit');
    var colorGrid = document.createElement('div');
    colorGrid.setAttribute('style','padding-right:2px');
    // "Selected: Name — Manufacturer" line, shown once the visitor picks a swatch
    var selectedColorEl = document.createElement('p');
    selectedColorEl.setAttribute('style','margin:10px 0 0;font-size:12px;color:#ffffff;font-family:inherit;min-height:16px');
    colorSection.appendChild(colorLabel);
    colorSection.appendChild(colorGrid);
    colorSection.appendChild(selectedColorEl);

    // Form section (Step 2 only)
    var formSection = document.createElement('div');
    formSection.setAttribute('style','margin-bottom:16px;display:none');
    var formTitle = document.createElement('p');
    formTitle.textContent = 'Your details';
    formTitle.setAttribute('style','margin:0 0 12px;font-size:14px;font-weight:600;color:#ffffff;font-family:inherit');

    function mkField(lbl, ph, tp) {
      var w = document.createElement('div'); w.style.marginBottom = '10px';
      var l = document.createElement('label');
      l.textContent = lbl;
      l.setAttribute('style','display:block;margin-bottom:4px;font-size:12px;color:#888888;font-family:inherit');
      var i = document.createElement('input'); i.type = tp||'text'; i.placeholder = ph;
      i.setAttribute('style',[
        'width:100%','padding:10px 14px','background:#1a1a1a','border:1px solid #333333',
        'border-radius:8px','color:#ffffff','font-size:14px','font-family:inherit',
        'box-sizing:border-box','outline:none',
      ].join(';'));
      w.appendChild(l); w.appendChild(i);
      return { wrap:w, inp:i };
    }

    var emailDisplayWrap = document.createElement('div'); emailDisplayWrap.style.marginBottom = '10px';
    emailDisplayWrap.style.display = 'none';
    var emailDisplayLbl = document.createElement('label');
    emailDisplayLbl.textContent = 'Email';
    emailDisplayLbl.setAttribute('style','display:block;margin-bottom:4px;font-size:12px;color:#888888;font-family:inherit');
    var emailDisplayInp = document.createElement('input');
    emailDisplayInp.type = 'email'; emailDisplayInp.readOnly = true;
    emailDisplayInp.setAttribute('style',[
      'width:100%','padding:10px 14px','background:#151515','border:1px solid #1e1e1e',
      'border-radius:8px','color:#555555','font-size:14px','font-family:inherit',
      'box-sizing:border-box','cursor:not-allowed',
    ].join(';'));
    emailDisplayWrap.appendChild(emailDisplayLbl);
    emailDisplayWrap.appendChild(emailDisplayInp);

    var nameF  = mkField('Full name',     'John Smith');
    var phoneF = mkField('Phone number',  '+31 6 12345678', 'tel');
    var brandF = mkField('Car brand',     'e.g. Mercedes');
    var modelF = mkField('Car model',     'e.g. Sprinter');

    formSection.appendChild(formTitle);
    formSection.appendChild(emailDisplayWrap);
    formSection.appendChild(nameF.wrap);
    formSection.appendChild(phoneF.wrap);
    formSection.appendChild(brandF.wrap);
    formSection.appendChild(modelF.wrap);

    // Generate button
    var genBtn = document.createElement('button');
    genBtn.textContent = 'Generate My Render';
    genBtn.disabled = true;
    genBtn.setAttribute('style',[
      'width:100%','padding:14px','background:#333333','color:#888888','border:none',
      'border-radius:8px','font-size:16px','font-weight:700','cursor:not-allowed',
      'font-family:inherit','margin-top:4px','transition:background 0.2s,color 0.2s',
    ].join(';'));

    // Privacy consent (Item 0aa.3) — shown above genBtn until ticked once.
    // Scoped per partner-origin by the browser; no embed-token suffix needed.
    var consentEl = null;
    if (!_consented) {
      consentEl = document.createElement('div');
      consentEl.setAttribute('style', [
        'margin:8px 0 12px','display:flex','align-items:flex-start','gap:10px',
        'font-family:inherit',
      ].join(';'));
      var consentCb = document.createElement('input');
      consentCb.type = 'checkbox';
      consentCb.id   = 'wrapup-consent';
      consentCb.setAttribute('style','accent-color:#D2D915;margin-top:3px;cursor:pointer');
      var consentLb = document.createElement('label');
      consentLb.setAttribute('for','wrapup-consent');
      consentLb.setAttribute('style','color:#ffffff;font-size:13px;line-height:1.4;cursor:pointer');
      consentLb.appendChild(document.createTextNode('I have read and agree to the '));
      var consentLink = document.createElement('a');
      consentLink.href   = 'https://www.wrap-up.ai/privacy';
      consentLink.target = '_blank';
      consentLink.rel    = 'noopener';
      consentLink.setAttribute('style','color:#D2D915;text-decoration:underline');
      consentLink.textContent = 'Privacy Policy';
      // Stop the click bubbling so it does not also toggle the checkbox.
      consentLink.addEventListener('click', function(e) { e.stopPropagation(); });
      consentLb.appendChild(consentLink);
      consentLb.appendChild(document.createTextNode('.'));
      consentEl.appendChild(consentCb);
      consentEl.appendChild(consentLb);
      consentCb.addEventListener('change', function() {
        if (!consentCb.checked) return;
        try { localStorage.setItem('wup_privacy_consent_at', new Date().toISOString()); } catch(e) {}
        _consented = true;
        if (consentEl && consentEl.parentNode) consentEl.parentNode.removeChild(consentEl);
        updateGenBtn(formSection.style.display === 'none' || !!_customerToken);
      });
    }

    // Progress section
    var progressSection = document.createElement('div');
    progressSection.style.display = 'none';
    var progressBar = document.createElement('div');
    progressBar.setAttribute('style',[
      'height:4px','background:linear-gradient(90deg,#D2D915,#a0a010)',
      'border-radius:2px','margin-bottom:10px',
    ].join(';'));
    var progressText = document.createElement('p');
    progressText.textContent = 'Generating your wrap\u2026';
    progressText.setAttribute('style','margin:0;font-size:13px;color:#888888;font-family:inherit;text-align:center');
    progressSection.appendChild(progressBar);
    progressSection.appendChild(progressText);

    mainEl.appendChild(historyBar);
    mainEl.appendChild(countdownEl);
    mainEl.appendChild(uploadSection);
    mainEl.appendChild(colorSection);
    mainEl.appendChild(step1El);
    mainEl.appendChild(formSection);
    if (consentEl) mainEl.appendChild(consentEl);
    mainEl.appendChild(genBtn);
    mainEl.appendChild(progressSection);
    mainEl.appendChild(resultArea);

    // Footer
    var footer = document.createElement('p');
    footer.innerHTML = 'Powered by <a href="https://www.wrap-up.ai" target="_blank" rel="noopener" style="color:#D2D915;text-decoration:none">WRAP-UP.AI</a>';
    footer.setAttribute('style','margin:16px 0 0;font-size:11px;color:#444444;text-align:center;font-family:inherit');

    // Brand-independence disclaimer
    var disclaimer = document.createElement('p');
    disclaimer.textContent = 'WrapUp is an independent service and is not affiliated with, endorsed by, or sponsored by any of the brands we mention. All brand and product names are trademarks of their respective owners.';
    disclaimer.setAttribute('style','margin:4px 0 0;font-size:11px;color:#444444;text-align:center;font-family:inherit;line-height:1.5');

    container.appendChild(mainEl);
    container.appendChild(footer);
    container.appendChild(disclaimer);

    if (!_isFirstRender) {
      formSection.style.display = 'none';
      updateGenBtn(true);
      // Returning visitor: email is already in localStorage so we can render the
      // "Rendering for: …" line immediately. Then confirm state with the server —
      // if the token turns out to be stale, drop it and force re-verification.
      // Paint the email line immediately from localStorage; X/Y line stays hidden
      // until the customer-state fetch returns real counts.
      if (_verifiedEmail) updateCountdown();
      fetch(API_BASE + '/api/widget/customer-state', {
        headers: { 'Authorization': 'Bearer ' + _sessionToken, 'x-customer-token': _customerToken }
      }).then(function(r) {
        if (r.status === 401 || r.status === 404) {
          try {
            localStorage.removeItem('wup_ct_' + EMBED_TOKEN);
            localStorage.removeItem('wup_email_' + EMBED_TOKEN);
          } catch(e) {}
          _customerToken = null;
          _verifiedEmail = '';
          _isFirstRender = true;
          countdownEl.style.display = 'none';
          step1El.style.display = 'block';
          formSection.style.display = 'none';
          return null;
        }
        if (!r.ok) return null;
        return r.json();
      }).then(function(data) {
        if (!data) return;
        _verifiedEmail = data.email || _verifiedEmail;
        _rendersUsed  = Number(data.rendersUsed || 0);
        _rendersTotal = Number(data.freeRenderLimit || 0);
        try { if (_verifiedEmail) localStorage.setItem('wup_email_' + EMBED_TOKEN, _verifiedEmail); } catch(e) {}
        updateCountdown();
        _fetchServerRenderHistory();
        if (_rendersTotal > 0 && _rendersUsed >= _rendersTotal) {
          showPaywall();
        }
      }).catch(function() { /* network hiccup — leave UI as-is; generate call will re-check */ });
    } else {
      updateGenBtn(true);
    }
    renderHistoryBar();
    loadColors();

    // \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080 Helpers \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080

    function updateCountdown() {
      if (!_customerToken) { countdownEl.style.display = 'none'; return; }
      countdownEl.style.display = 'block';
      if (_rendersTotal > 0) {
        var rem = Math.max(0, _rendersTotal - _rendersUsed);
        countdownLine1.style.display = 'block';
        countdownXY.textContent = rem + ' / ' + _rendersTotal;
      } else {
        countdownLine1.style.display = 'none';
      }
      countdownLine2.innerHTML = '';
      if (_verifiedEmail) {
        countdownLine2.appendChild(document.createTextNode('Rendering for: '));
        var emailSpan = document.createElement('span');
        emailSpan.textContent = _verifiedEmail;
        emailSpan.style.color = '#D2D915';
        countdownLine2.appendChild(emailSpan);
      }
    }

    // Paint the thumbnails bar from _renderHistory. Each thumb: image, color name
    // label, download button; clicking the image opens it full-size. Strip shows
    // up to 5 thumbs; if the server reports total > 5, a History button cell is
    // appended that opens the full grid modal.
    function renderHistoryBar() {
      historyBar.innerHTML = '';
      var visible = _renderHistory.slice(0, 5);
      var showHistoryBtn = _renderHistoryTotal > 5;
      if (!visible.length && !showHistoryBtn) { historyBar.style.display = 'none'; return; }
      historyBar.style.display = 'flex';
      visible.forEach(function(item) {
        var cell = document.createElement('div');
        cell.setAttribute('style','position:relative;width:90px;text-align:center;font-family:inherit');
        var thumbWrap = document.createElement('div');
        thumbWrap.setAttribute('style','position:relative;width:100%;padding-top:75%;border-radius:8px;overflow:hidden;background:#1a1a1a;cursor:pointer');
        var img = document.createElement('img');
        img.src = item.imageUrl;
        img.alt = item.colorName || 'render';
        img.setAttribute('style','position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;display:block');
        thumbWrap.appendChild(img);
        thumbWrap.addEventListener('click', function(){ openImageFullscreen(item.imageUrl); });

        var dl = document.createElement('a');
        dl.href = item.imageUrl;
        dl.download = 'wrap-' + (item.colorName ? item.colorName.replace(/[^a-z0-9]+/gi,'-') : 'render') + '.jpg';
        dl.target = '_blank';
        dl.rel = 'noopener';
        dl.title = 'Download';
        dl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
        dl.setAttribute('style','position:absolute;top:6px;right:6px;width:26px;height:26px;border-radius:50%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;text-decoration:none');
        dl.addEventListener('click', function(e){ e.stopPropagation(); });
        thumbWrap.appendChild(dl);

        var label = document.createElement('p');
        label.textContent = item.colorName || '';
        label.setAttribute('style','margin:6px 0 0;font-size:11px;color:#ffffff;font-family:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis');
        if (item.manufacturer) label.title = item.colorName + ' — ' + item.manufacturer;

        cell.appendChild(thumbWrap);
        cell.appendChild(label);
        historyBar.appendChild(cell);
      });
      if (showHistoryBtn) {
        var hCell = document.createElement('div');
        hCell.setAttribute('style','position:relative;width:90px;text-align:center;font-family:inherit');
        var hWrap = document.createElement('div');
        hWrap.setAttribute('style','position:relative;width:100%;padding-top:75%;border-radius:8px;background:#1a1a1a;border:1px solid #333;cursor:pointer');
        var hInner = document.createElement('div');
        hInner.textContent = 'History';
        hInner.setAttribute('style','position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:12px;font-weight:600;font-family:inherit');
        hWrap.appendChild(hInner);
        hWrap.addEventListener('click', _openHistoryModal);
        hCell.appendChild(hWrap);
        historyBar.appendChild(hCell);
      }
    }

    // Fetch the visitor's render history from the server. Replaces in-memory
    // _renderHistory with server-authoritative items (newest first), updates
    // _renderHistoryTotal so the History button appears when total > 5,
    // refreshes the localStorage cache, and repaints the strip. Best-effort;
    // on failure the existing localStorage-backed strip stays in place.
    function _fetchServerRenderHistory() {
      if (!_sessionToken || !_customerToken) return;
      fetch(API_BASE + '/api/widget/renders?limit=5', {
        headers: { 'Authorization': 'Bearer ' + _sessionToken, 'x-customer-token': _customerToken }
      }).then(function(r){ return r.ok ? r.json() : null; })
        .then(function(data) {
          if (!data) return;
          _renderHistory = (data.items || []).map(function(item) {
            return {
              imageUrl: API_BASE + '/api/widget/renders/' + item.id + '/image',
              colorName: item.colorName || '',
              manufacturer: item.manufacturer || '',
            };
          });
          _renderHistoryTotal = Number(data.total || 0);
          try { localStorage.setItem('wup_history_' + EMBED_TOKEN, JSON.stringify(_renderHistory)); } catch(e) {}
          renderHistoryBar();
        }).catch(function(){});
    }

    function addToHistory(item) {
      _renderHistory.push(item);
      var cap = Math.max(3, _rendersTotal || 3);
      if (_renderHistory.length > cap) _renderHistory = _renderHistory.slice(-cap);
      try { localStorage.setItem('wup_history_' + EMBED_TOKEN, JSON.stringify(_renderHistory)); } catch(e) {}
      renderHistoryBar();
    }

    // Simple full-screen image viewer — backdrop click to close, ESC to close, ×
    // button top-right, download link top-left. Used by history thumbs.
    function openImageFullscreen(url) {
      var ov = document.createElement('div');
      ov.setAttribute('style','position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box');
      var img = document.createElement('img');
      img.src = url;
      img.setAttribute('style','max-width:100%;max-height:100%;object-fit:contain;border-radius:8px');
      var close = document.createElement('button');
      close.innerHTML = '&times;';
      close.setAttribute('style','position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.12);color:#fff;border:none;border-radius:50%;width:40px;height:40px;font-size:24px;cursor:pointer;display:flex;align-items:center;justify-content:center');
      var dl = document.createElement('a');
      dl.href = url; dl.download = 'wrap.jpg'; dl.target = '_blank'; dl.rel = 'noopener';
      dl.textContent = 'Download';
      dl.setAttribute('style','position:absolute;top:16px;left:16px;padding:8px 14px;background:#D2D915;color:#000;border-radius:6px;font-size:13px;font-weight:700;text-decoration:none;font-family:inherit');
      function dismiss(){ ov.remove(); document.removeEventListener('keydown', onKey); }
      function onKey(e){ if (e.key === 'Escape') dismiss(); }
      ov.addEventListener('click', function(e){ if (e.target === ov) dismiss(); });
      close.addEventListener('click', dismiss);
      document.addEventListener('keydown', onKey);
      ov.appendChild(img); ov.appendChild(close); ov.appendChild(dl);
      document.body.appendChild(ov);
    }

    // Full-screen history grid modal. Lazy-loads thumbs via IntersectionObserver
    // (falls back to eager src on browsers without it), paginates server-side at
    // 100 per page with a Load-more button when total exceeds the loaded count.
    // Click a thumb → close this modal, open openImageFullscreen with the full
    // image URL.
    function _openHistoryModal() {
      var ov = document.createElement('div');
      ov.setAttribute('style','position:fixed;inset:0;z-index:999998;background:rgba(0,0,0,0.92);display:flex;flex-direction:column;padding:24px;box-sizing:border-box');
      var header = document.createElement('div');
      header.setAttribute('style','display:flex;justify-content:flex-end;margin-bottom:16px;flex-shrink:0');
      var close = document.createElement('button');
      close.innerHTML = '&times;';
      close.setAttribute('style','background:rgba(255,255,255,0.12);color:#fff;border:none;border-radius:50%;width:40px;height:40px;font-size:24px;cursor:pointer;display:flex;align-items:center;justify-content:center');
      header.appendChild(close);
      var body = document.createElement('div');
      body.setAttribute('style','flex:1;overflow-y:auto;padding-right:8px');
      var grid = document.createElement('div');
      grid.setAttribute('style','display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px');
      body.appendChild(grid);
      var loadMoreContainer = document.createElement('div');
      loadMoreContainer.setAttribute('style','margin-top:16px;text-align:center');
      body.appendChild(loadMoreContainer);
      ov.appendChild(header);
      ov.appendChild(body);

      var observer = ('IntersectionObserver' in window) ? new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (entry.isIntersecting) {
            var img = entry.target;
            if (img.dataset.src && !img.src) {
              img.src = img.dataset.src;
              observer.unobserve(img);
            }
          }
        });
      }, { rootMargin: '100px' }) : null;

      var offset = 0;
      var pageSize = 100;
      var loading = false;

      function appendItems(items) {
        items.forEach(function(item) {
          var imageUrl = API_BASE + '/api/widget/renders/' + item.id + '/image';
          var cell = document.createElement('div');
          cell.setAttribute('style','position:relative;cursor:pointer;border-radius:8px;overflow:hidden;background:#1a1a1a');
          var thumbWrap = document.createElement('div');
          thumbWrap.setAttribute('style','position:relative;width:100%;padding-top:75%');
          var img = document.createElement('img');
          if (observer) {
            img.dataset.src = imageUrl;
            observer.observe(img);
          } else {
            img.src = imageUrl;
          }
          img.alt = item.colorName || 'render';
          img.setAttribute('style','position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;display:block');
          thumbWrap.appendChild(img);
          if (item.colorName) {
            var label = document.createElement('div');
            label.textContent = item.colorName;
            label.setAttribute('style','position:absolute;left:0;right:0;bottom:0;background:linear-gradient(transparent,rgba(0,0,0,0.85));color:#ffffff;font-size:11px;padding:18px 8px 6px;text-align:center;font-family:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis');
            thumbWrap.appendChild(label);
          }
          cell.appendChild(thumbWrap);
          cell.addEventListener('click', function(){
            dismiss();
            openImageFullscreen(imageUrl);
          });
          grid.appendChild(cell);
        });
      }

      function loadPage() {
        if (loading) return;
        loading = true;
        loadMoreContainer.innerHTML = '';
        fetch(API_BASE + '/api/widget/renders?limit=' + pageSize + '&offset=' + offset, {
          headers: { 'Authorization': 'Bearer ' + _sessionToken, 'x-customer-token': _customerToken || '' }
        }).then(function(r){ return r.ok ? r.json() : null; })
          .then(function(data) {
            loading = false;
            if (!data) return;
            var items = data.items || [];
            appendItems(items);
            offset += items.length;
            if (offset < Number(data.total || 0)) {
              var btn = document.createElement('button');
              btn.textContent = 'Load more';
              btn.setAttribute('style','padding:10px 20px;background:#222;color:#fff;border:1px solid #333;border-radius:8px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600');
              btn.addEventListener('click', loadPage);
              loadMoreContainer.appendChild(btn);
            }
          }).catch(function(){ loading = false; });
      }

      function dismiss(){ ov.remove(); document.removeEventListener('keydown', onKey); if (observer) observer.disconnect(); }
      function onKey(e){ if (e.key === 'Escape') dismiss(); }
      ov.addEventListener('click', function(e){ if (e.target === ov) dismiss(); });
      close.addEventListener('click', dismiss);
      document.addEventListener('keydown', onKey);
      document.body.appendChild(ov);
      loadPage();
    }

    // Hides the input controls and renders the Buy-Credits paywall in resultArea.
    // Countdown stays visible (showing 0 remaining) so the user understands why.
    function showPaywall() {
      step1El.style.display = 'none';
      formSection.style.display = 'none';
      uploadSection.style.display = 'none';
      colorSection.style.display = 'none';
      genBtn.style.display = 'none';
      resultArea.style.display = 'block';
      resultArea.innerHTML = '';
      resultArea.appendChild(_buildPaywallEl());
    }

    function setS1Status(msg, isErr) {
      s1Status.textContent = msg;
      s1Status.style.color = isErr ? '#e74c3c' : '#4CAF50';
    }

    function isFormReady() {
      return !!(nameF.inp.value.trim() && phoneF.inp.value.trim() &&
                brandF.inp.value.trim() && modelF.inp.value.trim() &&
                _inlineFile && _inlineColorId);
    }

    function updateGenBtn(step3) {
      var ready = step3 ? !!(  _inlineFile && _inlineColorId) : isFormReady();
      var actionable = _consented && (!_customerToken || ready);
      genBtn.disabled = !_consented || (_customerToken ? !ready : false);
      genBtn.style.background = actionable ? '#D2D915' : '#333333';
      genBtn.style.color      = actionable ? '#000000' : '#888888';
      genBtn.style.cursor     = actionable ? 'pointer'  : 'not-allowed';
    }

    function showMain(first) {
      step1El.style.display = 'none';
      emailDisplayInp.value = _verifiedEmail;
      emailDisplayWrap.style.display = 'block';
      try {
        localStorage.setItem('wup_ct_' + EMBED_TOKEN, _customerToken);
        if (_verifiedEmail) localStorage.setItem('wup_email_' + EMBED_TOKEN, _verifiedEmail);
      } catch(e) {}
      updateCountdown();
      formSection.style.display = first ? 'block' : 'none';
      uploadSection.style.display = 'block';
      colorSection.style.display = 'block';
      genBtn.style.display = 'block';
    }

    // File handling
    var heicErrorEl = null;
    function showInlineHeicError() {
      _inlineFile = null;
      uploadIcon.style.display = 'none';
      uploadText.style.display = 'none';
      uploadHint.style.display = 'none';
      fileInput.style.display = 'none';
      uploadArea.style.backgroundImage = '';
      uploadArea.style.borderStyle = 'dashed';
      uploadArea.style.borderColor = '#333333';
      if (heicErrorEl) { heicErrorEl.remove(); heicErrorEl = null; }
      heicErrorEl = _buildHeicErrorEl('dark', function () {
        if (heicErrorEl) { heicErrorEl.remove(); heicErrorEl = null; }
        uploadIcon.style.display = '';
        uploadText.style.display = '';
        uploadHint.style.display = '';
        fileInput.style.display = '';
        fileInput.value = '';
        fileInput.click();
      });
      uploadArea.appendChild(heicErrorEl);
    }
    fileInput.addEventListener('change', function(e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      if (_isHeicFile(file)) { showInlineHeicError(); return; }
      if (file.size > 10 * 1024 * 1024) { alert('File too large. Max 10 MB.'); return; }
      _inlineFile = file;
      var reader = new FileReader();
      reader.onload = function(ev) {
        _inlineOriginalUrl = ev.target.result;
        var img = new Image();
        img.onload = function() { _inlineAspectRatio = (img.naturalHeight / img.naturalWidth) * 100; };
        img.src = ev.target.result;
        uploadArea.style.backgroundImage = 'url(' + ev.target.result + ')';
        uploadArea.style.backgroundSize = 'cover';
        uploadArea.style.backgroundPosition = 'center';
        uploadArea.style.borderStyle = 'solid';
        uploadIcon.style.display = 'none';
        uploadText.style.display = 'none';
        uploadHint.style.display = 'none';
      };
      reader.readAsDataURL(file);
      uploadText.textContent = file.name;
      uploadText.style.color = '#D2D915';
      uploadHint.textContent = (file.size / 1024).toFixed(0) + ' KB';
      uploadArea.style.borderColor = '#D2D915';
      updateGenBtn(formSection.style.display === 'none' || !!_customerToken);
    });
    uploadArea.addEventListener('dragover', function(e) { e.preventDefault(); uploadArea.style.borderColor = '#D2D915'; });
    uploadArea.addEventListener('dragleave', function() { uploadArea.style.borderColor = _inlineFile ? '#D2D915' : '#333333'; });
    uploadArea.addEventListener('drop', function(e) {
      e.preventDefault();
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f) return;
      if (_isHeicFile(f)) { showInlineHeicError(); return; }
      var dt = new DataTransfer(); dt.items.add(f); fileInput.files = dt.files; fileInput.dispatchEvent(new Event('change'));
    });

    // Color grid
    function loadColors() {
      colorGrid.innerHTML = '<p style="font-size:13px;color:#555555;font-family:inherit">Loading colours\u2026</p>';
      fetch(API_BASE + '/api/widget/colors', {
        headers: { 'Authorization': 'Bearer ' + _sessionToken }
      }).then(function(r) { return r.json(); }).then(function(colors) {
        colorGrid.innerHTML = '';
        if (!colors || !colors.length) {
          colorGrid.innerHTML = '<p style="font-size:13px;color:#555555;font-family:inherit">No colours available.</p>';
          return;
        }
        // Brand + finish enumeration with global counts. Counts are NOT
        // cross-filtered: "Gloss (151)" reflects all gloss colours across
        // every brand even when a specific brand is selected.
        var brands = [];
        var brandCounts = {};
        var finishes = [];
        var finishCounts = {};
        colors.forEach(function(c) {
          if (c.manufacturer) {
            if (brands.indexOf(c.manufacturer) === -1) brands.push(c.manufacturer);
            brandCounts[c.manufacturer] = (brandCounts[c.manufacturer] || 0) + 1;
          }
          if (c.category) {
            if (finishes.indexOf(c.category) === -1) finishes.push(c.category);
            finishCounts[c.category] = (finishCounts[c.category] || 0) + 1;
          }
        });
        var activeBrand = 'All';
        var activeFinish = 'All';
        var searchQuery = '';

        // Brand + Finish dropdowns side-by-side, above the search input.
        // Native <select> for accessibility + zero-JS-dep mobile behaviour;
        // dark-themed to match the widget surface (#111 background).
        var filtersRow = document.createElement('div');
        filtersRow.setAttribute('style', 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px');
        var selectStyle = 'width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid #333;border-radius:6px;font-size:13px;font-family:inherit;outline:none;background:#1a1a1a;color:#ffffff;-webkit-appearance:none;appearance:none;cursor:pointer';

        var brandSel = document.createElement('select');
        brandSel.setAttribute('style', selectStyle);
        var brandAll = document.createElement('option');
        brandAll.value = 'All';
        brandAll.textContent = 'All Brands (' + colors.length + ')';
        brandSel.appendChild(brandAll);
        brands.forEach(function(brand) {
          var opt = document.createElement('option');
          opt.value = brand;
          opt.textContent = brand + ' (' + (brandCounts[brand] || 0) + ')';
          brandSel.appendChild(opt);
        });

        var finishSel = document.createElement('select');
        finishSel.setAttribute('style', selectStyle);
        var finishAll = document.createElement('option');
        finishAll.value = 'All';
        finishAll.textContent = 'All Finishes (' + colors.length + ')';
        finishSel.appendChild(finishAll);
        finishes.forEach(function(finish) {
          var opt = document.createElement('option');
          opt.value = finish;
          opt.textContent = finish + ' (' + (finishCounts[finish] || 0) + ')';
          finishSel.appendChild(opt);
        });

        filtersRow.appendChild(brandSel);
        filtersRow.appendChild(finishSel);
        colorGrid.appendChild(filtersRow);

        var searchInp = document.createElement('input');
        searchInp.type = 'text';
        searchInp.placeholder = 'Search colours\u2026';
        searchInp.setAttribute('style', 'width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;font-family:inherit;outline:none;margin-bottom:8px;display:block');
        colorGrid.appendChild(searchInp);

        // Combined counter \u2014 reflects current filter result. Updated at the
        // end of each renderSwatches() pass.
        var counterEl = document.createElement('p');
        counterEl.setAttribute('style', 'margin:0 0 8px;font-size:11px;color:#888888;font-family:inherit');
        colorGrid.appendChild(counterEl);

        var grid = document.createElement('div');
        grid.setAttribute('style', 'display:grid;grid-template-columns:repeat(auto-fill,minmax(52px,1fr));gap:8px;max-height:300px !important;overflow-y:auto !important;padding:4px');
        function renderSwatches() {
          grid.innerHTML = '';
          var q = searchQuery.toLowerCase().trim();
          var matches = colors.filter(function(c) {
            var brandOk = activeBrand === 'All' || c.manufacturer === activeBrand;
            var finishOk = activeFinish === 'All' || c.category === activeFinish;
            var searchOk = !q || (c.name && c.name.toLowerCase().indexOf(q) !== -1) || (c.manufacturer && c.manufacturer.toLowerCase().indexOf(q) !== -1);
            return brandOk && finishOk && searchOk;
          });
          matches.forEach(function(c) {
            var sw = document.createElement('div');
            sw.setAttribute('style', 'cursor:pointer;padding:2px;border:2px solid transparent;text-align:center;transition:border-color .15s');
            sw.setAttribute('data-swatch', c.id);
            var dot = document.createElement('div');
            dot.setAttribute('style', 'width:100%;aspect-ratio:1;border-radius:4px;background:' + (c.hexColor || '#888') + ';background-size:cover;background-position:center');
            if (c.thumbnailUrl) { dot.style.backgroundImage = 'url(' + c.thumbnailUrl + ')'; }
            var nm = document.createElement('span');
            nm.textContent = c.name;
            nm.setAttribute('style', 'margin:0;font-size:9px;color:#aaaaaa;font-family:inherit;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block');
            sw.appendChild(dot);
            sw.appendChild(nm);
            sw.addEventListener('click', function() {
              _inlineColorId = c.id;
              _inlineColorName = c.name;
              grid.querySelectorAll('[data-swatch]').forEach(function(el) { el.style.borderColor = 'transparent'; });
              sw.style.borderColor = '#D2D915';
              selectedColorEl.textContent = 'Selected: ' + c.name + (c.manufacturer ? ' \u2014 ' + c.manufacturer : '');
              updateGenBtn(formSection.style.display === 'none' || !!_customerToken);
            });
            grid.appendChild(sw);
          });
          var anyFilter = activeBrand !== 'All' || activeFinish !== 'All' || q.length > 0;
          counterEl.textContent = matches.length + (anyFilter ? ' colors matching' : ' colors');
        }
        brandSel.addEventListener('change', function() {
          activeBrand = brandSel.value;
          renderSwatches();
        });
        finishSel.addEventListener('change', function() {
          activeFinish = finishSel.value;
          renderSwatches();
        });
        searchInp.addEventListener('input', function() {
          searchQuery = searchInp.value;
          renderSwatches();
        });
        renderSwatches();
        colorGrid.appendChild(grid);
      }).catch(function() {
        colorGrid.innerHTML = '<p style="font-size:13px;color:#e74c3c;font-family:inherit">Failed to load colours.</p>';
      });
    }

    [nameF.inp, phoneF.inp, brandF.inp, modelF.inp].forEach(function(inp) {
      inp.addEventListener('input', function() { if (_isFirstRender) updateGenBtn(false); });
    });

    // \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080 Send code \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080
    function doSendCode() {
      var em = emailInput.value.trim();
      if (!em || !/\S+@\S+\.\S+/.test(em)) { setS1Status('Please enter a valid email address.', true); return; }
      sendCodeBtn.textContent = 'Sending\u2026';
      sendCodeBtn.disabled = true;
      setS1Status('', false);
      fetch(API_BASE + '/api/widget/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em, sessionToken: _sessionToken })
      }).then(function(r) { return r.json(); }).then(function(data) {
        sendCodeBtn.disabled = false;
        if (data.success) {
          _verifiedEmail = em;
          codeSentMsg.textContent = 'We sent a 6-digit code to ' + em;
          codeSection.style.display = 'block';
          codeInput.focus();
          sendCodeBtn.textContent = 'Resend Code';
          setS1Status('', false);
        } else {
          sendCodeBtn.textContent = 'Send Verification Code';
          setS1Status(data.error || 'Failed to send code. Please try again.', true);
        }
      }).catch(function() {
        sendCodeBtn.disabled = false;
        sendCodeBtn.textContent = 'Send Verification Code';
        setS1Status('Network error. Please try again.', true);
      });
    }

    // \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080 Verify code \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080
    function doVerifyCode() {
      var code = codeInput.value.replace(/[^0-9]/g, '').slice(0, 6);
      if (code.length !== 6) { setS1Status('Please enter the 6-digit code.', true); return; }
      verifyCodeBtn.textContent = 'Verifying\u2026';
      verifyCodeBtn.disabled = true;
      setS1Status('', false);
      fetch(API_BASE + '/api/widget/confirm-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: _verifiedEmail, code: code, sessionToken: _sessionToken })
      }).then(function(r) { return r.json(); }).then(function(data) {
        verifyCodeBtn.textContent = 'Verify Code';
        verifyCodeBtn.disabled = false;
        if (data.customerToken) {
          _customerToken  = data.customerToken;
          _rendersUsed    = data.rendersUsed   || 0;
          _rendersTotal   = data.freeRenderLimit || 0;
          _isFirstRender  = (_rendersUsed === 0);
          _fetchServerRenderHistory();
          try {
            if (_verifiedEmail) localStorage.setItem('wup_email_' + EMBED_TOKEN, _verifiedEmail);
            localStorage.setItem('wup_ct_' + EMBED_TOKEN, _customerToken);
          } catch(e) {}
          updateCountdown();
          if (_rendersTotal > 0 && _rendersUsed >= _rendersTotal) {
            mainEl.style.display  = 'block';
            showPaywall();
          } else {
            showMain(_isFirstRender);
            loadColors();
          }
        } else {
          var msg = data.error === 'invalid_code' ? 'Incorrect code. Please try again.' :
                    data.error === 'code_expired'  ? 'Code expired \u2014 click Resend to get a new one.' :
                    (data.error || 'Verification failed. Please try again.');
          setS1Status(msg, true);
        }
      }).catch(function() {
        verifyCodeBtn.textContent = 'Verify Code';
        verifyCodeBtn.disabled = false;
        setS1Status('Network error. Please try again.', true);
      });
    }

    // \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080 Generate render \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080
    function doGenerate() {
      if (_inlineGenerating || genBtn.disabled) return;
      if (!_inlineFile)    { setS1Status('Please upload a photo first.', true); return; }
      if (!_inlineColorId) { setS1Status('Please select a wrap colour.', true); return; }
      if (!_customerToken) { return; }

      _inlineGenerating = true;
      genBtn.disabled   = true;
      genBtn.textContent = 'Generating\u2026';
      genBtn.style.background = '#333333';
      genBtn.style.color      = '#888888';
      genBtn.style.cursor     = 'not-allowed';
      progressSection.style.display = 'block';
      resultArea.style.display      = 'none';

      var formData = new FormData();
      formData.append('image',   _inlineFile);
      formData.append('colorId', String(_inlineColorId));
      if (_isFirstRender) {
        _inlineName     = nameF.inp.value.trim();
        _inlinePhone    = phoneF.inp.value.trim();
        _inlineCarBrand = brandF.inp.value.trim();
        _inlineCarModel = modelF.inp.value.trim();
        formData.append('customerName',  _inlineName);
        formData.append('customerPhone', _inlinePhone);
        formData.append('carBrand',      _inlineCarBrand);
        formData.append('carModel',      _inlineCarModel);
      }

      var progressMsgs = [
        'Generating your wrap\u2026',
        'Applying the colour\u2026',
        'Almost there\u2026',
        'Finishing touches\u2026',
      ];
      var msgIdx = 0;
      progressText.textContent = progressMsgs[0];
      var msgInterval = setInterval(function() {
        msgIdx = (msgIdx + 1) % progressMsgs.length;
        progressText.textContent = progressMsgs[msgIdx];
      }, 3000);

      function stopProgress() { clearInterval(msgInterval); progressSection.style.display = 'none'; }

      fetch(API_BASE + '/api/widget/generate', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + _sessionToken, 'x-customer-token': _customerToken },
        body: formData
      }).then(function(r) {
        if (r.status === 403) {
          return r.json().then(function(d) {
            stopProgress(); resetGenBtn();
            if (d.error === 'render_limit_reached' || d.error === 'invalid_customer_token') {
              showPaywall();
            } else {
              showGenMsg('Access denied. Please refresh and try again.', true);
            }
            return null;
          });
        }
        if (!r.ok) { stopProgress(); resetGenBtn(); showGenMsg('Something went wrong. Please try again.', true); return null; }
        return r.json();
      }).then(function(data) {
        if (!data) return;
        stopProgress();
        _inlineGenerating = false;
        _rendersUsed++;
        _isFirstRender = false;
        updateCountdown();
        // Hide form permanently after first render
        formSection.style.display = 'none';
        // Reset upload + color for next render
        _inlineColorId = null;
        _inlineColorName = '';
        colorGrid.querySelectorAll('[data-swatch]').forEach(function(el) { el.style.borderColor = 'transparent'; });
        selectedColorEl.textContent = '';
        genBtn.textContent = 'Generate My Render';
        updateGenBtn(true);
        // Push the render to the history bar at the top...
        addToHistory({
          imageUrl: data.imageUrl,
          colorName: data.colorName || '',
          manufacturer: data.manufacturer || '',
        });
        // ...and render the before/after slider inline in resultArea.
        // showInlineResult manages resultArea.style.display and innerHTML itself.
        showInlineResult(data);
        // Append the upsell card below every watermarked free render (renders 1..N).
        resultArea.appendChild(_buildUpsellCardEl());
        // If that was the last free render, hide the input controls and append
        // the paywall *below* the slider (appendChild so the slider stays put).
        if (_rendersTotal > 0 && _rendersUsed >= _rendersTotal) {
          uploadSection.style.display = 'none';
          colorSection.style.display = 'none';
          genBtn.style.display = 'none';
          resultArea.appendChild(_buildPaywallEl());
        }
      }).catch(function(err) {
        stopProgress(); resetGenBtn();
        console.error('[WrapUpAI] generate error:', err);
        showGenMsg('Something went wrong. Please try again.', true);
      });
    }

    function resetGenBtn() {
      _inlineGenerating  = false;
      genBtn.textContent = 'Generate My Render';
      updateGenBtn(!_isFirstRender);
    }

    function showGenMsg(msg, isErr) {
      resultArea.style.display = 'block';
      resultArea.innerHTML = '<p style="color:' + (isErr ? '#e74c3c' : '#888888') + ';font-size:14px;font-family:inherit;margin:12px 0">' + msg + '</p>';
    }

    // \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080 Event wiring \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080
    sendCodeBtn.addEventListener('click', doSendCode);
    emailInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') doSendCode(); });
    verifyCodeBtn.addEventListener('click', doVerifyCode);
    codeInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') doVerifyCode(); });
    resendLink.addEventListener('click', function() {
      codeSection.style.display = 'none';
      codeInput.value = '';
      sendCodeBtn.textContent = 'Send Verification Code';
      sendCodeBtn.disabled = false;
      setS1Status('', false);
    });
    genBtn.addEventListener('click', function() {
      if (_customerToken) {
        doGenerate();
      } else {
        step1El.style.display = 'block';
        emailInput.focus();
      }
    });

function showInlineResult(data) {
      resultArea.style.display = 'block';
      resultArea.innerHTML = '';

      // Reset Share state at the start of every render so a second render
      // does not share against stale image refs from the previous one. The
      // pre-load below repopulates these once both source images and the
      // logo decode.
      _shareReady = false;
      _shareOriginalImg = null;
      _shareRenderImg = null;

      // Divider
      var divider = document.createElement('div');
      divider.setAttribute('style', 'border-top:1px solid #222222;margin-bottom:20px');

      // Result heading
      var resultTitle = document.createElement('p');
      resultTitle.textContent = 'Your wrap visualisation';
      resultTitle.setAttribute('style', 'margin:0 0 4px;font-weight:700;color:#ffffff;font-size:16px;font-family:inherit');

      var colorMeta = document.createElement('p');
      colorMeta.textContent = (data.colorName || '') + (data.manufacturer ? ' \u2014 ' + data.manufacturer : '');
      colorMeta.setAttribute('style', 'margin:0 0 16px;font-size:13px;color:#888888;font-family:inherit');

      // Fix 5: Slider container with fixed aspect ratio via padding-top trick.
      // Appended to DOM BEFORE building children so we can read offsetWidth synchronously \u2014
      // this guarantees beforeImg gets the exact px width needed for object-fit:cover to
      // render identically to afterImg from the very first paint.
      var sliderContainer = document.createElement('div');
      sliderContainer.setAttribute('style', [
        'position:relative',
        'width:100%',
        'padding-top:' + _inlineAspectRatio.toFixed(2) + '%',
        'overflow:hidden',
        'border-radius:12px',
        'cursor:ew-resize',
        'user-select:none',
        '-webkit-user-select:none',
        'touch-action:none'
      ].join(';'));

      // Append heading + container to DOM now so we can measure
      resultArea.appendChild(divider);
      resultArea.appendChild(resultTitle);
      resultArea.appendChild(colorMeta);
      resultArea.appendChild(sliderContainer);

      // Read container width synchronously (element is now in the layout)
      var containerW = sliderContainer.getBoundingClientRect().width || sliderContainer.offsetWidth || 300;

      // After image \u2014 absolute, object-fit:cover fills container exactly
      var afterImg = document.createElement('img');
      afterImg.src = data.imageUrl;
      afterImg.alt = 'Wrapped';
      afterImg.setAttribute('style', [
        'position:absolute',
        'top:0', 'left:0',
        'width:100%', 'height:100%',
        'object-fit:cover',
        'display:block',
        'pointer-events:none'
      ].join(';'));

      // Before image \u2014 overflow-hidden wrapper clips it.
      // Wrapper uses top+right+bottom+left:0 so its height tracks the container reliably
      // regardless of the padding-top trick. The before image is given the same px width
      // as the full container so object-fit:cover produces an identical crop to afterImg.
      var beforeWrapper = document.createElement('div');
      beforeWrapper.setAttribute('style', [
        'position:absolute',
        'top:0', 'right:0', 'bottom:0', 'left:0',
        'width:50%',
        'overflow:hidden'
      ].join(';'));
      var beforeImg = document.createElement('img');
      beforeImg.src = _inlineOriginalUrl;
      beforeImg.alt = 'Original';
      beforeImg.setAttribute('style', [
        'position:absolute',
        'top:0', 'left:0',
        'width:' + containerW + 'px',
        'min-width:' + containerW + 'px',
        'height:100%',
        'object-fit:cover',
        'display:block',
        'pointer-events:none'
      ].join(';'));
      beforeWrapper.appendChild(beforeImg);

      // Handle: vertical line + centred circle
      var handleEl = document.createElement('div');
      handleEl.setAttribute('style', [
        'position:absolute',
        'top:0', 'left:50%',
        'height:100%', 'width:0',
        'pointer-events:none'
      ].join(';'));

      var handleLine = document.createElement('div');
      handleLine.setAttribute('style', [
        'position:absolute',
        'top:0', 'left:50%',
        'transform:translateX(-50%)',
        'width:2px', 'height:100%',
        'background:#ffffff'
      ].join(';'));

      var handleCircle = document.createElement('div');
      handleCircle.setAttribute('style', [
        'position:absolute',
        'top:50%', 'left:50%',
        'transform:translate(-50%,-50%)',
        'width:38px', 'height:38px',
        'border-radius:50%',
        'background:#D2D915',
        'display:flex', 'align-items:center', 'justify-content:center',
        'box-shadow:0 2px 10px rgba(0,0,0,0.6)',
        'z-index:2'
      ].join(';'));
      handleCircle.innerHTML = '<svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="#000000" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 1 1 7 5 13"/><polyline points="13 1 17 7 13 13"/></svg>';

      handleEl.appendChild(handleLine);
      handleEl.appendChild(handleCircle);

      // BEFORE / AFTER corner labels
      var labelBefore = document.createElement('div');
      labelBefore.textContent = 'BEFORE';
      labelBefore.setAttribute('style', [
        'position:absolute', 'top:10px', 'left:10px',
        'background:rgba(0,0,0,0.55)', 'color:#ffffff',
        'font-size:11px', 'font-weight:700', 'padding:3px 8px',
        'border-radius:4px', 'letter-spacing:0.08em',
        'pointer-events:none', 'font-family:inherit'
      ].join(';'));

      var labelAfter = document.createElement('div');
      labelAfter.textContent = 'AFTER';
      labelAfter.setAttribute('style', [
        'position:absolute', 'top:10px', 'right:10px',
        'background:rgba(210,217,21,0.9)', 'color:#000000',
        'font-size:11px', 'font-weight:700', 'padding:3px 8px',
        'border-radius:4px', 'letter-spacing:0.08em',
        'pointer-events:none', 'font-family:inherit'
      ].join(';'));

      // Fullscreen expand button \u2014 sits inside sliderContainer, below the AFTER label
      // Matches real app: absolute top-44px right-8px, z-index:10
      var fullscreenBtn = document.createElement('button');
      fullscreenBtn.title = 'View fullscreen';
      fullscreenBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
      fullscreenBtn.setAttribute('style', [
        'position:absolute', 'top:44px', 'right:8px',
        'background:rgba(0,0,0,0.65)', 'color:#D2D915',
        'border:none', 'border-radius:6px',
        'width:32px', 'height:32px',
        'display:flex', 'align-items:center', 'justify-content:center',
        'cursor:pointer', 'z-index:10', 'padding:0', 'box-sizing:border-box'
      ].join(';'));
      fullscreenBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        openFullscreenOverlay(data.imageUrl, _inlineOriginalUrl);
      });
      // iOS Safari fix: stop the touchstart/mousedown from bubbling to
      // sliderContainer's gesture handler. The container's touchstart calls
      // preventDefault(), which suppresses WebKit's synthetic click on the
      // button — so without these listeners, tapping the button on iOS only
      // moves the slider (to the right edge where the button sits) and the
      // click handler above never fires. stopPropagation (NOT preventDefault)
      // is the right tool: it keeps the button's own click intact while
      // preventing the container from intercepting. passive:true on the
      // touchstart signals we will not call preventDefault, allowing iOS to
      // optimize the listener. Slider drag elsewhere in the container is
      // unaffected. See May 1 diagnose for full analysis.
      fullscreenBtn.addEventListener('touchstart', function (e) {
        e.stopPropagation();
      }, { passive: true });
      fullscreenBtn.addEventListener('mousedown', function (e) {
        e.stopPropagation();
      });

      sliderContainer.appendChild(afterImg);
      sliderContainer.appendChild(beforeWrapper);
      sliderContainer.appendChild(handleEl);
      sliderContainer.appendChild(labelBefore);
      sliderContainer.appendChild(labelAfter);
      sliderContainer.appendChild(fullscreenBtn);

      // No extra wrapper needed \u2014 button is inside the container at a safe position
      var sliderWrapper = sliderContainer;

      // \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080 Drag logic (mouse + touch) \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080
      var isDragging = false;

      function setSliderPosition(clientX) {
        var rect = sliderContainer.getBoundingClientRect();
        var x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        var pct = (x / rect.width * 100).toFixed(2);
        beforeWrapper.style.width = pct + '%';
        // Keep beforeImg the same absolute width as the container so object-fit:cover
        // renders identically to the after image regardless of wrapper width
        if (rect.width > 0) {
          beforeImg.style.width = rect.width + 'px';
          beforeImg.style.minWidth = rect.width + 'px';
        }
        handleEl.style.left = pct + '%';
      }

      // Safety rAF: re-sync beforeImg width after first paint (handles any deferred layout)
      requestAnimationFrame(function () {
        var w = sliderContainer.offsetWidth;
        if (w > 0 && w !== containerW) {
          beforeImg.style.width = w + 'px';
          beforeImg.style.minWidth = w + 'px';
        }
      });

      sliderContainer.addEventListener('mousedown', function (e) {
        isDragging = true;
        setSliderPosition(e.clientX);
        e.preventDefault();
      });
      document.addEventListener('mousemove', function (e) {
        if (isDragging) setSliderPosition(e.clientX);
      });
      document.addEventListener('mouseup', function () { isDragging = false; });

      sliderContainer.addEventListener('touchstart', function (e) {
        isDragging = true;
        setSliderPosition(e.touches[0].clientX);
        e.preventDefault();
      }, { passive: false });
      sliderContainer.addEventListener('touchmove', function (e) {
        if (isDragging) setSliderPosition(e.touches[0].clientX);
        e.preventDefault();
      }, { passive: false });
      sliderContainer.addEventListener('touchend', function () { isDragging = false; });

      // Share-to-Instagram button (Tier 1 Growth Loops). Style matches the
      // upsell card secondary outline button at _buildUpsellCardEl. Inline
      // SVG (lucide Share2 path) — no emojis per GR 3. Starts disabled; the
      // non-blocking pre-load below enables it once both source images and
      // the WrapUp logo asset decode. Pre-load is async on purpose: the
      // slider must render immediately, not block on image decode.
      var shareBtn = document.createElement('button');
      shareBtn.type = 'button';
      shareBtn.setAttribute('aria-label', 'Share');
      shareBtn.disabled = true;
      shareBtn.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
        ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' +
        ' style="margin-right:8px;vertical-align:-3px">' +
        '<circle cx="18" cy="5" r="3"/>' +
        '<circle cx="6" cy="12" r="3"/>' +
        '<circle cx="18" cy="19" r="3"/>' +
        '<line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>' +
        '<line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>' +
        '</svg>Share';
      shareBtn.setAttribute('style', [
        'display:inline-flex', 'align-items:center', 'justify-content:center',
        'margin-top:14px',
        'padding:11px 20px', 'background:transparent', 'color:#ffffff',
        'border:1px solid #444444', 'border-radius:8px',
        'font-size:14px', 'font-weight:600',
        'font-family:inherit',
        'cursor:not-allowed', 'opacity:0.5',
        'transition:opacity 0.2s'
      ].join(';'));

      shareBtn.addEventListener('click', function () {
        if (shareBtn.disabled || shareBtn.dataset.busy === 'true') return;
        if (!_shareReady || !_shareOriginalImg || !_shareRenderImg) return;
        shareBtn.dataset.busy = 'true';

        var caption = _shareBuildCaption(data.manufacturer, data.colorName);

        var clipPromise = (navigator.clipboard && navigator.clipboard.writeText)
          ? navigator.clipboard.writeText(caption).catch(function (e) {
              console.warn('[share] clipboard write failed:', e);
            })
          : Promise.resolve();

        clipPromise.then(function () {
          return _shareBuildComposite(_shareOriginalImg, _shareRenderImg, 'widget');
        }).then(function (blob) {
          var file = new File([blob], 'wrap-up-ai-share.jpg', { type: 'image/jpeg' });

          // Fire-and-forget analytics. Auth header lets the server resolve
          // partner_id from the widget session HMAC. No designId — widget
          // renders live in partner_renders, not generated_images.
          fetch(API_BASE + '/api/share-intent', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + _sessionToken
            },
            body: JSON.stringify({ surface: 'widget' })
          }).catch(function () {});

          // Restrict native share to mobile. Desktop Chrome advertises
          // navigator.share for files but rejects with AbortError immediately
          // when called from a stale user-activation context — composite
          // build (~250KB JPG) outlasts the gesture window, no share sheet
          // ever appears, and the silent-dismiss path looks like a broken
          // button. Desktop always uses the download fallback.
          var isMobile = (navigator.userAgentData && navigator.userAgentData.mobile === true)
            || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          var canShareFiles = isMobile
            && typeof navigator.share === 'function'
            && typeof navigator.canShare === 'function'
            && navigator.canShare({ files: [file] });

          if (canShareFiles) {
            // Files-only payload — passing text alongside files on iOS
            // Safari can drop the file at certain share targets including
            // Instagram. The caption is on the clipboard for the user to
            // paste into the Instagram caption field.
            return navigator.share({ files: [file] }).then(function () {
              _showShareToast('Caption copied — paste it in Instagram after the image opens.');
            }).catch(function (err) {
              if (err && err.name !== 'AbortError') throw err;
              // user dismissed the share sheet — silent
            });
          } else {
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'wrap-up-ai-share.jpg';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
            _showShareToast('Image downloaded. Caption copied to clipboard. Paste it when you upload to Instagram.');
          }
        }).catch(function (err) {
          console.error('[share] failed:', err);
          _showShareToast('Share failed. Please try again.');
        }).then(function () {
          shareBtn.dataset.busy = 'false';
        });
      });

      resultArea.appendChild(shareBtn);

      // Pre-load source images + logo in parallel. Does NOT block slider
      // render — slider has already painted by the time we reach this
      // point. When all three decode, flip _shareReady and enable the
      // button. Failure leaves the button disabled (Download still works
      // through the existing pathways elsewhere in the widget).
      Promise.all([
        _shareLoadImage(data.imageUrl),
        _shareLoadImage(_inlineOriginalUrl),
        _shareLoadLogo()
      ]).then(function (results) {
        _shareRenderImg = results[0];
        _shareOriginalImg = results[1];
        _shareReady = true;
        shareBtn.disabled = false;
        shareBtn.style.opacity = '1';
        shareBtn.style.cursor = 'pointer';
      }).catch(function (err) {
        console.warn('[share] preload failed:', err);
      });

      // Note: divider, resultTitle, colorMeta, sliderContainer were already appended
      // to resultArea above (before measuring containerW). Nothing more to append here.

      resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Fix 6: Fullscreen overlay with Before / After toggle
    function openFullscreenOverlay(afterUrl, beforeUrl) {
      var fsOverlay = document.createElement('div');
      fsOverlay.setAttribute('style', [
        'position:fixed', 'inset:0', 'z-index:9999999',
        'background:rgba(0,0,0,0.95)',
        'display:flex', 'flex-direction:column',
        'align-items:center', 'justify-content:center',
        'padding:20px', 'box-sizing:border-box'
      ].join(';'));

      var fsImg = document.createElement('img');
      fsImg.src = afterUrl;
      fsImg.setAttribute('style', [
        'max-width:100%',
        'max-height:calc(100vh - 100px)',
        'object-fit:contain',
        'border-radius:10px',
        'display:block'
      ].join(';'));

      // Before / After toggle row
      var btnRow = document.createElement('div');
      btnRow.setAttribute('style', 'display:flex;gap:12px;margin-top:18px');

      function makeToggleBtn(label, isActive) {
        var b = document.createElement('button');
        b.textContent = label;
        b.setAttribute('style', [
          'padding:9px 28px',
          'border-radius:8px',
          'border:2px solid ' + (isActive ? '#D2D915' : '#444444'),
          'background:' + (isActive ? '#D2D915' : 'transparent'),
          'color:' + (isActive ? '#000000' : '#ffffff'),
          'font-size:13px', 'font-weight:700',
          'cursor:pointer', 'font-family:inherit',
          'letter-spacing:0.08em',
          'transition:background 0.15s,border-color 0.15s,color 0.15s'
        ].join(';'));
        return b;
      }

      var afterToggle  = makeToggleBtn('AFTER', true);
      var beforeToggle = makeToggleBtn('BEFORE', false);

      function setActive(showAfter) {
        fsImg.src = showAfter ? afterUrl : beforeUrl;
        afterToggle.style.background    = showAfter ? '#D2D915'     : 'transparent';
        afterToggle.style.borderColor   = showAfter ? '#D2D915'     : '#444444';
        afterToggle.style.color         = showAfter ? '#000000'     : '#ffffff';
        beforeToggle.style.background   = showAfter ? 'transparent' : '#D2D915';
        beforeToggle.style.borderColor  = showAfter ? '#444444'     : '#D2D915';
        beforeToggle.style.color        = showAfter ? '#ffffff'     : '#000000';
      }

      afterToggle.addEventListener('click',  function (e) { e.stopPropagation(); setActive(true);  });
      beforeToggle.addEventListener('click', function (e) { e.stopPropagation(); setActive(false); });

      btnRow.appendChild(beforeToggle);
      btnRow.appendChild(afterToggle);

      // Close button (top-right \u00c3\u0083\u00c2\u0083\u00c3\u0082\u00c2\u0097)
      var fsClose = document.createElement('button');
      fsClose.innerHTML = '&times;';
      fsClose.setAttribute('style', [
        'position:absolute', 'top:16px', 'right:16px',
        'background:rgba(255,255,255,0.12)', 'color:#ffffff',
        'border:none', 'border-radius:50%',
        'width:38px', 'height:38px',
        'font-size:22px', 'line-height:1',
        'cursor:pointer', 'display:flex',
        'align-items:center', 'justify-content:center',
        'z-index:10'
      ].join(';'));
      fsClose.addEventListener('click', function (e) {
        e.stopPropagation();
        fsOverlay.remove();
      });

      // Click backdrop to dismiss
      fsOverlay.addEventListener('click', function () { fsOverlay.remove(); });
      fsImg.addEventListener('click',    function (e) { e.stopPropagation(); });
      btnRow.addEventListener('click',   function (e) { e.stopPropagation(); });

      fsOverlay.appendChild(fsImg);
      fsOverlay.appendChild(btnRow);
      fsOverlay.appendChild(fsClose);
      document.body.appendChild(fsOverlay);
    }
  }

  // \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080 7. Start \u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080\u00c3\u0083\u00c2\u00a2\u00c3\u0082\u00c2\u0094\u00c3\u0082\u00c2\u0080
  // ===== TICKET MODAL (v36 Items 0b+0c) =====
  // Vanilla-JS parallel of client/src/components/ticket-dialog.tsx. Same
  // data contract (POST /api/tickets, surface='widget') and same validation
  // rules. Background #111111, no emojis, no backdrop-blur per GR 3 + GR 5.
  function openTicketModal() {
    if (document.getElementById('wrapup-ticket-overlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'wrapup-ticket-overlay';
    overlay.setAttribute('style', [
      'position:fixed', 'inset:0', 'z-index:9999999',
      'background:rgba(0,0,0,0.6)',
      'display:flex', 'align-items:center', 'justify-content:center',
      'padding:16px', 'box-sizing:border-box',
      'font-family:system-ui,-apple-system,sans-serif'
    ].join(';'));

    var panel = document.createElement('div');
    panel.setAttribute('style', [
      'background:#111111', 'border:1px solid #333333', 'border-radius:12px',
      'width:100%', 'max-width:440px', 'max-height:90vh', 'overflow-y:auto',
      'padding:24px', 'box-sizing:border-box', 'color:#ffffff', 'position:relative'
    ].join(';'));

    var title = document.createElement('h2');
    title.textContent = 'Submit a ticket';
    title.setAttribute('style', 'margin:0 0 6px;font-size:18px;font-weight:700;color:#ffffff;font-family:inherit');

    var sub = document.createElement('p');
    sub.textContent = "Tell us what's wrong or what's missing.";
    sub.setAttribute('style', 'margin:0 0 16px;font-size:13px;color:#888888;font-family:inherit');

    var descLabel = document.createElement('label');
    descLabel.textContent = 'What happened?';
    descLabel.setAttribute('style', 'display:block;margin:0 0 6px;font-size:13px;color:#cccccc;font-family:inherit');

    var descEl = document.createElement('textarea');
    descEl.rows = 6;
    descEl.maxLength = 2000;
    descEl.placeholder = 'Describe the issue or your suggestion...';
    descEl.setAttribute('style', [
      'display:block', 'width:100%', 'box-sizing:border-box',
      'padding:10px 12px', 'background:#1a1a1a', 'color:#ffffff',
      'border:1px solid #333333', 'border-radius:8px',
      'font-size:14px', 'font-family:inherit', 'resize:vertical', 'outline:none'
    ].join(';'));

    var counter = document.createElement('p');
    counter.textContent = '0 / 2000';
    counter.setAttribute('style', 'margin:4px 0 16px;font-size:11px;color:#666666;text-align:right;font-family:inherit');

    var emailLabel = document.createElement('label');
    emailLabel.textContent = 'Email (optional)';
    emailLabel.setAttribute('style', 'display:block;margin:0 0 6px;font-size:13px;color:#cccccc;font-family:inherit');

    var emailEl = document.createElement('input');
    emailEl.type = 'email';
    emailEl.placeholder = 'you@example.com';
    emailEl.value = (function () {
      try { return localStorage.getItem('wup_email_' + EMBED_TOKEN) || ''; }
      catch (e) { return ''; }
    })();
    emailEl.setAttribute('style', [
      'display:block', 'width:100%', 'box-sizing:border-box',
      'padding:10px 12px', 'background:#1a1a1a', 'color:#ffffff',
      'border:1px solid #333333', 'border-radius:8px',
      'font-size:14px', 'font-family:inherit', 'outline:none'
    ].join(';'));

    var emailHint = document.createElement('p');
    emailHint.textContent = "Add an email if you'd like a reply. Otherwise leave blank.";
    emailHint.setAttribute('style', 'margin:4px 0 16px;font-size:11px;color:#666666;font-family:inherit');

    var errorEl = document.createElement('p');
    errorEl.setAttribute('style', 'margin:0 0 12px;font-size:13px;color:#ff6b6b;font-family:inherit;display:none');

    var btnRow = document.createElement('div');
    btnRow.setAttribute('style', 'display:flex;gap:8px;justify-content:flex-end;margin-top:8px');

    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.setAttribute('style', [
      'padding:10px 16px', 'background:transparent', 'color:#cccccc',
      'border:1px solid #444444', 'border-radius:8px',
      'font-size:14px', 'font-weight:600', 'font-family:inherit', 'cursor:pointer'
    ].join(';'));

    var submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.textContent = 'Submit ticket';
    submitBtn.setAttribute('style', [
      'padding:10px 16px', 'background:#D2D915', 'color:#000000',
      'border:0', 'border-radius:8px',
      'font-size:14px', 'font-weight:700', 'font-family:inherit', 'cursor:pointer'
    ].join(';'));

    function emailValid() {
      var e = emailEl.value.trim();
      if (e.length === 0) return true;
      return /^\S+@\S+\.\S+$/.test(e);
    }
    function descValid() {
      return descEl.value.trim().length >= 10;
    }
    function updateSubmitState() {
      var ok = descValid() && emailValid();
      submitBtn.disabled = !ok;
      submitBtn.style.opacity = ok ? '1' : '0.5';
      submitBtn.style.cursor = ok ? 'pointer' : 'not-allowed';
    }
    descEl.addEventListener('input', function () {
      counter.textContent = descEl.value.length + ' / 2000';
      updateSubmitState();
    });
    emailEl.addEventListener('input', updateSubmitState);
    updateSubmitState();

    var isSubmitting = false;
    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.style.display = 'block';
    }
    function clearError() {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }

    function showSuccessState() {
      panel.innerHTML = '';
      var ok = document.createElement('p');
      ok.textContent = 'Ticket submitted. Thanks!';
      ok.setAttribute('style', 'margin:0 0 16px;font-size:16px;font-weight:700;color:#ffffff;font-family:inherit;text-align:center');
      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.textContent = 'Close';
      closeBtn.setAttribute('style', [
        'display:block', 'margin:0 auto', 'padding:10px 20px',
        'background:#D2D915', 'color:#000000', 'border:0', 'border-radius:8px',
        'font-size:14px', 'font-weight:700', 'font-family:inherit', 'cursor:pointer'
      ].join(';'));
      closeBtn.addEventListener('click', dismiss);
      panel.appendChild(ok);
      panel.appendChild(closeBtn);
      setTimeout(dismiss, 2000);
    }

    function doSubmit() {
      if (isSubmitting) return;
      if (!descValid() || !emailValid()) return;
      isSubmitting = true;
      clearError();
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
      var headers = { 'Content-Type': 'application/json' };
      if (_sessionToken) headers['Authorization'] = 'Bearer ' + _sessionToken;
      var bodyVal = {
        description: descEl.value.trim(),
        email: emailEl.value.trim() || undefined,
        surface: 'widget',
        viewport: window.innerWidth + 'x' + window.innerHeight,
        url: window.location.href
      };
      fetch('https://wrap-up.ai/api/tickets', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(bodyVal)
      }).then(function (res) {
        if (res.status === 201) {
          showSuccessState();
          return null;
        }
        return res.text().then(function (raw) {
          var detail = raw || ('HTTP ' + res.status);
          if (raw) {
            try {
              var parsed = JSON.parse(raw);
              if (parsed && typeof parsed.message === 'string') detail = parsed.message;
              else if (parsed && typeof parsed.error === 'string') detail = parsed.error;
            } catch (e) { /* not JSON */ }
          }
          throw new Error(detail);
        });
      }).catch(function (err) {
        isSubmitting = false;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit ticket';
        updateSubmitState();
        showError(err && err.message ? err.message : 'Network error. Please try again.');
      });
    }

    cancelBtn.addEventListener('click', dismiss);
    submitBtn.addEventListener('click', doSubmit);

    function dismiss() {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') dismiss(); }

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) dismiss();
    });
    document.addEventListener('keydown', onKey);

    panel.appendChild(title);
    panel.appendChild(sub);
    panel.appendChild(descLabel);
    panel.appendChild(descEl);
    panel.appendChild(counter);
    panel.appendChild(emailLabel);
    panel.appendChild(emailEl);
    panel.appendChild(emailHint);
    panel.appendChild(errorEl);
    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(submitBtn);
    panel.appendChild(btnRow);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    setTimeout(function () { try { descEl.focus(); } catch (e) { /* focus best-effort */ } }, 50);
  }
  // ===== END TICKET MODAL =====

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
