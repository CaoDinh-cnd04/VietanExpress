import type { Publication } from '../api';
import type { MyTrackingConfig } from '../schema';
export interface ConfigLoadResult { config: MyTrackingConfig; warning?: string; publication?: Publication }
export interface ConfigSaveResult { persistent: boolean; warning?: string; publication?: Publication }
export interface ConfigRepository {
  load(userId: string): Promise<ConfigLoadResult>;
  /** `publication` chỉ dùng khi lưu lên server (đường dẫn + xuất bản); bản lưu trình duyệt bỏ qua. */
  save(userId: string, config: MyTrackingConfig, publication?: Publication): Promise<ConfigSaveResult>;
}
