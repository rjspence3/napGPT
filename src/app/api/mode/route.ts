import { NextResponse } from "next/server";

export async function GET() {
  const hasApiKey = !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
  const isMock = !hasApiKey;

  return NextResponse.json({ isMock });
}
