const t1 = getMillis();
const Cryptr = require('cryptr');

const cryptr = new Cryptr("123"); //THE SECREAT KEY
const nodemailer = require('nodemailer'); 
const express = require('express');
const cors = require('cors')
const body_parser = require('body-parser');
const {
  ObjectId
} = require('mongodb');
const {
  query
} = require('express');
const { urlencoded } = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const host="https://www.ctrlpluz.com"


const app = express();
app.use(cors())
app.use(body_parser.json())
app.use(body_parser.raw())
//app.use(body_parser.urlencoded())
const port = process.env.PORT || 3000;

var client, db, user_data, post_data, reports, api_keys, others;
var latest = [];
var recomanded = [];
var categories = [];
var lastRefreashed = 0;
var refresh_takes_milis

//var url = "mongodb+srv://manish:manish@cluster0.cqjkp.gcp.mongodb.net?retryWrites=true&w=majority";

//var url = "mongodb://localhost:27017";
var url= "mongodb+srv://manish:manish@cluster0.plkxv.mongodb.net?retryWrites=true&w=majority";


/*
var user_model={
  first_name : "Name",
  last_name : "Title",
  mail_id : null,
  password : null,
  created : null,
  modified : null,
  avatar : "https://cdn.iconscout.com/icon/free/png-512/avatar-372-456324.png",
  gender: 1,
  verified : false,
  fav_tags : []
}
*/
const mailTransporter = nodemailer.createTransport({ 
  service: 'gmail', 
  auth: { 
      user: 'engineeringtips2020@gmail.com', 
      pass: 'hello world'
  } 
}); 

MongoClient.connect(url, {useUnifiedTopology: true }, function (err, DBclient) { 
  if (err) { console.error(err);  throw err; }
  client = DBclient;

  db = client.db("main");

  user_data = db.collection("user_data");
  user_data.createIndex({mail_id:1},{unique:true});
  post_data = db.collection("post_data");
  
  
  reports = db.collection("reports");
  api_keys = db.collection("api_keys");
  others = db.collection("others");
  others.createIndex({name:1},{unique:true});
  /*
  var obj=others.findOne({name:"categories"});
  console.log(obj);
  if(obj==null){
    others.insertOne({name:"categories",value:[]})
  }
*/
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
   refreshList();
    const t2 = getMillis();
    console.log("\nServer Started at: "+ getTimeStamp()+"\nIt takes " + (t2 - t1) + " miliseconds to initilize...");
  });
});




app.post('/mailExist', async (req, res, next) => {
  try {

    const result = await user_data.findOne({
      "mail_id": req.body.mail_id
    });
    if (result != null) {
      res.status(200);
      res.send({
        result: true,
        exist: true,
        first_name: result.first_name,
        last_name: result.last_name,
        avatar: result.avatar
      });

    } else {
      res.status(200);
      res.send({
        result: true,
        exist: false
      });

    }

  } catch (error) {
    console.error(error);
    next(500);
  }

});

app.post('/signUp', async (req, res, next) => {

  try {

    if (typeof req.body.mail_id!= undefined && typeof req.body.password!= undefined && req.body.mail_id!= "" && req.body.password!= "") {
      var json = {};
      const current_time = getMillis();
      json.first_name = req.body.first_name || "Name";
      json.last_name = req.body.last_name || "Title";
      json.mail_id = req.body.mail_id || "";
      json.password = req.body.password || "";
      json.created = current_time;
      json.modified = current_time;
      json.avatar = "https://cdn.iconscout.com/icon/free/png-512/avatar-372-456324.png";
      json.verified = false;
  
      var result = await user_data.insertOne(json);
      //console.log(result)
      if (result.insertedCount == 1) {
        res.status(201);
        res.send({
          result: true,
          message: "account successfully created"
        });
      } else next(500);
    } else next(400);
  } catch (error) {
    console.error(error)
    if(error.code==11000){
      next(409)
    }else{
    next(500)
    }
  }
});

