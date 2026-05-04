function normalizeRequirement(requirement) {
  return requirement.replace(/\s+/g, " ").trim();
}

const EXAMPLE_REQUIREMENT =
  "Client wants users to register and login. Users should verify email, reset forgotten password, and admin should approve new users before access.";

const EXAMPLE_GROOMED_STORY = {
  issueType: "Story",
  summary: "Enable secure user registration, login, and admin approval",
  userStory:
    "As a new user, I want to register, verify my email, and log in after admin approval so that I can securely access the application.",
  description:
    "Confirmed requirements: Users can register, log in, verify their email, reset forgotten passwords, and require admin approval before access is granted.",
  acceptanceCriteria: [
    "Given a visitor submits valid registration details, when the registration form is submitted, then a pending user account is created.",
    "Given a user registers, when the account is created, then a verification email is sent to the user's email address.",
    "Given a user verifies their email, when their account is still pending admin approval, then login is blocked with a pending approval message.",
    "Given an admin approves a pending user, when the verified user logs in, then access is granted.",
    "Given a user forgets their password, when they complete the reset flow, then they can set a new password and log in if approved."
  ],
  assumptions: [
    "Admin approval happens after email verification and before access to protected product areas.",
    "Password reset is handled through an email-based reset flow."
  ],
  questions: [
    "What user details are required during registration?",
    "Should admins be able to reject a new user, or only approve them?",
    "What message should users see while waiting for admin approval?"
  ],
  priority: "High",
  labels: ["authentication", "registration", "email-verification", "admin-approval"],
  epic: "User Access Management",
  usingMockAiOutput: false,
  debugInfo: {
    source: "cached-example",
    model: "cached",
    responseTimeMs: 0,
    fallbackReason: "",
    timestamp: ""
  }
};

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function normalizeStoryPayload(payload) {
  return {
    issueType: payload?.issueType || "Story",
    summary: String(payload?.summary || "").trim(),
    userStory: String(payload?.userStory || "").trim(),
    description: String(payload?.description || "").trim(),
    acceptanceCriteria: Array.isArray(payload?.acceptanceCriteria)
      ? payload.acceptanceCriteria.map(String).filter(Boolean)
      : [],
    assumptions: Array.isArray(payload?.assumptions)
      ? payload.assumptions.map(String).filter(Boolean)
      : [],
    questions: Array.isArray(payload?.questions)
      ? payload.questions.map(String).filter(Boolean)
      : [],
    priority: ["High", "Medium", "Low"].includes(payload?.priority)
      ? payload.priority
      : "Medium",
    labels: Array.isArray(payload?.labels) ? payload.labels.map(String).filter(Boolean) : [],
    epic: String(payload?.epic || "").trim() || "Requirements Grooming",
    usingMockAiOutput: Boolean(payload?.usingMockAiOutput),
    fallbackReason: payload?.fallbackReason || "",
    debugInfo: payload?.debugInfo || null
  };
}

export async function groomRequirement(requirement) {
  const cleanedRequirement = normalizeRequirement(requirement);

  if (cleanedRequirement === EXAMPLE_REQUIREMENT) {
    await wait(3000);

    return normalizeStoryPayload({
      ...EXAMPLE_GROOMED_STORY,
      debugInfo: {
        ...EXAMPLE_GROOMED_STORY.debugInfo,
        responseTimeMs: 3000,
        timestamp: new Date().toISOString()
      }
    });
  }

  const response = await fetch("/api/groom-story", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requirement: cleanedRequirement })
  });

  const responseText = await response.text();
  let payload = null;

  try {
    payload = responseText ? JSON.parse(responseText) : null;
  } catch {
    return normalizeStoryPayload({
      summary: "Malformed AI response",
      description:
        "The grooming service returned a malformed response. Please try again or review the client requirement manually.",
      acceptanceCriteria: ["Given the API response is malformed, then the UI remains usable."],
      labels: ["malformed-response"],
      usingMockAiOutput: true,
      fallbackReason: "Malformed API response."
    });
  }

  if (!response.ok) {
    throw new Error(payload?.error || `Unable to groom story. HTTP ${response.status}`);
  }

  if (!payload) {
    throw new Error("No output generated.");
  }

  return normalizeStoryPayload(payload);
}
