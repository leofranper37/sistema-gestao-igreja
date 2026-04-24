/**
 * Vercel Speed Insights Integration
 * 
 * This script initializes Vercel Speed Insights for the application.
 * It injects the Speed Insights tracking script and monitors Web Vitals.
 */

(function() {
  'use strict';

  // Check if we're in a browser environment
  if (typeof window === 'undefined') return;

  // Initialize the Speed Insights queue
  function initQueue() {
    if (window.si) return;
    window.si = function() {
      window.siq = window.siq || [];
      window.siq.push(arguments);
    };
  }

  // Detect environment
  function isDevelopment() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname.includes('.local');
  }

  // Get the appropriate script source
  function getScriptSrc() {
    if (isDevelopment()) {
      return 'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js';
    }
    return '/_vercel/speed-insights/script.js';
  }

  // Inject Speed Insights script
  function injectSpeedInsights() {
    initQueue();

    const src = getScriptSrc();
    
    // Check if script is already loaded
    if (document.head.querySelector(`script[src*="${src}"]`)) {
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    
    // Add SDK metadata
    script.dataset.sdkn = '@vercel/speed-insights';
    script.dataset.sdkv = '2.0.0';

    // Enable debug mode in development
    if (isDevelopment()) {
      console.log('[Speed Insights] Loading in debug mode');
    }

    script.onerror = function() {
      console.warn(
        '[Vercel Speed Insights] Failed to load script from ' + src + 
        '. Please check if any content blockers are enabled and try again.'
      );
    };

    script.onload = function() {
      if (isDevelopment()) {
        console.log('[Speed Insights] Script loaded successfully');
      }
    };

    document.head.appendChild(script);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSpeedInsights);
  } else {
    injectSpeedInsights();
  }
})();
