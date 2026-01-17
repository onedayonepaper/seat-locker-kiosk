/**
 * ============================================================
 * QR 코드 파서 단위 테스트
 * ============================================================
 *
 * 테스트 대상: src/lib/qr-parser.ts
 *
 * 테스트 시나리오:
 * 1. 좌석 QR 코드 파싱 (LEGACY 포맷)
 * 2. 락커 QR 코드 파싱 (LEGACY 포맷)
 * 3. APP1 포맷 QR 코드 파싱
 * 4. 잘못된 QR 코드 처리
 * 5. QR 코드 생성 함수 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  parseQRCode,
  generateSeatQRValue,
  generateLockerQRValue,
  validateUserTag,
} from '@/lib/qr-parser';

describe('QR 코드 파서', () => {
  /**
   * ============================================================
   * 시나리오 1: 좌석 QR 코드 파싱 (LEGACY 포맷)
   * ============================================================
   *
   * LEGACY 포맷: "SEAT:A1", "SEAT:B12" 등
   * - 대문자/소문자 모두 처리 가능
   * - 행(A-Z) + 열(1-99) 조합
   */
  describe('1. 좌석 QR 코드 파싱 (LEGACY 포맷)', () => {
    it('1-1. 기본 좌석 QR 코드를 파싱한다 (SEAT:A1)', () => {
      // Given: LEGACY 포맷의 좌석 QR 코드
      const qrCode = 'SEAT:A1';

      // When: QR 코드를 파싱
      const result = parseQRCode(qrCode);

      // Then: 좌석 타입과 ID가 정확히 파싱됨
      expect(result.type).toBe('SEAT');
      expect(result.resourceId).toBe('A1');
      expect(result.raw).toBe(qrCode);
    });

    it('1-2. 두 자리 열 번호를 가진 좌석을 파싱한다 (SEAT:B12)', () => {
      const result = parseQRCode('SEAT:B12');

      expect(result.type).toBe('SEAT');
      expect(result.resourceId).toBe('B12');
    });

    it('1-3. 소문자 QR 코드도 대문자로 변환하여 파싱한다', () => {
      const result = parseQRCode('seat:c5');

      expect(result.type).toBe('SEAT');
      expect(result.resourceId).toBe('C5');
    });

    it('1-4. 앞뒤 공백이 있어도 정상 파싱한다', () => {
      const result = parseQRCode('  SEAT:D3  ');

      expect(result.type).toBe('SEAT');
      expect(result.resourceId).toBe('D3');
    });
  });

  /**
   * ============================================================
   * 시나리오 2: 락커 QR 코드 파싱 (LEGACY 포맷)
   * ============================================================
   *
   * LEGACY 포맷: "LOCKER:1", "LOCKER:032" 등
   * - 1~3자리 숫자
   * - 결과는 항상 3자리로 패딩 (001, 032 등)
   */
  describe('2. 락커 QR 코드 파싱 (LEGACY 포맷)', () => {
    it('2-1. 기본 락커 QR 코드를 파싱한다 (LOCKER:1)', () => {
      // Given: 한 자리 락커 번호
      const qrCode = 'LOCKER:1';

      // When: QR 코드를 파싱
      const result = parseQRCode(qrCode);

      // Then: 3자리로 패딩된 락커 ID 반환
      expect(result.type).toBe('LOCKER');
      expect(result.resourceId).toBe('001');
    });

    it('2-2. 두 자리 락커 번호를 3자리로 패딩한다 (LOCKER:32)', () => {
      const result = parseQRCode('LOCKER:32');

      expect(result.type).toBe('LOCKER');
      expect(result.resourceId).toBe('032');
    });

    it('2-3. 세 자리 락커 번호는 그대로 유지한다 (LOCKER:100)', () => {
      const result = parseQRCode('LOCKER:100');

      expect(result.type).toBe('LOCKER');
      expect(result.resourceId).toBe('100');
    });

    it('2-4. 소문자도 정상 파싱한다', () => {
      const result = parseQRCode('locker:5');

      expect(result.type).toBe('LOCKER');
      expect(result.resourceId).toBe('005');
    });
  });

  /**
   * ============================================================
   * 시나리오 3: APP1 포맷 QR 코드 파싱
   * ============================================================
   *
   * APP1 포맷: "APP1|SEAT|A1|v1", "APP1|LOCKER|032|v1" 등
   * - 확장 가능한 새로운 포맷
   * - 버전 정보 포함
   */
  describe('3. APP1 포맷 QR 코드 파싱', () => {
    it('3-1. APP1 좌석 QR 코드를 파싱한다', () => {
      // Given: APP1 포맷의 좌석 QR 코드
      const qrCode = 'APP1|SEAT|A1|v1';

      // When: QR 코드를 파싱
      const result = parseQRCode(qrCode);

      // Then: 좌석 타입과 ID가 정확히 파싱됨
      expect(result.type).toBe('SEAT');
      expect(result.resourceId).toBe('A1');
    });

    it('3-2. APP1 락커 QR 코드를 파싱한다', () => {
      const result = parseQRCode('APP1|LOCKER|32|v1');

      expect(result.type).toBe('LOCKER');
      expect(result.resourceId).toBe('032'); // 3자리 패딩
    });

    it('3-3. 추가 데이터가 있는 APP1 포맷도 파싱한다', () => {
      // APP1|TYPE|ID|version|추가데이터 형태
      const result = parseQRCode('APP1|SEAT|B5|v1|extra');

      expect(result.type).toBe('SEAT');
      expect(result.resourceId).toBe('B5');
    });
  });

  /**
   * ============================================================
   * 시나리오 4: 잘못된 QR 코드 처리
   * ============================================================
   *
   * - 인식할 수 없는 포맷
   * - 빈 문자열
   * - 잘못된 형식
   */
  describe('4. 잘못된 QR 코드 처리', () => {
    it('4-1. 인식할 수 없는 포맷은 UNKNOWN 타입을 반환한다', () => {
      // Given: 알 수 없는 형식의 QR 코드
      const qrCode = 'INVALID:DATA';

      // When: QR 코드를 파싱
      const result = parseQRCode(qrCode);

      // Then: UNKNOWN 타입 반환, resourceId는 null
      expect(result.type).toBe('UNKNOWN');
      expect(result.resourceId).toBeNull();
      expect(result.raw).toBe(qrCode);
    });

    it('4-2. 빈 문자열은 UNKNOWN 타입을 반환한다', () => {
      const result = parseQRCode('');

      expect(result.type).toBe('UNKNOWN');
      expect(result.resourceId).toBeNull();
    });

    it('4-3. 숫자만 있는 경우 UNKNOWN 타입을 반환한다', () => {
      const result = parseQRCode('12345');

      expect(result.type).toBe('UNKNOWN');
      expect(result.resourceId).toBeNull();
    });

    it('4-4. 구분자가 없는 경우 UNKNOWN 타입을 반환한다', () => {
      const result = parseQRCode('SEATA1');

      expect(result.type).toBe('UNKNOWN');
    });
  });

  /**
   * ============================================================
   * 시나리오 5: QR 코드 생성 함수 테스트
   * ============================================================
   *
   * - LEGACY 포맷 생성
   * - APP1 포맷 생성
   */
  describe('5. QR 코드 생성 함수', () => {
    it('5-1. LEGACY 포맷 좌석 QR 코드를 생성한다', () => {
      // Given: 좌석 ID
      const seatId = 'a1';

      // When: LEGACY 포맷으로 QR 값 생성
      const result = generateSeatQRValue(seatId);

      // Then: 대문자로 변환된 LEGACY 포맷
      expect(result).toBe('SEAT:A1');
    });

    it('5-2. APP1 포맷 좌석 QR 코드를 생성한다', () => {
      const result = generateSeatQRValue('B5', 'APP1');

      expect(result).toBe('APP1|SEAT|B5|v1');
    });

    it('5-3. LEGACY 포맷 락커 QR 코드를 생성한다', () => {
      // Given: 락커 번호 (숫자)
      const lockerId = 5;

      // When: LEGACY 포맷으로 QR 값 생성
      const result = generateLockerQRValue(lockerId);

      // Then: 3자리로 패딩된 LEGACY 포맷
      expect(result).toBe('LOCKER:005');
    });

    it('5-4. APP1 포맷 락커 QR 코드를 생성한다', () => {
      const result = generateLockerQRValue('32', 'APP1');

      expect(result).toBe('APP1|LOCKER|032|v1');
    });

    it('5-5. 문자열 락커 ID도 처리한다', () => {
      const result = generateLockerQRValue('7');

      expect(result).toBe('LOCKER:007');
    });
  });

  /**
   * ============================================================
   * 시나리오 6: 사용자 태그(전화번호 뒷자리) 검증
   * ============================================================
   */
  describe('6. 사용자 태그 검증', () => {
    it('6-1. 4자리 숫자는 유효하다', () => {
      expect(validateUserTag('1234')).toBe(true);
      expect(validateUserTag('0000')).toBe(true);
      expect(validateUserTag('9999')).toBe(true);
    });

    it('6-2. 4자리가 아닌 숫자는 무효하다', () => {
      expect(validateUserTag('123')).toBe(false);
      expect(validateUserTag('12345')).toBe(false);
    });

    it('6-3. 문자가 포함되면 무효하다', () => {
      expect(validateUserTag('12a4')).toBe(false);
      expect(validateUserTag('abcd')).toBe(false);
    });

    it('6-4. 빈 문자열은 무효하다', () => {
      expect(validateUserTag('')).toBe(false);
    });
  });
});
