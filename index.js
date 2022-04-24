const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { ipcRenderer } = require("electron");

class electronAPI {
    static log (...args) {
        ipcRenderer.send("debug:log", args);
    }
}

let Difficulty = {
    levels : {
        0 : 42,
        1 : 52,
        2 : 65
    },
    current : 1,
};

/**@type {HTMLDivElement} */
const board_div = document.getElementById("board");

/**@type {{c:Array<Array<Number>>,g:Array<Array<Number>>,p:Array<Array<Array<Number>>>}} */
let board = {c:[],g:[],p:[]};
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

function clear_some_constants () {
    let removing = Difficulty.levels[Difficulty.current];

    let choices = JSON.parse(JSON.stringify(gchoices));

    while (removing > 0) {
        const choice = choices.splice(Math.floor(Math.random()*choices.length), 1)[0];
        board.c[choice[0]][choice[1]] = 0;
        removing --;
    }
}

function generate_board () {
    child_process.execSync("python3 generator.py board.json");
    answers = JSON.parse(fs.readFileSync(path.join(__dirname, "board.json")));
    board.c = JSON.parse(JSON.stringify(answers));
    board.g = regenerate_guess_list();
    board.p = regenerate_pencil_list();
    clear_some_constants();
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
    static bound = {
        MOTION : "MOTION",
        INPUT : "INPUT",
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

    if (!key.startsWith("Digit")) {
        return;
    }

    const v = Number(key.slice(key.length-1));

    if (v > 0) {
        board.g[position.y][position.x] = v === board.g[position.y][position.x] ? 0 : v;
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