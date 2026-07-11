import { test, expect } from '@playwright/test';

test('Alur Tambah Pocket Baru', async ({ page }) => {
  // 1. Buka halaman utama
  await page.goto('http://localhost:3000/');
  
  // 2. Pilih Bahasa Inggris di slide pertama Onboarding
  await page.getByRole('button', { name: 'English' }).click();
  
  // 3. Lewati sisa Onboarding (Klik Next 6 kali untuk masuk ke slide Sinkronisasi/Database)
  for (let i = 0; i < 6; i++) {
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  
  // 4. Klik tombol Login di dalam modal Onboarding
  await page.getByRole('button', { name: 'Sign In / Sign Up Account' }).click();
  
  // 5. Isi data kredensial
  await page.getByRole('textbox', { name: 'name@example.com' }).fill('fauzanahmad899@gmail.com');
  await page.getByRole('textbox', { name: '••••••••' }).fill('L0sts4g@');
  await page.getByRole('button', { name: 'Sign In' }).click();
  
  // 6. Pastikan berhasil masuk ke Dashboard Utama
  // Karena saat inisialisasi aplikasi memakan waktu sinkronisasi, kita berikan timeout 15 detik
  const quickAddBtn = page.getByRole('button', { name: 'Quick Add' });
  await expect(quickAddBtn).toBeVisible({ timeout: 15000 });

  // 7. Klik tombol Kelola Kantong (Manage Pockets)
  await page.getByRole('button', { name: 'Manage Pockets' }).click();
  
  // 8. Bebaskan slot jika saku sudah penuh (Maksimal 3 saku)
  const addPocketBtn = page.getByRole('button', { name: 'Add Pocket' }).or(page.getByRole('button', { name: 'Add First Pocket' }));
  if (!(await addPocketBtn.isVisible())) {
    await page.getByRole('button', { name: 'Delete Pocket' }).last().click();
    await page.getByRole('button', { name: 'Delete' }).click();
  }
  
  // 9. Klik Tambah Kantong
  await expect(addPocketBtn).toBeVisible();
  await addPocketBtn.click();
  
  // 10. Isi nama kantong kustom baru (Gunakan nama unik dengan timestamp)
  const pocketInput = page.getByPlaceholder('e.g. Jajan / Tabungan').last();
  await expect(pocketInput).toBeVisible();
  const uniquePocketName = `Pocket ${Date.now()}`;
  await pocketInput.fill(uniquePocketName);
  
  // 11. Simpan perubahan
  await page.getByRole('button', { name: 'Save Changes' }).click();
  
  // 12. Pastikan modal berhasil ditutup setelah klik simpan
  await expect(page.getByRole('button', { name: 'Save Changes' })).not.toBeVisible();

  // 13. Bersihkan saku yang baru ditambahkan agar tes selalu dapat diulang secara mandiri
  await page.getByRole('button', { name: 'Manage Pockets' }).click();
  await page.getByRole('button', { name: 'Delete Pocket' }).last().click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByRole('button', { name: 'Save Changes' })).not.toBeVisible();
});
