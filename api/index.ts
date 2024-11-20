require("dotenv").config();

import express from 'express'
import * as bodyParser from 'body-parser'
import * as bunyan from 'bunyan'
import TCPMSVP from '@magmalayer/msvp-js-modules-node-tcp'
import eventTypes from '@magmalayer/msvp-js/dist/consensus/constants/EventTypes'
import Crypto from '@magmalayer/msvp-js-modules-crypto-bnelliptic'
import PlainStorageRecord from './network/storage/KvPlainStorage'

const app = express()
app.use(bodyParser.json({ limit: '3mb' }))
app.use(bodyParser.urlencoded({
    extended: true
  }))

const config = {
    db: {
      uri: process.env.DB_URI || 'mongodb://localhost:27017/test'
    },
    rest: {
      port: process.env.REST_PORT ? parseInt(process.env.REST_PORT, 10) : 6001
    },
    node: {
      host: process.env.NODE_HOST || 'localhost',
      port: process.env.NODE_PORT ? parseInt(process.env.NODE_PORT, 10) : 6002,
      privateKey: process.env.NODE_PRIVATE_KEY || '',
      publicKey: process.env.NODE_PUBLIC_KEY|| '',
      sendSignalToRandomPeer: process.env.NODE_SEND_SIGNAL_TO_RANDOM_PEER ? !!parseInt(process.env.NODE_SEND_SIGNAL_TO_RANDOM_PEER) : false,
      gossipInterval: {
        min: process.env.NODE_GOSSIP_INTERVAL_MIN ? parseInt(process.env.NODE_GOSSIP_INTERVAL_MIN, 10) : 50,
        max: process.env.NODE_GOSSIP_INTERVAL_MAX ? parseInt(process.env.NODE_GOSSIP_INTERVAL_MAX, 10) : 300
      },
      peers: process.env.NODE_PEERS ? process.env.NODE_PEERS.split(';').map(s => s.trim()) : []
    },
    log: {
      logLevel: process.env.LOG_LEVEL ? parseInt(process.env.LOG_LEVEL, 10) : 50,
    }
  }

    const storageMongo = new PlainStorageRecord()

    const logger = bunyan.createLogger({ name: 'Magma.', level: config.log.logLevel });

    const instance = new TCPMSVP({
        address: `tcp://${config.node.host}:${config.node.port}/${config.node.publicKey}`,
        gossipInterval: {
          min: config.node.gossipInterval.min,
          max: config.node.gossipInterval.max
        },
        sendSignalToRandomPeer: config.node.sendSignalToRandomPeer,
        logger,
        privateKey: config.node.privateKey,
        storage: storageMongo,
        crypto: new Crypto()
      });
    
      for (const peer of config.node.peers) {
        instance.nodeApi.join(peer);
      }
    
      instance.on(eventTypes.STATE_UPDATE, async () => {
        const state = await instance.getState();
        logger.info(`Magma root ${state.root} / lastTimestamp: ${state.timestamp}`)
      })
    


app.get("/", (req:any, res:any) => res.send("ultra."))
app.post('/createStream', async (req, res) => {
    if (!req.body.key || !req.body.value || !req.body.version) {
      return res.status(400).send({
        error: 'invalid'
      })
    }
    const hash = await instance.appendApi.append(req.body.key, req.body.value, 0)
    res.send({
      key: req.body.key,
      value: req.body.value,
      version: req.body.version,
      hash
    })
  })
  app.get('/stream/:hash', async (req, res) => {
    if (!req.params.hash) {
      return res.send({})
    }
    const record: any = await instance.storage.Record.get(req.params.hash)
    if (!record) {
      return res.send({});
    }
    record.publicKeys = Array.from(record.publicKeys)
    record.signatures = Object.fromEntries(record.signaturesMap)
    delete record.signaturesMap
    res.send(record)
  })
  app.get('/streams/range/:timestamp/:timestampIndex/:limit', async (req, res) => {
    const timestamp = parseInt(req.params.timestamp, 10)
    const lastUpdateTimestampIndex = parseInt(req.params.timestampIndex)
    const limit = parseInt(req.params.limit)
    const safeLimit = limit < 1 || limit > 100 ? instance.batchReplicationSize : limit
    const records = await instance.storage.Record.getAfterTimestamp(timestamp, lastUpdateTimestampIndex, safeLimit)
    const recordObjs = records.map((record: any) => {
      record.publicKeys = Array.from(record.publicKeys)
      record.signatures = Object.fromEntries(record.signaturesMap)
      delete record.signaturesMap
      return record
    })
    res.send(recordObjs)
  })
  app.get('/streams/range/:timestamp', async (req, res) => {
    const timestamp = parseInt(req.params.timestamp, 10)
    const records = await instance.storage.Record.getByTimestamp(timestamp)
    const recordObjs = records.map((record: any) => {
      record.publicKeys = Array.from(record.publicKeys)
      record.signatures = Object.fromEntries(record.signaturesMap)
      delete record.signaturesMap
      return record
    })
    res.send(recordObjs)
  })
  app.get('/streams/all', async (req, res) => {
    let genericPast = new Date('2023-01-01T00:00:00Z').getTime()
    const records = await instance.storage.Record.getAfterTimestamp(genericPast, 0, 100)
    const recordObjs = records.map((record: any) => {
      record.publicKeys = Array.from(record.publicKeys)
      record.signatures = Object.fromEntries(record.signaturesMap)
      delete record.signaturesMap
      return record
    })
    res.send(recordObjs)
  })
  app.get('/states', async (req, res) => {
    const states = await Promise.all(
      [...instance.publicKeys.values()].map(pk =>
        instance.storage.State.get(pk)
      )
    )
    res.send(states)
  })


app.listen(config.rest.port)
instance.connect()

module.exports = app
