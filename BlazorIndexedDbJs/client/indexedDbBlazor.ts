﻿///// <reference path="Microsoft.JSInterop.d.ts"/>
import idb from '../node_modules/idb/lib/idb';
import { DB, UpgradeDB, ObjectStore, Transaction } from '../node_modules/idb/lib/idb';
import { IDatabase, IIndexSearch, IIndex, IObjectStore, IInformation } from './InteropInterfaces';

export class IndexedDbManager {

    private dbInstance: any = undefined;

    constructor() { }

    public openDb = async (database: IDatabase): Promise<string> => {
        try {
            if (!this.dbInstance || this.dbInstance.version < database.version) {
                if (this.dbInstance) {
                    this.dbInstance.close();
                }
                this.dbInstance = await idb.open(database.name, database.version, upgradeDB => {
                    this.upgradeDatabase(upgradeDB, database);
                });
            }
        } catch (e) {
            this.dbInstance = await idb.open(database.name);
        }

        return `IndexedDB ${database.name} opened`;
    }

    public deleteDb = async(dbName: string): Promise<string> => {
        this.dbInstance.close();

        await idb.delete(dbName);

        this.dbInstance = undefined;

        return `The database ${dbName} has been deleted`;
    }

    public getDbInfo = async (dbName: string) : Promise<IInformation> => {
        if (!this.dbInstance) {
            this.dbInstance = await idb.open(dbName);
        }

        const currentDb = <DB>this.dbInstance;

        let getStoreNames = (list: DOMStringList): string[] => {
            let names: string[] = [];
            for (var i = 0; i < list.length; i++) {
                names.push(list[i]);
            }
            return names;
        }
        const dbInfo: IInformation = {
            version: currentDb.version,
            objectStoreNames: getStoreNames(currentDb.objectStoreNames)
        };

        return dbInfo;
    }

    public get = async (storename: string, key: any): Promise<any> => {

        const tx = this.getTransaction(this.dbInstance, storename, 'readonly');

        let result = await tx.objectStore(storename).get(key);

        await tx.complete;

        return result;
    }

    public getAll = async (storeName: string, key?: any, count?: number): Promise<any> => {
        const tx = this.getTransaction(this.dbInstance, storeName, 'readonly');

        let results = await tx.objectStore(storeName).getAll(key ?? undefined, count ?? undefined);

        await tx.complete;

        return results;
    }

    public getAllByKeyRange = async (storeName: string, lower: any, upper: any, lowerOpen: boolean, upperOpen: boolean, count?: number): Promise<any> => {
        return await this.getAll(storeName, IDBKeyRange.bound(lower, upper, lowerOpen, upperOpen), count);
    }

    public getAllByArrayKey = async (storeName: string, key: any[]): Promise<any> => {
        const tx = this.getTransaction(this.dbInstance, storeName, 'readonly');
        const sx = tx.objectStore(storeName);

        let results: any[] = [];

        for (let index = 0; index < key.length; index++) {
            const element = key[index];
            results.push(await sx.get(element));
        }

        await tx.complete;

        return results;
    }

    public count = async (storeName: string, key?: any): Promise<number> => {
        const tx = this.getTransaction(this.dbInstance, storeName, 'readonly');

        let result = await tx.objectStore(storeName).count(key ?? undefined);

        await tx.complete;

        return result;
    }

    public countByKeyRange = async (storeName: string, lower: any, upper: any, lowerOpen: boolean, upperOpen: boolean): Promise<number> => {
        return await this.count(storeName, IDBKeyRange.bound(lower, upper, lowerOpen, upperOpen));
    }

    public query = async (storeName: string, filter: string, count: number = 0, skip: number = 0): Promise<any> => {
        const tx = this.getTransaction(this.dbInstance, storeName, 'readonly');

        var func = new Function('obj', filter);

        var row = 0;
        var error = "";

        let results: any[] = [];

        tx.objectStore(storeName)
            .iterateCursor(cursor => {
                if (!cursor) {
                    return;
                }
                try {
                    if (func(cursor.value)) {
                        row ++;
                        if (row > skip) {
                            results.push(cursor.value);
                        }
                    }
                }
                catch (e) {
                    error = `obj: ${JSON.stringify(cursor.value)}\nfilter: ${filter}\nerror: ${(e as Error).message}`;
                    return;
                }
                if (count > 0 && results.length >= count) {
                    return;
                }
                cursor.continue();
            });

        await tx.complete;

        if (error) {
            throw error;
        }

        return results;
    }

    public getFromIndex = async (storeName: string, indexName: string, key: any): Promise<any> => {
        const tx = this.getTransaction(this.dbInstance, storeName, 'readonly');

        const results = await tx.objectStore(storeName).index(indexName).get(key);

        await tx.complete;

        return results;
    }

    public getAllFromIndex = async (storeName: string, indexName: string, key?: any, count?: number): Promise<any> => {
        const tx = this.getTransaction(this.dbInstance, storeName, 'readonly');

        const results = await tx.objectStore(storeName).index(indexName).getAll(key ?? undefined, count ?? undefined);

        await tx.complete;

        return results;
    }

    public getAllFromIndexByKeyRange = async (storeName: string, indexName: string, lower: any, upper: any, lowerOpen: boolean, upperOpen: boolean, count?: number): Promise<any> => {
        return await this.getAllFromIndex(storeName, indexName, IDBKeyRange.bound(lower, upper, lowerOpen, upperOpen), count);
    }

    public getAllFromIndexArrayKey = async (storeName: string, indexName: string, key: any[]): Promise<any> => {
        const tx = this.getTransaction(this.dbInstance, storeName, 'readonly');
        const dx = tx.objectStore(storeName).index(indexName);

        let results: any[] = [];

        for (let index = 0; index < key.length; index++) {
            const element = key[index];
            results.push(await dx.get(element));
        }

        await tx.complete;

        return results;
    }

