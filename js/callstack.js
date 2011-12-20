// callstack.js by Pierce Lopez
//
// Attempts to provide a framework for chaining together steps of execution
// with setTimeout() in between, so the page remains responsive.
//
// USAGE:
// new CallstackObject(delay, startFcn, finishFcn). All arguments are optional.
// startFcn : callback for before execution of the callstack starts
// finishFcn: callback for after execution of the callstack completes
//
// A function using the callstack calls addStep() for each step, specifying a
// function for that step, and an optional argument for the function to be
// called with. After adding steps, a function must call doSteps() to properly
// register and order them. Remember that added steps will be done after the
// function that adds them completes.
//
// A parent of a function using the callstack needs to also use the callstack.
// Children of a function using the callstack, aka steps, are not required to
// use it. The top-level function will automatically trigger the start of
// execution. If these rules are followed, call order will be logical/correct.

function CallstackObject(setStartFcn, setFinishFcn)
{
    var startFcn  = ( typeof(setStartFcn ) == "function" ) ? setStartFcn  : function(){};
    var finishFcn = ( typeof(setFinishFcn) == "function" ) ? setFinishFcn : function(){};

    var callstack    = new Array(); //function, argument, function, argument...
    var tmpcallstack = new Array(); //reverse order, when adding sub-steps

    var running   = false;          //is callstack currently executing
    var worktime  = 30;             //milliseconds of work in a chunk
    var delay     =  0;             //milliseconds between work chunks

    function addStepRaw( stepFcn, arg )
    {
        // adding an undefined arg is ok
    	callstack.push( stepFcn );
    	callstack.push( arg     );
    }

    function addStep( stepFcn, arg )
    {
        // adding an undefined arg is ok
        tmpcallstack.push( arg     );
        tmpcallstack.push( stepFcn );
    }

    function doSteps()
    {
        callstack = callstack.concat( tmpcallstack.reverse() );
        tmpcallstack = new Array();

        if ( !running ) {
            running = true;
            startFcn();
            setTimeout( go, delay );
        }
    }

    function go()
    {
        var start = new Date();

        do {
            /* check if done */
            if ( callstack.length == 0 ) {
                finishFcn();
                running = false;
                return;
            }

            var arg  = callstack.pop();
            var fcn  = callstack.pop();

            fcn( arg );
        }
        while ((new Date() - start) < worktime);

        setTimeout( go, delay );
    }

    // publicize functions
    this.addStepRaw = addStepRaw;
    this.addStep = addStep;
    this.doSteps = doSteps;
}

