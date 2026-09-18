import { WebResearchService } from '../server/agent/WebResearchService.js';
import { WebBrowserService } from '../server/agent/WebBrowserService.js';

async function testWebBrowser() {
  const research = new WebResearchService();
  const browser = new WebBrowserService(research);

  const status = browser.status();
  console.log('WebBrowser status:', JSON.stringify(status, null, 2));

  const info = browser.getChromiumInfo();
  console.log('Chromium Info:', info);

  if (info.found) {
    console.log(`Chromium detected at ${info.path} (${info.name})`);
  } else {
    console.log('Chromium binary not found on this system, using HTTP fetcher fallback.');
  }

  // Test cleaning HTML
  const sampleHtml = `
    <html>
      <head><title>Test Page Title</title><style>.test{color:red;}</style></head>
      <body>
        <h1>Headline</h1>
        <p>This is a paragraph with <a href="https://example.com">a link</a> &amp; special chars.</p>
        <script>console.log('secret');</script>
      </body>
    </html>
  `;
  const cleaned = (browser as any).cleanHtmlToText(sampleHtml);
  console.log('Cleaned HTML Title:', cleaned.title);
  console.log('Cleaned HTML Content:', cleaned.content);

  if (cleaned.title !== 'Test Page Title') throw new Error(`Unexpected title: ${cleaned.title}`);
  if (!cleaned.content.includes('Headline') || !cleaned.content.includes('This is a paragraph with a link & special chars.')) {
    throw new Error(`Unexpected content: ${cleaned.content}`);
  }
  if (cleaned.content.includes('console.log') || cleaned.content.includes('.test{')) {
    throw new Error(`Script or style tag leaked into content!`);
  }

  console.log('PASS: WebBrowser unit tests completed successfully.');
}

testWebBrowser().catch(err => {
  console.error('FAIL: WebBrowser test failed:', err);
  process.exit(1);
});
