/*
 * Copyright (c) 2018 Constantin Galbenu <gica.galbenu@gmail.com>
 */

"use strict";
const connectToEventStore = require('mongolina').connectToEventStoreAsAppender;

connectToEventStore(process.env.CONNECT_STRING, 'eventStore').then(function (eventStore) {

	const aggregate = {
		id: '5acf5a1bf5926831065e1f9f',
		type: 'someAggregate',

		somethingHappened: event => {
			aggregate.someState = event.payload.someData;
		},
		somethingElseHappened: event => {
			aggregate.someOtherState = event.payload.someOtherData;
		},
		doSomething: what => ([{
			whatIDid: `I did ${what}`
		}])
	};

	eventStore.loadEvents(
		aggregate.id,
		aggregate.type,
		event => {
			aggregate[event.type](event); //we call the event handler method on the aggregate
		}
	).then(aggregateVersion => {
		const newEvents = aggregate.doSomething('that is important');

		eventStore.appendEvents(
			aggregate.id,
			aggregate.type,
			aggregateVersion,
			newEvents
		);
	})

}).catch(err => {
	console.error(err);
	process.exit(1);
});