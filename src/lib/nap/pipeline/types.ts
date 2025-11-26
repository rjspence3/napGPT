export interface PipelineContext {
    effort: number;
    isDreaming: boolean;
    isNapping: boolean;
    intent: string;
    config: any; // Using any to avoid circular dependency with config.ts for now
    testConfig: any;
    metadata: {
        gaveUp: boolean;
        nonSequitur: boolean;
        strategy: string;
    };
    band: {
        dropout: number;
        nonseq: number;
        maxTokens: number;
    };
    history: { role: string; content: string }[];
}

export interface Processor {
    name: string;
    process(text: string, context: PipelineContext): string;
}
