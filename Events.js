/**
 * @file declares and does boilerplate on all game events throughout the entire client side lifecycle
 */

const crypto = require("crypto");

/**
 * @description Enum for all game events
 */
const Events = {
    LifeCycle : {
        Kill : "LIFECYCLE~KILL",
        Error : "LIFECYCLE~ERROR",
    },
    Game : {
        New : "GAME~NEW",
        End : "GAME~END",
    },
    PlayState : {
        Pause : "PLAYSTATE~PAUSE",
        Play : "PLAYSTATE~PLAY",
        Lock : "PLAYSTATE~LOCK",
        Unlock : "PLAYSTATE~UNLOCK",
    },
    Timer : {
        Stop : "TIMER~STOP",
        Start : "TIMER~START",
        Reset : "TIMER~RESET",
        Update : "TIMER~UPDATE",
    },
    Help : {
        AutoCheckingToggle : "HELP~AUTOCHECKINGTOGGLE",
    }
}

/**
 * @class
 * @property {Boolean} LOCKED - input lock
 * @property {Boolean} AutoChecking - autocheck board input
 * @description stores game states
 */
 const GameState = {
    PAUSED : false,
    LOCKED : false,
    AutoChecking : false,
    Level : {
        series : 0,
        level : 0,
    },
    LevelSeed () {
        const hasher = crypto.createHash("md5");
        hasher.update(`${this.Level.series}-${this.Level.level}`);
        return Number.parseInt(hasher.digest("hex"), 16);
    },
    /**
     * @property {Boolean} RUNNING
     * @property {Number} time
     */
    Timer : {
        /**@readonly */
        RUNNING : false,
        /**@readonly */
        time : 0,
        /**@readonly @private */
        timeoutid : 0,
        Start () {
            if (this.RUNNING) {
                return;
            }
            this.RUNNING = true;
            this.Update();
        },
        Stop () {
            if (!this.RUNNING) {
                return;
            }
            this.RUNNING = false;
            clearTimeout(this.timeoutid);
        },
        Reset () {
            this.RUNNING = false;
            clearTimeout(this.timeoutid);
            this.time = 0;
        },
        /**@private */
        Update () {
            // electronAPI.log(JSON.stringify(this));
            this.time += 1;
            // electronAPI.log(this.time);
            GameEvents.trigger(Events.Timer.Update, this.time);
            // electronAPI.log(this.time);
            if (this.RUNNING) {
                // electronAPI.log("ANOTHER");
                this.timeoutid = setTimeout(()=>{this.Update()}, 1000);
            }
        },
    },
};

/**
 * @callback EventHandler
 */

/**
 * @typedef {Array<EventHandler>} EvArray
 */

/**
 * @description handles event firings and callbacks
 */
 const GameEvents = {
    registered : {
        "ANY" : [],
        "LIFECYCLE~KILL" : [],
        "LIFECYCLE~ERROR" : [],
        "GAME~NEW" : [],
        "GAME~END" : [],
        "PLAYSTATE~PAUSE" : [],
        "PLAYSTATE~PLAY" : [],
        "PLAYSTATE~LOCK" : [],
        "PLAYSTATE~UNLOCK" : [],
        "TIMER~STOP" : [],
        "TIMER~START" : [],
        "TIMER~RESET" : [],
        "TIMER~UPDATE" : [],
        "HELP~AUTOCHECKINGTOGGLE" : [],
    },
    /**
     * @param {String} ename - name of event to listen for
     * @param {EventHandler} f - callback function
     */
    register (ename, f) {
        /**@type {EvArray} */
        let listeners = this.registered[ename];
        listeners.push(f);
    },
    // /**
    //  * @param {String} ename 
    //  * @param {EventHandler} f 
    //  */
    // cancel (ename, f) {
    //     /**@type {EvArray} */
    //     let listeners = this.registered[ename];
    //     for (let i = listeners.length - 1; i >= 0; i --) {
    //         if (listeners[i].name === f.name) {
    //             listeners.splice(i, 1);
    //         }
    //     }
    //     this.registered[ename] = listeners;
    // },
    /**
     * @param {String} ename - name of event to trigger
     * @param {...any} data - data to be passed to callbacks
     */
    trigger (ename, ...data) {
        // if (ename !== "ANY") {
        //     this.trigger("ANY", ename, ...data);
        // }
        /**@type {EvArray} */
        let listeners = this.registered[ename];
        for (let i = 0; i < listeners.length; i ++) {
            listeners[i](...data);
        }
    }
};

/**
 * Event boilerplate for event propagation to allow for events to trigger other events
 */

// PLAYSTATE ~ PAUSE & PLAY
GameEvents.register(Events.PlayState.Pause, () => {
    GameState.PAUSED = true;
    GameEvents.trigger(Events.Timer.Stop);
});

GameEvents.register(Events.PlayState.Play, () => {
    GameState.PAUSED = false;
    GameEvents.trigger(Events.Timer.Start);
});

// GAME ~ NEW & END
GameEvents.register(Events.Game.New, () => {
    GameEvents.trigger(Events.PlayState.Unlock);
    GameEvents.trigger(Events.Timer.Reset);
    GameEvents.trigger(Events.PlayState.Play);
});

GameEvents.register(Events.Game.End, () => {
    GameEvents.trigger(Events.Timer.Stop);
    GameEvents.trigger(Events.PlayState.Lock);
});

// LOCK STATES
GameEvents.register(Events.PlayState.Lock, () => {
    GameState.LOCKED = true;
});

GameEvents.register(Events.PlayState.Unlock, () => {
    GameState.LOCKED = false;
});

// TIMER ~ START & STOP & RESET
GameEvents.register(Events.Timer.Start, () => {
    GameState.Timer.Start();
});

GameEvents.register(Events.Timer.Stop, () => {
    GameState.Timer.Stop();
});

GameEvents.register(Events.Timer.Reset, () => {
    GameState.Timer.Reset();
});

// HELP ~ AUTOCHECKINGTOGGLE
GameEvents.register(Events.Help.AutoCheckingToggle, () => {
    GameState.AutoChecking = !GameState.AutoChecking;
});

exports.Events = Events;
exports.GameState = GameState;
exports.GameEvents = GameEvents;