app.post('/logIn', async (req, res, next) => {
  console.log(req.body.method)
  try {
    switch (req.body.method) {
      
      case 'local': {
        //console.log("local");
        if (typeof req.body.mail_id!= undefined && typeof req.body.password!= undefined && req.body.mail_id!= "" && req.body.password!= "") {
        const result = await user_data.findOne({ "mail_id": req.body.mail_id });
        //console.log(result)
          if(result!=null){
            if (result.password == req.body.password) {
              res.status(200);
              res.send({
                result : true,
                message : "login successful",
                first_name : result.first_name,
                last_name : result.last_name,
                avatar : result.avatar,
                created : result.created,
                modified : result.moddified,
                verified : result.verified,
                credential : encrypt(result._id),
                user_id:  result._id
              });
            }else res.status(401).send({
              result:false,
              message: "password didn't match"
            });
          }else next(404)
        }else next(400);
        break;
      }
      case 'google': {
        if(typeof req.body.mail_id!= undefined && typeof req.body.mail_id!= ""){
            const check = await user_data.findOne({ "mail_id": req.body.mail_id });
            if (check != null) {
              var current_time=getMillis();
             console.log("exist");
              var query = { "mail_id": req.body.mail_id };
              var values = {
                $set: {
                  "first_name": req.body.first_name,
                  "last_name": req.body.last_name,
                  "avatar": req.body.avatar,
                  "modified": current_time ,
                  "verified": true
                }
              };
              const result = await user_data.updateOne(query, values);
              //console.log(result);
              if(result.modifiedCount==1){
              console.log("modified==1");
                
                res.status(200);
                res.send({
                  result: true,                 
                  message: "login successful",
                  first_name: req.body.first_name,
                  last_name: req.body.last_name,
                  avatar: req.body.avatar,
                  created: check.created,
                  modified: current_time,
                  verified: true,
                  credential: encrypt(check._id),
                  user_id: check._id });
               console.log(check)
              }else next(500);
            }else{
              var json = {};
              const current_time = getMillis();
              json.first_name = req.body.first_name;
              json.last_name = req.body.last_name;
              json.mail_id = req.body.mail_id;
              json.password = "";
              json.created = current_time;
              json.modified = current_time;
              json.avatar = req.body.avatar;
              json.verified = true;
          
              var result = await user_data.insertOne(json);
              if(result.insertedCount==1){
                result=result.ops;
                res.status(201);
                res.send({
                  result: true,
                  message: "Account created successfully",
                  first_name: result.first_name,
                  last_name: result.last_name,
                  avatar: result.avatar,
                  created: result.created,
                  modified: result.modified,
                  verified: result.verified,
                  credential: encrypt(result._id),
                  user_id: result._id
                });
              }else next(500);
            }
        }else next(400);
        break;
      }
      default: next(400);
      break;
    }
  } catch (error) {
    //next(500)
  }
});

app.post('/getUserInfo', async (req, res, next) => {
  try {
    if (typeof req.body.credential != undefined && req.body.credential != null) {
      req.body.user_id = decrypt(req.body.credential);
      var result = await user_data.findOne({_id:ObjectId(req.body.user_id)});
      if (result.first_name != null) {
        res.status(200);
        res.send({
          result: true,
          first_name: result.first_name,
          last_name: result.last_name,
          mail_id: result.mail_id,
          avatar: result.avatar,
          created: result.created,
          modified: result.modified
        });
      } else if (result.first_name == null) next(404);
    } else next(400);
    } catch (error) {
      console.error(error);
      next(500);
  }
});

// NOT YET INSPECTED
app.post('/setUserInfo', async (req, res, next) => {
  try {
    if (typeof req.body.credential != undefined) {
      var current_time=getMillis();
      req.body.user_id = decrypt(req.body.credential);
      const result = await user_data.updateOne({
        _id: ObjectId(req.body.user_id)
      }, {
        $set: {
          first_name: req.body.first_name || "",
          last_name: req.body.last_name || "",
          avatar: req.body.avatar || "https://cdn.iconscout.com/icon/free/png-512/avatar-372-456324.png",
          modified: current_time
        }
      });
      if (result.matchedCount == 1) {
        res.status(200).send({
          result: true,
          first_name: req.body.first_name,
          last_name: req.body.last_name,
          avatar: req.body.avatar,
          modified: current_time
        });
      } else next(401);
    } else next(400);

  } catch (error) {
    console.error(error);
    next(500);
  }

});







