const express = require("express");
const userAuth = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const { askAI } = require("../services/recruiterAi");
const { generateInterviewPrep } = require("../services/applicantAi");
const Applicant = require("../models/Applicant");
const Application = require("../models/Application");
const Jobs = require("../models/Jobs");

const aiRouter = express.Router();

aiRouter.post(
  "/ai/recruiter/chat",
  userAuth,
  authorize("recruiter"),
  async (req, res) => {
    try {
      const { prompt } = req.body;

      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required." });
      }

      const jobs = await Jobs.find({ recruiter: req.user._id }).select(
        "_id title company",
      );
      const jobIds = jobs.map((job) => job._id);

      const applications = await Application.find({ job: { $in: jobIds } })
        .populate({
          path: "applicant",
          populate: { path: "user", select: "fullname email" },
        })
        .populate({
          path: "job",
          select: "title company",
        });

      const result = await askAI(prompt, applications);

      if (!result.success) {
        return res.status(503).json({ message: result.error });
      }

      res.status(200).json({ answer: result.answer });
    } catch (err) {
      res.status(500).json({
        message:
          "AI service is unavailable right now at the moment, please try after some time",
        error: err.message,
      });
    }
  },
);

aiRouter.post(
  "/ai/applicant/guide/:jobId",
  userAuth,
  authorize("applicant"),
  async (req, res) => {
    try {
      const jobId = req.params.jobId;
      const job = await Jobs.findById(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found." });
      }

      const result = await generateInterviewPrep(job);

      if (!result.success) {
        return res.status(503).json({ message: result.error });
      }

      res.status(200).json({ data: result.data });
    } catch (err) {
      res.status(500).json({
        message:
          "AI service is unavailable right now at the moment, please try after some time",
        error: err.message,
      });
    }
  },
);

module.exports = aiRouter;
