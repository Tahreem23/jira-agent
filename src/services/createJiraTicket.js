export async function createJiraTicket(story) {
  // Future Jira integration point:
  // 1. Send the edited `story` payload to your backend API route.
  // 2. Let the backend validate fields and map them into Jira's issue schema.
  // 3. Let the backend call Jira's REST API with server-side credentials.
  // 4. Return the created Jira issue key and URL to the frontend.
  //
  // Example future shape:
  // const response = await fetch("/api/create-jira-ticket", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ story })
  // });
  // return response.json();

  await new Promise((resolve) => window.setTimeout(resolve, 900));

  return {
    ticketKey: "AUTH-128",
    ticketUrl: "#mock-ticket-AUTH-128"
  };
}
