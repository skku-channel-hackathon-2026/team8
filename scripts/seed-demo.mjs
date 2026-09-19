#!/usr/bin/env node
// 데모용 계정과 내용을 서버에 채운다.
//
// 화면은 이제 서버만 읽는다. 아무도 가입하지 않은 서버는 정말로 비어 있어서,
// 심사위원 앞에서 빈 목록을 보여 주게 된다. 이 스크립트가 사람 일곱 명과
// 그들이 올린 튜토리얼·부탁·모임을 미리 만들어 둔다.
//
//   node scripts/seed-demo.mjs                         로컬 Worker(:8787)에
//   node scripts/seed-demo.mjs --for sunbae            내 계정으로 신청까지 보냄
//   node scripts/seed-demo.mjs --base <배포주소> --channel <채널id>
//
// 배포된 주소에 채울 때는 서명 토큰이 필요하므로 APP_SECRET을 환경 변수로
// 넘긴다. 명령줄에 적으면 셸 기록에 남으니 넣지 않는다.
//
//   APP_SECRET=... node scripts/seed-demo.mjs --base https://... --channel abc123

import { createHmac } from "node:crypto";

// ---------------------------------------------------------------------------
// 명령줄
// ---------------------------------------------------------------------------

function readArgs(argv) {
  const args = { base: "http://127.0.0.1:8787", channel: "", for: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--base") args.base = argv[++i] ?? args.base;
    else if (key === "--channel") args.channel = argv[++i] ?? "";
    else if (key === "--for") args.for = argv[++i] ?? "";
    else if (key === "--help" || key === "-h") args.help = true;
    else {
      console.error(`알 수 없는 옵션: ${key}`);
      process.exit(1);
    }
  }
  return args;
}

const args = readArgs(process.argv.slice(2));

if (args.help) {
  console.log(`사용법:
  node scripts/seed-demo.mjs [--base <주소>] [--channel <채널id>] [--for <매니저id>]

  --base     서버 주소 (기본: http://127.0.0.1:8787)
  --channel  배포된 서버에 채울 때의 채널 id
  --for      이 사람에게 1대1 신청과 모임 초대를 보낸다 (데모 시작 시 알림)

배포된 서버에는 APP_SECRET 환경 변수가 필요하다.`);
  process.exit(0);
}

const host = new URL(args.base).hostname;
const isLocal = host === "127.0.0.1" || host === "localhost";

if (!isLocal && !args.channel) {
  console.error("배포된 주소에 채우려면 --channel <채널id>가 필요합니다.");
  process.exit(1);
}
if (!isLocal && !process.env.APP_SECRET) {
  console.error("배포된 주소에 채우려면 APP_SECRET 환경 변수가 필요합니다.");
  process.exit(1);
}

const channelId = isLocal ? "local-preview" : args.channel;

/**
 * 사람마다 토큰을 만든다.
 *
 * 로컬은 `local:<이름>` 한 줄이면 되고, 배포된 서버는 채널톡이 쓰는 것과
 * 같은 방식으로 서명해야 받아 준다.
 */
