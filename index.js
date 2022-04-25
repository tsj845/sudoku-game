const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { ipcRenderer } = require("electron");

if (!fs.existsSync("./data.json")) {
    fs.writeFileSync("./data.json", "{}", {encoding:"utf-8"});
}

const { Events, GameState, GameEvents } = require("./Events");
const { Data } = require("./Data");

// do cleanup before the window is closed
window.addEventListener("beforeunload", () => {
    fs.writeFileSync("./data.json", Data.save(), {encoding:"utf-8"});
});

// load saved data
Data.load(JSON.parse(fs.readFileSync("./data.json", {encoding:"utf-8"})));

/**@type {HTMLDialogElement} */
const PauseMenu = document.getElementById("pause-menu");
/**@type {HTMLSpanElement} */
const GameTimer = document.getElementById("game-time");

class electronAPI {
    static kill () {
        ipcRenderer.send("imperative:kill");
    }
    static log (...args) {
        ipcRenderer.send("debug:log", args);
    }
}

GameEvents.register("ANY", (oname, ...odata) => {
    electronAPI.log(`EVENT: ${oname} data: ${odata.join(", ")}`);
});

document.getElementById("pause-menu-open").addEventListener("click", ()=>{GameEvents.trigger(Events.PlayState.Pause)});
document.getElementById("pause-menu-close").addEventListener("click", ()=>{GameEvents.trigger(Events.PlayState.Play)});

GameEvents.register(Events.LifeCycle.Kill, () => {
    electronAPI.kill();
});

GameEvents.register(Events.LifeCycle.Error, () => {
    electronAPI.log(new Error().stack);
});

GameEvents.register(Events.Timer.Update, (time) => {
    GameTimer.textContent = `${(time-time%60)/60}:${(time%60).toString().padStart(2, "0")}`;
});

GameEvents.register(Events.PlayState.Pause, () => {
    PauseMenu.showModal();
});

GameEvents.register(Events.PlayState.Play, () => {
    PauseMenu.close();
});

GameEvents.register(Events.Game.New, () => {
    generate_board();
});

/**@type {HTMLSelectElement} */
const DifficultySelect = document.getElementById("difficulty-select");

/**
 * @class
 * @property {{0:Number,1:Number,2:Number}} levels 
 * @readonly @property {Number} current
*/
let Difficulty = {
    levels : {
        0 : 42,
        1 : 52,
        2 : 65
    },
    get current () {
        return DifficultySelect.selectedIndex;
    }
};

/**@type {HTMLDivElement} */
const board_div = document.getElementById("board");
/**@type {HTMLInputElement} */
const AutocheckButton = document.getElementById("autocheck-btn");

/**@type {{c:Array<Array<Number>>,g:Array<Array<Number>>,p:Array<Array<Array<Number>>>}} */
let board = {
    c : [],
    g : [],
    p : []
};
/**@type {Array<Array<Number>>} */
let answers = [];

/**@type {{x:Number,y:Number}} */
let position = {
    x : 0,
    y : 0,
    reset () {
        this.x = 0;
        this.y = 0;
    },
    valid (dir) {
        return (this.x + dir[0] >= 0 && this.x + dir[0] < 9 && this.y + dir[1] >= 0 && this.y + dir[1] < 9);
    },
    update (dir) {
        this.x += dir[0];
        this.y += dir[1];
    }
};

function deactivate_board () {
    board_div.querySelectorAll(".active").forEach((elem) => {elem.classList.remove("active")});
    board_div.querySelector(".selected").classList.remove("selected");
}

function activate_board () {
    let bx = position.x - position.x % 3;
    let by = position.y - position.y % 3;
    for (let y = 0; y < 3; y ++) {
        for (let x = 0; x < 3; x ++) {
            board_div.children[by*9+bx+y*9+x].classList.add("active");
        }
    }
    for (let y = 0; y < 9; y ++) {
        board_div.children[y*9+position.x].classList.add("active");
    }
    for (let x = 0; x < 9; x ++) {
        board_div.children[position.y*9+x].classList.add("active");
    }

    board_div.children[position.y*9+position.x].classList.add("selected");
}

