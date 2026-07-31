require("dotenv").config();
const fs = require("fs");
const express = require("express");
const { initialiseDB } = require("./db/db.connect");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const authRouter = require("./routes/authRoutes");
const recruiterRouter = require("./routes/recruiterRoutes");
const applicantRouter = require("./routes/applicantRoutes");
const aiRouter = require("./routes/aiRoutes");
const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/", authRouter);
app.use("/", recruiterRouter);
app.use("/", applicantRouter);
app.use("/", aiRouter);

initialiseDB();

app.get("/", (req, res) => {
  res.send("Talent Hub - Backend.");
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log("Server is running on", PORT || process.env.PORT),
);