//THIS TWO ROUT NEED NODEMAILER
app.post('/mailVerification', async (req, res, next) => {
  try {
    if (req.body.mail_id!= "" && typeof req.body.mail_id!= undefined && req.body.credential!= "" && typeof req.body.credential!= undefined){
      req.body.user_id = decrypt(req.body.credential);
      const result= await api_keys.insertOne({user_id: ObjectId(req.body.user_id), mail_id: req.body.mail_id, timestamp: getMillis()});
      //console.log(result);
      if(result.insertedCount==1){

        let mailDetails = { 
          from: 'CTRL PLUZ', 
          to: req.body.mail_id, 
          subject: 'Ctrl_Pluz Verification', 
          text: 'TO VERIFY CLICK ON THE LINK BELOW\n'+'https://manish-first-app.herokuapp.com/verify?id='+result.insertedId
      }; 

      const data = await mailTransporter.sendMail(mailDetails);
      //console.log(data);
      if(data.accepted[0]!=null){
        res.status(200).send({
          result:true,
          message: "the vefication mail has succsessfully sent to mail_id: "+ data.accepted[0]
        });
      }else res.status(402).send({
        result:true,
        message: "mail may not sent or may not accepted by reciver: " + data.accepted[0]
      });

      }else next(500);




    }else next(400);



  } catch (error) {
    console.error(error);
  }

});

app.get('/verify', async (req, res, next) => {
  try {
    if(req.query.id!=null && typeof req.query.id!=undefined){
      console.log(req.query.id);
      const find = await api_keys.findOne({_id: ObjectId(req.query.id)});
      if(find!=null){
        var result = await user_data.updateOne({mail_id: find.mail_id},{$set:{verified: true}});
        if(result.modifiedCount==1){
          res.status(200).send({
            result: true,
            message: "Acount is verified succsessfully"
          });

        }else next(500);
      }else next(404);
    }else next(400);



  } catch (error) {
    console.error(error);
  }

});

app.post('/forgetPassword', async (req, res) => {
  try {



  } catch (error) {
    console.error(error);
  }

});

app.post('/updatePassword', async (req, res) => {
  try {



  } catch (error) {
    console.error(error);
  }

});







// need to handel thumbnail and duration &  total number of post in user_data 
app.post('/createPost', async (req, res, next) => {
  try {
    
    if (typeof req.body.credential != undefined) {
      const current_time= getMillis();
      req.body.user_id = decrypt(req.body.credential);

      var json = {};

      json.title = req.body.title;
      json.user_id = new ObjectId(req.body.user_id);
      json.post_content = req.body.post_content;
      json.tags = req.body.tags;
      json.type = req.body.type;
      json.published = req.body.published;
      json.summary = req.body.summary;
      json.thumbnail = req.body.thumbnail;
      json.category = req.body.category;
      json.word_count = req.body.word_count;
      json.created = current_time;
      json.modified = current_time;
      json.duration = (req.body.word_count/100) || 0;  //80 words per minuite is normal speed I take as 100 word per min
      json.views = 0;
      json.reviews = [];
      json.share = 0;

      var result = await post_data.insertOne(json);
      if(result.insertedCount==1){
        console.log(result);
        result=result.ops
        res.status(201)
        res.send({
          result: true,
          message: "post has successfully created",
          post_id: result._id,
          title: result.title,
          summery: result.summery,
          tags: result.tags,
          thumbnail: result.thumbnail,
          type: result.type,
          category: result.category,
          type: result.type,
          published: result.published,
          created: result.created,
          modified: result.modified,
          url: encodeURI(host+"/"+categories[result.category].name+"/"+result.title+result._id)
        });
      } else next(500)
    } else next(400);
  } catch (error) {
    console.error(error);
    next(500)
  }
});

// need to handel thumbnail and duration &  total number of post in user_data
app.post('/updatePost', async (req, res, next) => {
  try {
    if (typeof req.body.credential != undefined && typeof req.body.post_id != undefined) {
      const current_time= getMillis();
      req.body.user_id = decrypt(req.body.credential);
      var query = {
        _id: ObjectId(req.body.post_id),
        user_id: ObjectId(req.body.user_id)
      };
      var newValues = {
        $set: {
          title: req.body.title,
          post_content: req.body.post_content,
          type: req.body.type,
          published: req.body.published,
          summary: req.body.summary,
          tags: req.body.tags,
          thumbnail: req.body.thumbnail,
          category: req.body.category,
          published: req.body.published,
          modified: current_time,
          word_count: req.body.word_count,
          duration: (req.body.word_count / 100)
        }
      }


      var result = await post_data.updateOne(query, newValues);
     // console.log(result)
      if (result.matchedCount == 1) {
        res.status(201)
        res.send({
          result: true,
          message: "post has successfully updated",
          post_id:req.body.post_id,
          title: req.body.title,
          post_content: req.body.post_content,
          type: req.body.type,
          published: req.body.published,
          summary: req.body.summary,
          tags: req.body.tags,
          thumbnail: req.body.thumbnail,
          category: req.body.category,
          published: req.body.published,
          modified: current_time,
          word_count: req.body.word_count,
          duration: (req.body.word_count / 100),
          url: encodeURI(host+"/"+categories[req.body.category].name+"/"+req.body.title+req.body.post_id)
        });
      } else {
        next(401);
      }
      //console.log(result);
    } else next(400);

  } catch (error) {
    console.error(error);
    next(500)
  }
});
// need to handel thumbnail and duration &  total number of post in user_data
app.post('/removePost', async (req, res, next) => {
  try {
    if (typeof req.body.credential != undefined && typeof req.body.post_id != undefined) {
      req.body.user_id = decrypt(req.body.credential);

      var query = {
        _id: ObjectId(req.body.post_id),
        user_id: ObjectId(req.body.user_id)
      };
      var result = await post_data.deleteOne(query);

      if (result.deletedCount == 1) {
        res.status(200)
        res.send({
          result: true,
          message: "post has deleted successfully"
        });
      } else next(401)
    } else next(400);

  } catch (error) {
    console.error(error);
    next(500)
  }
});










