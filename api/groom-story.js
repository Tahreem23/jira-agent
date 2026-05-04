import Groq from "groq-sdk";

const AUTH_KEYWORDS = [
  "register",
  "login",
  "email",
  "password",
  "admin",
  "approve",
  "access"
];

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const rateLimitStore = globalThis.__groomStoryRateLimitStore || new Map();

globalThis.__groomStoryRateLimitStore = rateLimitStore;

const GROOMING_SYSTEM_PROMPT = `
You are a senior business analyst grooming messy client requirements into Jira stories.

Rules:
- Output valid JSON only. No Markdown, commentary, code fences, or prose outside the JSON object.
- Do not invent unrelated features, integrations, flows, screens, or non-requested behavior.
- Separate confirmed requirements from assumptions inside the description.
- If an assumption is needed, label it clearly as "Assumptions:" and keep it minimal.
- Put reasonable assumptions from unclear input in assumptions.
- Put useful client clarification questions in questions.
- Do not include empty filler questions.
- Acceptance criteria must be testable and written as observable product behavior.
- Prefer Given/When/Then acceptance criteria.
- Labels must be lowercase kebab-case.
- Priority must be exactly one of: Low, Medium, High.
- Keep the story concise enough for Jira, but detailed enough for engineering estimation.
- If requirement text is vague, preserve uncertainty as assumptions instead of pretending it was confirmed.

Return exactly this JSON shape:
{
  "issueType": "Story",
  "summary": "...",
  "userStory": "...",
  "description": "...",
  "acceptanceCriteria": ["...", "..."],
  "assumptions": ["...", "..."],
  "questions": ["...", "..."],
  "priority": "Low | Medium | High",
  "labels": ["lowercase-kebab-case"],
  "epic": "..."
}
`.trim();

function matchesAuthenticationFlow(requirement) {
  const lowered = requirement.toLowerCase();
  return AUTH_KEYWORDS.filter((keyword) => lowered.includes(keyword)).length >= 4;
}

function buildGenericSummary(requirement) {
  const firstSentence = requirement.split(/[.!?]/)[0];
  const clipped =
    firstSentence.length > 82 ? `${firstSentence.slice(0, 79).trim()}...` : firstSentence;

  return clipped.charAt(0).toUpperCase() + clipped.slice(1);
}

function createMockGroomedStory(requirement, fallbackReason) {
  const story = matchesAuthenticationFlow(requirement)
    ? {
        issueType: "Story",
        epic: "User Access Management",
        summary: "Enable secure user registration, login, and admin approval",
        userStory:
          "As a new user, I want to register, verify my email, and log in after admin approval so that I can securely access the application.",
        description:
          "Confirmed requirements: Users can register, log in, verify email, reset forgotten passwords, and require admin approval before gaining access.\n\nAssumptions: Admin approval happens after email verification and before access to protected product areas.",
        acceptanceCriteria: [
          "Given a visitor submits valid registration details, when the registration form is submitted, then a pending user account is created.",
          "Given a user registers, when the account is created, then a verification email is sent to the user's email address.",
          "Given a user verifies their email, when their account is still pending admin approval, then login is blocked with a pending approval message.",
          "Given an admin approves a pending user, when the verified user logs in, then access is granted.",
          "Given a user forgets their password, when they complete the reset flow, then they can set a new password and log in if approved."
        ],
        assumptions: [
          "Admin approval happens after email verification and before access to protected product areas.",
          "Password reset is available through an email-based reset flow."
        ],
        questions: [
          "Should users be allowed to log in before email verification if their account is admin-approved?",
          "What information should admins see when approving or rejecting a new user?"
        ],
        priority: "High",
        labels: ["authentication", "registration", "email-verification", "admin-approval"]
      }
    : {
        issueType: "Story",
        epic: "Requirements Grooming",
        summary: buildGenericSummary(requirement),
        userStory:
          "As a product team member, I want rough client requirements converted into a clear Jira story so that the delivery team can estimate and implement with less ambiguity.",
        description:
          "Confirmed requirements: Convert the provided client requirement into an implementation-ready Jira story.\n\nAssumptions: Missing implementation details should be reviewed with stakeholders before development begins.",
        acceptanceCriteria: [
          "Given messy requirement text is provided, when the story is groomed, then structured Jira story fields are generated.",
          "Given the generated story is reviewed, when fields are displayed, then Summary, Description, Acceptance Criteria, Priority, Labels, and Epic are visible.",
          "Given requirement details are incomplete, when assumptions are needed, then they are clearly separated from confirmed requirements."
        ],
        assumptions: [
          "Missing implementation details should be reviewed with stakeholders before development begins."
        ],
        questions: [
          "Which user role is the primary actor for this requirement?",
          "Are there any business rules or edge cases that must be handled in the first release?"
        ],
        priority: "Medium",
        labels: ["requirements", "story-grooming", "prototype"]
      };

  return {
    ...story,
    usingMockAiOutput: true,
    fallbackReason
  };
}

