# mynameis

반려견의 기본 프로필, 돌봄 정보, 실종 정보를 각각의 공개 링크와 QR로 공유하는 모바일 우선 이름표 서비스입니다. 보호자는 반려견과 친구를 관리하고, 링크를 받은 사용자는 필요한 범위의 정보만 조회하거나 실종 위치를 제보할 수 있습니다.

## 주요 기능

- Google, Kakao, 이메일 기반 보호자 인증
- 반려견 기본 정보 및 사진 등록·수정·삭제
- 투약 여부, 병원, 비상 연락처, 생활 습관 등 돌봄 정보 관리
- 프로필·돌봄·실종 목적별 공개 링크와 QR 발급
- 실종 일시·장소 공개, 현재 위치 기반 발견 제보 및 제보 이력 확인
- 로그인 사용자 방명록 작성·답글·본인 글 삭제
- 초대 코드로 반려견 친구를 양방향 등록
- Kakao Local API 기반 동물병원 검색
- 로그아웃 및 계정 탈퇴

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| 프런트엔드 | Vite 7, Preact 10, TypeScript 5, `preact-router` |
| UI 호환 | React 19 타입/API, 자체 Next 호환 모듈 (`src/compat`) |
| 백엔드 | Supabase Auth, PostgreSQL, Storage, Edge Functions (Deno) |
| 외부 API | Kakao Local API, Kakao Maps JavaScript API |
| QR | `qrcode` |
| 배포 | Vercel 정적 SPA (`dist`) |
| 품질 검사 | ESLint, TypeScript |

현재 실제 빌드와 실행은 Next.js가 아니라 Vite가 담당합니다. `app/`와 일부 컴포넌트에는 이전 Next.js App Router 형태의 코드가 남아 있으며, Vite가 `next/link`, `next/image`, `next/navigation` 등을 `src/compat` 구현으로 치환해 재사용합니다. 브라우저 진입점과 실제 라우팅 기준은 `src/main.tsx`입니다.

## 아키텍처

```text
브라우저 (Preact SPA)
├─ Supabase JS → Auth / DB / Storage
├─ Edge Function → 권한 검사가 필요한 도메인 작업
└─ 공개 토큰 → RLS로 제한된 공유 데이터 조회

Supabase
├─ Auth: 사용자 세션, OAuth, 이메일 인증
├─ PostgreSQL: 반려견·돌봄·링크·방명록·친구·위치 제보
├─ RLS: 소유자/친구/공개 링크별 접근 제어
├─ Storage: dog-images 버킷
└─ Edge Functions: account, dogs, friends, share, kakao-hospitals
```

프런트는 단순 CRUD를 Supabase 클라이언트로 직접 수행합니다. 서비스 역할 키나 여러 테이블을 넘나드는 권한 작업은 Edge Function에서 처리합니다. 공개 공유 페이지는 추측하기 어려운 토큰과 RLS를 함께 사용하며, 활성 상태이고 폐기·만료되지 않은 링크만 읽을 수 있습니다.

## 디렉터리 구조

```text
.
├─ src/
│  ├─ main.tsx                 # SPA 진입점과 클라이언트 라우팅
│  ├─ pages/                   # 실제 Vite 페이지 조합
│  ├─ compat/                  # Next API의 Preact/Vite 호환 구현
│  └─ prerender.tsx            # 루트 랜딩 페이지 사전 렌더링
├─ components/                 # 폼, 홈, 공유 프로필, 방명록 등 UI
├─ lib/
│  ├─ auth/                    # 로그인·로그아웃 API
│  ├─ pets/                    # 타입, 검증, 서비스, 저장소 계층
│  ├─ storage/                 # 반려견 이미지 업로드·삭제
│  ├─ supabase/                # 브라우저/서버 클라이언트와 함수 호출
│  └─ regions/                 # 국내 행정구역 데이터
├─ supabase/
│  ├─ functions/               # Deno Edge Functions
│  └─ migrations/              # DB 스키마, 인덱스, RLS, RPC 변경 이력
├─ app/                        # 재사용 중인 Next 형태 페이지/메타데이터 코드
├─ public/                     # 이미지, 폰트, manifest, 정적 SEO 파일
├─ docs/design-system.md       # 디자인 시스템 문서
├─ vite.config.ts              # 빌드, 별칭, 환경 변수 매핑
└─ vercel.json                 # SPA fallback 및 배포 설정
```

`lib/pets`는 다음 책임으로 구분됩니다.

- `types.ts`: 도메인 타입과 입력 모델
- `validation.ts`: 사진, 생년월일, 체중, 등록번호, Instagram 입력 검증
- `repository.ts`: Supabase 테이블 쿼리와 DB row → 도메인 모델 변환
- `service.ts`: 등록/수정/삭제 시 DB와 Storage 작업을 묶는 유스케이스
- `invite-code.ts`: 친구 초대 코드 생성

## 라우트

