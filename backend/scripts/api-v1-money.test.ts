/**
 * Проверка денежных операций API v1 (debit / credit / сверка / dryRun / идемпотентность).
 *
 * Запуск:  npm run test:api        (из папки backend)
 *
 * Тест сам поднимает приложение в двух режимах (основной и с лимитом записи 3/мин),
 * работает на боевой базе из DATABASE_URL, создает временных пользователей
 * и полностью удаляет их вместе со своими транзакциями, идемпотентностями и аудитом.
 */
import { spawn, ChildProcess } from 'child_process';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PORT = 5095;
const BASE = `http://localhost:${PORT}`;

// Тестовые ключи (никаких реальных секретов)
const RO_KEY = 'testreadkey0000000000000000000000000aa'; // только чтение
const RW_KEY = 'testwritekey00000000000000000000000bb'; // чтение + запись
const RW_KEY_2 = 'testwritekey20000000000000000000000dd'; // второй пишущий ключ (своя квота)
const OTHER_KEY = 'testotherkey0000000000000000000000cc'; // чужой ключ

let okCount = 0;
let failCount = 0;

const log = (label: string, ok: boolean, extra = '') => {
  ok ? okCount++ : failCount++;
  console.log(`${ok ? '✅' : '❌'} ${label}${extra ? ' — ' + extra : ''}`);
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type CallOptions = { key?: string; body?: any; idem?: string; userAgent?: string };

const call = async (method: string, path: string, opts: CallOptions = {}) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.key) headers['X-API-Key'] = opts.key;
  if (opts.idem) headers['Idempotency-Key'] = opts.idem;
  if (opts.userAgent) headers['User-Agent'] = opts.userAgent;

  const res = await fetch(BASE + path, { method, headers, ...(opts.body ? { body: JSON.stringify(opts.body) } : {}) });
  let data: any = null;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data, headers: res.headers };
};

const startServer = async (extraEnv: Record<string, string> = {}): Promise<ChildProcess> => {
  const child = spawn('npx', ['tsx', 'src/server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(PORT),
      NXT_API_KEYS: `ro:${RO_KEY}:read,rw:${RW_KEY}:read|write,rw2:${RW_KEY_2}:read|write,other:${OTHER_KEY}:read`,
      DBANK_WRITE_ENABLED: 'true',
      ...extraEnv
    },
    stdio: 'ignore'
  });

  for (let i = 0; i < 60; i++) {
    await sleep(500);
    try {
      const res = await fetch(`${BASE}/api/v1/health`);
      if (res.ok) return child;
    } catch { /* сервер еще поднимается */ }
  }
  child.kill('SIGKILL');
  throw new Error('сервер не поднялся за 30 секунд');
};

const stopServer = async (child: ChildProcess) => {
  child.kill('SIGTERM');
  await sleep(800);
  if (!child.killed) child.kill('SIGKILL');
};

// Временный пользователь со счетом в рублях
const createTestUser = async (lastName: string, balance: number) => {
  const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
  return prisma.user.create({
    data: {
      firstName: 'QA',
      lastName,
      phone: `+7999${randomUUID().replace(/-/g, '').slice(0, 7)}`,
      login: `qa_api_${randomUUID().slice(0, 12)}`,
      password: 'not-used-in-api-test',
      account: { create: { balance, currency: 'RUB' } },
      cards: { create: { number: `7777${digits}`, expiryDate: '12/30', cvv: '123', ownerName: 'QA TEST' } }
    },
    include: { account: true }
  });
};

const balanceOf = async (userId: string) => {
  const acc = await prisma.account.findUnique({ where: { userId } });
  return acc ? acc.balance : null;
};

const userIds: string[] = [];

