import { emptyConfig, myTrackingSchema, parseConfig, type MyTrackingConfig } from '../schema';
import type { ConfigLoadResult, ConfigRepository, ConfigSaveResult } from './ConfigRepository';
export interface ConfigStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export const storageKey = (userId: string): string => `mytracking-draft:${userId}`;
const STORAGE_WARNING = 'Không truy cập được bộ nhớ trình duyệt. Cấu hình vẫn được giữ trong phiên này.';
export class LocalStorageConfigRepository implements ConfigRepository {
  private readonly memory = new Map<string, MyTrackingConfig>();
  constructor(private readonly getStorage: () => ConfigStorage = () => window.localStorage) {}
  async load(userId: string): Promise<ConfigLoadResult> {
    const cached = this.memory.get(userId);
    if (cached) return { config: structuredClone(cached) };
    try {
      const storage = this.getStorage();
      const raw = storage.getItem(storageKey(userId)) ?? storage.getItem(`va.mytracking.${userId}`);
      const config = raw ? parseConfig(JSON.parse(raw)) : emptyConfig();
      this.memory.set(userId, config);
      return { config: structuredClone(config) };
    } catch { return { config: emptyConfig(), warning: STORAGE_WARNING }; }
  }
  async save(userId: string, config: MyTrackingConfig): Promise<ConfigSaveResult> {
    const validated = myTrackingSchema.parse(config);
    this.memory.set(userId, structuredClone(validated));
    try {
      this.getStorage().setItem(storageKey(userId), JSON.stringify(validated));
      return { persistent: true };
    } catch { return { persistent: false, warning: 'Không đủ dung lượng lưu hoặc bộ nhớ bị chặn. Bản thử nghiệm vẫn được giữ trong phiên này.' }; }
  }
}