function create_board () {
    board_div.replaceChildren();
    for (let y = 0; y < 9; y ++) {
        for (let x = 0; x < 9; x ++) {
            /**@type {HTMLDivElement} */
            const d = document.createElement("div");
            d.style.setProperty("--y", y);
            d.style.setProperty("--x", x);
            d.addEventListener("click", () => {
                deactivate_board();
                d.classList.add("active");
                position.x = x;
                position.y = y;
            });
            board_div.appendChild(d);
        }
    }
    position.reset();
    activate_board();
}

create_board();

function redisplay_board () {
    for (let y = 0; y < 9; y ++) {
        for (let x = 0; x < 9; x ++) {
            /**@type {HTMLDivElement} */
            const div = board_div.children[y*9+x];
            if (board.c[y][x] > 0) {
                div.textContent = board.c[y][x];
                div.classList.add("constant");
                div.classList.remove("guess");
            } else if (board.g[y][x] > 0) {
                div.textContent = board.g[y][x];
                div.classList.add("guess");
                div.classList.remove("constant");
            } else {
                div.textContent = "";
                div.classList.remove("guess", "constant");
            }
        }
    }
    win_proto();
}

/**
 * 
 * @returns {Boolean}
 */
function check_win () {
    for (let y = 0; y < 9; y ++) {
        for (let x = 0; x < 9; x ++) {
            if (answers[y][x].toString() !== board_div.children[y*9+x].textContent) {
                return false;
            }
        }
    }
    return true;
}

function win_proto () {
    if (check_win()) {
        document.getElementById("new-game-btn").focus();
    }
}

/**
 * @returns {Array<Array<Number>>}
 */
function regenerate_guess_list () {
    let f = [];
    for (let i = 0; i < 9; i ++) {
        let l = [];
        for (let j = 0; j < 9; j ++) {
            l.push(0);
        }
        f.push(l);
    }
    return f;
}

/**
 * @returns {Array<Array<Array<Number>>>}
 */
function regenerate_pencil_list () {
    let f = [];
    for (let i = 0; i < 9; i ++) {
        let l = [];
        for (let j = 0; j < 9; j ++) {
            l.push([]);
        }
        f.push(l);
    }
    return f;
}

/**@type {Array<Array<Number>} */
let gchoices = [];

for (let y = 0; y < 9; y ++) {
    for (let x = 0; x < 9; x ++) {
        gchoices.push([y, x]);
    }
}

function generate_board () {
    child_process.execSync(`python3 generator.py board.json ${Difficulty.levels[Difficulty.current]} ${GameState.LevelSeed().toString().split(".").join("").split("e")[0]}`);
    let output = JSON.parse(fs.readFileSync(path.join(__dirname, "board.json")));
    answers = output[0];
    board.c = output[1];
    board.g = regenerate_guess_list();
    board.p = regenerate_pencil_list();
    position.reset();
    redisplay_board();
    cycle_board_highlight();
    deactivate_board();
    activate_board();
}

generate_board();

class KeyBinds {
    static MOTION = {
        UP : "0",
        DOWN : "1",
        LEFT : "2",
        RIGHT : "3",
    }
    static INPUT = {
        DELETE : "0",
    }
    static STATE = {
        TOGGLE_PAUSE : "0",
    }
    static bound = {
        MOTION : "MOTION",
        INPUT : "INPUT",
        STATE : "STATE",
    }
    static data = {
        "MOTION" : {
            0 : ["ArrowUp", "KeyW"],
            1 : ["ArrowDown", "KeyS"],
            2 : ["ArrowLeft", "KeyA"],
            3 : ["ArrowRight", "KeyD"],
        },
        "INPUT" : {
            0 : ["Backspace", "Digit0"],
        },
        "STATE" : {
            0 : ["Escape"],
        }
    }
    static get (area, key) {
        let searchspace = KeyBinds.data[area];
        for (const id in searchspace) {
            if (searchspace[id].includes(key)) {
                return id;
            }
        }
    }
}

function unhighlight_board () {
    board_div.querySelectorAll(".matching").forEach((elem) => {elem.classList.remove("matching")});
}

/**
 * 
 * @param {Number} num 
 */
function highlight_board (num) {
    for (let y = 0; y < 9; y ++) {
        for (let x = 0; x < 9; x ++) {
            const c = board_div.children[y*9+x];
            if (c.textContent === num.toString()) {
                c.classList.add("matching");
            }
        }
    }
}

