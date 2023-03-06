const db = require('mysql2');

module.exports = db.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'etite_express_blog'
});