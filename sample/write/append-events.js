/*
 * Copyright (c) 2018 Constantin Galbenu <gica.galbenu@gmail.com>
 */

"use strict";
const connectToEventStore = require('jslina').connectToEventStoreAsAppender;

connectToEventStore(process.env.CONNECT_STRING, 'eventStore').then(function (eventStore) {

    eventStore.appendEvents(
        '5acf5a1bf5926831065e1f9f',
        'someAggregate',
        0,
        [
            {
                type: 'SomethingWasDone',
                when: new Date(),
                why: 'because of that'
            }
        ],
        1,
        {command: 'testCommand'}
    ).then(res => console.log(res)).catch(err => {
        console.log(err.code, err.message);
        process.exit(1);
    })

    eventStore.loadEvents(
        '5acf5a1bf5926831065e1f9f',
        'someAggregate',
        event => {
            console.log('loaded event from aggregate', event);
        }
    ).then(aggregateVersion => console.log(aggregateVersion)).catch(err => {
        console.log(err.code, err.message);
        process.exit(1);
    })

}).catch(err => {
    console.error(err);
    process.exit(1);
});