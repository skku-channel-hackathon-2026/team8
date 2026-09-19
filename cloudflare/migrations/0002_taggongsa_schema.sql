-- 타공사 전용 스키마.
-- 적용 전까지는 0001의 app_records를 JSON 문서 저장소로 대신 쓴다
-- (server/src/records.ts). 적용된 뒤 그 모듈만 이 테이블로 갈아 끼운다.
--
-- SQLite 주의: end/order/group 등은 예약어라 컬럼명으로 쓰지 않는다.
-- 배열은 조인 테이블로 푼다.

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,               -- channel_id || ':' || manager_id
  channel_id  TEXT NOT NULL,
  manager_id  TEXT NOT NULL,
  nickname    TEXT NOT NULL,
  department  TEXT NOT NULL,
  campus      TEXT NOT NULL CHECK (campus IN ('humanities', 'natural')),
  role        TEXT NOT NULL CHECK (role IN ('fresh', 'senior')),
  show_free   INTEGER NOT NULL DEFAULT 1,
  tone        INTEGER NOT NULL DEFAULT 0,
  leaves      INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  UNIQUE (channel_id, manager_id)
);
CREATE INDEX IF NOT EXISTS idx_users_channel ON users (channel_id, show_free);

CREATE TABLE IF NOT EXISTS class_blocks (
  id        TEXT PRIMARY KEY,
  user_id   TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  day       INTEGER NOT NULL CHECK (day BETWEEN 0 AND 4),
  start_min INTEGER NOT NULL,
  end_min   INTEGER NOT NULL,
  place     TEXT NOT NULL DEFAULT '',
  CHECK (end_min > start_min)
);
CREATE INDEX IF NOT EXISTS idx_class_user ON class_blocks (user_id);

CREATE TABLE IF NOT EXISTS missions (
  id          TEXT PRIMARY KEY,
  channel_id  TEXT NOT NULL,
  author_id   TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  proof       TEXT NOT NULL DEFAULT '',
  reward      INTEGER NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('campus', 'academic', 'life', 'digital')),
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_missions_channel ON missions (channel_id, created_at);

CREATE TABLE IF NOT EXISTS mission_recommends (
  mission_id TEXT NOT NULL REFERENCES missions (id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (mission_id, user_id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id          TEXT PRIMARY KEY,
  mission_id  TEXT NOT NULL REFERENCES missions (id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  note        TEXT NOT NULL DEFAULT '',
  photo_url   TEXT,                            -- 이미지 원본은 넣지 않는다
  status      TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_id TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at  INTEGER NOT NULL,
  reviewed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_submissions_mission ON submissions (mission_id, status);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions (user_id, created_at);

CREATE TABLE IF NOT EXISTS rooms (
  id         TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  host_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  theme      TEXT NOT NULL CHECK (theme IN ('play', 'study')),
  place      TEXT NOT NULL DEFAULT '',
  until_at   INTEGER NOT NULL,
  max_size   INTEGER NOT NULL,
  note       TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rooms_channel ON rooms (channel_id, until_at);

CREATE TABLE IF NOT EXISTS room_members (
  room_id   TEXT NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
  user_id   TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS meet_requests (
  id          TEXT PRIMARY KEY,
  channel_id  TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('dm', 'room')),
  from_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  to_id       TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  room_id     TEXT REFERENCES rooms (id) ON DELETE CASCADE,
  theme       TEXT NOT NULL CHECK (theme IN ('play', 'study')),
  message     TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at  INTEGER NOT NULL,
  resolved_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_requests_to ON meet_requests (to_id, status);

CREATE TABLE IF NOT EXISTS tasks (
  id           TEXT PRIMARY KEY,
  channel_id   TEXT NOT NULL,
  requester_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  worker_id    TEXT REFERENCES users (id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  detail       TEXT NOT NULL DEFAULT '',
  place        TEXT NOT NULL DEFAULT '',
  deadline_at  INTEGER NOT NULL,
  duration     INTEGER NOT NULL,
  reward       INTEGER NOT NULL,
  category     TEXT NOT NULL CHECK (category IN ('errand', 'queue', 'study', 'etc')),
  status       TEXT NOT NULL CHECK (status IN ('open', 'assigned', 'reported', 'completed', 'cancelled')),
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_channel ON tasks (channel_id, status, deadline_at);

-- 은행잎 원장. 추가만 하고 고치거나 지우지 않는다. users.leaves는 이 합계의 캐시다.
CREATE TABLE IF NOT EXISTS ledger (
  id      TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  delta   INTEGER NOT NULL,
  label   TEXT NOT NULL,
  at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger (user_id, at);

CREATE TABLE IF NOT EXISTS chat_messages (
  id        TEXT PRIMARY KEY,
  chat_id   TEXT NOT NULL,                     -- dm:<상대> · room:<모임> · task:<부탁>
  sender_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  text      TEXT NOT NULL,
  at        INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat ON chat_messages (chat_id, at);
