const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("Bisto boss is running...");
});

// middleware:
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.q1nysvk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const menuCollection = client.db("bistoBossDB").collection("menu");
    const reviewCollection = client.db("bistoBossDB").collection("reviews");
    const cartCollection = client.db("bistoBossDB").collection("carts");
    const userCollection = client.db("bistoBossDB").collection("users");

    // create user related apis:
    // save user to bd:
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user?.email };
      const isExistUser = await userCollection.findOne(query);
      if (isExistUser) {
        return res.send({ message: "User Already Exist", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // get all users:
    app.get("/users", async (req, res) => {
      // const user = req.body;
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // Get all menu Data:
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });

    // Get all data that matched a specific category:
    app.get("/menu/:category", async (req, res) => {
      const categoryName = req.params.category;
      const query = { category: categoryName };
      const result = await menuCollection.find(query).toArray();
      res.send(result);
    });

    // Get all reviews data:
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    // Save reviews to DB:
    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    // Get all cart data by a specific user email:
    app.get("/carts", async (req, res) => {
      const email = req.query?.email;
      const query = { user_email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    // Save all carts
    app.post("/carts", async (req, res) => {
      const cartItem = req.body?.newItem;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    });

    // delete a item from carts:
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params?.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Bisto boss is running on PORT: ${port}`);
});
