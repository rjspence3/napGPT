module.exports = {
  baseUrl: process.env.E2E_BASE_URL || "http://localhost:3000",
  timeouts: {
    short: 1500,
    medium: 4000,
    long: 9000,
    networkIdle: 2000,
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
    messageList: '[data-testid="message-list"]',
    bannerMockMode: '[data-testid="mock-banner"]',
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


