import { test, expect } from '@playwright/test';

test.describe('Dashboard Comprehensive Features Test', () => {
  test('Complete Flow: Onboarding, Login, Add Pocket, Add Transaction, Auto Transaction, Manage Fields, and OCR Dialog', async ({ page }) => {
    // 1. Navigate to the application
    await page.goto('http://localhost:3000/');
    
    // Register console logger to capture missing fields printout
    page.on('console', msg => {
      console.log(`BROWSER CONSOLE: [${msg.type()}] ${msg.text()}`);
    });
    
    // 2. Onboarding Flow (Clicking 'Next' 6 times to enter Sync/Database slide)
    for (let i = 0; i < 6; i++) {
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
    
    // 3. Click Login/Sign In inside the onboarding modal (supports both English and Indonesian translations)
    await page.getByRole('button', { name: /Sign In \/ Sign Up Account|Masuk \/ Daftar Akun/ }).click();
    
    // 4. Fill credentials and sign in
    await page.getByRole('textbox', { name: 'name@example.com' }).fill('fauzanahmad899@gmail.com');
    await page.getByRole('textbox', { name: '••••••••' }).fill('L0sts4g@');
    await page.getByRole('button', { name: /Sign In|Masuk/ }).click();
    
    // 5. Verify successful login by checking for the Quick Add/Tambah Cepat button (Wait up to 15 seconds for sync to complete)
    const quickAddBtn = page.getByRole('button', { name: /Quick Add|Tambah Cepat/ });
    await expect(quickAddBtn).toBeEnabled({ timeout: 15000 });

    // 5.1 Clean up any pre-existing custom fields to ensure form is in a clean state (no required custom fields)
    await page.getByRole('button', { name: /Manage Fields|Kelola Kolom/ }).click();
    
    const manageFieldsDialog = page.getByRole('dialog').filter({ hasText: /Manage Fields|Kelola Kolom/ });
    await expect(manageFieldsDialog).toBeVisible();

    // Wait for the modal fields to be fully loaded and active before cleaning up
    await expect(manageFieldsDialog.getByPlaceholder('Field Name')).toBeEnabled();

    const existingFieldDeleteBtns = manageFieldsDialog.locator('button:has(svg.lucide-trash-2)');
    while (await existingFieldDeleteBtns.count() > 0) {
      await existingFieldDeleteBtns.first().click();
      // Click "Delete" inside confirmation dialog
      const confirmDeleteDialog = page.getByRole('dialog').filter({ hasText: /Delete Field\?/ });
      await confirmDeleteDialog.getByRole('button', { name: 'Delete' }).click();
      // Wait for background database sync to complete
      await expect(manageFieldsDialog.getByPlaceholder('Field Name')).toBeEnabled();
    }
    
    // Close the specific Manage Fields dialog
    await manageFieldsDialog.locator('[data-slot="dialog-close"]').click();
    await expect(manageFieldsDialog).not.toBeVisible();
    await expect(quickAddBtn).toBeEnabled();

    // 6. Test: Manage Pockets (Tambah Pocket)
    await page.getByRole('button', { name: /Manage Pockets|Kelola Kantong/ }).click();
    
    // The "Add Pocket" button is hidden if there are already 3 pockets.
    // If it's not visible, delete the last pocket to free up a slot.
    const addPocketBtn = page.getByRole('button', { name: /Add Pocket|Tambah Kantong|Add First Pocket|Tambah Kantong Pertama/ });
    if (!(await addPocketBtn.isVisible())) {
      await page.getByRole('button', { name: 'Delete Pocket' }).last().click();
      await page.getByRole('button', { name: 'Delete' }).click();
    }
    
    // Now click the Add Pocket button
    await expect(addPocketBtn).toBeVisible();
    await addPocketBtn.click();
    
    // Fill the pocket name input (use a unique timestamped name to prevent duplicate dialogs)
    const pocketInput = page.getByPlaceholder('e.g. Jajan / Tabungan').last();
    await expect(pocketInput).toBeVisible();
    const uniquePocketName = `Pocket ${Date.now()}`;
    await pocketInput.fill(uniquePocketName);
    
    // Save pocket changes
    await page.getByRole('button', { name: /Save Changes|Simpan Perubahan/ }).click();
    
    // Wait for the modal to save and close
    await expect(page.getByRole('button', { name: /Save Changes|Simpan Perubahan/ })).not.toBeVisible();

    // 7. Test: Add Transaction (Tambah Transaksi Baru)
    await page.getByPlaceholder('Name...').fill('Playwright Test Expense');
    await page.getByPlaceholder('0', { exact: true }).fill('15000');
    
    // Ensure "Expense" transaction type is selected using exact text matches
    await page.getByRole('button', { name: 'Expense', exact: true })
      .or(page.getByRole('button', { name: 'Pengeluaran', exact: true }))
      .first()
      .click();
    
    // Select category dropdown and click the first option (wait for options to stabilize and verify selection)
    const categoryCombobox = page.getByRole('combobox');
    await categoryCombobox.click();
    const categoryOption = page.getByRole('option', { name: /Makan|Jajan|Transport|Entertainment|Lainnya/ }).first();
    await expect(categoryOption).toBeVisible();
    await categoryOption.click();
    await expect(categoryCombobox).not.toHaveText(/Select a category|Pilih kategori/);
    
    // Fill optional notes
    await page.getByPlaceholder('Note...').fill('Automated Test Note');
    
    // Click Quick Add/Tambah Cepat to submit the transaction
    await page.getByRole('button', { name: /Quick Add|Tambah Cepat/ }).click();

    // Wait for the "Transaction Saved!" status modal and close it using its close button
    const successDialog = page.getByRole('dialog').filter({ hasText: /Transaction Saved!|Transaksi Tersimpan!/ });
    await expect(successDialog).toBeVisible();
    await successDialog.locator('[data-slot="dialog-close"]').click();
    await expect(successDialog).not.toBeVisible();

    // 8. Test: Automatic Transactions (Auto Transactions / Recurring Templates)
    await page.getByRole('button', { name: /Auto Transactions|Transaksi Otomatis/ }).click();
    
    const autoTxDialog = page.getByRole('dialog').filter({ hasText: /Recurring Transaction Templates|Template Transaksi Otomatis/ });
    await expect(autoTxDialog).toBeVisible();
    
    // Fill the recurring template details
    const uniqueTemplateName = `Auto ${Date.now()}`;
    await page.getByPlaceholder(/Transaction Name|Nama Transaksi/).fill(uniqueTemplateName);
    await page.getByPlaceholder('e.g. 500.000').fill('150000');
    
    // Click Schedule Transaction to save the template
    await page.getByRole('button', { name: /Schedule Transaction|Jadwalkan Transaksi/ }).click();
    
    // Clean up: Delete the template we just created to keep the test environment clean
    await page.getByRole('button').filter({ has: page.locator('svg.lucide-trash-2') }).last().click();
    await page.getByRole('button', { name: 'Delete' }).click();
    
    // Close the auto transaction modal using close button
    await autoTxDialog.locator('[data-slot="dialog-close"]').click();
    await expect(autoTxDialog).not.toBeVisible();

    // 9. Test: Manage Fields (Add Custom Field)
    await page.getByRole('button', { name: /Manage Fields|Kelola Kolom/ }).click();
    await expect(manageFieldsDialog).toBeVisible();
    
    // Fill the field name placeholder
    const uniqueFieldName = `Field ${Date.now()}`;
    await page.getByPlaceholder('Field Name').fill(uniqueFieldName);
    
    // Click the "Add" button inside the manage fields modal
    await page.getByRole('button', { name: /Add|Tambah/ }).click();
    
    // Clean up: Delete the field we just added to keep the test repeatable
    await page.getByRole('button').filter({ has: page.locator('svg.lucide-trash-2') }).last().click();
    const confirmDeleteDialog = page.getByRole('dialog').filter({ hasText: /Delete Field\?/ });
    await confirmDeleteDialog.getByRole('button', { name: 'Delete' }).click();
    await expect(manageFieldsDialog.getByPlaceholder('Field Name')).toBeEnabled();
    
    // Close the manage fields modal using close button
    await manageFieldsDialog.locator('[data-slot="dialog-close"]').click();
    await expect(manageFieldsDialog).not.toBeVisible();

    // 10. Test: OCR Scan Receipt
    // The scan button is the camera button next to the quick add submit button
    const ocrBtn = page.getByRole('button', { name: /Scan Struk|OCR Receipt Scan/i });
    await expect(ocrBtn).toBeVisible();
    await ocrBtn.click();
    
    // Wait for the OCR Privacy Dialog or modal to appear
    const ocrDialog = page.getByRole('dialog').filter({ hasText: /Scan Receipt|Pindai Struk/ });
    await expect(ocrDialog).toBeVisible();
    
    // Close the OCR scanner dialog using close button
    await ocrDialog.locator('[data-slot="dialog-close"]').click();
    await expect(ocrDialog).not.toBeVisible();

    // 11. Final Clean up: Delete the custom pocket we created earlier
    await page.getByRole('button', { name: /Manage Pockets|Kelola Kantong/ }).click();
    await page.getByRole('button', { name: 'Delete Pocket' }).last().click();
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: /Save Changes|Simpan Perubahan/ }).click();
    await expect(page.getByRole('button', { name: /Save Changes|Simpan Perubahan/ })).not.toBeVisible();
  });
});
