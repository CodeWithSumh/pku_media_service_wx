const { Queue } = require('../scripts/queue.js'); 

var q = new Queue();
q.enqueue('a');
q.enqueue('b');
q.enqueue('c');
console.log('After enqueue:', q.dataStore);

// var removed = q.remove ? q.remove(1) : remove.call(q, 1);
q.remove ? q.remove(1) : remove.call(q, 1);
console.log('Removed:', 1);
console.log('After remove:', q.dataStore);