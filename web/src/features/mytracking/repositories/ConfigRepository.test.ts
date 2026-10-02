import { describe, expect, it } from 'vitest';
import { emptyConfig } from '../schema';
import { LocalStorageConfigRepository, storageKey } from './LocalStorageConfigRepository';
import { ApiConfigRepository } from './ApiConfigRepository';
describe('ConfigRepository', () => {
  it('lưu riêng từng tài khoản và khôi phục sau khi tạo repository mới', async () => {
    const data = new Map<string, string>();
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
    const repository = new LocalStorageConfigRepository(() => storage);
    await repository.save('A', { ...emptyConfig(), title: 'Shop A' });
    await repository.save('B', { ...emptyConfig(), title: 'Shop B' });
    expect(data.has(storageKey('A'))).toBe(true);
    const reloaded = new LocalStorageConfigRepository(() => storage);
    expect((await reloaded.load('A')).config.title).toBe('Shop A');
    expect((await reloaded.load('B')).config.title).toBe('Shop B');
  });
  it('storage bị chặn vẫn lưu và đọc bản trong bộ nhớ, không lẫn tài khoản', async () => {
    const repository = new LocalStorageConfigRepository(() => { throw new Error('blocked'); });
    expect((await repository.load('A')).warning).toBeTruthy();
    const config = { ...emptyConfig(), title: 'Unsaved shop' };
    expect((await repository.save('A', config)).persistent).toBe(false);
    expect((await repository.load('A')).config.title).toBe('Unsaved shop');
    expect((await repository.load('B')).config.title).toBe(emptyConfig().title);
  });
  it('storage đầy giữ cấu hình trong bộ nhớ và không sửa bản lưu cũ', async () => {
    const repository = new LocalStorageConfigRepository(() => ({ getItem: () => null, setItem: () => { throw new Error('quota'); } }));
    const config = emptyConfig(); config.images = [{ id: 'a', src: 'https://example.com/image.png', linkUrl: '' }];
    expect((await repository.save('A', config)).warning).toBeTruthy();
    config.images[0]!.linkUrl = 'https://changed.example.com';
    expect((await repository.load('A')).config.images[0]?.linkUrl).toBe('');
  });
  it('đọc cấu hình cũ và chịu được JSON lỗi', async () => {
    const old = { title: 'Old shop', description: '', images: [], background: '' };
    const repository = new LocalStorageConfigRepository(() => ({ getItem: key => key === 'va.mytracking.A' ? JSON.stringify(old) : null, setItem: () => undefined }));
    expect((await repository.load('A')).config.title).toBe('Old shop');
    const broken = new LocalStorageConfigRepository(() => ({ getItem: () => '{bad', setItem: () => undefined }));
    expect((await broken.load('A')).config).toEqual(emptyConfig());
  });
  it('adapter API chỉ gọi transport được truyền vào khi sử dụng', async () => {
    const calls: string[] = [];
    const repo = new ApiConfigRepository({ load: async user => { calls.push(user); return emptyConfig(); }, save: async user => { calls.push(user); } });
    expect(calls).toEqual([]); await repo.load('A'); await repo.save('A', emptyConfig()); expect(calls).toEqual(['A', 'A']);
  });
});
