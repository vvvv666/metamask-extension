const { strict: assert } = require('assert');
const {
  convertToHexValue,
  withFixtures,
  regularDelayMs,
} = require('../helpers');
const FixtureBuilder = require('../fixture-builder');

describe('Add account', function () {
  const ganacheOptions = {
    accounts: [
      {
        secretKey:
          '0x53CB0AB5226EEBF4D872113D98332C1555DC304443BEE1CF759D15798D3C55A9',
        balance: convertToHexValue(25000000000000000000),
      },
    ],
  };

  it('should display correct new account name after create', async function () {
    await withFixtures(
      {
        fixtures: new FixtureBuilder().build(),
        ganacheOptions,
        title: this.test.title,
      },
      async ({ driver }) => {
        await driver.navigate();
        await driver.fill('#password', 'correct horse battery staple');
        await driver.press('#password', driver.Key.ENTER);

        await driver.clickElement('.account-menu__icon');
        await driver.clickElement({ text: 'Create account', tag: 'div' });
        await driver.fill('.new-account-create-form input', '2nd account');
        await driver.clickElement({ text: 'Create', tag: 'button' });

        const accountName = await driver.waitForSelector({
          css: '.selected-account__name',
          text: '2nd',
        });
        assert.equal(await accountName.getText(), '2nd account');
      },
    );
  });

  it('It should be possible to remove an account imported with a private key, but should not be possible to remove an account generated from the SRP imported in onboarding', async function () {
    const testPrivateKey =
      '14abe6f4aab7f9f626fe981c864d0adeb5685f289ac9270c27b8fd790b4235d6';

    await withFixtures(
      {
        fixtures: new FixtureBuilder().build(),
        ganacheOptions,
        title: this.test.title,
      },
      async ({ driver }) => {
        await driver.navigate();
        await driver.fill('#password', 'correct horse battery staple');
        await driver.press('#password', driver.Key.ENTER);

        await driver.delay(regularDelayMs);

        await driver.clickElement('.account-menu__icon');
        await driver.clickElement({ text: 'Create account', tag: 'div' });
        await driver.fill('.new-account-create-form input', '2nd account');
        await driver.clickElement({ text: 'Create', tag: 'button' });

        await driver.clickElement(
          '[data-testid="account-options-menu-button"]',
        );

        const menuItems = await driver.findElements('.menu-item');
        assert.equal(menuItems.length, 3);

        // click out of menu
        await driver.clickElement('.menu__background');

        // import with private key
        await driver.clickElement('.account-menu__icon');
        await driver.clickElement({ text: 'Import account', tag: 'div' });

        // enter private key',
        await driver.fill('#private-key-box', testPrivateKey);
        await driver.clickElement({ text: 'Import', tag: 'button' });

        // should show the correct account name
        const importedAccountName = await driver.findElement(
          '.selected-account__name',
        );
        assert.equal(await importedAccountName.getText(), 'Account 3');

        await driver.clickElement(
          '[data-testid="account-options-menu-button"]',
        );

        const menuItems2 = await driver.findElements('.menu-item');
        assert.equal(menuItems2.length, 4);

        await driver.findElement(
          '[data-testid="account-options-menu__remove-account"]',
        );
      },
    );
  });
});
