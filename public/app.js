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