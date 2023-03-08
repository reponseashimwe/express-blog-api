const Sequelize = require('sequelize');




// module.exports = db.createConnection({
//     host: 'localhost',
//     user: 'root',
//     password: '',
//     database: 'etite_express_blog'
// });

const sequelize = new Sequelize('projects_sequelize', 'root', '', {
    dialect: 'mysql',
    host: 'localhost'
});

module.exports = sequelize;