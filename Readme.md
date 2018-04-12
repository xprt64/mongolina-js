# jslina = MongoDB Event store

This module permits building an event sourced application by appending events to a database and by reacting to those events.

It is used in conjunction with Domain driven design (DDD) because each event is appended to an event stream and each event stream corresponds to an Aggregate instance (type and ID).

For a PHP implementation please refer to [Dudulina CQRS Framework](https://github.com/xprt64/dudulina).

The module has two sub-modules: the events appender and the events reader.

## Instalation

```bash
npm install jslina --save
```

## The events appender

It permits safely appending the events to an event stream (which corresponds to the tuple: aggregate ID x aggregate Type). 
It uses optimistic locking to protect to concurrent access (it uses a `version` property); if concurrent access is detected, the Promise is rejected.

All the events are appended **atomically** as a MongoDB document, in this way no transactions are used. 

Events are totally ordered using the [MongoDB Timestamps](https://www.mongodb.com/presentations/implementation-of-cluster-wide-causal-consistency-in-mongodb), which are unique and ever increasing per event store instance. 

An example is below:
```javascript
const connectToEventStore = require('jslina').connectToEventStoreAsAppender;

connectToEventStore(process.env.CONNECT_STRING, 'eventStore').then(function (eventStore) {

    //eventStore.createStore() //must be run onetime, on install
    
    eventStore.appendEvents(
        '5acf5a1bf5926831065e1f9f', //aggregate Id
        'someAggregate', //aggregate Type
        0, //expected version
        [   //event = plain old JavaScript object 
            {
                type: 'SomethingWasDone', //required field; you could also use 'eventClass' instead of 'type'
                when: new Date(),
                why: 'because of that'
            }
        ],
        1,
        {command: 'testCommand'} //some optional command meta data
    )
        .then(res => console.log(res))
        .catch(err => {
            console.log(err.code, err.message);
            process.exit(1);
        })

});
```
## The events reader (AKA the Readmodel-updater)
 
It fetches the events from the event store and calls the appropriate methods on the Readmodel.

By default, the Readmodel continues to receive the new events even after all the previously emitted events are fetched 
from the Event store; it does this by tailing the Event store's `oplog`.

This behavior can be disabled by calling `Readmodel.stopAfterInitialProcessing()`.

## Sample Readmodel-updater

Below is an example of a Readmodel-updater that listen to the `SomethingWasDone` events and builds a local
representation; more exactly, it counts the number of emitted events.

This is a [trivial example](https://github.com/xprt64/jslina/blob/master/sample/read/simple-readmodel.js) with the purpose is to show how to connect to the Event store and how to define a Readmodel-updater.

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

You can run this example in a Docker container:

```bash
CONNECT_STRING="mongodb://someUser:somePassword@eventStore:27017/eventStore" OPLOG_CONNECT_STRING="mongodb://someUser:somePassword@eventStore:27017/local" node simple-readmodel.js
```

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