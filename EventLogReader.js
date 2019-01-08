/*
 * Copyright (c) 2018 Constantin Galbenu <gica.galbenu@gmail.com>
 */
"use strict";
const Event = require('./dtos').Event;
const AggregateMeta = require('./dtos').AggregateMeta;
const EventMeta = require('./dtos').EventMeta;
const EventSource = require('./dtos').EventSource;

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
    }

    sendEventToReadmodels(event) {
        return Promise.all(this.readmodels.map(async (readmodel) => await readmodel.processEvent(event)));
    }

    notifyReadmodelsTailingStarted() {
        return Promise.all(this.readmodels.map((readmodel) => 'tailingStarted' in readmodel ? readmodel.tailingStarted(this.name) : null));
    }

    processDocument(document) {
        this.countEvents++;
        return this.sendEventToReadmodels(this.eventFromCommit(document));
    }

    async getEarliestTimestap() {
        return this.readmodels.reduce(async (acc, readmodel) => {
            let greatestProcessedTimestamp = await readmodel.getGreatestProcessedTimestamp(this.name);
            if (greatestProcessedTimestamp) {
                if (!acc || greatestProcessedTimestamp.lessThan(acc)) {
                    return greatestProcessedTimestamp;
                }
            }
            return acc;
        }, this.afterTimestamp);
    }

    async run(shouldAbort) {
        let query = {};
        let earliestTimestap = await this.getEarliestTimestap();
        if (earliestTimestap) {
            query.ts = {'$gt': earliestTimestap};
        }
        if (this.lastTs) {
            query.ts = {'$gt': this.lastTs};
        }
        if (this.getEventTypes().length > 0) {
            query['eventClass'] = {'$in': this.getEventTypes()};
        }

        const cursor = this.collection.find(query, {sort: {ts: 1}});
        while (await cursor.hasNext()) {
            if (shouldAbort && await shouldAbort()) {
                this.log(`aborted`);
                return;
            }
            const document = await cursor.next();
            await this.processDocument(document)
        }
        this.log(`done processing ${this.countEvents} events`);
        await this.notifyReadmodelsTailingStarted();
        if (this.shouldTail()) {
            this.log(`now, we are tailing...`);
            this.continueToListen();
        }
    }

    shouldTail() {
        return this.readmodels.reduce((acc, readmodel) => {
            return acc || readmodel.shouldRunContinuously();
        }, false);
    }

    log(what) {
        console.log(`${this.name}#`, what);
    }

    eventFromCommit(document) {
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
            ),
            new EventSource(
                this.name
            )
        )
    }
}

module.exports = EventLogReader;
