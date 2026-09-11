# mynameis Design System

## 1. Brand foundation

**Concept:** Chick Kindergarten — 우리 아이의 유치원 이름표를 만들어 주는 서비스

**Balance:** 귀여움 70 / 신뢰감 30. 의료·실종 정보 영역에서는 장식을 줄이고 정보 위계를 우선한다.

**Primary motif:** 이름표. 사용자에게 프로필, 카드, 공유 링크 대신 가능한 한 `이름표`라는 용어를 사용한다.

**Mascot role:** 병아리는 장식이 아니라 UX 안내자다. 빈 화면, 완료, 공개 설정, QR 안내, 오류처럼 설명이 필요한 순간에만 사용한다.

## 2. Design tokens

| Token | Value | Usage |
| --- | --- | --- |
| `--color-primary` | `#FFD966` | 핵심 CTA, 선택 상태 |
| `--color-primary-soft` | `#FFF3C4` | 배지, 강조 배경 |
| `--color-background` | `#FFFDF7` | 전체 배경 |
| `--color-peach` | `#FFBFA3` | 스티커, 보조 강조 |
| `--color-leaf` | `#A8D5A2` | 안전, 완료, 공개 상태 |
| `--color-sky` | `#A8D8F0` | 정보, 돌봄 |
| `--color-text` | `#3F392F` | 제목, 본문 |
| `--color-text-subtle` | `#81786B` | 보조 설명 |
| `--color-border` | `#EDE5D7` | 구분선, 카드 테두리 |
| `--color-danger` | `#F06C67` | 실종, 위험, 오류 |

Radius는 `12 / 16 / 24 / 32 / pill` 5단계만 사용한다. 그림자는 따뜻한 갈색을 낮은 불투명도로 사용한다.

## 3. Typography

- 본문·버튼·입력·의료 정보: Pretendard, 시스템 sans-serif
- 로고·큰 제목·반려동물 인사말: 둥근 시스템 폰트, 800~900 weight
- 본문 최소 14px, 모바일 주요 본문 16px, 보조 문구 12~13px
- 순수 검정은 사용하지 않는다. 기본 글자는 Cocoa `#3F392F`다.

## 4. Components

### Name tag card

- 24~28px radius, Oatmeal border, Warm Milk surface
- 상단에 테이프 또는 반 배지 하나만 사용
- 구조: 사진 → 반 배지 → 인사말 → 기본 정보 → 태그 → CTA
- 의료/알레르기 태그는 장식과 분리하고 명확한 텍스트를 제공한다.

### Buttons

- 높이 52px 이상, radius 16~20px
- Primary는 Chick Yellow + Cocoa text
- Danger는 Coral Red + white text
- 아이콘은 행동 의미가 있을 때만 사용하고 버튼당 1개로 제한한다.

### Visibility

- `🌎 공개`, `🔒 나만 보기`처럼 아이콘과 텍스트를 함께 사용한다.
- 색만으로 상태를 표현하지 않는다.
- 질문형 제목: `얼리의 이름표에는 무엇을 보여줄까요?`

### QR modes

- 돌봄: Yellow/Green, 병아리 안내자 허용, `얼리를 부탁해요`
- 실종: Coral 중심, 장식 최소화, `얼리를 찾고 있어요`
- QR 주변에는 충분한 흰 여백을 확보하고 배경 패턴을 넣지 않는다.

### Navigation

- 앱 내부: 모바일 Bottom Navigation `홈 / 우리아이 / 이름표 / 마이`
- 공개 공유 페이지: 앱 Header와 Bottom Navigation 모두 제거
- 공유 방문자의 첫 행동은 보호자 연락 또는 돌봄 정보 확인이어야 한다.

## 5. Voice & UX copy

- 친근하지만 사실을 흐리지 않는다.
- `프로필 생성 완료` → `🐣 얼리의 이름표가 만들어졌어요!`
- `데이터 없음` → `🐣 아직 등록된 친구가 없어요. 우리 아이를 처음 등록해볼까요?`
- `비공개` → `🔒 나만 볼래요`
- 오류는 원인과 해결 행동을 함께 제공하며 의료·실종 영역에서 캐릭터 농담을 사용하지 않는다.

## 6. Accessibility

- 본문 대비 WCAG AA 이상 유지
- 최소 터치 영역 44×44px
- emoji와 장식 문자는 `aria-hidden` 처리하고 필수 정보는 텍스트로 반복
- 공개/비공개, 정상/위험 상태를 색상만으로 구분하지 않음
- `prefers-reduced-motion`에서 모든 장식 애니메이션 제거
