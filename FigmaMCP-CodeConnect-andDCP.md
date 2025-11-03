Dev Mode MCP: User Feedback Submissions
Thanks for trying out our Dev Mode MCP server. This form is for sharing feedback about your experience using the Dev Mode MCP server. If you need support, please reach out to our support team!

For more helpful tips, visit our Guide to the Dev Mode MCP Server in Figma's Help Center!
What feedback would you like to share with us about your experience using the Dev Mode MCP server?*
If possible, please let us know which IDE (ex: Cursor, VS Code) and which LLM model (ex: Claude 3.5, GPT4.1) you used. This will help us to understand your feedback.
Enter your answer
What type of work did you use the MCP server for?
Were you implementing a new feature in an existing codebase, prototyping something brand new, or something else?
Enter your answer
If you'd like to share any screenshots or files with us, please feel free to do so!
or drag and drop files here
How would you feel if you could no longer use Figma's Dev Mode MCP server?*
Can our Product team follow-up for more information about your feedback if needed?*
If you need help with your MCP set up, visit our Guide to the Dev Mode MCP Server in Figma's Help Center!
Your name*
Enter your name
What email do you use to login to Figma at work?*
Enter your email address
(Optional) In your current role, which of the following types of work do you regularly engage in?

Implement user interfaces for internal or external applications

Contribute to a shared UI component library or design system

Build and maintain backend services or APIs

None of the above

Other (please specify)
(Optional) Which of the following best describes your primary role?
Thanks for trying out our Dev Mode MCP server. This form is for sharing feedback about your experience using the Dev Mode MCP server. If you need support, please reach out to our support team: https://help.figma.com/hc/en-us/requests/new?chatStartExpanded
Enter your answer
Never submit passwords through Asana Forms.
Report abuse
Terms
Privacy
Powered by
Logo of Asana
Form loaded.

Figma Learn
Get started
Product documentation
Administration
Courses, tutorials, projects
Help

⌘
K
Sign up

Figma Design
Dev Mode
Turn designs to code
Guide to the Dev Mode MCP Server
🚧 The Dev Mode MCP Server is currently in open beta. Some functions and settings may not yet be available. The feature may change and you may experience bugs or performance issues during the beta period.

Who can use this feature


The Dev Mode MCP Server is in open beta.


Available on a Dev or Full seat on the Professional, Organization, or Enterprise plans


You must use a code editor or application that supports MCP Servers (i.e. VS Code, Cursor, Windsurf, Claude Code)


You can only use the Dev Mode MCP server from the Figma desktop app. Download the Figma desktop app →

The Dev Mode MCP Server brings Figma directly into your workflow by providing important design information and context to AI agents generating code from Figma design files.

MCP Servers are part of a standardized interface for AI agents to interact with data sources using the Model Context Protocol.

With the server enabled, you can:

Generate code from selected frames

Select a Figma frame and turn it into code. Great for product teams building new flows or iterating on app features.

Extract design context

Pull in variables, components, and layout data directly into your IDE. This is especially useful for design systems and component-based workflows.

Code smarter with Code Connect

Boost output quality by reusing your actual components. Code Connect keeps your generated code consistent with your codebase.

Learn more about Code Connect →

Step 1: Enable the MCP Server
Open the Figma desktop app and make sure you’ve updated to the latest version.
Create or open a Figma Design file.
In the upper-left corner, open the Figma menu.
Under Preferences, select Enable Dev Mode MCP Server.
 

Dev Mode MCP Server Guide.png
You should see a confirmation message at the bottom of the screen letting you know the server is enabled and running.

The server runs locally at http://127.0.0.1:3845/mcp. Keep this address handy for your configuration file in the next step.

Step 2: Set up your MCP client
Once the server is running locally on the Figma desktop app, MCP clients will be able to connect to your server. Follow the instructions for your specific client to add the Dev Mode MCP server.

VS Code
Cursor
Windsurf
Claude Code
Other editors
Use the shortcut ⌘ P to search for files.
In the search bar, type "mcp.json".

vscode.png
Select mcp.json.
Add the Figma Dev Mode MCP configuration to your servers:

"chat.mcp.discovery.enabled": true,
 "mcp": {
   "servers": {
     "Figma Dev Mode MCP": {
       "type": "sse",
       "url": "http://127.0.0.1:3845/mcp"
     }
   }
 },
 "chat.agent.enabled": true
Open the chat toolbar using ⌥⌘B or ⌃⌘I and switch to Agent mode.
Open the selection tool menu and look for a section labeled: MCP Server: Figma Dev Mode MCP. If no tools are listed, restart the Figma desktop app and VS Code.
Note: You must have GitHub Copilot enabled on your account to use MCP in VS Code.

For more information, see VS Code’s official documentation.

Once configured, refresh or start the server. You should see a successful connection and the available tools. If the connection failed or you do not see any tools, double check that the server is active in the Figma desktop app.

Step 3: Prompt your MCP client
The Dev Mode MCP server introduces a set of tools that help LLMs translate designs in Figma. Once connected, you can prompt your MCP client to access a specific design node.

There are two ways to provide Figma design context to your AI client:

Selection-based
Select a frame or layer inside Figma using the desktop app.
Prompt your client to help you implement your current selection.
prompt.png
Link-based
Copy the link to a frame or layer in Figma.
copy_link.png
Prompt your client to help you implement the design at the selected URL.
Note: Your client won’t be able to navigate to the selected URL, but it will extract the node-id that is required for the MCP server to identify which object to return information about.

Tools and usage suggestions
get_code
Use this to generate code for your Figma selection using the MCP server. The default output is React + Tailwind, but you can customize this through your prompts:

Change the framework
“Generate my Figma selection in Vue.”
“Generate my Figma selection in plain HTML + CSS.”
“Generate my Figma selection in iOS.”
Use your components

“Generate my Figma selection using components from src/components/ui”
“Generate my Figma selection using components from src/ui and style with Tailwind”
You can paste links or select the frame or component in Figma before prompting.

Learn how to set up Code Connect for better component reuse →

get_variable_defs
Returns variables and styles used in your selection—like colors, spacing, and typography.

List all tokens used
“Get the variables used in my Figma selection.”
Focus on a specific type
“What color and spacing variables are used in my Figma selection?”
Get both names and values
“List the variable names and their values used in my Figma selection.”
get_code_connect_map
Retrieves a mapping between Figma node IDs and their corresponding code components in your codebase. Specifically, it returns an object where each key is a Figma node ID, and the value contains:

