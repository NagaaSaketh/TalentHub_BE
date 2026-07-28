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
const app = express();


app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.use("/", authRouter);
app.use("/", recruiterRouter);
app.use("/", applicantRouter);

initialiseDB();

app.get("/", (req, res) => {
  res.send("Talent Hub - Backend.");
});

const PORT = 4000;
app.listen(PORT, () =>
  console.log("Server is running on", PORT || process.env.PORT),
);
