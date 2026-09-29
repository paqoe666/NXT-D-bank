# NXT D-Bank API v1

Публичный API банка для сторонних проектов (первый клиент — игра Дена).
**Режим: учебная песочница.** Деньги фейковые, реальные платежи невозможны.

**Base URL:** `https://nxt-d-bank-backend.onrender.com/api/v1`

## Авторизация

| Тип | Как | Для чего |
|---|---|---|
| Публичные эндпоинты | ничего не нужно | справочник BIN-ов, проверка номера карты, health |
| Данные игрока | заголовок `X-API-Key: <ключ>` | чтение профиля, баланса, карт и операций |

Ключ выдаёт владелец банка. Ключи живут в переменной окружения `NXT_API_KEYS`
(формат: `имя-приложения:ключ,другое-приложение:ключ`).

## Что наружу НЕ отдаётся никогда

- полный номер карты (только `**** **** **** 1234`),
- `CVV`,
- пароль и хэш пароля,
- телефон в открытом виде (только `+7***2920`).

## Эндпоинты

### 1. Корень API — справка
```bash
curl https://nxt-d-bank-backend.onrender.com/api/v1
```

### 2. Проверка доступности
```bash
curl https://nxt-d-bank-backend.onrender.com/api/v1/health
# {"status":"ok","service":"NXT D-Bank API","time":"...","uptimeSeconds":123}
```

### 3. Справочник BIN-ов (можно использовать как «BIN API»)
```bash
curl https://nxt-d-bank-backend.onrender.com/api/v1/bins
curl https://nxt-d-bank-backend.onrender.com/api/v1/bins/7777
```
```json
{
  "bin": "7777", "brand": "N-Cards", "brandId": "n-cards", "type": "debit",
  "country": "RU", "countryName": "Россия", "issuer": "NXT D-Bank",
  "currency": "RUB", "logo": "/ncards.svg", "cardSystem": "n-cards"
}
```

### 4. Проверка номера карты (алгоритм Луна + бренд)
```bash
curl -X POST https://nxt-d-bank-backend.onrender.com/api/v1/cards/validate \
  -H "Content-Type: application/json" \
  -d '{"number":"4029 0000 0000 0009"}'
```
```json
{ "valid": true, "luhn": true, "length": 16, "masked": "**** **** **** 0009",
  "brand": "VISA", "brandId": "visa", "type": "debit", "country": "US", "issuer": "NXT D-Bank" }
```
`valid: true` означает «Луна прошла **и** BIN принадлежит NXT D-Bank». Чужой картой без нашего BIN ответ будет
`valid: false` при `luhn: true`, а номером с опечаткой — `luhn: false`.
Эндпоинт не сообщает, существует ли такая карта в банке, — только корректность номера.

### 5. Поиск игрока (получить `userId`)
```bash
curl "https://nxt-d-bank-backend.onrender.com/api/v1/users/lookup?target=79009794086" \
  -H "X-API-Key: ВАШ_КЛЮЧ"
```
`target` — телефон, номер карты или `userId`.
```json
{ "found": true, "user": { "id": "b3f1...", "name": "Владислав В.", "maskedPhone": "+7***2920", "hasAccount": true } }
```

### 6. Профиль игрока
```bash
curl https://nxt-d-bank-backend.onrender.com/api/v1/users/<userId> -H "X-API-Key: ВАШ_КЛЮЧ"
```

### 7. Баланс
```bash
curl https://nxt-d-bank-backend.onrender.com/api/v1/users/<userId>/balance -H "X-API-Key: ВАШ_КЛЮЧ"
# {"userId":"...","name":"Владислав В.","currency":"USD","balance":10613498.32}
```

### 8. Карты игрока (без номеров и CVV)
```bash
curl https://nxt-d-bank-backend.onrender.com/api/v1/users/<userId>/cards -H "X-API-Key: ВАШ_КЛЮЧ"
```
```json
{ "userId": "...", "count": 1, "cards": [ {
  "id": "...", "brand": "N-Cards", "brandId": "n-cards", "logo": "/ncards.svg",
  "maskedNumber": "**** **** **** 1522", "last4": "1522", "expiryDate": "12/32",
  "ownerName": "VLADISLAV V", "cardName": "Основной счет", "isBlocked": false, "designIndex": 0 } ] }
```

### 9. Операции игрока (пагинация)
```bash
curl "https://nxt-d-bank-backend.onrender.com/api/v1/users/<userId>/transactions?limit=20" \
  -H "X-API-Key: ВАШ_КЛЮЧ"
```
Параметры: `limit` (по умолчанию 20, максимум 100), `cursor` (значение `nextCursor` из предыдущего ответа).

