/*
 * Copyright (c) 2018 Constantin Galbenu <gica.galbenu@gmail.com>
 */

"use strict";
const ReadModel = require("../ReadModel");
const connectToEventStore = require('../index').connectToEventStore;

let processedCount = 0;

connectToEventStore(process.env.CONNECT_STRING, process.env.OPLOG_CONNECT_STRING).then(function (eventStore) {
    const readModel = new ReadModel();

    readModel
        .on("Crm\\Write\\Test\\TestAggregate\\Event\\SomethigWasDone", (event) => {
            processedCount++;
            console.log(`processing event #${processedCount}`);
        })
        .stopAfterInitialProcessing();

    eventStore
        .subscribeReadModel(readModel)
        .run()
        .then(() => {
            console.log(`done processed ${processedCount} events`);
            process.exit(0);
        });
}).catch(err => {
    console.error(err);
    process.exit(1);
});