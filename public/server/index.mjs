import express from "express";
import cors from "cors";
import "./loadEnvironment.mjs";
import "express-async-errors";
import posts from "./routes/posts.mjs";
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const PORT = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());

// Load the /posts routes
app.use("/users", posts);

// Global error handling
app.use((err, _req, res, next) => {
  res.status(500).send("Uh oh! An unexpected error occured.")
})

// start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
