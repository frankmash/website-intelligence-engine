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
  
  // Store data globally for export functions
  window.currentScanData = data;
  
  // Save to history
  saveToHistory(data);
  
  const html = `
    <div class="results">
      <div class="results-header">
        <div class="analyzed-url">${escapeHtml(data.url)}</div>
        <div class="meta-info">
          <span>📅 ${new Date(data.meta.analyzedAt).toLocaleString()}</span>
          <span>⏱️ ${data.meta.analysisTime}</span>
        </div>
        
        <!-- Export Buttons -->
        <div class="export-actions">
          <button class="export-btn" onclick="exportToPDF()">
            <span>📄 Export PDF</span>
          </button>
          <button class="export-btn" onclick="exportToJSON()">
            <span>💾 Export JSON</span>
          </button>
          <button class="export-btn" onclick="copyToClipboard()">
            <span>📋 Copy Data</span>
          </button>
        </div>
      </div>

      <!-- Screenshot Preview -->
      ${data.screenshot ? `
        <div class="screenshot-section">
          <div class="section-header active" onclick="toggleScreenshot()">
            Screenshot Preview
          </div>
          <div class="section-content active" id="screenshotContent">
            <div class="section-body">
              <img src="data:image/jpeg;base64,${data.screenshot}" 
                   alt="Website Screenshot" 
                   class="screenshot-preview"
                   onclick="openScreenshotModal(this.src)">
              <p class="screenshot-hint">Click image to view full size</p>
            </div>
          </div>
        </div>
      ` : ''}

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

      ${data.lighthouse ? renderLighthouseScores(data.lighthouse) : renderLighthouseDisabled(data.meta.quickMode)}

      ${createSection('Technology Stack', renderTechStack(data.techStack))}
      ${createSection('Tracking & Analytics', renderTrackers(data.trackers))}
      ${createSection('SEO Analysis', renderSEO(data.seo))}
      ${createSection('Performance Metrics', renderPerformance(data.performance))}
      ${createSection('Layout Structure', renderLayout(data.layout))}
      ${createSection('Accessibility Issues', renderAccessibility(data.accessibility))}
      ${createSection('Security Findings', renderSecurity(data.security))}
    </div>
    
    <!-- Screenshot Modal -->
    <div id="screenshotModal" class="modal" onclick="closeScreenshotModal()">
      <span class="modal-close">&times;</span>
      <img class="modal-content" id="modalImage">
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

/* =======================================
   LIGHTHOUSE RENDERING
======================================= */

/**
 * Render Lighthouse scores grid
 */
function renderLighthouseScores(lighthouse) {
  if (!lighthouse || !lighthouse.categories) {
    return '';
  }

  const categories = lighthouse.categories;
  
  return `
    <div class="lighthouse-section">
      <div class="lighthouse-header">
        <h2 class="lighthouse-title">
          🔦 Lighthouse Audit
          <span class="lighthouse-badge">Google</span>
        </h2>
        <p class="lighthouse-subtitle">Industry-standard performance metrics</p>
      </div>

      <div class="lighthouse-grid">
        ${categories.performance ? `
          <div class="lighthouse-card">
            <div class="lighthouse-score" data-score="${categories.performance.score}">
              <svg class="lighthouse-circle" viewBox="0 0 120 120">
                <circle class="lighthouse-bg" cx="60" cy="60" r="54"></circle>
                <circle class="lighthouse-progress" cx="60" cy="60" r="54" 
                        style="stroke-dasharray: ${categories.performance.score * 3.39}, 339"></circle>
              </svg>
              <div class="lighthouse-score-value">${categories.performance.score}</div>
            </div>
            <div class="lighthouse-label">Performance</div>
          </div>
        ` : ''}

        ${categories.accessibility ? `
          <div class="lighthouse-card">
            <div class="lighthouse-score" data-score="${categories.accessibility.score}">
              <svg class="lighthouse-circle" viewBox="0 0 120 120">
                <circle class="lighthouse-bg" cx="60" cy="60" r="54"></circle>
                <circle class="lighthouse-progress" cx="60" cy="60" r="54"
                        style="stroke-dasharray: ${categories.accessibility.score * 3.39}, 339"></circle>
              </svg>
              <div class="lighthouse-score-value">${categories.accessibility.score}</div>
            </div>
            <div class="lighthouse-label">Accessibility</div>
          </div>
        ` : ''}

        ${categories['best-practices'] ? `
          <div class="lighthouse-card">
            <div class="lighthouse-score" data-score="${categories['best-practices'].score}">
              <svg class="lighthouse-circle" viewBox="0 0 120 120">
                <circle class="lighthouse-bg" cx="60" cy="60" r="54"></circle>
                <circle class="lighthouse-progress" cx="60" cy="60" r="54"
                        style="stroke-dasharray: ${categories['best-practices'].score * 3.39}, 339"></circle>
              </svg>
              <div class="lighthouse-score-value">${categories['best-practices'].score}</div>
            </div>
            <div class="lighthouse-label">Best Practices</div>
          </div>
        ` : ''}

        ${categories.seo ? `
          <div class="lighthouse-card">
            <div class="lighthouse-score" data-score="${categories.seo.score}">
              <svg class="lighthouse-circle" viewBox="0 0 120 120">
                <circle class="lighthouse-bg" cx="60" cy="60" r="54"></circle>
                <circle class="lighthouse-progress" cx="60" cy="60" r="54"
                        style="stroke-dasharray: ${categories.seo.score * 3.39}, 339"></circle>
              </svg>
              <div class="lighthouse-score-value">${categories.seo.score}</div>
            </div>
            <div class="lighthouse-label">SEO</div>
          </div>
        ` : ''}

        ${categories.pwa ? `
          <div class="lighthouse-card">
            <div class="lighthouse-score" data-score="${categories.pwa.score}">
              <svg class="lighthouse-circle" viewBox="0 0 120 120">
                <circle class="lighthouse-bg" cx="60" cy="60" r="54"></circle>
                <circle class="lighthouse-progress" cx="60" cy="60" r="54"
                        style="stroke-dasharray: ${categories.pwa.score * 3.39}, 339"></circle>
              </svg>
              <div class="lighthouse-score-value">${categories.pwa.score}</div>
            </div>
            <div class="lighthouse-label">PWA</div>
          </div>
        ` : ''}
      </div>

      ${lighthouse.metrics ? renderLighthouseMetrics(lighthouse.metrics) : ''}
      ${lighthouse.opportunities && lighthouse.opportunities.length > 0 ? renderLighthouseOpportunities(lighthouse.opportunities) : ''}
    </div>
  `;
}

/**
 * Render Lighthouse disabled message
 */
function renderLighthouseDisabled(quickMode) {
  if (quickMode) {
    return `
      <div class="lighthouse-disabled">
        <div class="lighthouse-disabled-icon">⚡</div>
        <div class="lighthouse-disabled-title">Lighthouse Audit Skipped</div>
        <div class="lighthouse-disabled-message">
          Quick Mode is enabled. Disable Quick Mode to run Lighthouse audits for comprehensive performance insights.
        </div>
      </div>
    `;
  }
  return '';
}

/**
 * Render Lighthouse performance metrics
 */
function renderLighthouseMetrics(metrics) {
  return `
    <div class="lighthouse-metrics">
      <h3 class="lighthouse-metrics-title">Performance Metrics</h3>
      <div class="lighthouse-metrics-grid">
        ${metrics['first-contentful-paint'] ? `
          <div class="lighthouse-metric">
            <div class="lighthouse-metric-label">First Contentful Paint</div>
            <div class="lighthouse-metric-value">${metrics['first-contentful-paint'].displayValue}</div>
          </div>
        ` : ''}
        ${metrics['largest-contentful-paint'] ? `
          <div class="lighthouse-metric">
            <div class="lighthouse-metric-label">Largest Contentful Paint</div>
            <div class="lighthouse-metric-value">${metrics['largest-contentful-paint'].displayValue}</div>
          </div>
        ` : ''}
        ${metrics['total-blocking-time'] ? `
          <div class="lighthouse-metric">
            <div class="lighthouse-metric-label">Total Blocking Time</div>
            <div class="lighthouse-metric-value">${metrics['total-blocking-time'].displayValue}</div>
          </div>
        ` : ''}
        ${metrics['cumulative-layout-shift'] ? `
          <div class="lighthouse-metric">
            <div class="lighthouse-metric-label">Cumulative Layout Shift</div>
            <div class="lighthouse-metric-value">${metrics['cumulative-layout-shift'].displayValue}</div>
          </div>
        ` : ''}
        ${metrics['speed-index'] ? `
          <div class="lighthouse-metric">
            <div class="lighthouse-metric-label">Speed Index</div>
            <div class="lighthouse-metric-value">${metrics['speed-index'].displayValue}</div>
          </div>
        ` : ''}
        ${metrics['interactive'] ? `
          <div class="lighthouse-metric">
            <div class="lighthouse-metric-label">Time to Interactive</div>
            <div class="lighthouse-metric-value">${metrics['interactive'].displayValue}</div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Render Lighthouse opportunities
 */
function renderLighthouseOpportunities(opportunities) {
  return `
    <div class="lighthouse-opportunities">
      <h3 class="lighthouse-opportunities-title">💡 Top Opportunities</h3>
      <div class="lighthouse-opportunities-list">
        ${opportunities.map(opp => `
          <div class="lighthouse-opportunity">
            <div class="lighthouse-opportunity-header">
              <div class="lighthouse-opportunity-title">${escapeHtml(opp.title)}</div>
              <div class="lighthouse-opportunity-savings">
                ${opp.savingsMs ? `Save ${Math.round(opp.savingsMs)}ms` : ''}
              </div>
            </div>
            <div class="lighthouse-opportunity-description">${escapeHtml(opp.description)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
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

/* =======================================
   EXPORT FUNCTIONS
======================================= */

/**
 * Export results to PDF
 */
function exportToPDF() {
  const data = window.currentScanData;
  if (!data) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  let yPos = 20;
  const lineHeight = 7;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  const maxWidth = pageWidth - (margin * 2);

  // Title
  doc.setFontSize(24);
  doc.setTextColor(168, 85, 247);
  doc.text('SITE SCANNER REPORT', margin, yPos);
  
  yPos += 15;
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(data.url, margin, yPos);
  
  yPos += 10;
  doc.setFontSize(10);
  doc.text(`Analyzed: ${new Date(data.meta.analyzedAt).toLocaleString()}`, margin, yPos);
  doc.text(`Analysis Time: ${data.meta.analysisTime}`, pageWidth - margin - 50, yPos);
  
  yPos += 15;

  // Score Summary
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('Score Summary', margin, yPos);
  yPos += 10;
  
  doc.setFontSize(11);
  const scores = [
    { label: 'SEO Score:', value: `${data.seo.score}/100`, color: [16, 185, 129] },
    { label: 'Load Time:', value: `${(data.performance.loadTime / 1000).toFixed(2)}s`, color: [6, 182, 212] },
    { label: 'Accessibility Issues:', value: data.accessibility.length.toString(), color: [168, 85, 247] },
    { label: 'Security Findings:', value: data.security.length.toString(), color: [236, 72, 153] }
  ];

  scores.forEach(score => {
    doc.setTextColor(100, 100, 100);
    doc.text(score.label, margin, yPos);
    doc.setTextColor(...score.color);
    doc.text(score.value, margin + 60, yPos);
    yPos += lineHeight;
  });

  yPos += 5;

  // Technology Stack
  if (data.techStack && data.techStack.length > 0) {
    checkPageBreak();
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Technology Stack', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(data.techStack.join(', '), margin, yPos, { maxWidth });
    yPos += 10;
  }

  // SEO Issues
  if (data.seo.issues && data.seo.issues.length > 0) {
    checkPageBreak();
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('SEO Issues', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(239, 68, 68);
    data.seo.issues.forEach((issue, index) => {
      checkPageBreak();
      const lines = doc.splitTextToSize(`${index + 1}. ${issue}`, maxWidth);
      doc.text(lines, margin, yPos);
      yPos += lines.length * lineHeight;
    });
    yPos += 5;
  }

  // Accessibility Issues
  if (data.accessibility && data.accessibility.length > 0) {
    checkPageBreak();
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Accessibility Issues', margin, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(251, 191, 36);
    data.accessibility.forEach((issue, index) => {
      checkPageBreak();
      const lines = doc.splitTextToSize(`${index + 1}. ${issue}`, maxWidth);
      doc.text(lines, margin, yPos);
      yPos += lines.length * lineHeight;
    });
    yPos += 5;
  }

  // Performance Metrics
  checkPageBreak();
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Performance Metrics', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  const perfMetrics = [
    `Load Time: ${data.performance.loadTime}ms`,
    `DOM Content Loaded: ${data.performance.domContentLoaded}ms`,
    `Response Time: ${data.performance.responseTime}ms`,
    `Transfer Size: ${data.performance.transferSize}KB`
  ];
  perfMetrics.forEach(metric => {
    checkPageBreak();
    doc.text(metric, margin, yPos);
    yPos += lineHeight;
  });

  // Add screenshot on last page if available
  if (data.screenshot) {
    doc.addPage();
    yPos = 20;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Screenshot', margin, yPos);
    yPos += 10;
    
    try {
      const imgData = 'data:image/jpeg;base64,' + data.screenshot;
      doc.addImage(imgData, 'JPEG', margin, yPos, maxWidth, maxWidth * 0.6);
    } catch (e) {
      console.error('Error adding screenshot to PDF:', e);
    }
  }

  // Footer on each page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated by Site Scanner - Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // Helper function to check if new page is needed
  function checkPageBreak() {
    if (yPos > doc.internal.pageSize.height - 30) {
      doc.addPage();
      yPos = 20;
    }
  }

  // Save the PDF
  const fileName = `site-scanner-${data.url.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.pdf`;
  doc.save(fileName);
  
  showToast('PDF report downloaded successfully! 📄');
}

/**
 * Export results to JSON
 */
function exportToJSON() {
  const data = window.currentScanData;
  if (!data) return;

  // Remove screenshot from JSON export (too large)
  const exportData = { ...data };
  delete exportData.screenshot;

  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `site-scanner-${data.url.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.json`;
  link.click();
  
  URL.revokeObjectURL(url);
  showToast('JSON data downloaded successfully! 💾');
}

/**
 * Copy data to clipboard
 */
function copyToClipboard() {
  const data = window.currentScanData;
  if (!data) return;

  const exportData = { ...data };
  delete exportData.screenshot;

  const text = JSON.stringify(exportData, null, 2);
  
  navigator.clipboard.writeText(text).then(() => {
    showToast('Data copied to clipboard! 📋');
  }).catch(err => {
    console.error('Failed to copy:', err);
    showToast('Failed to copy data ❌');
  });
}

/**
 * Show toast notification
 */
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Toggle screenshot section
 */
function toggleScreenshot() {
  const content = document.getElementById('screenshotContent');
  const header = content.previousElementSibling;
  header.classList.toggle('active');
  content.classList.toggle('active');
}

/**
 * Open screenshot in modal
 */
function openScreenshotModal(src) {
  const modal = document.getElementById('screenshotModal');
  const modalImg = document.getElementById('modalImage');
  modal.style.display = 'flex';
  modalImg.src = src;
  document.body.style.overflow = 'hidden';
}

/**
 * Close screenshot modal
 */
function closeScreenshotModal() {
  const modal = document.getElementById('screenshotModal');
  modal.style.display = 'none';
  document.body.style.overflow = 'auto';
}

/* =======================================
   SCAN HISTORY
======================================= */

const HISTORY_KEY = 'site_scanner_history';
const MAX_HISTORY = 50;

/**
 * Save scan to history
 */
function saveToHistory(data) {
  try {
    let history = getHistory();
    
    // Create history entry (exclude screenshot to save space)
    const entry = {
      id: Date.now(),
      url: data.url,
      timestamp: data.meta.analyzedAt,
      scores: {
        seo: data.seo.score,
        loadTime: data.performance.loadTime,
        accessibility: data.accessibility.length,
        security: data.security.length,
        lighthouse: data.lighthouse ? {
          performance: data.lighthouse.categories.performance?.score || null,
          accessibility: data.lighthouse.categories.accessibility?.score || null,
          seo: data.lighthouse.categories.seo?.score || null,
          bestPractices: data.lighthouse.categories['best-practices']?.score || null,
          pwa: data.lighthouse.categories.pwa?.score || null
        } : null
      },
      quickMode: data.meta.quickMode,
      // Store full data but without screenshot
      fullData: { ...data, screenshot: null }
    };
    
    // Add to beginning of array
    history.unshift(entry);
    
    // Keep only last MAX_HISTORY entries
    if (history.length > MAX_HISTORY) {
      history = history.slice(0, MAX_HISTORY);
    }
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    console.log('✓ Scan saved to history');
    
    // Update history UI if visible
    updateHistoryDisplay();
    
  } catch (error) {
    console.error('Failed to save to history:', error);
  }
}

/**
 * Get scan history from localStorage
 */
function getHistory() {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load history:', error);
    return [];
  }
}

/**
 * Delete scan from history
 */
function deleteFromHistory(id) {
  try {
    let history = getHistory();
    history = history.filter(entry => entry.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    updateHistoryDisplay();
    showToast('Scan deleted from history 🗑️');
  } catch (error) {
    console.error('Failed to delete from history:', error);
  }
}

/**
 * Clear all history
 */
function clearHistory() {
  if (confirm('Are you sure you want to clear all scan history? This cannot be undone.')) {
    localStorage.removeItem(HISTORY_KEY);
    updateHistoryDisplay();
    showToast('History cleared ✨');
  }
}

/**
 * Load scan from history
 */
function loadFromHistory(id) {
  try {
    const history = getHistory();
    const entry = history.find(e => e.id === id);
    
    if (entry && entry.fullData) {
      displayResults(entry.fullData);
      showToast('Scan loaded from history 📂');
      toggleHistory(); // Close panel
      
      // Scroll to results
      setTimeout(() => {
        document.getElementById('output').scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
  } catch (error) {
    console.error('Failed to load from history:', error);
    showToast('Failed to load scan ❌');
  }
}

/**
 * Toggle history panel
 */
function toggleHistory() {
  const panel = document.getElementById('historyPanel');
  const overlay = document.getElementById('historyOverlay');
  
  if (panel.classList.contains('open')) {
    panel.classList.remove('open');
    overlay.classList.remove('show');
    document.body.style.overflow = 'auto';
  } else {
    updateHistoryDisplay();
    panel.classList.add('open');
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Update history display
 */
function updateHistoryDisplay() {
  const container = document.getElementById('historyList');
  if (!container) return;
  
  const history = getHistory();
  
  if (history.length === 0) {
    container.innerHTML = `
      <div class="history-empty">
        <div class="history-empty-icon">📊</div>
        <div class="history-empty-title">No Scan History</div>
        <div class="history-empty-message">
          Your analyzed websites will appear here. Start by scanning a website!
        </div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = history.map(entry => `
    <div class="history-item" data-id="${entry.id}">
      <div class="history-item-header">
        <label class="history-compare-checkbox">
          <input type="checkbox" 
                 class="compare-checkbox" 
                 data-id="${entry.id}"
                 onchange="handleCompareSelection(${entry.id})">
          <span class="checkbox-label">Compare</span>
        </label>
        <div class="history-item-url">${escapeHtml(entry.url)}</div>
        <button class="history-item-delete" onclick="deleteFromHistory(${entry.id})" title="Delete">
          ×
        </button>
      </div>
      
      <div class="history-item-meta">
        <span class="history-item-date">${formatDate(entry.timestamp)}</span>
        ${entry.quickMode ? '<span class="history-badge quick">Quick Mode</span>' : ''}
      </div>
      
      <div class="history-item-scores">
        <div class="history-score-mini">
          <div class="history-score-label">SEO</div>
          <div class="history-score-value" data-score="${entry.scores.seo}">${entry.scores.seo}</div>
        </div>
        <div class="history-score-mini">
          <div class="history-score-label">Load</div>
          <div class="history-score-value">${(entry.scores.loadTime / 1000).toFixed(1)}s</div>
        </div>
        ${entry.scores.lighthouse && entry.scores.lighthouse.performance !== null ? `
          <div class="history-score-mini">
            <div class="history-score-label">LH</div>
            <div class="history-score-value" data-score="${entry.scores.lighthouse.performance}">${entry.scores.lighthouse.performance}</div>
          </div>
        ` : ''}
      </div>
      
      <button class="history-item-load" onclick="loadFromHistory(${entry.id})">
        View Results →
      </button>
    </div>
  `).join('');
  
  // Update compare button state
  updateCompareButton();
}

/**
 * Format date for display
 */
function formatDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * Export history as JSON
 */
function exportHistory() {
  const history = getHistory();
  if (history.length === 0) {
    showToast('No history to export ❌');
    return;
  }
  
  const dataStr = JSON.stringify(history, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `site-scanner-history-${Date.now()}.json`;
  link.click();
  
  URL.revokeObjectURL(url);
  showToast('History exported successfully! 💾');
}

/* =======================================
   COMPARE MODE
======================================= */

let selectedForCompare = [];

/**
 * Handle compare checkbox selection
 */
function handleCompareSelection(id) {
  const checkbox = document.querySelector(`.compare-checkbox[data-id="${id}"]`);
  
  if (checkbox.checked) {
    if (selectedForCompare.length >= 2) {
      // Uncheck the oldest selection
      const oldestId = selectedForCompare[0];
      const oldestCheckbox = document.querySelector(`.compare-checkbox[data-id="${oldestId}"]`);
      if (oldestCheckbox) oldestCheckbox.checked = false;
      selectedForCompare.shift();
    }
    selectedForCompare.push(id);
  } else {
    selectedForCompare = selectedForCompare.filter(i => i !== id);
  }
  
  updateCompareButton();
}

/**
 * Update compare button state
 */
function updateCompareButton() {
  const compareBtn = document.getElementById('compareButton');
  if (!compareBtn) return;
  
  if (selectedForCompare.length === 2) {
    compareBtn.disabled = false;
    compareBtn.classList.add('active');
  } else {
    compareBtn.disabled = true;
    compareBtn.classList.remove('active');
  }
  
  compareBtn.textContent = `⚖️ Compare (${selectedForCompare.length}/2)`;
}

/**
 * Start comparison
 */
function startComparison() {
  if (selectedForCompare.length !== 2) {
    showToast('Please select 2 scans to compare ⚖️');
    return;
  }
  
  const history = getHistory();
  const scan1 = history.find(e => e.id === selectedForCompare[0]);
  const scan2 = history.find(e => e.id === selectedForCompare[1]);
  
  if (!scan1 || !scan2) {
    showToast('Error loading scans ❌');
    return;
  }
  
  displayComparison(scan1, scan2);
  toggleHistory();
  
  // Scroll to results
  setTimeout(() => {
    document.getElementById('output').scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
  }, 100);
}

/**
 * Display comparison view
 */
function displayComparison(scan1, scan2) {
  const output = document.getElementById('output');
  
  const html = `
    <div class="compare-view">
      <div class="compare-header">
        <h2 class="compare-title">⚖️ Comparison View</h2>
        <button class="compare-close" onclick="closeComparison()">
          ✕ Close Comparison
        </button>
      </div>
      
      <div class="compare-grid">
        <!-- Left Side -->
        <div class="compare-column">
          <div class="compare-column-header scan-a">
            <div class="compare-label">Scan A</div>
            <div class="compare-url">${escapeHtml(scan1.url)}</div>
            <div class="compare-date">${formatDate(scan1.timestamp)}</div>
          </div>
          
          ${renderComparisonScores(scan1, 'a')}
          ${renderComparisonDetails(scan1, 'a')}
        </div>
        
        <!-- Right Side -->
        <div class="compare-column">
          <div class="compare-column-header scan-b">
            <div class="compare-label">Scan B</div>
            <div class="compare-url">${escapeHtml(scan2.url)}</div>
            <div class="compare-date">${formatDate(scan2.timestamp)}</div>
          </div>
          
          ${renderComparisonScores(scan2, 'b')}
          ${renderComparisonDetails(scan2, 'b')}
        </div>
      </div>
      
      <!-- Summary -->
      ${renderComparisonSummary(scan1, scan2)}
    </div>
  `;
  
  output.innerHTML = html;
}

/**
 * Render comparison scores
 */
function renderComparisonScores(scan, side) {
  const scores = scan.scores;
  const otherScan = side === 'a' ? 
    getHistory().find(e => e.id === selectedForCompare[1]) : 
    getHistory().find(e => e.id === selectedForCompare[0]);
  const otherScores = otherScan.scores;
  
  return `
    <div class="compare-scores">
      <div class="compare-score-card">
        <div class="compare-score-label">SEO Score</div>
        <div class="compare-score-value">${scores.seo}/100</div>
        ${renderDiff(scores.seo, otherScores.seo)}
      </div>
      
      <div class="compare-score-card">
        <div class="compare-score-label">Load Time</div>
        <div class="compare-score-value">${(scores.loadTime / 1000).toFixed(2)}s</div>
        ${renderDiff(scores.loadTime, otherScores.loadTime, true)}
      </div>
      
      <div class="compare-score-card">
        <div class="compare-score-label">Accessibility</div>
        <div class="compare-score-value">${scores.accessibility} issues</div>
        ${renderDiff(scores.accessibility, otherScores.accessibility, true)}
      </div>
      
      <div class="compare-score-card">
        <div class="compare-score-label">Security</div>
        <div class="compare-score-value">${scores.security} findings</div>
        ${renderDiff(scores.security, otherScores.security, true)}
      </div>
      
      ${scores.lighthouse ? `
        <div class="compare-score-card lighthouse">
          <div class="compare-score-label">Lighthouse Performance</div>
          <div class="compare-score-value">${scores.lighthouse.performance || 'N/A'}</div>
          ${scores.lighthouse.performance && otherScores.lighthouse?.performance ? 
            renderDiff(scores.lighthouse.performance, otherScores.lighthouse.performance) : ''}
        </div>
        
        <div class="compare-score-card lighthouse">
          <div class="compare-score-label">Lighthouse Accessibility</div>
          <div class="compare-score-value">${scores.lighthouse.accessibility || 'N/A'}</div>
          ${scores.lighthouse.accessibility && otherScores.lighthouse?.accessibility ? 
            renderDiff(scores.lighthouse.accessibility, otherScores.lighthouse.accessibility) : ''}
        </div>
        
        <div class="compare-score-card lighthouse">
          <div class="compare-score-label">Lighthouse SEO</div>
          <div class="compare-score-value">${scores.lighthouse.seo || 'N/A'}</div>
          ${scores.lighthouse.seo && otherScores.lighthouse?.seo ? 
            renderDiff(scores.lighthouse.seo, otherScores.lighthouse.seo) : ''}
        </div>
        
        <div class="compare-score-card lighthouse">
          <div class="compare-score-label">Lighthouse Best Practices</div>
          <div class="compare-score-value">${scores.lighthouse.bestPractices || 'N/A'}</div>
          ${scores.lighthouse.bestPractices && otherScores.lighthouse?.bestPractices ? 
            renderDiff(scores.lighthouse.bestPractices, otherScores.lighthouse.bestPractices) : ''}
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Render difference indicator
 */
function renderDiff(value1, value2, lowerIsBetter = false) {
  const diff = value1 - value2;
  
  if (diff === 0) {
    return '<div class="compare-diff neutral">→ Same</div>';
  }
  
  const isPositive = lowerIsBetter ? diff < 0 : diff > 0;
  const arrow = diff > 0 ? '↑' : '↓';
  const className = isPositive ? 'better' : 'worse';
  const absValue = Math.abs(diff);
  const displayValue = absValue < 1 ? absValue.toFixed(2) : Math.round(absValue);
  
  return `<div class="compare-diff ${className}">${arrow} ${displayValue}</div>`;
}

/**
 * Render comparison details
 */
function renderComparisonDetails(scan, side) {
  const data = scan.fullData;
  
  return `
    <div class="compare-details">
      <div class="compare-detail-section">
        <h4>Technology Stack</h4>
        <div class="compare-tech-list">
          ${data.techStack && data.techStack.length > 0 ? 
            data.techStack.map(t => `<span class="tech-chip">${escapeHtml(t)}</span>`).join('') : 
            '<span class="empty">None detected</span>'}
        </div>
      </div>
      
      <div class="compare-detail-section">
        <h4>Trackers</h4>
        <div class="compare-tech-list">
          ${data.trackers && data.trackers.length > 0 ? 
            data.trackers.map(t => `<span class="tech-chip tracker">${escapeHtml(t)}</span>`).join('') : 
            '<span class="empty">None detected</span>'}
        </div>
      </div>
      
      <div class="compare-detail-section">
        <h4>SEO Issues</h4>
        <div class="issue-count ${data.seo.issues.length === 0 ? 'good' : 'warning'}">
          ${data.seo.issues.length} issues
        </div>
      </div>
    </div>
  `;
}

/**
 * Render comparison summary
 */
function renderComparisonSummary(scan1, scan2) {
  const winner = determineWinner(scan1, scan2);
  
  return `
    <div class="compare-summary">
      <h3 class="compare-summary-title">📊 Summary</h3>
      <div class="compare-summary-content">
        ${winner === 'tie' ? `
          <div class="summary-tie">
            <div class="summary-icon">🤝</div>
            <div class="summary-text">Both scans show similar performance</div>
          </div>
        ` : `
          <div class="summary-winner">
            <div class="summary-icon">🏆</div>
            <div class="summary-text">
              <strong>${winner === 'a' ? 'Scan A' : 'Scan B'}</strong> performs better overall
              <br>
              <span class="summary-url">${escapeHtml(winner === 'a' ? scan1.url : scan2.url)}</span>
            </div>
          </div>
        `}
      </div>
    </div>
  `;
}

/**
 * Determine which scan performs better
 */
function determineWinner(scan1, scan2) {
  let score1 = 0;
  let score2 = 0;
  
  // SEO Score (higher is better)
  if (scan1.scores.seo > scan2.scores.seo) score1++;
  else if (scan2.scores.seo > scan1.scores.seo) score2++;
  
  // Load Time (lower is better)
  if (scan1.scores.loadTime < scan2.scores.loadTime) score1++;
  else if (scan2.scores.loadTime < scan1.scores.loadTime) score2++;
  
  // Accessibility Issues (lower is better)
  if (scan1.scores.accessibility < scan2.scores.accessibility) score1++;
  else if (scan2.scores.accessibility < scan1.scores.accessibility) score2++;
  
  // Lighthouse Performance (higher is better)
  if (scan1.scores.lighthouse?.performance && scan2.scores.lighthouse?.performance) {
    if (scan1.scores.lighthouse.performance > scan2.scores.lighthouse.performance) score1++;
    else if (scan2.scores.lighthouse.performance > scan1.scores.lighthouse.performance) score2++;
  }
  
  if (score1 > score2) return 'a';
  if (score2 > score1) return 'b';
  return 'tie';
}

/**
 * Close comparison view
 */
function closeComparison() {
  selectedForCompare = [];
  const output = document.getElementById('output');
  output.innerHTML = '';
  
  // Uncheck all compare checkboxes
  document.querySelectorAll('.compare-checkbox').forEach(cb => {
    cb.checked = false;
  });
  
  updateCompareButton();
  showToast('Comparison closed');
}