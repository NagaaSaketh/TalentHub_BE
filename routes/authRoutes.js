const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const authRouter = express.Router();
const userAuth = require("../middleware/auth");
const User = require("../models/User");
const Applicant = require("../models/Applicant");
const Recruiter = require("../models/Recruiter");
const upload = require("../middleware/upload");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");

// API route to register

authRouter.post(
  "/register",
  upload.fields([
    { name: "resume", maxCount: 1 },
    { name: "companyLogo", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        fullname,
        email,
        password,
        role,
        education,
        totalExperience,
        experience,
        skills,
        location,
        companyName,
        website,
        aboutCompany,
      } = req.body;

      if (!fullname || !email || !password || !role) {
        return res.status(400).json({
          message: "Fullname , email , password and role are required!",
        });
      }

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

      let companyLogoUrl = "";

      if (req.files?.companyLogo) {
        const result = await cloudinary.uploader.upload(
          req.files.companyLogo[0].path,
          {
            folder: "talenthub/recruiters/logos",
          },
        );

        fs.unlinkSync(req.files.companyLogo[0].path);

        companyLogoUrl = result.secure_url;
      }

      let resumeUrl = "";

      if (req.files?.resume) {
        const result = await cloudinary.uploader.upload(
          req.files.resume[0].path,
          {
            folder: "talenthub/applicants/resumes",
            resource_type: "raw",
          },
        );

        fs.unlinkSync(req.files.resume[0].path);

        resumeUrl = result.secure_url;
      }

      if (role === "applicant") {
        await Applicant.create({
          user: user._id,
          education: [],
          totalExperience: Number(totalExperience) || 0,
          experience: [],
          bio: "",
          skills: skills ? JSON.parse(skills) : [],
          resume: resumeUrl,
          location: location || "",
        });
      }

      if (role === "recruiter") {
        await Recruiter.create({
          user: user._id,
          companyName: companyName || "",
          companyLogo: companyLogoUrl,
          website: website || "",
          aboutCompany: aboutCompany || "",
        });
      }
      res
        .status(201)
        .json({ message: "User registration successfully!", user });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ message: "Something went wrong!", error: err.message });
    }
  },
);

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

// API route to reset password 
authRouter.put("/forgot-password", async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (!email || !password || !confirmPassword) {
      return res.status(400).json({
        message: "Email, password and confirm password are required!",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match!",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found!",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;

    await user.save();

    res.status(200).json({
      message: "Password reset successfully!",
    });
  } catch (err) {
    res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
});

// API route to get current loggedin user details

authRouter.get("/me", userAuth, async (req, res) => {
  try {
    let profile = null;

    if (req.user.role === "applicant") {
      profile = await Applicant.findOne({ user: req.user._id });
    } else if (req.user.role === "recruiter") {
      profile = await Recruiter.findOne({ user: req.user._id });
    }

    res.status(200).json({
      message: "User authenticated!",
      user: req.user,
      profile,
    });
  } catch (err) {
    res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
});

module.exports = authRouter;
