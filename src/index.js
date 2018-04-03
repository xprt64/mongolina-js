/*
 * Copyright (c) 2018 Constantin Galbenu <gica.galbenu@gmail.com>
 */

"use strict";

const MongoClient = require('mongodb').MongoClient;
const MongoOplog = require('mongo-oplog');
const EventStore = require('./eventStore');


module.exports.connect = function (connectUrl = 'mongodb://localhost:27017/eventStore', oplogUrl = 'mongodb://localhost:27017/local') {
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
                reject();
            });

            const oplogFactory = (sinceTimestamp) => {
                const oplog = MongoOplog(oplogUrl, {ns: `eventStore.${dbNameFromUrlString(connectUrl)}`, since: sinceTimestamp});
                oplog.on('error', error => reject(error));
                oplog.on('end', reject);
                return oplog;
            };

            resolve(new EventStore(db, oplogFactory, reject));
        });
    });
};

function dbNameFromUrlString(url)
{
    const matches = url.match(/mongodb:\/\/.*\/([0-9a-z\-]+)/i);
    return matches[1];
}