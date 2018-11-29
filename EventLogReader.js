/*
 * Copyright (c) 2018 Constantin Galbenu <gica.galbenu@gmail.com>
 */
"use strict";
const Event = require('./dtos').Event;
const AggregateMeta = require('./dtos').AggregateMeta;
const EventMeta = require('./dtos').EventMeta;

class EventLogReader {

    constructor(collection, oplogFactory, name) {
        this.name = name;
        this.collection = collection;
        this.lastTs = null;
        this.readmodels = [];
        this.oplogFactory = oplogFactory;
        this.countEvents = 0;
    }

    subscribeReadModel(readmodel) {
        this.readmodels.push(readmodel);
        return this;
    }

    getEventTypes() {
        return Array.from(this.readmodels.reduce((acc, readmodel) => {
            readmodel.getEventTypes().map((eventType) => acc.add(eventType));
            return acc;
        }, new Set()));
    }

    after(timestamp) {
        this.afterTimestamp = timestamp;
        return this;
    }

    continueToListen() {
        const oplog = this.oplogFactory(this.lastTs);

        oplog.on('insert', doc => {
            this.processDocument(doc.o)
        });
        oplog.tail().catch((err) => {
            throw `tailing error: ${err}`
        });
        return this;
    }

    sendEventToReadmodels(event) {
        this.readmodels.forEach((readmodel) => readmodel.processEvent(event));
    }

    processDocument(document) {
        this.countEvents++;
        this.sendEventToReadmodels(eventFromCommit(document));
    }

    getEarliestTimestap() {
        return this.readmodels.reduce((acc, readmodel) => {
            if (readmodel.getGreatestProcessedTimestamp()) {
                if (!acc || readmodel.getGreatestProcessedTimestamp().lessThan(acc)) {
                    return readmodel.getGreatestProcessedTimestamp();
                }
            }
            return acc;
        }, this.afterTimestamp);
    }

    run() {
        return new Promise((resolve, reject) => {
            let query = {};
            if (this.getEarliestTimestap()) {
                query.ts = {'$gt': this.getEarliestTimestap()};
            }
            if (this.lastTs) {
                query.ts = {'$gt': this.lastTs};
            }
            if (this.getEventTypes().length > 0) {
                query['eventClass'] = {'$in': this.getEventTypes()};
            }

            const afterProcessing = () => {
                this.log(`done processing ${this.countEvents} events`);
                if (this.shouldTail()) {
                    this.log(`now, we are tailing...`);
                    this.continueToListen();
                } else {
                    resolve();
                }
            };
            const cursor = this.collection.find(query, {sort: {ts: 1}});
            cursor.forEach((document) => {
                this.processDocument(document)
            }, (err) => err === null ? afterProcessing() : reject(err));
        });
    }

    shouldTail() {
        return this.readmodels.reduce((acc, readmodel) => {
            return acc || readmodel.shouldRunContinuously();
        }, false);
    }

    log(what){
        console.log(`${this.name}#`, what);
    }
}


module.exports = EventLogReader;


function eventFromCommit(document) {
    return new Event(
        document.eventId,
        document.eventClass,
        document.event,
        new AggregateMeta(
            document.aggregateId,
            document.aggregateClass,
            document.streamName,
            document.version
        ),
        new EventMeta(
            document.dateCreated,
            document.ts,
            document.commandMeta
        )
    )
}