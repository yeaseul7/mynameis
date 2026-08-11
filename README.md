# mynameis

모바일 우선 프로필 링크 서비스. Next.js App Router와 Supabase Auth를 사용합니다.

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

`/share/[slug]`는 미들웨어에서 차단하지 않는 공개 링크입니다. 실제 프로필 데이터 연결 시에도 이 경로의 조회 정책은 공개 프로필만 허용하도록 RLS를 구성하세요.

## Supabase 반려동물 사진 저장소

Supabase SQL Editor에서 `supabase/migrations/202608110001_pet_profiles_and_photos.sql`을 실행하세요. 다음 항목이 생성됩니다.

- `dogs`, `dog_images` 테이블
- 사용자별 Row Level Security 정책
- 공개 `dog-images` Storage bucket
- 사용자 ID 폴더에만 업로드·삭제할 수 있는 Storage 정책

등록 화면은 사진을 최대 6장, 장당 8MB까지 원본 그대로 업로드합니다. 지원 형식은 JPG, PNG, WebP, HEIC, HEIF입니다.
