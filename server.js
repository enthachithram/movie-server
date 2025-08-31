// import { createRequire } from "module";
// const require = createRequire(import.meta.url);
const express = require("express");
require("dotenv").config();

const app = express();
const mongoose = require("mongoose");
const Commentu = require("./models/commentu");
const Like = require("./models/likes");
const Movie = require("./models/movie");
const User = require("./models/user");
const List = require("./models/list");
const Log = require("./models/log");

const cors = require("cors");
app.use(cors({ origin: "*" }));
const jwt = require("jsonwebtoken");
const requireAuth = require("./middleware/requireAuth.js");

const createToken = (_id) => {
  return jwt.sign({ _id }, process.env.SECRET);
};

// const corsOptions = {
//   origin: '*',
// };
// app.use(cors(corsOptions));

const dbURL = process.env.MONGO_DB;

mongoose.connect(dbURL).then(() => {
  console.log("mongo connected");
});

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
console.log("kjj");

app.listen(process.env.PORT, () => {
  console.log("listening to ", process.env.PORT);
});

app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  console.log(username, password);

  try {
    const user = await User.signup(username, password);
    const token = createToken(user._id);
    const userid = user._id;

    res.status(200).json({ username, userid, token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  console.log(username, password);

  try {
    const user = await User.login(username, password);
    const token = createToken(user._id);
    const userid = user._id;

    res.status(200).json({ username, userid, token, message: "logged in" });
  } catch (error) {
    res.status(400).json({ error: error.message });
    console.log(error);
    console.log(error.message);
  }
});

app.get("/ping", async (req, res) => {
  await fetch("https://aiaiai-zfg6.onrender.com/alive");
  res.send("pinged");
});

app.get("/", async (req, res) => {
  res.json("connected");
  const date = new Date().toISOString();
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const userinfo = req.get("User-Agent");

  const newlog = new Log({ date, ip, userinfo });

  try {
    const logged = await newlog.save();
    console.log(logged);
  } catch (error) {
    console.log("log error");
  }
});

app.get("/logs", async (req, res) => {
  const logs = await Log.find();
  res.json(logs);
});

//--------------forms--------------//

app.get("/commentu", (req, res) => {
  res.render("newcommentu");
});

app.get("/newmovie", (req, res) => {
  res.render("movies");
});

app.get("/signup", (req, res) => {
  res.render("newuser");
});

//-----------get reqs-----------//

app.get("/users", async (req, res) => {
  try {
    const user = await User.find();

    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const comments = await Commentu.find({ userid: req.params.id })
      .populate("movieid", "name")
      .lean()
      .exec();

    res.status(200).json({ user, comments });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/commentu/:id", async (req, res) => {
  let all = [];
  all.push(await Commentu.findById(req.params.id));

  const findchildren = async (parentid) => {
    const children = await Commentu.find({ parentid: parentid });
    all.push(...children);

    for (const child of children) {
      await findchildren(child._id);
    }
  };
  await findchildren(req.params.id);
  res.json(all);
  console.log(all);
});

app.get("/movies", (req, res) => {
  console.log(req);
  console.log(req.body);

  try {
    Movie.find().then((result) => {
      res.status(201).json(result);
    });
  } catch (error) {
    res.status(400).json("server error:: ");
  }
});

// Commentu.updateMany({}, { $set: { likes: 0 } }).then((d) => {
//   console.log(d);
// });

// Like.deleteMany({}).then((data) => {
//   console.log(data);
// });

// Commentu.deleteMany({
//   _id: {
//     $in: [
//       "67a4fa7f8aae2afd2630b0c3",
//       "67b75fa15ae74a594a6d80a0",
//       "67b75fae5ae74a594a6d80aa",
//       "67b762915ae74a594a6d80bf",
//     ],
//   },
// }).then((dat) => {
//   console.log(dat);
// });

app.get("/movies/:id", async (req, res) => {
  try {
    const { authorization } = req.headers;
    if (authorization) {
      await requireAuth(req, res, () => {});
    }

    // const movie = await Movie.findById(req.params.id);
    const comments = await Commentu.find({ movieid: req.params.id })
      .populate("userid", "username")
      .lean()
      .exec();

    if (!req.user) {
      res.json(comments);
    } else {
      const newcomments = Promise.all(
        comments.map(async (com) => {
          const liked = await Like.findOne({
            userid: req.user._id,
            commentid: com._id,
          });
          return { ...com, liked: liked ? true : false };
        })
      );
      newcomments.then((newcomments) => {
        res.json(newcomments);
      });
    }
  } catch (error) {
    res.status(400).json({ error });
    console.log(error);
  }
});

app.get("/allcomments", async (req, res) => {
  try {
    const comments = await Commentu.find().sort({ createdAt: -1 });
    res.json(comments);
  } catch (error) {
    res.status(400).json({ error });
  }
});

app.get("/likes", async (req, res) => {
  const likes = await Like.find();
  res.json(likes);
});

////////////spam///////////////////

app.use(requireAuth);

app.post("/newcommentu", async (req, res) => {
  console.log("requst recvd");
  Object.keys(req.body).forEach((key) => {
    if (req.body[key] === "") {
      req.body[key] = null;
    }
  });

  const { text, parentid, movieid } = req.body;

  const userid = req.user._id;
  try {
    const comment = new Commentu({ text, parentid, movieid, userid });
    const savedcomment = await comment.save();

    const populatedComment = await Commentu.findById(savedcomment._id)
      .populate("userid", "username")
      .lean() //  plain js object lightweighy
      .exec(); //for promise

    res.status(201).json(populatedComment);
  } catch (error) {
    console.error("Error saving comment:", error);
    res.status(400).json({ error: "Failed to save comment" });
  }
});

app.delete("/commentu/:id", async (req, res) => {
  try {
    const userid = req.user._id;

    const id = req.params.id;

    const comment = await Commentu.findById(id);

    if (!comment) {
      return res.json({ error: "This comment doesn't exist" });
    }

    if (comment.userid.toString() !== userid.toString()) {
      return res.json({ error: "Nice try lil bro" });
    }

    const children = await Commentu.find({ parentid: id });

    if (children.length > 0) {
      comment.text = "[DELETED COMMENT]";
      comment.userid = null;
      await comment.save();
      res.status(200).json(id);
    } else {
      const deletedcomment = await Commentu.findByIdAndDelete(id);

      if (deletedcomment) {
        res.status(200).json(id);
        Like.deleteMany({ commentid: deletedcomment._id });
        console.log(deletedcomment._id);
      } else {
        res.status(404).json({ error: "Item with id  not found" });
      }
    }
  } catch (error) {
    res.status(500).json({
      error: "An error occurred while deleting the item",
      details: error.message,
    });
  }
});

////////////   LIKES  /////////////////

app.post("/like", async (req, res) => {
  const { commentid } = req.body;
  const userid = req.user._id;

  try {
    const exists = await Like.findOne({ userid: userid, commentid: commentid });

    if (!exists) {
      const like = new Like({ userid, commentid });
      const comment = await Commentu.findById(commentid);
      if (!comment) {
        throw new Error("comment doesnt exist");
      }
      comment.likes += 1;
      await comment.save();
      // const del = await Like.findByIdAndDelete("67e9af2b8e6a3c34f4122ee2");
      await like.save();
      res.json("created like");
    } else {
      res.json("already liked");
    }
  } catch (error) {
    res.status(404).json({ error: error });
  }
});

app.delete("/like/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const del = await Like.findOneAndDelete({ commentid: id });
    const comment = await Commentu.findById(id);
    comment.likes -= 1;
    await comment.save();

    if (!del) {
      res.status(404).json("doesnt even exist");
    }
    res.json({ msg: "deleted", id: del._id });
  } catch (error) {
    res.json({ error: error });
  }
});

/////////-----//////////

app.post("/newmovie", async (req, res) => {
  const { name, imdb } = req.body;
  const year = 2024;
  let telname = (vposter = hposter = "");

  try {
    const movie = new Movie({ name, year, telname, vposter, hposter, imdb });
    await movie.save();
    res.status(201).json({ message: "Movie created successfully!" });
  } catch (error) {
    console.error("Error saving movie:", error);
    res.status(500).json({ error: "Failed to save movie" });
  }
});

app.post("/newlist", async (req, res) => {
  const { name, number } = req.body;

  try {
    const item = new List({ name, number });
    await item.save();
    res.status(201).json(item);
  } catch (error) {
    console.error("Error saving movie:", error);
    res.status(500).json({ error: "Failed to save movie" });
  }
});

app.get("/list", (req, res) => {
  console.log(req);

  try {
    List.find().then((result) => {
      res.status(201).json(result);
    });
  } catch (error) {
    res.status(400).json("server error:: ");
  }
});
