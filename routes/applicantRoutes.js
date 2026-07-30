const express = require("express");
const userAuth = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const Job = require("../models/Jobs");
const Bookmark = require("../models/Bookmarks");
const Application = require("../models/Application");
const Applicant = require("../models/Applicant");
const Recruiter = require("../models/Recruiter");
const upload = require("../middleware/upload");
const fs = require("fs");
const cloudinary = require("../config/cloudinary");
const applicantRouter = express.Router();

// API route to browse jobs

applicantRouter.get(
  "/jobs",
  userAuth,
  authorize("applicant"),
  async (req, res) => {
    try {
      const {
        minSalary,
        maxSalary,
        sort,
        requiredExp,
        location,
        jobType,
        isRemote,
      } = req.query;

      const filter = { isArchived: false };

      if (location) {
        filter.location = {
          $regex: location,
          $options: "i",
        };
      }

      if (jobType) {
        filter.jobType = jobType;
      }

      if (requiredExp) {
        filter.requiredExp = { $gte: Number(requiredExp) };
      }

      if (isRemote !== undefined) {
        filter.isRemote = isRemote === "true";
      }

      if (minSalary || maxSalary) {
        filter["salary.min"] = {};

        if (minSalary) {
          filter["salary.min"].$gte = Number(minSalary);
        }

        if (maxSalary) {
          filter["salary.max"] = { $lte: Number(maxSalary) };
        }
      }
      let query = Job.find(filter);

      switch (sort) {
        case "salary-asc":
          query = query.sort({ "salary.min": 1 });
          break;

        case "salary-desc":
          query = query.sort({ "salary.max": -1 });
          break;

        case "latest":
          query = query.sort({ createdAt: -1 });
          break;

        default:
          query = query.sort({ createdAt: -1 });
      }

      const jobs = await query;

      return res.status(200).json(jobs);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Something went wrong", error: err.message });
    }
  },
);

// API route to get job by details

applicantRouter.get(
  "/jobs/:id/details",
  userAuth,
  authorize("applicant"),
  async (req, res) => {
    try {
      const loggedInUser = req.user;
      const jobId = req.params.id;

      const job = await Job.findById(jobId).populate(
        "recruiter",
        "fullname email",
      );

      const recruiterProfile = await Recruiter.findOne({
        user: job.recruiter._id,
      }).select("designation companyName website logo");

      const applicantsCount = await Application.countDocuments({
        job: jobId,
      });

      if (!job) {
        return res.status(404).json({
          message: "Job not found!",
        });
      }

      const similarJobs = await Job.find({
        _id: { $ne: job._id },
        jobType: job.jobType,
        isArchived: false,
      }).limit(5);

      const applicant = await Applicant.findOne({
        user: loggedInUser._id,
      });

      if (!applicant) {
        return res.status(404).json({
          message: "Applicant not found!",
        });
      }

      const existingApplication = await Application.findOne({
        applicant: applicant._id,
        job: jobId,
        status: { $ne: "Withdrawn" },
      });

      const existingBookmark = await Bookmark.findOne({
        applicant: loggedInUser._id,
        job: jobId,
      });

      return res.status(200).json({
        job,
        recruiterProfile,
        similarJobs,
        hasApplied: !!existingApplication,
        hasBookmarked: !!existingBookmark,
        applicantsCount,
      });
    } catch (err) {
      return res.status(500).json({
        message: "Something went wrong!",
        error: err.message,
      });
    }
  },
);

// API route to bookmark job

applicantRouter.post(
  "/jobs/:id/bookmark",
  userAuth,
  authorize("applicant"),
  async (req, res) => {
    try {
      const loggedInUser = req.user;
      const jobId = req.params.id;

      const job = await Job.findById(jobId);

      if (!job) {
        return res.status(404).json({
          message: "No job found!",
        });
      }

      const existingBookmark = await Bookmark.findOne({
        applicant: loggedInUser._id,
        job: jobId,
      });

      if (existingBookmark) {
        await Bookmark.findByIdAndDelete(existingBookmark._id);

        return res.status(200).json({
          message: "Bookmark removed successfully",
        });
      }

      const bookmark = new Bookmark({
        applicant: loggedInUser._id,
        job: jobId,
      });

      await bookmark.save();

      return res.status(201).json({
        message: "Job bookmarked successfully",
        bookmark,
      });
    } catch (err) {
      return res.status(500).json({
        message: "Something went wrong",
        error: err.message,
      });
    }
  },
);

// API route to get all bookmarked jobs

applicantRouter.get(
  "/jobs/bookmarks",
  userAuth,
  authorize("applicant"),
  async (req, res) => {
    try {
      const loggedInUser = req.user;
      const bookmarks = await Bookmark.find({
        applicant: loggedInUser._id,
      }).populate("job");
      res.status(200).json(bookmarks);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Something went wrong", error: err.message });
    }
  },
);

// API route to apply for jobs

