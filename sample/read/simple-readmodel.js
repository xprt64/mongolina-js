/*
 * Copyright (c) 2018 Constantin Galbenu <gica.galbenu@gmail.com>
 */

"use strict";
const ReadModel = require("eslina/ReadModel");
const connectToEventStore = require('eslina').connectToEventStore;
const MongoDB = require('mongodb');

let processedCount = 0;

connectToEventStore(process.env.CONNECT_STRING, process.env.OPLOG_CONNECT_STRING).then(function (eventStore) {
    const readModel = new ReadModel();

    readModel
        .on("Crm\\Write\\Test\\TestAggregate\\Event\\SomethigWasDone", (event) => {
            processedCount++;
            console.log(`processing event #${processedCount}`);
        })
        .after(new MongoDB.Timestamp(1, 1522775897));

    eventStore
        .subscribeReadModel(readModel)
        .run()
        .then(() => {
            console.log(`processed events: ${processedCount}`);
        });
}).catch(err => {
    console.error(err);
    process.exit(1);
});