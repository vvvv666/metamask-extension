const { strict: assert } = require('assert');
const FixtureBuilder = require('../fixture-builder');
const {
  withFixtures,
  defaultGanacheOptions,
  SERVICE_WORKER_URL: CHROME_SERVICE_WORKER_URL,
  openDapp,
} = require('../helpers');

const {
  setupPhishingDetectionMocks,
  BlockProvider,
} = require('../tests/phishing-detection/helpers');

const isChrome = process.env.SELENIUM_BROWSER === 'chrome';

describe('Phishing warning page', function () {
  it('should restore the transaction when service worker restarts', async function () {
    console.warn(
      'This test is written for chrome and will fail if run in firefox.',
    );

    if (!isChrome) {
      this.skip();
    }

    await withFixtures(
      {
        fixtures: new FixtureBuilder().build(),
        ganacheOptions: defaultGanacheOptions,
        title: this.test.title,
        testSpecificMock: async (mockServer) => {
          return setupPhishingDetectionMocks(mockServer, {
            blockProvider: BlockProvider.MetaMask,
            blocklist: ['127.0.0.1'],
          });
        },
        dapp: true,
        failOnConsoleError: false,
      },
      async ({ driver }) => {
        await driver.navigate();
        // log in wallet
        await driver.fill('#password', 'correct horse battery staple');
        await driver.press('#password', driver.Key.ENTER);

        // Restart service worker
        await driver.openNewPage(CHROME_SERVICE_WORKER_URL);

        await driver.clickElement({
          text: 'Service workers',
          tag: 'button',
        });

        await driver.clickElement({
          text: 'terminate',
          tag: 'span',
        });

        // Open the dapp site and extension detect it as phishing warning page
        await openDapp(driver);

        await driver.switchToWindowWithTitle('MetaMask Phishing Detection');
        const phishingPageHeader = await driver.findElements({
          text: 'Deceptive site ahead',
          tag: 'h1',
        });
        assert.ok(phishingPageHeader.length, 1);
      },
    );
  });
});
