# mynameis 실시간 강아지 월드 MVP

여러 사용자가 같은 2D 공원에 접속해 각자의 강아지를 움직이고, 이동·퇴장·채팅·중복 접속 처리가 실시간으로 동작하는지 검증하는 기술 프로토타입입니다. 영구 저장과 Supabase 연동은 포함하지 않습니다.

## 기술 스택

- Next.js, React, TypeScript
- Phaser 3
- Colyseus

## 설치

Node.js 20 이상과 npm이 필요합니다.

```bash
npm install
```

## 실행

웹과 실시간 서버를 함께 실행:

```bash
npm run dev:all
```

또는 터미널 두 개에서 각각 실행:

```bash
npm run dev
```

```bash
npm run dev:server
```

- Next.js: `http://localhost:3000`
- Colyseus WebSocket: `ws://localhost:2567`
- 상태 확인: `http://localhost:2567/health`

## 환경 변수

기본값만 사용하면 설정이 필요 없습니다. 다른 주소나 포트를 쓸 때 `.env.example`을 참고해 `.env.local`을 설정합니다.

```env
NEXT_PUBLIC_COLYSEUS_URL=ws://localhost:2567
PORT=2567
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

`NEXT_PUBLIC_COLYSEUS_URL` 변경 후에는 Next.js 개발 서버를 다시 시작해야 합니다.

## Supabase 소셜 스키마

`supabase/migrations/202609100001_create_social_profiles.sql`에 다음 구조가 준비되어 있습니다.

- `profiles`: `auth.users`와 1:1인 사용자 프로필
- `pets`: 사용자가 소유하는 강아지와 미니홈피 공개 slug
- `mongchon`: 사용자 간 단방향 팔로우
- `profile_visits`: 방문자별 일 단위 방문 집계
- `record_profile_visit`: 중복 row 없이 방문 횟수를 증가시키는 RPC
- `daily_todos`: 사용자별 하루 최대 한 개의 TODO

Supabase CLI를 연결한 환경에서 적용합니다.

```bash
npx supabase db push
```

메인 화면은 이메일 OTP 로그인 세션이 있으면 `profiles`, 첫 번째 `pets`, 월별 `daily_todos`를 Supabase에서 조회합니다. TODO 날짜는 달력에 발자국으로 표시됩니다. 로그인하지 않았거나 환경변수가 없으면 동일 UI를 `localStorage` 데모 모드로 사용할 수 있습니다. 다이어리와 방명록은 아직 로컬 데모 데이터입니다.

## 멀티유저 테스트

서로 다른 브라우저 또는 일반/시크릿 창에서 아래 주소를 엽니다.

```text
브라우저 A: http://localhost:3000/world?petId=early&petName=얼리
브라우저 B: http://localhost:3000/world?petId=bori&petName=보리
```

확인 항목:

1. 두 강아지가 같은 공원에 표시된다.
2. WASD 또는 방향키 이동이 상대 화면에 보인다.
3. 채팅을 보내면 모든 화면에서 해당 캐릭터 위에 약 4초간 말풍선이 보인다.
4. 상대 강아지를 클릭하면 프로필 팝업이 열린다.
5. 한 브라우저를 닫으면 상대 화면에서 해당 강아지가 제거된다.

## 동일 강아지 중복 접속 테스트

```text
브라우저 A: http://localhost:3000/world?petId=early&petName=얼리
브라우저 B: http://localhost:3000/world?petId=early&petName=얼리
```

두 번째 접속이 입장하고 첫 번째 접속은 서버에 의해 종료됩니다. 첫 화면에는 `다른 기기 또는 브라우저에서 접속되어 연결이 종료되었습니다.`가 표시되어야 합니다. 판별은 브라우저 저장소가 아닌 Colyseus 서버의 `petId` 세션 맵에서 수행합니다.

## 구조

```text
src/app/world/page.tsx             # /world 진입점
src/features/world/WorldClient.tsx # 연결 상태와 React UI
src/features/world/PhaserGame.ts   # Phaser/Colyseus 연결
src/features/world/scenes/WorldScene.ts # 공원, 캐릭터, 입력, 보간
server/index.ts                    # 실시간 서버 진입점
server/rooms/WorldRoom.ts          # 접속·이동·채팅·중복 세션 정책
server/schema/Player.ts            # 동기화 플레이어 상태
```

이전 Vite/Preact 서비스 파일은 복구 가능하도록 `_legacy-vite-app/`에 보존되어 있으며 빌드 대상에서 제외됩니다.

## 범위 밖

실제 로그인, Supabase 클라이언트 연동, 실제 친구 신청 UI, 프로필 상세 데이터 연동, 아바타/아이템/재화, 미니게임, 음성·영상 채팅, AI, 모바일 최적화, 3D는 구현하지 않았습니다.
