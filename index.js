const t1 = new Date().getTime();
const Cryptr = require('cryptr');

const cryptr = new Cryptr("123"); //THE SECREAT KEY
const nodemailer = require('nodemailer'); 
const express = require('express');
const body_parser = require('body-parser');
const {
  ObjectId
} = require('mongodb');
const {
  query
} = require('express');
const MongoClient = require('mongodb').MongoClient;


const app = express();
app.use(body_parser.json())
app.use(body_parser.raw())
app.use(body_parser.urlencoded())
const port = process.env.PORT || 3000;

var client, db, user_data, post_data, reports, api_keys, others;
var leatest = [];
var recomanded = [];
var categories = [];
var lastRefreashed = 0;

//var url = "mongodb+srv://manish:manish@cluster0.cqjkp.gcp.mongodb.net?retryWrites=true&w=majority";
//var url = "mongodb://localhost:27017";
var url= "mongodb+srv://manish:manish@cluster0.plkxv.mongodb.net?retryWrites=true&w=majority";

const mailTransporter = nodemailer.createTransport({ 
  service: 'gmail', 
  auth: { 
      user: 'engineeringtips2020@gmail.com', 
      pass: 'hello world'
  } 
}); 

MongoClient.connect(url, {
  useUnifiedTopology: true
}, function (err, DBclient) {
  if (err) {
    console.error(err);
    throw err;
  }
  client = DBclient;

  db = client.db("main");

  user_data = db.collection("user_data");
  post_data = db.collection("post_data");
  reports = db.collection("reports");
  api_keys = db.collection("api_keys");
  others = db.collection("others");

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    refreshList();
    const t2 = new Date().getTime();
    console.log("\nServer take : " + (t2 - t1) + " miliseconds to initilize...");
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

    if (req.body.mail_id!= "" && req.body.password!= "") {
      var json = {};
      json.first_name = req.body.first_name || "";
      json.last_name = req.body.last_name || "";
      json.mail_id = req.body.mail_id || "";
      json.password = req.body.password || "";
      json.date_time = new Date().getTime();
      json.avatar = "";
      json.verified = false;
      json.fav_tags = [];


      const check = await user_data.findOne({
        mail_id: req.body.mail_id
      }, {
        _id: 0,
        mail_id: 1
      });
      //console.log(check);
      if (check==null) {


        var result = await user_data.insertOne(json);
        //console.log(result)
        if (result.insertedCount == 1) {
          res.status(201);
          res.send({
            result: true,
            message: "account successfully created"
          });
        } else next(500);
      } else res.status(401).send({
        result: false,
        message: "account on this mail already exist"
      });

    } else next(400);
  } catch (error) {
    console.error(error)
    next(500)
  }

});

app.post('/logIn', async (req, res, next) => {
  
  try {

    switch (req.body.method) {

      case 'local': {

        const result = await user_data.findOne({
          "mail_id": req.body.mail_id
        });

        if (result.password == req.body.password) {
          res.status(200);
          res.send({
            result: true,
            message: "login successful",
            first_name: result.first_name,
            last_name: result.last_name,
            avatar: result.avatar,
            verified: result.verified,
            credential: encrypt(result._id),
            user_id: result._id
          });
        }
        break;
      }
      case 'google': {

        const result = await user_data.findOne({
          "mail_id": req.body.mail_id
        });
        console.log( req.body)

        if (result != null) {
          var query = {
            "mail_id": req.body.mail_id
          };
          var values = {
            $set: {
              "first_name": req.body.first_name,
              "last_name": req.body.last_name,
              "avatar": req.body.avatar,
              "verified": true
            }
          };
          const result = await user_data.updateOne(query, values);
          //console.log(result);
          if (result.matchedCount == 1) {
            const result = await user_data.findOne({
              "mail_id": req.body.mail_id
            });
            res.status(200);
            res.send({
              result: true,
              message: "login successful",
              first_name: result.first_name,
              last_name: result.last_name,
              avatar: result.avatar,
              verified: result.verified,
              credential: encrypt(result._id),
              user_id: result._id
            });
          }
        } else {

          var json = {};
          json.first_name = req.body.first_name;
          json.last_name = req.body.last_name;
          json.mail_id = req.body.mail_id;
          json.password = null;
          json.date_time = new Date().getTime();
          json.avatar = req.body.avatar;
          json.verified = true;
          json.fav_tags = [];

          const result1 = await user_data.insertOne(json);
          //console.log(result1)
          const result = result1.ops;
          res.status(201);
          res.send({
            result: true,
            message: "login successful",
            first_name: result.first_name,
            last_name: result.last_name,
            avatar: result.avatar,
            verified: result.verified,
            credential: encrypt(result._id),
            user_id: result._id
          });
        }

      }
    }
  } catch (error) {
    next(500)
  }
});

