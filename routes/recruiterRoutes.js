const express = require("express");
const recruiterRouter = express.Router();
const userAuth = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const Job = require("../models/Jobs");
const Application = require("../models/Application");

// API route to create a job

recruiterRouter.post(
  "/jobs",
  userAuth,
  authorize("recruiter"),
  async (req, res) => {
    try {
      const loggedInUser = req.user;
      const {
        title,
        company,
        jobType,
        salary,
        skills,
        description,
        responsibilities,
        requiredExp,
        deadline,
        location,
        isRemote,
      } = req.body;

      const job = new Job({
        recruiter: loggedInUser._id,
        title,
        company,
        jobType,
        salary,
        skills,
        description,
        responsibilities,
        requiredExp,
        deadline,
        location,
        isRemote,
      });

      await job.save();
      res.status(201).json({ message: "Job created successfully!", job });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Something went wrong!", error: err.message });
    }
  },
);

// API route to update job details

recruiterRouter.put(
  "/jobs/:id",
  userAuth,
  authorize("recruiter"),
  async (req, res) => {
    try {
      const loggedInUser = req.user;
      const jobId = req.params.id;
      const job = await Job.findOne({
        _id: jobId,
        recruiter: loggedInUser._id,
      });
      if (!job) {
        return res.status(404).json({ message: "Job not found." });
      }
      const {
        title,
        company,
        jobType,
        salary,
        skills,
        description,
        responsibilities,
        requiredExp,
        deadline,
        location,
        isRemote,
      } = req.body;

      if (title !== undefined) job.title = title;
      if (company !== undefined) job.company = company;
      if (jobType !== undefined) job.jobType = jobType;
      if (salary !== undefined) job.salary = salary;
      if (skills !== undefined) job.skills = skills;
      if (description !== undefined) job.description = description;
      if (responsibilities !== undefined)
        job.responsibilities = responsibilities;
      if (requiredExp !== undefined) job.requiredExp = requiredExp;
      if (deadline !== undefined) job.deadline = deadline;
      if (location !== undefined) job.location = location;
      if (isRemote !== undefined) job.isRemote = isRemote;

      await job.save();
      res.status(200).json({ message: "Job updated successfully", job });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Something went wrong!", error: err.message });
    }
  },
);

// API route to archive a job
recruiterRouter.put(
  "/jobs/:id/archive",
  userAuth,
  authorize("recruiter"),
  async (req, res) => {
    try {
      const loggedInUser = req.user;
      const jobId = req.params.id;
      const job = await Job.findOne({
        _id: jobId,
        recruiter: loggedInUser._id,
      });
      if (!job) {
        return res.status(404).json({ message: "No job found!" });
      }

      const { isArchived } = req.body;

      if (isArchived !== undefined) job.isArchived = !job.isArchived;
      await job.save();

      res.status(200).json({ message: "Job archive status updated.", job });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Something went wrong!", error: err.message });
    }
  },
);

// API route to view all applicants for a job

recruiterRouter.get(
  "/jobs/:id/applicants",
  userAuth,
  authorize("recruiter"),
  async (req, res) => {
    try {
      const loggedInUser = req.user;
      const jobId = req.params.id;
      const job = await Job.findOne({
        _id: jobId,
        recruiter: loggedInUser._id,
      });
      if (!job) {
        return res.status(404).json({ message: "No job found!" });
      }
      const jobApplications = await Application.find({ job: jobId }).populate({
        path: "applicant",
        populate: { path: "user", select: "fullname email" },
      });
      if (jobApplications.length === 0) {
        res.status(404).json({ message: "No applicants found for this job" });
      }
      res.status(200).json(jobApplications);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Something went wrong!", error: err.message });
    }
  },
);

// API route to shortlist an application

recruiterRouter.put(
  "/applications/:applicationId/shortlist",
  userAuth,
  authorize("recruiter"),
  async (req, res) => {
    try {
      const loggedInUser = req.user;
      const applicationId = req.params.applicationId;
      const application = await Application.findById(applicationId).populate(
        "job",
        "recruiter",
      );
      if (!application) {
        return res.status(404).json({ message: "Application not found!" });
      }

      if (
        application.job.recruiter.toString() !== loggedInUser._id.toString()
      ) {
        return res.status(403).json({
          message:
            "You are not authorised to shortlist the applicants for this job",
        });
      }

      if (application.status === "Shortlisted") {
        return res.status(400).json({
          message: "Applicant is already shortlisted.",
        });
      }

      if (application.status === "Withdrawn") {
        return res.status(400).json({
          message: "Cannot shortlist a withdrawn application.",
        });
      }

      application.status = "Shortlisted";
      await application.save();
      res
        .status(200)
        .json({ message: "Applicant shortlisted successfully!", application });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Something went wrong!", error: err.message });
    }
  },
);

// API route to reject an application

recruiterRouter.put(
  "/applications/:applicationId/reject",
  userAuth,
  authorize("recruiter"),
  async (req, res) => {
    try {
      const loggedInUser = req.user;
      const applicationId = req.params.applicationId;
      const application = await Application.findById(applicationId).populate(
        "job",
        "recruiter",
      );
      if (!application) {
        return res.status(404).json({ message: "Application not found!" });
      }

      if (
        application.job.recruiter.toString() !== loggedInUser._id.toString()
      ) {
        return res.status(403).json({
          message: "You are not authorised to reject applicants for this job",
        });
      }

      if (application.status === "Rejected") {
        return res.status(400).json({
          message: "Applicant is already rejected.",
        });
      }

      if (application.status === "Withdrawn") {
        return res.status(400).json({
          message: "Cannot reject a withdrawn application.",
        });
      }

      application.status = "Rejected";
      await application.save();
      res
        .status(200)
        .json({ message: "Applicant rejected successfully!", application });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Something went wrong!", error: err.message });
    }
  },
);

module.exports = recruiterRouter;
