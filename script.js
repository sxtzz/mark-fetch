(function() {
  const urlInput = document.getElementById('urlInput');
  const fetchBtn = document.getElementById('fetchBtn');
  const previewBox = document.getElementById('previewBox');
  const outputArea = document.getElementById('outputArea');
  const downloadBtn = document.getElementById('downloadBtn');
  const clearBtn = document.getElementById('clearBtn');
  const copyBtn = document.getElementById('copyBtn');
  const wordWrapBtn = document.getElementById('wordWrapBtn');
  const charCount = document.getElementById('charCount');
  const wordCount = document.getElementById('wordCount');
  const urlInfo = document.getElementById('urlInfo');
  const statusDot = document.getElementById('statusDot');
  const statusLabel = document.getElementById('statusLabel');
  const themeToggle = document.getElementById('themeToggle');

  let currentMarkdown = '';
  let lastFetchedUrl = '';
  let currentMode = 'standard';
  let wordWrap = false;
  let darkTheme = true;

  themeToggle.addEventListener('click', function() {
    darkTheme = !darkTheme;
    document.documentElement.setAttribute('data-theme', darkTheme ? 'dark' : 'light');
    const svg = this.querySelector('svg');
    if (darkTheme) {
      svg.innerHTML = '<path d="M12 3a6 6 0 0 0 9 9 6 6 0 1 1-9-9Z"/>';
    } else {
      svg.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
    }
  });

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentMode = this.dataset.mode;
      if (currentMarkdown) renderMarkdown(currentMarkdown);
      updateStatus('Mode: ' + currentMode);
    });
  });

  function updateStatus(text, isGood = true) {
    statusLabel.textContent = text;
    statusDot.className = 'dot' + (isGood ? ' active' : '');
  }

  function renderMarkdown(md) {
    currentMarkdown = md;
    const trimmed = md.trim();
    if (!trimmed) {
      previewBox.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/><path d="M8 8h8"/><path d="M8 12h6"/><path d="M8 16h4"/></svg>
          <span>markdown preview</span>
          <span class="hint">paste a URL and convert</span>
        </div>
      `;
      charCount.textContent = '0 chars';
      wordCount.textContent = '0 words';
      return;
    }

    let processed = md;
    if (currentMode === 'clean') {
      processed = processed.replace(/\*\*(.*?)\*\*/g, '$1');
      processed = processed.replace(/\*(.*?)\*/g, '$1');
      processed = processed.replace(/\[(.*?)\]\(.*?\)/g, '$1');
      processed = processed.replace(/^[\-\*]\s+/gim, '• ');
      processed = processed.replace(/^>\s+/gim, '');
    } else if (currentMode === 'raw') {
      let html = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      previewBox.innerHTML = `<pre style="white-space:pre-wrap;font-family:inherit;margin:0;color:var(--text-primary);">${html}</pre>`;
      const words = md.split(/\s+/).filter(w => w.length > 0).length;
      charCount.textContent = md.length + ' chars';
      wordCount.textContent = words + ' words';
      return;
    }

    let html = processed
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^[\-\*]\s+(.*)$/gim, '<li>$1</li>')
      .replace(/^\d+\.\s+(.*)$/gim, '<li>$1</li>')
      .replace(/^>\s+(.*)$/gim, '<blockquote>$1</blockquote>')
      .replace(/^---$/gim, '<hr>')
      .split('\n\n').map(para => {
        if (para.trim() === '') return '';
        if (para.match(/^<[h1|h2|h3|ul|ol|li|blockquote|hr]/)) return para;
        if (para.match(/^<li>/)) return para;
        return `<p>${para}</p>`;
      }).join('');

    html = html.replace(/(<li>.*?<\/li>)\s*(?=<li>)/g, '$1');
    html = html.replace(/(<li>.*?<\/li>)+/g, (match) => `<ul>${match}</ul>`);

    previewBox.innerHTML = html;
    const words = md.split(/\s+/).filter(w => w.length > 0).length;
    charCount.textContent = md.length + ' chars';
    wordCount.textContent = words + ' words';
  }

  async function fetchWithDefuddle(url) {
    const apiUrl = `https://defuddle.md/${url}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'text/markdown' }
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`API ${response.status}`);
      return await response.text();
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('Timeout (20s)');
      throw new Error(error.message);
    }
  }

  async function fetchWebpage(url) {
    let cleanUrl = url.trim();
    if (!cleanUrl) { alert('Enter a URL.'); return; }
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    outputArea.classList.add('visible');
    previewBox.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
        <span>fetching…</span>
        <span class="hint">${cleanUrl.replace(/^https?:\/\//, '')}</span>
      </div>
    `;
    updateStatus('Fetching…', true);

    try {
      const markdown = await fetchWithDefuddle(cleanUrl);
      if (!markdown || markdown.trim().length < 6) throw new Error('No readable content.');
      renderMarkdown(markdown);
      lastFetchedUrl = cleanUrl;
      urlInfo.textContent = cleanUrl;
      updateStatus('Done', true);
    } catch (err) {
      previewBox.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>${err.message}</span>
          <span class="hint">try another URL</span>
        </div>
      `;
      updateStatus('Error', false);
    }
  }

  function downloadMarkdown() {
    if (!currentMarkdown || currentMarkdown.trim() === '') {
      alert('Convert a webpage first.');
      return;
    }
    const blob = new Blob([currentMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const name = lastFetchedUrl ? lastFetchedUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/[^a-zA-Z0-9]/g, '_') || 'page' : 'page';
    a.download = `${name}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function copyMarkdown() {
    if (!currentMarkdown || currentMarkdown.trim() === '') {
      alert('Nothing to copy.');
      return;
    }
    navigator.clipboard.writeText(currentMarkdown).then(() => {
      const orig = statusLabel.textContent;
      updateStatus('Copied!', true);
      setTimeout(() => updateStatus(orig, true), 1500);
    }).catch(() => alert('Copy failed.'));
  }

  function clearAll() {
    urlInput.value = '';
    outputArea.classList.remove('visible');
    currentMarkdown = '';
    lastFetchedUrl = '';
    urlInfo.textContent = '—';
    renderMarkdown('');
    updateStatus('Ready', true);
    urlInput.focus();
  }

  wordWrapBtn.addEventListener('click', function() {
    wordWrap = !wordWrap;
    previewBox.style.whiteSpace = wordWrap ? 'pre-wrap' : 'pre-wrap';
  });

  fetchBtn.addEventListener('click', () => fetchWebpage(urlInput.value));
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); fetchWebpage(urlInput.value); }
  });
  downloadBtn.addEventListener('click', downloadMarkdown);
  clearBtn.addEventListener('click', clearAll);
  copyBtn.addEventListener('click', copyMarkdown);

  renderMarkdown('');
  outputArea.classList.remove('visible');
  urlInput.focus();
  updateStatus('Ready', true);
})();
