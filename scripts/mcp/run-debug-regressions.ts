import { createMCPClient } from "./utils/mcpClient";
import { runEffortBandsTest } from "./scenarios/10_effort_bands";
import { runCoffeeEconomyTest } from "./scenarios/35_coffee_economy";
import config from "./config";

async function resetState(client: any) {
    await client.evaluate(() => {
        const store = (window as any).__nap_store;
        if (store) {
            store.setState({
                effort: 50,
                energy: 100,
                idleSince: null,
                isNapping: false,
                boostCooldown: 0,
                boostCooldownUntil: 0,
                napTimerEnabled: false,
                blanketOn: false,
                beans: 3
            });
        }
        localStorage.clear();
        sessionStorage.clear();
    });
    await new Promise((resolve) => setTimeout(resolve, 200));
}

async function main() {
    const client = await createMCPClient(config.baseUrl, process.env.HEADFUL !== "1");

    console.log(`🌐 Navigating to ${config.baseUrl}...`);
    await client.goto(config.baseUrl);
    // Wait for React hydration
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const scenarios = [
        { name: "10_effort_bands", fn: runEffortBandsTest },
        { name: "35_coffee_economy", fn: runCoffeeEconomyTest },
    ];

    try {
        for (const scenario of scenarios) {
            console.log(`\nRunning scenario: ${scenario.name}`);
            await resetState(client);
            const result = await scenario.fn(client);
            if (!result.passed) {
                console.error(`❌ ${scenario.name} failed`);
                console.error(result.notes.join("\n"));
            } else {
                console.log(`✅ ${scenario.name} passed`);
            }
        }
    } catch (error) {
        console.error("Fatal error:", error);
    } finally {
        await client.close();
    }
}

main().catch(console.error);