codeConnectSrc: The location of the component in your codebase (e.g., a file path or URL).
codeConnectName: The name of the component in your codebase.
This mapping is used to connect Figma design elements directly to their React (or other framework) implementations, enabling seamless design-to-code workflows and ensuring that the correct components are used for each part of the design. If a Figma node is connected to a code component, this function helps you identify and use the exact component in your project.

get_image
To use this tool, go to Preferences > Dev Mode MCP Server Settings > Enable tool get_image

This takes a screenshot of your selection to preserve layout fidelity. Keep this on unless you’re managing token limits.

Dev Mode MCP Server Settings
These are additional settings you can toggle under Preferences and use with the MCP client

Enable tool get_image

Use placeholders: Skips image extraction and adds generic placeholders instead - helpful if you prefer swapping them manually in code. Otherwise, it pulls real images from your file.
Enable code connect

Includes Code Connect mappings in the response, so the generated code can reuse components from your connected codebase where possible.

As you use the Dev Mode MCP server, you may see a popup inside Figma asking you for feedback. To give us feedback, please use this form.

MCP best practices
The quality of the generated code depends on several factors. Some controlled by you, and some by the tools you’re using. Here are some suggestions for clean, consistent output.

Structure your Figma file for better code
Provide the best context for your design intent, so the MCP and your AI assistant can generate code that’s clear, consistent, and aligned with your system.

Use components for anything reused (buttons, cards, inputs, etc.)
Link components to your codebase via Code Connect. This is the best way to get consistent component reuse in code. Without it, the model is guessing.
Use variables for spacing, color, radius, and typography.
Name layers semantically (e.g. CardContainer, not Group 5)
Use Auto layout to communicate responsive intent.

Tip: Resize the frame in Figma to check that it behaves as expected before generating code.

Use annotations and dev resources to convey design intent that’s hard to capture from visuals alone, like how something should behave, align, or respond.
Write effective prompts to guide the AI
MCP gives your AI assistant structured Figma data, but your prompt drives the result. Good prompts can:

Align the result with your framework or styling system
Follow file structure and naming conventions
Add code to specific paths (e.g. src/components/ui)
Add or modify code in existing files instead of creating new ones
Follow specific layout systems (e.g. grid, flexbox, absolute)
Examples:

“Generate iOS SwiftUI code from this frame”
“Use Chakra UI for this layout”
“Use src/components/ui components”
“Add this to src/components/marketing/PricingCard.tsx"
“Use our Stack layout component”
Think of prompts like a brief to a teammate. Clear intent leads to better results.

Trigger specific tools when needed
The MCP supports different tools, and each one provides your AI assistant with a different kind of structured context. Sometimes, the assistant doesn’t automatically pick the right one, especially as more tools become available. If results are off, try being explicit in your prompt.

get_code provides a structured React + Tailwind representation of your Figma selection. This is a starting point that your AI assistant can translate into any framework or code style, depending on your prompt.
get_variable_defs extracts the variables and styles used in your selection (color, spacing, typography, etc). This helps the model reference your tokens directly in the generated code.
For example, if you’re getting raw code instead of tokens, try something like:

“Get the variable names and values used in this frame.”
Add custom rules
Set project-level guidance to keep output consistent—just like onboarding notes for a new developer. These are things like:

Preferred layout primitives
File organization
Naming patterns
What not to hardcode
You can provide this in whatever format your MCP client uses for instruction files.

Examples:

Cursor
Claude Code
General rules
 
---
description: Figma Dev Mode MCP rules
globs: 
alwaysApply: true
---
  - The Figma Dev Mode MCP Server provides an assets endpoint which can serve image and SVG assets
  - IMPORTANT: If the Figma Dev Mode MCP Server returns a localhost source for an image or an SVG, use that image or SVG source directly
  - IMPORTANT: DO NOT import/add new icon packages, all the assets should be in the Figma payload
  - IMPORTANT: do NOT use or create placeholders if a localhost source is provided
Adding these once can dramatically reduce the need for repetitive prompting and ensures that teammates or agents consistently follow the same expectations.

Be sure to check your IDE or MCP client’s documentation for how to structure rules, and experiment to find what works best for your team. Clear, consistent guidance often leads to better, more reusable code with less back-and-forth.

Break down large selections
Break screens into smaller parts (like components or logical chunks) for faster, more reliable results.

Large selections can slow the tools down, cause errors, or result in incomplete responses, especially when there's too much context for the model to process. Instead:

Generate code for smaller sections or individual components (e.g. Card, Header, Sidebar)
If it feels slow or stuck, reduce your selection size
This helps keep the context manageable and results more predictable, both for you and for the model.

If something in the output doesn’t look quite right, it usually helps to revisit the basics: how the Figma file is structured, how the prompt is written, and what context is being sent. Following the best practices above can make a big difference, and often leads to more consistent, reusable code.

Was this article helpful?
Yes
No
In this article
Tools and usage suggestions
Dev Mode MCP Server Settings
Structure your Figma file for better code
Write effective prompts to guide the AI
Trigger specific tools when needed
Add custom rules
Break down large selections
10 min

English (US)
Use cases
UI design
UX design
Prototyping
Graphic design
Wireframing
Brainstorming
Templates
Remote design
Explore
Design features
Prototyping features
Design systems features
Collaboration features
FigJam
Pricing
Enterprise
Students and educators
Customers
Security
Integrations
Contact
Resources
Blog
Best practices
Support
Developers
Learn design
Downloads
What's new
Releases
Careers
About us
Agency partners
Privacy
Status
Compare
Sketch
Adobe XD
Invision Studio
Framer
Design on Windows
Miro

Figma Design
Dev Mode
Turn designs to code
Guide to the Dev Mode MCP Server
🚧 The Dev Mode MCP Server is currently in open beta. Some functions and settings may not yet be available. The feature may change and you may experience bugs or performance issues during the beta period.

Who can use this feature


The Dev Mode MCP Server is in open beta.


Available on a Dev or Full seat on the Professional, Organization, or Enterprise plans


You must use a code editor or application that supports MCP Servers (i.e. VS Code, Cursor, Windsurf, Claude Code)


You can only use the Dev Mode MCP server from the Figma desktop app. Download the Figma desktop app →

The Dev Mode MCP Server brings Figma directly into your workflow by providing important design information and context to AI agents generating code from Figma design files.

MCP Servers are part of a standardized interface for AI agents to interact with data sources using the Model Context Protocol.

