var rtodd = rtodd || {}

rtodd.henka = (function henka() {

    //setting ECMA5 standards, lets get out deprecated code
    'use strict';

    //config options to setup henka to make sure we
    //can provide modularity for future enhancements
    var config = {
        'options': {
            'client_timeout': '100' //in ms the amount of time to consider 'resizing stopped'
        },
        'default_match_provider': 'view-port'
    };

    henka.props = {
            //holds the switches that are added through the API
            'switches': [],
            'last_width': 0
    };

    henka.tools = {
        'is_mobile_device': function () {
            //this list could be more complete
            var i = 0,
                device_ua = ['iPad', 'iPhone', 'iPod', 'Android', 'webOS', 'BlackBerry', 'Windows Phone'];

            for (; i < device_ua.length; i++) {
                if (navigator.platform === device_ua[i]) {
                    return true;
                }
            }
            return false;
        }
    };

    henka.core = {
        'match_manager': {
            'match': function (data) {
                //get match from provider
                var is_match = henka.providers[config.default_match_provider].provideMatch({
                    'query': data.query
                });

                return is_match;
            }
        },
        'update_manager': {
            'update': {

                'one': function (data) {

                    //an update provider needs to provide a one function
                    //and an all function in the update object
                    //I wrote a single func
                    //
                    //one calls into my all
                    henka.core.update_manager.update.all({
                        'current_pos': data.switch_index,
                        'single': true
                    });
                },

                'all': function update(data) {

                    var _data = data || {}
                    var current_pos = _data.current_pos || 0;

                    //run this recursive loop with a settime out to stack in the secondary que
                    //keeps our CPU throttling lower than mq.events, allows faster lead-time
                    //to execution vs an array loop
                    if (current_pos == (henka.props.switches.length)) {
                        return false;
                    }
                    var next_pos = current_pos + 1;

                    setTimeout(function () {
                        //call into the match_manager defined in config,
                        //it will pass back bool if the switch should run
                        var should_run = henka.core.match_manager.match({
                            query: henka.props.switches[current_pos].query
                        });

                        //if the switch should be run, call into the update_manager's
                        //run command
                        henka.core.update_manager.run({
                            'switch': henka.props.switches[current_pos],
                            'matched': should_run
                        });

                        if (!_data.single) {
                            update({
                                'current_pos': next_pos
                            });
                        }

                    }, 0);
                }

            },
            'run': function run(data) {
                //run the switch prop's update method
                //pass back the match result, and the switch
                //data['switch'].update(data.matched, data['switch']);
                var matched = data.matched;
                var _switch = data['switch'];

                var process_data = function () {
                    var temp = _switch.data;
                    if (typeof (_switch.data) == 'function') {
                        //if data is a method, execute that method, pass data
                        temp = _switch.data(_switch);
                    }
                    return temp;
                }
                //this is an update method that is attached to a switch
                //I'm passing the switch here, with _switch - Not sure how I would
                //be able to reference it's parent otherwise.
                if (_switch.init) {
                    if (!_switch.init.didRun) {
                        //if the switch wasn't intialized, then initialize it
                        _switch.init(process_data(_switch.data));
                        _switch.init.didRun = true;
                    }
                }
                if (matched) {
                    if(_switch.resize) {
                      //if a resize is defined then run the resize every time we calculate the throttled
                      //resize
                      _switch.resize(process_data(_switch.data));
                    }
                    if (_switch.on) {
                        //if a match occures, and it hasn't matched previously
                        //then run on, and set wasMatched
                        if (!_switch.wasMatched) {
                            _switch.wasMatched = true;
                            _switch.on(process_data(_switch.data));
                        }
                    }
                }
                if (!matched && _switch.wasMatched) {
                    _switch.wasMatched = false;
                    if (_switch.off) {
                        //if it was previously matched, and is not matched now, then
                        //run off, and set wasMatched to false
                        _switch.off(process_data(_switch.data));
                    }
                }
            }

        }
    }

    //matching providers
    henka.providers = {
        'view-port': {
            'provideMatch': function (data) {
                //view-port provider matches
                var width = window.innerWidth || document.documentElement.clientWidth;

                if (data.query.min != undefined && data.query.max == undefined) {
                    return (width >= data.query.min);
                }

                if (data.query.max != undefined && data.query.min == undefined) {
                    return (width <= data.query.max);
                }

                if (data.query.min != undefined && data.query.max != undefined) {
                    return (width >= data.query.min && width <= data.query.max);
                }

                return false;
            }
        }
    }

    //henka platform centric
    henka.platform = {
        'attach_listener': function (data) {
            //window resize timing, detect when resizing has slowed
            //and reset the runner
            //we run at the start of the resize event
            var rtime = new Date("2000-01-01T12:00:00.000Z"),
                timeout = false,
                delta = config.options.client_timeout,
                didrun = false,

                update = function () {
                    if (didrun == false) {
                        didrun = true;
                        setTimeout(function () {
                            henka.core.update_manager.update.all();
                        }, 0);
                    }
                },
                resizeend = function () {
                    if (new Date() - rtime < delta) {
                        setTimeout(resizeend, 0);
                    } else {
                        timeout = false;
                        didrun = false;

                        if (!henka.tools.is_mobile_device()) {
                            //don't run twice, only run here if this is desktop
                            //we run at the end of the resize occurance
                            update();
                        }
                    }
                },
                resize = function () {
                    //check to see if the window size changed before running anything
                    var current_width = window.innerWidth;
                    if (henka.props.last_width != current_width) { //this keeps us from firing during height change
                        if (henka.tools.is_mobile_device()) {
                            update(); //run switches at the start of the resize event for mobile
                            //mobile generally only has a single resize 'pop'
                        }

                        rtime = new Date();
                        if (timeout === false) {
                            timeout = true;
                            setTimeout(resizeend, delta);
                        }
                    }
                    henka.props.last_width = current_width;
                }
                //event listener
            if (window.addEventListener) {
                window.addEventListener("resize", resize, false);
            } else {
                window.attachEvent("onresize", resize);
            }
        },
        'boot_henka': function (data) {
            //get the current width of the window
            henka.props.last_width = window.innerWidth;
            //controls the management of henka init runnables
            henka.platform.attach_listener();
        }
    };

    //initialize henka
    henka.run_result = henka.platform.boot_henka();

    //return chainable api
    return function api(query, data) {
        var is_func = function (func) {
            //check if func is a function, if not return undefined
            if (!typeof (func) == 'function') {
                return undefined
            }
            return func
        }

        if(query){

          //push a new switch to the stack
          var switch_index = henka.props.switches.push({}) - 1

          //make reference to the switch
          api._switch = henka.props.switches[switch_index];

          api._switch.query = query;
          api._switch.data = data;

        }

        //the api is binding passed functions to the switches states
        api.init = function (func) {
            api._switch.init = is_func(func);
            return api;
        }

        api.on = function (func) {
            api._switch.on = is_func(func);
            return api;
        }

        api.off = function (func) {
            api._switch.off = is_func(func);
            return api;
        }

        //the api is binding passed data to the switches states
        api.data = function (data) {
            api._switch.data = data;
            return api;
        }

        api.resize = function (func) {
            api._switch.resize = is_func(func);
            return api;
        }

        api.update = function (matched) {
            //run the switch to check for match?
            if (matched) {
                henka.core.update_manager.update.one({
                    'switch_index': switch_index,
                    'single': true
                });
            } else {

                //initialize
                henka.props.switches[switch_index] = api._switch.update(matched, api._switch);
            }


            //return api for moar chaining!
            return api;
        }

        api.$ = henka;

        return api;

    }


}());
