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
  },
};

