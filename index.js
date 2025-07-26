const express = require("express")
const app = express()
const cors = require("cors")
//  ---------------------------------------------------------------------------------------------------

require('dotenv').config();

app.use(cors());

// OR, specify allowed origins
// app.use(cors({
//   origin: 'http://localhost:5174'  
// }));

app.use(cors({
  origin: '*'  
}));
//  ---------------------------------------------------------------------------------------------------

const { initializeDatabase } = require("./db/db.connect")
const Intern = require("./models/intern.models")

app.use(express.json())
initializeDatabase()
//  ---------------------------------------------------------------------------------------------------

function logAndThrowError(message, error) {
  console.error(message, error);
  throw error;
}

//  ---------------------------------------------------------------------------------------------------

// GET all interns
async function readAllInterns(searchTitle = '') {
  try {
    let query = {};
    if (searchTitle) {
      query.title = { $regex: searchTitle, $options: 'i' };
    }
    const interns = await Intern.find(query);
    return interns;
  } catch (error) {
    logAndThrowError("Error fetching interns:", error);
  }
}

app.get("/interns", async (req, res) => {
  try {
    const searchTitle = req.query.title || '';
    const interns = await readAllInterns(searchTitle);

    if (interns.length > 0) {
      res.status(200).json(interns);
    } else {
      res.status(200).json([]);
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch interns" });
  }
})
//  ---------------------------------------------------------------------------------------------------

// GET intern by ID
async function readInternById(internId) {
  try {
    const intern = await Intern.findById(internId)
    return intern
  } catch (error) {
    logAndThrowError("Error fetching intern:", error)
  }
}

app.get("/interns/:internId", async (req, res) => {
  try {
    const intern = await readInternById(req.params.internId)
    if (intern) {
      res.status(200).json(intern)
    } else {
      res.status(404).json({ error: "Intern not found" })
    }
  } catch (error) {
    if (error.name === 'CastError' && error.kind === 'ObjectId') {
      return res.status(400).json({ error: "Invalid Intern ID format" });
    }
    res.status(500).json({ error: "Failed to fetch intern" })
  }
})
//  ---------------------------------------------------------------------------------------------------
// Async function to add new entry
async function createIntern(data) {
  const { title, companyName, location, salary, jobType, description, qualifications } = data;

  if (!title || !companyName || !location || !salary || !jobType || !description || !qualifications) {
    const error = new Error("All fields are required.");
    error.statusCode = 400;
    throw error;
  }

  if (typeof salary !== 'number' || salary <= 0) {
    const error = new Error("Salary must be a positive number.");
    error.statusCode = 400;
    throw error;
  }

  let formattedQualifications = [];
  if (Array.isArray(qualifications)) {
    formattedQualifications = qualifications.map(q => String(q).trim());
  } else if (typeof qualifications === 'string') {
    formattedQualifications = qualifications.split(',').map(q => q.trim()).filter(q => q !== '');
  } else {
    const error = new Error("Qualifications must be a string (comma-separated) or an array.");
    error.statusCode = 400;
    throw error;
  }
  if (formattedQualifications.length === 0) {
    const error = new Error("Qualifications cannot be empty.");
    error.statusCode = 400;
    throw error;
  }

  try {
    const newIntern = new Intern({
      title,
      companyName,
      location,
      salary,
      jobType,
      description,
      qualifications: formattedQualifications,
    });

    const savedIntern = await newIntern.save();
    return savedIntern;
  } catch (error) {
    if (error.name === 'ValidationError') {
      let errors = {};
      for (let field in error.errors) {
        errors[field] = error.errors[field].message;
      }
      const validationError = new Error("Validation failed");
      validationError.statusCode = 400;
      validationError.details = errors;
      throw validationError;
    }
    logAndThrowError("Error creating intern:", error);
    const genericError = new Error("Failed to create intern");
    genericError.statusCode = 500;
    throw genericError;
  }
}

// POST  
app.post("/interns", async (req, res) => {
  try {
    const savedIntern = await createIntern(req.body);
    res.status(201).json(savedIntern);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message, details: error.details });
  }
});
//  ---------------------------------------------------------------------------------------------------

// Async  
async function deleteIntern(internId) {
  try {
    const deletedIntern = await Intern.findByIdAndDelete(internId);
    if (!deletedIntern) {
      const error = new Error("Intern not found");
      error.statusCode = 404;
      throw error;
    }
    return { message: "Intern deleted successfully" };
  } catch (error) {
    if (error.name === 'CastError' && error.kind === 'ObjectId') {
      const castError = new Error("Invalid Intern ID format");
      castError.statusCode = 400;
      throw castError;
    }
    logAndThrowError("Error deleting intern:", error);
    const genericError = new Error("Failed to delete intern");
    genericError.statusCode = 500;
    throw genericError;
  }
}

// DELETE route  
app.delete("/interns/:internId", async (req, res) => {
  try {
    const result = await deleteIntern(req.params.internId);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});
//  ---------------------------------------------------------------------------------------------------

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke on the server!');
});

const PORT = process.env.PORT || 9000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
