const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    company: {
      type: String,
      required: true,
    },
    jobType: {
      type: String,
      enum: ["Full-Time", "Part-Time", "Contract", "Internship"],
      required: true,
    },
    salary: {
      min: {
        type: Number,
        required: true,
        min: 1,
      },
      max: {
        type: Number,
        required: true,
        min: 1,
        validate: {
          validator: function (value) {
            return value >= this.salary.min;
          },
          message:
            "Maximum salary must be greater than or equal to minimum salary.",
        },
      },
    },
    description: {
      type: String,
      required: true,
    },
    responsibilities: {
      type: String,
      required: true,
    },
    requiredExp: {
      type: Number,
      required: true,
    },
    skills: [
      {
        type: String,
        required: true,
      },
    ],
    deadline: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value >= new Date();
        },
        message: "Application deadline cannot be in the past",
      },
    },
    location: {
      type: String,
      required: true,
    },
    isRemote: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

const Job = mongoose.model("Job", jobSchema);

module.exports = Job;
