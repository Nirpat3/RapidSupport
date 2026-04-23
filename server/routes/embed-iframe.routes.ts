/**
 * Embed iframe — serves the static HTML chat page at /embed/chat.
 *
 * The mobile/web app embeds this as an iframe with a ?token=... query param.
 * Page bootstraps by POSTing the token to /api/embed/chat/session, then
 * opens a WebSocket and renders a minimal chat UI.
 *
 * Vanilla JS (no framework) so it loads fast in mobile WebViews. One HTTP
 * round-trip after page-load before the UI is ready.
 */
import type { RouteContext } from './types';

const EMBED_FRAME_ANCESTORS = process.env.EMBED_FRAME_ANCESTORS || "*";

const EMBED_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Support Chat</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #ffffff;
    --fg: #1a1a1a;
    --muted: #6b7280;
    --border: #e5e7eb;
    --primary: #3b82f6;
    --primary-fg: #ffffff;
    --bubble-customer: #3b82f6;
    --bubble-customer-fg: #ffffff;
    --bubble-agent: #f3f4f6;
    --bubble-agent-fg: #111827;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0b0f19;
      --fg: #f3f4f6;
      --muted: #9ca3af;
      --border: #1f2937;
      --bubble-agent: #1f2937;
      --bubble-agent-fg: #f3f4f6;
    }
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; height: 100%; background: var(--bg); color: var(--fg); font: 15px/1.4 -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Roboto, sans-serif; }
  #app { display: flex; flex-direction: column; height: 100%; }
  header { padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; }
  header .dot { width: 8px; height: 8px; border-radius: 50%; background: #9ca3af; }
  header .dot.connected { background: #10b981; }
  header h1 { margin: 0; font-size: 15px; font-weight: 600; flex: 1; }
  header .sub { font-size: 12px; color: var(--muted); }
  #messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
  .msg { max-width: 85%; padding: 9px 13px; border-radius: 18px; word-wrap: break-word; white-space: pre-wrap; font-size: 14px; line-height: 1.4; }
  .msg.customer { align-self: flex-end; background: var(--bubble-customer); color: var(--bubble-customer-fg); border-bottom-right-radius: 4px; }
  .msg.agent { align-self: flex-start; background: var(--bubble-agent); color: var(--bubble-agent-fg); border-bottom-left-radius: 4px; }
  .msg.system { align-self: center; background: transparent; color: var(--muted); font-size: 12px; font-style: italic; }
  .msg .meta { display: block; font-size: 11px; opacity: 0.7; margin-top: 3px; }
  footer { border-top: 1px solid var(--border); padding: 10px; display: flex; gap: 8px; align-items: flex-end; background: var(--bg); }
  #input { flex: 1; resize: none; max-height: 120px; min-height: 40px; padding: 10px 12px; border: 1px solid var(--border); border-radius: 20px; background: var(--bg); color: var(--fg); font: inherit; outline: none; }
  #input:focus { border-color: var(--primary); }
  #send { width: 40px; height: 40px; border-radius: 50%; border: none; background: var(--primary); color: var(--primary-fg); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; transition: transform 0.1s; }
  #send:disabled { opacity: 0.4; cursor: not-allowed; }
  #send:active:not(:disabled) { transform: scale(0.92); }
  #status { padding: 10px 16px; text-align: center; color: var(--muted); font-size: 13px; }
  #status.error { color: #dc2626; }
</style>
</head>
<body>
<div id="app" hidden>
  <header>
    <span class="dot" id="statusDot"></span>
    <div>
      <h1 id="storeName">Support</h1>
      <div class="sub" id="username"></div>
    </div>
  </header>
  <div id="messages"></div>
  <footer>
    <textarea id="input" rows="1" placeholder="Type a message..." autocomplete="off"></textarea>
    <button id="send" type="button" aria-label="Send">➤</button>
  </footer>
</div>
<div id="status">Connecting…</div>
<script>
(function(){
  var token = new URLSearchParams(location.search).get('token');
  var statusEl = document.getElementById('status');
  var appEl = document.getElementById('app');
  var messagesEl = document.getElementById('messages');
  var inputEl = document.getElementById('input');
  var sendBtn = document.getElementById('send');
  var statusDot = document.getElementById('statusDot');
  var storeNameEl = document.getElementById('storeName');
  var usernameEl = document.getElementById('username');

  if (!token) {
    statusEl.className = 'error';
    statusEl.textContent = 'Missing token in URL.';
    return;
  }

  var session = null;
  var ws = null;
  var reconnectAttempt = 0;

  function setError(msg) {
    statusEl.className = 'error';
    statusEl.textContent = msg;
    appEl.hidden = true;
  }

  function appendMessage(m) {
    var div = document.createElement('div');
    div.className = 'msg ' + (m.senderType === 'customer' ? 'customer' : m.senderType === 'system' ? 'system' : 'agent');
    div.textContent = m.content || '';
    if (m.senderType !== 'system') {
      var meta = document.createElement('span');
      meta.className = 'meta';
      var ts = m.createdAt ? new Date(m.createdAt) : new Date();
      meta.textContent = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      div.appendChild(meta);
    }
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function setConnected(on) {
    if (on) statusDot.classList.add('connected'); else statusDot.classList.remove('connected');
  }

  function openWebSocket() {
    try { if (ws) ws.close(); } catch(e) {}
    var url = session.wsUrl + '?customerId=' + encodeURIComponent(session.customerId) +
              '&sessionId=' + encodeURIComponent(session.sessionId);
    ws = new WebSocket(url);
    ws.onopen = function(){ setConnected(true); reconnectAttempt = 0; };
    ws.onclose = function(){
      setConnected(false);
      reconnectAttempt++;
      if (reconnectAttempt <= 10) {
        var delay = Math.min(30000, 1000 * Math.pow(2, reconnectAttempt - 1));
        setTimeout(openWebSocket, delay);
      }
    };
    ws.onerror = function(){ setConnected(false); };
    ws.onmessage = function(ev){
      try {
        var payload = JSON.parse(ev.data);
        // Accept a few common shapes from this codebase
        var msg = payload.message || payload.data || payload;
        if (msg && msg.conversationId && msg.conversationId !== session.conversationId) return;
        if (msg && msg.content) {
          // Skip echoes of our own customer messages — they're optimistically appended
          if (msg.senderType === 'customer' && msg.id && document.querySelector('[data-msg-id="' + msg.id + '"]')) return;
          appendMessage({
            content: msg.content,
            senderType: msg.senderType || (msg.isStaff ? 'agent' : 'agent'),
            createdAt: msg.createdAt,
          });
        }
      } catch(e) { /* non-JSON or irrelevant frame */ }
    };
  }

  function loadHistory() {
    return fetch('/api/customer-chat/messages/' + encodeURIComponent(session.conversationId), { credentials: 'include' })
      .then(function(r){ return r.ok ? r.json() : []; })
      .then(function(list){
        (list || []).forEach(function(m){
          appendMessage({
            content: m.content,
            senderType: m.senderType || (m.isStaff ? 'agent' : 'customer'),
            createdAt: m.createdAt,
          });
        });
      })
      .catch(function(){ /* ignore — start empty */ });
  }

  function sendMessage() {
    var text = inputEl.value.trim();
    if (!text || !session) return;
    inputEl.value = '';
    inputEl.style.height = 'auto';

    // Optimistic append
    appendMessage({ content: text, senderType: 'customer', createdAt: new Date().toISOString() });

    fetch('/api/customer-chat/send-message', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: session.conversationId,
        customerId: session.customerId,
        content: text,
        senderType: 'customer',
      }),
    }).catch(function(err){
      var errMsg = document.createElement('div');
      errMsg.className = 'msg system';
      errMsg.textContent = 'Failed to send. Retry?';
      messagesEl.appendChild(errMsg);
    });
  }

  inputEl.addEventListener('input', function(){
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(120, inputEl.scrollHeight) + 'px';
    sendBtn.disabled = inputEl.value.trim().length === 0;
  });
  inputEl.addEventListener('keydown', function(e){
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  sendBtn.addEventListener('click', sendMessage);
  sendBtn.disabled = true;

  // Bootstrap
  fetch('/api/embed/chat/session', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: token }),
  }).then(function(r){
    if (!r.ok) return r.json().then(function(e){ throw new Error(e.error || 'session failed'); });
    return r.json();
  }).then(function(s){
    session = s;
    storeNameEl.textContent = s.storeName || 'Support';
    usernameEl.textContent = s.username || '';
    statusEl.style.display = 'none';
    appEl.hidden = false;
    inputEl.focus();
    return loadHistory().then(openWebSocket);
  }).catch(function(err){
    setError((err && err.message) || 'Failed to start chat.');
  });
})();
</script>
</body>
</html>`;

export function registerEmbedIframeRoutes({ app }: RouteContext) {
  app.get('/embed/chat', (req, res) => {
    // Iframe-safe headers. Default policy allows any parent frame; tighten
    // via EMBED_FRAME_ANCESTORS env var to restrict to your app's domains.
    res.setHeader('Content-Security-Policy', `frame-ancestors ${EMBED_FRAME_ANCESTORS}`);
    res.removeHeader('X-Frame-Options');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(EMBED_HTML);
  });
}
