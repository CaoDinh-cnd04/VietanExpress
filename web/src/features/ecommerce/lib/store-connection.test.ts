import { describe, expect, it } from 'vitest';
import { needsReauthorize, shopifyAppStoreUrl, readOAuthResult, resolveEcomTab, reconnectAction, formatSyncTime } from './store-connection';

describe('needsReauthorize', () => {
  it('chỉ expired / revoked cần ủy quyền lại', () => {
    expect(needsReauthorize({ status: 'expired' })).toBe(true);
    expect(needsReauthorize({ status: 'revoked' })).toBe(true);
    expect(needsReauthorize({ status: 'active' })).toBe(false);
    expect(needsReauthorize({ status: 'error' })).toBe(false);
  });
});

describe('readOAuthResult', () => {
  it('đọc kết quả redirect', () => {
    expect(readOAuthResult(new URLSearchParams('tab=connect&connected=shopify'))).toEqual({ ok: true, platform: 'shopify' });
    expect(readOAuthResult(new URLSearchParams('tab=connect&error=Shop từ chối'))).toEqual({ ok: false, error: 'Shop từ chối' });
    expect(readOAuthResult(new URLSearchParams('tab=connect'))).toBeNull();
  });
});

describe('resolveEcomTab', () => {
  it('giữ tab hợp lệ, đổi tab cũ sang tab mới, mặc định là đơn hàng', () => {
    expect(resolveEcomTab('add')).toBe('add');
    expect(resolveEcomTab('mine')).toBe('orders'); // trang chuyển hướng ?tab=mine sang /ecommerce/orders
    expect(resolveEcomTab('conn')).toBe('connect');
    expect(resolveEcomTab('stores')).toBe('connect');
    expect(resolveEcomTab('push')).toBe('add');
    expect(resolveEcomTab('overview')).toBe('orders');
    expect(resolveEcomTab('khac')).toBe('orders');
    expect(resolveEcomTab(null)).toBe('orders');
  });
});

describe('formatSyncTime', () => {
  it('lấy ngày giờ theo múi giờ backend gửi', () => {
    expect(formatSyncTime('2026-10-05T14:54:25.6+07:00')).toBe('05/10/2026 14:54');
    expect(formatSyncTime('khác')).toBe('khác');
  });
});

describe('reconnectAction', () => {
  it('Shopify đã gỡ app → cài lại từ Shopify; hết hạn hoặc TikTok → ủy quyền lại; đang chạy → không cần', () => {
    expect(reconnectAction({ platform: 'shopify', status: 'revoked' })).toBe('reinstall');
    expect(reconnectAction({ platform: 'shopify', status: 'expired' })).toBe('reauthorize');
    expect(reconnectAction({ platform: 'tiktok', status: 'revoked' })).toBe('reauthorize');
    expect(reconnectAction({ platform: 'shopify', status: 'active' })).toBeNull();
    expect(reconnectAction({ platform: 'shopify', status: 'error' })).toBeNull();
  });
});

describe('shopifyAppStoreUrl', () => {
  it('nhận link trang app trên Shopify App Store', () => {
    expect(shopifyAppStoreUrl('https://apps.shopify.com/viet-an-express')).toBe('https://apps.shopify.com/viet-an-express');
    expect(shopifyAppStoreUrl(' https://apps.shopify.com/Viet-An-Express/ ')).toBe('https://apps.shopify.com/viet-an-express/');
  });

  it('chưa cấu hình hoặc link lạ → không hiện nút', () => {
    expect(shopifyAppStoreUrl(undefined)).toBeNull();
    expect(shopifyAppStoreUrl('')).toBeNull();
    expect(shopifyAppStoreUrl('http://apps.shopify.com/viet-an-express')).toBeNull();
    expect(shopifyAppStoreUrl('https://apps.shopify.com.evil.com/viet-an-express')).toBeNull();
    expect(shopifyAppStoreUrl('https://example.com/viet-an-express')).toBeNull();
  });
});
