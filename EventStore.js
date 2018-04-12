/*
 * Copyright (c) 2018 Constantin Galbenu <gica.galbenu@gmail.com>
 */
"use strict";

const ObjectID = require('mongodb').ObjectID;
const Timestamp = require('mongodb').Timestamp;
const eventsFromCommit = require("./Commit").eventsFromCommit;
const crypto = require('crypto');

function packEvents(events) {
    return events.map(event => ({
        eventClass: event.type || event.eventClass,
        dump: event,
        id: new ObjectID()
    }));
}

class EventStore {

    constructor(collection) {
        this.collection = collection;
    }

    appendEvents(aggregateId, aggregateType, expectedVersion, events, commandMetadata) {
        return this.collection.insert({
            streamName: factoryStreamName(aggregateId, aggregateType),
            aggregateId: aggregateId,
            aggregateClass: aggregateType,
            version: expectedVersion + 1,
            ts: new Timestamp(0, 0),
            createdAt: new Date(),
            commandMeta: commandMetadata,
            events: packEvents(events)
        });
    }

    loadEvents(aggregateId, aggregateType, eventCallback) {
        const cursor = this.collection.find({
            streamName: factoryStreamName(aggregateId, aggregateType)
        }, {sort: {ts: 1}});

        return new Promise((resolve, reject) => {
            let aggregateVersion;

            cursor.forEach(
                (document) => eventsFromCommit(document).forEach(event => {
                    eventCallback(event);
                    aggregateVersion = document.version;
                }),
                (err) => err === null ? resolve(aggregateVersion) : reject(err)
            );
        });
    }

    createStore() {
        this.collection.createIndex({'streamName': 1, 'version': 1}, {'unique': true});
        this.collection.createIndex({'events.eventClass': 1, 'ts': 1});
        this.collection.createIndex({'ts': 1});
        this.collection.createIndex({'events.id': 1});
    }

    dropStore() {
        this.collection.drop();
    }
}

module.exports = EventStore;

function factoryStreamName(aggregateId, aggregateType) {
    return ObjectID.createFromHexString(crypto.createHash('sha256').update(aggregateType + aggregateId).digest('hex').substr(0, 24));
}