-- Kopitron: пользователи, планы, покупки и журнал напоминаний.
-- Деньги и ключи здесь не хранятся: только настройки и что уже отправлено.

CREATE TABLE IF NOT EXISTS users (
  tg_id        INTEGER PRIMARY KEY,           -- он же chat_id личного чата с ботом
  wallet       TEXT,                          -- адрес TON, только для истории
  tz           TEXT NOT NULL DEFAULT 'Europe/Moscow',
  remind_on    INTEGER NOT NULL DEFAULT 1,
  remind_time  TEXT NOT NULL DEFAULT '09:00',
  day_before   INTEGER NOT NULL DEFAULT 1,
  goal_usd     REAL,
  snooze_date  TEXT,                          -- «Напомнить завтра»: местная дата YYYY-MM-DD
  blocked      INTEGER NOT NULL DEFAULT 0,    -- пользователь остановил бота
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS plans (
  tg_id   INTEGER NOT NULL,
  coin    TEXT NOT NULL,                      -- btc | eth | gram
  amount  REAL NOT NULL,
  freq    TEXT NOT NULL,                      -- week | 2weeks | month
  day     INTEGER NOT NULL DEFAULT 0,         -- 0 = пн … 6 = вс
  paused  INTEGER NOT NULL DEFAULT 0,
  remind  INTEGER NOT NULL DEFAULT 1,         -- напоминание по этой монете
  goal    REAL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (tg_id, coin)
);

CREATE TABLE IF NOT EXISTS purchases (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_id   INTEGER NOT NULL,
  coin    TEXT NOT NULL,
  usd     REAL,
  ts      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS purchases_user ON purchases (tg_id, coin, ts);

-- Что уже отправили: одно напоминание на пользователя, вид и местную дату
CREATE TABLE IF NOT EXISTS sent (
  tg_id   INTEGER NOT NULL,
  kind    TEXT NOT NULL,                      -- due | before | snooze
  date    TEXT NOT NULL,
  ts      INTEGER NOT NULL,
  PRIMARY KEY (tg_id, kind, date)
);
