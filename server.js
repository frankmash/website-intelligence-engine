const express = require("express");
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const cors = require("cors");
const dns = require("dns");

dns.setDefaultResultOrder("ipv4first");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* ===============================
   Global Browser Instance
================================ */
let browser;

/* ===============================
   Helper Functions
================================ */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function initBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--window-size=1920x1080",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process"
      ]
    });
    console.log("🟢 Puppeteer browser launched");
  }
}

/* ===============================
   Normalize URL
================================ */
function normalizeUrl(input) {
  try {
    let parsed = new URL(input);
    parsed.protocol = "https:";
    return parsed.href;
  } catch {
    return "https://" + input;
  }
}

/* ===============================
   Tech Detection
================================ */
async function detectTechStack(page, html) {
  const tech = [];
  const lower = html.toLowerCase();

  // Generator meta tag
  const generator = await page.$eval(
    'meta[name="generator"]',
    el => el.content,
  ).catch(() => null);

  if (generator) tech.push(generator);

  // Script URLs
  const scripts = await page.$$eval("script", s =>
    s.map(el => el.src || "")
  );

  const scriptString = scripts.join(" ").toLowerCase();

  if (scriptString.includes("react")) tech.push("React");
  if (scriptString.includes("vue")) tech.push("Vue");
  if (scriptString.includes("angular")) tech.push("Angular");
  if (scriptString.includes("_next")) tech.push("Next.js");
  if (scriptString.includes("nuxt")) tech.push("Nuxt.js");
  if (scriptString.includes("svelte")) tech.push("Svelte");

  if (scriptString.includes("bootstrap")) tech.push("Bootstrap");
  if (scriptString.includes("tailwind")) tech.push("Tailwind CSS");

  if (scriptString.includes("wp-content")) tech.push("WordPress");
  if (scriptString.includes("woocommerce")) tech.push("WooCommerce");
  if (scriptString.includes("shopify")) tech.push("Shopify");
  if (scriptString.includes("squarespace")) tech.push("Squarespace");
  if (scriptString.includes("wix")) tech.push("Wix");

  // Root div detection
  if (lower.includes('id="root"')) tech.push("React (likely)");
  if (lower.includes('id="__next"')) tech.push("Next.js");
  if (lower.includes('id="__nuxt"')) tech.push("Nuxt.js");

  return [...new Set(tech)];
}


/* ===============================
   Tracker Detection
================================ */
function detectTrackers(html) {
  const trackers = [];
  const lower = html.toLowerCase();

  if (lower.includes("googletagmanager"))
    trackers.push("Google Tag Manager");
  if (lower.includes("google-analytics") || lower.includes("ga.js"))
    trackers.push("Google Analytics");
  if (lower.includes("fbq(") || lower.includes("facebook"))
    trackers.push("Facebook Pixel");
  if (lower.includes("tiktok"))
    trackers.push("TikTok Pixel");
  if (lower.includes("hotjar"))
    trackers.push("Hotjar");
  if (lower.includes("clarity.ms"))
    trackers.push("Microsoft Clarity");
  if (lower.includes("segment.com"))
    trackers.push("Segment");
  if (lower.includes("mixpanel"))
    trackers.push("Mixpanel");
  if (lower.includes("intercom"))
    trackers.push("Intercom");

  return trackers;
}

/* ===============================
   Layout Detection
================================ */
function extractLayout($) {
  const bodyTextLength = $("body").text().length;

  const headerLike =
    $("header").length > 0 ||
    $('[class*="header"]').length > 0 ||
    $('[id*="header"]').length > 0;

  const navLike =
    $("nav").length > 0 ||
    $('[class*="nav"]').length > 0 ||
    $('[id*="nav"]').length > 0;

  const footerLike =
    $("footer").length > 0 ||
    $('[class*="footer"]').length > 0 ||
    $('[id*="footer"]').length > 0;

  const heroLike =
    $('[class*="hero"]').length > 0 ||
    $("h1").first().parent().text().length > 200;

  const sectionLike =
    $("section").length +
    $('[class*="section"]').length;

  const mainLike =
    $("main").length > 0 ||
    $('[class*="main"]').length > 0;

  return {
    hasHeader: headerLike,
    hasNav: navLike,
    hasFooter: footerLike,
    hasHero: heroLike,
    hasMain: mainLike,
    sectionCount: sectionLike,
    articleCount: $("article").length,
    formCount: $("form").length,
    buttonCount: $("button").length,
    imageCount: $("img").length,
    linkCount: $("a").length,
    bodyTextLength
  };
}