| 경로 | 접근 | 역할 |
| --- | --- | --- |
| `/` | 공개 | 비로그인 랜딩 또는 로그인 사용자 대시보드 |
| `/login` | 공개 | 소셜/이메일 로그인 |
| `/auth/callback` | 공개 | OAuth 인증 완료 후 홈 이동 |
| `/account` | 로그인 | 계정 정보, 로그아웃, 탈퇴 |
| `/pets/new` | 로그인 | 반려견 등록 |
| `/pets/:id/edit` | 소유자 | 반려견 기본·돌봄·실종 정보 수정 |
| `/friends/new` | 로그인 | 초대 코드로 친구 등록 |
| `/share/:slug` | 공개 | 프로필·돌봄·실종 공유 페이지 |
| `/share/:slug?view=qr` | 공개 | 돌봄/실종 QR 이미지 생성·다운로드 |
| `/terms`, `/privacy` | 공개 | 약관 및 개인정보처리방침 |

## 핵심 비즈니스 로직

### 반려견 등록과 사진

1. 기본 프로필을 `dogs`에 저장하면서 `MNS-XXXXXX` 형식의 초대 코드를 생성합니다.
2. 코드가 중복되면 최대 5회 다시 생성합니다.
3. 사진은 `dog-images/{userId}/{dogId}/{uuid}.{ext}` 경로로 업로드하고 메타데이터를 `dog_images`에 저장합니다.
4. 첫 사진을 대표 사진으로 지정하며 반려견마다 대표 사진은 하나만 허용합니다.
5. 등록 도중 사진 저장이 실패하면 업로드 파일과 생성된 반려견 row를 정리합니다.

프런트 검증 기준은 최대 7장, 장당 8MB이며 JPG, PNG, WebP, HEIC, HEIF를 허용합니다. Storage도 장당 8MB와 동일 MIME 타입을 제한합니다.

수정 시 삭제 대상 사진의 DB row와 Storage 객체를 함께 제거합니다. 대표 사진이 삭제되면 새 사진 또는 남은 첫 사진을 대표로 승격합니다.

### 목적별 공유 링크

한 반려견은 다음 세 종류의 활성 링크를 종류별로 하나씩 가집니다.

| 타입 | 토큰 접두사 | 공개 정보/기능 |
| --- | --- | --- |
| `PROFILE` | `pet_p_` | 기본 프로필과 방명록 |
| `CARE` | `pet_c_` | 기본 프로필과 돌봄 정보 |
| `LOST` | `pet_l_` | 실종 일시·장소, 발견 위치 제보 |

대시보드에서 링크가 필요할 때 `dogs` Edge Function이 기존 활성 링크를 반환하거나 새 토큰을 만듭니다. 같은 반려견·타입에 활성 링크가 중복되지 않도록 부분 유니크 인덱스를 사용합니다. 링크는 `is_active`, `revoked_at`, `expires_at` 조건을 모두 통과해야 공개 조회가 가능합니다.

### 돌봄과 실종

돌봄 정보는 반려견당 하나의 `dog_care_profiles` row로 upsert합니다. 투약, 주 병원, 비상 연락처, 식사 횟수, 마킹, 예방접종, 유치원 경험, 알레르기, 인계 메모를 관리합니다.

보호자가 실종 일시와 행정구역·상세 위치를 등록하면 실종 링크에서 해당 정보를 표시합니다. 방문자는 브라우저 위치 권한을 허용해 발견 좌표와 정확도, 메모를 제출할 수 있습니다. DB의 `record_dog_found_location` RPC는 유효한 `LOST` 링크인지 재검증한 뒤 제보를 기록합니다. 실종 종료 시 실종 정보를 초기화하고 관련 위치 제보를 삭제합니다.

### 친구

친구 등록은 초대 코드를 대문자 `MNS-XXXXXX` 형식으로 정규화한 뒤 처리합니다. 자신의 반려견은 추가할 수 없으며, 현재 사용자의 첫 번째 반려견과 상대 반려견 사이에 양방향 `dog_friends` row를 upsert합니다. 친구 목록 사용자는 RLS 범위 안에서 친구의 기본 정보와 대표 사진을 볼 수 있습니다.

### 방명록

방명록은 로그인 사용자만 작성할 수 있고 메시지는 공백 정규화 후 최대 180자로 제한합니다. 작성자 표시는 이메일 첫 글자만 남겨 마스킹합니다. 답글은 동일 반려견의 유효한 부모 글에만 연결되도록 DB 트리거가 검증하며, 사용자는 자신이 쓴 글만 삭제할 수 있습니다.

### 계정 탈퇴

`account` Edge Function이 인증 사용자의 이미지 객체를 제거한 뒤 Admin API로 사용자를 삭제합니다. 사용자와 연결된 주요 데이터는 외래 키의 `on delete cascade`로 정리됩니다.

## 데이터 모델