With the server enabled, you can:

Generate code from selected frames

Select a Figma frame and turn it into code. Great for product teams building new flows or iterating on app features.

Extract design context

Pull in variables, components, and layout data directly into your IDE. This is especially useful for design systems and component-based workflows.

Code smarter with Code Connect

Boost output quality by reusing your actual components. Code Connect keeps your generated code consistent with your codebase.

Learn more about Code Connect →

Step 1: Enable the MCP Server
Open the Figma desktop app and make sure you’ve updated to the latest version.
Create or open a Figma Design file.
In the upper-left corner, open the Figma menu.
Under Preferences, select Enable Dev Mode MCP Server.
 

Dev Mode MCP Server Guide.png
You should see a confirmation message at the bottom of the screen letting you know the server is enabled and running.

The server runs locally at http://127.0.0.1:3845/mcp. Keep this address handy for your configuration file in the next step.

Step 2: Set up your MCP client
Once the server is running locally on the Figma desktop app, MCP clients will be able to connect to your server. Follow the instructions for your specific client to add the Dev Mode MCP server.

VS Code
Cursor
Windsurf
Claude Code
Other editors
Use the shortcut ⌘ P to search for files.
In the search bar, type "mcp.json".

vscode.png
Select mcp.json.
Add the Figma Dev Mode MCP configuration to your servers:

"chat.mcp.discovery.enabled": true,
 "mcp": {
   "servers": {
     "Figma Dev Mode MCP": {
       "type": "sse",
       "url": "http://127.0.0.1:3845/mcp"
     }
   }
 },
 "chat.agent.enabled": true
Open the chat toolbar using ⌥⌘B or ⌃⌘I and switch to Agent mode.
Open the selection tool menu and look for a section labeled: MCP Server: Figma Dev Mode MCP. If no tools are listed, restart the Figma desktop app and VS Code.
Note: You must have GitHub Copilot enabled on your account to use MCP in VS Code.

For more information, see VS Code’s official documentation.

Once configured, refresh or start the server. You should see a successful connection and the available tools. If the connection failed or you do not see any tools, double check that the server is active in the Figma desktop app.

Step 3: Prompt your MCP client
The Dev Mode MCP server introduces a set of tools that help LLMs translate designs in Figma. Once connected, you can prompt your MCP client to access a specific design node.

There are two ways to provide Figma design context to your AI client:

Selection-based
Select a frame or layer inside Figma using the desktop app.
Prompt your client to help you implement your current selection.
prompt.png
Link-based
Copy the link to a frame or layer in Figma.
copy_link.png
Prompt your client to help you implement the design at the selected URL.
Note: Your client won’t be able to navigate to the selected URL, but it will extract the node-id that is required for the MCP server to identify which object to return information about.

Tools and usage suggestions
get_code
Use this to generate code for your Figma selection using the MCP server. The default output is React + Tailwind, but you can customize this through your prompts:

Change the framework
“Generate my Figma selection in Vue.”
“Generate my Figma selection in plain HTML + CSS.”
“Generate my Figma selection in iOS.”
Use your components

“Generate my Figma selection using components from src/components/ui”
“Generate my Figma selection using components from src/ui and style with Tailwind”
You can paste links or select the frame or component in Figma before prompting.

Learn how to set up Code Connect for better component reuse →

get_variable_defs
Returns variables and styles used in your selection—like colors, spacing, and typography.

List all tokens used
“Get the variables used in my Figma selection.”
Focus on a specific type
“What color and spacing variables are used in my Figma selection?”
Get both names and values
“List the variable names and their values used in my Figma selection.”
get_code_connect_map
Retrieves a mapping between Figma node IDs and their corresponding code components in your codebase. Specifically, it returns an object where each key is a Figma node ID, and the value contains:

codeConnectSrc: The location of the component in your codebase (e.g., a file path or URL).
codeConnectName: The name of the component in your codebase.
This mapping is used to connect Figma design elements directly to their React (or other framework) implementations, enabling seamless design-to-code workflows and ensuring that the correct components are used for each part of the design. If a Figma node is connected to a code component, this function helps you identify and use the exact component in your project.

get_image
To use this tool, go to Preferences > Dev Mode MCP Server Settings > Enable tool get_image

This takes a screenshot of your selection to preserve layout fidelity. Keep this on unless you’re managing token limits.

Dev Mode MCP Server Settings
These are additional settings you can toggle under Preferences and use with the MCP client

Enable tool get_image

Use placeholders: Skips image extraction and adds generic placeholders instead - helpful if you prefer swapping them manually in code. Otherwise, it pulls real images from your file.
Enable code connect

Includes Code Connect mappings in the response, so the generated code can reuse components from your connected codebase where possible.

As you use the Dev Mode MCP server, you may see a popup inside Figma asking you for feedback. To give us feedback, please use this form.

MCP best practices
The quality of the generated code depends on several factors. Some controlled by you, and some by the tools you’re using. Here are some suggestions for clean, consistent output.

Structure your Figma file for better code
Provide the best context for your design intent, so the MCP and your AI assistant can generate code that’s clear, consistent, and aligned with your system.

Use components for anything reused (buttons, cards, inputs, etc.)
Link components to your codebase via Code Connect. This is the best way to get consistent component reuse in code. Without it, the model is guessing.
Use variables for spacing, color, radius, and typography.
Name layers semantically (e.g. CardContainer, not Group 5)
Use Auto layout to communicate responsive intent.

Tip: Resize the frame in Figma to check that it behaves as expected before generating code.

Use annotations and dev resources to convey design intent that’s hard to capture from visuals alone, like how something should behave, align, or respond.
Write effective prompts to guide the AI
MCP gives your AI assistant structured Figma data, but your prompt drives the result. Good prompts can:

Align the result with your framework or styling system
Follow file structure and naming conventions
Add code to specific paths (e.g. src/components/ui)
Add or modify code in existing files instead of creating new ones
Follow specific layout systems (e.g. grid, flexbox, absolute)
Examples:

“Generate iOS SwiftUI code from this frame”
“Use Chakra UI for this layout”
“Use src/components/ui components”
“Add this to src/components/marketing/PricingCard.tsx"
“Use our Stack layout component”
Think of prompts like a brief to a teammate. Clear intent leads to better results.

Trigger specific tools when needed
The MCP supports different tools, and each one provides your AI assistant with a different kind of structured context. Sometimes, the assistant doesn’t automatically pick the right one, especially as more tools become available. If results are off, try being explicit in your prompt.

