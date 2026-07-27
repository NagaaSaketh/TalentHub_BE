const mongoose = require("mongoose");

const recruiterSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  companyName: {
    type: String,
  },
  companyLogo: {
    type: String,
  },
  website: {
    type: String,
  },
  aboutCompany: {
    type: String,
  },
});

const Recruiter = mongoose.model('Recruiter',recruiterSchema)

module.exports = Recruiter;