const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const authRouter = express.Router();
const userAuth = require("../middleware/auth");
const User = require("../models/User");
const Applicant = require("../models/Applicant");
const Recruiter = require("../models/Recruiter");

// API route to register 

authRouter.post("/register", async (req, res) => {
  try {
    const {
      fullname,
      email,
      password,
      role,
      education,
      experience,
      bio,
      photo,
      resume,
      skills,
      location,
      companyName,
      companyLogo,
      website,
      aboutCompany,
    } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "Email already exists!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      fullname,
      email,
      password: hashedPassword,
      role,
    });

    await user.save();

    if (role === "applicant") {
      await Applicant.create({
        user: user._id,
        education,
        experience,
        skills,
        resume,
        location,
      });
    }

    if (role === "recruiter") {
      await Recruiter.create({
        user: user._id,
        companyName,
        companyLogo,
        website,
        aboutCompany,
      });
    }
    res.status(201).json({ message: "User registration successfully!", user });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Something went wrong!", error: err.message });
  }
});

// API route to login

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials!" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials!" });
    }

    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.cookie("token", token, { httpOnly: true, secure: false });

    res.status(200).json({ message: "Login successful" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Something went wrong", error: err.message });
  }
});


// API route to logout
authRouter.post("/logout", userAuth, (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Logged out successfully!" });
});

// API route to get current loggedin user details

authRouter.get("/me", userAuth, async (req, res) => {
  try {
    let profile = null;

    if(req.user.role === "applicant"){
      profile = await Applicant.findOne({user:req.user._id})
    }else if(req.user.role === "recruiter"){
      profile = await Recruiter.findOne({user:req.user._id})
    }

    res.status(200).json({
      message: "User authenticated!",
      user: req.user,
      profile
    });
  } catch (err) {
    res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
});

module.exports = authRouter;
