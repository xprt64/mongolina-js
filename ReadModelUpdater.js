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
		this.lastTs = event.meta.ts;
		if (this.eventListeners[event.type]) {
			await Promise.all(this.eventListeners[event.type].map(callback => callback(event)));
		}
		if (this.eventListeners['*']) {
			await this.eventListeners['*'](event);
		}
	}

	tailingStarted(source) {
		this._tailingHasStarted[source] = true;
	}

	hasTailingStarted(source) {
		return true === this._tailingHasStarted[source];
	}
}

module.exports = ReadModel;