/* ===============================
   SEO Analysis
================================ */
function analyzeSEO($) {
  const title = $("title").text() || null;
  const metaDescription =
    $('meta[name="description"]').attr("content") || null;

  const h1Count = $("h1").length;
  const h1Text = $("h1").first().text() || null;
  const imagesWithoutAlt = $("img:not([alt])").length;
  
  const canonical = $('link[rel="canonical"]').attr('href') || null;
  const ogTitle = $('meta[property="og:title"]').attr('content') || null;
  const ogDescription = $('meta[property="og:description"]').attr('content') || null;
  const ogImage = $('meta[property="og:image"]').attr('content') || null;

  return {
    title,
    titleLength: title ? title.length : 0,
    metaDescription,
    metaDescriptionLength: metaDescription ? metaDescription.length : 0,
    h1Count,
    h1Text,
    imagesWithoutAlt,
    canonical,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      image: ogImage
    }
  };
}

function calculateSEOScore(seo, layout) {
  let score = 100;
  const issues = [];

  if (!seo.title) {
    score -= 20;
    issues.push("Missing page title");
  } else if (seo.titleLength > 60) {
    score -= 5;
    issues.push("Title too long (>60 chars)");
  }

  if (!seo.metaDescription) {
    score -= 15;
    issues.push("Missing meta description");
  } else if (seo.metaDescriptionLength > 160) {
    score -= 5;
    issues.push("Meta description too long (>160 chars)");
  }

  if (seo.h1Count === 0) {
    score -= 20;
    issues.push("No H1 heading found");
  }
  if (seo.h1Count > 1) {
    score -= 10;
    issues.push("Multiple H1 headings");
  }

  if (seo.imagesWithoutAlt > 0) {
    score -= Math.min(10, seo.imagesWithoutAlt * 2);
    issues.push(`${seo.imagesWithoutAlt} images without alt text`);
  }

  if (!layout.hasHeader) {
    score -= 5;
    issues.push("No header element");
  }
  if (!layout.hasFooter) {
    score -= 5;
    issues.push("No footer element");
  }

  if (!seo.canonical) {
    score -= 5;
    issues.push("No canonical URL");
  }

  if (!seo.openGraph.title && !seo.openGraph.description) {
    score -= 10;
    issues.push("Missing Open Graph tags");
  }

  return {
    score: Math.max(score, 0),
    issues
  };
}

/* ===============================
   Performance Metrics
================================ */
async function getPerformanceMetrics(page) {
  const metrics = await page.evaluate(() => {
    const perfData = performance.getEntriesByType('navigation')[0];
    return {
      loadTime: perfData ? Math.round(perfData.loadEventEnd - perfData.fetchStart) : 0,
      domContentLoaded: perfData ? Math.round(perfData.domContentLoadedEventEnd - perfData.fetchStart) : 0,
      responseTime: perfData ? Math.round(perfData.responseEnd - perfData.requestStart) : 0,
      transferSize: perfData ? Math.round(perfData.transferSize / 1024) : 0
    };
  });
  return metrics;
}

/* ===============================
   Accessibility Check
================================ */
function checkAccessibility($) {
  const issues = [];
  
  if (!$('html').attr('lang')) issues.push('Missing lang attribute on <html>');
  
  const imgWithoutAlt = $('img:not([alt])').length;
  if (imgWithoutAlt > 0) issues.push(`${imgWithoutAlt} images missing alt text`);
  
  if ($('a:not([href])').length > 0) issues.push('Links without href attribute');
  
  const headingOrder = [];
  $('h1, h2, h3, h4, h5, h6').each((i, el) => {
    headingOrder.push(parseInt(el.tagName[1]));
  });
  
  let skippedHeading = false;
  for (let i = 1; i < headingOrder.length; i++) {
    if (headingOrder[i] - headingOrder[i-1] > 1) {
      skippedHeading = true;
      break;
    }
  }
  if (skippedHeading) issues.push('Skipped heading levels detected');
  
  return issues;
}

