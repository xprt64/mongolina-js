/*
 * Copyright (c) 2018 Constantin Galbenu <gica.galbenu@gmail.com>
 */

"use strict";

function Aggregate(id, type, stream, version) {
    this.id = id;
    this.type = type;
    this.stream = stream;
    this.version = version;
}

function Event(id, type, payload, aggregate, meta) {
    this.id = id;
    this.type = type;
    this.payload = payload;
    this.aggregate = aggregate;
    this.meta = meta;
}

function EventMeta(createdAt, createdBy, ts, command) {
    this.createdAt = createdAt;
    this.createdBy = createdBy;
    this.ts = ts;
    this.command = command;
}

module.exports.Event = Event;
module.exports.Aggregate = Aggregate;
module.exports.EventMeta = EventMeta;