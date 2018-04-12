/*
 * Copyright (c) 2018 Constantin Galbenu <gica.galbenu@gmail.com>
 */

"use strict";
const ReadModel = require("eslina/ReadModel");
const connectMultipleEventStores = require('eslina').connectMultipleEventStores;
const MongoDB = require('mongodb');

let processedCount = 0;

const eventStores = [
    {connectUrl: process.env.CONNECT_STRING1, oplogUrl: process.env.OPLOG_CONNECT_STRING1},
    {connectUrl: process.env.CONNECT_STRING2, oplogUrl: process.env.OPLOG_CONNECT_STRING2}
];

connectMultipleEventStores(eventStores).then(function (eventStores) {
    const readModel = new ReadModel();

    readModel
        .on("Crm\\Write\\Test\\TestAggregate\\Event\\SomethigWasDone", (event) => {
            processedCount++;
            console.log(`processing event #${processedCount}`);
        })
        .after(new MongoDB.Timestamp(1, 1522775897));

    eventStores.forEach(eventStore => {
        return eventStore
            .after(new MongoDB.Timestamp(1, 1522775897))
            .subscribeReadModel(readModel)
            .run()
            .then(() => {
                console.log(`done processed ${processedCount} events`);
            });
    });
}).catch(err => {
    console.error(err);
    process.exit(1);
});