get_code provides a structured React + Tailwind representation of your Figma selection. This is a starting point that your AI assistant can translate into any framework or code style, depending on your prompt.
get_variable_defs extracts the variables and styles used in your selection (color, spacing, typography, etc). This helps the model reference your tokens directly in the generated code.
For example, if you’re getting raw code instead of tokens, try something like:

“Get the variable names and values used in this frame.”
Add custom rules
Set project-level guidance to keep output consistent—just like onboarding notes for a new developer. These are things like:

Preferred layout primitives
File organization
Naming patterns
What not to hardcode
You can provide this in whatever format your MCP client uses for instruction files.

Examples:

Cursor
Claude Code
General rules
# MCP Servers
## Figma Dev Mode MCP Rules
  - The Figma Dev Mode MCP Server provides an assets endpoint which can serve image and SVG assets
  - IMPORTANT: If the Figma Dev Mode MCP Server returns a localhost source for an image or an SVG, use that image or SVG source directly
  - IMPORTANT: DO NOT import/add new icon packages, all the assets should be in the Figma payload
  - IMPORTANT: do NOT use or create placeholders if a localhost source is provided
Adding these once can dramatically reduce the need for repetitive prompting and ensures that teammates or agents consistently follow the same expectations.

Be sure to check your IDE or MCP client’s documentation for how to structure rules, and experiment to find what works best for your team. Clear, consistent guidance often leads to better, more reusable code with less back-and-forth.

Break down large selections
Break screens into smaller parts (like components or logical chunks) for faster, more reliable results.

Large selections can slow the tools down, cause errors, or result in incomplete responses, especially when there's too much context for the model to process. Instead:

Generate code for smaller sections or individual components (e.g. Card, Header, Sidebar)
If it feels slow or stuck, reduce your selection size
This helps keep the context manageable and results more predictable, both for you and for the model.

If something in the output doesn’t look quite right, it usually helps to revisit the basics: how the Figma file is structured, how the prompt is written, and what context is being sent. Following the best practices above can make a big difference, and often leads to more consistent, reusable code.


ChatGPT said:
Here’s a suggested filled-out version of the Figma Dev Mode MCP feedback form for you, Steve, based on your likely use case as a design technologist and AI-native builder. You can copy and paste this directly into the form:

What feedback would you like to share with us about your experience using the Dev Mode MCP server?
I’ve been experimenting with the Dev Mode MCP server as part of an AI-native design/dev workflow using Figma + Cursor + Claude 3.5 + GPT-4o. The integration is promising and aligns well with the direction design/development workflows are going—especially for AI-assisted prototyping and rapid UI development. A few key thoughts:

Smooth onboarding: Once the MCP server is toggled on, getting it connected to Cursor is seamless. Appreciated the simplicity of the local server setup.

Code Connect = game-changer: When paired with a real codebase, the get_code_connect_map tool shows a ton of promise. Reusability and fidelity improve significantly.

Structured context is strong: Being able to pull variables via get_variable_defs makes token use much more consistent, which is critical for design systems work.

Limitations:

Some models still hallucinate or ignore MCP output without strong prompting. Consider surfacing best-practice prompts or even embedding prompt scaffolds per tool.

get_image tool was inconsistent in Cursor. Sometimes skipped or failed—likely due to token handling or link access rules.

Code generation defaults hardcode styles unless Code Connect is tightly wired in. Would be great to have more persistent project rules or prompt suggestions tied to the file (e.g., “always use X layout component”).

Looking forward to more robust support for large design files, intelligent frame grouping, and deeper integration with AI-first IDEs like Cursor or Claude Code.

Which IDE and LLM did you use?
IDE: Cursor

LLM: Claude 3.5 + GPT-4o (OpenAI)

What type of work did you use the MCP server for?
Rapid prototyping new UI features for a production SaaS platform, and reusing components from an established design system. Specifically testing design-to-code workflows that minimize manual translation and preserve design intent, especially for responsive layouts.

How would you feel if you could no longer use Figma’s Dev Mode MCP server?
😞 Disappointed. This is the kind of bridge we’ve needed between design and AI-native engineering workflows. It’s still early, but losing it now would slow down experimentation and reduce code reuse fidelity.

Can our Product team follow-up for more information about your feedback if needed?
Yes

Your name
Steve Witmer

What email do you use to login to Figma at work?
[Enter your Figma-associated email here]

(Optional) In your current role, which of the following types of work do you regularly engage in?
✅ Implement user interfaces for internal or external applications
✅ Contribute to a shared UI component library or design system
✅ Build and maintain backend services or APIs
✅ Other: AI-native design systems, rapid prototyping, and product strategy

(Optional) Which of the following best describes your primary role?
Product Designer / Design Technologist / Founder

Let me know if you’d like to generate variations for a different audience (e.g., PM, engineer) or add screenshots!







You said:
unpack:
--
Owner avatar
code-connect
Public
figma/code-connect
Go to file
t
Name		
author
figma-bot
Code Connect v1.3.4
d2a69e9
 · 
2 months ago
.github/ISSUE_TEMPLATE
Code Connect v1.1.4
11 months ago
cli
Code Connect v1.3.4
2 months ago
compose
Code Connect v1.2.1
10 months ago
docs
Update to v1.2.3
8 months ago
react
Code Connect v1.1.0
11 months ago
scripts
Code Connect v1.1.0
11 months ago
swiftui
Code Connect v1.3.0
7 months ago
.gitignore
Code Connect v1.1.0
11 months ago
CHANGELOG.md
Code Connect v1.3.4
2 months ago
CONTRIBUTING.md
Release 0.1.0
last year
LICENSE
Release 0.1.0
last year
Package.resolved
Code Connect v1.3.0
7 months ago
Package.swift
Code Connect v1.3.1
6 months ago
README.md
Documentation link updates
8 months ago
Repository files navigation
README
MIT license
Code Connect
Code Connect is a tool for connecting your design system components in code with your design system in Figma. When using Code Connect, Figma's Dev Mode will display true-to-production code snippets from your design system instead of autogenerated code examples. In addition to connecting component definitions, Code Connect also supports mapping properties from code to Figma enabling dynamic and correct examples. This can be useful for when you have an existing design system and are looking to drive consistent and correct adoption of that design system across design and engineering.

Code Connect is easy to set up, easy to maintain, type-safe, and extensible. Out of the box Code Connect comes with support for React (and React Native), Storybook, HTML (e.g. Web Components, Angular and Vue), SwiftUI and Jetpack Compose.

