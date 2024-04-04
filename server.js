
// Конфиг и вспомогательная библиотека
import {
	syncCurList, DEFAULT_CONNECTION_STRING, DB_TABLE_NAME, HOST, PORT,
	sync, report, allData, getHistoryData, FASTIFY_LOG_PATH
} from './conf.js'

import {
	EXIT_FAIL, HTTP_CODE_WRONG_REQ, HTTP_CODE_SERVER_ERR, HTTP_CODE_NOT_FOUND
} from './tools.js'

// Fastify и плагины
import Fastify from 'fastify';
import fastifyMySQL from '@fastify/mysql';
// import fastifyError from '@fastify/error';
// new fastifyError('FST_ERROR_CODE', 'message %' [, statusCode [, Base]])



// Указвываем файл, куда fastify будет выводить лог, вместо вывода в консоль
// Каталоги в пути должны уже существовать
const fastify = Fastify({ logger: { file: FASTIFY_LOG_PATH } });

// Определяем строку для полключения к БД. Если определена переменная окружения
// SYNC_CONNECTION_STRING, используем значение из неё, иначе из конфигурации
const connectionString = DEFAULT_CONNECTION_STRING;


// Подключаемся  к БД
// Опция promise: true нужна, чтобы обращатьс к БД асинхронно, с async/await
fastify.register(fastifyMySQL, { connectionString, promise: true, })
	.after((err, done) => {
		if (err) {
			console.error('\nВозникла ошибка при попытке подключения к БД:\n');
			console.error(err);
			console.error('\nПродолжение работы невозможно, выходим');

			process.exit(EXIT_FAIL);
		}

		done();
	});


/* Проводим синхронизацию за период времени */
fastify.route({
	method: 'GET',
	url: sync + ':leftDate/:rightDate',
	handler: async (req, reply) => {

		// Берём две даты из параметров GET-запроса, переданных в адресной строке
		const leftDate = new Date(req.params.leftDate);
		const rightDate = new Date(req.params.rightDate);

		if (!+leftDate || !+rightDate)
			return reply.code(HTTP_CODE_WRONG_REQ).send({ msg: 'Неверный формат даты' });

		// если задан неверный порядок, то наименьшую дату кладем в beginDate, наибольшую в finalDate
		const [beginDate, finalDate,] =
			leftDate < rightDate ? [leftDate, rightDate,] : [rightDate, leftDate,];

		// Данных до 1991 года не существует, запрос вернет неверный результат
		// Если год даты меньше 1991, увеличиваем до 1991
		const beginYear = beginDate.getUTCFullYear() >= 1991 ? beginDate.getUTCFullYear() : 1991;
		const finalYear = finalDate.getUTCFullYear() >= 1991 ? finalDate.getUTCFullYear() : 1991;

		// Накапливаем строки, которые возвращает каждый запрос
		let lines = [];

		// Перебираем данные по все годам из запроса
		for (let year = beginYear; year <= finalYear; year++) {
			try {
				// Запрашиваем данные по очередному году
				const yearResponse = await fetch(getHistoryData + year);

				// Если запрос неудачен по любой причине, выводим сообщение, но не выходим
				if (!yearResponse.ok)
					console.error(`\nОшибка при получении данных за ${year} год\n`);

				// Извлекаем из ответа сервера текст ответа
				const text = await yearResponse.text();
				// Делим текст ответа на строки, разделённые символом перевода строки
				// Так как после последней строки так же есть символ перевода, то
				// Последним эдементом этого массива ткдет пустая строка и её позже
				// Придётся удалять
				const chunk = text.split('\n');
				// Вливаем новые строки в наш "накопитель" lines
				lines = lines.concat(chunk);

			} catch (err) {
				// Если запрос неудачен по любой причине, выводим сообщение, но не выходим
				console.error(`\nОшибка при получении данных за ${year} год\n`, err);
			}
		}

		// Часть строк являются "заголовочными", вида Date |<amount> <код калюты>|...
		// Они описывают какие валюты и в какой последовательносте описаны в
		// строках ниже вплоть до следующей "заголовочной"
		// Остальные строки начинаются с даты
		let headLine = [];

		// Перебираем все полученые строки после всех запросов
		// lines.filter(line => line !== '') чтобы отбросить пустые строки
		const dated = lines.filter(line => line !== '').reduce((dat, line) => {
			// Представляем каждую строку в виде массива строк
			line = line.split('|');
			// Извлекаем первую в first
			const first = line.shift();

			// Если строка начинается с Date, понимаем, что это "заголовочная"
			// и обновляем headLine
			if (first === 'Date') {
				// Перебираем стрки вида '<amount> <код калюты>',...
				// Делим на две части по пробелу и берём правую, где код
				headLine = line.map(pair => pair.split(' ')[1]);
				// Внутри reduce важно возвращать то, что требуется, даже когда
				// задача - просто досрочно выйти на следующую итерацию
				return dat;
			}

			// Если мы здесь значит строка не заголовочная, иначе мы бы ушли на
			// следующую итерацию

			// На этом этапе headLine уже должен быть определён!
			// Без него невозможно определить, какие валюты и в каком порядке в
			// следующих строках
			if (!headLine) {
				console.error(lines);
				return reply.code(HTTP_CODE_SERVER_ERR)
					.send({ msg: 'Заголовок не определён!' });
			}

			// Из конфига берём, какие валюты следует сохранять в БД
			// Object.keys(syncCurList) возвращает ключи объекта syncCurList.
			// то есть трёхбуквенные коды валют
			const allowedNames = Object.keys(syncCurList);
			// Меняем формат даты с dd.mm.yyyy на yyyy-mm-dd
			const currentDate = first.split('.').toReversed().join('-');
			// В виде объекта даты
			const dateObj = new Date(currentDate);

			// Перебираем валюты в строке
			line.forEach((curr, idx) => {
				// Пропускаем неподходящие даты
				if (dateObj < beginDate || dateObj > finalDate)
					return;

				// По индексу в стрке определяем код валюты
				const code = headLine[idx];

				// Если код не в числе разрешённых (не закоменнтированных в конфиге)
				// то игнорируем
				if (!allowedNames.includes(code))
					return;

				// Иначе добавляем в массив строк вида "('<дата>', '<код валюты>', '<курс>')"
				dat.push(`('${currentDate}', '${code}', '${curr}')`);
			});

			return dat;
		}, []);

		if (!dated.length)
			return reply.code(HTTP_CODE_NOT_FOUND)
				.send('\n\nЗа этот интервал данных нет');

		// К этому моменту мы получили массив строк вида:
		// [
		//     "('дата1', 'валюта1', 'значение1'), ",
		//     "('дата1', 'валюта2', 'значение2'), ",
		//     ...
		// ]

		// Теперь запрос к БД

		try {
			const result = await fastify.mysql.query
				(
					`replace into ${DB_TABLE_NAME} (rate_date, currency, rate) values ${dated.join(', ')}`,
					[],
				);

			// Елси всё в порядке, возвращаем результат
			reply.send({ result });
		} catch (err) {
			console.error('\n\n');
			console.error(err);
			reply.code(HTTP_CODE_SERVER_ERR).send('Внутренняя ошибка сервера');
		}
	}
});


