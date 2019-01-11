/*
 * Copyright (c) 2018 Constantin Galbenu <gica.galbenu@gmail.com>
 */
"use strict";
const eventsFromCommit = require("./Commit").eventsFromCommit;

class EventStoreReader {

	constructor(collection, oplogFactory, name) {
		this.name = name;
		this.collection = collection;
		this.lastTs = null;
		this.readmodels = [];
		this.oplogFactory = oplogFactory;
		this.countEvents = 0;
		this.totalEventCount = null;
	}

	subscribeReadModel(readmodel) {
		this.readmodels.push(readmodel);
		return this;
	}

	getEventTypes() {
		return Array.from(this.readmodels.reduce((acc, readmodel) => {
			readmodel.getEventTypes().map((eventType) => acc.add(eventType));
			return acc;
		}, new Set()));
	}

	after(timestamp) {
		this.afterTimestamp = timestamp;
		return this;
	}

	continueToListen() {
		const oplog = this.oplogFactory(this.lastTs);
		oplog.on('insert', doc => {
			this.processDocument(doc.o)
		});
		oplog.tail().catch((err) => {
			throw `tailing error: ${err}`
		});
	}

	async sendEventToReadmodels(event) {
		await Promise.all(this.readmodels.map(async (readmodel) => await readmodel.processEvent(event)));
	}

	async notifyReadmodelsTailingStarted() {
		await Promise.all(this.readmodels.map((readmodel) => 'tailingStarted' in readmodel ? readmodel.tailingStarted(this.name) : null));
	}

	async processDocument(document) {
		this.countEvents++;
		await Promise.all(eventsFromCommit(document, this.name).map(async (event) => await this.sendEventToReadmodels(event)));
	}

	async getEarliestTimestap() {
		return this.readmodels.reduce(async (acc, readmodel) => {
			let greatestProcessedTimestamp = await readmodel.getGreatestProcessedTimestamp(this.name);
			if (greatestProcessedTimestamp) {
				if (!acc || greatestProcessedTimestamp.lessThan(acc)) {
					return greatestProcessedTimestamp;
				}
			}
			return acc;
		}, this.afterTimestamp);
	}

	async run(shouldAbort) {
		let query = {};
		let earliestTimestap = await this.getEarliestTimestap();
		if (earliestTimestap) {
			query.ts = {'$gt': earliestTimestap};
		}
		if (this.lastTs) {
			query.ts = {'$gt': this.lastTs};
		}
		if (this.getEventTypes().length > 0) {
			query['events.eventClass'] = {'$in': this.getEventTypes()};
		}

		const cursor = this.collection.find(query, {sort: {ts: 1}});
		this.totalEventCount = await cursor.count();
		while (await cursor.hasNext()) {
			if (shouldAbort && await shouldAbort()) {
				this.log(`aborted`);
				return;
			}
			const document = await cursor.next();
			await this.processDocument(document)
		}
		this.log(`done processing ${this.countEvents} events`);
		await this.notifyReadmodelsTailingStarted();
		if (this.shouldTail()) {
			this.log(`now, we are tailing...`);
			this.continueToListen();
		}
	}

	shouldTail() {
		return this.readmodels.reduce((acc, readmodel) => {
			return acc || readmodel.shouldRunContinuously();
		}, false);
	}

	log(what) {
		console.log(`${this.name}#`, what);
	}
}

module.exports = EventStoreReader;
