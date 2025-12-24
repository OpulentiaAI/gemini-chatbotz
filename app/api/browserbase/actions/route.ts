import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const BROWSERBASE_API_KEY = process.env.BROWSERBASE_API_KEY;

type BrowserAction = 
  | "navigate"
  | "click"
  | "type"
  | "screenshot"
  | "evaluate"
  | "extractContent"
  | "googleSearch";

interface ActionRequest {
  sessionId: string;
  action: BrowserAction;
  params: Record<string, unknown>;
}

interface ActionResult {
  status: "success" | "error";
  toolName: string;
  dataCollected: boolean;
  sessionId: string;
  data?: unknown;
  error?: string;
  timestamp: number;
}

// Extract clean content using Readability (dynamic import to avoid ESM issues)
async function extractReadableContent(html: string, url: string): Promise<{
  title: string;
  content: string;
  textContent: string;
  excerpt?: string;
  byline?: string;
} | null> {
  try {
    const { JSDOM } = await import("jsdom");
    const { Readability } = await import("@mozilla/readability");
    
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    
    if (!article) return null;
    
    return {
      title: article.title || "",
      content: article.content || "",
      textContent: article.textContent || "",
      excerpt: article.excerpt || undefined,
      byline: article.byline || undefined,
    };
  } catch {
    return null;
  }
}

