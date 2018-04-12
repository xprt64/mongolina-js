/*
 * Copyright (c) 2018 Constantin Galbenu <gica.galbenu@gmail.com>
 */
const Event = require('./dtos').Event;
const AggregateMeta = require('./dtos').AggregateMeta;
const EventMeta = require('./dtos').EventMeta;

function eventsFromCommit(commitDocument) {
    return commitDocument.events.map((eventSubDocument) => eventFromCommit(commitDocument, eventSubDocument));
}

function eventFromCommit(commitDocument, eventSubDocument) {
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
        )
    )
}

module.exports.eventsFromCommit = eventsFromCommit;
module.exports.eventFromCommit = eventFromCommit;