app.post('/getRecomanded', async (req, res, next) => {
  try {
    if ((getMillis() - lastRefreashed) > 3 * 60 * 60 * 1000) {
      refreshList();
      //console.log('refreshList')
    }
    if (typeof req.body.skip == "number" && typeof req.body.limit == "number") {

      var array = [];
      //console.log(recomanded)
      for (var i = req.body.skip; i < req.body.skip + req.body.limit; i++) {
        if (recomanded[i] == null) break;
        array.push(recomanded[i]);
        if (i > 200) break;
      }
      res.status(200);
      res.send(array);
    } else next(400);
  } catch (error) {
    console.error(error);
    next(500)
  }

});

app.post('/getLatest', async (req, res) => {
  try {
    if ((getMillis() - lastRefreashed) > 3 * 60 * 60 * 1000) {
      refreshList();
    }
    if (typeof req.body.skip == "number" && typeof req.body.limit == "number") {

      var array = [];
      for (var i = req.body.skip; i < req.body.skip + req.body.limit; i++) {
        if (latest[i] == null) break;
        array.push(latest[i]);
        if (i > 500) break;
      }
      res.status(200);
      res.send(array);
    } else next(400);

  } catch (error) {
    console.error(error);
    next(500)
  }
});
//HANDEL URL  url: host+"/"+categories[result.category]+"/"+result.title+result._id
app.post('/usersPosts', async (req, res, next) => {
  try {
    if (typeof req.body.user_id != undefined) {
      const usersPost_pipelines = [{
        '$match': {
          'user_id': new ObjectId(req.body.user_id),
          'published': true
        }
      }, {
        '$project': {
          'title': 1,
          'thumbnail': 1,
          'views': 1,
          'summary': 1,
          'duration': 1,
          'type': 1,
          'category': 1,
          'created': 1,
          'modified': 1,
          'share':1,
          'reviews':1
        }
      }];
      var result = await post_data.aggregate(usersPost_pipelines).toArray();
      //console.log(result);
      if (result.length != 0) {
        for(var i=0; i<result.length;i++){
          var object=result[i];
          object.rating=avgRating(object.reviews);
          delete object.reviews;
          result[i]=object;
        }
        res.send({
          result: true,
          array: result
        });
      } else {
        next(404);
      }
    } else {
      next(400)
    }
  } catch (error) {
    console.error(error);
    next(500)
  }
});