### 10. Курсы валют банка (без ключа)
```bash
curl https://nxt-d-bank-backend.onrender.com/api/v1/rates
# {"base":"RUB","rates":{"RUB":1,"USD":80,"EUR":100,"GBP":120,"UAH":2.5,"CNY":12,"CHF":110,"JPY":0.6,"BYN":30,"AED":22,"KZT":0.2},"updatedAt":"..."}
```

### 11. Запрос денег по ссылке (без ключа)
```bash
curl https://nxt-d-bank-backend.onrender.com/api/v1/payment-requests/<token>
```
```json
{ "amount": 500, "currency": "RUB", "title": "На кофе", "status": "active",
  "paidCount": 0, "paidAmount": 0, "remaining": 500,
  "requesterName": "Vladislav V.", "expired": false }
```
Ссылка для друзей имеет вид `<ваш-фронт>/pay/<token>`: открывается без входа в банк,
оплата — после входа. Если сумма не задана (`amount: null`), плательщик вводит свою.

## 12. Денежные операции: списание и пополнение

Требуется ключ со scope `write`. Права выдаются двумя фильтрами:
1. в `NXT_API_KEYS` ключ объявлен как `имя:ключ:read|write` (по умолчанию — только `read`);
2. на сервере выставлена переменная `DBANK_WRITE_ENABLED=true` (по умолчанию запись выключена).

```
POST /api/v1/users/:userId/debit     — списать средства со счёта
POST /api/v1/users/:userId/credit    — зачислить средства на счёт
GET  /api/v1/transactions/:txId      — сверка статуса операции
```

### Единицы денег

`amountMinor` — **целое в минорных единицах (копейках)**: `50000` = 500,00 ₽.
В ответе операции `amount`, `totalDeducted`, `commission` тоже в минорных единицах,
а `balanceAfter` — в major-единицах (как в `GET /users/:id/balance`).
В существующей ленте `GET /users/:id/transactions` суммы остаются в major-единицах — это не ломается.

### Тело запроса

```json
{
  "amountMinor": 50000,
  "currency": "RUB",
  "comment": "Списание за услугу",
  "reference": "order-1042",
  "dryRun": false
}
```

| Поле | Правило |
|---|---|
| `amountMinor` | **обязательное**, целое `> 0` и `<= 100000000` |
| `currency` | необязательное, должна совпадать с валютой счёта (иначе `422 invalid_currency`) |
| `comment` | необязательное, до 140 символов |
| `reference` | необязательное, до 140 символов, для сверки у клиента |
| `dryRun` | необязательное; `true` — посчитать без применения |

Заголовки: `X-API-Key` (обязательный), `Idempotency-Key` (рекомендуется), `User-Agent` (пишется в аудит).

### Успех — `200`

```json
{
  "applied": true,
  "id": "b7c0f2de-2b1a-4f0e-9c0f-9f0a1b2c3d4e",
  "type": "transfer", "status": "completed", "direction": "out",
  "amount": 50000, "totalDeducted": 50000, "commission": 0,
  "currency": "RUB", "balanceAfter": 201652049.5,
  "failureReason": null, "processedAt": "2026-09-29T20:15:00.000Z",
  "comment": "Списание за услугу", "reference": "order-1042",
  "createdAt": "2026-09-29T20:15:00.000Z"
}
```

Для `credit` — `"direction":"in"` и `"totalDeducted":0`. Операция применяется **синхронно**:
в успешном ответе `status` всегда `completed`, а `balanceAfter` актуален на момент ответа.

### Сухой прогон

`"dryRun": true` — валидация и расчёт без применения: баланс, лента и записи идемпотентности не меняются.
Ответ: `200` с `"applied": false`, `"id": null`, `"status": "pending"`, `balanceAfter` — прогноз,
`failureReason` — `"insufficient_funds"`, если денег не хватит (в ответе также есть текущий `balance`).

### Идемпотентность

Заголовок `Idempotency-Key: <люч приложения>` (уникален в пределах приложения):

* первый запрос применяется, его ответ сохраняется на **24 часа**;
* повтор с тем же ключом и тем же телом → `200` и **тот же самый ответ** (заголовок `Idempotent-Replay: true`), деньги второй раз не списываются;
* повтор с тем же ключом, но другим телом → `409 idempotency_conflict`.

### Ошибки

| HTTP | `error.code` | Когда |
|---|---|---|
| 401 | `invalid_api_key` | нет ключа или ключ не найден |
| 403 | `forbidden_scope` | ключ без `write` или `DBANK_WRITE_ENABLED` не выставлена |
| 404 | `user_not_found` | пользователя нет, нет счёта, или `userId` не uuid |
| 404 | `transaction_not_found` | операции с таким id нет |
| 409 | `idempotency_conflict` | тот же `Idempotency-Key` с другим телом |
| 422 | `invalid_amount` | `amountMinor` не целое / `<= 0` / `> 100000000` |
| 422 | `invalid_currency` | валюта запроса не совпадает с валютой счёта |
| 422 | `invalid_comment` / `invalid_reference` / `invalid_idempotency_key` | длиннее лимита |
| 422 | `insufficient_funds` | денег не хватает; в теле дополнительно `balance` и `balanceAfter` |
| 423 | `account_blocked` | счёт заблокирован (`Account.isBlocked`) |
| 429 | `too_many_requests` | превышен `WRITE_RATE_MAX` операций в минуту **на ключ** |