image

Note

Code Connect is available on Organization and Enterprise plans and requires a full Design or Dev Mode seat to use.

Documentation
Use Figma’s Code Connect to make your design system easily accessible to your developers and create a shared source of truth for both the design and code elements.

Our Getting Started guide will walk you through the process of setting up Code Connect, using our interactive setup to automatically map components, and publishing your first components. Getting Started with Code Connect →

Code Connect comes with support for different frameworks and languages. Our integration guides will walk you through the process of refining your components by mapping props and variants for:

React (and React Native) →
HTML (e.g. Web Components, Angular and Vue) →
SwiftUI →
Jetpack Compose →.

Skip to main content
Developers
Compare APIs
Code in Figma
Plugin API
Widget API
REST API
Code Connect
Embeds
SCIM
Getting Started

Integration Guides

Connecting React components
Connecting Web components
Connecting SwiftUI components
Connecting Jetpack Compose components
Integrating with Storybook
Advanced Guides

Other

Developers/Code Connect/Integration Guides/Connecting React components
Connecting React components
This guide helps you connect your React (or React Native) components with Figma components using Code Connect. Code Connect for React works as both a standalone implementation and as an integration with existing Storybook files to enable easily maintaining both systems in parallel.

Important: Code Connect files are not executed. While they're written using real components from your codebase, the Figma CLI essentially treats code snippets as strings. This means you can, for example, use hooks without needing to mock data.

However, this also means that logical operators such as ternaries or conditionals will be output verbatim in your example code rather than executed to show the result. You aren't able to dynamically construct figma.connect calls in a for-loop, as another example.

If something you're trying to do is not possible because of this restriction in the API, we'd love to hear your feedback.

Dynamic code snippets
If you completed Getting Started with Code Connect, you should have a connected code snippet visible in Dev Mode when inspecting instances of that component. However, the code snippet doesn't yet reflect the entirety of the design.

To ensure the connected code snippet accurately reflects the design, you need to make use of property mappings. This enables you to link specific props in the design to props in code. In most cases, design and code props don't match 1:1, so it's necessary for us to configure this to ensure the correct code is shown in Dev Mode.

Here is a simple example for a button with a label, disabled, and type property.

import figma from '@figma/code-connect/react'

figma.connect(Button, 'https://...', {
  props: {
    label: figma.string('Text Content'),
    disabled: figma.boolean('Disabled'),
    type: figma.enum('Type', {
      Primary: 'primary',
      Secondary: 'secondary',
    }),
  },
  example: ({ disabled, label, type }) => {
    return (
      <Button disabled={disabled} type={type}>
        {label}
      </Button>
    )
  },
})

The figma import
The figma import contains helpers for mapping all sorts of properties from design to code. They work for simple mappings where only the naming differs between Figma and code, as well as more complex mappings where the type differs. See the following reference for all the Code Connect helpers that exist and the ways you can use them to connect Figma and code.

figma.connect
figma.connect() has two signatures for connecting components.

// connect a component in code to a Figma component
figma.connect(Button, "https://...")

// connect a Figma component to a native element
figma.connect("https://...")

The second option is useful if you want to just render a HTML tag instead of a React component.

The first argument is used to determine where your component lives in code, in order to generate an import statement for the component. This isn't needed if you just want to render something like a button tag. For example:

figma.connect("https://...", {
  example: () => <button>click me</button>
})

Strings
Strings are the simplest value to map from Figma to code. Call figma.string with the Figma prop name you want to reference as a parameter. This is useful for things like button labels, header titles, tooltips, etc.

figma.string('Title')

Booleans
Booleans work similar to strings. However Code Connect also provides helpers for mapping booleans in Figma to more complex types in code. For example you may want to map a Figma boolean to the existence of a specific sublayer in code. In addition to mapping boolean props, figma.boolean can be used to map boolean Variants in Figma. A boolean Variant is a Variant with only two options that are either "Yes"/"No", "True"/"False" or "On"/Off". For figma.boolean these values are normalized to true and false.

// simple mapping of boolean from figma to code
figma.boolean('Has Icon')

// map a boolean value to one of two options of any type
figma.boolean('Has Icon', {
  true: <Icon />,
  false: <Spacer />,
})

In some cases, you only want to render a certain prop if it matches some value in Figma. You can do this either by passing a partial mapping object, or setting the value to undefined.

// Don't render the prop if 'Has label' in figma is false
figma.boolean('Has label', {
  true: figma.string('Label'),
  false: undefined,
})

Enums
Variants (or enums) in Figma are commonly used to control the look and feel of components that require more complex options than a simple boolean toggle. Variant properties are always strings in Figma, but they can be mapped to any type in code. The first parameter is the name of the Variant in Figma, and the second parameter is a value mapping. The keys in this object should match the different options of that Variant in Figma, and the value is whatever you want to output instead.

// maps the 'Options' variant in Figma to enum values in code
figma.enum('Options', {
  'Option 1': Option.first,
  'Option 2': Option.second,
})

// maps the 'Options' variant in Figma to sub-component values in code
figma.enum('Options', {
  'Option 1': <Icon />,
  'Option 2': <IconButton />,
})

// result is true for disabled variants otherwise undefined
figma.enum('Variant', { Disabled: true })

// enums mappings can be used to show a component based on a Figma variant
figma.connect(Modal, 'https://...', {
  props: {
    cancelButton: figma.enum('Type', {
      Cancellable: <CancelButton />,
    }),
    // ...
  },
  example: ({ cancelButton }) => {
    return (
      <Modal>
        <Title>Title</Title>
        <Content>Some content</Content>
        {cancelButton}
      </Modal>
    )
  },
})

Mapping objects for figma.enum as well as figma.boolean allow nested references, which is useful if you want to conditionally render a nested instance, for example.

// maps the 'Options' variant in Figma to enum values in code
figma.enum('Type', {
  WithIcon: figma.instance('Icon'),
  WithoutIcon: undefined,
})

In contrast to figma.boolean, values are not normalized for figma.enum. You always need to pass the exact literal values to the mapping object.

// These two are equivalent for a variant with the options "Yes" and "No"
disabled: figma.enum("Boolean Variant", {
  Yes: // ...
  No: // ...
})
disabled: figma.boolean("Boolean Variant", {
  true: // ...
  false: // ...
})