function attachDebugInfo(story, debugInfo) {
  return {
    ...story,
    debugInfo
  };
}

function normalizeGroqStory(story) {
  return {
    issueType: "Story",
    summary: String(story.summary || "").trim(),
    userStory: String(story.userStory || "").trim(),
    description: String(story.description || "").trim(),
    acceptanceCriteria: Array.isArray(story.acceptanceCriteria)
      ? story.acceptanceCriteria.map(String).filter(Boolean)
      : [],
    assumptions: Array.isArray(story.assumptions)
      ? story.assumptions.map(String).filter(Boolean)
      : [],
    questions: Array.isArray(story.questions) ? story.questions.map(String).filter(Boolean) : [],
    priority: ["Low", "Medium", "High"].includes(story.priority) ? story.priority : "Medium",
    labels: Array.isArray(story.labels)
      ? story.labels.map((label) => String(label).trim().toLowerCase()).filter(Boolean)
          .map((label) => label.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))
          .filter(Boolean)
      : ["story-grooming"],
    epic: String(story.epic || "").trim() || "Requirements Grooming",
    usingMockAiOutput: false
  };
}

function logGroomStory(message, details = {}) {
  console.log("[api/groom-story]", message, details);
}

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.socket?.remoteAddress || "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS
    });
    return false;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  record.count += 1;
  rateLimitStore.set(ip, record);
  return false;
}

export default async function handler(req, res) {
  const requestStartedAt = Date.now();
  const timestamp = new Date().toISOString();
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const clientIp = getClientIp(req);

  if (isRateLimited(clientIp)) {
    logGroomStory("Rate limit exceeded", {
      ip: clientIp
    });
    return res.status(429).json({
      error: "Too many requests. Please try again later."
    });
  }

  const requirement = String(req.body?.requirement || "").trim();

  if (!requirement) {
    return res.status(400).json({ error: "Requirement text is required." });
  }

  logGroomStory("GROQ_API_KEY presence checked", {
    exists: Boolean(process.env.GROQ_API_KEY)
  });

  if (!process.env.GROQ_API_KEY) {
    const fallbackReason = "GROQ_API_KEY is missing.";
    logGroomStory("Using fallback mock output", {
      reason: fallbackReason
    });
    return res.json(
      attachDebugInfo(createMockGroomedStory(requirement, fallbackReason), {
        source: "mock",
        model,
        responseTimeMs: Date.now() - requestStartedAt,
        fallbackReason,
        timestamp
      })
    );
  }

  try {
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });

    logGroomStory("Groq request starts", {
      model
    });

    const completion = await groq.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: GROOMING_SYSTEM_PROMPT
        },
        {
          role: "user",
          content: `Groom this client requirement into a Jira story:\n\n${requirement}`
        }
      ]
    });

    logGroomStory("Groq response status", {
      status: "completed",
      finishReason: completion.choices?.[0]?.finish_reason || "unknown"
    });

    const content = completion.choices?.[0]?.message?.content || "{}";
    let parsedStory;

    try {
      parsedStory = JSON.parse(content);
      logGroomStory("JSON parse success");
    } catch (parseError) {
      logGroomStory("JSON parse failure", {
        error: parseError.message
      });
      const fallbackReason = "Groq JSON parse failed.";
      logGroomStory("Using fallback mock output", {
        reason: fallbackReason
      });
      return res.json(
        attachDebugInfo(createMockGroomedStory(requirement, fallbackReason), {
          source: "mock",
          model,
          responseTimeMs: Date.now() - requestStartedAt,
          fallbackReason,
          timestamp
        })
      );
    }

    return res.json(
      attachDebugInfo(normalizeGroqStory(parsedStory), {
        source: "ai",
        model,
        responseTimeMs: Date.now() - requestStartedAt,
        fallbackReason: "",
        timestamp
      })
    );
  } catch (error) {
    logGroomStory("Groq response status", {
      status: "failed",
      error: error.message
    });
    const fallbackReason = "Groq request failed.";
    logGroomStory("Using fallback mock output", {
      reason: fallbackReason
    });
    return res.json(
      attachDebugInfo(createMockGroomedStory(requirement, fallbackReason), {
        source: "mock",
        model,
        responseTimeMs: Date.now() - requestStartedAt,
        fallbackReason,
        timestamp
      })
    );
  }
}
