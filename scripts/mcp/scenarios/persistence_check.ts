import type { MCPClient } from "../utils/mcpClient";
import { createAssertions } from "../utils/assertions";
import config from "../config";

export async function runPersistenceCheck(client: MCPClient): Promise<{
    passed: boolean;
    duration: number;
    notes: string[];
}> {
    const startTime = Date.now();
    const notes: string[] = [];
    const assert = createAssertions();
    const { ops } = client;
    const cfg = config;

    try {
        notes.push("Starting persistence check...");

        // 1. Initial state check
        await client.goto(cfg.baseUrl);
        await ops.waitFor(cfg.selectors.chatInput, cfg.timeouts.short);

        // Get initial beans
        const initialBeans = await client.evaluate(() => {
            return (window as any).__nap_store.getState().beans;
        });
        notes.push(`Initial beans: ${initialBeans}`);

        // 2. Modify state (spend a bean)
        await client.evaluate(() => {
            (window as any).__nap_store.getState().spendBean();
        });
        const modifiedBeans = await client.evaluate(() => {
            return (window as any).__nap_store.getState().beans;
        });
        notes.push(`Modified beans: ${modifiedBeans}`);
        assert.assertEquals(modifiedBeans, initialBeans - 1, "Beans should have decreased by 1");

        // 3. Reload page
        notes.push("Reloading page...");
        await client.goto(cfg.baseUrl);
        await ops.waitFor(cfg.selectors.chatInput, cfg.timeouts.short);

        // 4. Verify state persisted
        const persistedBeans = await client.evaluate(() => {
            return (window as any).__nap_store.getState().beans;
        });
        notes.push(`Persisted beans: ${persistedBeans}`);

        assert.assertEquals(persistedBeans, modifiedBeans, "Beans count should persist after reload");

        return {
            passed: true,
            duration: Date.now() - startTime,
            notes,
        };
    } catch (error: any) {
        notes.push(`Error: ${error.message}`);
        return {
            passed: false,
            duration: Date.now() - startTime,
            notes,
        };
    }
}
