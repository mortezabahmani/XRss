import { HttpDataProvider } from '../src/providers/http_provider';

function generateSampleRssXml(itemCount: number): string {
  let itemsXml = '';
  for (let i = 0; i < itemCount; i++) {
    itemsXml += `
    <item>
      <title><![CDATA[Sample Post #${i} with special <characters>]]></title>
      <link>https://example.com/posts/${i}</link>
      <description><![CDATA[This is item content for post #${i} containing <b>HTML markup</b> and info.]]></description>
      <content:encoded><![CDATA[<p>Full content for item ${i} with longer text details...</p>]]></content:encoded>
      <pubDate>Mon, 09 Mar 2026 12:00:00 GMT</pubDate>
      <dc:creator>Author ${i}</dc:creator>
      <guid isPermaLink="false">guid-${i}</guid>
    </item>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Benchmark Feed</title>
    <link>https://example.com</link>
    <description>Benchmark XML Feed</description>
    ${itemsXml}
  </channel>
</rss>`;
}

async function runBenchmark() {
  const xmlData500 = generateSampleRssXml(500);
  const provider = new HttpDataProvider({ endpoint: 'https://example.com/feed.xml' });

  // Access private parseXmlItems method for direct benchmarking
  const parseXmlItems = (provider as any).parseXmlItems.bind(provider);

  // Warmup
  for (let i = 0; i < 10; i++) {
    parseXmlItems(xmlData500);
  }

  const iterations = 100;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    parseXmlItems(xmlData500);
  }
  const elapsedMs = performance.now() - start;

  const totalItemsParsed = 500 * iterations;
  const msPerRun = elapsedMs / iterations;
  const itemsPerSec = (totalItemsParsed / elapsedMs) * 1000;

  console.log(`=== RSS XML Parser Benchmark ===`);
  console.log(`Payload size: 500 RSS items per run`);
  console.log(`Iterations: ${iterations}`);
  console.log(`Total Execution Time: ${elapsedMs.toFixed(2)} ms`);
  console.log(`Avg Time Per Run: ${msPerRun.toFixed(3)} ms`);
  console.log(`Throughput: ${Math.round(itemsPerSec).toLocaleString()} items/sec`);
}

runBenchmark();
