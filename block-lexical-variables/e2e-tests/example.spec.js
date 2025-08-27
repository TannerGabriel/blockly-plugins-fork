// @ts-check
import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Playwright/);
});

test('get started link', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Click the get started link.
  await page.getByRole('link', { name: 'Get started' }).click();

  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});

test('Open playground', async ({ page }) => {
  await page.goto('http://localhost:8080')
  await page.waitForTimeout(15000);
  //await page.waitForTimeout(5000);

  await expect(page).toHaveTitle('Blockly Block Test')
  await page.waitForLoadState('domcontentloaded')
  await page.waitForLoadState('networkidle')

  // Selector: #root > div:nth-child(3) > div:nth-child(3) > div:nth-child(2) > div > div.overflow-guard > div.monaco-scrollable-element.editor-scrollable.vs-dark > div.lines-content.monaco-editor-background > div.view-lines
//   const textBox = await page.getByText('<xml xmlns="https://developers.google.com/blockly/xml"></xml>')
//   console.log(textBox)
//   await textBox.fill(
//     `
//     <xml xmlns="https://developers.google.com/blockly/xml">
//   <block type="local_declaration_statement" id="qUZpS_Q25=2L%X6HCcj?" x="168" y="399">
//     <mutation>
//       <localname name="name"></localname>
//     </mutation>
//     <field name="VAR0">name</field>
//   </block>
// </xml>`
//   )
  await expect(page).toHaveTitle('Blockly Block Test')
})
