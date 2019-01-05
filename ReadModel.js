/*
 * Copyright (c) 2018 Constantin Galbenu <gica.galbenu@gmail.com>
 */

const OnlyOnceEnsurer = require("./OnlyOnceEnsurer");

class ReadModel {
    constructor(options = {}) {
        this.options = {
            runContinuously: true
            , ...options
        };

        this.onlyOnceEnsurer = new OnlyOnceEnsurer();
        this.callbacks = {};
        this.anyCallbacks = [];
        this.afterTimestamp = {};
        this._tailingHasStarted = {};
    }

    async init(options){

    }

    needsCollection(){
        return false;
    }

    needsDatabase(){
        return false;
    }

    on(eventClass, callback) {
        if (!this.callbacks[eventClass]) {
            this.callbacks[eventClass] = [];
        }
        this.callbacks[eventClass].push(callback);
        return this;
    }

    onAny(callback) {
        this.anyCallbacks.push(callback);
        return this;
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
        return Object.keys(this.callbacks);
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
        if (this.callbacks[event.type]) {
            await Promise.all( this.callbacks[event.type].map(callback => callback(event) ));
        }
        await Promise.all( this.anyCallbacks.map(callback => callback(event)) );
    }

    tailingStarted(source){
        this._tailingHasStarted[source] = true;
    }

    hasTailingStarted(source){
        return true === this._tailingHasStarted[source];
    }
}

module.exports = ReadModel;