app.post('/getPost', async (req, res, next) => {
  try {
    if (typeof req.body.post_id != undefined) {

       const project =  {
          'title': 1,
          'thumbnail': 1,
          'views': 1,
          'summary': 1,
          'duration': 1,
          'type': 1,
          'category': 1,
          'created': 1,
          'modified': 1,
          'share':1,
          'post_content':1,
          'reviews':1
        }
        const get_post_query = [{
          '$match': {
            '_id': ObjectId(req.body.post_id)
          }
        }, {
          '$limit': 1
        }, {
          '$lookup': {
            'from': 'user_data',
            'localField': 'user_id',
            'foreignField': '_id',
            'as': 'author'
          }
        }, {
          '$project': {
            'title': 1,
            'thumbnail': 1,
            'author': 1,
            'views': 1,
            'post_content':1,
            'duration': 1,
            'summary': 1,
            'type': 1,
            'category': 1,
            'created': 1,
            'modified': 1,
            'share':1,
            'reviews':1
          }
        }];
      var result = await post_data.aggregate(get_post_query).toArray();
      //var result = await post_data.findOne({_id: ObjectId(req.body.post_id)}, project);
      result=result[0];
      //console.log(result)

      if (result != null) {
        res.send({
          result: true,
          title: result.title,
          post_id: result._id,
          thumbnail: result.thumbnail,
          views: result.views,
          summary: result.summary,
          duration: result.duration,
          post_content: result.post_content,
          type: result.type,
          category:  result.category,
          date_time:  result.date_time,
          share:  result.share,
          url: encodeURI(host+"/"+categories[result.category].name+"/"+result.title+result._id),
          rating: avgRating(result.reviews),
          author:{
            first_name:result.author[0].first_name,
            last_name:result.author[0].last_name,
            avatar:result.author[0].avatar,
            user_id:result.author[0]._id
          }
        });
      } else {
        next(404);
      }

    } else {
      next(400)
    }
  } catch (error) {
    console.error(error);
    next(500)
  }

});

app.post('/getPostContent', async (req, res, next) => {
 
  try {
    if (typeof req.body.post_id != undefined){
      const result= await post_data.findOne({ _id: ObjectId( req.body.post_id )},{_id: 0, post_content: 1 });
      console.log(result);
      if(result!=null){
        res.status(200).send({
          result:true,
          post_content: result.post_content
        });
      }else next(404);
      
    }else next(400);

  } catch (error) {
    console.error(error);
    next(500)
  }

});






app.post('/setView', async (req, res, next) => {
  try {
    if (typeof req.body.post_id != undefined){
      const result = await post_data.updateOne({_id: ObjectId(req.body.post_id)},{
        $inc: {views:1, modified:getMillis}
      });
      if(result.matchedCount==1){
        res.status(200).send({
          result:true
        })
      }else next(404)

    }else next(400);

  } catch (error) {
    console.error(error);
    next(500)
  }

});

app.post('/setShare', async (req, res, next) => {
  try {
    if (typeof req.body.post_id != undefined){
      const result = await post_data.updateOne({_id: ObjectId(req.body.post_id)},{
        $inc: {share:1, modified:getMillis}
      });
      if(result.matchedCount==1){
        res.status(200).send({
          result:true
        })
      }else next(404)

    }else next(400);

  } catch (error) {
    console.error(error);
    next(500)
  }

});





app.post('/updateCategories', async (req, res, next) => {
  try {
      switch(req.body.method){
        case 'insert':{
          var result= await others.updateOne({name:"categories"},{
            $push:{
              value:{
                name:req.body.name,
                thumbnail:req.body.thumbnail,
                value:categories.length+1,
              }
            }
        },{$upsert:true});
        //console.log(result);
        if(result.modifiedCount==1){
          res.status(200)
          res.send({
            result:true,
            message:req.body.name+" is added to categories with a value "+(categories.length+1)
          });
          refreshList();
        }
          break;
        }        
        case 'update':{
          var result=await others.updateOne({'name' :"categories",'value.value': req.body.value},{
            $set:{
              value:{
                name:req.body.name,
                thumbnail:req.body.thumbnail
              }
            }
        });//console.log(result);
        if(result.modifiedCount==1){
          res.status(200)
          res.send({
            result:true,
            message:req.body.name+" is updated to categories at value "+req.body.value
          });
          refreshList();
        }
          break;
        }        
        case 'remove':{
          var result=await others.updateOne({name:"categories"},{
            $pull:{
              value:{
                value:req.body.value,
              }
            }
        });        
        if(result.modifiedCount==1){
          res.status(200)
          res.send({
            result:true,
            message:req.body.name+" is removed from categories"
          });
          refreshList();
        }
          break;
        }
      }

  } catch (error) {
    console.error(error);
    next(500)
  }

});


//Review needs to add
app.all('/getCategories', async (req, res, next) => {
  try {
    res.status(200).send(categories);

  } catch (error) {
    console.error(error);
    next(500)
  }

});

