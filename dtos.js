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

function Event(id, type, payload, aggregateMeta, meta, source) {
    this.id = id;
    this.type = type;
    this.payload = payload;
    this.aggregateMeta = aggregateMeta;
    this.meta = meta;
    this.source = source;
}

function EventMeta(createdAt, ts, command) {
    this.createdAt = createdAt;
    this.ts = ts;
    this.command = command;
}

function EventSource(name){
    this.name = name;
}

module.exports.Event = Event;
module.exports.AggregateMeta = AggregateMeta;
module.exports.EventMeta = EventMeta;
module.exports.EventSource = EventSource;