/* ============================================================
   KYC Cache Helper — waitForCacheOrFetch
   Used by all feature pages to:
   1. Instantly render from localStorage cache if present
   2. Wait up to 20s for prefetch.js to populate cache
   3. Fall back to direct live API fetch only if nothing arrives
   ============================================================ */

window.waitForCacheOrFetch = function (cacheKey, cacheTTL, onCacheHit, onTimeout, maxWaitMs) {
  cacheTTL  = cacheTTL  || 30 * 60 * 1000;
  maxWaitMs = maxWaitMs || 20000;

  var resolved = false;
  var start    = Date.now();

  function tryCache() {
    if (resolved) return false;
    try {
      var raw = localStorage.getItem(cacheKey);
      if (!raw) return false;
      var parsed = JSON.parse(raw);
      var data = parsed.data; var timestamp = parsed.timestamp;
      if ((Date.now() - timestamp) < cacheTTL && Array.isArray(data) && data.length > 0) {
        resolved = true;
        var spinner = document.getElementById('loadingSpinner');
        if (spinner) spinner.style.display = 'none';
        onCacheHit(data);
        return true;
      }
    } catch (e) {}
    return false;
  }

  if (tryCache()) return;

  var lText = document.getElementById('loadingText');
  if (lText) lText.textContent = 'Syncing city data in background...';

  var eventHandler = function (e) {
    if (e.detail && e.detail.cacheKey === cacheKey) {
      cleanup();
      setTimeout(function() { if (!resolved) tryCache(); }, 50);
    }
  };
  window.addEventListener('kyc_prefetch_ready', eventHandler);

  var pollId = setInterval(function () {
    if (tryCache()) { cleanup(); return; }
    if (Date.now() - start >= maxWaitMs) {
      cleanup();
      if (!resolved) { resolved = true; onTimeout(); }
    }
  }, 400);

  function cleanup() {
    clearInterval(pollId);
    window.removeEventListener('kyc_prefetch_ready', eventHandler);
  }
};
