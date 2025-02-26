import puppeteer from 'puppeteer-extra';
import path from 'path';
import cron from 'node-cron';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

async function getMaghribTime() {
  try {
    const response = await fetch(
      'https://api.aladhan.com/v1/timingsByCity?city=Jakarta&country=ID&method=20'
    );

    const data = await response.json();

    const maghribTime = data.data.timings.Maghrib;

    return maghribTime;
  } catch (error) {
    console.error('Gagal mengambil waktu Maghrib:', error);
    return '18:00'; // Default jika gagal
  }
}

async function updateWhatsAppStatus() {
  console.log('Memulai puppeteer...');
  // Tentukan path untuk menyimpan sesi login
  const userDataDir = path.join('puppeteer_session');

  const browser = await puppeteer.use(StealthPlugin()).launch({
    headless: true,
    userDataDir: userDataDir,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
    ],
  });

  const page = await browser.newPage();
  await page.goto('https://web.whatsapp.com');

  console.log('Silakan login di WhatsApp Web jika belum login...');
  await page.waitForSelector('button[aria-label="Status"]', { timeout: 60000 });

  await page.click('button[aria-label="Status"]');
  console.log("Berhasil klik tombol 'Status'");

  // Tunggu tombol buat status baru
  await page.waitForSelector('button[aria-label="Add Status"]', {
    timeout: 60000,
  });
  await page.click('button[aria-label="Add Status"]');

  //   klik icon photos & videos
  const [fileChooser] = await Promise.all([
    page.waitForFileChooser(),
    page.click('span[data-icon="media-multiple"]'),
  ]);

  console.log('File chooser terdeteksi');

  const imagePath = path.resolve('./video.mp4');

  await fileChooser.accept([imagePath]);

  console.log('Mengunggah gambar...');

  await new Promise((resolve) => setTimeout(resolve, 3000));

  console.log('Mengirim status...');
  await page.keyboard.press('Enter');

  console.log('Status berhasil diperbarui!');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  await browser.close();
}

async function scheduleDailyUpdate() {
  const maghribTime = await getMaghribTime();

  const scheduleTime = maghribTime.split(':');
  let hour = parseInt(scheduleTime[0]);
  let minute = parseInt(scheduleTime[1]);

  hour -= 2;

  if (hour < 0) {
    hour += 24;
  }

  console.log(
    `Menjadwalkan pengingat Maghrib setiap hari pada ${hour}:${minute} WIB`
  );

  cron.schedule(
    `${minute} ${hour} * * *`,
    async () => {
      console.log('Menjalankan update status WhatsApp...');
      await updateWhatsAppStatus();
    },
    {
      timezone: 'Asia/Jakarta',
    }
  );
}

scheduleDailyUpdate();