app.post('/getCategoryContents', async (req, res,next) => {
  try {
    if (typeof req.body.category != undefined) {
      var category_pipeline = [{
        '$match': {
          'category': req.body.category,
          'published': true
        }
      },{
        '$sort': {
          'views': -1
        }
      }, {
        '$limit': 200
      }, {
        '$lookup': {
          'from': 'user_data',
          'localField': 'user_id',
          'foreignField': '_id',
          'as': 'author'
        }
      }, {
        '$project': {
          'title': 1,
          'thumbnail': 1,
          'author': 1,
          'views': 1,
          'duration': 1,
          'summary': 1,
          'type': 1,
          'category': 1,
          'created': 1,
          'modified': 1,
          'share':1
        }
      } ];

      
      var result = await post_data.aggregate(category_pipeline).toArray();
      //console.log(result);
      if (result.length != 0) {
        for (var i = 0; i < result.length; i++) {
          let object = result[i];
          object.url =encodeURI( host+"/"+categories[object.category].name+"/"+object.title+object._id);
          object.post_id = object._id;
          let temp = object.author[0];
          delete object._id;
         // console.log(object)
          let author = {}
          author.first_name = temp.first_name;
          author.last_name = temp.last_name;
          author.avatar = temp.avatar;
          author.user_id = temp._id;
          object.author = author;
    
          result[i] = object;
    
        }
        res.status(200);
        res.send(result);
      } else next(404);

    } else next(400);

  } catch (error) {
    console.error(error);
    next(500);
  }

});







app.post('/getSavedStories', async (req, res) => {
  try {
    if (req.body.user_id != null) {
      const usersPost_pipelines = [{
        '$match': {
          '_id': new ObjectId(req.body.user_id)
        }
      }, {
        '$project': {
          'saved': 1
        }
      }, {
        '$lookup': {
          'from': 'post_data',
          'localField': 'saved',
          'foreignField': '_id',
          'as': 'saved'
        }
      }, {
        '$project': {
          '_id': 0,
          'saved': 1
        }
      }];
      var result = await user_data.aggregate(usersPost_pipelines).toArray();
      result = result[0];
      if (result != null) {
        result.result = true;
        //console.log(result);
        res.send(result);
      } else {
        res.send({
          "result": false,
          "message": "user don't write any post"
        });
      }

    } else {
      res.send({
        "result": false,
        "message": "no user_id found in request."
      });
    }


  } catch (error) {
    console.error(error);
  }

});

app.post('/saveStory', async (req, res) => {
  try {
    if (req.body.user_id != null && req.body.post_id != null) {
      var result = await user_data.updateOne({
        _id: ObjectId(req.body.user_id)
      }, {
        $push: {
          "saved": ObjectId(req.body.post_id)
        }
      });
      if (result != null) {
        // console.log(result);
        res.send({
          "result": true
        });
      }
    } else {
      res.send({
        "result": false,
        "message": "some params are missing in request."
      });
    }


  } catch (error) {
    console.error(error);
  }

});

app.post('/unsaveStory', async (req, res) => {
  try {
    if (req.body.user_id != null && req.body.post_id != null) {
      var result = await user_data.updateOne({
        _id: ObjectId(req.body.user_id)
      }, {
        $pull: {
          saved: new ObjectId(req.body.post_id)
        }
      });
      if (result != null) {
        //console.log(result);
        res.send({
          "result": true
        });
      }
    } else {
      res.send({
        "result": false,
        "message": "some params are missing in request."
      });
    }


  } catch (error) {
    console.error(error);
  }

});







app.post('/postReview', async (req, res, next) => {
  try {
    if (typeof req.body.credential != undefined && typeof req.body.post_id != undefined && req.body.rating != undefined) {
      req.body.user_id = decrypt(req.body.credential);
      const query = {
        _id: ObjectId(req.body.post_id)
      };
      const values = {
        $push: {
          "reviews": {
            "user_id": new ObjectId(req.body.user_id),
            "review": req.body.review,
            "rating": req.body.rating
          }
        },
        $set:{modified:getMillis()}
      };
      var result = await post_data.updateOne(query, values);
      if (result.modifiedCount == 1) {
        res.status(200);
        res.send({
          result: true,
          message: "successfully posted review",
          review: req.body.review,
          rating: req.body.rating,
          user_id: req.body.user_id
        });

      } else {
        next(404)
      }
    } else {
      next(400)
    }

  } catch (error) {
    console.error(error);
    next(500)
  }

});

