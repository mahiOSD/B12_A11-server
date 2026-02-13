require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const client = new MongoClient(process.env.DB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("LocalChefBazar");

    const mealsCollection = db.collection("meals");
    const reviewsCollection = db.collection("reviews");
    const favoritesCollection = db.collection("favorites");
    const ordersCollection = db.collection("orders");
    const usersCollection = db.collection("users");
    const roleRequestCollection = db.collection("roleRequests");

    console.log("MongoDB Connected");

 app.post("/users", async (req, res) => {
  const user = req.body;

  const existingUser = await usersCollection.findOne({
    email: user.email.toLowerCase(),
  });

  if (existingUser) {
    return res.send({ message: "User already exists" });
  }

  const newUser = {
    ...user,
    email: user.email.toLowerCase(),
    role: user.role || "user",
    createdAt: new Date(),
  };

  const result = await usersCollection.insertOne(newUser);

  res.send(result);
});


app.get("/users/:email", async (req, res) => {
  const email = req.params.email.toLowerCase();

  const user = await usersCollection.findOne({
    email: { $regex: new RegExp("^" + email + "$", "i") }
  });

  res.send(user);
});



app.get("/meals", async (req, res) => {
      const result = await mealsCollection.find().toArray();
      res.send(result);
    });

app.get("/meals/:id", async (req, res) => {
      const id = req.params.id;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: "Invalid meal ID" });
      }

      const meal = await mealsCollection.findOne({ _id: new ObjectId(id) });

      if (!meal) {
        return res.status(404).send({ error: "Meal not found" });
      }

      res.send(meal);
    });

   
    app.get("/reviews/:foodId", async (req, res) => {
      const foodId = req.params.foodId;

      if (!ObjectId.isValid(foodId)) {
        return res.status(400).send({ error: "Invalid food ID" });
      }

      const result = await reviewsCollection
        .find({ foodId })
        .sort({ date: -1 })
        .toArray();

      res.send(result);
    });

    app.post("/reviews", async (req, res) => {
      const review = req.body;
      review.date = new Date();

      const result = await reviewsCollection.insertOne(review);
      res.send(result);
    });


app.get("/meals-limit-6", async (req, res) => {
  const result = await mealsCollection
    .find()
    .limit(6)
    .toArray();

  res.send(result);
});

app.get("/reviews", async (req, res) => {
  const result = await reviewsCollection
    .find()
    .sort({ date: -1 })
    .toArray();

  res.send(result);
});

  
   app.post("/reviews", async (req, res) => {
  const review = req.body;

  const user = await usersCollection.findOne({
    email: review.userEmail
  });

  if (user?.role !== "user") {
    return res.status(403).send({ error: "Only users can review" });
  }

  review.date = new Date();

  const result = await reviewsCollection.insertOne(review);
  res.send(result);
});


    app.get("/favorites/:email", async (req, res) => {
      const email = req.params.email;

      const result = await favoritesCollection
        .find({ userEmail: email })
        .toArray();

      res.send(result);
    });

    app.post("/favorites", async (req, res) => {
  const fav = req.body;

  const user = await usersCollection.findOne({
    email: fav.userEmail
  });

  if (user?.role !== "user") {
    return res.status(403).send({ error: "Only users can add favorites" });
  }

  const exists = await favoritesCollection.findOne({
    userEmail: fav.userEmail,
    mealId: fav.mealId,
  });

  if (exists) {
    return res.send({ message: "Already added" });
  }

  fav.addedTime = new Date();

  const result = await favoritesCollection.insertOne(fav);
  res.send(result);
});


    
app.delete("/reviews/:id", async (req, res) => {
  await reviewsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
  res.send({ message: "Deleted" });
});


app.put("/reviews/:id", async (req, res) => {
  const { rating, comment } = req.body;
  await reviewsCollection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { rating, comment } }
  );
  res.send({ message: "Updated" });
});


app.delete("/favorites/:id", async (req, res) => {
  await favoritesCollection.deleteOne({ _id: new ObjectId(req.params.id) });
  res.send({ message: "Deleted" });
});


