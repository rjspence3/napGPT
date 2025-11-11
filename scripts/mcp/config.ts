export default {
  baseUrl: process.env.E2E_BASE_URL || "http://localhost:3000",
  timeouts: {
    short: 3000,
    medium: 8000,
    long: 30000, // Increased for slow API responses
    networkIdle: 5000,
  },
  selectors: {
    chatInput: '[data-testid="chat-input"]',
    sendBtn: '[data-testid="send-btn"]',
    effortSlider: '[data-testid="effort-slider"]',
    boostBtn: '[data-testid="boost-btn"]',
    napToggle: '[data-testid="nap-toggle"]',
    energyMeterBar: '[data-testid="energy-meter-bar"]',
    idleOverlay: '[data-testid="idle-overlay"]',
    napOverlay: '[data-testid="nap-overlay"]',
    lastAssistantMsg: '[data-testid="message-assistant"]:last-of-type',
    anyAssistantMsg: '[data-testid="message-assistant"]', // Fallback selector
    messageList: '[data-testid="message-list"]',
    bannerMockMode: '[data-testid="mock-banner"]',
    blanketOverlay: '[data-testid="blanket-overlay"]',
    beansCount: '[data-testid="beans-count"]',
  },
  chrome: {
    headless: process.env.HEADFUL !== "1",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
    ],
  },
  artifactsDir: "artifacts",
};