### Примеры

```bash
# Списание 500,00 ₽
curl -X POST "https://nxt-d-bank-backend.onrender.com/api/v1/users/$USER_ID/debit" \
  -H "X-API-Key: $KEY" -H "Idempotency-Key: order-1042" -H "Content-Type: application/json" \
  -d '{"amountMinor":50000,"comment":"Списание за услугу","reference":"order-1042"}'

# Пополнение на 250,00 ₽
curl -X POST "https://nxt-d-bank-backend.onrender.com/api/v1/users/$USER_ID/credit" \
  -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"amountMinor":25000,"reference":"topup-77"}'

# Проверить, что можно, ничего не применяя
curl -X POST "https://nxt-d-bank-backend.onrender.com/api/v1/users/$USER_ID/debit" \
  -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"amountMinor":50000,"dryRun":true}'

# Сверка после таймаута
curl "https://nxt-d-bank-backend.onrender.com/api/v1/transactions/$TX_ID" -H "X-API-Key: $KEY"
```

### Аудит и гарантии

* Списание/зачисление выполняются одной транзакцией БД с условным `UPDATE ... WHERE balance >= amount`,
  поэтому параллельные запросы не уводят баланс в минус и не теряют обновления.
* Каждая попытка операции пишется в таблицу `ApiAuditLog`: `txId`, `userId`, сумма, валюта, `direction`,
  имя приложения, **префикс ключа и его sha256** (сам секрет не хранится), `ip`, `User-Agent`,
  код ответа, результат (`applied` / `replayed` / `dry_run` / код ошибки) и длительность.
* Пан, CVV, ПИН и реальные рельсы не передаются и не хранятся — проект учебный, деньги фейковые.

## Жизненный цикл операции (статусы)

| Статус | Что значит |
|---|---|
| `pending` | операция создана, деньги зарезервированы на счете отправителя (`held`), получателю еще не отправлены |
| `processing` | банк начал проводить операцию |
| `completed` | деньги доставлены получателю |
| `failed` | операция не прошла, резерв возвращен отправителю (см. `failureReason`) |
| `canceled` | операцию отменил отправитель, деньги вернулись на счет |
| `refunded` | по исполненной операции сделан возврат средств |

Если приложение увидело `pending`, оно должно либо дождаться `completed` (поллингом или вебхуком),
либо отменить операцию. В ответе `GET /users/:userId/transactions` у операции есть поля
`status`, `failureReason`, `processedAt`, а у аккаунта — `held` (зарезервированная сумма).

Ориентировочное время конвейера в песочнице: 4 секунды в `pending` + 6 секунд в `processing`
(настраивается переменными `TRANSFER_PENDING_MS` и `TRANSFER_PROCESSING_MS` на бэкенде).

## Формат ошибок

```json
{ "error": { "code": "invalid_api_key", "message": "Неверный или отсутствующий заголовок X-API-Key" } }
```

| Код | HTTP | Когда |
|---|---|---|
| `invalid_api_key` | 401 | ключ не передан или неверный |
| `api_keys_not_configured` | 503 | на сервере не задан `NXT_API_KEYS` |
| `rate_limited` | 429 | больше 120 запросов в минуту |
| `user_not_found` | 404 | игрок не найден |
| `bin_not_found` | 404 | такого BIN нет в реестре банка |

## Как включить ключи на хостинге (Render)

1. Render → сервис `nxt-d-bank-backend` → **Environment**.
2. Добавить переменную `NXT_API_KEYS` со значением вида `casino-dena:Klyuch123`.
3. Нажать **Save** — сервис перезапустится.
4. Проверить: `curl .../api/v1/users/lookup?target=... -H "X-API-Key: Klyuch123"`.

Пока переменная не задана, защищённые эндпоинты отвечают `503 api_keys_not_configured`.

## Планы (этап 2)

- `POST /api/v1/payments` — списание в пользу приложения (депозит в игру) с ключом идемпотентности;
- `POST /api/v1/payouts` — выплата игроку;
- вебхуки `payment.succeeded` / `payout.succeeded` с подписью HMAC;
- токены карт вместо передачи карты, scopes и лимиты на приложение;
- экран согласия игрока в приложении банка и раздел «Подключённые приложения» в настройках.
