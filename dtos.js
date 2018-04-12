/*
 * Copyright (c) 2018 Constantin Galbenu <gica.galbenu@gmail.com>
 */

"use strict";

function AggregateMeta(id, type, stream, version) {
    this.id = id;
    this.type = type;
    this.stream = stream;
    this.version = version;
}

function Event(id, type, payload, aggregateMeta, meta) {
    this.id = id;
    this.type = type;
    this.payload = payload;
    this.aggregateMeta = aggregateMeta;
    this.meta = meta;
}

function EventMeta(createdAt, ts, command) {
    this.createdAt = createdAt;
    this.ts = ts;
    this.command = command;
}

module.exports.Event = Event;
module.exports.AggregateMeta = AggregateMeta;
module.exports.EventMeta = EventMeta;