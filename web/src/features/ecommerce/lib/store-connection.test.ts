import { describe, expect, it } from 'vitest';
import { needsReauthorize, normalizeShopifyDomain, readOAuthResult, resolveEcomTab } from './store-connection';

describe('normalizeShopifyDomain', () => {
  it('nhận tên shop, domain myshopify và link admin', () => {
    expect(normalizeShopifyDomain('My-Shop')).toBe('my-shop.myshopify.com');
    expect(normalizeShopifyDomain(' my-shop.myshopify.com ')).toBe('my-shop.myshopify.com');
    expect(normalizeShopifyDomain('https://my-shop.myshopify.com/admin/orders')).toBe('my-shop.myshopify.com');
    expect(normalizeShopifyDomain('https://admin.shopify.com/store/my-shop/orders')).toBe('my-shop.myshopify.com');
  });

  it('từ chối domain riêng, ký tự lạ và chuỗi rỗng', () => {
    expect(normalizeShopifyDomain('')).toBeNull();
    expect(normalizeShopifyDomain('shop.example.com')).toBeNull();
    expect(normalizeShopifyDomain('my shop')).toBeNull();
    expect(normalizeShopifyDomain('-shop')).toBeNull();
  });
});

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
    expect(resolveEcomTab('conn')).toBe('connect');
    expect(resolveEcomTab('stores')).toBe('connect');
    expect(resolveEcomTab('push')).toBe('add');
    expect(resolveEcomTab('overview')).toBe('orders');
    expect(resolveEcomTab('khac')).toBe('orders');
    expect(resolveEcomTab(null)).toBe('orders');
  });
});