(async () => {
  const started = Date.now();
  let server: ChildProcess | null = null;
  let limitServer: ChildProcess | null = null;

  try {
    // ---------- Фаза 1: основная логика (лимит записи высокий, чтобы не мешал проверкам) ----------
    server = await startServer({ WRITE_RATE_MAX: '200' });
    log('сервер поднялся', true, `порт ${PORT}`);

    const user = await createTestUser('APIMoney', 2000);
    userIds.push(user.id);
    const uid = user.id;
    const startBalance = user.account!.balance;

    // 1. Доступ: без ключа, несуществующий ключ, ключ только на чтение
    const noKey = await call('POST', `/api/v1/users/${uid}/debit`, { body: { amountMinor: 100 } });
    const unknownKey = await call('POST', `/api/v1/users/${uid}/debit`, { key: 'unknown-key-000000000000000000', body: { amountMinor: 100 } });
    const otherAppKey = await call('POST', `/api/v1/users/${uid}/debit`, { key: OTHER_KEY, body: { amountMinor: 100 } });
    const readOnly = await call('POST', `/api/v1/users/${uid}/debit`, { key: RO_KEY, body: { amountMinor: 100 } });
    const noKeyGet = await call('GET', `/api/v1/transactions/${randomUUID()}`, {});

    log('debit без ключа -> 401', noKey.status === 401 && noKey.data?.error?.code === 'invalid_api_key', `http=${noKey.status} code=${noKey.data?.error?.code}`);
    log('debit с несуществующим ключом -> 401', unknownKey.status === 401 && unknownKey.data?.error?.code === 'invalid_api_key', `http=${unknownKey.status}`);
    log('debit ключом другого приложения (только чтение) -> 403', otherAppKey.status === 403 && otherAppKey.data?.error?.code === 'forbidden_scope', `http=${otherAppKey.status}`);
    log('debit ключом только для чтения -> 403 forbidden_scope', readOnly.status === 403 && readOnly.data?.error?.code === 'forbidden_scope', `http=${readOnly.status} code=${readOnly.data?.error?.code}`);
    log('сверка операции без ключа -> 401', noKeyGet.status === 401, `http=${noKeyGet.status}`);

    // 2. Валидация тела
    const badAmounts = [0, -1, 1.5, 100000001, 'abc', null, undefined];
    const amountResults: string[] = [];
    for (const value of badAmounts) {
      const r = await call('POST', `/api/v1/users/${uid}/debit`, { key: RW_KEY, body: { amountMinor: value } });
      amountResults.push(`${String(value)}=${r.status}`);
    }
    log('некорректный amountMinor -> 422 invalid_amount', amountResults.every((r) => r.endsWith('422')), amountResults.join(' '));

    const badCurrency = await call('POST', `/api/v1/users/${uid}/debit`, { key: RW_KEY, body: { amountMinor: 100, currency: 'USD' } });
    log('валюта не совпадает с валютой счета -> 422 invalid_currency', badCurrency.status === 422 && badCurrency.data?.error?.code === 'invalid_currency', `http=${badCurrency.status} code=${badCurrency.data?.error?.code}`);

    const longComment = await call('POST', `/api/v1/users/${uid}/debit`, { key: RW_KEY, body: { amountMinor: 100, comment: 'x'.repeat(141) } });
    log('comment длиннее 140 символов -> 422', longComment.status === 422, `http=${longComment.status} code=${longComment.data?.error?.code}`);

    const badUuid = await call('POST', `/api/v1/users/not-a-uuid/debit`, { key: RW_KEY, body: { amountMinor: 100 } });
    const unknownUser = await call('POST', `/api/v1/users/${randomUUID()}/debit`, { key: RW_KEY, body: { amountMinor: 100 } });
    log('неизвестный пользователь -> 404 user_not_found', badUuid.status === 404 && unknownUser.status === 404 && unknownUser.data?.error?.code === 'user_not_found', `uuid=${badUuid.status} random=${unknownUser.status}`);

    // 3. Нехватка средств
    const tooMuch = await call('POST', `/api/v1/users/${uid}/debit`, { key: RW_KEY, body: { amountMinor: 500000 } });
    const afterTooMuch = await balanceOf(uid);
    log('списание больше баланса -> 422 insufficient_funds', tooMuch.status === 422 && tooMuch.data?.error?.code === 'insufficient_funds', `http=${tooMuch.status} code=${tooMuch.data?.error?.code}`);
    log('в ошибке есть текущий остаток', typeof tooMuch.data?.balance === 'number' && tooMuch.data?.balance === startBalance, `balance=${tooMuch.data?.balance} balanceAfter=${tooMuch.data?.balanceAfter}`);
    log('баланс после неудачного списания не изменился', afterTooMuch === startBalance, `баланс=${afterTooMuch}`);

    // 4. Успешное списание (User-Agent из fetch в Node не переопределить — аудит берёт реальный заголовок клиента)
    const debitRes = await call('POST', `/api/v1/users/${uid}/debit`, {
      key: RW_KEY,
      body: { amountMinor: 50000, comment: 'Списание за услугу', reference: 'order-1042' }
    });
    const d = debitRes.data || {};
    const balanceAfterDebit = await balanceOf(uid);
    log('debit 50000 -> 200', debitRes.status === 200, `http=${debitRes.status} id=${String(d.id).slice(0, 8)}…`);
    log('контракт успеха соблюден',
      d.status === 'completed' && d.type === 'transfer' && d.direction === 'out' &&
      d.amount === 50000 && d.totalDeducted === 50000 && d.commission === 0 &&
      d.currency === 'RUB' && d.balanceAfter === startBalance - 500 &&
      d.failureReason === null && typeof d.processedAt === 'string' &&
      d.comment === 'Списание за услугу' && d.reference === 'order-1042' && typeof d.createdAt === 'string',
      `amount=${d.amount} totalDeducted=${d.totalDeducted} balanceAfter=${d.balanceAfter} ref=${d.reference}`);
    log('баланс уменьшился ровно на 500,00', balanceAfterDebit === startBalance - 500, `было ${startBalance} стало ${balanceAfterDebit}`);

    // 5. Лента операций (не сломана) показывает новую операцию
    const feed = await call('GET', `/api/v1/users/${uid}/transactions?limit=10`, { key: RO_KEY });
    const feedTx = (feed.data?.transactions || []).find((t: any) => t.id === d.id);
    log('операция появилась в ленте (direction "out", сумма в major-единицах)', Boolean(feedTx) && feedTx.direction === 'out' && feedTx.amount === 500, `в ленте: ${feedTx ? `amount=${feedTx.amount} direction=${feedTx.direction} status=${feedTx.status}` : 'не найдена'}`);

    // 6. Идемпотентность
    const idemKey = randomUUID();
    const first = await call('POST', `/api/v1/users/${uid}/debit`, { key: RW_KEY, idem: idemKey, body: { amountMinor: 10000, comment: 'idem', reference: 'order-idem' } });
    const balanceAfterFirst = await balanceOf(uid);
    const replay = await call('POST', `/api/v1/users/${uid}/debit`, { key: RW_KEY, idem: idemKey, body: { amountMinor: 10000, comment: 'idem', reference: 'order-idem' } });
    const balanceAfterReplay = await balanceOf(uid);
    log('повтор с тем же Idempotency-Key -> 200 с тем же id', replay.status === 200 && replay.data?.id === first.data?.id, `id1=${String(first.data?.id).slice(0, 8)}… id2=${String(replay.data?.id).slice(0, 8)}…`);
    log('повтор помечен заголовком Idempotent-Replay', replay.headers.get('idempotent-replay') === 'true', `заголовок=${replay.headers.get('idempotent-replay')}`);
    log('повтор НЕ списал деньги второй раз', balanceAfterFirst === balanceAfterReplay && balanceAfterFirst === startBalance - 600, `после первого ${balanceAfterFirst}, после повтора ${balanceAfterReplay}`);

    const conflict = await call('POST', `/api/v1/users/${uid}/debit`, { key: RW_KEY, idem: idemKey, body: { amountMinor: 20000, comment: 'idem', reference: 'order-idem' } });
    log('тот же ключ с другим телом -> 409 idempotency_conflict', conflict.status === 409 && conflict.data?.error?.code === 'idempotency_conflict', `http=${conflict.status} code=${conflict.data?.error?.code}`);

    const record = await prisma.idempotencyRecord.findFirst({ where: { key: idemKey } });
    const ttlHours = record ? Math.round((record.expiresAt.getTime() - record.createdAt.getTime()) / 3600000) : 0;
    log('запись идемпотентности хранится 24 часа', ttlHours >= 24, `ttl=${ttlHours}ч, ключ уникален в пределах приложения`);

    // 7. Пополнение
    const beforeCredit = await balanceOf(uid);
    const creditRes = await call('POST', `/api/v1/users/${uid}/credit`, { key: RW_KEY, body: { amountMinor: 25000, comment: 'Пополнение', reference: 'topup-77' } });
    const c = creditRes.data || {};
    const afterCredit = await balanceOf(uid);
    log('credit 25000 -> 200 (direction "in", totalDeducted 0)', creditRes.status === 200 && c.direction === 'in' && c.totalDeducted === 0 && c.amount === 25000, `http=${creditRes.status} amount=${c.amount} direction=${c.direction} totalDeducted=${c.totalDeducted}`);
    log('баланс вырос ровно на 250,00', afterCredit === beforeCredit + 250, `было ${beforeCredit} стало ${afterCredit}`);

    const feedAfter = await call('GET', `/api/v1/users/${uid}/transactions?limit=10`, { key: RO_KEY });
    const feedCredit = (feedAfter.data?.transactions || []).find((t: any) => t.id === c.id);
    log('пополнение появилось в ленте с direction "in"', Boolean(feedCredit) && feedCredit.direction === 'in', `в ленте: ${feedCredit ? `amount=${feedCredit.amount} direction=${feedCredit.direction}` : 'не найдена'}`);

    // 8. Сухой прогон
    const beforeDry = await balanceOf(uid);
    const txCountBefore = await prisma.transaction.count({ where: { receiverId: uid } });
    const dry = await call('POST', `/api/v1/users/${uid}/debit`, { key: RW_KEY, body: { amountMinor: 10000, comment: 'dry', dryRun: true } });
    const afterDry = await balanceOf(uid);
    const txCountAfter = await prisma.transaction.count({ where: { receiverId: uid } });
    log('dryRun -> 200 с applied:false и без операции', dry.status === 200 && dry.data?.applied === false && dry.data?.id === null, `http=${dry.status} applied=${dry.data?.applied} id=${dry.data?.id}`);
    log('dryRun ничего не меняет: баланс и лента', afterDry === beforeDry && txCountAfter === txCountBefore, `баланс ${beforeDry} -> ${afterDry}, транзакций ${txCountBefore} -> ${txCountAfter}`);

    const dryNotEnough = await call('POST', `/api/v1/users/${uid}/debit`, { key: RW_KEY, body: { amountMinor: 99000000, dryRun: true } });
    log('dryRun при нехватке средств сообщает причину', dryNotEnough.status === 200 && dryNotEnough.data?.applied === false && dryNotEnough.data?.failureReason === 'insufficient_funds', `failureReason=${dryNotEnough.data?.failureReason}`);

    // 9. Сверка операции
    const getTx = await call('GET', `/api/v1/transactions/${d.id}`, { key: RO_KEY });
    log('GET /transactions/:txId отдаёт ту же операцию', getTx.status === 200 && getTx.data?.id === d.id && getTx.data?.status === 'completed' && getTx.data?.amount === 50000 && getTx.data?.reference === 'order-1042', `http=${getTx.status} amount=${getTx.data?.amount} balanceAfter=${getTx.data?.balanceAfter}`);
    const getUnknown = await call('GET', `/api/v1/transactions/${randomUUID()}`, { key: RO_KEY });
    log('неизвестная операция -> 404 transaction_not_found', getUnknown.status === 404 && getUnknown.data?.error?.code === 'transaction_not_found', `http=${getUnknown.status}`);

    // 10. Аудит
    const auditRows = await prisma.apiAuditLog.findMany({ where: { userId: uid }, orderBy: { createdAt: 'asc' } });
    const results = Array.from(new Set(auditRows.map((r) => r.result)));
    const hasSecret = JSON.stringify(auditRows).includes(RW_KEY);
    log('аудит содержит успех, повтор, сухой прогон и ошибки', ['applied', 'replayed', 'dry_run'].every((r) => results.includes(r)) && results.includes('insufficient_funds') && results.includes('invalid_amount'), `результаты: ${results.join(', ')}`);
    log('в аудите есть txId, сумма, валюта, direction, ip, user-agent', Boolean(auditRows.find((r) => r.result === 'applied' && r.txId && r.amountMinor && r.currency === 'RUB' && r.direction === 'out' && r.ip && r.userAgent)), `строк аудита: ${auditRows.length}`);
    log('секретный ключ в аудите не хранится', !hasSecret && auditRows.every((r) => !String(r.keyPrefix || '').includes(RW_KEY)), `keyPrefix=${auditRows[0]?.keyPrefix}… (только префикс + sha256)`);

    // 11. Параллельные списания: 25 запросов по 100,00 против баланса 2000,00
    const race = await createTestUser('APIRace', 2000);
    userIds.push(race.id);
    const attempts = await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        call('POST', `/api/v1/users/${race.id}/debit`, { key: RW_KEY, body: { amountMinor: 10000, comment: `race-${i}` } })
      )
    );
    const appliedAttempts = attempts.filter((r) => r.status === 200);
    const rejectedAttempts = attempts.filter((r) => r.status === 422 && r.data?.error?.code === 'insufficient_funds');
    const unexpected = attempts.filter((r) => r.status !== 200 && r.status !== 422);
    const raceBalance = await balanceOf(race.id);

    log('25 параллельных списаний: ровно 20 применены, 5 отклонены', appliedAttempts.length === 20 && rejectedAttempts.length === 5 && unexpected.length === 0, `200=${appliedAttempts.length}, 422=${rejectedAttempts.length}, прочее=${unexpected.length}`);
    log('параллельные списания не сломали баланс', raceBalance === 0 && raceBalance >= 0, `остаток=${raceBalance} (20 × 100,00 = 2000,00)`);

    // ---------- Фаза 2: лимит записи считается ПО КЛЮЧУ ----------
    await stopServer(server);
    server = null;
    limitServer = await startServer({ WRITE_RATE_MAX: '3' });
    log('сервер перезапущен с WRITE_RATE_MAX=3', true, '');

    const limited = await Promise.all([
      call('POST', `/api/v1/users/${uid}/credit`, { key: RW_KEY, body: { amountMinor: 100 } }),
      call('POST', `/api/v1/users/${uid}/credit`, { key: RW_KEY, body: { amountMinor: 100 } }),
      call('POST', `/api/v1/users/${uid}/credit`, { key: RW_KEY, body: { amountMinor: 100 } }),
      call('POST', `/api/v1/users/${uid}/credit`, { key: RW_KEY, body: { amountMinor: 100 } }),
      call('POST', `/api/v1/users/${uid}/credit`, { key: RW_KEY, body: { amountMinor: 100 } }),
      call('POST', `/api/v1/users/${uid}/credit`, { key: RW_KEY, body: { amountMinor: 100 } })
    ]);
    const throttled = limited.find((r) => r.status === 429);
    log('превышение лимита записи -> 429 too_many_requests', Boolean(throttled) && throttled!.data?.error?.code === 'too_many_requests', `коды: ${limited.map((r) => r.status).join(',')}`);
    log('429 содержит заголовки x-ratelimit-*', Boolean(throttled) && throttled!.headers.get('x-ratelimit-limit') === '3' && throttled!.headers.get('x-ratelimit-remaining') === '0' && Boolean(throttled!.headers.get('x-ratelimit-reset')), `limit=${throttled?.headers.get('x-ratelimit-limit')} remaining=${throttled?.headers.get('x-ratelimit-remaining')} reset=${throttled ? 'есть' : 'нет'}`);

    const otherKeyWrite = await call('POST', `/api/v1/users/${uid}/credit`, { key: RW_KEY_2, body: { amountMinor: 100 } });
    log('лимит считается по ключу: второй ключ с отдельной квотой проходит', otherKeyWrite.status === 200, `http=${otherKeyWrite.status}`);
  } catch (e: any) {
    console.log('ОШИБКА ТЕСТА:', e?.message);
    failCount++;
  } finally {
    if (server) await stopServer(server);
    if (limitServer) await stopServer(limitServer);

    // ---------- Уборка: удаляем всё, что создал тест ----------
    await prisma.idempotencyRecord.deleteMany({ where: { appName: { in: ['ro', 'rw', 'rw2', 'other'] } } });
    await prisma.apiAuditLog.deleteMany({ where: { appName: { in: ['ro', 'rw', 'rw2', 'other'] } } });

    if (userIds.length) {
      await prisma.transaction.deleteMany({ where: { OR: [{ senderId: { in: userIds } }, { receiverId: { in: userIds } }] } });
      await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.card.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.account.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }

    const leftUsers = await prisma.user.count({ where: { id: { in: userIds } } });
    const leftTx = userIds.length ? await prisma.transaction.count({ where: { OR: [{ senderId: { in: userIds } }, { receiverId: { in: userIds } }] } }) : 0;
    const leftIdem = await prisma.idempotencyRecord.count({ where: { appName: { in: ['ro', 'rw', 'rw2', 'other'] } } });
    const leftAudit = await prisma.apiAuditLog.count({ where: { appName: { in: ['ro', 'rw', 'rw2', 'other'] } } });
    console.log(`\n🧹 очистка: пользователей ${leftUsers}, транзакций ${leftTx}, записей идемпотентности ${leftIdem}, строк аудита ${leftAudit}`);

    console.log(`\nИТОГО: успешно ${okCount}, провалено ${failCount} (${Math.round((Date.now() - started) / 1000)}с)`);
    await prisma.$disconnect();
  }
})();