# mongolina = MongoDB Event Store

This module permits building an event-sourced application by appending events to a database and by reacting to those events.

It is used in conjunction with Domain driven design (DDD): each event is appended to an event stream and each event stream corresponds to an Aggregate instance (type and ID).

For a PHP implementation please refer to [Dudulina CQRS Framework](https://github.com/xprt64/dudulina).

The module has two sub-modules: the Events Appender and the Events Reader.

## Instalation

```bash
npm install mongolina --save
```

## The Events Appender

It permits safely appending the events to an event stream (which corresponds to the tuple: (aggregate ID, aggregate Type)). 
It uses optimistic locking to protect to concurrent access (it uses a `version` property); 
if concurrent access is detected, the Promise is rejected. The client code could retry the operation.

All the events are appended **atomically** as a MongoDB document, in this way no transactions are used which helps building a scalable system. 

Events are totally ordered using the [MongoDB Timestamps](https://www.mongodb.com/presentations/implementation-of-cluster-wide-causal-consistency-in-mongodb), 
which are unique and ever-increasing per Event Store instance. 

An example is given below:

```javascript
const connectToEventStore = require('mongolina').connectToEventStoreAsAppender;

connectToEventStore(process.env.CONNECT_STRING, 'eventStore').then(function (eventStore) {
    
	eventStore.appendEvents(
        '5acf5a1bf5926831065e1f9f', //aggregate Id
        'someAggregateType',        //aggregate Type
        0,                          //expected version for optimistic concurrency
        [    
            {//event = plain old JavaScript object
                type: 'SomethingWasDone', //required field; you could also use 'eventClass' instead of 'type'
                when: new Date(),
                why: 'because of that'
            }
        ],
        {command: 'testCommand'}    //some optional command meta data
    );
	
});
```
## The events reader (AKA the ReadModel-updater)
 
It fetches the events from the event store and calls the appropriate methods on the ReadModel.

By default, the ReadModel continues to receive the new events even after all the previously emitted events are fetched 
from the Event Store; it does this by tailing the Event Store's `oplog`.

This behavior can be disabled by calling `ReadModel.stopAfterInitialProcessing()`.

## Sample ReadModel-updater

Below is an example of a ReadModel-updater that listens to the `SomethingWasDone` events and builds a local
representation; more exactly, it counts the number of emitted events.

This is a [trivial example](https://github.com/xprt64/mongolina/blob/master/sample/read/simple-readmodel.js),
 having the purpose to show how to connect to the Event Store and how to define a ReadModel-updater.

```javascript
"use strict";
const ReadModel = require("mongolina/ReadModel");
const connectToEventStore = require('mongolina').connectToEventStore;
const MongoDB = require('mongodb');

let processedCount = 0;

connectToEventStore(process.env.CONNECT_STRING, process.env.OPLOG_CONNECT_STRING).then(function (eventStore) {
    const readModel = new ReadModel();

    readModel
        .on("SomethigWasDone", (event) => {
        	/** @var Event(id, type, payload, aggregateMeta, meta) event */
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

This can be very easy a microservice, with the purpose of keeping a CQRS ReadModel up-to-date. 
You can also put a HTTP interface in front of it in order to handle queries from clients.

This ReadModel-updater runs continuously until it is stopped, by fetching the old events 
and by tailing the new events.

You can run this example with the following command:

```bash
CONNECT_STRING="mongodb://someUser:somePassword@eventStore:27017/eventStore" OPLOG_CONNECT_STRING="mongodb://someUser:somePassword@eventStore:27017/local" node simple-readmodel.js
```

## Listening to multiple Event Stores

If your ReadModel-updater needs events from multiple Event Stores, you can use `connectMultipleEventStores` which returns
a Promise that resolve to multiple EventStores, after all the connections are successful.

```javascript
"use strict";
const ReadModel = require("mongolina/ReadModel");
const connectMultipleEventStores = require('mongolina').connectMultipleEventStores;
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