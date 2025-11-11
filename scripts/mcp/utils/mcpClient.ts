/**
 * MCP Client wrapper - supports both Puppeteer and pure CDP WebSocket
 */

import puppeteer, { Browser, Page, CDPSession } from "puppeteer";
import type { ArtifactCollector } from "./artifacts";
import type { BrowserOps } from "./browserOps";
import { createBrowserOps } from "./browserOps";
import { createArtifactCollector } from "./artifacts";
import { createCDPClient, type CDPClient } from "./cdpClient";

export interface MCPClient {
  browser?: Browser;
  page?: Page;
  cdp?: CDPSession | any;
  ws?: any;
  ops: BrowserOps;
  artifacts: ArtifactCollector;
  goto(url: string): Promise<void>;
  close(): Promise<void>;
  evaluate<T>(fn: () => T): Promise<T>;
  injectScriptFromCdn?(url: string): Promise<void>;
}

export async function createMCPClient(
  baseUrl: string,
  headless: boolean = true
): Promise<MCPClient> {
  const driver = process.env.MCP_DRIVER || "puppeteer";

  if (driver === "server") {
    // Pure CDP over WebSocket (connect to chrome-devtools-mcp server)
    const wsUrl = process.env.MCP_WS || "ws://localhost:9222/devtools/browser";
    const cdpClient = await createCDPClient(wsUrl);
    
    return {
      ws: cdpClient.ws,
      ops: cdpClient.ops,
      artifacts: cdpClient.artifacts,
      async goto(url: string) {
        await cdpClient.goto(url);
      },
      async close() {
        await cdpClient.close();
      },
      async evaluate<T>(fn: () => T): Promise<T> {
        return cdpClient.evaluate(fn);
      },
      async injectScriptFromCdn(url: string) {
        await cdpClient.injectScriptFromCdn(url);
      },
    };
  }

  // Default: Puppeteer path
  const browser = await puppeteer.launch({
    headless,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  const page = await browser.newPage();
  const cdp = await page.target().createCDPSession();

  // Enable network and console logging
  await cdp.send("Network.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  await cdp.send("DOM.enable");

  const ops = createBrowserOps(page, cdp);
  const artifacts = createArtifactCollector(page, cdp);

  return {
    browser,
    page,
    cdp,
    ops,
    artifacts,
    async goto(url: string) {
      await page.goto(url, { waitUntil: "networkidle2" });
    },
    async close() {
      await browser.close();
    },
    async evaluate<T>(fn: () => T): Promise<T> {
      return page.evaluate(fn);
    },
    async injectScriptFromCdn(url: string) {
      await page.addScriptTag({ url });
    },
  };
}