    public countFromIndex = async (storeName: string, indexName: string, key?: any): Promise<number> => {
        const tx = this.getTransaction(this.dbInstance, storeName, 'readonly');

        let result = await tx.objectStore(storeName).index(indexName).count(key ?? undefined);

        await tx.complete;

        return result;
    }

    public countFromIndexByKeyRange = async (storeName: string, indexName: string, lower: any, upper: any, lowerOpen: boolean, upperOpen: boolean): Promise<number> => {
        return await this.countFromIndex(storeName, indexName, IDBKeyRange.bound(lower, upper, lowerOpen, upperOpen));
    }

    public queryFromIndex = async (storeName: string, indexName: string, filter: string, count: number = 0, skip: number = 0): Promise<any> => {
        const tx = this.getTransaction(this.dbInstance, storeName, 'readonly');

        var func = new Function('obj', filter);

        var row = 0;
        var error = "";

        let results: any[] = [];

        tx.objectStore(storeName)
            .index(indexName)
            .iterateCursor(cursor => {
                if (!cursor) {
                    return;
                }
                try {
                    if (func(cursor.value)) {
                        row ++;
                        if (row > skip) {
                            results.push(cursor.value);
                        }
                    }
                }
                catch (e) {
                    error = `obj: ${JSON.stringify(cursor.value)}\nfilter: ${filter}\nerror: ${(e as Error).message}`;
                    return;
                }
                if (count > 0 && results.length >= count) {
                    return;
                }
                cursor.continue();
            });

        await tx.complete;

        if (error) {
            throw error;
        }

        return results;
    }

    public add = async (storename: string, data: any, key?: any): Promise<string> => {
        const tx = this.getTransaction(this.dbInstance, storename, 'readwrite');
        const objectStore = tx.objectStore(storename);

        data = this.checkForKeyPath(objectStore, data);

        const result = await objectStore.add(data, key ?? undefined);

        await tx.complete;

        return `Added new record with id ${result}`;
    }

    public put = async (storename: string, data: any, key?: any): Promise<string> => {
        const tx = this.getTransaction(this.dbInstance, storename, 'readwrite');

        const result = await tx.objectStore(storename).put(data, key ?? undefined);

        await tx.complete;

        return `updated record with id ${result}`;
    }

    public delete = async (storename: string, id: any): Promise<string> => {
        const tx = this.getTransaction(this.dbInstance, storename, 'readwrite');

        await tx.objectStore(storename).delete(id);

        await tx.complete;

        return `Record with id: ${id} deleted`;
    }

    public batchAdd = async (storename: string, data: any[]): Promise<string> => {
        const tx = this.getTransaction(this.dbInstance, storename, 'readwrite');
        const objectStore = tx.objectStore(storename);

        data.forEach(async element => {
            let item = this.checkForKeyPath(objectStore, element);
            await objectStore.add(item);
        });

        await tx.complete;

        return `Added ${data.length} records`;
    }

    public batchPut = async (storename: string, data: any[]): Promise<string> => {
        const tx = this.getTransaction(this.dbInstance, storename, 'readwrite');

        data.forEach(async element => {
            await tx.objectStore(storename).put(element);
        });

        await tx.complete;

        return `updated ${data.length} records`;
    }

    public batchDelete = async (storename: string, ids: any[]): Promise<string> => {
        const tx = this.getTransaction(this.dbInstance, storename, 'readwrite');

        ids.forEach(async element => {
            await tx.objectStore(storename).delete(element);
        });

        await tx.complete;

        return `Deleted ${ids.length} records`;
    }

    public clearStore = async (storeName: string): Promise<string> => {
        const tx = this.getTransaction(this.dbInstance, storeName, 'readwrite');

        await tx.objectStore(storeName).clear();

        await tx.complete;

        return `Store ${storeName} cleared`;
    }

    private getTransaction(dbInstance: DB, stName: string, mode?: 'readonly' | 'readwrite') {
        const tx = dbInstance.transaction(stName, mode);
        tx.complete.catch(
            err => {
                if (err) {
                    console.error((err as Error).message);
                } else {
                    console.error('Undefined error in getTransaction()');
                }

            });

        return tx;
    }

    // Currently don't support aggregate keys
    private checkForKeyPath(objectStore: ObjectStore<any, any>, data: any) {
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

    private upgradeDatabase(upgradeDB: UpgradeDB, dbStore: IDatabase) {
        if (upgradeDB.oldVersion < dbStore.version) {
            if (dbStore.objectStores) {
                for (var store of dbStore.objectStores) {
                    if (!upgradeDB.objectStoreNames.contains(store.name)) {
                        this.addNewStore(upgradeDB, store);
                    }
                }
            }
        }
    }

    private addNewStore(upgradeDB: UpgradeDB, store: IObjectStore) {
        let primaryKey = store.primaryKey;

        if (!primaryKey) {
            primaryKey = { name: 'id', keyPath: 'id', multiEntry: false, unique: false, autoIncrement: true };
        }

        const newStore = upgradeDB.createObjectStore(store.name,
            {
                keyPath: primaryKey.keyPath ?? primaryKey.multiKeyPath,
                autoIncrement: primaryKey.autoIncrement
            }
        );

        for (var index of store.indexes) {
            newStore.createIndex(index.name,
                index.keyPath ?? primaryKey.multiKeyPath ?? index.name,
                {
                    multiEntry: index.multiEntry,
                    unique: index.unique
                }
            );
        }
    }
}