function tokenFor(managerId) {
  if (isLocal) return `local:${managerId}`;
  const session = {
    channelId,
    managerId,
    expiresAt: Date.now() + 12 * 60 * 60 * 1000,
  };
  const body = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = createHmac("sha256", process.env.APP_SECRET)
    .update("taggongsa-wam-session\0")
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

// ---------------------------------------------------------------------------
// 요청
// ---------------------------------------------------------------------------

let failures = 0;

async function call(who, path, body, method) {
  const response = await fetch(args.base + path, {
    method: method ?? (body === undefined ? "GET" : "POST"),
    headers: {
      "content-type": "application/json",
      "x-taggongsa-session": tokenFor(who),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { error: text.slice(0, 200) };
  }
  return { status: response.status, body: parsed };
}

/** 이미 있는 것은 넘어간다. 두 번 돌려도 같은 자리에 머문다. */
async function step(label, work) {
  const { status, body } = await work();
  if (status >= 200 && status < 300) {
    console.log(`  ✓ ${label}`);
    return body;
  }
  if (status === 409) {
    console.log(`  · ${label} (이미 있음)`);
    return null;
  }
  failures += 1;
  console.log(`  ✗ ${label} — ${status} ${JSON.stringify(body)}`);
  return null;
}

// ---------------------------------------------------------------------------
// 시간표: 지금 공강이도록 만든다
// ---------------------------------------------------------------------------

const ROOMS = [
  "경영관 33107",
  "다산경제관 32210",
  "호암관 50303",
  "법학관 B103",
  "제1공학관 21214",
  "자연과학캠퍼스 학술정보관",
];
const SUBJECTS = [
  "경영학원론",
  "미시경제학",
  "통계학입문",
  "자료구조",
  "선형대수학",
  "한국사의이해",
  "글쓰기",
  "영어회화",
  "심리학개론",
  "운영체제",
];

/**
 * 오늘은 지금 시각 앞뒤를 비워 두고, 다른 요일은 평범하게 채운다.
 *
 * 공강 화면은 평일 09:00–18:00에만 공강을 표시한다. 그 밖의 시각에
 * 돌리면 사람은 생기지만 "지금 공강"으로는 보이지 않는다.
 */
function timetableFor(index, now) {
  const today = (now.getDay() + 6) % 7;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const blocks = [];
  let serial = 0;

  const add = (day, start, end) => {
    serial += 1;
    blocks.push({
      id: `demo_${index}_${serial}`,
      name: SUBJECTS[(index * 3 + serial) % SUBJECTS.length],
      day,
      start,
      end,
      place: ROOMS[(index + serial) % ROOMS.length],
    });
  };

  for (let day = 0; day < 5; day += 1) {
    if (day === today && minutes >= 9 * 60 && minutes < 18 * 60) {
      // 지금은 비워 둔다. 방금 끝난 수업 하나와, 한참 뒤의 수업 하나.
      const before = minutes - 90 - index * 10;
      if (before >= 9 * 60) add(day, before - 75, before);
      const after = minutes + 100 + index * 15;
      if (after + 75 <= 18 * 60) add(day, after, after + 75);
    } else {
      const start = 9 * 60 + ((day + index) % 4) * 90;
      add(day, start, start + 75);
      add(day, start + 180, start + 255);
    }
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// 사람들
// ---------------------------------------------------------------------------

const PEOPLE = [
  {
    id: "demo-sunbae1",
    nickname: "김선배",
    department: "경영학과",
    campus: "humanities",
    role: "senior",
    through: 0,
  },
  {
    id: "demo-sunbae2",
    nickname: "이한내",
    department: "소프트웨어학과",
    campus: "natural",
    role: "senior",
    through: 0,
  },
  {
    id: "demo-sunbae3",
    nickname: "최선배",
    department: "미디어커뮤니케이션학과",
    campus: "humanities",
    role: "senior",
    through: 0,
  },
  {
    id: "demo-sinip1",
    nickname: "박새내",
    department: "국어국문학과",
    campus: "humanities",
    role: "fresh",
    through: 3,
  },
  {
    id: "demo-sinip2",
    nickname: "정새내",
    department: "통계학과",
    campus: "humanities",
    role: "fresh",
    through: 3,
  },
  {
    id: "demo-sinip3",
    nickname: "한새내",
    department: "화학공학과",
    campus: "natural",
    role: "fresh",
    through: 0,
  },
  {
    id: "demo-sinip4",
    nickname: "오새내",
    department: "심리학과",
    campus: "humanities",
    role: "fresh",
    through: 0,
  },
];

const MISSIONS = [
  {
    by: "demo-sunbae1",
    title: "학생식당에서 혼밥 해보기",
    description: "금잔디 지하 학식은 줄이 짧고 가격도 착해요.",
    proof: "식판 사진 또는 결제 내역",
    category: "campus",
  },
  {
    by: "demo-sunbae1",
    title: "중앙학술정보관 열람실 자리 잡아보기",
    description: "좌석 발급기 쓰는 법만 알면 시험기간이 편해져요.",
    proof: "좌석 배정 화면",
    category: "campus",
  },
  {
    by: "demo-sunbae2",
    title: "GLS에서 수강신청 시간표 확인하기",
    description: "장바구니와 실제 수강신청은 다르다는 걸 미리 알아두세요.",
    proof: "시간표 화면 캡처",
    category: "academic",
  },
  {
    by: "demo-sunbae2",
    title: "학교 포털 메일 한 번 보내보기",
    description: "교수님께 연락할 일이 생기기 전에 연습해 두면 좋아요.",
    proof: "보낸 편지함 캡처",
    category: "digital",
  },
  {
    by: "demo-sunbae3",
    title: "동아리 한 곳 둘러보기",
    description: "학생회관 3층에 동아리방이 모여 있어요.",
    proof: "다녀온 동아리 이름과 한 줄 소감",
    category: "life",
  },
];

/**
 * 마감·종료 시각은 자정부터 흐른 분이다. 시간표와 같은 단위다.
 * 지금부터 몇 시간 뒤로 잡되, 자정을 넘지 않게 23:50에서 멈춘다.
 */
function inHours(hours) {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return Math.min(minutes + hours * 60, 23 * 60 + 50);
}

const TASKS = [
  {
    by: "demo-sinip1",
    title: "중앙학술정보관 자리 맡아주세요",
    detail: "4층 노트북존이면 좋아요. 자리 번호만 알려주시면 됩니다.",
    place: "중앙학술정보관 4층",
    deadline: inHours(3),
    duration: 20,
    reward: 12,
    category: "queue",
  },
  {
    by: "demo-sunbae3",
    title: "학생회관에서 프린트 10장 찾아주세요",
    detail: "출력은 이미 걸어뒀어요. 찾아서 경영관까지만 부탁드려요.",
    place: "학생회관 2층 → 경영관 1층",
    deadline: inHours(5),
    duration: 30,
    reward: 20,
    category: "errand",
  },
  {
    by: "demo-sinip4",
    title: "통계학입문 지난주 필기 사진 좀 보내주세요",
    detail: "3주차 분산분석 부분이요. 사진만 찍어주시면 돼요.",
    place: "비대면",
    deadline: inHours(8),
    duration: 10,
    reward: 8,
    category: "study",
  },
];

const ROOMS_TO_MAKE = [
  {
    by: "demo-sunbae1",
    title: "점심 같이 먹어요",
    theme: "play",
    place: "금잔디 학식",
    until: inHours(2),
    max: 4,
    note: "혼밥 말고 같이 가요. 처음이어도 괜찮아요!",
    join: ["demo-sinip1"],
  },
  {
    by: "demo-sunbae2",
    title: "자료구조 과제 같이 해요",
    theme: "study",
    place: "제1공학관 스터디룸",
    until: inHours(4),
    max: 3,
    note: "연결리스트 과제 같이 보실 분",
    join: ["demo-sinip3"],
  },
];

// ---------------------------------------------------------------------------
// 채우기
// ---------------------------------------------------------------------------

async function main() {
  const now = new Date();
  const weekday = now.getDay() >= 1 && now.getDay() <= 5;
  const schoolHours = now.getHours() >= 9 && now.getHours() < 18;

  console.log(`\n서버: ${args.base}`);
  console.log(`채널: ${channelId}\n`);

  console.log("사람 만들기");
  for (const [index, person] of PEOPLE.entries()) {
    const label = person.role === "senior" ? "헌내기" : "새내기";
    const created = await step(`${person.nickname} (${label})`, () =>
      call(person.id, "/api/me/signup", {
        nickname: person.nickname,
        department: person.department,
        campus: person.campus,
        role: person.role,
      }),
    );
    // 시간표는 지금 시각을 기준으로 짜므로 돌릴 때마다 다시 넣는다.
    await call(
      person.id,
      "/api/me/timetable",
      { blocks: timetableFor(index, now) },
      "PUT",
    );
    // 부탁을 올리려면 은행잎이 있어야 한다. 가입 보너스만으로는 모자라다.
    // 이미 있는 사람에게 또 충전하면 돌릴 때마다 잔액이 불어난다.
    if (created) await call(person.id, "/api/leaves/charge", { packIndex: 2 });

    // 시간표를 넣었으니 0단계는 끝난 사람이다.
    // 추가 튜토리얼은 3단계 뒤에 열리므로, 새내기 몇은 끝까지 해 둔다.
    // 나머지는 갓 가입한 모습으로 남겨 단계 넘어가는 장면을 보여 준다.
    for (let step = 0; step <= person.through; step += 1) {
      await call(person.id, "/api/me/step", { step });
    }
  }

  // 이미 올라와 있는 것은 다시 만들지 않는다. 두 번 돌려도 같은 자리에 머문다.
  const before = (await call(PEOPLE[0].id, "/api/sync")).body;
  const has = (list, title) =>
    (list ?? []).some((item) => item.title === title);

  console.log("\n헌내기가 만드는 튜토리얼");
  for (const mission of MISSIONS) {
    if (has(before.missions, mission.title)) {
      console.log(`  · ${mission.title} (이미 있음)`);
      continue;
    }
    await step(mission.title, () =>
      call(mission.by, "/api/missions/create", {
        title: mission.title,
        description: mission.description,
        proof: mission.proof,
        category: mission.category,
      }),
    );
  }

  console.log("\n공강 마켓에 올라온 부탁");
  for (const task of TASKS) {
    if (has(before.tasks, task.title)) {
      console.log(`  · ${task.title} (이미 있음)`);
      continue;
    }
    const { by, ...draft } = task;
    await step(task.title, () => call(by, "/api/tasks/create", draft));
  }

  console.log("\n모임방");
  for (const room of ROOMS_TO_MAKE) {
    if (has(before.rooms, room.title)) {
      console.log(`  · ${room.title} (이미 있음)`);
      continue;
    }
    const { by, join, ...draft } = room;
    const made = await step(room.title, () =>
      call(by, "/api/rooms/create", draft),
    );
    if (!made?.room) continue;
    for (const member of join) {
      await step(`  └ 참여`, () =>
        call(member, "/api/rooms/join", { roomId: made.room.id }),
      );
    }
  }

  console.log("\n새내기가 낸 인증 (헌내기 화면에 심사 대기로 뜹니다)");
  const list = await call("demo-sinip1", "/api/sync");
  const missions = list.body.missions ?? [];
  if (missions[missions.length - 1]) {
    const target = missions[missions.length - 1];
    await step(`${target.title} — 박새내`, () =>
      call("demo-sinip1", "/api/submissions/create", {
        missionId: target.id,
        note: "말씀하신 대로 다녀왔어요! 사진도 찍어뒀습니다.",
      }),
    );
  }

  if (args.for) {
    console.log(`\n${args.for} 계정으로 보내는 신청`);
    const me = `${channelId}:${args.for}`;
    await step("김선배 → 1대1 스터디 신청", () =>
      call("demo-sunbae1", "/api/requests/dm", {
        toId: me,
        theme: "study",
        message: "같이 공부하실래요? 도서관 자주 가요",
      }),
    );
    const rooms = (await call("demo-sunbae2", "/api/sync")).body.rooms ?? [];
    const room = rooms.find((r) => r.hostId === `${channelId}:demo-sunbae2`);
    if (room) {
      await step("이한내 → 모임 초대", () =>
        call("demo-sunbae2", "/api/rooms/invite", {
          roomId: room.id,
          toIds: [me],
        }),
      );
    }
  }

  console.log("\n" + "─".repeat(52));
  if (!weekday || !schoolHours) {
    console.log("⚠ 지금은 평일 09:00–18:00이 아닙니다.");
    console.log("  사람은 만들어졌지만 '지금 공강'으로는 보이지 않습니다.");
    console.log("  공강 화면을 보여 줄 때는 평일 낮에 다시 돌리세요.");
  }
  if (failures > 0) {
    console.log(`✗ ${failures}건 실패했습니다. 위 로그를 확인하세요.`);
    process.exit(1);
  }
  console.log("✓ 데모 데이터를 채웠습니다.");
  if (isLocal) {
    console.log("\n창을 열어 보세요:");
    console.log("  헌내기  http://localhost:5173/?as=demo-sunbae1");
    console.log("  새내기  http://localhost:5173/?as=demo-sinip1");
    console.log("  내 계정 http://localhost:5173/?as=me");
  }
}

main().catch((error) => {
  console.error("\n서버에 닿지 못했습니다:", error.message);
  console.error("Worker가 떠 있는지 확인하세요: corepack pnpm dev:cloudflare");
  process.exit(1);
});
