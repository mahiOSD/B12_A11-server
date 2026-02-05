require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion } = require('mongodb')

const port = process.env.PORT || 5000
const app = express()

app.use(
  cors({
    origin: ['http://localhost:5173'],
    credentials: true,
  })
)

app.use(express.json())

const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

async function run() {
  try {
    await client.connect()

    const db = client.db('localchef')
    const mealsCollection = db.collection('meals')
    const reviewsCollection = db.collection('reviews')
    const usersCollection = db.collection('users')


    app.post('/users', async (req, res) => {
      const user = req.body

      const existingUser = await usersCollection.findOne({
        email: user.email,
      })

      if (existingUser) {
        return res.send({ message: 'User already exists' })
      }

      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

  
    app.get('/meals-limit-6', async (req, res) => {
      const meals = await mealsCollection.find().limit(6).toArray()
      res.send(meals)
    })

  
    app.get('/reviews', async (req, res) => {
      const reviews = await reviewsCollection.find().toArray()
      res.send(reviews)
    })

    app.get('/', (req, res) => {
      res.send('Server running')
    })

    console.log('MongoDB Connected')
  } catch (err) {
    console.log(err)
  }
}

run()

app.listen(port, () => {
  console.log(`Server running on ${port}`)
})
