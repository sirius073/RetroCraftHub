const express = require('express');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const collection = require('./config1');  // recruiter's db
const notification = require('./config3');  //Notification db
const jobpage = require('./config2');      //Jobpage db
const collection2 = require('./config');   //freelancers db
const session = require('express-session');
const cookieParser = require('cookie-parser');
const socketIO = require('socket.io');
const http = require('http');
const passport=require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();
const server = http.createServer(app);
const io = new socketIO.Server(server);

const storage = multer.diskStorage({   //for image storing we require multer 
  destination: (req, file, cb) => {
    cb(null, 'public/uploads'); 
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

app.use(cookieParser());   //for using express session

app.use(
  session({
    secret: 'your-secret-key', 
    resave: true,
    saveUninitialized: true,
    cookie: {
      maxAge: 14 * 24 * 60 * 60 * 1000,
    },
    

  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

app.set('view engine', 'ejs');


//Google authentication part
passport.use(new GoogleStrategy({
  clientID: '829573710311-njj88gcqcct13n3j6q2olqvjiq20b6bp.apps.googleusercontent.com',
  clientSecret: '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',
  callbackURL: 'http://localhost:3510/auth/google/callback',
},
async (accessToken, refreshToken, profile, done) => {
  console.log('Received profile:', profile);
 try{
  const USER= await collection.findOne({name:profile.displayName});
  if(USER){
    done(null,USER)
  }
  else {
    const newUser=({
      googleId:profile.id,
      name:profile.displayName,
      password:"justtesting",
    });
    USER=await collection.create( newUser );
     done(null,USER);
  }
 }catch(error){
  done(error,null);
 }
}
));
passport.serializeUser(function(user, done) {
  done(null, user.id); 
});

passport.deserializeUser(async function(id, done) {
  try {
    const user = await collection.findOne({ _id: id });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);


app.get('/auth/google/callback', 
  passport.authenticate('google', {
     failureRedirect: '/login1' ,
     }),
     (req,res)=>{
      req.session.user=req.user;
      res.redirect('/recdashb');
     }
);


//recruiter's authentication routes 

app.get('/login1', (req, res) => {
  res.render('login1');
});

app.get('/signup1', (req, res) => {
  res.render('signup1');
});

app.post('/signup1', async (req, res) => {
  const data = {
    name: req.body.username,
    password: req.body.password,
  };

  const existingUser = await collection.findOne({ name: data.name });
  if (existingUser) {
    res.send('User already exists. Please try another.');
  } else {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);
    data.password = hashedPassword;
    const userdata = await collection.create(data);
    console.log(userdata);
    req.session.user = data;
  }
  res.render('login1');
});

app.post('/login1', async (req, res) => {
  if (req.body.loginType === 'regular') {
  try {
    const check = await collection.findOne({ name: req.body.username });
    if (!check) {
      res.send('user name not found');
    }
    const isPasswordMatch = await bcrypt.compare(req.body.password, check.password);
    if (isPasswordMatch) {
      req.session.user = check;
      res.redirect('recdashb');
    } else {
      req.send('wrong password');
    }
  } catch {
    res.send('wrong details');
  }
}
else if (req.body.loginType === 'google') {
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res);
} else {
  res.send('Invalid login type');
}
});

// recruiter's dashboard

app.get('/recdashb', async (req, res) => {
  try {
    const user = req.session.user;
    const freelancers = await collection2.find();

    const freelancerId = freelancers._id;
    const recruiter = await collection.findOne(user);
    const notifications = await notification.find().exec();
    res.render('recdashb', { freelancers, user:user , recruiter,freelancerId,notifications});
  } catch (error) {
    console.error('Error fetching and filtering freelancers:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/recdashb', async (req, res) => {
  const { type,rname, fId, rId } = req.body;

  try {
    
    const newNotification = new notification({ type,rname, fId, rId });
    await newNotification.save();

    res.status(200).send('Notification created successfully');
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).send('Internal Server Error');
  }
});


//newjob route for recruiter to fill job preferences as per need
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
  const { job, jobExperience,paygrade } = req.body;
  const user = req.session.user;

  try {
    const recruiter = await collection.findOne(user);
    const newPreference = {
      job,
      jobExperience
    };

    recruiter.jobPreferences.push(newPreference); // Add the new preference to the array

    await recruiter.save();
    req.session.user=recruiter
    res.redirect('newjob');
  } catch (error) {
    console.error('Error updating job preferences:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

//to delete prefrences 
app.post('/deletePreference/:index', async (req, res) => {
  const user = req.session.user;
  const index = req.params.index;

  try {
      const recruiter = await collection.findOne(user);
      if (recruiter.jobPreferences && recruiter.jobPreferences.length > index) {
          recruiter.jobPreferences.splice(index, 1);
          await recruiter.save();
      }
      req.session.user=recruiter
      res.redirect('/newjob'); 
  } catch (error) {
      console.error('Error deleting job preference:', error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});


//profile 

app.get('/recprofile', async (req, res) => {
  const user = req.session.user;
  try {
    const recruiter = await collection.findOne({ name: user.name });
    res.render('recprofile', { user, recruiter });
  } catch (error) {
    console.error('Error fetching recruiter profile:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/recprofile', upload.single('profileImage'), async (req, res) => {
  const user = req.session.user;
  const experience = req.body.experience;
  const projects = req.body.projects;
  const phone = req.body.phone;
  const address = req.body.address;
  const email = req.body.email;
  const profession= req.body.profession;
  const about = req.body.about;
  const profileImage = req.file ? req.file.filename : null;

  try {
    const recruiter = await collection.findOneAndUpdate(
      { name: user.name },
      {
        $set: {
          projects: projects,
           experience: experience,
           profession: profession,
          'contactDetails.phone':phone,
          'contactDetails.address':address,
          'contactDetails.email':email,
          about: about,
          profileImage: profileImage,
        },
      },
      { new: true }
    );
    req.session.user = recruiter;
    res.redirect('/recprofile'); 
  } catch (error) {
    console.error('Error updating recruiter profile:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


//freelancer's profile
app.get('/freelprofile', async (req, res) => {
  const user = req.session.user;
  try {
    const freelancer = await collection2.findOne({ name: user.name });
    res.render('freelprofile', { user, freelancer});
  } catch (error) {
    console.error('Error fetching recruiter profile', error);
    res.status(500).send('Internal Server Error');
  }});

  app.post('/freelprofile', upload.single('profileImage'), async (req, res) => {
    const user = req.session.user;
    const about = req.body.about;
    const pastProjects = req.body.pastProjects;
    const qualification = req.body.qualification;
    const phone = req.body.phone;
    const address = req.body.address;
    const email = req.body.email;
    const paygrade = req.body.paygrade;
    const profileImage = req.file ? req.file.filename : null;
  
    try {
      const freelancer = await collection2.findOneAndUpdate(
        { name: user.name },
        {
          $set: {
            'contactDetails.phone': phone,
            'contactDetails.address': address,
            'contactDetails.email': email,
            pastProjects: pastProjects,
            about: about,
            qualification: qualification,
            profileImage: profileImage,
            paygrade: paygrade
          },
        },
        { new: true }
      );
      req.session.user = freelancer;
  
      res.redirect('/freelprofile');
    } catch (error) {
      console.error('Error updating freelancer profile:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });
  


app.get('/freelnotify', (req,res)=>{
  const user = req.session.user; 
  res.render("notification",{user,notification})

})

// freelancer's authentication routes 
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
        jobexp:req.body.jobexp,
        paygrade: req.body.paygrade
    }
    const existingUser= await collection2.findOne({name:data.name});
    if(existingUser){
        res.send("User already exists. Please try another.");
    } else{
    const saltRounds=10;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);
    data.password=hashedPassword;
    const userdata=await collection2.insertMany(data);
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

//freelancer dashboard

app.get("/freeldashb", async(req, res) => {
    try {
      const recruiters = await collection.find();
      const user = req.session.user;
      res.render("freeldashb", { user,recruiters, });
    } catch (error) {
        console.error('Error fetching user information:', error);
        res.status(500).send('Internal Server Error');
    }
 
});


//freelancer's profile for recruiter
app.get('/freelprofileforrec/:freelancerId', async (req, res) => {
  const freelancerId = req.params.freelancerId;
  const freelancer = await collection2.findById(freelancerId);
  const user = req.session.user;
  res.render('freelprofileforrec', { freelancerId, freelancer,user });
});


app.get('/recprofileforfreel/:recruiterId', async (req, res) => {
  const recruiterId = req.params.recruiterId;
  const recruiter = await collection.findById(recruiterId);
  const user = req.session.user;
  res.render('recprofileforfreel', { recruiterId, recruiter,user });
});

//notification routes 
app.get('/recnotify',(req,res)=>{
  const user = req.session.user;
  res.render('recnotify',{user})
})

app.post('/freelnotify', async (req, res) => {
  const { type, rname, fId, rId } = req.body;

  try {
    
    const newNotification = new notification({ type, rname, fId, rId });
    await newNotification.save();

   
    const newjob = new jobpage({ type, rname, fId, rId });
    await newjob.save();

   
    res.status(200).send('Notification and Job-page created successfully');
  } catch (error) {
    console.error('Error creating notification or job-page:', error);
    res.status(500).send('Internal Server Error');
  }
});

//job page to show existing jobs for freelancer

app.get('/jobpage', async (req, res) => {
  const user = req.session.user;
  const fId = user._id;
  console.log(fId);

  try {
    const acceptedNotification = await jobpage.findOne({
      fId: fId,
      type: 'recruiter',
      message: 'Your offer have been accepted',
    });

    let rname = null;

    if (acceptedNotification) {
      rname = acceptedNotification.rname;
    }

    res.render('jobpg', { user, rname });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// socket io connections for notifications 

const freelancerSocketMap = {};
const rSocketMap = {}

io.on('connection', (socket) => {
  socket.on('freelancerConnect', async ({ freelancerId }) => {
    freelancerSocketMap[freelancerId] = socket.id;
    console.log(freelancerSocketMap)

    try {
      const notifications = await notification.find({ fId: freelancerId, type: 'freelancer' });
      if (notifications.length > 0) {
        notifications.forEach((notification) => {
          socket.emit('hire_notification', {
            recruiterName : notification.rname,
            recruiterId : notification.rId,
          notificationId: notification._id});
        });

        
      }
    } catch (err) {
      console.error('Error processing freelancer connection:', err);
    }
  });


  socket.on('rConnect', async ({ rId }) => {
    rSocketMap[rId] = socket.id;
    
    try {

      const recruiterNotifications = await notification.find({ rId,type:'recruiter',  message: { $exists: true} });
      if (recruiterNotifications.length > 0) {
        recruiterNotifications.forEach(async (notification) => {
         const freelancer = await collection2.findById(notification.fId)
         const fname = freelancer.name
         console.log(fname)

          socket.emit('ans_notification', {
            recruiterName : notification.rname,
            recruiterId : notification.rId,
          message:notification.message,
          fname : fname
            
          });
        });
      }
      await notification.deleteMany({rId,type:'recruiter'})
    } catch (err) {
      console.error('Error processing recruiter connection:', err);
    }
  });




  socket.on('hireNotification', async ({ recruiterName, freelancerId }) => {
    const freelancerSocketId = freelancerSocketMap[freelancerId];
    if (freelancerSocketId) {
      io.to(freelancerSocketId).emit('notification', {
        message: ${recruiterName} hired you,
      });
    } 
    
  });

  socket.on('declined', async ({ message, recruiterId }) => {
    console.log(message);
    try {
        const noti = await notification.findOne({ rId: recruiterId, type: 'recruiter' });
         console.log(noti)
        if (!noti) {
            console.error('Notification not found for the given recruiter ID and type.');
            return;
        }

        const notificationId = noti._id;
        
        await notification.findOneAndUpdate(
          { _id: notificationId },
          {
            $set: {
              message:message
            },
          },
          { new: true }
        );

        if (rSocketMap[recruiterId]) {
            io.to(rSocketMap[recruiterId]).emit('rnotification', { message, notificationId });
        }
        await notification.deleteMany({ rId: recruiterId, type: 'freelancer'})
       
    } catch (err) {
        console.error('Error processing declined notification:', err);
    }
})


socket.on('accepted', async ({ message, recruiterId }) => {
  console.log(message);
  try {
    const noti = await notification.findOne({ rId: recruiterId, type: 'recruiter' });
    console.log(noti);
    if (!noti) {
      console.error('Notification not found for the given recruiter ID and type.');
      return;
    }

    const notificationId = noti._id;

    await notification.findOneAndUpdate(
      { _id: notificationId },
      {
        $set: {
          message: message,
        },
      },
      { new: true }
    );
    await jobpage.updateMany({ rId: recruiterId, type: 'recruiter' }, { $set: { message: message } });
    if (rSocketMap[recruiterId]) {
      io.to(rSocketMap[recruiterId]).emit('rnotification', { message, notificationId });
    }
    await notification.deleteMany({ rId: recruiterId, type: 'freelancer' });
  } catch (err) {
    console.error('Error processing accepted notification:', err);
  }
});



});


const port = 3510;

server.listen(port, () => {
  console.log(Server running on Port: ${port});
});