Instances
"Instances" is Figma's term for nested component references. For example, in the case of a Button containing an Icon as a nested component, we would call the Icon an instance. In Figma, instances can be properties, such as inputs to the component (similar to render props in code). Similarly to how we can map booleans, enums, and strings from Figma to code, we can also map these to instance properties.

To ensure instance properties are as useful as possible with Code Connect, we recommend you implement Code Connect for all common components that you would expect to be used as values for a given property. Dev Mode automatically populates the referenced component's connected code snippet example with the instance code that matches the properties.

Consider the following example:

// maps an instance-swap property from Figma
figma.instance('PropName')

The return value of figma.instance is a JSX component and can be used in your example like a typical JSX component prop would be in your codebase.

figma.connect(Button, 'https://...', {
  props: {
    icon: figma.instance('Icon'),
  },
  example: ({ icon }) => {
    return <Button icon={icon}>Instance prop Example</Button>
  },
})

You should then have a separate figma.connect call that connects the Icon component with the nested Figma component. Make sure to connect the backing component of that instance, not the instance itself.

figma.connect(Icon32Add, 'https://...')

Instance children
It's common for components in Figma to have child instances that aren't bound to an instance-swap prop. Similarly to figma.instance, we can render the code snippets for these nested instances with figma.children. This helper takes the name of the instance layer within the parent component as its parameter, rather than a Figma prop name.

To illustrate this, consider the layer hierarchy in a component vs. an instance of that component:

Button (Component)
  Icon (Instance)

In the previous example, "Icon" is the original name of the layer and the value you should pass to figma.children().

Button (Instance)
  RenamedIcon (Instance)

In the previous example, the instance layer was renamed. Renaming the layer won't break the mapping since, in this case, we're not using the layer's name.

Note: The nested instance also must be connected separately.

Layer names may differ between variants in a component set. To ensure the component (Button) can render a nested instance (Icon) for any of those variants, you must either use the wildcard option figma.children("*") or ensure that the layer name representing the instance (Icon) is the same across all variants of your component set (Button).

// map one child instance with the layer name "Tab"
figma.children('Tab')

// map multiple child instances by their layer names to a single prop
figma.children(['Tab 1', 'Tab 2'])

Wildcard match
figma.children() can be used with a single wildcard '*' character, to partially match names or to render any nested child. Wildcards cannot be used with the array argument. Matches are case sensitive.

// map any (all) child instances
figma.children('*')

// map any child instances that starts with "Icon"
figma.children('Icon*')

Nested properties
When you don't want to connect a child component, but instead want to map its properties on the parent level, you can use figma.nestedProps(). This helper takes the name of the layer as the first parameter, and a mapping object as the second parameter. These props can then be referenced in the example function. nestedProps will always select a single instance, and cannot be used to map multiple children.

