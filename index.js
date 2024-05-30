const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
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

    // jwt related apis:
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET_KEY, {
        expiresIn: "2h",
      });
      res.send({ token });
    });

    const verifyToken = (req, res, next) => {
      if (!req.headers?.authorization) {
        return res.status(401).send({ message: "unauthorize access" });
      }
      const token = req.headers?.authorization.split(" ")[1];
      if (!token) {
        return res.status(401).send({ message: "unauthorize access" });
      }
      jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
          return res.status(403).send({ message: "forbidden access" });
        }
        req.user = decoded;
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.user?.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // users related apis:
    // get all users:
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get(
      "/users/admin/:email",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const email = req.params?.email;

        if (email !== req.user?.email) {
          return res.status(403).send({ message: "unauthorize access" });
        }
        const query = { email: email };
        const user = await userCollection.findOne(query);
        let admin = false;
        if (user) {
          admin = user?.role === "admin";
        }
        res.send({ admin });
      }
    );

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

    // delete a specific user:
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // make admin Using Patch:
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // Get all menu Data:
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });

    // get a single menu item by id:
    app.get("/menu/:id", async (req, res) => {
      const id = req.params?.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.findOne(query);
      res.send(result);
    });

    // save a new menu Item:
    app.post("/add-menu", async (req, res) => {
      const item = req.body;
      const result = await menuCollection.insertOne(item);
      res.send(result);
    });

    // delete a single menu Item:
    app.delete("/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.deleteOne(query);
      res.send(result);
    });

    // update a menu item:
    app.patch("/menu", async (req, res) => {
      const id = req.query?.id;
      const item = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { ...item },
      };
      const result = await menuCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Get all data that matched a specific category:
    app.get("/menu-category", async (req, res) => {
      const categoryName = req.query?.category;
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