applicantRouter.post(
  "/jobs/:id/apply",
  userAuth,
  authorize("applicant"),
  async (req, res) => {
    try {
      const loggedInUser = req.user;
      const jobId = req.params.id;
      const job = await Job.findById(jobId);

      if (!job) {
        return res.status(404).json({
          message: "Job not found!",
        });
      }
      if (job.isArchived) {
        return res.status(400).json({
          message: "This job is no longer accepting applications.",
        });
      }

      const applicant = await Applicant.findOne({
        user: loggedInUser._id,
      });

      if (!applicant) {
        return res.status(404).json({
          message: "Applicant profile not found.",
        });
      }

      const existingApplication = await Application.findOne({
        applicant: applicant._id,
        job: jobId,
      });

      if (existingApplication) {
        if (existingApplication.status === "Withdrawn") {
          existingApplication.status = "Applied";
          await existingApplication.save();

          return res.status(200).json({
            message: "Application submitted successfully!",
            application: existingApplication,
          });
        }

        return res.status(409).json({
          message: "You have already applied for this job.",
        });
      }
      const application = new Application({
        applicant: applicant._id,
        job: jobId,
      });

      await application.save();

      return res.status(201).json({
        message: "Application submitted successfully!",
        application,
      });
    } catch (err) {
      return res.status(500).json({
        message: "Something went wrong!",
        error: err.message,
      });
    }
  },
);

// API route to get all the applied applications

applicantRouter.get(
  "/applications",
  userAuth,
  authorize("applicant"),
  async (req, res) => {
    try {
      const applicant = await Applicant.findOne({
        user: req.user._id,
      });

      if (!applicant) {
        return res.status(404).json({
          message: "Applicant not found!",
        });
      }

      const applications = await Application.find({
        applicant: applicant._id,
      }).populate("job");

      return res.status(200).json(applications);
    } catch (err) {
      return res.status(500).json({
        message: "Something went wrong!",
        error: err.message,
      });
    }
  },
);

// API route to withdraw an application

applicantRouter.put(
  "/jobs/:jobId/withdraw",
  userAuth,
  authorize("applicant"),
  async (req, res) => {
    try {
      const loggedInUser = req.user;
      const jobId = req.params.jobId;

      const applicant = await Applicant.findOne({
        user: loggedInUser._id,
      });

      if (!applicant) {
        return res.status(404).json({
          message: "No applicant found!",
        });
      }

      const application = await Application.findOne({
        job: jobId,
        applicant: applicant._id,
      });

      if (!application) {
        return res.status(404).json({
          message: "Application not found!",
        });
      }

      if (application.status === "Withdrawn") {
        return res.status(400).json({
          message: "Application has already been withdrawn.",
        });
      }

      application.status = "Withdrawn";
      await application.save();

      return res.status(200).json({
        message: "Application withdrawn successfully!",
        application,
      });
    } catch (err) {
      return res.status(500).json({
        message: "Something went wrong!",
        error: err.message,
      });
    }
  },
);
// API route to edit profile

applicantRouter.patch(
  "/applicant/profile",
  userAuth,
  authorize("applicant"),
  async (req, res) => {
    try {
      const loggedInUser = req.user;
      const { bio, education, experience, location, skills } = req.body;

      const applicant = await Applicant.findOne({ user: loggedInUser._id });

      if (!applicant) {
        return res.status(404).json({ message: "No profile found!" });
      }

      if (bio !== undefined) applicant.bio = bio;
      if (education !== undefined) applicant.education = education;
      if (experience !== undefined) applicant.experience = experience;
      if (location !== undefined) applicant.location = location;
      if (skills !== undefined) {
        applicant.skills = Array.isArray(skills) ? skills : JSON.parse(skills);
      }
      await applicant.save();
      res
        .status(200)
        .json({ message: "Profile updated successfully!", applicant });
    } catch (err) {
      return res.status(500).json({
        message: "Something went wrong!",
        error: err.message,
      });
    }
  },
);

// API route for updating photo
applicantRouter.patch(
  "/applicant/profile/photo",
  userAuth,
  authorize("applicant"),
  upload.single("photo"),
  async (req, res) => {
    try {
      const loggedInUser = req.user;
      const applicant = await Applicant.findOne({ user: loggedInUser._id });
      if (!applicant) {
        if (req.file?.path) fs.unlinkSync(req.file.path);

        return res.status(404).json({
          message: "Applicant profile not found!",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "Please upload a photo.",
        });
      }
      const allowedTypes = ["image/jpeg", "image/png"];

      if (!allowedTypes.includes(req.file.mimetype)) {
        fs.unlinkSync(req.file.path);

        return res.status(400).json({
          message: "Only JPG and PNG images are allowed.",
        });
      }

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "talenthub/applicants/photos",
      });

      fs.unlinkSync(req.file.path);

      applicant.photo = result.secure_url;

      await applicant.save();

      res.status(200).json({
        message: "Profile photo uploaded successfully!",
        photo: applicant.photo,
      });
    } catch (err) {
      if (req.file?.path) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        message: "Something went wrong!",
        error: err.message,
      });
    }
  },
);

// API route for updating resume

applicantRouter.patch(
  "/applicant/profile/resume",
  userAuth,
  authorize("applicant"),
  upload.single("resume"),
  async (req, res) => {
    try {
      const loggedInUser = req.user;
      const applicant = await Applicant.findOne({ user: loggedInUser._id });
      if (!applicant) {
        if (req.file?.path) fs.unlinkSync(req.file.path);

        return res.status(404).json({
          message: "Applicant profile not found!",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "Please upload resume.",
        });
      }
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!allowedTypes.includes(req.file.mimetype)) {
        fs.unlinkSync(req.file.path);

        return res.status(400).json({
          message: "Only PDF,DOC and DOCX are allowed.",
        });
      }

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "talenthub/applicants/resumes",
        resource_type: "raw",
      });

      fs.unlinkSync(req.file.path);

      applicant.resume = result.secure_url;

      await applicant.save();

      res.status(200).json({
        message: "Resume uploaded successfully!",
        resume: applicant.resume,
      });
    } catch (err) {
      if (req.file?.path) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        message: "Something went wrong!",
        error: err.message,
      });
    }
  },
);

module.exports = applicantRouter;