app.post('/getUserInfo', async (req, res, next) => {
  try {
    if (typeof req.body.credential != undefined) {
      req.body.user_id = decrypt(req.body.credential);
      const user_info_pipeline = [{
        $match: {
          _id: new ObjectId(req.body.user_id)
        }
      }, {
        $project: {
          _id: 0,
          first_name: 1,
          last_name: 1,
          avatar: 1
        }
      }]
      var result = await user_data.aggregate(user_info_pipeline).toArray();
      result = result[0];
      if (typeof result.first_name != undefined) {
        res.status(200);
        res.send({
          result: true,
          first_name: result.first_name,
          last_name: result.last_name,
          avatar: result.avatar
        });
      } else {
        next(404)
      }

    } else next(400);

  } catch (error) {
    console.error(error);
    next(500);
  }

});

app.post('/setUserInfo', async (req, res, next) => {
  try {
    if (typeof req.body.credential != undefined) {
      req.body.user_id = decrypt(req.body.credential);
      const result = await user_data.updateOne({
        _id: ObjectId(req.body.user_id)
      }, {
        $set: {
          first_name: req.body.first_name || "unnamed",
          last_name: req.body.last_name || "unnamed",
          avatar: req.body.avatar || undefined,
        }
      });
      if (result.matchedCount == 1) {
        res.status(200).send({
          result: true,
          first_name: req.body.first_name,
          last_name: req.body.last_name,
          avatar: req.body.avatar
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
      const result= await api_keys.insertOne({user_id: ObjectId(req.body.user_id), mail_id: req.body.mail_id, timestamp: new Date().getTime()});
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
      json.date_time = new Date().getTime();
      json.duration = (req.body.word_count/80) || 0;  //80 words per minuite is normal speed
      json.views = 0;
      json.reviews = [];
      json.share = 0;


      var result = await post_data.insertOne(json);
      // console.log(result)

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
        published: result.published
      });

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
          word_count: req.body.word_count,
          duration: (req.body.word_count / 80) || 0
        }
      }


      var result = await post_data.updateOne(query, newValues);
      console.log(result)
      if (result.matchedCount == 1) {


        res.status(201)
        res.send({
          result: true,
          message: "post has successfully updated"
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
    if ((new Date().getTime() - lastRefreashed) > 3 * 60 * 60 * 1000) {
      refreshList();
      console.log('refreshList')
    }
    if (typeof req.body.skip == "number" && typeof req.body.limit == "number") {

      var array = [];
      console.log(recomanded)
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
    if ((new Date().getTime() - lastRefreashed) > 3 * 60 * 60 * 1000) {
      refreshList();
    }
    if (typeof req.body.skip == "number" && typeof req.body.limit == "number") {

      var array = [];
      for (var i = req.body.skip; i < req.body.skip + req.body.limit; i++) {
        if (leatest[i] == null) break;
        array.push(leatest[i]);
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
          'date_time': 1,
          'share':1
        }
      }];
      var result = await post_data.aggregate(usersPost_pipelines).toArray();
      console.log(result)

      if (result.length != 0) {
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
          'date_time': 1,
          'share':1,
          'post_content':1
        }

      var result = await post_data.findOne({_id: ObjectId(req.body.post_id)}, project);
      //console.log(result)

      if (result != null) {
        res.send({
          result: true,
          title: result.title,
          thumbnail: result.thumbnail,
          views: result.views,
          summary: result.summary,
          duration: result.duration,
          post_content: result.post_content,
          type: result.type,
          category:  result.category,
          date_time:  result.date_time,
          share:  result.share
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

app.all('/setView', async (req, res, next) => {
  try {
    if (typeof req.body.post_id != undefined){
      const result = await post_data.updateOne({_id: ObjectId(req.body.post_id)},{
        $inc: {views:1}
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

app.all('/setShare', async (req, res, next) => {
  try {
    if (typeof req.body.post_id != undefined){
      const result = await post_data.updateOne({_id: ObjectId(req.body.post_id)},{
        $inc: {share:1}
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







app.all('/getCategories', async (req, res, next) => {
  try {
    res.status(200).send(categories);

  } catch (error) {
    console.error(error);
    next(500)
  }

});

app.post('/getCategoryContents', async (req, res) => {
  try {
    if (typeof req.body.category != undefined) {
      category_pipeline = [{
        $match: {
          category: req.body.category,
          published: true
        }
      }, {
        $project: {
          'title': 1,
          'thumbnail': 1,
          'views': 1,
          'duration': 1,
          'summary': 1,
          'type': 1,
          'category': 1,
          'date_time': 1
        }
      }];
      var result = await post_data.aggregate(category_pipeline).toArray();
      //console.log(result);
      if (result.length != 0) {
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
        }
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
          'users.first_name': 1,
          'users.last_name': 1,
          'users.avatar': 1
        }
      }]
      var result = await post_data.aggregate(get_reviews_pipeline).toArray();
      result = result[0];
      console.log(result);
      var arr = [];

      for (var i = 0; i < result.reviews.length; i++) {
        var obj = {};
        obj.first_name = result.users[i].first_name;
        obj.first_name = result.users[i].first_name;
        obj.avatar = result.users[i].avatar;
        obj.review = result.reviews[i].review;
        obj.rating = result.reviews[i].rating;
        arr.push(obj);
      }
      console.log(arr);
      res.send(arr);
      /*EXPECTED STRUCTURE OF Result
       [ 
         reviews : 
         [
           {review: " the review body", rating: 4.6 }
          ],
        users: 
        [
          {
            first_name: "Manish", 
            last_name: "goon",
            avatar: "image.link"
          }
        ]
      ]*/

    } else {
      next(400)
    }

  } catch (error) {
    console.error(error);
    next(500)
  }

});

app.all('/refreshLists', async (req, res, next) => {
  try {
    refreshList();
    res.status(200).send({
      result: true,
      message: "All the lists are refreshed just now."
    })
  } catch (error) {

  }

});




app.use((err, req, res, next) => {

  switch (err) {
    case 400: { //BAD REQUEST
      console.error({
        error_code: err,
        path: req.path,
        headers: req.headers,
        body: req.body
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
        body: req.body
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
        body: req.body
      });
      res.status(err);
      res.send({
        result: false,
        message: "It was a NOT FOUND error, data you are looking for is not found in the database."
      });
      break;
    }

    case 500: { //INTERNAL SERVER ERROR
      console.error({
        error_code: err,
        path: req.path,
        headers: req.headers,
        body: req.body
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


async function refreshList() {
  try {

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
        'date_time': 1,
        'share':1
      }
    }];
    recomanded = await post_data.aggregate(recomanded_query).toArray();
    for (var i = 0; i < recomanded.length; i++) {
      let object = recomanded[i];
      let temp = object.author[0];
      let author = {}
      author.first_name = temp.first_name;
      author.last_name = temp.last_name;
      author.avatar = temp.avatar;
      author.user_id = temp._id;
      object.author = author;

      recomanded[i] = object;

    }
    const leatest_query = [{
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
        'date_time': 1,
        'share':1
      }
    }];
    leatest = await post_data.aggregate(leatest_query).toArray();
    for (var i = 0; i < leatest.length; i++) {
      let object = leatest[i];
      let temp = object.author[0];
      let author = {}
      author.first_name = temp.first_name;
      author.last_name = temp.last_name;
      author.avatar = temp.avatar;
      author.user_id = temp._id;
      object.author = author;
      leatest[i] = object;

    }

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
    categories = categories[0].value

    //console.log(categories);


    lastRefreashed = new Date().getTime();
    console.log("lists are refreashed! at: " + lastRefreashed);
    //console.log('Recomanded',recomanded);
    //console.log('Leatest',leatest);
  } catch (error) {
    console.error(error)
  }
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
