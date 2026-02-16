# Assignment: AI Engineer at Empirical

## About the role

Hi there\! It sounds like you are interested in the AI engineering role at [Empirical](https://www.empirical.run/), where we build AI agents that write and maintain [Playwright](https://playwright.dev/) tests for our customers. We’re a lean but capable team that enables some of India’s best engineering teams (e.g., Atlan, Wayground, DPDzero, Pando, Shopflo, etc) to ship high-quality software faster.

This role involves working on our core product: AI agents. Our agents write and review code, use the browser to navigate web apps, diagnose test reports, using state-of-the-art foundation models from Anthropic/OpenAI/Gemini. These agents write and maintain hundreds of tests every week on real production use-cases.

Our “agent stack” (LLM gateway, agent loop, tools) is entirely built in-house, in Typescript, and we’re looking to expand our team on it. We offer market-level compensation (we’ve raised capital) topped up with ESOPs for this in-person role in Gurgaon (this is non-negotiable.) If hired, you will work closely with me ([Arjun](https://www.linkedin.com/in/arjunattam/), co-founder/ceo).

To help us move faster here, we need you to complete this assignment. Post submission, you can expect to hear back from me within 12 hours, and have the entire interview process concluded \- with a decision \- in 48 hours.

## Submission format

A good response to this assignment will include:

1. Link to a GitHub repo with your code \+ a readme that contains steps I need to do to run your code  
2. A \~2 min loom video recording demonstrating how you built it  
   1. (If your solution works for some inputs but not others – that’s fine\! Call it out in the video)  
3. All of this sent in an email to [hey@empirical.run](mailto:hey@empirical.run)

## Using AI

You are heavily encouraged to use AI to be productive. \+100 points if you share your process transparently in the loom video. \-100 points if I suspect AI usage that is not revealed.

## Problem statement

Our AI agents generate code that either 1\. Adds new tests and/or 2\. Modifies existing tests. Agents can make mistakes – so reviewing them is critical\! What helps review outputs quickly is to know “what was impacted”, especially in large repos that can contain thousands of tests and hundreds of helper methods that are used inside the tests. Once we know what is accurately impacted, we can run those tests to validate the change – instead of running the whole suite of tests.

I’ll share some examples below that use one of the repos that our AI agents maintain: [flash-tests](https://github.com/empirical-run/flash-tests). This repo is open source, and you can use this for the purpose of the assignment. If you haven’t seen a Playwright repo before, I would recommend starting with [this file](https://github.com/empirical-run/flash-tests/blob/main/tests/sidebar.spec.ts) which contains 1 test that simulates user actions to click buttons in a web app.

As examples, let’s look at some past commits from the repo, and see their “impact”

1. [75cdcc5](https://github.com/empirical-run/flash-tests/commit/75cdcc58e6ce9a27222e75f62f13757defa3f156): This commit adds a new test, so the impact is  
   * 1 test added: “safeBash tool execution to get commit SHA” in tests/tool-execution/session.spec.ts  
2. [5df7e4d](https://github.com/empirical-run/flash-tests/commit/5df7e4d078f4e99bee10a7aaba88ab2fe27a6015): This commit adds lines to 2 tests, so the impact is  
   * 1 test modified: “Subscribe to session and verify in Subscribed sessions list” in tests/sessions.spec.ts  
   * 1 test modified: “Filter sessions list by users” in tests/sessions.spec.ts  
3. [6d8159d](https://github.com/empirical-run/flash-tests/commit/6d8159dce887df5a4b97e0df1f2187ce16ffe4ab): This commit removes a test, so the impact is   
   * 1 test removed: “Sort sessions by title” in tests/sessions.spec.ts  
4. [45433fd](https://github.com/empirical-run/flash-tests/commit/45433fdcd12d46c2ac061a0e4a71a1d98273420f): This commit modified a helper method that was imported in 4 tests (to verify: find this helper method in [this file](https://github.com/empirical-run/flash-tests/blob/45433fdcd12d46c2ac061a0e4a71a1d98273420f/tests/test-runs.spec.ts))  
   * 1 test modified: “set human triage for failed test” in tests/test-runs.spec.ts  
   * \+ 3 other modifications

If you look at the commit messages of the commits linked above, you will find the associated pull requests that were created by our AI agents, with some more context on the change.

Your goal in this assignment is to write some code that takes:

* **Input**: a commit sha that belongs to the flash-tests repo (e.g. \`45433fd\` for the last example)  
  * There are \~500 commits in the repo – all of them are valid inputs  
* **Output**: a list of impacted tests, with test names and type of modification (added, removed, modified)

Feel free to pick any language or toolkit: I’m only looking to have a way to input a commit sha, and get outputs like the above. You can package your code in any interface: a CLI or a UI. CLI might be easier, so feel free to build something that enables me to do something like:

```` ``` ````  
`npx your-code --commit <sha> --repo <path-to-flash-tests>`   
```` ``` ````

Feel free to add whatever arguments are needed, for example 1\. Path to a local clone of flash-tests (if your solution needs that), or 2\. GitHub personal access token (if your solution needs to make GitHub API calls).

How you solve this problem is up to you – if you have any questions, feel free to ask us at [hey@empirical.run](mailto:hey@empirical.run). My goal is here to give you a flavour of the kind of problems this role is expected to solve: hope this looks fun, and I’m looking forward to reviewing your solutions.

