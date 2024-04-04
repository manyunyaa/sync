
// Конфиг 
import {
	DB_TABLE_NAME, syncSchedule, getDailyData, DB_DEFAULT_HOST,
	DB_DEFAULT_USER_NAME, DB_DEFAULT_NAME, DB_DEFAULT_PASSWORD
} from './conf.js'

import { EXIT_FAIL } from './tools.js'

// Библиотека mysql2
import mysql from 'mysql2/promise';
// Планировщик
import schedule from 'node-schedule';

// Соединяемся с БД
const connection = await mysql.createConnection({
	host: DB_DEFAULT_HOST,
	user: DB_DEFAULT_USER_NAME,
	database: DB_DEFAULT_NAME,
	password: DB_DEFAULT_PASSWORD,
});


const handler = async () => {
	console.log('\n\Синхронизация...');

	const today = new Date();

	const todayForRequest =
		`${today.getUTCDate()}.${today.getUTCMonth() + 1}.${today.getUTCFullYear()}`; //приводим дату к нужному формату

	let lines = [];

	try {
		const response = await fetch(getDailyData + todayForRequest);

		if (!response.ok)
			console.error(`\nОшибка при получении данных за ${today}\n`);

		const text = await response.text();
		lines = text.split('\n');

	} catch (err) {
		console.error(`\nФатальная ошибка при получении данных за ${today}\n`, err);
		return;
	}

	// Отбрасываем 2 заголовочные строки вида
	// 28 Mar 2024 #63
	// Country|Currency|Amount|Code|Rate
	lines.shift();
	lines.shift();

	const dated = lines.filter(line => line !== '').reduce((dat, line) => { //отбрасываем пустые значения и пополняем массив строк dat, которые кладем в массив dated
		const elements = line.split('|'); //удаляем из строк разделитель |, возвращаем массив значений

		const rate = elements.pop(); //удаляем последний элемент из массива и возвращает его значение - получаем курс
		const name = elements.pop(); //удаляем след. последний элемент из массива и возвращает его значение - получаем валюту

		const currentDate = todayForRequest.split('.').toReversed().join('-'); //дату из запроса приводим к формату YYYY-MM-DD

		dat.push(`('${currentDate}', '${name}', '${rate}')`); //формируем массив значений

		return dat;
	}, []);

	if (!dated.length) {
		console.log('\n\nЗа сегодняшний день данных нет');
		return;
	}

	try {
		const result = await connection.query
			(
				`replace into ${DB_TABLE_NAME} (rate_date, currency, rate)
				values ${dated.join(', ')}`,
				[],
			);

		console.log('Сделано');
	} catch (err) {
		console.error('\n\n');
		console.error(err);

		process.exit(EXIT_FAIL);
	}
};


const job = schedule.scheduleJob(syncSchedule, () => {
	console.log('\n\nНачинаем...');
	handler();
});
