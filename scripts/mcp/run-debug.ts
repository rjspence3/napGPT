#!/usr/bin/env tsx

import { createMCPClient } from "./utils/mcpClient";
import config from "./config";
import * as fs from "fs/promises";
import * as path from "path";
import { runEnergyMeterTest } from "./scenarios/40_energy_meter";

async function main() {
    const headless = config.chrome.headless;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const resultsDir = path.join(config.artifactsDir, timestamp);

    console.log("🚀 Starting NapGPT MCP Debug Run...");
    console.log(`📁 Results directory: ${resultsDir}`);
    console.log(`🌐 Base URL: ${config.baseUrl}`);
    console.log(`👁️  Headless: ${headless}\n`);

    await fs.mkdir(resultsDir, { recursive: true });

    let client = null;

    try {
        console.log("🔌 Connecting to Chrome...");
        client = await createMCPClient(config.baseUrl, headless);
        console.log("✅ Chrome ready\n");

        console.log(`🌐 Navigating to ${config.baseUrl}...`);
        await client.goto(config.baseUrl);
        await new Promise((resolve) => setTimeout(resolve, 2000));

        console.log("🏃 Running 40_energy_meter...");
        const result = await runEnergyMeterTest(client);

        if (result.passed) {
            console.log(`✅ PASSED (${result.duration}ms)`);
        } else {
            console.log(`❌ FAILED (${result.duration}ms)`);
        }

        if (result.notes) {
            result.notes.forEach((note: string) => console.log(`  ${note}`));
        }

    } catch (error: any) {
        console.error(`\n💥 Fatal error: ${error.message}`);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

main().catch(console.error);
