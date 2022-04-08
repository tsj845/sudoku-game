/**@type {HTMLDivElement} */
const board_div = document.getElementById("board");

/**@type {Array<Array<Number>>} */
let board = [];

for (let y = 0; y < 9; y ++) {
    let l = [];
    for (let x = 0; x < 9; x ++) {
        l.push(0);
        /**@type {HTMLDivElement} */
        const d = document.createElement("div");
        d.style.setProperty("--y", y);
        d.style.setProperty("--x", x);
        board_div.appendChild(d);
    }
    board.push(l);
}