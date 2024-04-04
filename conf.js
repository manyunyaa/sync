
// Ненужные можно просто закомментировать
/**
 * Список валют, для которых проводим синхронизацию за период времени по запросу
 */
export const syncCurList =
{
	// "КОД": количество,
	//"AUD": 1,
	//"BGN": 1,
	//"BRL": 1,
	//"CAD": 1,
	"CHF": 1,
	"CNY": 1,
	//"DKK": 1,
	"EUR": 1,
	"GBP": 1,
	//"HKD": 1,
	//"HRK": 1,
	"HUF": 100,
	//"IDR": 1000,
	//"ILS": 1,
	//"INR": 100,
	//"ISK": 100,
	//"JPY": 100,
	//"KRW": 100,
	//"MXN": 1,
	//"MYR": 1,
	//"NOK": 1,
	//"NZD": 1,
	"PHP": 100,
	//"PLN": 1,
	"RON": 1,
	"RUB": 100,
	//"SEK": 1,
	"SGD": 1,
	"THB": 100,
	//"TRY": 1,
	"USD": 1,
	//"XDR": 1,
	//"ZAR": 1,
};

/** Расписание синхронизации */
export const syncSchedule = '*/15 * * * * *';

// Значения по умолчанию для составляющих строки соединения с БД

/** Хост по умолчанию */
export const DB_DEFAULT_HOST = 'localhost';

/** Имя пользователя по умолчанию */
export const DB_DEFAULT_USER_NAME = 'root';

/** Пароль по умолчанию */
export const DB_DEFAULT_PASSWORD = ''; 

/** Название схемы БД по умолчанию */
export const DB_DEFAULT_NAME = 'sync';

/** Имя таблицы */
export const DB_TABLE_NAME = 'curr_rates';

/** СУБД по умолчанию */
export const DEFAULT_DBMS = 'mysql';
/* Так же работает и с mariadb */

/**
 * Значение строки подключения для mysql по умолчанию, если
 * оно не задано в process.env.SYNC_CONNECTION_STRING
 */
export const DEFAULT_CONNECTION_STRING = DEFAULT_DBMS + '://' + DB_DEFAULT_USER_NAME
	+ ':' + DB_DEFAULT_PASSWORD + '@' + DB_DEFAULT_HOST + '/' + DB_DEFAULT_NAME;

// Лучше задавать через переменную окружения SYNC_CONNECTION_STRING
// export SYNC_CONNECTION_STRING='mysql://<пользователь>:<пароль>@<хост>/<имя бд>'

/** Принимать запросы с локального хоста. Это значение по умолчанию */
export const HOST = '127.0.0.1';

/** Принимать запросы со всех адресов */
// export const HOST = '0.0.0.0';

/** */
export const PORT = 3000;

/** Эндпоинт для синхронизации данных за период, метод get */
export const syncron = '/syncron/';

/** Эндпоинт для получения отчёта за период, метод get */
export const rateReport = '/rateReport/';

/** Эндпоинт для просмотра всех данных в БД, метод get */
export const allRate = '/allRate';

/** Общий хост */
export const reqPrefix =
	'https://www.cnb.cz/en/financial_markets/foreign_exchange_market/exchange_rate_fixing/';

/** Эндпоинт для получения исторических данных по курсам, метод get */
export const getHistoryData = reqPrefix + 'year.txt?year=';

/** Эндпоинт для получения данных по курсам за день, метод get */
export const getDailyData = reqPrefix + 'daily.txt?date=';

/** */
export const FASTIFY_LOG_PATH = './logs/fastify.log';