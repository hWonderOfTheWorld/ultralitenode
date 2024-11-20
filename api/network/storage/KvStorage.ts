import { IRecord, IState, IStorageInterface } from '@magmalayer/msvp-js/dist/consensus/interfaces/IStorageInterface';

interface RecordSchema {
    hash: String,
    key: String,
    value: String,
    version: Number,
    timestamp: Number,
    timestampIndex: Number,
    signatureType: Number,
    signatures: {
      type: Map,
      of: String
    },
    publicKeys: [String]
}

interface StateSchema {
    publicKey: String,
    root: String,
    timestamp: Number,
    timestampIndex: Number
  }

  export class StorageMongoRecord implements IRecord {
    async del(hash: string): Promise<void> {
        await RecordMongo.deleteOne({ hash });
      }
    
      async get(hash: string): Promise<RecordModel | null> {
        const recordMongo = await RecordMongo.findOne({ hash });
    
        if (!recordMongo) {
          return null;
        }
    
        const plainRm = recordMongo.toObject();
        return new RecordModel({
          hash: plainRm.hash,
          key: plainRm.key,
          value: plainRm.value,
          version: plainRm.version,
          timestamp: plainRm.timestamp,
          timestampIndex: plainRm.timestampIndex,
          signatureType: plainRm.signatureType,
          signaturesMap: plainRm.signatures,
          publicKeys: new Set<string>(plainRm.publicKeys)
        });
      }
    
      async getAfterTimestamp(timestamp: number, timestampIndex: number, limit: number): Promise<RecordModel[]> {
        const recordsMongo = await RecordMongo.find({
          $or: [
            {
              timestamp: {
                $gt: timestamp
              }
            },
            {
              timestamp,
              timestampIndex: {
                $gt: timestampIndex
              }
            }
          ]
        })
          .sort({ timestamp: 1, timestampIndex: 1 })
          .limit(limit);
    
        return recordsMongo.map(rm => {
          const plainRm = rm.toObject();
          return new RecordModel({
            hash: plainRm.hash,
            key: plainRm.key,
            value: plainRm.value,
            version: plainRm.version,
            timestamp: plainRm.timestamp,
            timestampIndex: plainRm.timestampIndex,
            signatureType: plainRm.signatureType,
            signaturesMap: plainRm.signatures,
            publicKeys: new Set<string>(plainRm.publicKeys)
          });
        });
      }
    
      async getByTimestamp(timestamp: number): Promise<RecordModel[]> {
        const recordsMongo = await RecordMongo.find({ timestamp });
        return recordsMongo.map(rm => {
          const plainRm = rm.toObject();
          return new RecordModel({
            hash: plainRm.hash,
            key: plainRm.key,
            value: plainRm.value,
            version: plainRm.version,
            timestamp: plainRm.timestamp,
            timestampIndex: plainRm.timestampIndex,
            signatureType: plainRm.signatureType,
            signaturesMap: plainRm.signatures,
            publicKeys: new Set<string>(plainRm.publicKeys)
          })
        });
      }
    
      async has(hash: string): Promise<boolean> {
        const count = await RecordMongo.count({ hash });
        return count === 1;
      }
    
      async save(record: RecordModel): Promise<void> {
        const mongoRecord = {
          hash: record.hash,
          key: record.key,
          value: record.value,
          version: record.version,
          timestamp: record.timestamp,
          timestampIndex: record.timestampIndex,
          signatureType: record.signatureType,
          publicKeys: Array.from(record.publicKeys),
          signatures: Object.fromEntries(record.signaturesMap)
        }
    
        await RecordMongo.replaceOne({
          hash: record.hash
        }, mongoRecord, { upsert: true });
      }
}







export class StorageMongoState implements IState {
    async get(publicKey: string): Promise<StateModel> {
      const state = await StateMongo.findOne({ publicKey });
  
      if (!state) {
        return {
          timestamp: 0,
          timestampIndex: -1,
          root: '0',
          publicKey
        };
      }
  
      return {
        timestamp: state.timestamp,
        timestampIndex: state.timestampIndex,
        root: state.root,
        publicKey: state.publicKey
      }
    }
  
    async save(state: StateModel): Promise<void> {
      await StateMongo.replaceOne({
        publicKey: state.publicKey
      }, state, { upsert: true });
    }
  
  }
  
  export default class StorageMongo implements IStorageInterface {
    Record: StorageMongoRecord;
    State: StorageMongoState;
  
    public constructor() {
      this.Record = new StorageMongoRecord();
      this.State = new StorageMongoState();
    }
  
    public async init(uri: string) {
      await mongoose.connect(uri);
    }
  
  }