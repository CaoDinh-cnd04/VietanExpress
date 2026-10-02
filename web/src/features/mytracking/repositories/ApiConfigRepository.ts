import { myTrackingSchema, type MyTrackingConfig } from '../schema';
import type { ConfigLoadResult, ConfigRepository, ConfigSaveResult } from './ConfigRepository';
/** Adapter cho API sau này. Chưa đăng ký trong ứng dụng và không tự gọi mạng. */
export interface ConfigApi { load(userId: string): Promise<unknown>; save(userId: string, config: MyTrackingConfig): Promise<void> }
export class ApiConfigRepository implements ConfigRepository {
  constructor(private readonly api: ConfigApi) {}
  async load(userId: string): Promise<ConfigLoadResult> { return { config: myTrackingSchema.parse(await this.api.load(userId)) }; }
  async save(userId: string, config: MyTrackingConfig): Promise<ConfigSaveResult> {
    await this.api.save(userId, myTrackingSchema.parse(config));
    return { persistent: true };
  }
}
