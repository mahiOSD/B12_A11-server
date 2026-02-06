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

  
    app.post("/favorites", async (req, res) => {
      const fav = req.body;

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

    app.get("/favorites/:email", async (req, res) => {
      const email = req.params.email;

      const result = await favoritesCollection
        .find({ userEmail: email })
        .toArray();

      res.send(result);
    });

  
    app.post("/orders", async (req, res) => {
      const order = req.body;
      order.orderTime = new Date();
      order.paymentStatus = "Pending";

      const result = await ordersCollection.insertOne(order);
      res.send(result);
    });

    app.get("/orders/:email", async (req, res) => {
      const result = await ordersCollection
        .find({ userEmail: req.params.email })
        .toArray();

      res.send(result);
    });

    app.post("/role-request", async (req, res) => {
      const request = req.body;
      request.requestStatus = "pending";
      request.requestTime = new Date();

      const result = await roleRequestCollection.insertOne(request);
      res.send(result);
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
