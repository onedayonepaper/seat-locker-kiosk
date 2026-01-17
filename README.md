# Seat & Locker Kiosk

스터디카페, 독서실, 코워킹 스페이스를 위한 **좌석 및 사물함 관리 키오스크 시스템**

## 목차

- [개요](#개요)
- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [설치 및 실행](#설치-및-실행)
- [환경 변수](#환경-변수)
- [데이터베이스](#데이터베이스)
- [API 엔드포인트](#api-엔드포인트)
- [QR 코드 포맷](#qr-코드-포맷)
- [테스트](#테스트)
- [배포](#배포)
- [운영 가이드](#운영-가이드)
- [문제 해결](#문제-해결)
- [라이선스](#라이선스)

---

## 개요

스터디카페나 독서실에서 사용할 수 있는 셀프 서비스 키오스크 시스템입니다. 고객이 직접 QR 코드를 스캔하여 좌석 체크인/체크아웃 및 사물함 배정/반납을 할 수 있습니다.

### 시스템 구성

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   키오스크 화면   │     │   관리자 대시보드  │     │    설정 페이지    │
│   (고객용)       │     │   (직원용)       │     │   (관리자용)     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │      Next.js API        │
                    │    (REST Endpoints)     │
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │    SQLite + Prisma      │
                    │      (Local DB)         │
                    └─────────────────────────┘
```

---

## 주요 기능

### 고객용 키오스크 (`/kiosk`)

| 기능 | 설명 |
|------|------|
| **좌석 체크인** | QR 스캔 → 시간권 선택 → 전화번호 입력 → 이용 시작 |
| **좌석 체크아웃** | QR 스캔 → 전화번호 확인 → 이용 종료 |
| **사물함 배정** | QR 스캔 → 전화번호 입력 → 사물함 배정 |
| **사물함 반납** | QR 스캔 → 전화번호 확인 → 사물함 반납 |

### 관리자 대시보드 (`/admin`)

| 기능 | 설명 |
|------|------|
| **좌석 현황** | 전체 좌석 상태를 그리드로 실시간 확인 |
| **사물함 현황** | 전체 사물함 상태를 그리드로 실시간 확인 |
| **세션 상세** | 특정 좌석/사물함 클릭 시 이용자 정보 및 남은 시간 확인 |
| **강제 종료** | 관리자 권한으로 세션 강제 종료 |
| **시간 연장** | 관리자 권한으로 이용 시간 연장 |
| **이벤트 로그** | 모든 체크인/체크아웃/배정/반납 이력 조회 |

### 설정 페이지 (`/settings`)

| 탭 | 설정 항목 |
|----|----------|
| **좌석 배치** | 행/열 수 조정, 좌석 비활성화 |
| **사물함 구성** | 사물함 개수 설정, 특정 사물함 비활성화 |
| **시간권 관리** | 시간권(상품) 추가/수정/삭제, 가격 설정 |
| **정책** | QR 포맷, 만료 처리 방식, 스캔 모드, 로그 보관 기간 |
| **관리자 인증** | 관리자 비밀번호 변경 |

### 라벨 출력 (`/labels`)

| 기능 | 설명 |
|------|------|
| **QR 라벨 생성** | 좌석/사물함용 QR 코드 라벨 일괄 생성 |
| **인쇄 최적화** | 라벨 프린터용 레이아웃 |
| **포맷 선택** | LEGACY / APP1 포맷 선택 가능 |

---

## 기술 스택

### 프레임워크 & 런타임

| 기술 | 버전 | 용도 |
|------|------|------|
| **Next.js** | 16.x | 풀스택 React 프레임워크 |
| **React** | 19.x | UI 라이브러리 |
| **TypeScript** | 5.x | 타입 안전성 |
| **Node.js** | 18+ | 런타임 환경 |

### 데이터 & 상태 관리

| 기술 | 용도 |
|------|------|
| **Prisma** | ORM 및 마이그레이션 |
| **SQLite** | 경량 로컬 데이터베이스 |
| **TanStack Query** | 서버 상태 관리 및 캐싱 |
| **Zod** | 런타임 유효성 검증 |

### UI & 스타일링

| 기술 | 용도 |
|------|------|
| **Tailwind CSS** | 유틸리티 기반 스타일링 |
| **clsx / tailwind-merge** | 조건부 클래스 병합 |

### QR 코드

| 기술 | 용도 |
|------|------|
| **html5-qrcode** | 웹캠 기반 QR 스캐너 |
| **qrcode** | QR 코드 이미지 생성 |

### 인증 & 보안

| 기술 | 용도 |
|------|------|
| **jose** | JWT 토큰 생성 및 검증 |
| **Rate Limiting** | API 요청 제한 |

### 테스트

| 기술 | 용도 |
|------|------|
| **Vitest** | 유닛 테스트 |
| **Playwright** | E2E 테스트 |
| **Testing Library** | 컴포넌트 테스트 |

---

## 프로젝트 구조

```
seat-locker-kiosk/
├── prisma/
│   ├── schema.prisma        # 데이터베이스 스키마
│   └── seed.ts              # 초기 데이터 시드
├── public/                  # 정적 파일
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/             # API 라우트
│   │   │   ├── auth/        # 인증 API
│   │   │   │   ├── login/   # 로그인
│   │   │   │   ├── logout/  # 로그아웃
│   │   │   │   └── me/      # 현재 사용자 정보
│   │   │   ├── lockers/     # 사물함 API
│   │   │   │   ├── assign/  # 배정
│   │   │   │   └── release/ # 반납
│   │   │   ├── seats/       # 좌석 API
│   │   │   │   ├── checkin/ # 체크인
│   │   │   │   ├── checkout/# 체크아웃
│   │   │   │   └── extend/  # 시간 연장
│   │   │   ├── scan/        # QR 스캔 결과 처리
│   │   │   ├── products/    # 시간권 관리
│   │   │   ├── settings/    # 설정 관리
│   │   │   ├── state/       # 전체 상태 조회
│   │   │   ├── logs/        # 이벤트 로그
│   │   │   └── dev/         # 개발용 도구
│   │   ├── admin/           # 관리자 대시보드
│   │   ├── kiosk/           # 고객용 키오스크
│   │   ├── labels/          # QR 라벨 출력
│   │   ├── settings/        # 설정 페이지
│   │   ├── layout.tsx       # 루트 레이아웃
│   │   └── page.tsx         # 메인 페이지
│   ├── components/
│   │   ├── admin/           # 관리자 컴포넌트
│   │   │   ├── SeatGrid.tsx # 좌석 그리드
│   │   │   ├── LockerGrid.tsx# 사물함 그리드
│   │   │   ├── SessionDetails.tsx
│   │   │   └── RoleProvider.tsx
│   │   ├── kiosk/           # 키오스크 컴포넌트
│   │   │   ├── ProductSelector.tsx
│   │   │   ├── PhoneInput.tsx
│   │   │   └── Timer.tsx
│   │   ├── scanner/         # QR 스캐너 컴포넌트
│   │   │   ├── ScannerProvider.tsx
│   │   │   ├── WebcamScanner.tsx
│   │   │   └── HIDScannerInput.tsx
│   │   └── providers.tsx    # 전역 프로바이더
│   ├── hooks/
│   │   ├── useAppState.ts   # 상태 관리 훅
│   │   └── useAuth.ts       # 인증 훅
│   ├── lib/
│   │   ├── api/
│   │   │   └── handler.ts   # API 핸들러 유틸리티
│   │   ├── auth/
│   │   │   └── jwt.ts       # JWT 유틸리티
│   │   ├── db/
│   │   │   └── transactions.ts # DB 트랜잭션 유틸리티
│   │   ├── errors/
│   │   │   ├── index.ts     # 커스텀 에러 클래스
│   │   │   └── handler.ts   # 에러 핸들러
│   │   ├── validation/
│   │   │   ├── index.ts     # 유효성 검증 유틸리티
│   │   │   └── schemas.ts   # Zod 스키마
│   │   ├── qr-parser.ts     # QR 코드 파서
│   │   ├── rate-limit.ts    # Rate Limiting
│   │   └── utils.ts         # 공통 유틸리티
│   ├── types/
│   │   └── index.ts         # 타입 정의
│   └── middleware.ts        # Next.js 미들웨어
├── tests/
│   ├── e2e/                 # E2E 테스트
│   │   └── kiosk-flow.spec.ts
│   └── unit/                # 유닛 테스트
│       ├── api.test.ts
│       └── qr-parser.test.ts
├── .env.example             # 환경 변수 예시
├── playwright.config.ts     # Playwright 설정
├── vitest.config.ts         # Vitest 설정
└── package.json
```

---

## 설치 및 실행

### 필수 조건

- **Node.js** 18.0.0 이상
- **npm** 9.0.0 이상 (또는 pnpm, yarn)

### 설치

```bash
# 저장소 클론
git clone https://github.com/your-username/seat-locker-kiosk.git
cd seat-locker-kiosk

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 필요한 값 설정

# 데이터베이스 초기화
npm run db:push

# 초기 데이터 시드 (선택사항)
npm run db:seed
```

### 실행

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm run start
```

### 접속

- **메인 페이지**: http://localhost:3000
- **키오스크**: http://localhost:3000/kiosk
- **관리자**: http://localhost:3000/admin
- **설정**: http://localhost:3000/settings
- **라벨 출력**: http://localhost:3000/labels

---

## 환경 변수

`.env` 파일에서 설정 가능한 환경 변수:

| 변수명 | 기본값 | 설명 |
|--------|--------|------|
| `DATABASE_URL` | `file:./dev.db` | SQLite 데이터베이스 경로 |
| `JWT_SECRET` | (필수) | JWT 토큰 서명 비밀키 (32자 이상 권장) |
| `ADMIN_PASSCODE` | `1234` | 초기 관리자 비밀번호 |

### .env.example

```env
# 데이터베이스
DATABASE_URL="file:./dev.db"

# JWT 설정 (프로덕션에서는 반드시 변경)
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"

# 관리자 초기 비밀번호
ADMIN_PASSCODE="1234"
```

---

## 데이터베이스

### 스키마 구조

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Seat     │     │   Session   │     │   Locker    │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id (PK)     │──┐  │ id (PK)     │  ┌──│ id (PK)     │
│ name        │  │  │ resourceType│  │  │ name        │
│ row         │  │  │ resourceId  │  │  │ status      │
│ col         │  └─▶│ userTag     │◀─┘  │ linkedSeatId│
│ status      │     │ productId   │     │ version     │
│ version     │     │ startAt     │     └─────────────┘
└─────────────┘     │ endAt       │
                    │ status      │     ┌─────────────┐
┌─────────────┐     └─────────────┘     │  EventLog   │
│   Product   │                         ├─────────────┤
├─────────────┤     ┌─────────────┐     │ id (PK)     │
│ id (PK)     │     │  AppConfig  │     │ type        │
│ name        │     ├─────────────┤     │ payload     │
│ durationMin │     │ key (PK)    │     │ actorRole   │
│ price       │     │ value       │     │ createdAt   │
│ isActive    │     └─────────────┘     └─────────────┘
└─────────────┘
```

### 주요 모델

| 모델 | 설명 |
|------|------|
| **Seat** | 좌석 정보 (ID, 이름, 행/열, 상태) |
| **Locker** | 사물함 정보 (ID, 이름, 상태, 연동 좌석) |
| **Product** | 시간권/상품 정보 (이름, 시간, 가격) |
| **Session** | 이용 세션 (좌석/사물함 사용 기록) |
| **EventLog** | 이벤트 감사 로그 |
| **AppConfig** | 시스템 설정 (키-값 저장소) |

### 상태값

**좌석 상태 (SeatStatus)**
- `AVAILABLE`: 이용 가능
- `OCCUPIED`: 사용 중
- `EXPIRED`: 시간 만료 (체크아웃 필요)
- `DISABLED`: 비활성화

**사물함 상태 (LockerStatus)**
- `AVAILABLE`: 이용 가능
- `OCCUPIED`: 사용 중
- `DISABLED`: 비활성화

**세션 상태 (SessionStatus)**
- `ACTIVE`: 활성
- `ENDED`: 종료
- `EXPIRED`: 만료

### 데이터베이스 명령어

```bash
# 스키마 동기화 (개발용)
npm run db:push

# 초기 데이터 시드
npm run db:seed

# Prisma Studio (DB 브라우저)
npm run db:studio

# 수동 백업
cp dev.db backups/dev-$(date +%Y%m%d).db
```

---

## API 엔드포인트

### 인증

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/auth/login` | 관리자 로그인 |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/me` | 현재 사용자 정보 |

### 좌석

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/seats` | 전체 좌석 목록 |
| POST | `/api/seats/checkin` | 좌석 체크인 |
| POST | `/api/seats/checkout` | 좌석 체크아웃 |
| POST | `/api/seats/extend` | 시간 연장 |

### 사물함

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/lockers` | 전체 사물함 목록 |
| POST | `/api/lockers/assign` | 사물함 배정 |
| POST | `/api/lockers/release` | 사물함 반납 |

### 상품 (시간권)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/products` | 시간권 목록 |
| POST | `/api/products` | 시간권 추가 |
| PATCH | `/api/products` | 시간권 수정 |
| DELETE | `/api/products` | 시간권 삭제 |

### 스캔

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/scan/resolve` | QR 코드 해석 및 리소스 조회 |

### 설정

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/settings` | 현재 설정 조회 |
| PATCH | `/api/settings` | 설정 변경 |
| GET | `/api/settings/layout` | 좌석/사물함 레이아웃 조회 |
| PATCH | `/api/settings/layout` | 레이아웃 변경 |
| POST | `/api/settings/verify-admin` | 관리자 비밀번호 확인 |

### 상태 & 로그

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/state` | 전체 앱 상태 (좌석, 사물함, 세션, 상품) |
| GET | `/api/logs` | 이벤트 로그 조회 |

### 요청/응답 예시

**체크인 요청**
```json
POST /api/seats/checkin
{
  "seatId": "A1",
  "productId": "uuid-of-product",
  "userTag": "1234"
}
```

**응답**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid-of-session",
    "seat": { ... },
    "endAt": "2024-01-15T15:00:00.000Z"
  }
}
```

**에러 응답**
```json
{
  "success": false,
  "error": "이미 사용 중인 좌석입니다"
}
```

---

## QR 코드 포맷

시스템은 두 가지 QR 코드 포맷을 지원합니다.

### LEGACY 포맷

```
SEAT:A12
LOCKER:032
```

### APP1 포맷 (확장)

```
APP1|SEAT|A12|v1
APP1|LOCKER|032|v1
```

### 포맷 선택

설정 페이지(`/settings`)의 정책 탭에서 QR 포맷을 선택할 수 있습니다.
라벨 출력 시 선택된 포맷으로 QR 코드가 생성됩니다.

---

## 테스트

### 유닛 테스트

```bash
# 전체 유닛 테스트 실행
npm run test

# 특정 테스트 파일 실행
npm run test:unit

# 워치 모드
npm test -- --watch
```

### E2E 테스트

```bash
# E2E 테스트 실행
npm run test:e2e

# UI 모드로 실행 (디버깅용)
npm run test:e2e:ui

# 특정 브라우저로 실행
npx playwright test --project=chromium
```

### 테스트 커버리지

```bash
npm test -- --coverage
```

---

## 배포

### 로컬 서버 배포 (권장)

SQLite는 서버 로컬 파일이므로, 온프레미스 또는 단일 서버 배포가 적합합니다.

```bash
# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm run start

# 또는 PM2 사용
pm2 start npm --name "kiosk" -- start
```

### Docker 배포

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t seat-locker-kiosk .
docker run -p 3000:3000 -v $(pwd)/data:/app/data seat-locker-kiosk
```

### Vercel 배포 시 주의사항

Vercel은 서버리스 환경이므로 SQLite 파일이 영속적으로 저장되지 않습니다.
Vercel에 배포하려면:

1. **Turso** 또는 **PlanetScale** 같은 호스팅 DB로 전환
2. 또는 **Railway**, **Render** 같은 영속 파일시스템 지원 플랫폼 사용

---

## 운영 가이드

### 관리자 비밀번호

- **기본값**: `1234`
- **변경 방법**: `/settings` → 정책 탭 → 관리자 비밀번호

### 로그 보관

- **설정 위치**: `/settings` → 정책 탭 → 로그 보관 기간
- **0일**: 자동 삭제 비활성화 (무기한 보관)
- **권장**: 30~90일

### 만료 처리 방식

| 옵션 | 설명 |
|------|------|
| `MANUAL` | 시간 만료 후 상태만 변경, 직접 체크아웃 필요 |
| `AUTO` | 시간 만료 시 자동으로 세션 종료 |

### 스캔 모드

| 옵션 | 설명 |
|------|------|
| `AUTO` | 웹캠/HID 스캐너 모두 사용 가능 |
| `HID_ONLY` | HID 바코드 스캐너만 사용 |
| `WEB_ONLY` | 웹캠 스캐너만 사용 |

### 백업 전략

```bash
# 일일 백업 크론탭 예시
0 0 * * * cp /app/dev.db /backups/dev-$(date +\%Y\%m\%d).db

# 최근 7일치만 유지
0 1 * * * find /backups -name "*.db" -mtime +7 -delete
```

---

## 문제 해결

### 자주 발생하는 문제

**1. QR 코드 인식 실패**
- 카메라 권한 확인
- 조명 상태 확인
- QR 코드 손상 여부 확인
- HID 스캐너 연결 상태 확인

**2. 체크인/체크아웃 실패**
- 네트워크 연결 확인
- 전화번호 뒷자리 4자리 정확히 입력 확인
- 이미 사용 중인 좌석인지 확인

**3. 관리자 페이지 접근 불가**
- 관리자 비밀번호 확인
- 쿠키/세션 삭제 후 재시도
- JWT_SECRET 환경 변수 설정 확인

**4. 데이터베이스 오류**
```bash
# 스키마 재동기화
npm run db:push

# DB 파일 권한 확인
chmod 644 dev.db
```

### 로그 확인

```bash
# 개발 모드 로그
npm run dev

# 프로덕션 로그 (PM2)
pm2 logs kiosk

# 이벤트 로그 DB 조회
npm run db:studio
# EventLog 테이블 확인
```

### 초기화

```bash
# 전체 데이터 초기화 (주의!)
rm dev.db
npm run db:push
npm run db:seed
```

---

## 라이선스

MIT License

---

## 기여

이슈 및 PR 환영합니다.

1. Fork
2. Feature 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 커밋 (`git commit -m 'Add amazing feature'`)
4. Push (`git push origin feature/amazing-feature`)
5. Pull Request 생성