/* ===============================
   Security Check
================================ */
function checkSecurity($, html) {
  const findings = [];
  const lower = html.toLowerCase();
  
  if (!$('meta[http-equiv="Content-Security-Policy"]').length && 
      !$('meta[http-equiv="content-security-policy"]').length) {
    findings.push({ type: 'warning', message: 'No Content Security Policy detected' });
  }
  
  const httpResources = (html.match(/http:\/\//g) || []).length;
  if (httpResources > 0) {
    findings.push({ type: 'warning', message: `${httpResources} HTTP resources (should use HTTPS)` });
  }
  
  const externalScripts = $('script[src]').filter((i, el) => {
    const src = $(el).attr('src');
    return src && (src.startsWith('http://') || src.startsWith('https://'));
  }).length;
  
  if (externalScripts > 0) {
    findings.push({ type: 'info', message: `${externalScripts} external scripts loaded` });
  }

  const inlineScripts = $('script:not([src])').length;
  if (inlineScripts > 5) {
    findings.push({ type: 'info', message: `${inlineScripts} inline scripts` });
  }
  
  return findings;
}

/* ===============================
   Analyze Route
================================ */
app.post("/analyze", async (req, res) => {
  let page;
  const startTime = Date.now();

  try {
    await initBrowser();

    let { targetUrl, quickMode } = req.body;

    if (!targetUrl) {
      return res.status(400).json({ error: "URL required" });
    }

    targetUrl = normalizeUrl(targetUrl);
    console.log(`\n🔍 Analyzing: ${targetUrl}${quickMode ? ' (Quick Mode)' : ''}`);

    page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    );

    // Set shorter timeout for quick mode
    const timeout = quickMode ? 30000 : 60000;
    const waitTime = quickMode ? 1000 : 3000;

    // Try multiple strategies for loading the page
    let loadSuccess = false;
    
    // Strategy 1: Try networkidle2 (wait for network to be idle)
    try {
      console.log(`Loading ${targetUrl} with networkidle2...`);
      await page.goto(targetUrl, {
        waitUntil: "networkidle2",
        timeout: timeout
      });
      loadSuccess = true;
      console.log('✓ Loaded with networkidle2');
    } catch (navError) {
      console.log('✗ networkidle2 failed, trying domcontentloaded...');
      
      // Strategy 2: Try domcontentloaded (just wait for HTML)
      try {
        await page.goto(targetUrl, {
          waitUntil: "domcontentloaded",
          timeout: timeout
        });
        loadSuccess = true;
        console.log('✓ Loaded with domcontentloaded');
      } catch (navError2) {
        console.log('✗ domcontentloaded failed, trying load...');
        
        // Strategy 3: Try basic load event
        try {
          await page.goto(targetUrl, {
            waitUntil: "load",
            timeout: timeout
          });
          loadSuccess = true;
          console.log('✓ Loaded with load event');
        } catch (navError3) {
          // If all strategies fail, throw the error
          throw new Error(`Unable to load ${targetUrl}. The site may be blocking automated access, experiencing issues, or taking too long to respond.`);
        }
      }
    }

    // Wait a bit for dynamic content to render
    console.log(`Waiting ${waitTime}ms for dynamic content...`);
    await delay(waitTime);

    // Capture screenshot
    console.log('📸 Capturing screenshot...');
    const screenshotBuffer = await page.screenshot({
      fullPage: false,
      type: 'jpeg',
      quality: 85
    });
    const screenshotBase64 = screenshotBuffer.toString('base64');
    console.log('✓ Screenshot captured');

    const html = await page.content();
    const $ = cheerio.load(html);

    const layout = extractLayout($);
    const seo = analyzeSEO($);
    const techStack = await detectTechStack(page, html);
    const performance = await getPerformanceMetrics(page);
    const accessibility = checkAccessibility($);
    const security = checkSecurity($, html);
    const seoResult = calculateSEOScore(seo, layout);

    const analysisTime = Date.now() - startTime;

    const result = {
      url: targetUrl,
      screenshot: screenshotBase64,
      techStack,
      trackers: detectTrackers(html),
      layout,
      seo: {
        ...seo,
        score: seoResult.score,
        issues: seoResult.issues
      },
      performance,
      accessibility,
      security,
      meta: {
        analyzedAt: new Date().toISOString(),
        analysisTime: `${analysisTime}ms`
      }
    };

    await page.close();

    res.json(result);

  } catch (error) {
    if (page) await page.close();

    console.log("ANALYSIS ERROR:", error.message);

    let userMessage = error.message;
    let errorType = "Failed to analyze website";

    // Better error messages for common issues
    if (error.message.includes("Navigation timeout") || error.message.includes("timeout")) {
      errorType = "Timeout Error";
      userMessage = "The website took too long to respond. This could be due to: slow server response, heavy page content, or network issues. Try again or test a different URL.";
    } else if (error.message.includes("net::ERR_NAME_NOT_RESOLVED")) {
      errorType = "DNS Error";
      userMessage = "Could not resolve the domain name. Please check the URL and try again.";
    } else if (error.message.includes("net::ERR_CONNECTION_REFUSED")) {
      errorType = "Connection Refused";
      userMessage = "The server refused the connection. The website might be down or blocking requests.";
    } else if (error.message.includes("net::ERR_CERT")) {
      errorType = "SSL Certificate Error";
      userMessage = "SSL certificate issue detected. The website may have an invalid or expired certificate.";
    }

    res.status(500).json({
      error: errorType,
      message: userMessage,
      technicalDetails: error.stack || error.message
    });
  }
});

/* ===============================
   Health Check Route
================================ */
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    browserActive: !!browser,
    uptime: process.uptime()
  });
});

/* ===============================
   Start Server
================================ */
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  await initBrowser();
  console.log(`🚀 Running at http://localhost:${PORT}`);
});

process.on('SIGTERM', async () => {
  if (browser) await browser.close();
  process.exit(0);
});