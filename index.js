const express = require("express")
const app = express()
const cors = require("cors")

const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))

const { initializeDatabase } = require("./db/db.connect")
const Product = require("./models/product.models")

app.use(express.json())

initializeDatabase()

// ------------------------- Product Routes -------------------------
// Get all products
async function readAllProducts() {
  try {
    const products = await Product.find().populate("category")
    return products
  } catch (error) {
    console.log("Error fetching products:", error)
    throw error
  }
}

app.get("/products", async (req, res) => {
  try {
    const products = await readAllProducts()
    if (products.length > 0) {
      res.status(200).json(products)
    } else {
      res.status(404).json({ error: "No products found" })
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" })
  }
})

// Get product by ID
async function readProductById(productId) {
  try {
    const product = await Product.findById(productId).populate("category")
    return product
  } catch (error) {
    console.log("Error fetching product:", error)
    throw error
  }
}

app.get("/products/:productId", async (req, res) => {
  try {
    const product = await readProductById(req.params.productId)
    if (product) {
      res.status(200).json(product)
    } else {
      res.status(404).json({ error: "Product not found" })
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch product" })
  }
})

// Start the server
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
