/*
 * Copyright (c) 2018 Constantin Galbenu <gica.galbenu@gmail.com>
 */

const OnlyOnceEnsurer = require("./OnlyOnceEnsurer");

class ReadModelUpdater {
	constructor(options = {}) {
		this.options = {
			runContinuously: true
			, ...options
		};

		this.onlyOnceEnsurer = new OnlyOnceEnsurer();
		this.eventListeners = options.eventListeners;
		this.afterTimestamp = {};
		this._tailingHasStarted = {};
		this.needsCollection = options.needsCollection;
		this.needsDatabase = options.needsDatabase;
	}

	async init(options) {

	}

	continueToRunAfterInitialProcessing() {
		this.options.runContinuously = true;
		return this;
	}

	stopAfterInitialProcessing() {
		this.options.runContinuously = false;
		return this;
	}

	after(timestamp, eventSourceName) {
		this.afterTimestamp[eventSourceName] = timestamp;
		return this;
	}

	getEventTypes() {
		return Object.keys(this.eventListeners);
	}

	shouldRunContinuously() {
		return this.options.runContinuously;
	}

	/**
	 * @returns {null|MongoDB.Timestamp}
	 */
	async getGreatestProcessedTimestamp(eventSourceName) {
		return this.afterTimestamp[eventSourceName];
	}

	isEventAlreadyProcessed(event) {
		return this.onlyOnceEnsurer.isEventAlreadyProcessed(event);
	}

	markEventAsProcessed(event) {
		this.onlyOnceEnsurer.markEventAsProcessed(event);
	}

	async processEvent(event) {
		if (this.isEventAlreadyProcessed(event)) {
			return;
		}
		this.markEventAsProcessed(event);
		await this._processEvent(event);
	}

	async _processEvent(event) {
		let processed = false;
		this.lastTs = event.meta.ts;
		if (this.eventListeners[event.type]) {
			if ('map' in this.eventListeners[event.type]) {
				await Promise.all(this.eventListeners[event.type].map(callback => callback(event)));
				processed = true;
			} else if (typeof (this.eventListeners[event.type]) === 'function') {
				await this.eventListeners[event.type](event);
				processed = true;
			}
		}
		if (this.eventListeners['*']) {
			await this.eventListeners['*'](event);
			processed = true;
		}
		return processed;
	}

	tailingStarted(source) {
		this._tailingHasStarted[source] = true;
	}

	hasTailingStarted(source) {
		return true === this._tailingHasStarted[source];
	}
}

module.exports = ReadModelUpdater;