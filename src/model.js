const db = require('./db');

class Model {
    constructor(db) {
        this.db = db;
    }


    setable (table) {
        this.table = table;

    }

    async insert(cols, values, timestamps = true) {
        try {
            
            const timeStamps = {cols: '', text: ''};
        
            if (timestamps) {
                const datetime = new Date();
                const timestamps_string = datetime.toISOString().slice(0, 10) +" " + datetime.toISOString().slice(11, 19);
                timeStamps.cols = ', created_at, updated_at';
                timeStamps.text = `, '${timestamps_string}', '${timestamps_string}'`;
            }
            const result = await db.promise().query(`INSERT INTO ${this.table}(${cols}${timeStamps.cols}) VALUES(${values}${timeStamps.text})`);
        } catch (err) {
            console.log(err);
        }
    }

    async get (cols = null, order = true) {
        try {
            const orderText = order ? "ORDER BY created_at DESC" : "";
            const result = await db.promise().query(`SELECT * FROM ${this.table} ${orderText}`);
            return result[0];
        } catch (err) {
            console.log(err);
        }
    }

    async exists (where) {
        try {
            const result = await db.promise().query(`SELECT * FROM ${this.table} WHERE ${where}`);
            if (result[0].length == 0) {
                return false;
            } else {
                return result[0][0];
            }
        } catch (err) {
            console.log(err);
        }
    }

    async where (where) {
        try {
            const result = await db.promise().query(`SELECT * FROM ${this.table} WHERE ${where}`);
            return result[0];
        } catch (err) {
            console.log(err);
        }
    }

    async latest () {
        try {
            const result = await db.promise().query(`SELECT * FROM ${this.table} ORDER BY id desc LIMIT 1`);
            if (result[0].length == 0) {
                return false;
            } else {
                return result[0][0];
            }
        } catch (err) {
            console.log(err);
        }
    }

    async update (set, id) {
        try {
            const result = await db.promise().query(`UPDATE ${this.table} SET ${set} WHERE id='${id}'`);
            const updated = await this.where(`id='${id}'`);
            return updated;
        } catch (err) {
            console.log(err);
        }
    }

    async delete (id) {
        try {
            const result = await db.promise().query(`DELETE FROM ${this.table} WHERE id='${id}'`);
            return true;
        } catch (err) {
            console.log(err);
        }
    }
}

module.exports = new Model(db);