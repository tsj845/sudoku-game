const { app, BrowserWindow, ipcMain } = require("electron");

function createWindow () {
    const win = new BrowserWindow({
        webPreferences: {
            contextIsolation : false,
            nodeIntegration : true
        }
    });
    win.loadFile("index.html");
}

app.whenReady().then(() => {
    ipcMain.on("debug:log", (_, args) => {console.log(...args)});

    createWindow();
});

app.on("window-all-closed", () => {
    app.quit();
});