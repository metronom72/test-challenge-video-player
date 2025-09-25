# test-challenge-video-player

Простой видеоплеер на Vite + TypeScript с поддержкой HLS (`hls.js`) и DASH (`dashjs`).

## Требования

- **Node.js**: `>= 20.19` или `>= 22.12`  
  Если у тебя `20.0.0`, Vite выдаст ошибку:  
  _“You are using Node.js 20.0.0. Vite requires Node.js version 20.19+ or 22.12+. Please upgrade your Node.js version.”_
- **Yarn 4** (проект тестировался с Yarn; в `package.json` указан `packageManager: yarn@4.9.4`)
- Рекомендуется включить **Corepack** (идёт вместе с Node.js 16.10+)

## Быстрый старт

```bash
# Включить Corepack (один раз)
corepack enable

# Установка зависимостей
yarn install

# Запуск dev-сервера
yarn dev
```

Dev-сервер поднимется на адресе, который выведет Vite (обычно http://localhost:5173).

## Сценарии

В проекте определены стандартные скрипты:

```bash
# Запуск dev-сервера
yarn dev

# Сборка (TypeScript + Vite)
yarn build

# Предпросмотр production-сборки
yarn preview
```

### Линтинг (TypeScript)

Отдельного ESLint нет; базовая проверка делается компилятором TypeScript:

```bash
# Проверка типов без генерации выходных файлов
yarn tsc --noEmit
```

## Makefile

В репозитории есть `Makefile` с удобными командами (алиасами):

- `make install` — включить Corepack и установить зависимости (`yarn install`)
- `make start` — запустить dev-сервер (`yarn dev`)
- `make build` — проверить типы и собрать проект
- `make preview` — запустить предпросмотр production-сборки
- `make lint` — проверить типы (`yarn tsc --noEmit`)
- `make clean` — очистить кэш/артефакты (`dist`, `node_modules`, `.yarn/cache`, ...)

Примеры:
```bash
make install
make start
make build
make preview
make lint
```

## Обновление Node.js

Если видишь ошибку о неподходящей версии Node.js — обновись до `>=20.19` или `>=22.12`.

С nvm:
```bash
nvm install 22
nvm use 22
corepack enable
yarn --version
```

Или на ветке 20:
```bash
nvm install 20.19
nvm use 20.19
corepack enable
```

## Зависимости

- `vite` (используется дистрибутив `rolldown-vite@7.1.12`)
- `typescript`
- `hls.js`, `dashjs`

## Структура сборки

- Команда `yarn build` сначала запускает `tsc`, затем `vite build`
- Результат сборки попадает в папку `dist/`

## Описание тестового задания

Это тестовое задание: цель — разработать рабочую версию видеоплеера, соответствующую ТЗ,
с акцентом на чистоту кода и принципы SOLID. Реализованы три простых плеера под разные 
форматы (нативный для MP4, на базе **hls.js** для HLS и **dash.js** для DASH), объединённые
единым приложением на TypeScript. Класс плеера принимает ссылку на `<video>`, через 
`load(url: string)` выбирает стратегию воспроизведения, учитывает политику автоплея, 
автоматически запускает воспроизведение при возможности, отслеживает и логирует смену 
состояний (IDLE, LOADING, READY, PLAYING, PAUSED, SEEKING, BUFFERING с измерением длительности, ENDED),
корректно обрабатывает «досмотрели и начали сначала» и переключение контента из выпадающего 
списка без перезагрузки страницы. Разработка велась от простого к сложному, что отражено
в серии коммитов; определены собственные типы, хотя допускаю, что для части из них уже
существуют более общепринятые и понятные реализации.
