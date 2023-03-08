const Sequelize = require('sequelize');
const sequelize = require('../src/db.js');

const Comment = sequelize.define("comment", {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true, 
    },
    comment: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    post_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
});

module.exports = Comment;