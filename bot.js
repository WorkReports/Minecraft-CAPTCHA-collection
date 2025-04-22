const mineflayer = require('mineflayer');
const fs = require('fs');
const { exec } = require('child_process');
const FlayerCaptcha = require('./FlayerCaptcha');

const botOptions = {
  host: 'mc.angelmine.ru',
  port: 25565,
  username: 'J1edde',
  version: '1.16.5'
};

function createBot() {
  const bot = mineflayer.createBot(botOptions);

  const captcha = new FlayerCaptcha(bot);
  captcha.on('success', async (image, viewDirection) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Уникальное имя файла
    const filename = `captchas/captcha-${timestamp}.png`;
    await image.toFile(filename); // Сохранение файла
    console.log(`Captcha saved as ${filename}`);
    bot.end(); // Выход из игры
  });

  function clearConsole() {
    console.log('\x1Bc');
  }

  bot.on('messagestr', (message) => {
    console.log(`[Сообщение] ${message}`);
    if (message.includes("AngelFilter » Введите капчу с картинки в чат") || 
        message.includes("AngelAuth » Если вы зашли впервые, данный аккаунт уже был зарегистрирован и Вам стоит сменить никнейм")) {
      clearConsole();
    }
  });

  bot.on('windowOpen', () => {
    clearConsole();
    bot.end();
  });

  bot.on('error', err => console.log(`Ошибка: ${err}`));
  bot.on('end', () => {
    console.log('Соединение окончено. Перезапуск...');
    setTimeout(() => createBot(), 1000); // Перезапуск бота через 5 секунд
  });
}

// Создание папки для капч, если она не существует
if (!fs.existsSync('./captchas')) {
  fs.mkdirSync('./captchas');
}

// Запуск бота
createBot();