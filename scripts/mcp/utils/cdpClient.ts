/**
 * Pure CDP client over WebSocket (no Puppeteer)
 * Connects to chrome-devtools-mcp server or Chrome with --remote-debugging-port
 */

import WebSocket from "ws";
import type { BrowserOps } from "./browserOps";
import type { ArtifactCollector } from "./artifacts";
import { createBrowserOps } from "./browserOps";
import { createArtifactCollector } from "./artifacts";

export interface CDPClient {
  ws: WebSocket;
  sessionId: string;
  ops: BrowserOps;
  artifacts: ArtifactCollector;
  send(method: string, params?: any): Promise<any>;
  goto(url: string): Promise<void>;
  close(): Promise<void>;
  evaluate<T>(fn: () => T): Promise<T>;
  injectScriptFromCdn(url: string): Promise<void>;
}

let requestId = 0;
const pendingRequests = new Map<number, { resolve: (value: any) => void; reject: (error: any) => void }>();

export async function createCDPClient(wsUrl: string): Promise<CDPClient> {
  // If URL doesn't have a target ID, we need to list targets first
  let targetWsUrl = wsUrl;
  
  if (!wsUrl.includes("/devtools/page/") && !wsUrl.includes("/devtools/browser/")) {
    // Connect to browser endpoint to list targets
    const browserWs = new WebSocket(wsUrl.replace("/devtools/browser", "").replace("/devtools/page", "") + "/json");
    
    await new Promise<void>((resolve, reject) => {
      browserWs.on("open", () => {
        browserWs.close();
        resolve();
      });
      browserWs.on("error", reject);
    });

    // Fetch target list via HTTP
    const httpUrl = wsUrl.replace("ws://", "http://").replace("wss://", "https://").split("/devtools")[0];
    const response = await fetch(`${httpUrl}/json`);
    const targets = await response.json();
    
    // Use first page target
    const pageTarget = targets.find((t: any) => t.type === "page") || targets[0];
    targetWsUrl = pageTarget.webSocketDebuggerUrl;
  }

  const ws = new WebSocket(targetWsUrl);
  
  await new Promise<void>((resolve, reject) => {
    ws.on("open", resolve);
    ws.on("error", reject);
    setTimeout(() => reject(new Error("WebSocket connection timeout")), 10000);
  });

  // Get session ID from first message or use default
  let sessionId = "";

  ws.on("message", (data: Buffer) => {
    const message = JSON.parse(data.toString());
    
    if (message.id !== undefined) {
      const pending = pendingRequests.get(message.id);
      if (pending) {
        pendingRequests.delete(message.id);
        if (message.error) {
          pending.reject(new Error(message.error.message || "CDP error"));
        } else {
          pending.resolve(message.result);
        }
      }
    }
  });

  // Enable domains
  await sendCommand(ws, "Runtime.enable", {});
  await sendCommand(ws, "Page.enable", {});
  await sendCommand(ws, "Network.enable", {});
  await sendCommand(ws, "DOM.enable", {});

  // Create a minimal page-like object for browserOps
  const page = {
    waitForSelector: async (selector: string, options?: any) => {
      // Poll for element
      for (let i = 0; i < (options?.timeout || 5000) / 100; i++) {
        const result = await sendCommand(ws, "Runtime.evaluate", {
          expression: `document.querySelector("${selector}") !== null`,
        });
        if (result.result?.value) return;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      throw new Error(`Selector ${selector} not found`);
    },
    click: async (selector: string) => {
      const nodeId = await getNodeId(ws, selector);
      const box = await sendCommand(ws, "DOM.getBoxModel", { nodeId });
      const centerX = box.model.content[0] + (box.model.content[2] - box.model.content[0]) / 2;
      const centerY = box.model.content[1] + (box.model.content[3] - box.model.content[1]) / 2;
      await sendCommand(ws, "Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: centerX,
        y: centerY,
        button: "left",
        clickCount: 1,
      });
      await sendCommand(ws, "Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: centerX,
        y: centerY,
        button: "left",
      });
    },
    type: async (selector: string, text: string) => {
      await sendCommand(ws, "DOM.focus", { nodeId: await getNodeId(ws, selector) });
      for (const char of text) {
        await sendCommand(ws, "Input.dispatchKeyEvent", {
          type: "char",
          text: char,
        });
      }
    },
    focus: async (selector: string) => {
      await sendCommand(ws, "DOM.focus", { nodeId: await getNodeId(ws, selector) });
    },
    screenshot: async (options?: { path?: string; fullPage?: boolean }) => {
      const { data } = await sendCommand(ws, "Page.captureScreenshot", {
        format: "png",
        fromSurface: true,
      });
      if (options?.path) {
        const fs = await import("fs/promises");
        await fs.writeFile(options.path, Buffer.from(data, "base64"));
      }
      return Buffer.from(data, "base64");
    },
    evaluate: async <T>(fn: () => T): Promise<T> => {
      const result = await sendCommand(ws, "Runtime.evaluate", {
        expression: `(${fn.toString()})()`,
      });
      return result.result?.value as T;
    },
    $: async (selector: string) => {
      const nodeId = await getNodeId(ws, selector);
      return { nodeId };
    },
    goto: async (url: string) => {
      await sendCommand(ws, "Page.navigate", { url });
      await sendCommand(ws, "Page.loadEventFired", {});
    },
  } as any;

  const cdp = {
    send: async (method: string, params?: any) => {
      return sendCommand(ws, method, params);
    },
    on: (event: string, handler: (data: any) => void) => {
      // Store handlers for CDP events
      ws.on("message", (data: Buffer) => {
        const message = JSON.parse(data.toString());
        if (message.method === event) {
          handler(message.params);
        }
      });
    },
  } as any;

  const ops = createBrowserOps(page, cdp);
  const artifacts = createArtifactCollector(page, cdp);

  return {
    ws,
    sessionId,
    ops,
    artifacts,
    async send(method: string, params?: any) {
      return sendCommand(ws, method, params);
    },
    async goto(url: string) {
      await page.goto(url);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    },
    async close() {
      ws.close();
    },
    async evaluate<T>(fn: () => T): Promise<T> {
      return page.evaluate(fn);
    },
    async injectScriptFromCdn(url: string) {
      await sendCommand(ws, "Page.addScriptToEvaluateOnNewDocument", {
        source: `(async () => { const s = document.createElement('script'); s.src = '${url}'; document.head.appendChild(s); })()`,
      });
    },
  };
}

async function sendCommand(ws: WebSocket, method: string, params?: any): Promise<any> {
  const id = ++requestId;
  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error(`CDP command timeout: ${method}`));
      }
    }, 10000);
  });
}

async function getNodeId(ws: WebSocket, selector: string): Promise<number> {
  const { root } = await sendCommand(ws, "DOM.getDocument", {});
  const { nodeId } = await sendCommand(ws, "DOM.querySelector", {
    nodeId: root.nodeId,
    selector,
  });
  if (!nodeId) throw new Error(`Element not found: ${selector}`);
  return nodeId;
}


