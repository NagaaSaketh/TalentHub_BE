const express = require("express");
const recruiterRouter = express.Router();
const userAuth = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const Job = require("../models/Jobs");

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

recruiterRouter.put(
  "/jobs/:id",
  userAuth,
  authorize("recruiter"),
  async (req, res) => {
    try {
      const loggedInUser = req.user;
      const jobId = req.params.id;
      const job = await Job.findOne({ _id: jobId, recruiter: loggedInUser._id });
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

recruiterRouter.patch("/jobs/:id",userAuth,authorize("recruiter"),async(req,res)=>{
    try{

    }catch(err){

    }
})

module.exports = recruiterRouter;
