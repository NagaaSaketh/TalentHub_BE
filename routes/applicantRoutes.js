const express = require("express");
const userAuth = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const Job = require("../models/Jobs");
const Bookmark = require("../models/Bookmarks");
const Application = require("../models/Application");
const Applicant = require("../models/Applicant");
const applicantRouter = express.Router();

// API route to browse jobs

applicantRouter.get(
  "/jobs",
  userAuth,
  authorize("applicant", "recruiter"),
  async (req, res) => {
    try {
      const jobs = await Job.find({ isArchived: false });
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

      const existingApplication = await Application.findOne({
        applicant: loggedInUser._id,
        job: jobId,
      });

      return res.status(200).json({
        job,
        similarJobs,
        hasApplied: !!existingApplication,
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
        return res.status(404).json({ message: "No job found!" });
      }
      const existingBookmark = await Bookmark.findOne({
        applicant: loggedInUser._id,
        job: jobId,
      });

      if (existingBookmark) {
        await Bookmark.findByIdAndDelete(existingBookmark._id);
        return res
          .status(200)
          .json({ message: "Bookmark removed successfully" });
      }

      const bookmark = new Bookmark({
        applicant: loggedInUser._id,
        job: jobId,
      });
      await bookmark.save();

      res.status(201).json({ message: "Job bookmarked successful", bookmark });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Something went wrong", error: err.message });
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

// API route to withdraw an application

applicantRouter.put(
  "/applications/:applicationId/withdraw",
  userAuth,
  authorize("applicant"),
  async (req, res) => {
    try {
      const loggedInUser = req.user;
      const applicationId = req.params.applicationId;
      const applicant = await Applicant.findOne({
        user: loggedInUser._id,
      });
      if (!applicant) {
        return res.status(404).json({ message: "No applicant found!" });
      }

      const application = await Application.findOne({
        _id: applicationId,
        applicant: applicant._id,
      });

      if (!application) {
        return res.status(404).json({ message: "Application not found!" });
      }

      if (application.status === "Withdrawn") {
        return res
          .status(400)
          .json({ message: "Application has already been withdrawn" });
      }

      application.status = "Withdrawn";
      await application.save();

      res
        .status(200)
        .json({ message: "Application withdrawn successfully", application });
    } catch (err) {
      return res.status(500).json({
        message: "Something went wrong!",
        error: err.message,
      });
    }
  },
);

module.exports = applicantRouter;
