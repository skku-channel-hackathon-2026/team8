import { getDatabase } from "./database.js";

/**
 * app_records를 종류별 JSON 문서 저장소로 쓴다.
 *
 * 이 테이블은 0001 마이그레이션에 이미 들어 있어서 운영진의 원격 적용을
 * 기다리지 않고 바로 쓸 수 있다. 전용 테이블(0002)이 적용되면 이 모듈만
 * 갈아 끼우고 호출부는 그대로 둔다.
 *
 * id 형식: `<kind>:<key>` — 예: `user:ch1:mgr2`, `task:abc123`
 */

export type RecordKind =
  | "user"
  | "mission"
  | "submission"
  | "request"
  | "room"
  | "task"
  | "ledger"
  | "chat";

function idOf(kind: RecordKind, key: string): string {
  return `${kind}:${key}`;
}

export async function getRecord<T>(
  kind: RecordKind,
  key: string,
): Promise<T | null> {
  const row = await getDatabase()
    .prepare("SELECT value_json FROM app_records WHERE id = ?")
    .bind(idOf(kind, key))
    .first<{ value_json: string }>();
  if (!row) return null;
  try {
    return JSON.parse(row.value_json) as T;
  } catch {
    return null;
  }
}

export async function putRecord(
  kind: RecordKind,
  key: string,
  value: unknown,
): Promise<void> {
  await getDatabase()
    .prepare(
      `INSERT INTO app_records (id, value_json) VALUES (?, ?)
       ON CONFLICT(id) DO UPDATE SET
         value_json = excluded.value_json,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(idOf(kind, key), JSON.stringify(value))
    .run();
}

export async function listRecords<T>(kind: RecordKind): Promise<T[]> {
  // kind는 고정된 유니온이라 LIKE 와일드카드(%, _)가 들어갈 일이 없다.
  const { results } = await getDatabase()
    .prepare("SELECT value_json FROM app_records WHERE id LIKE ? ORDER BY id")
    .bind(`${kind}:%`)
    .all<{ value_json: string }>();

  const values: T[] = [];
  for (const row of results) {
    try {
      values.push(JSON.parse(row.value_json) as T);
    } catch {
      // 깨진 행 하나가 목록 전체를 막지 않게 한다.
    }
  }
  return values;
}

export async function deleteRecord(
  kind: RecordKind,
  key: string,
): Promise<void> {
  await getDatabase()
    .prepare("DELETE FROM app_records WHERE id = ?")
    .bind(idOf(kind, key))
    .run();
}

/**
 * 잔액을 SQL 안에서 더한다. 읽고-고치고-쓰는 사이에 남이 끼어들 틈이 없다.
 * 결과가 음수가 되면 아무것도 바꾸지 않고 null을 돌려준다.
 */
export async function addLeaves(
  userKey: string,
  delta: number,
): Promise<number | null> {
  const row = await getDatabase()
    .prepare(
      `UPDATE app_records
          SET value_json = json_set(value_json, '$.leaves',
                json_extract(value_json, '$.leaves') + ?1),
              updated_at = CURRENT_TIMESTAMP
        WHERE id = ?2
          AND json_extract(value_json, '$.leaves') + ?1 >= 0
       RETURNING json_extract(value_json, '$.leaves') AS leaves`,
    )
    .bind(delta, idOf("user", userKey))
    .first<{ leaves: number }>();
  return row ? row.leaves : null;
}

/**
 * status가 기대한 값일 때만 문서를 바꾼다. 그 사이 남이 먼저 바꿨으면 false.
 * 두 사람이 같은 부탁을 동시에 맡는 것을 막는 장치다.
 */
export async function replaceIfStatus(
  kind: RecordKind,
  key: string,
  expected: string,
  value: unknown,
): Promise<boolean> {
  const row = await getDatabase()
    .prepare(
      `UPDATE app_records
          SET value_json = ?1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?2
          AND json_extract(value_json, '$.status') = ?3
       RETURNING id`,
    )
    .bind(JSON.stringify(value), idOf(kind, key), expected)
    .first<{ id: string }>();
  return row !== null;
}
