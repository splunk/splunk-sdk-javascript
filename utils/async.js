(function() {
    var root = exports || this;

    // A definition for an asynchronous while loop. The "complexity" comes from the
    // fact thathat we allow asynchronisity both in the condition and in the body. The function takes three parameters:
    // * A condition function, which takes a callback, whose only parameter is whether the condition was met or not.
    // * A body function, which takes a no-parameter callback. The callback should be invoked when the body of the loop has finished.
    // * A done function, which takes no parameter, and will be invoked when the loop has finished.
    root.while = function(obj) {
            if (obj.condition()) {
                obj.body( function() { root.while(obj); });
            }
            else {
                obj.done();
            }
        }
})();