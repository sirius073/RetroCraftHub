const mongoose = require("mongoose");

const connect = mongoose.connect("mongodb://localhost:27017/login");

connect.then(() => {
    console.log("Database connected successfully");
}).catch(() => {
    console.log("not connected");
});

const Notification = new mongoose.Schema({
    type: {
        type: String,
        enum: ['freelancer', 'recruiter'],
        required: true,
    },
    rId:{
        type:String,
        required: true,
    },
    rname: {
        type: String,
        required: true
    },
    fId: {
        type: String,
        required: true
    },
    timestamp: { type: Date, default: Date.now },   
    message : {
        type:String,
        required:false
    },
  
});

const notification = new mongoose.model("notification",Notification);

module.exports = notification;
