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
    after(timestamp) {
        this.afterTimestamp = timestamp;
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
    getGreatestProcessedTimestamp() {
        return this.afterTimestamp;
    }

    isEventAlreadyProcessed(event) {
        return this.onlyOnceEnsurer.isEventAlreadyProcessed(event);
    }

    markEventAsProcessed(event) {
        this.onlyOnceEnsurer.markEventAsProcessed(event);
    }

    processEvent(event) {
        if (this.isEventAlreadyProcessed(event)) {
            return;
        }
        this.markEventAsProcessed(event);
        this._processEvent(event);
    }

    _processEvent(event) {
        this.lastTs = event.meta.ts;

        if (this.callbacks[event.type]) {
            this.callbacks[event.type].forEach(callback => {
                callback(event);
            })
        }
        this.anyCallbacks.forEach(callback => {
            callback(event);
        });
    }
}

module.exports = ReadModel;