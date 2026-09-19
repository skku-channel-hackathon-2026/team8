# SKKU 2026 team8

- 레포: https://github.com/skku-channel-hackathon-2026/team8
- 채널톡 앱: `SKKU 2026 Team8` (`6aab941e1e6c7347c4ec`)
- 앱 관리: https://channel.works/-/developers/apps/6aab941e1e6c7347c4ec/general
- 공통 채널: 성균관대 해커톤
- 검증 그룹: https://channel.works/xd1l0/team-chat/groups/609235
- 서버: https://skku-team8.skku-hackathon-2026-b.workers.dev
- 전용 D1: `skku-team8` (`2059b8e6-a24a-4c2c-a289-a5aa32fd7f5d`)
- 자동 배포: PR 머지 후 main CI가 성공하면 웹훅으로 원격 D1 마이그레이션 후 Cloudflare 자동 배포를 실행합니다. 실행 대기·빌드 시간이 필요합니다.

참가팀 11개 앱과 준비위 team0 앱은 같은 채널에 설치되어 있습니다. `/tutorial` 목록에서 `SKKU 2026 Team8`을 선택하세요.
팀별 앱·서버·DB는 각각 분리되어 있습니다. 채널과 테스트 대화방은 함께 사용합니다.

## 테스트할 때

`앱_개발_검증` 공개 그룹에서 실행하세요. 봇의 `writeGroupMessage` API는 비공개 그룹 전송을 지원하지 않습니다.
현재 튜토리얼 WAM은 봇 전송 실패에도 닫힐 수 있으므로, 닫힌 것만으로 성공으로 판단하지 말고 실제 메시지를 확인하세요.
기존 `docs/desk-qa.md`는 team1 파일럿 기록입니다.

테스트 케이스는 [docs/taggongsa-qa.ko.md](docs/taggongsa-qa.ko.md)에 있습니다.

### 지금은 서버 없이 돕니다

`wam/src/taggongsa/config.ts`의 `USE_SERVER`가 `false`입니다. 앱은 서버도 DB도
부르지 않고, 상대가 하는 일(신청 수락·부탁 맡기·채팅 답장)은 `tick()`이 흉내
냅니다. 네트워크가 없어도, 채널톡 밖에서도 끝까지 돌아갑니다.

서버 코드(`server/`, `/api/*`)와 다리(`store/bridge.ts`)는 그대로 있습니다.
배포 환경의 인증 문제가 풀리면 그 한 줄을 `true`로 되돌리면 여러 사람이 같은
데이터를 봅니다. 그때는 아래 시드 스크립트로 계정을 채우세요.

### 데모용 계정 채우기

화면은 이제 서버만 읽습니다. 아무도 가입하지 않은 서버는 정말로 비어 있으므로,
시연 전에 사람과 내용을 채워 둡니다. 두 번 돌려도 안전합니다.

```sh
node scripts/seed-demo.mjs --for me
```

헌내기 3명·새내기 4명과 그들이 올린 튜토리얼 5개, 부탁 3개, 모임 2개가 생깁니다.
`--for <이름>`을 주면 그 계정으로 1대1 신청과 모임 초대까지 보내 둡니다.

배포된 서버에 채울 때는 채널 id와 앱 비밀 키가 필요합니다. 비밀 키는 명령줄에
적지 말고 환경 변수로 넘기세요.

```sh
APP_SECRET=... node scripts/seed-demo.mjs --base <배포주소> --channel <채널id>
```

### 혼자서 새내기와 헌내기를 함께 보기

창 두 개를 같은 주소로 열면 서버는 둘을 한 사람으로 봅니다. 로컬에서만 통하는
`?as=` 를 붙여 사람을 나눕니다.

```sh
corepack pnpm dev:cloudflare   # 터미널 1 — 서버(:8787)
corepack pnpm dev:wam          # 터미널 2 — 화면(:5173)
```

- 헌내기: `http://localhost:5173/?as=sunbae`
- 새내기: `http://localhost:5173/?as=sinip`

이름은 아무거나 됩니다. 이름 하나가 계정 하나입니다. 배포된 주소에서는 통하지
않으며, 채널톡이 서명한 토큰만 받아들입니다.

[개발·DB 마이그레이션 안내](HACKATHON.ko.md)를 확인하세요.
DB 스키마 변경은 `cloudflare/migrations/`의 새 SQL로 관리합니다. main CI 성공 후 원격 D1 마이그레이션 → 앱 배포가 자동 실행되며, SQL 실패 시 앱 배포는 중단됩니다.
팀장에게 이 레포 Admin·해당 앱 owner 초대를 발송했습니다. 각 초대를 수락한 뒤 개발하세요.
앱 초대 확인: [개발자 앱 목록](https://channel.works/-/developers/apps).
