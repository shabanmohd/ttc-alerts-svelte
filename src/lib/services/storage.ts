/**
 * IndexedDB Storage Service
 * Provides robust local storage for stops, routes, and preferences
 * No cloud sync - all data stored locally with Export/Import for backup
 */

const DB_NAME = 'ttc-alerts-db';
const DB_VERSION = 1;

// Store names
const STORES = {
  STOPS: 'savedStops',
  ROUTES: 'savedRoutes',
  PREFERENCES: 'preferences'
} as const;

// Types
export interface SavedStop {
  id: string;
  name: string;
  routes: string[];
  savedAt: number;
}

export interface SavedRoute {
  id: string;
  name: string;
  type: 'bus' | 'streetcar' | 'subway';
  savedAt: number;
}

export interface UserPreferences {
  language: 'en' | 'fr';
  theme: 'light' | 'dark' | 'system';
  textSize: 'default' | 'large' | 'extra-large';
  reduceMotion: boolean;
}

export interface ExportData {
  version: 1;
  exportedAt: string;
  stops: SavedStop[];
  routes: SavedRoute[];
  preferences: UserPreferences;
}

// Default preferences
export const DEFAULT_PREFERENCES: UserPreferences = {
  language: 'en',
  theme: 'system',
  textSize: 'default',
  reduceMotion: false
};

// Database instance
let dbInstance: IDBDatabase | null = null;

/**
 * Initialize IndexedDB connection
 */
