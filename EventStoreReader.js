/*
 * Copyright (c) 2018 Constantin Galbenu <gica.galbenu@gmail.com>
 */
"use strict";
const eventsFromCommit = require( "./Commit" ).eventsFromCommit;

class EventStoreReader {

    constructor(db, oplogFactory) {
        this.collection = db.collection('eventStore');
        this.lastTs = null;
        this.readmodels = [];
        this.oplogFactory = oplogFactory;
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
        oplog.tail().catch(() => {
            throw `tailing error`
        });
        return this;
    }

    sendEventToReadmodels(event) {
        this.readmodels.forEach((readmodel) => readmodel.processEvent(event));
    }

    processDocument(document) {
        eventsFromCommit(document).forEach((event) => this.sendEventToReadmodels(event));
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
                query['events.eventClass'] = {'$in': this.getEventTypes()};
            }

            const afterProcessing = () => {
                if (this.shouldTail()) {
                    this.continueToListen();
                }
                else {
                    resolve();
                }
            };

            const cursor = this.collection.find(query, {sort: {ts: 1}});
            cursor.forEach((document) => this.processDocument(document), (err) => err === null ? afterProcessing() : reject(err));
        });
    }

    shouldTail() {
        return this.readmodels.reduce((acc, readmodel) => {
            return acc || readmodel.shouldRunContinuously();
        }, false);
    }
}


module.exports = EventStoreReader;
