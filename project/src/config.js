const mongoose=require("mongoose");
const connect= mongoose.connect("mongodb://localhost:27017/login");
connect.then(()=>{
    console.log("Database connected successfully");
})
.catch(()=>{
    console.log("not connected")
});
const LoginSchema = new mongoose.Schema({
    name :{
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    jobProfile: {
        type: String,
        required: true,
       
    },
    jobexp: {
        type: Number,
        required: true,
        
    },
    paygrade:{
        type: Number,
    },
    about: {
        type: String,
        default: ""
    },
    profileImage: {
        type: String,
        default: ""
    },
    qualification :{
        type: String,
        default: ""
    },
    pastProjects :{
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
    },
    
});

const collection = new mongoose.model("freelancers", LoginSchema);
module.exports=collection;