app.post("/orders", async (req, res) => {
  const order = req.body;

  const user = await usersCollection.findOne({
    email: order.userEmail
  });

  if (user?.role !== "user") {
    return res.status(403).send({ error: "Only users can place orders" });
  }

  order.orderTime = new Date();
  order.paymentStatus = "Pending";

  const result = await ordersCollection.insertOne(order);
  res.send(result);
});



    app.get("/orders/:email", async (req, res) => {
  const email = req.params.email;

  const result = await ordersCollection
    .find({ userEmail: email })
    .toArray();

  res.send(result);
});

app.get("/chef-orders/:chefId", async (req, res) => {
  const chefId = req.params.chefId;
  const result = await ordersCollection
    .find({ chefId: chefId })
    .sort({ orderTime: -1 })
    .toArray();
  res.send(result);
});


app.post("/role-request", async (req, res) => {
  try {
    const request = req.body;

    const newRequest = {
      userName: request.userName,
      userEmail: request.userEmail,
      requestType: request.requestType,
      requestStatus: "pending",
      requestTime: new Date(),
    };

    const result = await roleRequestCollection.insertOne(newRequest);

    res.send(result);
  } catch (error) {
    console.error("Role request error:", error);
    res.status(500).send({ error: "Failed to create role request" });
  }
});

    
app.get("/role-requests", async (req, res) => {
  try {
    const requests = await roleRequestCollection
      .find()
      .sort({ requestTime: -1 })
      .toArray();
    res.send(requests);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Server error" });
  }
});


app.patch("/role-requests/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; 

    const request = await roleRequestCollection.findOne({ _id: new ObjectId(id) });
    if (!request) return res.status(404).send({ error: "Request not found" });

    let updateData = {};

    if (action === "approve") {
      let updatedFields = { role: request.requestType };

      
      if (request.requestType === "chef") {
        const randomId = Math.floor(1000 + Math.random() * 9000); 
        updatedFields.chefId = `chef-${randomId}`;
      }

      
      await usersCollection.updateOne(
        { email: request.userEmail },
        { $set: updatedFields }
      );

      
      updateData.requestStatus = "approved";

    } else if (action === "reject") {
      updateData.requestStatus = "rejected";
    }

    const result = await roleRequestCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    res.send({ message: `Request ${action}d successfully`, result });

  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Server error" });
  }
});

const multer = require("multer");
const path = require("path");


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); 
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});

const upload = multer({ storage: storage });


app.use("/uploads", express.static("uploads"));

app.post("/meals", upload.single("foodImage"), async (req, res) => {
  try {
    const { foodName, price, rating, ingredients, estimatedDeliveryTime, chefExperience, userEmail } = req.body;

  
    const chef = await usersCollection.findOne({ email: userEmail });

    const newMeal = {
      name: foodName,
      price: Number(price),
      rating: Number(rating),

      ingredients: ingredients
        ? Array.isArray(ingredients)
          ? ingredients.filter(i => i)
          : [ingredients]
        : [],

      estimatedDeliveryTime,
      chefExperience,

      chefName: chef?.name || "Unknown Chef",
      chefId: chef?.chefId || null,

      userEmail,
      image: req.file ? `/uploads/${req.file.filename}` : null,
      createdAt: new Date(),
    };

    const result = await mealsCollection.insertOne(newMeal);
    res.send(result);

  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Failed to create meal" });
  }
});


app.delete("/meals/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const result = await mealsCollection.deleteOne({
      _id: new ObjectId(id)
    });

    res.send(result);
  } catch (err) {
    res.status(500).send({ error: "Delete failed" });
  }
});

app.put("/meals/:id", upload.single("foodImage"), async (req, res) => {
  try {
    const id = req.params.id;

    const updatedData = {
      name: req.body.foodName,
      price: Number(req.body.price),
      rating: Number(req.body.rating),
      ingredients: Array.isArray(req.body.ingredients)
        ? req.body.ingredients
        : [req.body.ingredients],
      estimatedDeliveryTime: req.body.estimatedDeliveryTime,
      chefExperience: req.body.chefExperience,
      chefName: req.body.chefName,
    };

    if (req.file) {
      updatedData.image = `/uploads/${req.file.filename}`;
    }

    const result = await mealsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );

    res.send(result);
  } catch (err) {
    res.status(500).send({ error: "Update failed" });
  }
});



 app.get("/", (req, res) => {
      res.send({ status: "Server is running" });
    });
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

run().catch(console.error);

app.listen(port, () => {
  console.log("Server Running on port", port);
});
