﻿///// <reference path="Microsoft.JSInterop.d.ts"/>
import { openDB, deleteDB, IDBPDatabase, IDBPObjectStore } from 'idb';
import { IDatabase, IObjectStore, IIndex } from './InteropInterfaces';

const E_DB_CLOSED: string = "Database is closed";

export class IndexedDbManager {

    private dbInstance?: IDBPDatabase = undefined;

    constructor() { }

    public open = async (database: IDatabase): Promise<void> => {
        var upgradeError = "";

        try {
            if (!this.dbInstance || this.dbInstance.version < database.version) {
                if (this.dbInstance) {
                    this.dbInstance.close();
                    this.dbInstance = undefined;
                }
                this.dbInstance = await openDB(database.name, database.version, {
                    upgrade(db, oldVersion, newVersion, transaction) {
                        try {
                            IndexedDbManager.upgradeDatabase(db, oldVersion, newVersion, database);
                        } catch (error) {
                            upgradeError = error.toString();
                            throw(error);
                        }
                    },
                });
            }
        } catch (error) {
            throw error.toString()+' '+upgradeError;
        }
    }

    public deleteDatabase = async(dbName: string): Promise<void> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            this.dbInstance.close();

            await deleteDB(dbName);

            this.dbInstance = undefined;
        } catch (error) {
            throw `Database ${dbName}, ${error.toString()}`;
        }
    }

    public getDbSchema = async (dbName: string) : Promise<IDatabase> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            const dbInstance = this.dbInstance;

            const dbInfo: IDatabase = {
                name: dbInstance.name,
                version: dbInstance.version,
                objectStores: []
            }

            for (let s = 0; s < dbInstance.objectStoreNames.length; s++) {
                let dbStore = dbInstance.transaction(dbInstance.objectStoreNames[s], 'readonly').store;
                let objectStore: IObjectStore = {
                    name: dbStore.name,
                    keyPath: Array.isArray(dbStore.keyPath) ? dbStore.keyPath.join(',') : dbStore.keyPath,
                    autoIncrement: dbStore.autoIncrement,
                    indexes: []
                }
                for (let i = 0; i < dbStore.indexNames.length; i++) {
                    const dbIndex = dbStore.index(dbStore.indexNames[i]);
                    let index: IIndex = {
                        name: dbIndex.name,
                        keyPath: Array.isArray(dbIndex.keyPath) ? dbIndex.keyPath.join(',') : dbIndex.keyPath,
                        multiEntry: dbIndex.multiEntry,
                        unique: dbIndex.unique
                    }
                    objectStore.indexes.push(index);
                }
                dbInfo.objectStores.push(objectStore);
            }

            return dbInfo;
        } catch (error) {
            throw `Database ${dbName}, ${error.toString()}`;
        }
    }

    // IDBObjectStore
    public count = async (storeName: string, key?: any): Promise<number> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            const tx = this.dbInstance.transaction(storeName, 'readonly');

            let result = await tx.store.count(key ?? undefined);

            await tx.done;

            return result;
        } catch (error) {
            throw `Store ${storeName}, ${error.toString()}`;
        }
    }

    public countByKeyRange = async (storeName: string, lower: any, upper: any, lowerOpen: boolean, upperOpen: boolean): Promise<number> => {
        try {
            return await this.count(storeName, IDBKeyRange.bound(lower, upper, lowerOpen, upperOpen));
        } catch (error) {
            throw `Store ${storeName}, ${error.toString()}`;
        }
    }

    public get = async (storeName: string, key: any): Promise<any> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            const tx = this.dbInstance.transaction(storeName, 'readonly');

            let result = await tx.store.get(key);

            await tx.done;

            return result;
        } catch (error) {
            throw `Store ${storeName}, ${error.toString()}`;
        }
    }

    public getAll = async (storeName: string, key?: any, count?: number): Promise<any> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            const tx = this.dbInstance.transaction(storeName, 'readonly');

            let results = await tx.store.getAll(key ?? undefined, count ?? undefined);

            await tx.done;

            return results;
        } catch (error) {
            throw `Store ${storeName}, ${error.toString()}`;
        }
    }

    public getAllByKeyRange = async (storeName: string, lower: any, upper: any, lowerOpen: boolean, upperOpen: boolean, count?: number): Promise<any> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            return await this.getAll(storeName, IDBKeyRange.bound(lower, upper, lowerOpen, upperOpen), count);
        } catch (error) {
            throw `Store ${storeName}, ${error.toString()}`;
        }
    }

    public getAllByArrayKey = async (storeName: string, key: any[]): Promise<any> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            const tx = this.dbInstance.transaction(storeName, 'readonly');

            let results: any[] = [];

            for (let index = 0; index < key.length; index++) {
                const element = key[index];
                results = results.concat(await tx.store.getAll(element));
            }

            await tx.done;

            return results;
        } catch (error) {
            throw `Store ${storeName}, ${error.toString()}`;
        }
    }

    public getKey = async (storeName: string, key: any): Promise<any> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            const tx = this.dbInstance.transaction(storeName, 'readonly');

            let result = await tx.store.getKey(key);

            await tx.done;

            return result;
        } catch (error) {
            throw `Store ${storeName}, ${error.toString()}`;
        }
    }

    public getAllKeys = async (storeName: string, key?: any, count?: number): Promise<any> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            const tx = this.dbInstance.transaction(storeName, 'readonly');

            let results = await tx.store.getAllKeys(key ?? undefined, count ?? undefined);

            await tx.done;

            return results;
        } catch (error) {
            throw `Store ${storeName}, ${error.toString()}`;
        }
    }

    public getAllKeysByKeyRange = async (storeName: string, lower: any, upper: any, lowerOpen: boolean, upperOpen: boolean, count?: number): Promise<any> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            return await this.getAllKeys(storeName, IDBKeyRange.bound(lower, upper, lowerOpen, upperOpen), count);
        } catch (error) {
            throw `Store ${storeName}, ${error.toString()}`;
        }
    }

    public getAllKeysByArrayKey = async (storeName: string, key: any[]): Promise<any> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            const tx = this.dbInstance.transaction(storeName, 'readonly');

            let results: any[] = [];

            for (let index = 0; index < key.length; index++) {
                const element = key[index];
                results = results.concat(await tx.store.getAllKeys(element));
            }

            await tx.done;

            return results;
        } catch (error) {
            throw `Store ${storeName}, ${error.toString()}`;
        }
    }

    public query = async (storeName: string, key: any, filter: string, count: number = 0, skip: number = 0): Promise<any> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            try {
                var func = new Function('obj', filter);
            } catch (error) {
                throw `${error.toString()} in filter { ${filter} }`
            }

            var row = 0;
            var errorMessage = "";

            let results: any[] = [];

            const tx = this.dbInstance.transaction(storeName, 'readonly');

            let cursor = await tx.store.openCursor(key ?? undefined);
            while (cursor) {
                if (!cursor) {
                    return;
                }
                try {
                    var out = func(cursor.value);
                    if (out) {
                        row ++;
                        if (row > skip) {
                            results.push(out);
                        }
                    }
                }
                catch (error) {
                    errorMessage = `obj: ${JSON.stringify(cursor.value)}\nfilter: ${filter}\nerror: ${error.toString()}`;
                    return;
                }
                if (count > 0 && results.length >= count) {
                    return;
                }
                cursor = await cursor.continue();
            }

            await tx.done;

            if (errorMessage) {
                throw errorMessage;
            }

            return results;
        } catch (error) {
            throw `Store ${storeName} ${error.toString()}`;
        }
    }

    // IDBIndex functions
    public countFromIndex = async (storeName: string, indexName: string, key?: any): Promise<number> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            const tx = this.dbInstance.transaction(storeName, 'readonly');

            let result = await tx.store.index(indexName).count(key ?? undefined);

            await tx.done;

            return result;
        } catch (error) {
            throw `Store ${storeName}, Index ${indexName}, ${error.toString()}`;
        }
    }

    public countFromIndexByKeyRange = async (storeName: string, indexName: string, lower: any, upper: any, lowerOpen: boolean, upperOpen: boolean): Promise<number> => {
        try {
            return await this.countFromIndex(storeName, indexName, IDBKeyRange.bound(lower, upper, lowerOpen, upperOpen));
        } catch (error) {
            throw `Store ${storeName}, Index ${indexName}, ${error.toString()}`;
        }
    }

    public getFromIndex = async (storeName: string, indexName: string, key: any): Promise<any> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            const tx = this.dbInstance.transaction(storeName, 'readonly');

            const results = await tx.store.index(indexName).get(key);

            await tx.done;

            return results;
        } catch (error) {
            throw `Store ${storeName}, Index ${indexName}, ${error.toString()}`;
        }
    }

    public getAllFromIndex = async (storeName: string, indexName: string, key?: any, count?: number): Promise<any> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            const tx = this.dbInstance.transaction(storeName, 'readonly');

            const results = await tx.store.index(indexName).getAll(key ?? undefined, count ?? undefined);

            await tx.done;

            return results;
        } catch (error) {
            throw `Store ${storeName}, Index ${indexName}, ${error.toString()}`;
        }
    }

    public getAllFromIndexByKeyRange = async (storeName: string, indexName: string, lower: any, upper: any, lowerOpen: boolean, upperOpen: boolean, count?: number): Promise<any> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            return await this.getAllFromIndex(storeName, indexName, IDBKeyRange.bound(lower, upper, lowerOpen, upperOpen), count);
        } catch (error) {
            throw `Store ${storeName}, Index ${indexName}, ${error.toString()}`;
        }
    }

    public getAllFromIndexByArrayKey = async (storeName: string, indexName: string, key: any[]): Promise<any> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            const tx = this.dbInstance.transaction(storeName, 'readonly');
            const dx = tx.store.index(indexName);

            let results: any[] = [];

            for (let index = 0; index < key.length; index++) {
                const element = key[index];
                results = results.concat(await dx.getAll(element));
            }

            await tx.done;

            return results;
        } catch (error) {
            throw `Store ${storeName}, Index ${indexName}, ${error.toString()}`;
        }
    }

    public getKeyFromIndex = async (storeName: string, indexName: string, key: any): Promise<any> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            const tx = this.dbInstance.transaction(storeName, 'readonly');

            const results = await tx.store.index(indexName).getKey(key);

            await tx.done;

            return results;
        } catch (error) {
            throw `Store ${storeName}, Index ${indexName}, ${error.toString()}`;
        }
    }

    public getAllKeysFromIndex = async (storeName: string, indexName: string, key?: any, count?: number): Promise<any> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            const tx = this.dbInstance.transaction(storeName, 'readonly');

            const results = await tx.store.index(indexName).getAllKeys(key ?? undefined, count ?? undefined);

            await tx.done;

            return results;
        } catch (error) {
            throw `Store ${storeName}, Index ${indexName}, ${error.toString()}`;
        }
    }

    public getAllKeysFromIndexByKeyRange = async (storeName: string, indexName: string, lower: any, upper: any, lowerOpen: boolean, upperOpen: boolean, count?: number): Promise<any> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            return await this.getAllKeysFromIndex(storeName, indexName, IDBKeyRange.bound(lower, upper, lowerOpen, upperOpen), count);
        } catch (error) {
            throw `Store ${storeName}, Index ${indexName}, ${error.toString()}`;
        }
    }

    public getAllKeysFromIndexByArrayKey = async (storeName: string, indexName: string, key: any[]): Promise<any> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            const tx = this.dbInstance.transaction(storeName, 'readonly');
            const dx = tx.store.index(indexName);

            let results: any[] = [];

            for (let index = 0; index < key.length; index++) {
                const element = key[index];
                results = results.concat(await dx.getAllKeys(element));
            }

            await tx.done;

            return results;
        } catch (error) {
            throw `Store ${storeName}, Index ${indexName}, ${error.toString()}`;
        }
    }

    public queryFromIndex = async (storeName: string, indexName: string, key: any, filter: string, count: number = 0, skip: number = 0): Promise<any> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            try {
                var func = new Function('obj', filter);
            } catch (error) {
                throw `${error.toString()} in filter { ${filter} }`
            }

            var row = 0;
            var errorMessage = "";

            let results: any[] = [];

            const tx = this.dbInstance.transaction(storeName, 'readonly');

            let cursor = await tx.store.index(indexName).openCursor(key ?? undefined);
            while (cursor) {
                if (!cursor) {
                    return;
                }
                try {
                    var out = func(cursor.value);
                    if (out) {
                        row ++;
                        if (row > skip) {
                            results.push(out);
                        }
                    }
                }
                catch (error) {
                    errorMessage = `obj: ${JSON.stringify(cursor.value)}\nfilter: ${filter}\nerror: ${error.toString()}`;
                    return;
                }
                if (count > 0 && results.length >= count) {
                    return;
                }
                cursor = await cursor.continue();
            }

            await tx.done;

            if (errorMessage) {
                throw errorMessage;
            }

            return results;
        } catch (error) {
            throw `Store ${storeName}, Index ${indexName}, ${error.toString()}`;
        }
    }

    public add = async (storeName: string, data: any, key?: any): Promise<any> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            const tx = this.dbInstance.transaction(storeName, 'readwrite');

            data = this.checkForKeyPath(tx.store, data);

            const result = await tx.store.add(data, key ?? undefined);

            await tx.done;

            return result;
        } catch (error) {
            throw `Store ${storeName}, ${error.toString()}`;
        }
    }

    public put = async (storeName: string, data: any, key?: any): Promise<any> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            const tx = this.dbInstance.transaction(storeName, 'readwrite');

            const result = await tx.store.put(data, key ?? undefined);

            await tx.done;

            return result;
        } catch (error) {
            throw `Store ${storeName}, ${error.toString()}`;
        }
    }

    public delete = async (storeName: string, id: any): Promise<void> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            const tx = this.dbInstance.transaction(storeName, 'readwrite');

            await tx.store.delete(id);

            await tx.done;
        } catch (error) {
            throw `Store ${storeName}, ${error.toString()}`;
        }
    }

    public batchAdd = async (storeName: string, data: any[]): Promise<any[]> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            const tx = this.dbInstance.transaction(storeName, 'readwrite');

            let result: any[] = [];

            data.forEach(async element => {
                let item = this.checkForKeyPath(tx.store, element);
                result.push(await tx.store.add(item));
            });

            await tx.done;

            return result;
        } catch (error) {
            throw `Store ${storeName}, ${error.toString()}`;
        }
    }

    public batchPut = async (storeName: string, data: any[]): Promise<any[]> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            const tx = this.dbInstance.transaction(storeName, 'readwrite');

            let result: any[] = [];

            data.forEach(async element => {
                result.push(await tx.store.put(element));
            });

            await tx.done;

            return result;
        } catch (error) {
            throw `Store ${storeName}, ${error.toString()}`;
        }
    }

    public batchDelete = async (storeName: string, ids: any[]): Promise<void> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            const tx = this.dbInstance.transaction(storeName, 'readwrite');

            ids.forEach(async element => {
                await tx.store.delete(element);
            });

            await tx.done;
        } catch (error) {
            throw `Store ${storeName}, ${error.toString()}`;
        }
    }

    public clearStore = async (storeName: string): Promise<void> => {
        try {
            if (!this.dbInstance) throw E_DB_CLOSED;

            const tx = this.dbInstance.transaction(storeName, 'readwrite');

            await tx.store.clear();

            await tx.done;
        } catch (error) {
            throw `Store ${storeName}, ${error.toString()}`;
        }
    }

    private checkForKeyPath(objectStore: IDBPObjectStore<any, any>, data: any) {
        if (!objectStore.autoIncrement || !objectStore.keyPath) {
            return data;
        }

        if (typeof objectStore.keyPath !== 'string') {
            return data;
        }

        const keyPath = objectStore.keyPath as string;

        if (!data[keyPath]) {
            delete data[keyPath];
        }
        return data;
    }

    private static upgradeDatabase(upgradeDB: IDBPDatabase, oldVersion: number, newVersion: number | null, dbDatabase: IDatabase) {
        if (newVersion && newVersion > oldVersion) {
            if (dbDatabase.objectStores) {
                for (var store of dbDatabase.objectStores) {
                    if (!upgradeDB.objectStoreNames.contains(store.name)) {
                        this.addNewStore(upgradeDB, store);
                    }
                }
            }
        }
    }

    private static getKeyPath(keyPath?: string): string | string[] | undefined {
        if (keyPath) {
            var multiKeyPath = keyPath.split(',');
            return multiKeyPath.length > 1 ? multiKeyPath : keyPath;
        }
        else {
            return undefined;
        }
    }

    private static addNewStore(upgradeDB: IDBPDatabase, store: IObjectStore) {
        try {

            const newStore = upgradeDB.createObjectStore(store.name,
                {
                    keyPath: this.getKeyPath(store.keyPath),
                    autoIncrement: store.autoIncrement
                }
            );

            for (var index of store.indexes) {
                try {

                    newStore.createIndex(index.name,
                        this.getKeyPath(index.keyPath) ?? index.name,
                        {
                            multiEntry: index.multiEntry,
                            unique: index.unique
                        }
                    );
                } catch (error) {
                    throw `index ${index.name}, ${error.toString()}`;
                }
            }
        }
        catch (error) {
            throw `store ${store.name}, ${error.toString()}`;
        }
    }
}