/* Возвращаем отчет за период времени */
fastify.route({
	method: 'GET',
	url: report + ':leftDate/:rightDate/:currList',
	handler: async (req, reply) => {

		const leftDate = new Date(req.params.leftDate);
		const rightDate = new Date(req.params.rightDate);

		if (!+leftDate || !+rightDate)
			return reply.code(HTTP_CODE_WRONG_REQ).send({ msg: 'Неверный формат даты' });

		const [_beginDate, finalDate,] =
			leftDate < rightDate ? [leftDate, rightDate,] : [rightDate, leftDate,];

		const beginDate =
			_beginDate.getUTCFullYear() >= 1991 ? _beginDate : new Date('1991-01-01');

		// Из параметров запросе берём список кодов валют
		const currencies = req.params?.currList.split(',') || [];
		// Длина списка
		const countOfCurrencies = currencies.length;

		// Если забыли указать код в запросе, размер списка кодов будет 1
		if (countOfCurrencies == 1 && !currencies[0])
			return reply.code(HTTP_CODE_WRONG_REQ)
				.send({ msg: 'Неправильный запрос' });

				try {
					const [_result] = await fastify.mysql.query
						(
							`select distinct currency, MAX(rate) as max, MIN(rate) as min, AVG(rate) as avg
								from ${DB_TABLE_NAME}
								where rate_date >= ? and rate_date <= ? and (currency in (?))
								group by currency`,
							[beginDate.toISOString(), finalDate.toISOString(), currencies],
						);
		
					// Вносим поправку на то, что по условию Amount = 1
					const result = _result.map(itm => {
						const divider = syncCurList[itm.currency];
		
						itm.max /= divider;
						itm.min /= divider;
						itm.avg /= divider;
		
						return itm;
					});
		
					return reply.send({ result });

		} catch (err) {
			console.error(`\n${err}\n`);

			return reply.code(HTTP_CODE_SERVER_ERR)
				.send({ msg: 'Ошибка при чтении из БД', });
		}
	}
});


/* Возвращаем все данные из БД */
fastify.route({
	method: 'GET',
	url: allData,
	handler: async (req, reply) => {
		try {
			const [allData] =
				await fastify.mysql.query(`select * from ${DB_TABLE_NAME}`, [],);
			reply.send(allData);
		} catch (err) {
			console.error(err);
			reply.code(HTTP_CODE_SERVER_ERR).send({ msg: 'Ошибочка вышла', });
		}
	}
});


// Run the server
try {
	await fastify.listen({ port: PORT, host: HOST });
} catch (err) {
	fastify.log.error(err);
	process.exit(EXIT_FAIL);
}
