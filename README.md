#Модификация as3-to-typescript 

1/ Изменен перевод типов int и uint:
 - int заменяется на integer
 - uint не меняется

2/ Попытка авто-интирования для int/uint (через оборачивания переменных функциями int.int и int.uint)

3/ Преинициализация интовых переменных (необходимо 5м параметром добавить флаг "-iv"):

```
as3-to-typescript <sourceDir> <outputDir> -iv
as3-to-typescript in out -iv
```

ВНИМАНИЕ: эта ф-я пока в процессе тестирования. Могут быть ложные срабатывания! Используем на свой страх и риск.

4/ Мелкие фиксы:
- trace заменен на console.log
- static и модификатор доступа поменяны местами


Установка: 

```
npm install -g git+https://github.com/aterim/as3-to-typescript.git
```



TODO:
- Обработка as
- this у вызовов статик методов

ОШИБКИ:
Ошибки возникают редко, но самая частая из них - нарушение расстановки скобок. Пока вычисляем и правим вручную.


--------------- :ОРИГИНАЛЬНАЯ ПАСТА: -------------------


#as3-to-typescript

> A tool that helps porting as3 codebase to typescript


##Installation

Install this module with npm: 

```
npm install -g as3-to-typescript
```

##Usage

```
as3-to-typescript <sourceDir> <outputDir>
```

##Note

This tool will not magicly transform your as3 codebase into perfect typescript, the goal is to transform the sources into *syntacticly* correct typescript, and even this goal is not perfectly respected. It also won't try to provide javascript implementation for flash libraries.

However unlike most attempts that I have seen this tool is based on a true actionscript parser, and so should be able to handle most of as3 constructs and greatly ease the pain of porting a large code base written in as3 to typescript.
