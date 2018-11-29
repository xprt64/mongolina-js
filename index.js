/*
 * Copyright (c) 2018 Constantin Galbenu <gica.galbenu@gmail.com>
 */

"use strict";

const MongoClient = require('mongodb').MongoClient;
const MongoOplog = require('mongo-oplog');
const EventStoreReader = require('./EventStoreReader');
const EventLogReader = require('./EventLogReader');
const EventStore = require('./EventStore');
const ReadModel = require('./ReadModel');


function factoryEventStore({connectUrl, oplogUrl, collectionName = 'eventStore', name}) {
    return new Promise(function (resolve, reject) {
        MongoClient.connect(connectUrl, (err, client) => {
            if (null !== err) {
                console.log(`Could not connect to server: ${err}`);
                reject(err);
                return;
            }

            const db = client.db(dbNameFromUrlString(connectUrl));

            db.on('close', () => {
                console.log('-> lost connection');
                throw 'lost connection';
            });

            const oplogFactory = (sinceTimestamp) => {
                const oplog = MongoOplog(oplogUrl, {
                    ns: `${dbNameFromUrlString(connectUrl)}.${collectionName}`,
                    since: sinceTimestamp
                });
                oplog.on('error', error => {
                    throw `lost connection: ${error}`
                });
                oplog.on('end', () => {
                    throw `oplog stream ended`
                });
                return oplog;
            };

            resolve(new EventStoreReader(db.collection(collectionName), oplogFactory, name));
        });
    });
}

function factoryEventLog({connectUrl, oplogUrl, collectionName, name}) {
    return new Promise(function (resolve, reject) {
        MongoClient.connect(connectUrl, (err, client) => {
            if (null !== err) {
                console.log(`Could not connect to server: ${err}`);
                reject(err);
                return;
            }

            const db = client.db(dbNameFromUrlString(connectUrl));

            db.on('close', () => {
                console.log('-> lost connection');
                throw 'lost connection';
            });

            const oplogFactory = (sinceTimestamp) => {
                 const oplog = MongoOplog(oplogUrl, {
                    ns: `${dbNameFromUrlString(connectUrl)}.${collectionName}`,
                    since: sinceTimestamp
                });
                oplog.on('error', error => {
                    throw `lost connection: ${error}`
                });
                oplog.on('end', () => {
                    throw `oplog stream ended`
                });
                return oplog;
            };
            resolve(new EventLogReader(db.collection(collectionName), oplogFactory, name));
        });
    });
}

function factoryEventStoreAppender(connectUrl, collectionName) {
    return new Promise(function (resolve, reject) {
        MongoClient.connect(connectUrl, (err, client) => {
            if (null !== err) {
                console.log(`Could not connect to server: ${err}`);
                reject(err);
                return;
            }

            const db = client.db(dbNameFromUrlString(connectUrl));

            db.on('close', () => {
                console.log('-> lost connection');
                throw 'lost connection';
            });

            resolve(new EventStore(db.collection(collectionName)));
        });
    });
}

module.exports.connectToEventStore = function (connectUrl = 'mongodb://localhost:27017/eventStore', oplogUrl = 'mongodb://localhost:27017/local', collectionName = 'eventStore') {
    return factoryEventStore({connectUrl, oplogUrl, collectionName});
};

module.exports.connectToEventLog = function (connectUrl = 'mongodb://localhost:27017/eventStore', oplogUrl = 'mongodb://localhost:27017/local', collectionName = 'eventLog') {
    return factoryEventLog({connectUrl, oplogUrl, collectionName});
};

module.exports.connectToEventStoreAsAppender = function (connectUrl = 'mongodb://localhost:27017/eventStore', collectionName) {
    return factoryEventStoreAppender(connectUrl, collectionName);
};

module.exports.connectMultipleEventStores = function (eventStoreDescriptors) {
    return Promise.all(
        eventStoreDescriptors.map(
            (eventStoreDescriptor) => factoryEventStore(eventStoreDescriptor)
        )
    );
};

module.exports.connectMultipleEventLogs = function (eventStoreDescriptors) {
    return Promise.all(
        eventStoreDescriptors.map(
            (eventStoreDescriptor) => factoryEventLog(eventStoreDescriptor)
        )
    );
};

module.exports.ReadModel = ReadModel;
module.exports.dbNameFromUrlString = dbNameFromUrlString;

function dbNameFromUrlString(url) {
    const matches = url.match(/mongodb:\/\/.*\/([0-9a-z\-]+)/i);
    return matches[1];
}