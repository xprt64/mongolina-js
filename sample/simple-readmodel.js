/*
 * Copyright (c) 2018 Constantin Galbenu <gica.galbenu@gmail.com>
 */

"use strict";

const connect = require('../src/index').connect;
const MongoDB = require('mongodb');

let processedCount = 0;

connect(process.env.CONNECT_STRING, process.env.OPLOG_CONNECT_STRING).then(function (eventStore) {
    eventStore
        .after(new MongoDB.Timestamp(1, 1522775897))
        .on("Crm\\Write\\Test\\TestAggregate\\Event\\SomethigWasDone", (event) => {
            processedCount++;
            console.log(`processing event #${processedCount}`);
        })
        .run()
        .then(() => {
            console.log(`processed events: ${processedCount}`);
            eventStore.continueToListen();
        });
}).catch(err => {
    process.exit();
});