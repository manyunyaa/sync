# Лабораторная работа 3
## Синхронизация с банком
1.	синхронизация данных по чешской кроне за текущую дату в БД по расписанию. Должна быть возможность сконфигурировать время/интервал запуска. Например: запускать синхронизацию каждый день в 0:01. Период запуска должен задаваться конфигурации приложения.
2.	синхронизация данных по чешской кроне за период времени. На вход подается startDate и endDate, приложение синхронизирует в БД данные за этот период. Валюты, по которым синхронизируются данные, должны быть в конфигурации приложения. 
3.	предоставляет web-API, с помощью которого можно получить отчет по курсу кроны за период времени. В отчете необходимо вывести минимальное, максимальное и среднее значение каждой из выбранных валют отдельно. Валюты, по которым строится отчёт, передаются в запросе. Показатели в отчёте необходимо рассчитывать для валюты в количестве 1 условная единица, т.е. для Amount = 1. Формат отчета – JSON.
Необходимо учесть, что в данных, предоставляемых API, могут быть аномалии. Например, для некоторых временных интервалов может не быть курсов определенных валют и т.п.