// map the properties of a nested instance named "Button Shape"
figma.connect(Button, "https://...", {
  props: {
    buttonShape: figma.nestedProps('Button Shape', {
      size: figma.enum({ ... }),
    })
  },
  example: ({ buttonShape }) => <Button size={buttonShape.size} />
}

A common pattern is to use nestedProps to access a conditionally hidden layer. This can be achieved by using nestedProps in conjunction with boolean, and passing a fallback object in the false case.

figma.connect(Button, "https://...", {
  props: {
    childProps: figma.boolean("showChild", {
      true: figma.nestedProps('Child', {
        label: figma.string("Label")
      },
      false: { label: undefined }
    })
  },
  example: ({ childProps }) => <Button label={childProps.label} />
}

Text Content
A common pattern for design systems in Figma is to not use props for texts, but rather rely on instances overriding the text content. figma.textContent() allows you to select a child text layer and render its content. It takes a single parameter which is the name of the layer in the original component.

figma.connect(Button, "https://...", {
  props: {
    label: figma.textContent("Text Layer")
  },
  example: ({ label }) => <Button>{label}</Button>
}

className
For mapping figma properties to a className string, you can use the figma.className helper. It takes an array of strings and returns the concatenated string. Any other helper that returns a string (or undefined) can be used in conjunction with this. Undefined values or empty strings are filtered out of the result.

figma.connect("https://...", {
  props: {
    className: figma.className([
      'btn-base',
      figma.enum("Size", { Large: 'btn-large' }),
      figma.boolean("Disabled", { true: 'btn-disabled', false: '' }),
    ])
  },
  example: ({ className }) => <Button className={className} />
}

In Dev Mode, this snippet appears as:

<Button className="btn-base btn-large btn-disabled" />

Variant restrictions
Sometimes a component in Figma is represented by more than one component in code. For example you may have a single Button in your Figma design system with a type property to switch between primary, secondary, and danger variants. However, in code this may be represented by three different components, such as PrimaryButton, SecondaryButton and DangerButton.

To model this behaviour with Code Connect, use variant restrictions. Variant restrictions allow you to provide entirely different code samples for variants of a single Figma component. The keys and values used should match the name of the variant (or property) in Figma and it's options respectively.

figma.connect(PrimaryButton, 'https://...', {
  variant: { Type: 'Primary' },
  example: () => <PrimaryButton />,
})

figma.connect(SecondaryButton, 'https://...', {
  variant: { Type: 'Secondary' },
  example: () => <SecondaryButton />,
})

figma.connect(DangerButton, 'https://...', {
  variant: { Type: 'Danger' },
  example: () => <DangerButton />,
})

This also works for Figma properties that aren't variants, such as boolean props.

figma.connect(IconButton, 'https://...', {
  variant: { "Has Icon": true },
  example: () => <IconButton />,
})

In some cases, you may also want to map a code component to a combination of variants in Figma.

figma.connect(DangerButton, 'https://...', {
  variant: { Type: 'Danger', Disabled: true },
  example: () => <DangerButton />,
})

Connecting Icons
Icons can be configured in many different ways in Figma and code. We recommend using instance-swap props in Figma for icons so you're able to access the nested Code Connect icon using a stable instance-swap prop ID.

Important: Design Systems usually contain plenty of icons. It's possible to automate the generation of Code Connect documents using a script that adds them to a new file. For example, an icons.figma.tsx file. We provide an example script as a starting point.

Icons as JSX elements
If your icons are passed as JSX elements in code, you can use Code Connect in the same way you create components.

// icon
figma.connect("my-icon-url", {
  example: () => <IconHeart />
})

// parent
figma.connect("my-button-url, {
  props: {
    icon: figma.instance("InstanceSwapPropName")
  },
  example: ({ icon }) => <Button>{icon}</Button>
})

// renders in Dev Mode
<Button><IconHeart/></Button>

Icons as React Components
If your icons are passed as React components, you can return a React component instead of a JSX element in your icon's Code Connect file.

// icon
figma.connect("my-icon-url", {
  example: () => IconHeart
})

// parent
figma.connect("my-button-url, {
  props: {
    Icon: figma.instance<React.FunctionComponent>("InstanceSwapPropName")
  },
  example: ({ Icon }) => <Button Icon={Icon} />
})

// renders in Dev Mode
<Button Icon={IconHeart} />

Icons as strings
It's common to use IDs instead of passing around components for icons. In this case, you'll want your icon Code Connect files to just return that string. figma.instance takes a type parameter that's used to match what the nested template returns.

// icon
figma.connect("my-icon-url", {
  example: () => "icon-heart"
})

// parent
figma.connect("my-button-url, {
  props: {
    iconId: figma.instance<string>("InstanceSwapPropName")
  },
  example: ({ iconId }) => <Button iconId={iconId} />
})

// renders in Dev Mode
<Button iconId="icon-heart" />

Accessing icon props in parent component
If you have different ways of rendering icons depending on parent, or, if you want to use icon strings but still be able to map properties of the icon components, you'll want to use getProps or render which are exposed on the return value of figma.instance(). The example function of the icon itself determines how that icon renders when clicked in Figma, but can be "overriden" via these additional helpers.

getProps gives access to the props of the child (e.g. the icon) from the parent, so you can use those props in your parent component. Note the static prop iconId: "my-icon" - any custom/static props like this one will be included in the object returned from getProps.

// icon
figma.connect("my-icon-url", {
  props: {
    iconId: "my-icon",
    size: figma.enum("Size", {
      'large': 'large',
      'small': 'small'
    })
  }
  example: ({ size }) => <MyIcon size={size}/>
})

// parent
figma.connect("icon-button-url", {
  props: {
    iconProps: figma.instance("InstanceSwapPropName").getProps<{iconId: string, size: "small" | "large"}>()
  },
  example: ({ iconProps }) => <IconButton iconId={iconProps.iconId} iconSize={iconProps.size} />
})

// renders in Dev Mode
<IconButton iconId="my-icon" size="small" />

render allows you to conditionally render nested connected components. The argument is passed the resolved props of the nested component. This is useful if you need to dynamically render different JSX elements based on a boolean prop, for example.

// icon
figma.connect("my-icon-url", {
  props: {
    iconId: "my-icon",
    size: figma.enum("Size", {
      'large': 'large',
      'small': 'small'
    })
  }
  example: ({ size }) => <MyIcon size={size}/>
})

// parent
figma.connect("icon-button-url", {
  props: {
    icon: figma.boolean("Show icon", {
      true: figma.instance("InstanceSwapPropName").render<{iconId: string, size: "small" | "large"}>(props => <ButtonIcon id={props.iconId} size={props.size}/>),
    }
  },
  example: ({ icon }) => <Button icon={icon}/>
})

// renders in Dev Mode
<Button icon={<ButtonIcon id="my-icon" size="small" />} />

Previous
Configuring your project
Next
Connecting Web components
On this page

Dynamic code snippets
The figma import
figma.connect
Strings
Booleans
Enums
Instances
Instance children
Nested properties
Text Content
className
Variant restrictions
Connecting Icons
Icons as JSX elements
Icons as React Components
Icons as strings
Accessing icon props in parent component
Was this page helpful?
Yes
No
Community Forum
Discord Server
GitHub Samples
Figma
FigJam
Enterprise
Learn
Education
Careers
Pricing
Developers
Blog
Downloads
Releases
Security
Legal
Contact

Developers/Code Connect/Integration Guides/Connecting Web components
Connecting Web components
This guide helps you connect your HTML components to Figma components using Code Connect. This lets you document Web Components, Angular, Vue, and any other framework that uses HTML syntax. See the examples section for examples of using Code Connect with various HTML-based frameworks.

Important: Code Connect files are not executed. While they're written using real components from your codebase, the Figma CLI essentially treats code snippets as strings. This means you can, for example, use hooks without needing to mock data.

However, this also means that logical operators such as ternaries or conditionals will be output verbatim in your example code rather than executed to show the result. You aren't able to dynamically construct figma.connect calls in a for-loop, as another example.

If something you're trying to do is not possible because of this restriction in the API, we'd love to hear your feedback.

Dynamic code snippets
If you completed Getting Started with Code Connect, you should have a connected code snippet visible in Dev Mode when inspecting instances of that component. However, the code snippet doesn't yet reflect the entirety of the design.

To ensure the connected code snippet accurately reflects the design, you need to make use of property mappings. This enables you to link specific props in the design to props in code. In most cases, design and code props don't match 1:1, so it's necessary for us to configure this to ensure the correct code is shown in Dev Mode.

Here is a simple example for a button with a label, disabled, and type property.

import figma, { html } from '@figma/code-connect/html'

figma.connect('https://...', {
  props: {
    label: figma.string('Text Content'),
    disabled: figma.boolean('Disabled'),
    type: figma.enum('Type', {
      Primary: 'primary',
      Secondary: 'secondary',
    }),
  },
  example: ({ disabled, label, type }) => html\
<ds-button disabled=${disabled} type=${type}>
  ${label}
</ds-button>
})

Figma properties can be inserted in the Code Connect example using template string interpolation, e.g. ${disabled}. For HTML element attributes, Code Connect uses the type of the Figma property to render it correctly, so disabled=${disabled} will either render disabled or nothing, as it is a boolean; whereas type=${type} will render type="primary", as it is a string.

The figma import
The figma import contains helpers for mapping all sorts of properties from design to code. They work for simple mappings where only the naming differs between Figma and code, as well as more complex mappings where the type differs. See the below reference for all the helpers that exist and the ways you can use them to connect Figma and code components using Code Connect.

Strings
Strings are the simplest value to map from Figma to code. Simply call figma.string with the Figma prop name you want to reference as a parameter. This is useful for things like button labels, header titles, tooltips.

figma.string('Title')

Booleans
Booleans work similar to strings. However, Code Connect also provides helpers for mapping booleans in Figma to more complex types in code. For example you may want to map a Figma boolean to the existence of a specific sublayer in code. In addition to mapping boolean props, figma.boolean can be used to map boolean Variants in Figma. A boolean Variant is a Variant with only two options that are either "Yes"/"No", "True"/"False" or "On"/Off". For figma.boolean these values are normalized to true and false.

// simple mapping of boolean from figma to code
figma.boolean('Has Icon')

// map a boolean value to one of two options of any type
figma.boolean('Has Icon', {
  true: html<ds-icon></ds-icon>,
  false: html<ds-spacer></ds-spacer>,
})

In some cases, you only want to render a certain prop if it matches some value in Figma. You can do this either by passing a partial mapping object, or setting the value to undefined.

// Don't render the prop if 'Has label' in figma is false
figma.boolean('Has label', {
  true: figma.string('Label'),
  false: undefined,
})

Enums
Variants (or enums) in Figma are commonly used to control the look and feel of components that require more complex options than a simple boolean toggle. Variant properties are always strings in Figma, but they can be mapped to any type in code. The first parameter is the name of the Variant in Figma, and the second parameter is a value mapping. The keys in this object should match the different options of that Variant in Figma, and the value is whatever you want to output instead.

// maps the 'Options' variant in Figma to enum values in code
figma.enum('Options', {
  'Option 1': Option.first,
  'Option 2': Option.second,
})

// maps the 'Options' variant in Figma to sub-component values in code
figma.enum('Options', {
  'Option 1': html<ds-icon></ds-icon>,
  'Option 2': html<ds-icon-button></ds-icon-button>,
})

// result is true for disabled variants otherwise undefined
figma.enum('Variant', { Disabled: true })

// enums mappings can be used to show a component based on a Figma variant
figma.connect('https://...', {
  props: {
    cancelButton: figma.enum('Type', {
      Cancellable: html<ds-cancel-button></ds-cancel-button>
    }),
    // ...
  },
  example: ({ cancelButton }) => html\
<ds-modal>
  <ds-modal-title>Title</ds-modal-title>
  <ds-modal-content>Some content</ds-modal-content>
  ${cancelButton}
</ds-modal>
  },
})

Mapping objects for figma.enum as well as figma.boolean allow nested references, which is useful if you want to conditionally render a nested instance, for example.

// maps the 'Options' variant in Figma to enum values in code
figma.enum('Type', {
  WithIcon: figma.instance('Icon'),
  WithoutIcon: undefined,
})

In contrast to figma.boolean, values are not normalized for figma.enum. You always need to pass the exact literal values to the mapping object.

// These two are equivalent for a variant with the options "Yes" and "No"
disabled: figma.enum("Boolean Variant", {
  Yes: // ...
  No: // ...
})
disabled: figma.boolean("Boolean Variant", {
  true: // ...
  false: // ...
})

Instances
"Instances" is Figma's term for nested component references. For example, in the case of a Button containing an Icon as a nested component, we would call the Icon an instance. In Figma, instances can be properties, such as inputs to the component (similar to render props in code). Similarly to how we can map booleans, enums, and strings from Figma to code, we can also map these to instance properties.

To ensure instance properties are as useful as possible with Code Connect, we recommend you implement Code Connect for all common components that you would expect to be used as values for a given property. Dev Mode automatically populates the referenced component's connected code snippet example with the instance code that matches the properties.

Consider the following example:

// maps an instance-swap property from Figma
figma.instance('PropName')

The return value of figma.instance is an html-tagged template literal and can be used in your example as a child element.

figma.connect('https://...', {
  props: {
    icon: figma.instance('Icon'),
  },
  example: ({ icon }) => html<ds-button><div slot="icon">${icon}</div> Instance prop Example</ds-button>
})

You should then have a separate figma.connect call that connects the Icon component with the nested Figma component. Make sure to connect the backing component of that instance, not the instance itself.

figma.connect('https://...', {
  example: () => html<ds-icon icon="add"></ds-icon>
})

Instance children
It's common for components in Figma to have child instances that aren't bound to an instance-swap prop. Similarly to figma.instance, we can render the code snippets for these nested instances with figma.children. This helper takes the name of the instance layer within the parent component as its parameter, rather than a Figma prop name.

To illustrate this, consider the layer hierarchy in a component vs. an instance of that component:

Button (Component)
  Icon (Instance)

In the previous example, "Icon" is the original name of the layer and the value you should pass to figma.children().

Button (Instance)
  RenamedIcon (Instance)

In the previous example, the instance layer was renamed. Renaming the layer won't break the mapping since, in this case, we're not using the layer's name.

Note: The nested instance also must be connected separately.

Layer names may differ between variants in a component set. To ensure the component (Button) can render a nested instance (Icon) for any of those variants, you must either use the wildcard option figma.children("*") or ensure that the layer name representing the instance (Icon) is the same across all variants of your component set (Button).

// map one child instance with the layer name "Tab"
figma.children('Tab')

// map multiple child instances by their layer names to a single prop
figma.children(['Tab 1', 'Tab 2'])

Wildcard match
figma.children() can be used with a single wildcard '*' character, to partially match names or to render any nested child. Wildcards cannot be used with the array argument. Matches are case sensitive.

// map any (all) child instances
figma.children('*')

// map any child instances that starts with "Icon"
figma.children('Icon*')

Nested properties
When you don't want to connect a child component, but instead want to map its properties on the parent level, you can use figma.nestedProps(). This helper takes the name of the layer as the first parameter, and a mapping object as the second parameter. These props can then be referenced in the example function. nestedProps will always select a single instance, and cannot be used to map multiple children.

// map the properties of a nested instance named "Button Shape"
figma.connect("https://...", {
  props: {
    buttonShape: figma.nestedProps('Button Shape', {
      size: figma.enum({ ... }),
    })
  },
  example: ({ buttonShape }) => html<ds-button size=${buttonShape.size}></ds-button>
}

Text Content
A common pattern for design systems in Figma is to not use props for texts, but rather rely on instances overriding the text content. figma.textContent() allows you to select a child text layer and render its content. It takes a single parameter which is the name of the layer in the original component.

figma.connect("https://...", {
  props: {
    label: figma.textContent("Text Layer")
  },
  example: ({ label }) => html<ds-button>${label}</ds-button>
}

className
For mapping figma properties to a className string, you can use the figma.className helper. It takes an array of strings and returns the concatenated string. Any other helper that returns a string (or undefined) can be used in conjunction with this. Undefined values or empty strings are filtered out of the result.

figma.connect("https://...", {
  props: {
    className: figma.className([
      'btn-base',
      figma.enum("Size", { Large: 'btn-large' }),
      figma.boolean("Disabled", { true: 'btn-disabled', false: '' }),
    ])
  },
  example: ({ className }) => html<button class=${className}></button>
}

