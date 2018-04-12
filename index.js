/*
 * Copyright (c) 2018 Constantin Galbenu <gica.galbenu@gmail.com>
 */

"use strict";

const MongoClient = require('mongodb').MongoClient;
const MongoOplog = require('mongo-oplog');
const EventStore = require('./EventStore');


function factoryEventStore(connectUrl, oplogUrl) {
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
                    ns: `eventStore.${dbNameFromUrlString(connectUrl)}`,
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

            resolve(new EventStore(db, oplogFactory));
        });
    });
}

module.exports.connectToEventStore = function (connectUrl = 'mongodb://localhost:27017/eventStore', oplogUrl = 'mongodb://localhost:27017/local') {
    return factoryEventStore(connectUrl, oplogUrl);
};

module.exports.connectMultipleEventStores = function (eventStoreDescriptors) {
    return Promise.all(
        eventStoreDescriptors.map(
            (eventStoreDescriptor) => factoryEventStore(eventStoreDescriptor.connectUrl, eventStoreDescriptor.oplogUrl)
        )
    );
};

function dbNameFromUrlString(url) {
    const matches = url.match(/mongodb:\/\/.*\/([0-9a-z\-]+)/i);
    return matches[1];
}