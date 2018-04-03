/*
 * Copyright (c) 2018 Constantin Galbenu <gica.galbenu@gmail.com>
 */

const Event = require('./objects').Event;
const Aggregate = require('./objects').Aggregate;
const EventMeta = require('./objects').EventMeta;

class EventStore {

    constructor(db, oplogFactory, ifClosedCallback) {
        this.collection = db.collection('eventStore');
        this.callbacks = {};
        this.anyCallbacks = [];
        this.lastTs = null;
        this.processedEventIds = {};
        this.oplogFactory = oplogFactory;
        this.ifClosedCallback = ifClosedCallback;
    }

    on(eventClass, callback) {
        if (!this.callbacks[eventClass]) {
            this.callbacks[eventClass] = [];
        }
        this.callbacks[eventClass].push(callback);
        return this;
    }

    onAny(callback) {
        this.anyCallbacks.push(callback);
        return this;
    }

    after(timestamp) {
        this.afterTimestamp = timestamp;
        return this;
    }

    limit(howMany) {
        this.limitEvents = howMany;
        return this;
    }

    continueToListen() {
        const oplog = this.oplogFactory(this.lastTs);
        oplog.on('insert', doc => {
            this.processDocument(doc.o)
        });
        oplog.tail();
      return this;
    }

    processDocument(document) {
        document.events.forEach((eventSubDocument) => {
            const event = eventFromCommit(document, eventSubDocument);
            this.processEventIfNotAlreadyProcessed(event);
        });
    }

    processEventIfNotAlreadyProcessed(event) {
        if (this.isEventAlreadyProcessed(event)) {
            return;
        }
        this.markEventAsProcessed(event);
        this.processEvent(event);
    }

    processEvent(event) {
        this.lastTs = event.meta.ts;

        if (this.callbacks[event.type]) {
            this.callbacks[event.type].forEach(callback => {
                callback(event);
            })
        }
        this.anyCallbacks.forEach(callback => {
            callback(event);
        });
    }

    run() {
        return new Promise((resolve, reject) => {
            let query = {};
            if (this.afterTimestamp) {
                query.ts = {'$gt': this.afterTimestamp};
            }
            if (this.lastTs) {
                query.ts = {'$gt': this.lastTs};
            }
            if (Object.keys(this.callbacks).length > 0) {
                query['events.eventClass'] = {'$in': Object.keys(this.callbacks)};
            }

            const cursor = this.collection.find(
                query,
                {
                    sort: {ts: 1}
                }
            );
            if (this.limitEvents) {
                cursor.limit(this.limitEvents);
            }

            cursor.toArray().then((documents) => {
                //console.log(`${documents.length} events found`);
                if (this.limitEvents) {
                    documents = documents.slice(0, this.limitEvents);
                }
                documents.forEach(document => this.processDocument(document));
                resolve();
            }).catch((err) => reject(err));
        });
    }

    isEventAlreadyProcessed(event) {
        return this.processedEventIds[`${event.id}`];
    }

    markEventAsProcessed(event) {
        this.processedEventIds[`${event.id}`] = true;
    }
}

function eventFromCommit(commitDocument, eventSubDocument) {
    return new Event(
        eventSubDocument.id,
        eventSubDocument.eventClass,
        eventSubDocument.dump,
        new Aggregate(
            commitDocument.aggregateId,
            commitDocument.aggregateClass,
            commitDocument.streamName,
            commitDocument.version
        ),
        new EventMeta(
            commitDocument.createdAt,
            commitDocument.authenticatedUserId,
            commitDocument.ts,
            commitDocument.command
        )
    )
}

module.exports = EventStore;