// Strip HTML tags
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request: NextRequest): Promise<NextResponse<ActionResult>> {
  if (!BROWSERBASE_API_KEY) {
    return NextResponse.json({
      status: "error",
      toolName: "browserbaseAction",
      dataCollected: false,
      sessionId: "",
      error: "BROWSERBASE_API_KEY not configured",
      timestamp: Date.now(),
    }, { status: 503 });
  }

  let body: ActionRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({
      status: "error",
      toolName: "browserbaseAction",
      dataCollected: false,
      sessionId: "",
      error: "Invalid request body",
      timestamp: Date.now(),
    }, { status: 400 });
  }

  const { sessionId, action, params } = body;

  if (!sessionId || !action) {
    return NextResponse.json({
      status: "error",
      toolName: "browserbaseAction",
      dataCollected: false,
      sessionId: sessionId || "",
      error: "sessionId and action are required",
      timestamp: Date.now(),
    }, { status: 400 });
  }

  const connectUrl = `wss://connect.browserbase.com?apiKey=${BROWSERBASE_API_KEY}&sessionId=${sessionId}`;

  // Dynamic import to avoid ESM issues
  const { chromium } = await import("playwright-core");
  
  let browser: Awaited<ReturnType<typeof chromium.connectOverCDP>> | undefined;
  try {
    browser = await chromium.connectOverCDP(connectUrl);
    const context = browser.contexts()[0] || await browser.newContext();
    const page = context.pages()[0] || await context.newPage();

    let result: ActionResult;

    switch (action) {
      case "navigate": {
        const { url, waitFor = "domcontentloaded", timeout = 30000, extractContent: shouldExtract } = params as {
          url: string;
          waitFor?: "load" | "domcontentloaded" | "networkidle";
          timeout?: number;
          extractContent?: boolean;
        };

        await page.goto(url, { waitUntil: waitFor, timeout });
        const title = await page.title();
        let content: string | undefined;

        if (shouldExtract) {
          const html = await page.content();
          const readable = await extractReadableContent(html, url);
          content = readable?.textContent || stripHtml(html);
        }

        result = {
          status: "success",
          toolName: "browserbaseNavigate",
          dataCollected: true,
          sessionId,
          data: { title, url: page.url(), content },
          timestamp: Date.now(),
        };
        break;
      }

      case "click": {
        const { selector, button = "left", clickCount = 1 } = params as {
          selector: string;
          button?: "left" | "right" | "middle";
          clickCount?: number;
        };

        await page.click(selector, { button, clickCount });

        result = {
          status: "success",
          toolName: "browserbaseClick",
          dataCollected: true,
          sessionId,
          data: { clicked: true, selector },
          timestamp: Date.now(),
        };
        break;
      }

      case "type": {
        const { selector, text, delay } = params as {
          selector: string;
          text: string;
          delay?: number;
        };

        if (delay) {
          await page.type(selector, text, { delay });
        } else {
          await page.fill(selector, text);
        }

        result = {
          status: "success",
          toolName: "browserbaseType",
          dataCollected: true,
          sessionId,
          data: { typed: true, selector },
          timestamp: Date.now(),
        };
        break;
      }

      case "screenshot": {
        const { fullPage, selector: screenshotSelector } = params as {
          fullPage?: boolean;
          selector?: string;
        };

        let screenshotBuffer: Buffer;
        if (screenshotSelector) {
          const element = await page.$(screenshotSelector);
          if (!element) {
            throw new Error(`Element not found: ${screenshotSelector}`);
          }
          screenshotBuffer = await element.screenshot();
        } else {
          screenshotBuffer = await page.screenshot({ fullPage });
        }

        result = {
          status: "success",
          toolName: "browserbaseScreenshot",
          dataCollected: true,
          sessionId,
          data: {
            screenshot: screenshotBuffer.toString("base64"),
            mimeType: "image/png",
          },
          timestamp: Date.now(),
        };
        break;
      }

      case "evaluate": {
        const { script } = params as { script: string };
        const evalResult = await page.evaluate(script);

        result = {
          status: "success",
          toolName: "browserbaseEvaluate",
          dataCollected: true,
          sessionId,
          data: { result: evalResult },
          timestamp: Date.now(),
        };
        break;
      }

      case "extractContent": {
        const { url, selector: contentSelector, waitFor: waitTime } = params as {
          url: string;
          selector?: string;
          waitFor?: number;
        };

        await page.goto(url, { waitUntil: "networkidle" });

        if (waitTime) {
          await page.waitForTimeout(waitTime);
        }

        let html: string;
        if (contentSelector) {
          const element = await page.$(contentSelector);
          html = element ? await element.innerHTML() : await page.content();
        } else {
          html = await page.content();
        }

        const readable = await extractReadableContent(html, url);
        const title = await page.title();

        result = {
          status: "success",
          toolName: "browserbaseExtractContent",
          dataCollected: true,
          sessionId,
          data: {
            title: readable?.title || title,
            content: readable?.content || html,
            textContent: readable?.textContent || stripHtml(html),
            excerpt: readable?.excerpt,
            byline: readable?.byline,
          },
          timestamp: Date.now(),
        };
        break;
      }

      case "googleSearch": {
        const { query, maxResults = 10 } = params as {
          query: string;
          maxResults?: number;
        };

        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        await page.goto(searchUrl, { waitUntil: "domcontentloaded" });

        const results = await page.evaluate((max: number) => {
          const items: Array<{ title: string; url: string; snippet: string }> = [];
          const searchResults = document.querySelectorAll("div.g");

          for (let i = 0; i < Math.min(searchResults.length, max); i++) {
            const resultEl = searchResults[i];
            const titleEl = resultEl.querySelector("h3");
            const linkEl = resultEl.querySelector("a");
            const snippetEl = resultEl.querySelector("div[data-sncf], div.VwiC3b");

            if (titleEl && linkEl) {
              items.push({
                title: titleEl.textContent || "",
                url: linkEl.getAttribute("href") || "",
                snippet: snippetEl?.textContent || "",
              });
            }
          }
          return items;
        }, maxResults);

        result = {
          status: "success",
          toolName: "browserbaseGoogleSearch",
          dataCollected: true,
          sessionId,
          data: { results, query },
          timestamp: Date.now(),
        };
        break;
      }

      default:
        result = {
          status: "error",
          toolName: "browserbaseAction",
          dataCollected: false,
          sessionId,
          error: `Unknown action: ${action}`,
          timestamp: Date.now(),
        };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Browserbase action error:", error);
    return NextResponse.json({
      status: "error",
      toolName: `browserbase${action.charAt(0).toUpperCase() + action.slice(1)}`,
      dataCollected: false,
      sessionId,
      error: error instanceof Error ? error.message : String(error),
      timestamp: Date.now(),
    }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
