'use strict';

export class IndexedDB {
  utils: Utils;
  dbWrapper: DbWrapper;

  constructor(dbName: string, version: number) {
    this.utils = new Utils();
    this.dbWrapper = new DbWrapper(dbName, version);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  openDatabase(
    version: number,
    upgradeCallback?: (evt: any, db: IDBDatabase) => void
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Promise<any>((resolve, reject) => {
      this.dbWrapper.dbVersion = version;
      const request = this.utils.indexedDB.open(this.dbWrapper.dbName, version);
      request.onsuccess = (e) => {
        this.dbWrapper.db = request.result;
        resolve(e);
      };

      request.onerror = function (e) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reject('IndexedDB error: ' + (<any>e.target).errorCode);
      };

      if (typeof upgradeCallback === 'function') {
        request.onupgradeneeded = (e) => {
          upgradeCallback(e, this.dbWrapper.db);
        };
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getByKey(storeName: string, key: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Promise<any>((resolve, reject) => {
      this.dbWrapper.validateBeforeTransaction(storeName, reject);

      const transaction = this.dbWrapper.createTransaction({
        storeName: storeName,
        dbMode: 'readonly',
        error: (e: Event) => {
          reject(e);
        },
        complete: () => {
          /* */
        }
      });

      const objectStore = transaction.objectStore(storeName);
      const request: IDBRequest = objectStore.get(key);
      request.onsuccess = (event: Event) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolve((<any>event.target).result);
      };
    });
  }

  getAll(
    storeName: string,
    keyRange?: IDBKeyRange,
    indexDetails?: IndexDetails
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Promise<any>((resolve, reject) => {
      this.dbWrapper.validateBeforeTransaction(storeName, reject);

      const transaction = this.dbWrapper.createTransaction({
        storeName: storeName,
        dbMode: 'readonly',
        error: (e: Event) => {
          reject(e);
        },
        complete: () => {
          /* */
        }
      });
      const objectStore = transaction.objectStore(storeName);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: Array<any> = [];
      let request: IDBRequest;

      if (indexDetails) {
        const index = objectStore.index(indexDetails.indexName),
          order = indexDetails.order === 'desc' ? 'prev' : 'next';
        request = index.openCursor(keyRange, <IDBCursorDirection>order);
      } else {
        request = objectStore.openCursor(keyRange);
      }

      request.onerror = (e) => {
        reject(e);
      };

      request.onsuccess = function (evt: Event) {
        const cursor = (<IDBOpenDBRequest>evt.target).result;
        if (cursor) {
          result.push(cursor['value']);
          cursor['continue']();
        } else {
          resolve(result);
        }
      };
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  add(storeName: string, value: any, key?: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Promise<any>((resolve, reject) => {
      this.dbWrapper.validateBeforeTransaction(storeName, reject);

      const transaction = this.dbWrapper.createTransaction({
        storeName: storeName,
        dbMode: 'readwrite',
        error: (e: Event) => {
          reject(e);
        },
        complete: () => {
          resolve({ key: key, value: value });
        }
      });
      const objectStore = transaction.objectStore(storeName);

      const request = objectStore.add(value, key);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      request.onsuccess = (evt: any) => {
        key = evt.target.result;
      };
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update(storeName: string, value: any, key?: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Promise<any>((resolve, reject) => {
      this.dbWrapper.validateBeforeTransaction(storeName, reject);

      const transaction = this.dbWrapper.createTransaction({
        storeName: storeName,
        dbMode: 'readwrite',
        error: (e: Event) => {
          reject(e);
        },
        complete: () => {
          resolve(value);
        },
        abort: (e: Event) => {
          reject(e);
        }
      });
      const objectStore = transaction.objectStore(storeName);

      objectStore.put(value, key);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete(storeName: string, key: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Promise<any>((resolve, reject) => {
      this.dbWrapper.validateBeforeTransaction(storeName, reject);

      const transaction = this.dbWrapper.createTransaction({
        storeName: storeName,
        dbMode: 'readwrite',
        error: (e: Event) => {
          reject(e);
        },
        complete: (e: Event) => {
          resolve(e);
        },
        abort: (e: Event) => {
          reject(e);
        }
      });
      const objectStore = transaction.objectStore(storeName);

      objectStore['delete'](key);
    });
  }

  openCursor(
    storeName: string,
    cursorCallback: (evt: Event) => void,
    keyRange?: IDBKeyRange
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Promise<any>((resolve, reject) => {
      this.dbWrapper.validateBeforeTransaction(storeName, reject);

      const transaction = this.dbWrapper.createTransaction({
        storeName: storeName,
        dbMode: 'readonly',
        error: (e: Event) => {
          reject(e);
        },
        complete: (e: Event) => {
          resolve(e);
        },
        abort: (e: Event) => {
          reject(e);
        }
      });
      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.openCursor(keyRange);

      request.onsuccess = (evt: Event) => {
        cursorCallback(evt);
        resolve(evt);
      };
    });
  }

  clear(storeName: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Promise<any>((resolve, reject) => {
      this.dbWrapper.validateBeforeTransaction(storeName, reject);

      const transaction = this.dbWrapper.createTransaction({
        storeName: storeName,
        dbMode: 'readwrite',
        error: (e: Event) => {
          reject(e);
        },
        complete: (e: Event) => {
          resolve(e);
        },
        abort: (e: Event) => {
          reject(e);
        }
      });
      const objectStore = transaction.objectStore(storeName);
      objectStore.clear();
      resolve(null);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getByIndex(storeName: string, indexName: string, key: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Promise<any>((resolve, reject) => {
      this.dbWrapper.validateBeforeTransaction(storeName, reject);

      const transaction = this.dbWrapper.createTransaction({
        storeName: storeName,
        dbMode: 'readonly',
        error: (e: Event) => {
          reject(e);
        },
        abort: (e: Event) => {
          reject(e);
        },
        complete: () => {
          /* */
        }
      });
      const objectStore = transaction.objectStore(storeName);
      const index = objectStore.index(indexName);
      const request = index.get(key);

      request.onsuccess = (event) => {
        resolve((<IDBOpenDBRequest>event.target).result);
      };
    });
  }
}

export class Utils {
  indexedDB: IDBFactory;

  constructor() {
    this.indexedDB =
      window.indexedDB ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (<any>window).mozIndexedDB ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (<any>window).webkitIndexedDB ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (<any>window).msIndexedDB;
  }
}

export interface IndexDetails {
  indexName: string;
  order: string;
}

export class DbWrapper {
  dbName: string;
  dbVersion: number;
  db: IDBDatabase;

  constructor(dbName: string, version: number) {
    this.dbName = dbName;
    this.dbVersion = version || 1;
    this.db = null;
  }

  validateStoreName(storeName: string) {
    return this.db.objectStoreNames.contains(storeName);
  }

  validateBeforeTransaction(storeName: string, reject: (e: string) => void) {
    if (!this.db) {
      reject(
        'You need to use the createStore function to create a database before you query it!'
      );
    }
    if (!this.validateStoreName(storeName)) {
      reject('objectStore does not exists: ' + storeName);
    }
  }

  createTransaction(options: {
    storeName: string;
    dbMode: IDBTransactionMode;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: (e: Event) => any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    complete: (e: Event) => any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    abort?: (e: Event) => any;
  }): IDBTransaction {
    const trans: IDBTransaction = this.db.transaction(
      options.storeName,
      options.dbMode
    );
    trans.onerror = options.error;
    trans.oncomplete = options.complete;
    trans.onabort = options.abort;
    return trans;
  }
}
