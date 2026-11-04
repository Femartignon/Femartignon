// Vercel Speed Insights initialization
// This script injects the Vercel Speed Insights tracker for performance monitoring

(function() {
  // Initialize the queue for speed insights
  if (window.si) return;
  window.si = function() {
    (window.siq = window.siq || []).push(arguments);
  };

  // Create and inject the Speed Insights script
  const script = document.createElement('script');
  script.src = '/_vercel/speed-insights/script.js';
  script.defer = true;
  
  // Add SDK information as data attributes
  script.dataset.sdkn = '@vercel/speed-insights';
  script.dataset.sdkv = '2.0.0';
  
  script.onerror = function() {
    console.warn('[Vercel Speed Insights] Failed to load script. Speed insights will not be tracked.');
  };
  
  document.head.appendChild(script);
})();
