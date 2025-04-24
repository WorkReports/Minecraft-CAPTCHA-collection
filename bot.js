const mineflayer = require('mineflayer');
const FlayerCaptcha = require('./FlayerCaptcha');
const fs = require('fs');
const crypto = require('crypto');

// Настройки бота
const botOptions = {
  host: 'mc.angelmine.ru',
  port: 25565,
  username: 'Joni90',
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

// Функция для создания бота
function createBot() {
  bot = mineflayer.createBot(botOptions);

  const captcha = new FlayerCaptcha(bot);
  captcha.on('success', async (image) => {
    const fileName = generateFileName();
    await image.toFile(`./captchas/${fileName}`);
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

// Интервал для очистки папки каждые 30 секунд
setInterval(() => {
  console.log('🗑️ Очистка папки captchas...');
  cleanCaptchasFolder();
}, 30000);

// Запуск бота
createBot();