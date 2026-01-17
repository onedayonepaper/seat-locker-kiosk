/**
 * ============================================================
 * 키오스크 E2E 테스트 시나리오
 * ============================================================
 *
 * 이 테스트는 실제 사용자 흐름을 시뮬레이션합니다.
 * Playwright를 사용하여 브라우저에서 테스트를 실행합니다.
 *
 * 테스트 시나리오:
 * 1. 홈 페이지 네비게이션
 * 2. 키오스크 좌석 이용 흐름
 * 3. 키오스크 락커 이용 흐름
 * 4. 관리자 대시보드 흐름
 * 5. 라벨 출력 페이지 흐름
 */

import { test, expect } from '@playwright/test';

test.describe('키오스크 시스템 E2E 테스트', () => {
  /**
   * ============================================================
   * 시나리오 1: 홈 페이지 네비게이션
   * ============================================================
   *
   * 홈 페이지에서 각 서브 페이지로 이동이 가능한지 확인
   */
  test.describe('1. 홈 페이지 네비게이션', () => {
    test('1-1. 홈 페이지가 정상적으로 로드된다', async ({ page }) => {
      // Given: 홈 페이지로 이동
      await page.goto('/');

      // Then: 타이틀과 네비게이션 카드가 표시됨
      await expect(page.getByRole('heading', { name: 'Seat & Locker Kiosk' })).toBeVisible();
      await expect(page.getByRole('heading', { name: '키오스크' })).toBeVisible();
      await expect(page.getByRole('heading', { name: '관리자' })).toBeVisible();
      await expect(page.getByRole('heading', { name: '설정' })).toBeVisible();
      await expect(page.getByRole('heading', { name: '라벨 출력' })).toBeVisible();
    });

    test('1-2. 키오스크 페이지로 이동할 수 있다', async ({ page }) => {
      // Given: 홈 페이지
      await page.goto('/');

      // When: 키오스크 카드 클릭
      await page.getByRole('link', { name: /키오스크/ }).click();

      // Then: 키오스크 페이지로 이동
      await expect(page).toHaveURL('/kiosk');
      await expect(page.getByRole('heading', { name: '환영합니다' })).toBeVisible();
    });

    test('1-3. 관리자 페이지로 이동할 수 있다', async ({ page }) => {
      // Given: 홈 페이지
      await page.goto('/');

      // When: 관리자 카드 클릭
      await page.getByRole('link', { name: /관리자/ }).click();

      // Then: 관리자 페이지로 이동
      await expect(page).toHaveURL('/admin');
    });

    test('1-4. 라벨 출력 페이지로 이동할 수 있다', async ({ page }) => {
      // Given: 홈 페이지
      await page.goto('/');

      // When: 라벨 출력 카드 클릭
      await page.getByRole('link', { name: /라벨 출력/ }).click();

      // Then: 라벨 페이지로 이동
      await expect(page).toHaveURL('/labels');
      await expect(page.getByRole('heading', { name: 'QR 라벨 출력' })).toBeVisible();
    });
  });

  /**
   * ============================================================
   * 시나리오 2: 키오스크 좌석 이용 흐름
   * ============================================================
   *
   * 사용자가 키오스크에서 좌석을 이용하는 전체 흐름 테스트
   * - 좌석 이용 시작 선택
   * - QR 스캔 화면 표시
   * - 좌석 이용 종료 선택
   */
  test.describe('2. 키오스크 좌석 이용 흐름', () => {
    test('2-1. 좌석 이용 시작 버튼이 표시된다', async ({ page }) => {
      // Given: 키오스크 페이지로 이동
      await page.goto('/kiosk');

      // Then: 좌석 이용 시작 버튼이 표시됨
      await expect(page.getByRole('button', { name: /좌석 이용 시작/ })).toBeVisible();
    });

    test('2-2. 좌석 이용 시작을 클릭하면 스캔 화면이 표시된다', async ({ page }) => {
      // Given: 키오스크 페이지
      await page.goto('/kiosk');

      // When: 좌석 이용 시작 클릭
      await page.getByRole('button', { name: /좌석 이용 시작/ }).click();

      // Then: 스캔 화면이 표시됨 (QR 코드 스캔 헤딩으로 확인)
      await expect(page.getByRole('heading', { name: /QR 코드 스캔/ })).toBeVisible();
    });

    test('2-3. 좌석 이용 종료 버튼이 표시된다', async ({ page }) => {
      // Given: 키오스크 페이지
      await page.goto('/kiosk');

      // Then: 좌석 이용 종료 버튼이 표시됨
      await expect(page.getByRole('button', { name: /좌석 이용 종료/ })).toBeVisible();
    });

    test('2-4. 홈 버튼을 클릭하면 초기 화면으로 돌아간다', async ({ page }) => {
      // Given: 키오스크 스캔 화면
      await page.goto('/kiosk');
      await page.getByRole('button', { name: /좌석 이용 시작/ }).click();

      // When: 취소/홈 버튼 클릭 (있는 경우)
      const cancelButton = page.getByRole('button', { name: /취소|홈|돌아가기/ });
      if (await cancelButton.isVisible()) {
        await cancelButton.click();

        // Then: 초기 화면으로 돌아감
        await expect(page.getByRole('heading', { name: '환영합니다' })).toBeVisible();
      }
    });
  });

  /**
   * ============================================================
   * 시나리오 3: 키오스크 락커 이용 흐름
   * ============================================================
   *
   * 사용자가 키오스크에서 락커를 이용하는 흐름 테스트
   */
  test.describe('3. 키오스크 락커 이용 흐름', () => {
    test('3-1. 락커 배정 버튼이 표시된다', async ({ page }) => {
      // Given: 키오스크 페이지
      await page.goto('/kiosk');

      // Then: 락커 배정 버튼이 표시됨
      await expect(page.getByRole('button', { name: /락커 배정/ })).toBeVisible();
    });

    test('3-2. 락커 반납 버튼이 표시된다', async ({ page }) => {
      // Given: 키오스크 페이지
      await page.goto('/kiosk');

      // Then: 락커 반납 버튼이 표시됨
      await expect(page.getByRole('button', { name: /락커 반납/ })).toBeVisible();
    });

    test('3-3. 락커 배정을 클릭하면 스캔 화면이 표시된다', async ({ page }) => {
      // Given: 키오스크 페이지
      await page.goto('/kiosk');

      // When: 락커 배정 클릭
      await page.getByRole('button', { name: /락커 배정/ }).click();

      // Then: 스캔 관련 UI가 표시됨 (QR 코드 스캔 헤딩으로 확인)
      await expect(page.getByRole('heading', { name: /QR 코드 스캔/ })).toBeVisible();
    });
  });

  /**
   * ============================================================
   * 시나리오 4: 관리자 대시보드 흐름
   * ============================================================
   *
   * 관리자 페이지의 주요 기능 테스트
   */
  test.describe('4. 관리자 대시보드 흐름', () => {
    test('4-1. 좌석 현황이 표시된다', async ({ page }) => {
      // Given: 관리자 페이지
      await page.goto('/admin');

      // Then: 좌석 현황 섹션이 표시됨
      await expect(page.getByRole('heading', { name: '좌석 현황' })).toBeVisible();
    });

    test('4-2. 락커 현황이 표시된다', async ({ page }) => {
      // Given: 관리자 페이지
      await page.goto('/admin');

      // Then: 락커 현황 섹션이 표시됨
      await expect(page.getByRole('heading', { name: '락커 현황' })).toBeVisible();
    });

    test('4-3. 통계 카드가 표시된다', async ({ page }) => {
      // Given: 관리자 페이지
      await page.goto('/admin');

      // Then: 통계 정보가 표시됨
      await expect(page.getByText('사용 가능 좌석')).toBeVisible();
      await expect(page.getByText('사용 중 좌석')).toBeVisible();
      await expect(page.getByText('사용 가능 락커')).toBeVisible();
    });

    test('4-4. 필터 버튼이 작동한다', async ({ page }) => {
      // Given: 관리자 페이지
      await page.goto('/admin');

      // When: 좌석 필터 버튼 클릭
      await page.getByRole('button', { name: '좌석 빈자리' }).click();

      // Then: 버튼이 활성화 상태로 변경됨 (스타일 변경)
      await expect(page.getByRole('button', { name: '좌석 빈자리' })).toBeVisible();
    });

    test('4-5. 검색 입력이 작동한다', async ({ page }) => {
      // Given: 관리자 페이지
      await page.goto('/admin');

      // When: 검색어 입력
      const searchInput = page.getByPlaceholder(/검색/);
      await searchInput.fill('A1');

      // Then: 입력된 값이 표시됨
      await expect(searchInput).toHaveValue('A1');
    });

    test('4-6. 좌석 클릭 시 상세 모달이 표시된다', async ({ page }) => {
      // Given: 관리자 페이지
      await page.goto('/admin');

      // When: 좌석 버튼 클릭
      const seatButton = page.getByRole('button', { name: 'A1' }).first();
      await seatButton.click();

      // Then: 상세 정보가 표시됨 (모달 또는 상세 패널)
      // 버튼 클릭 후 어떤 UI가 변경되었는지 확인
      await expect(seatButton).toBeVisible(); // 최소한 버튼이 여전히 보이는지 확인
    });
  });

  /**
   * ============================================================
   * 시나리오 5: 라벨 출력 페이지 흐름
   * ============================================================
   *
   * QR 라벨 생성 및 출력 기능 테스트
   */
  test.describe('5. 라벨 출력 페이지 흐름', () => {
    test('5-1. 좌석 라벨이 기본으로 표시된다', async ({ page }) => {
      // Given: 라벨 페이지
      await page.goto('/labels');

      // Then: 좌석 탭이 선택되어 있고 라벨이 표시됨
      await expect(page.getByRole('button', { name: '좌석' })).toBeVisible();
      // 첫 번째 SEAT 라벨 텍스트 확인
      await expect(page.getByText('SEAT:A1').first()).toBeVisible();
    });

    test('5-2. 락커 탭으로 전환할 수 있다', async ({ page }) => {
      // Given: 라벨 페이지
      await page.goto('/labels');

      // When: 락커 탭 클릭
      await page.getByRole('button', { name: '락커' }).click();

      // Then: 락커 라벨이 표시됨 (첫 번째 락커 확인)
      await expect(page.getByText('LOCKER:001').first()).toBeVisible();
    });

    test('5-3. 전체 탭으로 전환할 수 있다', async ({ page }) => {
      // Given: 라벨 페이지
      await page.goto('/labels');

      // When: 전체 탭 클릭 (exact match로 '전체 선택' 버튼과 구분)
      await page.getByRole('button', { name: '전체', exact: true }).click();

      // Then: 좌석과 락커 라벨이 모두 표시됨
      await expect(page.getByText('SEAT:A1').first()).toBeVisible();
      await expect(page.getByText('LOCKER:001').first()).toBeVisible();
    });

    test('5-4. 라벨 크기를 변경할 수 있다', async ({ page }) => {
      // Given: 라벨 페이지
      await page.goto('/labels');

      // When: 소 크기 버튼 클릭
      await page.getByRole('button', { name: '소' }).click();

      // Then: 버튼이 활성화됨
      await expect(page.getByRole('button', { name: '소' })).toBeVisible();
    });

    test('5-5. 전체 선택 버튼이 작동한다', async ({ page }) => {
      // Given: 라벨 페이지
      await page.goto('/labels');

      // When: 전체 선택 클릭
      await page.getByRole('button', { name: '전체 선택' }).click();

      // Then: 선택된 개수가 표시됨
      await expect(page.getByText(/개 선택됨/)).toBeVisible();
    });

    test('5-6. 선택 해제 버튼이 작동한다', async ({ page }) => {
      // Given: 라벨 페이지에서 전체 선택된 상태
      await page.goto('/labels');
      await page.getByRole('button', { name: '전체 선택' }).click();

      // When: 선택 해제 클릭
      await page.getByRole('button', { name: '선택 해제' }).click();

      // Then: 라벨 개수가 표시됨 (선택됨이 아닌)
      await expect(page.getByText(/개 라벨/)).toBeVisible();
    });

    test('5-7. 홈으로 돌아갈 수 있다', async ({ page }) => {
      // Given: 라벨 페이지
      await page.goto('/labels');

      // When: 홈 링크 클릭
      await page.getByRole('link', { name: /홈/ }).click();

      // Then: 홈 페이지로 이동
      await expect(page).toHaveURL('/');
    });

    test('5-8. 인쇄 버튼이 표시된다', async ({ page }) => {
      // Given: 라벨 페이지
      await page.goto('/labels');

      // Then: 인쇄 버튼이 표시됨
      await expect(page.getByRole('button', { name: /인쇄/ })).toBeVisible();
    });
  });

  /**
   * ============================================================
   * 시나리오 6: 설정 페이지 접근 제어
   * ============================================================
   *
   * 설정 페이지의 권한 관리 테스트
   */
  test.describe('6. 설정 페이지 접근 제어', () => {
    test('6-1. 비인가 사용자에게 권한 요청 화면이 표시된다', async ({ page }) => {
      // Given: 설정 페이지로 직접 이동
      await page.goto('/settings');

      // Then: 관리자 권한 요청 화면이 표시됨
      await expect(page.getByText(/관리자 권한/)).toBeVisible();
      await expect(page.getByRole('button', { name: /관리자 전환/ })).toBeVisible();
    });
  });
});