app.post('/updateReview', async (req, res, next) => {
  try {
    if (typeof req.body.credential != undefined && typeof req.body.post_id != undefined && req.body.rating != undefined) {
      req.body.user_id = decrypt(req.body.credential);
      const query = {
        _id: ObjectId(req.body.post_id),
        'reviews.user_id': new ObjectId(req.body.user_id)
      };
      const values = {
        $set: {
          "reviews.$.review": req.body.review,
          "reviews.$.rating": req.body.rating
        }
      };
      var result = await post_data.updateOne(query, values);

      if (result.matchedCount == 1) {
        res.status(200);
        res.send({
          result: true,
          message: "review successfully updated",
          review: req.body.review,
          rating: req.body.rating,
          user_id: req.body.user_id
        });

      } else {
        next(404)
      }
    } else {
      next(400)
    }

  } catch (error) {
    console.error(error);
    next(500)
  }

});

app.post('/removeReview', async (req, res, next) => {
  try {
    if (typeof req.body.credential != undefined && typeof req.body.post_id != undefined) {
      req.body.user_id = decrypt(req.body.credential);
      const query = {
        _id: ObjectId(req.body.post_id)
      };
      const values = {
        $pull: {
          "reviews": {
            "user_id": new ObjectId(req.body.user_id)
          }
        }
      };
      var result = await post_data.updateOne(query, values);
      if (result.modifiedCount == 1) {
        res.status(200);
        res.send({
          result: true,
          message: "Review successfully removed"
        });

      } else {
        next(404)
      }
    } else {
      next(400)
    }

  } catch (error) {
    console.error(error);
    next(500)
  }

});



app.post('/getReviews', async (req, res, next) => {
  try {
    if (typeof req.body.post_id != undefined) {
      const get_reviews_pipeline = [{
        $match: {
          _id: ObjectId(req.body.post_id)
        }
      }, {
        $lookup: {
          from: 'user_data',
          localField: 'reviews.user_id',
          foreignField: '_id',
          as: 'users'
        }
      }, {
        $project: {
          _id: 0,
          'reviews.review': 1,
          'reviews.rating': 1,
          'reviews.user_id': 1,
          'users.first_name': 1,
          'users.last_name': 1,
          'users.avatar': 1
        }
      }]
      var result = await post_data.aggregate(get_reviews_pipeline).toArray();
      result = result[0];
      //console.log(result);
      var arr = [];

      for (var i = 0; i < result.reviews.length; i++) {
        var obj = {};
        obj.user_id = result.reviews[i].user_id;
        obj.first_name = result.users[i].first_name;
        obj.last_name = result.users[i].last_name;
        obj.avatar = result.users[i].avatar;
        obj.review = result.reviews[i].review;
        obj.rating = result.reviews[i].rating;
        arr.push(obj);
      }
      //console.log(arr);
      res.send(arr);

    } else {
      next(400)
    }

  } catch (error) {
    console.error(error);
    next(500)
  }

});




app.all('/test', async (req, res) => {
  res.status(200).send("<html><body><h1>Current Server Time :"+getTimeStamp()+"</h1></body></html>");
});

app.all('/refreshLists', async (req, res, next) => {
  try {
    refreshList();
    res.status(200).send({
      result: true,
      message: "All the caches are refreshed at: "+getTimeStamp()+" Refresh takes: "+refresh_takes_milis+" millis to complete..."
    })
  } catch (error) {
    next(500);
  }

});






