const mineflayer = require('mineflayer');
const FlayerCaptcha = require('./FlayerCaptcha');
const fs = require('fs');
const crypto = require('crypto');
const archiver = require('archiver');
const fetch = require('node-fetch');
const http = require('http');

// Настройки бота
const botOptions = {
  host: 'mc.angelmine.ru',
  port: 25565,
  username: 'Joni91',
  version: '1.16.5'
};

let bot;

// Функция для генерации случайного имени файла
function generateFileName() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const length = Math.floor(Math.random() * (10 - 5 + 1)) + 5;
  let name = '';
  for (let i = 0; i < length; i++) {
    name += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return name + '.png';
}

// Функция для удаления дубликатов файлов и файлов размером 4 кБ или меньше
function cleanCaptchasFolder() {
  const folderPath = './captchas';
  const fileHashes = new Set();

  if (!fs.existsSync(folderPath)) {
    console.log('🛠️ Папка captchas отсутствует, создание...');
    fs.mkdirSync(folderPath);
    return;
  }

  const files = fs.readdirSync(folderPath);

  for (const file of files) {
    const filePath = `${folderPath}/${file}`;
    const fileData = fs.readFileSync(filePath);

    // Удаление дубликатов
    const fileHash = crypto.createHash('md5').update(fileData).digest('hex');
    if (fileHashes.has(fileHash)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Удалён дубликат: ${file}`);
    } else {
      fileHashes.add(fileHash);
    }
  }

  // Удаление файлов размером 4 кБ или меньше
  for (const file of files) {
    const filePath = `${folderPath}/${file}`;
    try {
      const stats = fs.statSync(filePath);
      const fileSizeInKB = stats.size / 1024; // Преобразуем размер в килобайты

      if (fileSizeInKB <= 4) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Удалён файл размером ${fileSizeInKB.toFixed(2)} кБ: ${file}`);
      }
    } catch (err) {
      console.log(`⚠️ Ошибка при проверке размера файла ${file}: ${err.message}`);
    }
  }
}

// Функция для архивирования папки
function archiveFolder(folderPath, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`📦 Папка ${folderPath} архивирована в ${outputPath}`);
      resolve();
    });

    archive.on('error', (err) => {
      console.log(`⚠️ Ошибка при архивировании: ${err.message}`);
      reject(err);
    });

    archive.pipe(output);
    archive.directory(folderPath, false);
    archive.finalize();
  });
}

// Функция для проверки и удаления существующего файла на Dropbox
async function deleteExistingFileOnDropbox(fileName) {
  const token = fs.readFileSync('./dropbox_token.txt', 'utf-8').trim();
  const listFolderUrl = 'https://api.dropboxapi.com/2/files/list_folder';
  const deleteFileUrl = 'https://api.dropboxapi.com/2/files/delete_v2';

  try {
    // Шаг 1: Список файлов в папке Dropbox
    const listResponse = await fetch(listFolderUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path: '' }) // Корневая папка
    });

    const listData = await listResponse.json();
    const existingFile = listData.entries.find(file => file.name === fileName);

    // Шаг 2: Удалить файл, если он существует
    if (existingFile) {
      const deleteResponse = await fetch(deleteFileUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path: existingFile.path_lower })
      });

      if (deleteResponse.ok) {
        console.log(`🗑️ Файл ${fileName} удалён с Dropbox`);
      } else {
        console.log(`⚠️ Ошибка удаления файла: ${await deleteResponse.text()}`);
      }
    }
  } catch (err) {
    console.log(`⚠️ Ошибка проверки или удаления файла на Dropbox: ${err.message}`);
  }
}

// Обновлённая функция для загрузки файла на Dropbox
async function uploadToDropbox(filePath) {
  const token = fs.readFileSync('./dropbox_token.txt', 'utf-8').trim();
  const uploadUrl = 'https://content.dropboxapi.com/2/files/upload';

  const fileData = fs.readFileSync(filePath);
  const fileName = filePath.split('/').pop();

  try {
    // Проверить и удалить существующий файл
    await deleteExistingFileOnDropbox(fileName);

    // Загрузить новый файл
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Dropbox-API-Arg': JSON.stringify({
          path: `/${fileName}`,
          mode: 'add',
          autorename: false, // Гарантирует точную замену
          mute: false
        }),
        'Content-Type': 'application/octet-stream'
      },
      body: fileData
    });

    if (uploadResponse.ok) {
      console.log(`✅ Файл ${fileName} успешно загружен на Dropbox`);
    } else {
      console.log(`❌ Ошибка загрузки файла на Dropbox: ${await uploadResponse.text()}`);
    }
  } catch (err) {
    console.log(`⚠️ Ошибка загрузки файла на Dropbox: ${err.message}`);
  }
}

// Функция для создания бота
function createBot() {
  bot = mineflayer.createBot(botOptions);

  const captcha = new FlayerCaptcha(bot);
  captcha.on('success', async (image) => {
    const fileName = generateFileName();
    const filePath = `./captchas/${fileName}`;
    await image.toFile(filePath);
    console.log(`💾 Captcha сохранена как ${fileName}`);
    bot.end();
  });

  bot.on('login', () => {
    console.log(`✅ Бот успешно подключился как ${bot.username}`);
  });

  bot.on('chat', (username, message) => {
    console.log(`[${username}] ${message}`);
  });

  bot.on('end', () => {
    console.log('❎ Бот отключён от сервера.');
    setTimeout(() => {
      console.log('🔄 Перезапуск бота...');
      createBot();
    }, 2000);
  });

  bot.on('error', (err) => {
    console.log(`❌ Ошибка: ${err.message}`);
    setTimeout(() => {
      console.log('❌ Перезапуск бота из-за ошибки...');
      createBot();
    }, 2000);
  });
}

// Создаём папку captchas, если её нет
if (!fs.existsSync('./captchas')) {
  fs.mkdirSync('./captchas');
}

// Интервал для очистки и архивирования папки каждые 30 секунд
setInterval(async () => {
  console.log('🗑️ Очистка папки captchas...');
  cleanCaptchasFolder();

  const folderPath = './captchas';
  const archivePath = './captchas.zip';

  try {
    await archiveFolder(folderPath, archivePath);
    await uploadToDropbox(archivePath);
  } catch (err) {
    console.log(`⚠️ Ошибка при обработке папки captchas: ${err.message}`);
  }
}, 60000);

// Запуск бота
createBot();


const PORT = process.env.PORT || 3000; // Render предоставляет порт через переменную окружения

const server = http.createServer((req, res) => {
  if (req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('🟢 Бот работает!\n');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('❌ Страница не найдена\n');
  }
});

server.listen(PORT, () => {
  console.log(`🌐 HTTP-сервер слушает порт ${PORT}`);
});