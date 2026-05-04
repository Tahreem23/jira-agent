# Jira AI Story Grooming Agent

React prototype with a Vercel serverless API route for turning messy client requirements into editable Jira-style stories.

## Current Scope

This app calls `/api/groom-story` for AI grooming. Jira ticket creation is still mocked in a frontend service function.

## Backend-Ready Architecture Plan

The app is structured around two service boundaries:

### `POST /api/groom-story`

Purpose: turn raw requirement text into structured Jira story fields.

Expected request body:

```json
{
  "requirement": "Client wants users to register and login..."
}
```

Expected response body:

```json
{
  "issueType": "Story",
  "epic": "User Access Management",
  "summary": "Enable secure user registration, login, and admin approval",
  "userStory": "As a new user...",
  "description": "Build the first version...",
  "acceptanceCriteria": ["Given...", "Given..."],
  "priority": "High",
  "labels": ["authentication", "registration"]
}
```

Backend responsibilities:

- Validate the incoming requirement text.
- Call Groq from the serverless API route, not the browser.
- Enforce a strict JSON schema for the groomed Jira fields.
- Prompt the AI to behave like a senior business analyst.
- Keep confirmed requirements separate from assumptions.
- Require testable acceptance criteria and lowercase kebab-case labels.
- Return frontend-ready story data.

Frontend integration point: [groomRequirement.js](</C:/Users/tahre/OneDrive/Desktop/jira-agent/src/services/groomRequirement.js>)

### `POST /api/create-jira-ticket`

Purpose: create a Jira ticket from the edited story payload.

Expected request body:

```json
{
  "story": {
    "issueType": "Story",
    "epic": "User Access Management",
    "summary": "Enable secure user registration, login, and admin approval",
    "description": "Build the first version...",
    "acceptanceCriteria": ["Given...", "Given..."],
    "priority": "High",
    "labels": ["authentication", "registration"]
  }
}
```

Expected response body:

```json
{
  "ticketKey": "AUTH-128",
  "ticketUrl": "https://your-domain.atlassian.net/browse/AUTH-128"
}
```

Future backend responsibilities:

- Validate required fields such as Summary and Description.
- Map the frontend story shape into Jira's issue creation payload.
- Call the Jira REST API from the server.
- Return the created Jira issue key and URL.

Frontend integration point: [createJiraTicket.js](</C:/Users/tahre/OneDrive/Desktop/jira-agent/src/services/createJiraTicket.js>)

## Local Development

```bash
npm install
npm run dev
```

Use `npm run dev` for frontend-only testing.

Use `vercel dev` only when you want to test `/api/groom-story` locally.

On Vercel, configure:

```env
GROQ_API_KEY=your_key_here
```
