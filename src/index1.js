const express = require('express');
const path = require("path");
const multer = require('multer');
const bcrypt = require("bcryptjs");
const collection = require("./config1");
const mongoose=require('mongoose');
const cookieParser = require('cookie-parser');
const session = require('express-session')
const collection2 = require("./config")
const http = require('http');
const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'public/uploads'); // Specify the destination folder for uploads
    },
    filename: (req, file, cb) => {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
  });
  const uploads = multer({ storage: storage});

app.use(cookieParser());
app.use(session({
    secret: 'your-secret-key', // Change this to a secure secret key
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: 14 * 24 * 60 * 60 * 1000, 
      },
}));



app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({extended:false})); //idk

app.set('view engine', 'ejs');
app.get("/login",(req,res)=>{
    res.render("login");
})

app.get("/signup", (req,res)=>{
    res.render("signup");
})

app.post("/signup", async (req,res)=>{
    const data={
        name: req.body.username,
        password:req.body.password,
        jobProfile:req.body.jobProfile,
        jobexp:req.body.jobexp
    }
    const existingUser= await collection2.findOne({name:data.name});
    if(existingUser){
        res.send("User already exists. Please try another.");
    } else{
    const saltRounds=10;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);
    data.password=hashedPassword;
    const userdata=await collection.insertMany(data);
    
    console.log(userdata);
    req.session.user = data;
    
    }
    res.render("login")
    
})

app.post("/login",async (req,res)=>{
    try{
        const check= await collection2.findOne({name: req.body.username});
        if(!check){
            res.send("user name not found");
        }
        const isPasswordMatch = await bcrypt.compare(req.body.password, check.password);
        if(isPasswordMatch){
            req.session.user=check;
            res.redirect("freeldashb");
        }else{
            req.send("wrong password");
        }
    }catch{
        res.send("wrong details");
    }
})

