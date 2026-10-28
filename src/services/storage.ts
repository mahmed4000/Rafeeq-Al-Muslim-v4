import { Platform } from 'react-native';

// In-memory fallback dictionary
const memoryStore = new Map<string, string>();

let nativeAsyncStorage: any = null;
try {
  // Dynamically attempt to load @react-native-async-storage/async-storage
  nativeAsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  nativeAsyncStorage = null;
}

export const StorageService = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS !== 'web' && nativeAsyncStorage) {
        return await nativeAsyncStorage.getItem(key);
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return memoryStore.get(key) ?? null;
    } catch (e) {
      console.warn(`StorageService.getItem error for key [${key}]:`, e);
      return memoryStore.get(key) ?? null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      memoryStore.set(key, value);
      if (Platform.OS !== 'web' && nativeAsyncStorage) {
        await nativeAsyncStorage.setItem(key, value);
        return;
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      console.warn(`StorageService.setItem error for key [${key}]:`, e);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      memoryStore.delete(key);
      if (Platform.OS !== 'web' && nativeAsyncStorage) {
        await nativeAsyncStorage.removeItem(key);
        return;
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch (e) {
      console.warn(`StorageService.removeItem error for key [${key}]:`, e);
    }
  },

  async getObject<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const raw = await this.getItem(key);
      if (!raw) return defaultValue;
      return JSON.parse(raw) as T;
    } catch (e) {
      return defaultValue;
    }
  },

  async setObject(key: string, value: any): Promise<void> {
    try {
      await this.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`StorageService.setObject error for key [${key}]:`, e);
    }
  }
};