async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.STOPS)) {
        db.createObjectStore(STORES.STOPS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.ROUTES)) {
        db.createObjectStore(STORES.ROUTES, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.PREFERENCES)) {
        db.createObjectStore(STORES.PREFERENCES, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Generic IndexedDB operations
 */
async function dbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

async function dbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

async function dbPut<T>(storeName: string, value: T): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(value);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function dbDelete(storeName: string, key: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function dbClear(storeName: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saved Stops Storage
 */
export const stopsStorage = {
  async getAll(): Promise<SavedStop[]> {
    try {
      return await dbGetAll<SavedStop>(STORES.STOPS);
    } catch (error) {
      console.error('Failed to get stops:', error);
      return [];
    }
  },

  async get(id: string): Promise<SavedStop | undefined> {
    try {
      return await dbGet<SavedStop>(STORES.STOPS, id);
    } catch (error) {
      console.error('Failed to get stop:', error);
      return undefined;
    }
  },

  async save(stop: Omit<SavedStop, 'savedAt'>): Promise<void> {
    try {
      await dbPut(STORES.STOPS, {
        ...stop,
        savedAt: Date.now()
      });
    } catch (error) {
      console.error('Failed to save stop:', error);
      throw error;
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await dbDelete(STORES.STOPS, id);
    } catch (error) {
      console.error('Failed to remove stop:', error);
      throw error;
    }
  },

  async clear(): Promise<void> {
    try {
      await dbClear(STORES.STOPS);
    } catch (error) {
      console.error('Failed to clear stops:', error);
      throw error;
    }
  },

  async has(id: string): Promise<boolean> {
    const stop = await this.get(id);
    return stop !== undefined;
  }
};

/**
 * Saved Routes Storage
 */
export const routesStorage = {
  async getAll(): Promise<SavedRoute[]> {
    try {
      return await dbGetAll<SavedRoute>(STORES.ROUTES);
    } catch (error) {
      console.error('Failed to get routes:', error);
      return [];
    }
  },

  async get(id: string): Promise<SavedRoute | undefined> {
    try {
      return await dbGet<SavedRoute>(STORES.ROUTES, id);
    } catch (error) {
      console.error('Failed to get route:', error);
      return undefined;
    }
  },

  async save(route: Omit<SavedRoute, 'savedAt'>): Promise<void> {
    try {
      await dbPut(STORES.ROUTES, {
        ...route,
        savedAt: Date.now()
      });
    } catch (error) {
      console.error('Failed to save route:', error);
      throw error;
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await dbDelete(STORES.ROUTES, id);
    } catch (error) {
      console.error('Failed to remove route:', error);
      throw error;
    }
  },

  async clear(): Promise<void> {
    try {
      await dbClear(STORES.ROUTES);
    } catch (error) {
      console.error('Failed to clear routes:', error);
      throw error;
    }
  },

  async has(id: string): Promise<boolean> {
    const route = await this.get(id);
    return route !== undefined;
  }
};

/**
 * Preferences Storage
 */
export const preferencesStorage = {
  async get(): Promise<UserPreferences> {
    try {
      const stored = await dbGet<{ key: string; value: UserPreferences }>(
        STORES.PREFERENCES,
        'userPreferences'
      );
      return stored?.value ?? DEFAULT_PREFERENCES;
    } catch (error) {
      console.error('Failed to get preferences:', error);
      return DEFAULT_PREFERENCES;
    }
  },

  async save(preferences: UserPreferences): Promise<void> {
    try {
      await dbPut(STORES.PREFERENCES, {
        key: 'userPreferences',
        value: preferences
      });
    } catch (error) {
      console.error('Failed to save preferences:', error);
      throw error;
    }
  },

  async update(partial: Partial<UserPreferences>): Promise<UserPreferences> {
    const current = await this.get();
    const updated = { ...current, ...partial };
    await this.save(updated);
    return updated;
  },

  async reset(): Promise<void> {
    await this.save(DEFAULT_PREFERENCES);
  }
};

/**
 * Export all data to JSON
 */
export async function exportAllData(): Promise<ExportData> {
  const [stops, routes, preferences] = await Promise.all([
    stopsStorage.getAll(),
    routesStorage.getAll(),
    preferencesStorage.get()
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    stops,
    routes,
    preferences
  };
}

/**
 * Import data from JSON
 */
export async function importAllData(data: ExportData): Promise<{ 
  success: boolean; 
  imported: { stops: number; routes: number; preferences: boolean } 
}> {
  try {
    // Validate data structure
    if (data.version !== 1) {
      throw new Error('Unsupported export version');
    }

    // Clear existing data
    await Promise.all([
      stopsStorage.clear(),
      routesStorage.clear()
    ]);

    // Import stops
    for (const stop of data.stops) {
      await stopsStorage.save(stop);
    }

    // Import routes
    for (const route of data.routes) {
      await routesStorage.save(route);
    }

    // Import preferences
    await preferencesStorage.save(data.preferences);

    return {
      success: true,
      imported: {
        stops: data.stops.length,
        routes: data.routes.length,
        preferences: true
      }
    };
  } catch (error) {
    console.error('Failed to import data:', error);
    return {
      success: false,
      imported: { stops: 0, routes: 0, preferences: false }
    };
  }
}

/**
 * Migrate from old localStorage-based storage
 */
export async function migrateFromLocalStorage(): Promise<boolean> {
  try {
    // Check if migration already done
    const migrationKey = 'ttc-storage-migrated';
    if (localStorage.getItem(migrationKey)) {
      return false;
    }

    // Try to migrate bookmarked stops from old format
    const oldBookmarks = localStorage.getItem('ttc-bookmarked-stops');
    if (oldBookmarks) {
      try {
        const parsed = JSON.parse(oldBookmarks);
        if (Array.isArray(parsed)) {
          for (const stop of parsed) {
            if (stop.stopId && stop.stopName) {
              await stopsStorage.save({
                id: stop.stopId,
                name: stop.stopName,
                routes: stop.routes || []
              });
            }
          }
        }
      } catch (e) {
        console.warn('Failed to parse old bookmarks:', e);
      }
    }

    // Try to migrate preferences from old format
    const oldLanguage = localStorage.getItem('ttc-language');
    const oldTheme = localStorage.getItem('ttc-theme');
    const oldTextSize = localStorage.getItem('ttc-text-size');
    const oldReduceMotion = localStorage.getItem('ttc-reduce-motion');

    if (oldLanguage || oldTheme || oldTextSize || oldReduceMotion) {
      await preferencesStorage.update({
        ...(oldLanguage && { language: oldLanguage as 'en' | 'fr' }),
        ...(oldTheme && { theme: oldTheme as 'light' | 'dark' | 'system' }),
        ...(oldTextSize && { textSize: oldTextSize as 'default' | 'large' | 'extra-large' }),
        ...(oldReduceMotion && { reduceMotion: oldReduceMotion === 'true' })
      });
    }

    // Mark migration as complete
    localStorage.setItem(migrationKey, 'true');

    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}

/**
 * Request persistent storage using the modern Storage API
 * This helps ensure IndexedDB data survives browser storage pressure
 */
async function requestPersistentStorage(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return;
  }

  try {
    const isPersisted = await navigator.storage.persisted();
    if (!isPersisted) {
      const granted = await navigator.storage.persist();
      console.log(`Persistent storage ${granted ? 'granted' : 'denied'}`);
    }
  } catch (error) {
    // Silently fail - persistent storage is a nice-to-have
    console.debug('Persistent storage request failed:', error);
  }
}

/**
 * Initialize storage - call on app startup
 */
export async function initializeStorage(): Promise<void> {
  try {
    // Request persistent storage (modern API, replaces deprecated StorageType.persistent)
    await requestPersistentStorage();
    
    // Ensure DB is ready
    await getDB();
    
    // Run migration from old localStorage if needed
    await migrateFromLocalStorage();
    
    console.log('Storage initialized successfully');
  } catch (error) {
    console.error('Failed to initialize storage:', error);
  }
}
