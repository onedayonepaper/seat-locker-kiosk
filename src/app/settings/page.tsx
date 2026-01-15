'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useProductsAll,
  useAppState,
  useCreateProduct,
  useUpdateProduct,
  useDeactivateProduct,
  useSettings,
  useUpdateSettings,
  useApplyLayout,
} from '@/hooks/useAppState';
import { Providers } from '@/components/providers';
import { formatPrice, formatDuration } from '@/lib/utils';
import type { AppSettings, Product } from '@/types';
import { useRole } from '@/components/admin/RoleProvider';

function SettingsContent() {
  const { role, requestAdmin } = useRole();
  const { data: appState, isLoading: stateLoading } = useAppState(0);
  const { data: products, isLoading: productsLoading } = useProductsAll();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deactivateProduct = useDeactivateProduct();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const applyLayout = useApplyLayout();
  const [activeTab, setActiveTab] = useState<'layout' | 'products' | 'policies'>('layout');
  const [productDrafts, setProductDrafts] = useState<Record<string, Product>>({});
  const [newProduct, setNewProduct] = useState({
    name: '',
    durationMin: 60,
    price: 0,
    sortOrder: 0,
  });
  const [productError, setProductError] = useState<string | null>(null);
  const [layoutDraft, setLayoutDraft] = useState({ rowCount: 0, colCount: 0, lockerCount: 0 });
  const [layoutError, setLayoutError] = useState<string | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [adminPasscodeDraft, setAdminPasscodeDraft] = useState('');

  const isLoading = stateLoading || productsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (role !== 'ADMIN') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">관리자 권한 필요</h1>
        <p className="text-gray-600">
          설정 변경은 관리자만 가능합니다. 관리자 비밀번호로 전환해주세요.
        </p>
        <button
          onClick={() => requestAdmin()}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          관리자 전환
        </button>
      </div>
    );
  }

  // Calculate layout info
  const seats = appState?.seats || [];
  const lockers = appState?.lockers || [];
  const rows = [...new Set(seats.map((s) => s.row))].sort();
  const cols = Math.max(...seats.map((s) => s.col), 0);

  useEffect(() => {
    if (rows.length || cols || lockers.length) {
      setLayoutDraft({
        rowCount: rows.length || 0,
        colCount: cols || 0,
        lockerCount: lockers.length || 0,
      });
    }
  }, [rows.length, cols, lockers.length]);

  useEffect(() => {
    if (products) {
      const draftMap: Record<string, Product> = {};
      products.forEach((product) => {
        draftMap[product.id] = product;
      });
      setProductDrafts(draftMap);
    }
  }, [products]);

  const sortedProducts = useMemo(() => {
    return [...(products || [])].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [products]);

  const handleDraftChange = (id: string, patch: Partial<Product>) => {
    setProductDrafts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...patch,
      },
    }));
  };

  const handleCreateProduct = async () => {
    setProductError(null);
    if (!newProduct.name.trim()) {
      setProductError('상품명을 입력해주세요');
      return;
    }

    try {
      await createProduct.mutateAsync({
        name: newProduct.name.trim(),
        durationMin: newProduct.durationMin,
        price: newProduct.price,
        sortOrder: newProduct.sortOrder,
      });
      setNewProduct({
        name: '',
        durationMin: 60,
        price: 0,
        sortOrder: 0,
      });
    } catch (error) {
      setProductError(error instanceof Error ? error.message : '상품 생성에 실패했습니다');
    }
  };

  const handleSaveProduct = async (id: string) => {
    setProductError(null);
    const draft = productDrafts[id];
    if (!draft) return;

    if (!draft.name.trim()) {
      setProductError('상품명을 입력해주세요');
      return;
    }

    try {
      await updateProduct.mutateAsync({
        id,
        name: draft.name.trim(),
        durationMin: draft.durationMin,
        price: draft.price,
        sortOrder: draft.sortOrder,
        isActive: draft.isActive,
        isDefault: draft.isDefault,
      });
    } catch (error) {
      setProductError(error instanceof Error ? error.message : '상품 업데이트에 실패했습니다');
    }
  };

  const handleSetDefault = async (id: string) => {
    setProductError(null);
    try {
      await updateProduct.mutateAsync({
        id,
        isDefault: true,
        isActive: true,
      });
    } catch (error) {
      setProductError(error instanceof Error ? error.message : '기본 상품 설정에 실패했습니다');
    }
  };

  const handleToggleActive = async (id: string, nextActive: boolean) => {
    setProductError(null);
    try {
      if (nextActive) {
        await updateProduct.mutateAsync({ id, isActive: true });
      } else {
        await deactivateProduct.mutateAsync({ id });
      }
    } catch (error) {
      setProductError(error instanceof Error ? error.message : '활성 상태 변경에 실패했습니다');
    }
  };

  const handleApplyLayout = async () => {
    setLayoutError(null);
    if (!layoutDraft.rowCount || !layoutDraft.colCount) {
      setLayoutError('행/열 값을 입력해주세요');
      return;
    }
    if (layoutDraft.rowCount > 26) {
      setLayoutError('행은 최대 26까지만 지원됩니다');
      return;
    }

    const confirmed = window.confirm(
      '레이아웃 변경은 좌석/락커/세션 데이터가 초기화됩니다. 계속할까요?'
    );
    if (!confirmed) return;

    try {
      await applyLayout.mutateAsync({
        rowCount: layoutDraft.rowCount,
        colCount: layoutDraft.colCount,
        lockerCount: layoutDraft.lockerCount,
      });
    } catch (error) {
      setLayoutError(error instanceof Error ? error.message : '레이아웃 변경에 실패했습니다');
    }
  };

  const handleUpdatePolicy = async (
    patch: Partial<AppSettings> & { adminPasscode?: string }
  ) => {
    setPolicyError(null);
    try {
      await updateSettings.mutateAsync(patch);
    } catch (error) {
      setPolicyError(error instanceof Error ? error.message : '정책 저장에 실패했습니다');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">설정</h1>
      {(updateSettings.isPending || applyLayout.isPending) && (
        <div className="mb-4 text-sm text-blue-600">설정을 저장하는 중입니다...</div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        {[
          { id: 'layout', label: '레이아웃' },
          { id: 'products', label: '상품 관리' },
          { id: 'policies', label: '정책' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Layout Settings */}
      {activeTab === 'layout' && (
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-bold text-gray-900">현재 레이아웃</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">좌석 수</div>
              <div className="text-2xl font-bold text-gray-900">{seats.length}석</div>
              <div className="text-sm text-gray-500 mt-1">
                {rows.length}행 x {cols}열 ({rows.join(', ')} 행)
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">락커 수</div>
              <div className="text-2xl font-bold text-gray-900">{lockers.length}개</div>
              <div className="text-sm text-gray-500 mt-1">
                {lockers.length > 0
                  ? `${lockers[0].id} ~ ${lockers[lockers.length - 1].id}`
                  : '-'}
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700">레이아웃 변경</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="number"
                  min={1}
                  max={26}
                  value={layoutDraft.rowCount}
                  onChange={(event) =>
                    setLayoutDraft((prev) => ({ ...prev, rowCount: Number(event.target.value) }))
                  }
                  placeholder="행 수"
                  className="px-3 py-2 rounded-lg border border-gray-300"
                />
                <input
                  type="number"
                  min={1}
                  value={layoutDraft.colCount}
                  onChange={(event) =>
                    setLayoutDraft((prev) => ({ ...prev, colCount: Number(event.target.value) }))
                  }
                  placeholder="열 수"
                  className="px-3 py-2 rounded-lg border border-gray-300"
                />
                <input
                  type="number"
                  min={0}
                  value={layoutDraft.lockerCount}
                  onChange={(event) =>
                    setLayoutDraft((prev) => ({ ...prev, lockerCount: Number(event.target.value) }))
                  }
                  placeholder="락커 수"
                  className="px-3 py-2 rounded-lg border border-gray-300"
                />
              </div>
              {layoutError && <div className="text-sm text-red-600">{layoutError}</div>}
              <button
                onClick={handleApplyLayout}
                disabled={applyLayout.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                {applyLayout.isPending ? '적용 중...' : '레이아웃 적용'}
              </button>
              <p className="text-xs text-gray-500">
                변경 시 좌석/락커/세션/로그가 초기화됩니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Products Settings */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">상품 목록</h2>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            <div className="font-medium text-gray-800">상품 추가</div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                value={newProduct.name}
                onChange={(event) => setNewProduct((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="상품명"
                className="px-3 py-2 rounded-lg border border-gray-300"
              />
              <input
                type="number"
                value={newProduct.durationMin}
                onChange={(event) =>
                  setNewProduct((prev) => ({ ...prev, durationMin: Number(event.target.value) }))
                }
                placeholder="분"
                className="px-3 py-2 rounded-lg border border-gray-300"
              />
              <input
                type="number"
                value={newProduct.price}
                onChange={(event) =>
                  setNewProduct((prev) => ({ ...prev, price: Number(event.target.value) }))
                }
                placeholder="가격"
                className="px-3 py-2 rounded-lg border border-gray-300"
              />
              <input
                type="number"
                value={newProduct.sortOrder}
                onChange={(event) =>
                  setNewProduct((prev) => ({ ...prev, sortOrder: Number(event.target.value) }))
                }
                placeholder="정렬"
                className="px-3 py-2 rounded-lg border border-gray-300"
              />
            </div>
            <button
              onClick={handleCreateProduct}
              disabled={createProduct.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {createProduct.isPending ? '생성 중...' : '상품 추가'}
            </button>
          </div>

          {productError && <div className="text-sm text-red-600">{productError}</div>}

          <div className="divide-y">
            {sortedProducts.map((product) => {
              const draft = productDrafts[product.id] || product;
              return (
                <div key={product.id} className="py-4 space-y-3">
                  <div className="flex flex-wrap gap-3 items-center">
                    <input
                      value={draft.name}
                      onChange={(event) => handleDraftChange(product.id, { name: event.target.value })}
                      className="px-3 py-2 rounded-lg border border-gray-300"
                    />
                    <input
                      type="number"
                      value={draft.durationMin}
                      onChange={(event) =>
                        handleDraftChange(product.id, { durationMin: Number(event.target.value) })
                      }
                      className="px-3 py-2 rounded-lg border border-gray-300 w-28"
                    />
                    <input
                      type="number"
                      value={draft.price}
                      onChange={(event) =>
                        handleDraftChange(product.id, { price: Number(event.target.value) })
                      }
                      className="px-3 py-2 rounded-lg border border-gray-300 w-28"
                    />
                    <input
                      type="number"
                      value={draft.sortOrder}
                      onChange={(event) =>
                        handleDraftChange(product.id, { sortOrder: Number(event.target.value) })
                      }
                      className="px-3 py-2 rounded-lg border border-gray-300 w-24"
                    />
                    <div className="text-sm text-gray-500">
                      {formatDuration(draft.durationMin)} · {formatPrice(draft.price)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleSaveProduct(product.id)}
                      disabled={updateProduct.isPending}
                      className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => handleSetDefault(product.id)}
                      disabled={updateProduct.isPending}
                      className="px-3 py-1.5 rounded-lg text-sm bg-blue-100 text-blue-700 hover:bg-blue-200"
                    >
                      기본 설정
                    </button>
                    <button
                      onClick={() => handleToggleActive(product.id, !product.isActive)}
                      disabled={updateProduct.isPending || deactivateProduct.isPending}
                      className={`px-3 py-1.5 rounded-lg text-sm ${
                        product.isActive
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {product.isActive ? '비활성' : '활성'}
                    </button>
                    {product.isDefault && (
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-600 text-white">
                        기본 상품
                      </span>
                    )}
                    {!product.isActive && (
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-600">
                        비활성
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t pt-6">
            <p className="text-gray-500 text-sm">
              변경 내용은 즉시 저장되며, 키오스크 상품 목록에 반영됩니다.
            </p>
          </div>
        </div>
      )}

      {/* Policies Settings */}
      {activeTab === 'policies' && (
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-bold text-gray-900">운영 정책</h2>

          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">만료 처리</span>
                <select
                  value={settings?.expirationHandling ?? 'MANUAL'}
                  onChange={(event) =>
                    handleUpdatePolicy({ expirationHandling: event.target.value as 'MANUAL' | 'AUTO' })
                  }
                  className="px-3 py-1.5 rounded-lg text-sm border border-gray-300"
                >
                  <option value="MANUAL">수동 종료</option>
                  <option value="AUTO">자동 종료</option>
                </select>
              </div>
              <p className="text-sm text-gray-500">
                수동 종료는 EXPIRED 상태로 표시하고 관리자 종료를 기다립니다. 자동 종료는 만료 시
                즉시 종료 처리합니다.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">폴링 주기</span>
                <span className="text-blue-600">3초</span>
              </div>
              <p className="text-sm text-gray-500">
                관리자 대시보드 및 키오스크에서 3초마다 상태를 갱신합니다.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">체크아웃 확인</span>
                <select
                  value={settings?.checkoutConfirmRequired ? 'ON' : 'OFF'}
                  onChange={(event) =>
                    handleUpdatePolicy({ checkoutConfirmRequired: event.target.value === 'ON' })
                  }
                  className="px-3 py-1.5 rounded-lg text-sm border border-gray-300"
                >
                  <option value="ON">확인 필요</option>
                  <option value="OFF">자동 처리</option>
                </select>
              </div>
              <p className="text-sm text-gray-500">
                자동 처리로 설정하면 번호 입력 후 확인 없이 바로 종료됩니다.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">스캔 모드</span>
                <select
                  value={settings?.scanMode ?? 'AUTO'}
                  onChange={(event) =>
                    handleUpdatePolicy({
                      scanMode: event.target.value as AppSettings['scanMode'],
                    })
                  }
                  className="px-3 py-1.5 rounded-lg text-sm border border-gray-300"
                >
                  <option value="AUTO">웹캠 + HID</option>
                  <option value="HID_ONLY">HID 전용</option>
                  <option value="WEB_ONLY">웹캠 전용</option>
                </select>
              </div>
              <p className="text-sm text-gray-500">
                HID 전용 모드는 키보드 입력형 스캐너만 사용합니다.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">QR 코드 포맷</span>
                <select
                  value={settings?.qrFormat ?? 'LEGACY'}
                  onChange={(event) =>
                    handleUpdatePolicy({ qrFormat: event.target.value as 'LEGACY' | 'APP1' })
                  }
                  className="px-3 py-1.5 rounded-lg text-sm border border-gray-300"
                >
                  <option value="LEGACY">SEAT:A1 / LOCKER:001</option>
                  <option value="APP1">APP1|TYPE|ID|v1</option>
                </select>
              </div>
              <p className="text-sm text-gray-500">
                QR 라벨 출력에 적용됩니다. 스캔은 두 포맷 모두 인식합니다.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">관리자 비밀번호</span>
                <div className="flex gap-2 items-center">
                  <input
                    type="password"
                    value={adminPasscodeDraft}
                    onChange={(event) => setAdminPasscodeDraft(event.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="4~8자리"
                    className="w-28 px-3 py-1.5 rounded-lg text-sm border border-gray-300 text-right"
                  />
                  <button
                    onClick={() => {
                      if (!adminPasscodeDraft) return;
                      handleUpdatePolicy({ adminPasscode: adminPasscodeDraft });
                      setAdminPasscodeDraft('');
                    }}
                    className="px-3 py-1.5 rounded-lg text-sm bg-gray-900 text-white hover:bg-gray-800"
                  >
                    변경
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                관리자 전환 시 입력하는 비밀번호입니다.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">로그 보관 기간</span>
                <input
                  type="number"
                  min={0}
                  value={settings?.logRetentionDays ?? 0}
                  onChange={(event) =>
                    handleUpdatePolicy({ logRetentionDays: Number(event.target.value) })
                  }
                  className="w-24 px-3 py-1.5 rounded-lg text-sm border border-gray-300 text-right"
                />
              </div>
              <p className="text-sm text-gray-500">
                0으로 설정하면 자동 삭제를 비활성화합니다.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">락커 연동</span>
                <span className="text-blue-600">선택적</span>
              </div>
              <p className="text-sm text-gray-500">
                락커를 좌석 세션에 연결하여 함께 관리할 수 있습니다.
              </p>
            </div>
            {policyError && <div className="text-sm text-red-600">{policyError}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Providers>
      <SettingsContent />
    </Providers>
  );
}