/**
 * @returns {Number}
 */
function get_pnum () {
    const v = board_div.children[position.y*9+position.x].textContent;
    return Number(v).toString() === "NaN" ? 0 : Number(v);
}

function cycle_board_highlight () {
    unhighlight_board();
    setTimeout(()=>{highlight_board(get_pnum())}, 1);
}

document.addEventListener("keydown", (e) => {
    const key = e.code.toString();

    if (!(key.startsWith("Arrow") || key.startsWith("Key"))) {
        return;
    }

    const res = KeyBinds.get(KeyBinds.bound.MOTION, key);

    let dir = res === KeyBinds.MOTION.UP ? [0,-1] : res === KeyBinds.MOTION.DOWN ? [0,1] : res === KeyBinds.MOTION.LEFT ? [-1,0] : res === KeyBinds.MOTION.RIGHT ? [1,0] : [0, 0];

    if (position.valid(dir)) {
        deactivate_board();
        position.update(dir);
        activate_board();
        cycle_board_highlight();
    }
});

document.addEventListener("keyup", (e) => {
    const key = e.code.toString();

    if (KeyBinds.get(KeyBinds.bound.INPUT, key) === KeyBinds.INPUT.DELETE) {
        board.g[position.y][position.x] = 0;
        cycle_board_highlight();
        redisplay_board();
        return;
    }

    if (KeyBinds.get(KeyBinds.bound.STATE, key) === KeyBinds.STATE.TOGGLE_PAUSE) {
        if (GameState.PAUSED) {
            GameEvents.trigger(Events.PlayState.Play);
        } else {
            GameEvents.trigger(Events.PlayState.Pause);
        }
        return;
    }

    if (!key.startsWith("Digit")) {
        return;
    }

    const v = Number(key.slice(key.length-1));

    if (v > 0) {
        board.g[position.y][position.x] = v === board.g[position.y][position.x] ? 0 : v;
        if (GameState.AutoChecking) {
            check_cell(position.x, position.y);
        }
        cycle_board_highlight();
        redisplay_board();
    }
});

/**
 * 
 * @param {Number} x 
 * @param {Number} y 
 * @param {Boolean} redisp
 */
function check_cell (x, y, redisp) {
    x = x || position.x;
    y = y || position.y;
    if (board.c[y][x] > 0) {
        return;
    }
    if (board.g[y][x] === answers[y][x]) {
        board.c[y][x] = answers[y][x];
    } else {
        board.g[y][x] = 0;
    }

    if (redisp) {
        redisplay_board();
        cycle_board_highlight();
    }
}

function check_board () {
    for (let y = 0; y < 9; y ++) {
        for (let x = 0; x < 9; x ++) {
            check_cell(x, y);
        }
    }
    redisplay_board();
    cycle_board_highlight();
}

/**
 * 
 * @param {Number} x 
 * @param {Number} y 
 * @param {Boolean} redisp
 */
function reveal_cell (x, y, redisp) {
    x = x || position.x;
    y = y || position.y;
    if (board.c[y][x] > 0) {
        return;
    }
    board.c[y][x] = answers[y][x];

    if (redisp) {
        redisplay_board();
        cycle_board_highlight();
    }
}

function reveal_board () {
    for (let y = 0; y < 9; y ++) {
        for (let x = 0; x < 9; x ++) {
            reveal_cell(x, y);
        }
    }
    redisplay_board();
    cycle_board_highlight();
}

document.getElementById("new-game-btn").addEventListener("click", generate_board);
document.getElementById("check-cell-btn").addEventListener("click", ()=>{check_cell(undefined, undefined, true)});
document.getElementById("check-board-btn").addEventListener("click", check_board);
document.getElementById("reveal-cell-btn").addEventListener("click", ()=>{reveal_cell(undefined, undefined, true)});
document.getElementById("reveal-board-btn").addEventListener("click", reveal_board);
AutocheckButton.addEventListener("click", ()=>{AutocheckButton.value = AutocheckButton.value === "off" ? "on" : "off";GameEvents.trigger(Events.Help.AutoCheckingToggle)});

// LIFECYCLE ~ ERROR
// GameEvents.register(Events.LifeCycle.Error, () => {
//     GameEvents.trigger(Events.LifeCycle.Kill);
// });