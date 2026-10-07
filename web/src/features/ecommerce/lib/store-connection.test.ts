import { describe, expect, it } from 'vitest';
import type { StoreConnection } from '../types';
import { needsReauthorize, normalizeShopifyDomain, readOAuthResult, resolveEcomTab, resolveShopifyLaunch, formatSyncTime } from './store-connection';

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

describe('resolveShopifyLaunch', () => {
  const store = (shopDomain: string, status: StoreConnection['status']): StoreConnection =>
    ({ id: '1', platform: 'shopify', shopName: shopDomain, shopDomain, status, connectedAt: '2026-10-07T10:00:00+07:00' });
  const launch = (q: string) => new URLSearchParams(q);

  it('chưa kết nối hoặc cần ủy quyền lại → tự kết nối shop Shopify gửi tới', () => {
    expect(resolveShopifyLaunch(launch('shop=a.myshopify.com&hmac=x&timestamp=1'), [])).toEqual({ kind: 'connect', shop: 'a.myshopify.com' });
    expect(resolveShopifyLaunch(launch('shop=a.myshopify.com&hmac=x'), [store('a.myshopify.com', 'revoked')]))
      .toEqual({ kind: 'connect', shop: 'a.myshopify.com' });
    expect(resolveShopifyLaunch(launch('shop=a.myshopify.com&hmac=x'), [store('b.myshopify.com', 'active')]))
      .toEqual({ kind: 'connect', shop: 'a.myshopify.com' });
  });

  it('shop đã kết nối còn hoạt động → vào thẳng đơn hàng', () => {
    expect(resolveShopifyLaunch(launch('shop=a.myshopify.com&hmac=x'), [store('a.myshopify.com', 'active')])).toEqual({ kind: 'connected' });
  });

  it('thiếu hmac hoặc shop sai dạng → không tự kết nối', () => {
    expect(resolveShopifyLaunch(launch('shop=a.myshopify.com'), [])).toEqual({ kind: 'invalid' });
    expect(resolveShopifyLaunch(launch('shop=evil.example.com&hmac=x'), [])).toEqual({ kind: 'invalid' });
    expect(resolveShopifyLaunch(launch(''), [])).toEqual({ kind: 'invalid' });
  });
});
