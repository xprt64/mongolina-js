/*
 * Copyright (c) 2018 Constantin Galbenu <gica.galbenu@gmail.com>
 */
const Event = require('./dtos').Event;
const AggregateMeta = require('./dtos').AggregateMeta;
const EventMeta = require('./dtos').EventMeta;
const EventSource = require('./dtos').EventSource;

function eventsFromCommit(commitDocument, eventSourceName) {
    return commitDocument.events.map((eventSubDocument) => eventFromCommit(commitDocument, eventSubDocument, eventSourceName));
}

function eventFromCommit(commitDocument, eventSubDocument, eventSourceName) {
    return new Event(
        eventSubDocument.id,
        eventSubDocument.eventClass,
        eventSubDocument.dump,
        new AggregateMeta(
            commitDocument.aggregateId,
            commitDocument.aggregateClass,
            commitDocument.streamName,
            commitDocument.version
        ),
        new EventMeta(
            commitDocument.createdAt,
            commitDocument.ts,
            commitDocument.commandMeta
        ),
        new EventSource(
            eventSourceName
        )
    )
}

module.exports.eventsFromCommit = eventsFromCommit;
module.exports.eventFromCommit = eventFromCommit;
