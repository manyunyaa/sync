const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Подключение к MongoDB
mongoose.connect('mongodb://localhost/currency-sync-app', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => console.log('Connected to MongoDB'));

// Создание схемы и модели для курсов валют
const currencySchema = new mongoose.Schema({
    currencyCode: String,
    rate: { type: String, required: true },
    date: Date,
  });

const Currency = mongoose.model('Currency', currencySchema);

// Расписание для синхронизации данных по чешской кроне
cron.schedule('0 1 * * *', async () => {
  console.log('Синхронизация данных по чешской кроне...');
  await syncData();
});

// Функция для синхронизации данных
const syncData = async (dat) => {
    let today;
    if(dat){
        today = dat;
    }else{
        today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.');
    }
    const apiUrl = `https://www.cnb.cz/en/financial_markets/foreign_exchange_market/exchange_rate_fixing/daily.txt?date=${today}`;
  
    try {
      const response = await axios.get(apiUrl);
      const data = response.data.split('\n');
  
      let headerFound = false;
      for (let i = 0; i < data.length; i++) {
        const line = data[i].trim();
  
        if (line.startsWith('Country|Currency|Amount|Code|Rate')) {
          headerFound = true;
          continue;
        }
  
        if (headerFound && line !== '') {
          const [country, currency, amount, code, rate] = line.split('|').map(item => item.trim());
  
          const parsedRate = parseFloat(rate.replace(',', '.'));
  
          if (!isNaN(parsedRate)) {
            const existingCurrency = await Currency.findOne({ currencyCode: code, date: today });
  
            if (existingCurrency) {
              existingCurrency.rate = parsedRate;
              await existingCurrency.save();
            } else {
              const newCurrency = new Currency({
                currencyCode: code,
                rate: parsedRate,
                date: new Date(today),
              });
              await newCurrency.save();
            }
          } else {
            console.error(`Не удалось распознать курс для ${country}. Пропуск.`);
          }
        }
      }
  
      console.log('Данные успешно синхронизированы.');
    } catch (error) {
      console.error('Ошибка синхронизации данных:', error.message);
    }
  };

  syncData();

// Ручка для синхронизации данных за период времени
app.get('/sync/:startDate/:endDate', async (req, res) => {
    const { startDate, endDate } = req.params;
    
    const currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);
  
    while (currentDate.getTime() <= endDateObj.getTime()) {

      const formattedDate = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.');
      

      await syncData(formattedDate);
      

      currentDate.setDate(currentDate.getDate() + 1);
    }
  
    res.send('Данные успешно синхронизированы.');
  });

// Ручка для получения отчета по курсу кроны за период времени
app.get('/report/:startDate/:endDate/:currencies', async (req, res) => {
    const { startDate, endDate, currencies } = req.params;
    const currencyList = currencies.split(',');
  
    try {
      const report = await Currency.aggregate([
        {
          $match: {
            date: {
              $gte: new Date(startDate),
              $lte: new Date(endDate),
            },
            currencyCode: { $in: currencyList },
          },
        },
        {
          $group: {
            _id: '$currencyCode',
            minRate: { $min: '$rate' },
            maxRate: { $max: '$rate' },
            avgRate: { $avg: '$rate' },
          },
        },
      ]);
  
      res.json(report);
    } catch (error) {
      console.error('Ошибка при получении отчета:', error.message);
      res.status(500).send('Ошибка при получении отчета.');
    }
  });
  
//Получение всех данных из бд (для првоерки)
app.get('/allData', async (req, res) => {
    try {
      const allData = await Currency.find();
      res.json(allData);
    } catch (error) {
      console.error('Ошибка при получении всех данных:', error.message);
      res.status(500).send('Ошибка при получении всех данных.');
    }
  });

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
