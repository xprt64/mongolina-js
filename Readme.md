# JavaScript connector for a Dudulina Event store

This module permits building a Readmodel-updater by using Javascript. 
It fetches the events from the Event store and calls the appropriate methods on the Readmodel.

By default, the Readmodel continues to receive the new events even after all the previously emitted events are fetched 
from the Event store; it does this by tailing the Event store.

This behavior can be disabled by calling `Readmodel.stopAfterInitialProcessing()`.