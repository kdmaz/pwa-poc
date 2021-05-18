import { DBConfig } from 'ngx-indexed-db';

export const dbConfig: DBConfig = {
  name: 'UserDb',
  version: 1,
  objectStoresMeta: [{
    store: 'UserStore',
    storeConfig: {
      keyPath: 'id',
      autoIncrement: true
    },
    storeSchema: [
      {
        name: 'name',
        keypath: 'name',
        options: {
          unique: false
        }
      }
    ]
  }]
}
