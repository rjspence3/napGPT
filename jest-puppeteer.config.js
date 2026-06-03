module.exports = {
  launch: {
    headless: process.env.HEADFUL !== '1',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  },
  server: {
    command: 'npm run start',
    port: 3000,
    launchTimeout: 60000,
    debug: true,
    // CI starts the app itself before running jest, so port 3000 is already
    // taken. Without this, jest-dev-server's default 'ask' action blocks forever
    // waiting on stdin in non-interactive CI (the 6h/30m hang). 'ignore' reuses
    // the running server; locally, when the port is free, it still starts its own.
    usedPortAction: 'ignore',
  },
};

