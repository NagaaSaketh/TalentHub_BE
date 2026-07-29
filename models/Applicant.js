const mongoose = require("mongoose");

const applicantSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    photo: {
      type: String,
    },
    bio: {
      type: String,
    },
    education: [
      {
        school: String,
        degree: String,
        year: Number,
      },
    ],
    totalExperience: {
      type: Number,
      default: 0,
    },
    experience: [
      {
        company: String,
        position: String,
        yearsOfExp: Number,
      },
    ],
    location: {
      type: String,
    },
    skills: [
      {
        type: String,
      },
    ],
    resume: {
      type: String,
    },
  },
  { timestamps: true },
);

const Applicant = mongoose.model("Applicant", applicantSchema);

module.exports = Applicant;
