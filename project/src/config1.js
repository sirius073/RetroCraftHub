const mongoose = require("mongoose");

const connect = mongoose.connect("mongodb://localhost:27017/login");

connect.then(() => {
    console.log("Database connected successfully");
}).catch(() => {
    console.log("not connected");
});

const LoginSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    profession:{
        type: String
    },
    experience: {
        type: String
    },

   projects: {
        type: String
    },
    jobPreferences:[{
        job: String,
        jobExperience: Number,
        
    }],
    about: {
        type: String,
        default: ""
    },
    profileImage: {
        type: String,
        default: ""
    },
    contactDetails:{
        phone: {
            type: String,
            
          },
          address: {
            type: String,
            
          },
          email: {
            type: String,
            
          }
    }
});

const collection = new mongoose.model("recruiters", LoginSchema);

module.exports = collection;