app.get("/freeldashb", async(req, res) => {
    try {
        const user = req.session.user;
        const freelancer = await collection2.findOne(user);
        const recruiters = await collection.find();
         res.render('freeldashb', { freelancer,user,recruiters });
      } catch (error) {
        console.error('Error fetching freelancers:', error);
        res.status(500).send('Internal Server Error');
      }
});
app.get("/freelprofile",async(req,res)=>{
    const user = req.session.user;
    try {
        const freelancer = await collection2.findOne({ name: user.name });
        res.render("freelprofile", { user,freelancer });
    } catch (error) {
        console.error('Error fetching recruiter profile:', error);
        res.status(500).send('Internal Server Error');
    }
});
app.post("/freelprofile", uploads.single('profileImage'), async (req, res) => {
    const user = req.session.user;
    const experience = req.body.experience;
    const projects = req.body.projects;
    const about = req.body.about;
    const profileImage = req.file ? req.file.filename : null;

    try {
        // Update the recruiter's profile in the database
        const freelancer = await collection2.findOneAndUpdate(
            { name: user.name },
            {
                $set: {
                    
                    experience:experience,
                    about: about,
                    profileImage: profileImage
                }
            },
            { new: true }
        );
        res.redirect("/freelprofile"); 
    } catch (error) {
        console.error('Error updating recruiter profile:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
app.post("/freelprofileforrec", uploads.single('profileImage'), async (req, res) => {
    const user = req.session.user;
    const experience = req.body.experience;
    const projects = req.body.projects;
    const about = req.body.about;
    const profileImage = req.file ? req.file.filename : null;

    try {
        const freelancer = await collection2.findOneAndUpdate(
            { name: user.name },
            {
                $set: {
                    
                    experience:experience,
                    about: about,
                    profileImage: profileImage
                }
            },
            { new: true }
        );
        res.redirect("/freelprofileforrec"); 
    } catch (error) {
        console.error('Error updating recruiter profile:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
app.get("/freelnotify",(req,res)=>{
    res.render("freelnotify");
})

app.get("/login1",(req,res)=>{
    res.render("login1");
})

app.get("/signup1", (req,res)=>{
    res.render("signup1");
})

app.post("/signup1", async (req,res)=>{
    const data={
        name: req.body.username,
        password:req.body.password,
    }
    const existingUser= await collection.findOne({name:data.name});
    if(existingUser){
        res.send("User already exists. Please try another.");
    } else{
    const saltRounds=10;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);
    data.password=hashedPassword;
    const userdata=await collection.create(data);
    console.log(userdata);
    req.session.user = data;
    }
    res.render("login1")
})

app.post("/login1",async (req,res)=>{
    try{
        const check= await collection.findOne({name: req.body.username});
        if(!check){
            res.send("user name not found");
        }
        const isPasswordMatch = await bcrypt.compare(req.body.password, check.password);
        if(isPasswordMatch){
            req.session.user=check
            res.redirect("recdashb");
        }else{
            req.send("wrong password");
        }
    }catch{
        res.send("wrong details");
    }
})


app.get("/recdashb", async(req, res) => {
    try {
        const user = req.session.user;
        const recruiter = await collection.findOne(user);
        const freelancers = await collection2.find();
        const freelancerId = freelancers._id;
        res.render('recdashb', { freelancers,user,recruiter ,freelancerId});
      } catch (error) {
        console.error('Error fetching freelancers:', error);
        res.status(500).send('Internal Server Error');
      }
});
app.get('/newjob', async (req, res) => {
    try {
        const user = req.session.user;
        const recruiter = await collection.findOne(user);
        res.render('newjob', { user, recruiter });
    } catch (error) {
        console.error('Error fetching recruiter data:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/newjob', async (req, res) => {
    const { job, jobExperience, projects } = req.body;
    const user = req.session.user;
  
    try {
      const recruiter = await collection.findOne(user);
      const newPreference = {
        job,
        jobExperience,
        projects
      };
  
      recruiter.jobPreferences.push(newPreference); // Add the new preference to the array
  
      await recruiter.save();
      res.redirect('newjob');
    } catch (error) {
      console.error('Error updating job preferences:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.get("/recprofile",async(req,res)=>{
    const user = req.session.user;
    try {
        const recruiter = await collection.findOne({ name: user.name });
        res.render('recprofile', { user, recruiter });
    } catch (error) {
        console.error('Error fetching recruiter profile:', error);
        res.status(500).send('Internal Server Error');
    }
})
app.post("/recprofile", uploads.single('profileImage'), async (req, res) => {
    const user = req.session.user;
    const experience = req.body.experience;
    const projects = req.body.projects;
    const about = req.body.about;
    const profileImage = req.file ? req.file.filename : null;

    try {
        // Update the recruiter's profile in the database
        const recruiter = await collection.findOneAndUpdate(
            { name: user.name },
            {
                $set: {
                    
                    experience:experience,
                    about: about,
                    profileImage: profileImage
                }
            },
            { new: true }
        );
        res.redirect("/recprofile"); 
    } catch (error) {
        console.error('Error updating recruiter profile:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
app.post('/deletePreference/:index', async (req, res) => {
    const user = req.session.user;
    const index = req.params.index;

    try {
        const recruiter = await collection.findOne(user);
        if (recruiter.jobPreferences && recruiter.jobPreferences.length > index) {
            // Remove the preference from the array based on the index
            recruiter.jobPreferences.splice(index, 1);
            await recruiter.save();
        }
        res.redirect('recdashb'); // Redirect back to the dashboard
    } catch (error) {
        console.error('Error deleting job preference:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
app.get('/freelprofileforrec/:freelancerId', async (req, res) => {
    const freelancerId = req.params.freelancerId;
    const freelancer = await collection2.findById(freelancerId);
    const user = req.session.user;
    res.render('freelprofileforrec', { freelancerId, freelancer,user });
  });

io.on('connection', (socket) => {
    // Handle events from recruiters offering jobs
    socket.on('offerJob', (data) => {
      // Emit event to the specific freelancer based on data received
      io.to(data.freelancerId).emit('jobOfferNotification', { jobDetails: data.jobDetails });
    });
  });
  
app.use('/socket.io', express.static(__dirname + '/node_modules/socket.io/client-dist'));

  
const port = 3510;
app.listen(port,()=>{
    console.log(`Server running on Port: ${port}`)
})