async function refreshList() {
  var start= getMillis();
  try {
    var catagories_pipeline = [{
      $match: {
        name: "categories"
      }
    }, {
      $project: {
        _id: 0,
        value: 1
      }
    }

  ];
  categories = await others.aggregate(catagories_pipeline).toArray();
  if(categories.length!=0){
  categories = categories[0].value;
  //console.log(categories);
  }

    const recomanded_query = [{
      '$match': {
        'published': true
      }
    }, {
      '$sort': {
        'views': -1
      }
    }, {
      '$limit': 200
    }, {
      '$lookup': {
        'from': 'user_data',
        'localField': 'user_id',
        'foreignField': '_id',
        'as': 'author'
      }
    }, {
      '$project': {
        'title': 1,
        'thumbnail': 1,
        'author': 1,
        'views': 1,
        'duration': 1,
        'summary': 1,
        'type': 1,
        'category': 1,
        'created': 1,
        'modified': 1,
        'share':1
      }
    }];
    recomanded = await post_data.aggregate(recomanded_query).toArray();
    if(recomanded.length!=0){
    for (var i = 0; i < recomanded.length; i++) {
      let object = recomanded[i];
      object.url =encodeURI( host+"/"+categories[object.category].name+"/"+object.title+object._id);
      object.post_id = object._id;
      let temp = object.author[0];
      delete object._id;
     // console.log(object)
      let author = {}
      author.first_name = temp.first_name;
      author.last_name = temp.last_name;
      author.avatar = temp.avatar;
      author.user_id = temp._id;
      object.author = author;

      recomanded[i] = object;

    }}
    const latest_query = [{
      '$match': {
        'published': true
      }
    }, {
      '$limit': 500
    }, {
      '$lookup': {
        'from': 'user_data',
        'localField': 'user_id',
        'foreignField': '_id',
        'as': 'author'
      }
    }, {
      '$project': {
        'title': 1,
        'thumbnail': 1,
        'author': 1,
        'views': 1,
        'duration': 1,
        'summary': 1,
        'type': 1,
        'category': 1,
        'created': 1,
        'modified': 1,
        'share':1,
        'reviews':1
      }
    }];
    latest = await post_data.aggregate(latest_query).toArray();
    if(latest.length!=0){
    for (var i = 0; i < latest.length; i++) {
      let object = latest[i];     
      object.url = encodeURI(host+"/"+categories[object.category].name+"/"+object.title+object._id)
      object.post_id = object._id
      delete object._id;
      object.rating = avgRating(object.reviews);
      delete object.reviews;
      let temp = object.author[0];
      let author = {}
      author.first_name = temp.first_name;
      author.last_name = temp.last_name;
      author.avatar = temp.avatar;
      author.user_id = temp._id;
      object.author = author;
      latest[i] = object;
    }}






    lastRefreashed = getMillis();
    refresh_takes_milis=lastRefreashed-start;
    console.log("lists are refreashed! at: " + getTimeStamp()+"\n"+"It takes: "+refresh_takes_milis+" millis");
    //console.log('Recomanded',recomanded);
    //console.log('latest',latest);
  } catch (error) {
    console.error(error)
  }
}

function getTimeStamp(){
  var date=new Date();
  var timestamp = date.getDate()+"."+date.getMonth()+"."+date.getFullYear()+"-"+ date.getHours()+":"+date.getMinutes()+":"+date.getSeconds()+"."+date.getMilliseconds();
  return timestamp;
}

function getMillis(){
  return new Date().getTime();
}

function avgRating(reviews){
  var rating=0;
  if(reviews.length!=0){
  for(var i=0;i<reviews.length;i++){
    rating=rating+reviews[i].rating;
  }
  rating=rating/reviews.length;
}
  return rating;
}

function dataURLtoBlob(dataurl) {
  var arr = dataurl.split(','),
    mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]),
    n = bstr.length,
    u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], {
    type: mime
  });
}

function encrypt(value) {
  return cryptr.encrypt(value);
}

function decrypt(value) {
  return cryptr.decrypt(value);
}

//ERROR HANDALER
app.use((err, req, res, next) => {

  switch (err) {
    case 400: { //BAD REQUEST
      console.error({
        error_code: err,
        path: req.path,
        headers: req.headers,
        body: req.body,
        message: "It was a bad request, maybe you had provided wrong parameters or fields."
      });
      res.status(err);
      res.send({
        result: false,
        message: "It was a bad request, maybe you had provided wrong parameters or fields."
      });
      break;
    }
    case 401: { //UNAUTHORIZE
      console.error({
        error_code: err,
        path: req.path,
        headers: req.headers,
        body: req.body,
        message: "It was a UNAUTHORIZE request, maybe you provided the wrong credential key"

      });
      res.status(err);
      res.send({
        result: false,
        message: "It was a UNAUTHORIZE request, maybe you provided the wrong credential key"
      });
      break;
    }
    case 404: { //NOT FOUND
      console.error({
        error_code: err,
        path: req.path,
        headers: req.headers,
        body: req.body,
        message: "It was a NOT FOUND error, data you are looking for is not found in the database."

      });
      res.status(err);
      res.send({
        result: false,
        message: "It was a NOT FOUND error, data you are looking for is not found in the database."
      });
      break;
    }

    case 409: { //NOT FOUND
      console.error({
        error_code: err,
        path: req.path,
        headers: req.headers,
        body: req.body,
        message: "Resource already exist in database."

      });
      res.status(err);
      res.send({
        result: false,
        message: "Resource already exist in database."
      });
      break;
    }

    case 500: { //INTERNAL SERVER ERROR
      console.error({
        error_code: err,
        path: req.path,
        headers: req.headers,
        body: req.body,
        message: "It looks like an error occurred in server contact with backend developer."

      });
      res.status(err);
      res.send({
        result: false,
        message: "It looks like an error occurred in server contact with backend developer."
      });
      break;
    }
  }
});
