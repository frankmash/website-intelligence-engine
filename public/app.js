// =======================================
// SITE SCANNER - Application Logic
// =======================================

const API_URL = 'http://localhost:5000';

/**
 * Main analyze function - triggered by button click
 */
async function analyze() {
  const urlInput = document.getElementById('urlInput');
  const output = document.getElementById('output');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const quickModeCheckbox = document.getElementById('quickMode');
  
  const url = urlInput.value.trim();
  const quickMode = quickModeCheckbox ? quickModeCheckbox.checked : false;
  
  if (!url) {
    showError('Please enter a URL', 'Enter a valid website URL to analyze');
    return;
  }

  analyzeBtn.disabled = true;
  showLoading();

  try {
    const response = await fetch(`${API_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        targetUrl: url,
        quickMode: quickMode
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Analysis failed');
    }

    displayResults(data);
  } catch (error) {
    showError(
      error.message.includes('fetch') ? 'Connection Error' : 'Analysis Error',
      error.message.includes('fetch') 
        ? 'Cannot connect to the analysis server. Make sure the server is running on port 5000.' 
        : error.message,
      error.message
    );
  } finally {
    analyzeBtn.disabled = false;
  }
}

/**
 * Display loading state
 */
function showLoading() {
  const output = document.getElementById('output');
  output.innerHTML = `
    <div class="loading">
      <div class="loading-text">SCANNING...</div>
      <div class="loading-spinner"></div>
    </div>
  `;
}

/**
 * Display error message
 */
function showError(title, message, details) {
  const output = document.getElementById('output');
  output.innerHTML = `
    <div class="error">
      <div class="error-title">${title}</div>
      <div class="error-message">${message}</div>
      ${details ? `<div class="error-details">Technical Details: ${details}</div>` : ''}
    </div>
  `;
}

/**
 * Display analysis results
 */
function displayResults(data) {
  const output = document.getElementById('output');
  
  const html = `
    <div class="results">
      <div class="results-header">
        <div class="analyzed-url">${escapeHtml(data.url)}</div>
        <div class="meta-info">
          <span>📅 ${new Date(data.meta.analyzedAt).toLocaleString()}</span>
          <span>⏱️ ${data.meta.analysisTime}</span>
        </div>
      </div>

      <div class="score-grid">
        <div class="score-card seo">
          <div class="score-label">SEO Score</div>
          <div class="score-value">${data.seo.score}/100</div>
          <div class="score-subtitle">${data.seo.issues.length} issues found</div>
        </div>

        <div class="score-card performance">
          <div class="score-label">Load Time</div>
          <div class="score-value">${(data.performance.loadTime / 1000).toFixed(2)}s</div>
          <div class="score-subtitle">Page load performance</div>
        </div>

        <div class="score-card accessibility">
          <div class="score-label">Accessibility</div>
          <div class="score-value">${data.accessibility.length}</div>
          <div class="score-subtitle">Issues detected</div>
        </div>

        <div class="score-card security">
          <div class="score-label">Security</div>
          <div class="score-value">${data.security.length}</div>
          <div class="score-subtitle">Findings</div>
        </div>
      </div>

      ${createSection('Technology Stack', renderTechStack(data.techStack))}
      ${createSection('Tracking & Analytics', renderTrackers(data.trackers))}
      ${createSection('SEO Analysis', renderSEO(data.seo))}
      ${createSection('Performance Metrics', renderPerformance(data.performance))}
      ${createSection('Layout Structure', renderLayout(data.layout))}
      ${createSection('Accessibility Issues', renderAccessibility(data.accessibility))}
      ${createSection('Security Findings', renderSecurity(data.security))}
    </div>
  `;

  output.innerHTML = html;
  attachSectionToggleHandlers();
}

/**
 * Create collapsible section
 */
function createSection(title, content) {
  return `
    <div class="section">
      <div class="section-header">${title}</div>
      <div class="section-content">
        <div class="section-body">${content}</div>
      </div>
    </div>
  `;
}

/**
 * Render technology stack
 */
function renderTechStack(tech) {
  if (!tech || tech.length === 0) {
    return '<div class="empty-state">No technologies detected</div>';
  }
  return `<div class="tech-grid">${tech.map(t => 
    `<div class="tech-tag">${escapeHtml(t)}</div>`
  ).join('')}</div>`;
}

/**
 * Render trackers
 */
function renderTrackers(trackers) {
  if (!trackers || trackers.length === 0) {
    return '<div class="empty-state">No trackers detected</div>';
  }
  return `<div class="tech-grid">${trackers.map(t => 
    `<div class="tech-tag tracker-tag">${escapeHtml(t)}</div>`
  ).join('')}</div>`;
}

/**
 * Render SEO analysis
 */
function renderSEO(seo) {
  return `
    <div class="data-row">
      <span class="data-label">Title</span>
      <span class="data-value">${escapeHtml(seo.title) || 'Missing'}</span>
    </div>
    <div class="data-row">
      <span class="data-label">Title Length</span>
      <span class="data-value">${seo.titleLength} chars ${seo.titleLength > 60 ? '⚠️' : '✓'}</span>
    </div>
    <div class="data-row">
      <span class="data-label">Meta Description</span>
      <span class="data-value">${seo.metaDescription ? '✓ Present' : '✗ Missing'}</span>
    </div>
    <div class="data-row">
      <span class="data-label">Description Length</span>
      <span class="data-value">${seo.metaDescriptionLength} chars ${seo.metaDescriptionLength > 160 ? '⚠️' : '✓'}</span>
    </div>
    <div class="data-row">
      <span class="data-label">H1 Count</span>
      <span class="data-value">${seo.h1Count} ${seo.h1Count === 1 ? '✓' : '⚠️'}</span>
    </div>
    <div class="data-row">
      <span class="data-label">H1 Text</span>
      <span class="data-value">${escapeHtml(seo.h1Text) || 'N/A'}</span>
    </div>
    <div class="data-row">
      <span class="data-label">Images Without Alt</span>
      <span class="data-value">${seo.imagesWithoutAlt} ${seo.imagesWithoutAlt === 0 ? '✓' : '⚠️'}</span>
    </div>
    <div class="data-row">
      <span class="data-label">Canonical URL</span>
      <span class="data-value">${seo.canonical ? '✓ Present' : '✗ Missing'}</span>
    </div>
    <div class="data-row">
      <span class="data-label">Open Graph Tags</span>
      <span class="data-value">${seo.openGraph.title && seo.openGraph.description ? '✓ Complete' : '⚠️ Incomplete'}</span>
    </div>
    ${seo.issues.length > 0 ? `
      <div style="margin-top: 20px;">
        <strong>Issues Found:</strong>
        <ul class="issue-list">
          ${seo.issues.map(issue => 
            `<li class="issue-item">${escapeHtml(issue)}</li>`
          ).join('')}
        </ul>
      </div>
    ` : ''}
  `;
}

/**
 * Render performance metrics
 */
function renderPerformance(perf) {
  return `
    <div class="data-row">
      <span class="data-label">Total Load Time</span>
      <span class="data-value">${perf.loadTime}ms ${getPerformanceBadge(perf.loadTime, 3000)}</span>
    </div>
    <div class="data-row">
      <span class="data-label">DOM Content Loaded</span>
      <span class="data-value">${perf.domContentLoaded}ms ${getPerformanceBadge(perf.domContentLoaded, 1500)}</span>
    </div>
    <div class="data-row">
      <span class="data-label">Response Time</span>
      <span class="data-value">${perf.responseTime}ms ${getPerformanceBadge(perf.responseTime, 500)}</span>
    </div>
    <div class="data-row">
      <span class="data-label">Transfer Size</span>
      <span class="data-value">${perf.transferSize}KB ${perf.transferSize < 1000 ? '✓' : '⚠️'}</span>
    </div>
  `;
}

/**
 * Render layout structure
 */
function renderLayout(layout) {
  return `
    <div class="data-row">
      <span class="data-label">Header Element</span>
      <span class="data-value">${layout.hasHeader ? '✓ Yes' : '✗ No'}</span>
    </div>
    <div class="data-row">
      <span class="data-label">Navigation Element</span>
      <span class="data-value">${layout.hasNav ? '✓ Yes' : '✗ No'}</span>
    </div>
    <div class="data-row">
      <span class="data-label">Footer Element</span>
      <span class="data-value">${layout.hasFooter ? '✓ Yes' : '✗ No'}</span>
    </div>
    <div class="data-row">
      <span class="data-label">Hero Section</span>
      <span class="data-value">${layout.hasHero ? 'Yes' : 'No'}</span>
    </div>
    <div class="data-row">
      <span class="data-label">Main Element</span>
      <span class="data-value">${layout.hasMain ? '✓ Yes' : '✗ No'}</span>
    </div>
    <div class="data-row">
      <span class="data-label">Sections</span>
      <span class="data-value">${layout.sectionCount}</span>
    </div>
    <div class="data-row">
      <span class="data-label">Articles</span>
      <span class="data-value">${layout.articleCount}</span>
    </div>
    <div class="data-row">
      <span class="data-label">Forms</span>
      <span class="data-value">${layout.formCount}</span>
    </div>
    <div class="data-row">
      <span class="data-label">Buttons</span>
      <span class="data-value">${layout.buttonCount}</span>
    </div>
    <div class="data-row">
      <span class="data-label">Images</span>
      <span class="data-value">${layout.imageCount}</span>
    </div>
    <div class="data-row">
      <span class="data-label">Links</span>
      <span class="data-value">${layout.linkCount}</span>
    </div>
    <div class="data-row">
      <span class="data-label">Body Text Length</span>
      <span class="data-value">${layout.bodyTextLength.toLocaleString()} chars</span>
    </div>
  `;
}

/**
 * Render accessibility issues
 */
function renderAccessibility(issues) {
  if (!issues || issues.length === 0) {
    return '<div class="empty-state">✓ No accessibility issues detected</div>';
  }
  return `
    <ul class="issue-list">
      ${issues.map(issue => 
        `<li class="issue-item">${escapeHtml(issue)}</li>`
      ).join('')}
    </ul>
  `;
}

/**
 * Render security findings
 */
function renderSecurity(findings) {
  if (!findings || findings.length === 0) {
    return '<div class="empty-state">✓ No security issues detected</div>';
  }
  return `
    <ul class="issue-list">
      ${findings.map(finding => {
        const className = finding.type === 'warning' ? 'warning-item' : 'info-item';
        return `<li class="issue-item ${className}">${escapeHtml(finding.message)}</li>`;
      }).join('')}
    </ul>
  `;
}

/**
 * Get performance badge based on threshold
 */
function getPerformanceBadge(value, threshold) {
  return value < threshold ? '✓' : value < threshold * 2 ? '⚠️' : '✗';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Attach event handlers to section headers for collapsing/expanding
 */
function attachSectionToggleHandlers() {
  document.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', () => {
      header.classList.toggle('active');
      const content = header.nextElementSibling;
      content.classList.toggle('active');
    });
  });
}

/**
 * Allow Enter key to trigger analysis
 */
document.addEventListener('DOMContentLoaded', () => {
  const urlInput = document.getElementById('urlInput');
  
  if (urlInput) {
    urlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        analyze();
      }
    });

    // Auto-focus input on page load
    urlInput.focus();
  }
});