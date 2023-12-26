const mongoose=require("mongoose");
const connect= mongoose.connect("mongodb://localhost:27017/login");
connect.then(()=>{
    console.log("Database connected successfully ");
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
    jobPreferences:[{
        job: String,
        jobExperience: String,
        projects: String,
        // Add more fields as needed
    }],
    experience:{
        type:String,
        default:""
    },
    about: {
        type: String,
        default: ""
    },
    profileImage: {
        type: String,
        default: ""
    }

});

const collection = new mongoose.model("recruiters", LoginSchema);
module.exports=collection;