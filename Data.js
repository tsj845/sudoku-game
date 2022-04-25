/**
 * @description stores game data
 */
const Data = {
    data : {
        series : 0,
        level : -1,
        time : 0,
        had_level_open : false,
        unlocked : {
            endless : false,
            series : 0,
            level : 0,
        }
    },
    save () {
        return JSON.stringify(this.data);
    },
    load (obj) {
        for (const key in obj) {
            if (key in this.data) {
                this.data[key] = obj[key];
            }
        }
    },
};

exports.Data = Data;