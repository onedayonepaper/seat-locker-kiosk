/**
 * ============================================================
 * API 엔드포인트 단위 테스트
 * ============================================================
 *
 * 테스트 대상: src/app/api/* 라우트 핸들러
 *
 * 주의: 이 테스트는 실제 DB를 사용합니다.
 * 테스트 전 서버가 실행 중이고 DB가 초기화되어 있어야 합니다.
 *
 * 테스트 실행 방법:
 * 1. 서버 실행: npm run dev
 * 2. 테스트 실행: npm run test:unit
 *
 * API 응답 형식:
 * - 성공: { success: true, data: <결과> }
 * - 실패: { success: false, error: <에러 메시지> }
 *
 * 테스트 시나리오:
 * 1. 좌석 API 테스트
 * 2. 락커 API 테스트
 * 3. 상품 API 테스트
 * 4. 설정 API 테스트
 * 5. QR 스캔 API 테스트
 * 6. 상태 API 테스트
 */

import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:3000';

/**
 * API 호출 헬퍼 함수
 * 모든 API 호출에 대해 일관된 인터페이스 제공
 */
async function api<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<{ status: number; body: { success: boolean; data?: T; error?: string } }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json();
  return { status: res.status, body };
}

describe('API 엔드포인트 테스트', () => {
  /**
   * ============================================================
   * 시나리오 1: 좌석 API 테스트
   * ============================================================
   *
   * API: /api/seats, /api/seats/checkin, /api/seats/checkout
   *
   * 좌석 API는 좌석 목록 조회, 체크인, 체크아웃 기능을 제공한다.
   * 체크인 시 상품 선택이 필수이며, 체크아웃 시 userTag 검증이 필요하다.
   */
  describe('1. 좌석 API', () => {
    it('1-1. 모든 좌석 목록을 조회한다', async () => {
      // When: GET /api/seats 호출
      const { status, body } = await api('/api/seats');

      // Then: 200 응답과 success: true 반환
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data!.length).toBeGreaterThan(0);

      // 좌석 데이터 구조 검증
      const seat = body.data![0] as Record<string, unknown>;
      expect(seat).toHaveProperty('id');
      expect(seat).toHaveProperty('status');
      expect(seat).toHaveProperty('row');
      expect(seat).toHaveProperty('col');
    });

    it('1-2. 체크인에 필수 필드가 누락되면 400 에러를 반환한다', async () => {
      // Given: 필수 필드가 누락된 체크인 데이터
      const incompleteData = {
        seatId: 'A1',
        // productId와 userTag 누락
      };

      // When: POST /api/seats/checkin 호출
      const { status, body } = await api('/api/seats/checkin', {
        method: 'POST',
        body: JSON.stringify(incompleteData),
      });

      // Then: 400 에러와 에러 메시지 반환
      expect(status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Missing required fields');
    });

    it('1-3. 잘못된 좌석 ID로 체크인 시 404 에러를 반환한다', async () => {
      // Given: 존재하지 않는 좌석 ID
      const invalidData = {
        seatId: 'Z99',
        productId: 'test-product-id',
        userTag: '1234',
      };

      // When: POST /api/seats/checkin 호출
      const { status, body } = await api('/api/seats/checkin', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      // Then: 404 또는 400 에러 (상품이 존재하지 않을 수도 있음)
      expect([400, 404]).toContain(status);
      expect(body.success).toBe(false);
    });

    it('1-4. 잘못된 userTag 형식으로 체크인 시 400 에러를 반환한다', async () => {
      // Given: 잘못된 userTag (4자리 숫자가 아님)
      const invalidUserTagData = {
        seatId: 'A1',
        productId: 'test-product-id',
        userTag: 'abc', // 잘못된 형식
      };

      // When: POST /api/seats/checkin 호출
      const { status, body } = await api('/api/seats/checkin', {
        method: 'POST',
        body: JSON.stringify(invalidUserTagData),
      });

      // Then: 400 에러 반환
      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('1-5. 체크아웃에 seatId가 누락되면 400 에러를 반환한다', async () => {
      // Given: seatId가 누락된 체크아웃 데이터
      const incompleteData = {
        userTag: '1234',
      };

      // When: POST /api/seats/checkout 호출
      const { status, body } = await api('/api/seats/checkout', {
        method: 'POST',
        body: JSON.stringify(incompleteData),
      });

      // Then: 400 에러 반환
      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('1-6. 존재하지 않는 좌석 체크아웃 시 404 에러를 반환한다', async () => {
      // Given: 존재하지 않는 좌석
      const invalidData = {
        seatId: 'Z99',
        userTag: '1234',
      };

      // When: POST /api/seats/checkout 호출
      const { status, body } = await api('/api/seats/checkout', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      // Then: 404 에러 반환
      expect(status).toBe(404);
      expect(body.success).toBe(false);
    });
  });

  /**
   * ============================================================
   * 시나리오 2: 락커 API 테스트
   * ============================================================
   *
   * API: /api/lockers, /api/lockers/assign, /api/lockers/release
   *
   * 락커 API는 락커 목록 조회, 배정, 반납 기능을 제공한다.
   * 락커는 좌석과 연결될 수 있으며, 시간 제한이 없다.
   */
  describe('2. 락커 API', () => {
    it('2-1. 모든 락커 목록을 조회한다', async () => {
      // When: GET /api/lockers 호출
      const { status, body } = await api('/api/lockers');

      // Then: 200 응답과 락커 배열 반환
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data!.length).toBeGreaterThan(0);

      // 락커 데이터 구조 검증
      const locker = body.data![0] as Record<string, unknown>;
      expect(locker).toHaveProperty('id');
      expect(locker).toHaveProperty('status');
    });

    it('2-2. 락커 배정에 필수 필드가 누락되면 400 에러를 반환한다', async () => {
      // Given: 필수 필드가 누락된 배정 데이터
      const incompleteData = {
        lockerId: '001',
        // userTag 누락
      };

      // When: POST /api/lockers/assign 호출
      const { status, body } = await api('/api/lockers/assign', {
        method: 'POST',
        body: JSON.stringify(incompleteData),
      });

      // Then: 400 에러 반환
      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('2-3. 잘못된 userTag 형식으로 락커 배정 시 400 에러를 반환한다', async () => {
      // Given: 잘못된 userTag 형식
      const invalidData = {
        lockerId: '001',
        userTag: '12', // 4자리 숫자가 아님
      };

      // When: POST /api/lockers/assign 호출
      const { status, body } = await api('/api/lockers/assign', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      // Then: 400 에러 반환
      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('2-4. 락커 반납에 lockerId가 누락되면 400 에러를 반환한다', async () => {
      // Given: lockerId가 누락된 반납 데이터
      const incompleteData = {
        userTag: '5678',
      };

      // When: POST /api/lockers/release 호출
      const { status, body } = await api('/api/lockers/release', {
        method: 'POST',
        body: JSON.stringify(incompleteData),
      });

      // Then: 400 에러 반환
      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('2-5. 존재하지 않는 락커 반납 시 404 에러를 반환한다', async () => {
      // Given: 존재하지 않는 락커
      const invalidData = {
        lockerId: '999',
        userTag: '5678',
      };

      // When: POST /api/lockers/release 호출
      const { status, body } = await api('/api/lockers/release', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      // Then: 404 에러 반환
      expect(status).toBe(404);
      expect(body.success).toBe(false);
    });
  });

  /**
   * ============================================================
   * 시나리오 3: 상품 API 테스트
   * ============================================================
   *
   * API: /api/products
   *
   * 상품 API는 상품 목록 조회, 생성, 수정, 삭제 기능을 제공한다.
   * 좌석 이용 시간과 가격을 결정하는 상품을 관리한다.
   */
  describe('3. 상품 API', () => {
    it('3-1. 활성화된 상품 목록을 조회한다', async () => {
      // When: GET /api/products 호출
      const { status, body } = await api('/api/products');

      // Then: 200 응답과 상품 배열 반환
      expect(status).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);

      // 상품이 있는 경우 구조 검증
      if ((body.data as unknown[]).length > 0) {
        const product = (body.data as Record<string, unknown>[])[0];
        expect(product).toHaveProperty('id');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('durationMin');
        expect(product).toHaveProperty('price');
      }
    });

    it('3-2. 새 상품을 생성한다', async () => {
      // Given: 새 상품 정보
      const newProduct = {
        name: '테스트 상품',
        durationMin: 60,
        price: 5000,
        sortOrder: 99,
      };

      // When: POST /api/products 호출
      const { status, body } = await api('/api/products', {
        method: 'POST',
        body: JSON.stringify(newProduct),
      });

      // Then: 200 응답과 생성된 상품 반환
      expect(status).toBe(200);
      expect(body.success).toBe(true);

      const createdProduct = body.data as Record<string, unknown>;
      expect(createdProduct.name).toBe('테스트 상품');
      expect(createdProduct.durationMin).toBe(60);
      expect(createdProduct.price).toBe(5000);
    });

    it('3-3. 필수 필드가 누락되면 상품 생성에 실패한다', async () => {
      // Given: 필수 필드가 누락된 상품 정보
      const incompleteProduct = {
        name: '테스트 상품',
        // durationMin과 price 누락
      };

      // When: POST /api/products 호출
      const { status, body } = await api('/api/products', {
        method: 'POST',
        body: JSON.stringify(incompleteProduct),
      });

      // Then: 400 에러 반환
      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });
  });

  /**
   * ============================================================
   * 시나리오 4: 설정 API 테스트
   * ============================================================
   *
   * API: /api/settings
   *
   * 설정 API는 앱의 전역 설정을 관리한다.
   * QR 포맷, 만료 처리 방식, 스캔 모드 등을 설정할 수 있다.
   */
  describe('4. 설정 API', () => {
    it('4-1. 현재 설정을 조회한다', async () => {
      // When: GET /api/settings 호출
      const { status, body } = await api('/api/settings');

      // Then: 200 응답과 설정 객체 반환
      expect(status).toBe(200);
      expect(body.success).toBe(true);

      const settings = body.data as Record<string, unknown>;
      expect(settings).toHaveProperty('qrFormat');
      expect(settings).toHaveProperty('scanMode');
      expect(settings).toHaveProperty('expirationHandling');
      expect(settings).toHaveProperty('checkoutConfirmRequired');
    });

    it('4-2. 설정 값이 올바른 타입을 가진다', async () => {
      // When: GET /api/settings 호출
      const { status, body } = await api('/api/settings');

      // Then: 설정 값의 타입 검증
      expect(status).toBe(200);
      const settings = body.data as Record<string, unknown>;

      // qrFormat은 LEGACY 또는 APP1
      expect(['LEGACY', 'APP1']).toContain(settings.qrFormat);

      // scanMode는 AUTO, HID_ONLY, WEB_ONLY 중 하나
      expect(['AUTO', 'HID_ONLY', 'WEB_ONLY']).toContain(settings.scanMode);

      // expirationHandling은 MANUAL 또는 AUTO
      expect(['MANUAL', 'AUTO']).toContain(settings.expirationHandling);

      // checkoutConfirmRequired는 boolean
      expect(typeof settings.checkoutConfirmRequired).toBe('boolean');
    });
  });

  /**
   * ============================================================
   * 시나리오 5: QR 스캔 API 테스트
   * ============================================================
   *
   * API: /api/scan/resolve
   *
   * 스캔 API는 QR 코드를 해석하여 자원 정보를 반환한다.
   * SEAT:XX 또는 LOCKER:XXX 형식의 QR 코드를 지원한다.
   * 주의: 요청 파라미터는 'code'이다 (qrCode가 아님).
   */
  describe('5. QR 스캔 API', () => {
    it('5-1. 좌석 QR 코드를 해석한다', async () => {
      // Given: 좌석 QR 코드 (파라미터 이름은 'code')
      const scanData = { code: 'SEAT:A1' };

      // When: POST /api/scan/resolve 호출
      const { status, body } = await api('/api/scan/resolve', {
        method: 'POST',
        body: JSON.stringify(scanData),
      });

      // Then: 200 응답과 좌석 정보 반환
      expect(status).toBe(200);
      expect(body.success).toBe(true);

      const data = body.data as Record<string, unknown>;
      expect(data.type).toBe('SEAT');
      expect(data.resourceId).toBe('A1');
    });

    it('5-2. 락커 QR 코드를 해석한다', async () => {
      // Given: 락커 QR 코드
      const scanData = { code: 'LOCKER:5' };

      // When: POST /api/scan/resolve 호출
      const { status, body } = await api('/api/scan/resolve', {
        method: 'POST',
        body: JSON.stringify(scanData),
      });

      // Then: 200 응답과 락커 정보 반환
      expect(status).toBe(200);
      expect(body.success).toBe(true);

      const data = body.data as Record<string, unknown>;
      expect(data.type).toBe('LOCKER');
      expect(data.resourceId).toBe('005'); // 3자리 패딩
    });

    it('5-3. 잘못된 QR 코드는 400 에러를 반환한다', async () => {
      // Given: 잘못된 QR 코드
      const scanData = { code: 'INVALID:DATA' };

      // When: POST /api/scan/resolve 호출
      const { status, body } = await api('/api/scan/resolve', {
        method: 'POST',
        body: JSON.stringify(scanData),
      });

      // Then: 400 에러와 에러 메시지 반환
      expect(status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Invalid QR code format');
    });

    it('5-4. QR 코드가 누락되면 400 에러를 반환한다', async () => {
      // Given: code 파라미터 누락
      const scanData = {};

      // When: POST /api/scan/resolve 호출
      const { status, body } = await api('/api/scan/resolve', {
        method: 'POST',
        body: JSON.stringify(scanData),
      });

      // Then: 400 에러 반환
      expect(status).toBe(400);
      expect(body.success).toBe(false);
    });

    it('5-5. 존재하지 않는 좌석 QR 코드는 404 에러를 반환한다', async () => {
      // Given: 존재하지 않는 좌석
      const scanData = { code: 'SEAT:Z99' };

      // When: POST /api/scan/resolve 호출
      const { status, body } = await api('/api/scan/resolve', {
        method: 'POST',
        body: JSON.stringify(scanData),
      });

      // Then: 404 에러 반환
      expect(status).toBe(404);
      expect(body.success).toBe(false);
    });
  });

  /**
   * ============================================================
   * 시나리오 6: 상태 API 테스트
   * ============================================================
   *
   * API: /api/state
   *
   * 상태 API는 전체 앱의 현재 상태를 반환한다.
   * 좌석, 락커, 상품, 세션 정보를 한 번에 조회할 수 있다.
   * 폴링 방식으로 사용되며, 만료된 세션 처리도 수행한다.
   */
  describe('6. 상태 API', () => {
    it('6-1. 전체 앱 상태를 조회한다', async () => {
      // When: GET /api/state 호출
      const { status, body } = await api('/api/state');

      // Then: 200 응답과 상태 객체 반환
      expect(status).toBe(200);
      expect(body.success).toBe(true);

      const state = body.data as Record<string, unknown>;
      expect(state).toHaveProperty('seats');
      expect(state).toHaveProperty('lockers');
      expect(state).toHaveProperty('products');
      expect(state).toHaveProperty('sessions');
    });

    it('6-2. 상태 데이터가 올바른 배열 타입을 가진다', async () => {
      // When: GET /api/state 호출
      const { status, body } = await api('/api/state');

      // Then: 각 필드가 배열 타입
      expect(status).toBe(200);

      const state = body.data as Record<string, unknown>;
      expect(Array.isArray(state.seats)).toBe(true);
      expect(Array.isArray(state.lockers)).toBe(true);
      expect(Array.isArray(state.products)).toBe(true);
      expect(Array.isArray(state.sessions)).toBe(true);
    });

    it('6-3. 좌석과 락커 데이터에 currentSession 정보가 포함된다', async () => {
      // When: GET /api/state 호출
      const { status, body } = await api('/api/state');

      // Then: 좌석과 락커에 currentSession 필드 존재
      expect(status).toBe(200);

      const state = body.data as Record<string, unknown>;
      const seats = state.seats as Record<string, unknown>[];
      const lockers = state.lockers as Record<string, unknown>[];

      if (seats.length > 0) {
        expect(seats[0]).toHaveProperty('currentSession');
      }

      if (lockers.length > 0) {
        expect(lockers[0]).toHaveProperty('currentSession');
      }
    });
  });
});
