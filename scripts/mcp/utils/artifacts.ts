/**
 * Artifact collection (screenshots, HAR, console logs, traces)
 */

import type { Page, CDPSession } from "puppeteer";
import * as fs from "fs/promises";
import * as path from "path";

export interface ArtifactCollector {
  screenshot(filepath: string): Promise<void>;
  captureConsoleLogs(): Promise<Array<{ level: string; message: string; timestamp: number }>>;
  captureNetworkLogs(): Promise<any[]>;
  captureHAR(filepath: string): Promise<void>;
  startTracing(): Promise<void>;
  stopTracing(filepath: string): Promise<void>;
  saveMetrics(filepath: string, metrics: Record<string, any>): Promise<void>;
}

export function createArtifactCollector(page: Page, cdp: CDPSession): ArtifactCollector {
  const consoleLogs: Array<{ level: string; message: string; timestamp: number }> = [];
  const networkLogs: any[] = [];

  // Capture console messages
  cdp.on("Runtime.consoleAPICalled", (event) => {
    const level = event.type || "log";
    const message = event.args.map((arg: any) => arg.value || JSON.stringify(arg)).join(" ");
    consoleLogs.push({
      level,
      message,
      timestamp: Date.now(),
    });
  });

  // Capture network requests
  cdp.on("Network.requestWillBeSent", (event) => {
    networkLogs.push({
      type: "request",
      url: event.request.url,
      method: event.request.method,
      timestamp: event.timestamp,
    });
  });

  cdp.on("Network.responseReceived", (event) => {
    networkLogs.push({
      type: "response",
      url: event.response.url,
      status: event.response.status,
      timestamp: event.timestamp,
    });
  });

  return {
    async screenshot(filepath: string) {
      await fs.mkdir(path.dirname(filepath), { recursive: true });
      await page.screenshot({ path: filepath, fullPage: true });
    },

    async captureConsoleLogs() {
      return [...consoleLogs];
    },

    async captureNetworkLogs() {
      return [...networkLogs];
    },

    async captureHAR(filepath: string) {
      await fs.mkdir(path.dirname(filepath), { recursive: true });
      // Get network data from CDP
      const { body } = await cdp.send("Network.getResponseBody", {
        requestId: networkLogs[networkLogs.length - 1]?.requestId || "",
      } as any).catch(() => ({ body: "" }));

      const har = {
        log: {
          version: "1.2",
          creator: { name: "NapGPT MCP Tests", version: "1.0" },
          entries: networkLogs.map((log) => ({
            request: {
              method: log.method || "GET",
              url: log.url,
            },
            response: {
              status: log.status || 200,
            },
            timings: {},
          })),
        },
      };

      await fs.writeFile(filepath, JSON.stringify(har, null, 2));
    },

    async startTracing() {
      await cdp.send("Tracing.start", {
        categories: ["-*", "devtools.timeline", "v8"],
        options: "sampling-frequency=10000",
      });
    },

    async stopTracing(filepath: string) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const { value } = await cdp.send("Tracing.end");
      if (value) {
        await fs.mkdir(path.dirname(filepath), { recursive: true });
        await fs.writeFile(filepath, Buffer.from(value, "base64"));
      }
    },

    async saveMetrics(filepath: string, metrics: Record<string, any>) {
      await fs.mkdir(path.dirname(filepath), { recursive: true });
      await fs.writeFile(filepath, JSON.stringify(metrics, null, 2));
    },
  };
}


