function normalizeRequirement(requirement) {
  return requirement.replace(/\s+/g, " ").trim();
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