| 테이블 | 역할 | 핵심 관계 |
| --- | --- | --- |
| `dogs` | 반려견 기본 정보와 초대 코드 | `auth.users` N:1 |
| `dog_images` | 사진 메타데이터와 대표 사진 | `dogs` N:1 |
| `dog_care_profiles` | 돌봄·실종 정보 | `dogs` 1:1 |
| `dog_public_links` | 목적별 공개 토큰 | `dogs` N:1, 타입별 활성 링크 1개 |
| `dog_guestbook_entries` | 방명록과 답글 | `dogs` N:1, 자기참조 parent |
| `dog_found_location_reports` | 실종 발견 좌표와 검토 상태 | `dogs` N:1 |
| `dog_friends` | 사용자별 친구 반려견 연결 | `dogs` 자기참조 |

초기의 `pets`, `pet_photos`, `share_links` 관련 migration은 현재 `dogs`, `dog_images`, `dog_public_links` 모델로 전환된 변경 이력입니다. 신규 환경은 migration을 파일명 순서대로 모두 적용해야 합니다.

## Edge Functions

| 함수 | 인증 | 작업 |
| --- | --- | --- |
| `dogs` | 필수 | 반려견 삭제, 공개 링크 발급, 실종 정보 변경 |
| `friends` | 필수 | 친구 목록, 초대 코드 등록, 친구 프로필 링크 발급 |
| `share` | 작업별 | 방명록 작성·삭제, 공개 실종 위치 제보 |
| `account` | 필수 | Storage 정리와 계정 삭제 |
| `kakao-hospitals` | 불필요 | Kakao Local API 병원 검색 프록시 |

Edge Function은 브라우저의 Bearer 토큰으로 사용자를 확인하고, 검증 후 서버의 Service Role 클라이언트로 작업합니다. `SUPABASE_SERVICE_ROLE_KEY`는 프런트 번들에 포함하면 안 됩니다.

## 로컬 실행

요구 사항: Node.js 22 권장, npm, Supabase 프로젝트.

```bash
cp .env.example .env.local
npm install
npm run dev
```

개발 서버는 `http://localhost:3004`에서 실행됩니다.

### 환경 변수

| 변수 | 용도 | 노출 범위 |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL | 브라우저 |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | 브라우저 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 관리자 작업 | 서버 전용 |
| `VITE_PUBLIC_HOME_MODE` | 공개 홈 표시 모드 | 브라우저 |
| `VITE_KAKAO_JAVASCRIPT_KEY` | 공유 페이지 지도 | 브라우저 |
| `KAKAO_REST_API_KEY` | Edge Function 병원 검색 | 서버 전용 |
| `VITE_SITE_URL` | 사이트 기준 URL | 브라우저, 선택 |

`vite.config.ts`는 Vite 환경 변수를 기존 코드가 참조하는 `NEXT_PUBLIC_*` 이름에도 매핑합니다.

### 인증 설정

Supabase Dashboard의 Authentication > Providers에서 사용할 Google과 Kakao provider를 활성화합니다.

- Site URL: `https://mynameis.life`
- Redirect URL: `http://localhost:3004/auth/callback`, `https://mynameis.life/auth/callback`
- Google/Kakao 콘솔 콜백: Supabase가 안내하는 `/auth/v1/callback`
- 이메일 가입 확인 사용 시 Email provider의 Confirm email 활성화

### DB와 Storage

Supabase CLI로 프로젝트를 연결한 뒤 migration을 적용합니다.

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Migration은 테이블, 인덱스, RLS 정책, `dog-images` 공개 버킷, 실종 제보 RPC와 방명록 검증 트리거를 생성합니다. 버킷은 이미지 URL 자체는 공개이지만 업로드·수정·삭제는 사용자 ID 폴더 기준 정책으로 제한됩니다.

### Edge Functions 배포

```bash
npx supabase secrets set KAKAO_REST_API_KEY=<kakao-rest-api-key>
npx supabase functions deploy account
npx supabase functions deploy dogs
npx supabase functions deploy friends
npx supabase functions deploy share
npx supabase functions deploy kakao-hospitals
```

Supabase 함수 환경에는 `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`가 자동 제공됩니다.

## 개발 명령어

```bash
npm run dev        # Vite 개발 서버
npm run build      # dist 정적 빌드
npm run preview    # 빌드 결과 미리보기
npm run lint       # ESLint 검사
npm run typecheck  # TypeScript 검사
```

별도의 자동화 테스트 스크립트는 아직 없습니다. 변경 후 최소 `npm run lint`, `npm run typecheck`, `npm run build`를 실행해야 합니다.

## 배포

Vercel은 `npm run build` 결과인 `dist`를 배포합니다. `vercel.json`의 rewrite가 모든 경로를 `index.html`로 보내므로 `/pets/:id/edit`, `/share/:slug` 같은 클라이언트 라우트도 직접 접근할 수 있습니다. 루트 랜딩은 빌드 시 사전 렌더링되며, 런타임에는 인증 상태에 따라 랜딩 또는 대시보드를 표시합니다.
