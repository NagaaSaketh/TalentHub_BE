const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Applicant",
      required: true,
    },

    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },

    status: {
      type: String,
      enum: ["Applied", "Shortlisted", "Rejected", "Withdrawn"],
      default: "Applied",
    },
  },
  {
    timestamps: true,
  },
);

applicationSchema.index(
  {
    applicant: 1,
    job: 1,
  },
  {
    unique: true,
  },
);

const Application = mongoose.model('Application',applicationSchema)

module.exports = Application