import puppeteer, { Browser } from "puppeteer-core";

export interface PDFOptions {
  html?: string;        // raw HTML
  url?: string;         // OR a URL
  executablePath: string; // chrome.exe path (must be passed by user)
  puppeteerArgs?: string[]; // extra launch args
}

export async function generatePDF(options: PDFOptions): Promise<Buffer> {
  const { html, url, executablePath, puppeteerArgs = [] } = options;

  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: puppeteerArgs,
    });

    const page = await browser.newPage();

    if (html) {
      await page.setContent(html, { waitUntil: "networkidle0" });
    } else if (url) {
      await page.goto(url, { waitUntil: "networkidle0" });
    } else {
      throw new Error("Either html or url must be provided");
    }

    // Expand all <details>
    await page.evaluate(() => {
      function expandAllDetails(root = document) {
        root.querySelectorAll("details").forEach((d) => {
          d.open = true;
          expandAllDetails(d);
        });
      }
      expandAllDetails();
    });

    // Add CSS page breaks
    await page.addStyleTag({
      content: `
        * { box-sizing: border-box; }
        .page-break { page-break-after: always; }
      `,
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
    });

    return pdfBuffer;
  } finally {
    if (browser) await browser.close();
  }
}
