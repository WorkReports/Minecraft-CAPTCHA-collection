const mineflayer = require('mineflayer');
const fs = require('fs');
const path = require('path');
const { Dropbox } = require('dropbox'); // Подключаем Dropbox SDK
const FlayerCaptcha = require('./FlayerCaptcha'); // Подключение вашей библиотеки

// Настройки бота
const botOptions = {
  host: 'mc.angelmine.ru',
  port: 25565,
  username: 'J1edde',
  version: '1.16.5',
};

// Dropbox Access Token (замените на ваш токен)
const DROPBOX_ACCESS_TOKEN = 'sl.u.AFqBuQg8zHRleql8Esk5twr5XMQ-z7tfKLA_tLKnYlwk8T0oOmbdOIzeCuv0O2SFj94OwwdvT_ayzBw3SrfTT1DZu385AanuTF74PyxlJEWDbXgA4skhxI5iUkiq1HUEZlsoEG3NxkN06LTyuKW4O5GLJEetGQ8hGCJBxh09hEe1LDoMBt2sjH2ukVWKBrVDwm9cUqBmm1sJ0AmltBDHuBT-t51E-Rbx4e6OO2PuLeiqcunFivQ8Iq0KuMN80sUmDyV6g4CDFGrznl7vKycOvfUwFa-ZAWOk17PBKO9B_zRrDOD0NYMnIV5dWqIjY23S9-NrZVR6d274WMRSVUU2Bc9sMHKFqX5MBCJFwAvembldoOMeyu9XH3Xd6u_sa_h7nWzqogXWYmTIYkFN9rGQO5rGOg-8y2Nd6KgIDi8lag7VcB6XVrH4ni-4nhVTIKiISWMzampDtzilKQQ--4-m4xSMdupRMHI4X56LFhvlcl3kYq22dumOVIxtCdQl-krxpczjFCauyhw_pGzpEspv5Pl8pyr_RdVPlIC1narPIL_WL5SxVEHljXvV_11S7zANFHJL0IQr_HphFQUubP73d3hl0vOb7-rcEzbDgRelRf7Rqe_HumU2pDkO0IcyabUC8B6GfVaJBclbK11VVVCnNR-2107Fj2qdZmikE4r0nhEnZJmnyoKkcMnRhD4HyAn1YX2iBevluss8M2fh0LfiY6ffDlVhBwai0UFjhSkruWGbfQ-hTDp2DTVvNrQCT3tApmWAPpfDzzxULDlrRQZ1L3sxoDF59UUi2PgQlvKs-yuek67PDsNruayMvLaqPXGR9cGsHGDnPl5ZSgepDg0Bh60voK6RvUVi6hT9stMCF3ntGc-0WE2t0J-enSmMMb6ESsbAhmwbvvoyxpg2sC0-tREGkUmi023QVL31nncxFLc9SQ8QdwbenOPIO9-kOBhyTNww2te-VV_UIORPjiLd4Cn_qgN00ES56VuaUxEx9VWz9zg3-5SJPJU5VOtk_8963Y6UHiJQwWZmZDIG60IZyc6k22zxEzzo10jTEf8RDcx_B1IRaG6XsMJ8F_uZ2sx_rhjh8A-lva_VOI6SjEV_w3VlfYa3CbxgEKTkGYzeEk4gBvmRlG4WFrL3R8CdJurR4dRxhAaWEKYxLeBtyG9xQqQab7pWS8gYr9zztV-8i1_ZNY_yiY3olyP4qR0rF7EAtIkO5tOJNKgyZxbWg2ilEK9gQn1SGk-sWc0lUmICoekL6R5TAjzisTwlzr7ai-8zbB4hG97jweY69710hoWVhG5c34AVf_NsaOgABRMPmXCxmG-XfvBINZezcW2NeUfRCBFEmp8GaIIg39P_DEZ3CAIqi9uhVEB-X_-xqFGtD5aI3nj-TVsB0a0TlKKH9OvIH66_lm2HyoFML9OJFBaSOmgl';
const dbx = new Dropbox({ accessToken: DROPBOX_ACCESS_TOKEN });

// Папка для локального хранения капч
const localFolder = './captchas';
// Папка в Dropbox
const dropboxFolder = '/captchas';

// Функция для загрузки файла на Dropbox
async function uploadFileToDropbox(filePath, fileName) {
  const dropboxPath = path.join(dropboxFolder, fileName).replace(/\\/g, '/'); // Корректируем путь для Dropbox

  try {
    const fileContent = fs.readFileSync(filePath);
    await dbx.filesUpload({
      path: dropboxPath,
      contents: fileContent,
      mode: { ".tag": "overwrite" }, // Перезаписываем файл, если он уже существует
    });
    console.log(`Uploaded ${fileName} to Dropbox as ${dropboxPath}`);
  } catch (error) {
    console.error(`Error uploading ${fileName} to Dropbox:`, error);
  }
}

// Функция создания бота
function createBot() {
  const bot = mineflayer.createBot(botOptions);

  const captcha = new FlayerCaptcha(bot);
  captcha.on('success', async (image, viewDirection) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Уникальное имя файла
    const filename = `captcha-${timestamp}.png`;
    const filePath = path.join(localFolder, filename);
    await image.toFile(filePath); // Сохранение файла локально
    console.log(`Captcha saved locally as ${filePath}`);

    // Загружаем файл на Dropbox
    uploadFileToDropbox(filePath, filename);

    // Бот выходит с сервера и переподключается через 1 секунду
    bot.end();
    setTimeout(() => {
      console.log('Переподключение бота...');
      createBot();
    }, 3000); // Задержка в 1 секунду перед повторным подключением
  });

  bot.on('messagestr', (message) => {
    console.log(`[Сообщение] ${message}`);
  });

  bot.on('error', (err) => {
    console.error(`Ошибка: ${err}`);
    bot.end();
    setTimeout(() => {
      console.log('Переподключение после ошибки...');
      createBot();
    }, 3000); // Переподключение через 1 секунду при ошибке
  });

  bot.on('end', () => {
    console.log('Соединение окончено. Переподключение...');
    setTimeout(() => {
      console.log('Переподключение...');
      createBot();
    }, 3000); // Переподключение через 1 секунду после завершения работы
  });
}

// Создание локальной папки для временного хранения капч, если она не существует
if (!fs.existsSync(localFolder)) {
  fs.mkdirSync(localFolder);
}

// Запуск бота
createBot();