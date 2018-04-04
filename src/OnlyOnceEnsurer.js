/*
 * Copyright (c) 2018 Constantin Galbenu <gica.galbenu@gmail.com>
 */

class OnlyOnceEnsurer
{
    constructor() {
        this.processedEventIds = {};
    }

    isEventAlreadyProcessed(event) {
        return this.processedEventIds[`${event.id}`];
    }

    markEventAsProcessed(event) {
        this.processedEventIds[`${event.id}`] = true;
    }
}

module.exports = OnlyOnceEnsurer;