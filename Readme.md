# JavaScript connector for a Dudulina Event store

This module permits building a Readmodel-updater by using Javascript. 
It fetches the events from the [MongoDB Dudulina Event store](https://github.com/xprt64/dudulina) and calls the appropriate methods on the Readmodel.

By default, the Readmodel continues to receive the new events even after all the previously emitted events are fetched 
from the Event store; it does this by tailing the Event store.

This behavior can be disabled by calling `Readmodel.stopAfterInitialProcessing()`.

## Instalation

```bash
npm install jslina --save
```

## Sample Readmodel-updater

Below is an example of a Readmodel-updater that listen to the `SomethingWasDone` events and builds a local
representation; more exactly, it counts the number of emitted events.

This is a [trivial example](https://github.com/xprt64/jslina/blob/master/sample/simple-readmodel.js) with the purpose is to show how to connect to the Event store and how to define a Readmodel-updater.

```javascript
"use strict";
const ReadModel = require("jslina/ReadModel");
const connectToEventStore = require('jslina').connectToEventStore;
const MongoDB = require('mongodb');

let processedCount = 0;

connectToEventStore(process.env.CONNECT_STRING, process.env.OPLOG_CONNECT_STRING).then(function (eventStore) {
    const readModel = new ReadModel();

    readModel
        .on("SomethigWasDone", (event) => {
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
```

This can be very easy a microservice, with the purpose of keeping a CQRS Readmodel up-to-date. You can also put a HTTP interface in front of
it in order to handle queries from clients.

This Readmodel-updater runs continuously until is stopped, by fetching the old events and by tailing the new events.

## Listening to multiple Event stores

If your Readmodel-updater needs events from multiple Event stores, you can use `connectMultipleEventStores` which returns
a Promise that resolve to multiple EventStores, after all the connections are successful.

```javascript
"use strict";
const ReadModel = require("jslina/ReadModel");
const connectMultipleEventStores = require('jslina').connectMultipleEventStores;
const MongoDB = require('mongodb');

let processedCount = 0;

const eventStores = [
    {connectUrl: process.env.CONNECT_STRING1, oplogUrl: process.env.OPLOG_CONNECT_STRING1},
    {connectUrl: process.env.CONNECT_STRING2, oplogUrl: process.env.OPLOG_CONNECT_STRING2}
];

connectMultipleEventStores(eventStores).then(function (eventStores) {
    const readModel = new ReadModel();

    readModel
        .on("SomethigWasDone1", (event) => {
            processedCount++;
            console.log(`processing event #${processedCount}`);
        })
        .on("SomethigWasDone2", (event) => {
            processedCount++;
            console.log(`processing event #${processedCount}`);
        });

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
```