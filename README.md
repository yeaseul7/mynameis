# mynameis

모바일 우선 프로필 링크 서비스. Vite SPA, Supabase Auth/DB/Storage/Edge Functions를 사용합니다.

## 실행

```bash
cp .env.example .env.local
npm install
npm run dev
```

## 인증 설정

Supabase 프로젝트의 Authentication > Providers에서 Google과 Kakao를 활성화합니다.

- Site URL: `https://mynameis.life`
- Redirect URL: `http://localhost:3004/auth/callback`, `https://mynameis.life/auth/callback`
- Google/Kakao 콘솔의 콜백 URL: Supabase가 안내하는 `/auth/v1/callback` URL
- 이메일 가입 확인 사용 시 Email provider의 Confirm email 활성화

`/share/:slug`는 공개 링크입니다. 공개 프로필 조회 범위는 RLS와 공개 토큰으로 제한합니다.

## Edge Functions 배포

```bash
npx supabase login
npx supabase link --project-ref amwrvrbbmnqnzbjjemmt
npx supabase secrets set KAKAO_REST_API_KEY=발급받은_REST_API_KEY
npx supabase functions deploy account
npx supabase functions deploy dogs
npx supabase functions deploy friends
npx supabase functions deploy share
npx supabase functions deploy kakao-hospitals
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`는 함수 실행 환경에 자동 제공되므로 프론트 환경 파일에 넣지 않습니다.

## Supabase 반려동물 사진 저장소

Supabase SQL Editor에서 `supabase/migrations/202608110001_pet_profiles_and_photos.sql`을 실행하세요. 다음 항목이 생성됩니다.

- `dogs`, `dog_images` 테이블
- 사용자별 Row Level Security 정책
- 공개 `dog-images` Storage bucket
- 사용자 ID 폴더에만 업로드·삭제할 수 있는 Storage 정책

등록 화면은 사진을 최대 6장, 장당 8MB까지 원본 그대로 업로드합니다. 지원 형식은 JPG, PNG, WebP, HEIC, HEIF입니다.
