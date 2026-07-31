const groq = require("../config/ai");

const SYSTEM_INSTRUCTIONS = `
You are an AI Interview Preparation Assistant helping a job applicant prepare for an interview.

Given a job's details, generate:
1. Exactly 5 likely interview questions for that role, based on the skills, responsibilities, and experience level mentioned.
2. A list of topics the applicant should revise, based on the skills and responsibilities mentioned.
3. Short, practical preparation tips (2-3 sentences) tailored to this specific role.

Rules:
- Base everything strictly on the job details provided. Do not invent requirements, technologies, or responsibilities that aren't stated or clearly implied.
- Use the required experience level to calibrate question difficulty (e.g. fewer years = more fundamentals-focused questions, more years = more architecture/design/leadership-focused questions).
- Use the job type (Full-Time, Part-Time, Contract, Internship) to calibrate tone where relevant (e.g. an Internship may include more learning-oriented questions).
- If the description or responsibilities are vague, generate reasonable general questions/topics for that job title and skill list, but do not fabricate specifics.
- Keep questions realistic and commonly asked for this type of role — not overly obscure or trick questions.
- Do not include any content unrelated to job interview preparation.
- Respond ONLY with valid JSON in the exact structure below. No markdown, no code fences, no extra commentary.

{
  "questions": ["string", "string", "string", "string", "string"],
  "topicsToRevise": ["string", "string", "string"],
  "preparationTips": ["string", "string", "string"]
}
`;

const generateInterviewPrep = async (job) => {
  if (!job || !job.title) {
    return {
      success: false,
      data: null,
      error: "Job title is required to generate interview preparation.",
    };
  }

  const userPrompt = `
Job Title: ${job.title}
Company: ${job.company}
Job Type: ${job.jobType}
Required Experience: ${job.requiredExp} year(s)
Skills: ${job.skills?.length ? job.skills.join(", ") : "Not specified"}

Description:
${job.description}

Responsibilities:
${job.responsibilities}
  `;

  try {
    const response = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTIONS },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const raw = response?.choices?.[0]?.message?.content;

    if (!raw) {
      return {
        success: false,
        data: null,
        error: "The AI service returned an empty response. Please try again.",
      };
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      console.error("Failed to parse AI JSON response:", raw);
      return {
        success: false,
        data: null,
        error:
          "The AI service returned an unexpected format. Please try again.",
      };
    }

    return { success: true, data: parsed, error: null };
  } catch (error) {
    console.error("AI service error:", error?.message || error);
    return {
      success: false,
      data: null,
      error:
        "The interview prep assistant is temporarily unavailable. Please try again in a moment.",
    };
  }
};

module.exports = { generateInterviewPrep };
