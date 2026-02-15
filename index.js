require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const meals = await mealsCollection
      .find()
      .skip(skip)
      .limit(limit)
      .toArray();

    const totalMeals = await mealsCollection.countDocuments();

    res.send({
      meals,
      totalMeals,
    });
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch meals" });
  }
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

  if (!user) return res.status(404).send({ error: "User not found" });

  if (user.role !== "user") {
    return res.status(403).send({ error: "Only users can place orders" });
  }

  if (user.status === "fraud") {
    return res.status(403).send({ error: "Fraud users cannot place orders" });
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


app.patch("/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ error: "Invalid order ID" });
    }

    let newStatus;
    if (action === "cancel") newStatus = "cancelled";
    else if (action === "accept") newStatus = "accepted";
    else if (action === "deliver") newStatus = "delivered";
    else return res.status(400).send({ error: "Invalid action" });

    const result = await ordersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { orderStatus: newStatus } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ error: "Order not found" });
    }

    res.send({ message: `Order ${newStatus}`, modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Server error" });
  }
});

app.post("/create-stripe-session", async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Order ${orderId}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.SITE_DOMAIN}/payment-success/${orderId}`,
      cancel_url: `${process.env.SITE_DOMAIN}/dashboard/my-orders`,
    });

    res.send({ url: session.url });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "Stripe session failed" });
  }
});

app.patch("/orders/pay/:id", async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) return res.status(400).send({ error: "Invalid order ID" });

  const result = await ordersCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { paymentStatus: "paid" } }
  );

  if (result.matchedCount === 0) return res.status(404).send({ error: "Order not found" });

  res.send({ message: "Payment successful" });
});

app.get("/orders/order/:id", async (req, res) => {
  const { id } = req.params;

  const order = await ordersCollection.findOne({
    _id: new ObjectId(id),
  });

  res.send(order);
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

app.get("/meals/chef/:chefId", async (req, res) => {
  try {
    const { chefId } = req.params;

    const meals = await mealsCollection
      .find({ chefId })
      .toArray();

    res.send({ meals });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Failed to fetch chef meals" });
  }
});




app.post("/meals", async (req, res) => {
  try {
    const { foodName, price, rating, ingredients, estimatedDeliveryTime, deliveryArea, chefExperience, userEmail, image } = req.body;

    const chef = await usersCollection.findOne({ email: userEmail });
    if (!chef) return res.status(404).send({ error: "Chef not found" });
    if (chef.role !== "chef") return res.status(403).send({ error: "Only chefs can create meals" });
    if (chef.status === "fraud") return res.status(403).send({ error: "Fraud chefs cannot create meals" });

    const newMeal = {
      name: foodName,
      price: Number(price),
      rating: Number(rating),
      ingredients: ingredients ? (Array.isArray(ingredients) ? ingredients.filter(i => i) : [ingredients]) : [],
      estimatedDeliveryTime,
      deliveryArea,
      chefExperience,
      chefName: chef.name,
      chefId: chef.chefId,
      userEmail,
      image: image || null,  
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


app.put("/meals/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ error: "Invalid meal ID" });
    }

    const { foodName, price, rating, ingredients, estimatedDeliveryTime, deliveryArea, chefExperience, chefName, image } = req.body;

    const updatedData = {
      name: foodName,
      price: Number(price),
      rating: Number(rating),
      ingredients: ingredients
        ? Array.isArray(ingredients)
          ? ingredients.filter(i => i)
          : [ingredients]
        : [],
      estimatedDeliveryTime,
      deliveryArea,
      chefExperience,
      chefName,
    };

    if (image) {
      updatedData.image = image; 
    }

    const result = await mealsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ error: "Meal not found" });
    }

    res.send({ message: "Meal updated successfully", modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Failed to update meal" });
  }
});



app.get("/users", async (req, res) => {
  try {
    const allUsers = await usersCollection.find().toArray();
    res.send(allUsers);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Failed to fetch users" });
  }
});

app.patch("/users/fraud/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) return res.status(400).send({ error: "Invalid user ID" });

    const user = await usersCollection.findOne({ _id: new ObjectId(id) });
    if (!user) return res.status(404).send({ error: "User not found" });

    if (user.role === "admin") {
      return res.status(403).send({ error: "Cannot mark admin as fraud" });
    }

    if (user.status === "fraud") {
      return res.status(400).send({ error: "User already fraud" });
    }

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "fraud" } }
    );

    res.send({ message: "User marked as fraud successfully", result });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Server error" });
  }
});

app.get("/platform-stats", async (req, res) => {
  try {
    const usersCount = await usersCollection.countDocuments();

    const pendingOrders = await ordersCollection.countDocuments({
      orderStatus: "pending"
    });

    const deliveredOrders = await ordersCollection.countDocuments({
      orderStatus: "delivered"
    });

    const paidOrders = await ordersCollection.find({
      paymentStatus: "paid"
    }).toArray();

    const totalPayment = paidOrders.reduce(
      (sum, order) => sum + order.price * order.quantity,
      0
    );

    res.send({
      totalUsers: usersCount,
      ordersPending: pendingOrders,
      ordersDelivered: deliveredOrders,
      totalPayment
    });

  } catch (error) {
    res.status(500).send({ error: "Failed to load statistics" });
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
