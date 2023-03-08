const sequelize = require('../src/db.js');

const User = require('../models/user');
const Post = require('../models/post');
const Comment = require('../models/comment');

User.hasMany(Post, {foreignKey: 'user_id'});
User.hasMany(Comment, {foreignKey: 'user_id'});
Post.hasMany(Comment, {foreignKey: 'post_id'}); 

sequelize
    .sync()
    .then((result) => {
        // console.log(result)
    })
    .catch((err) => {
        // console.log(err);
    });

module.exports = {User, Post, Comment};