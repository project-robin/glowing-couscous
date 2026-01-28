# AI Coding Agent Rules & Guidelines

## Table of Contents
1. [Skill Discovery Protocol](#skill-discovery-protocol)
2. [Browser Testing with Agent Browser](#browser-testing-with-agent-browser)
3. [Documentation & Debugging with DeepWiki MCP](#documentation--debugging-with-deepwiki-mcp)
4. [General Best Practices](#general-best-practices)

---

## Skill Discovery Protocol

### Rule #1: Always Check for Available Skills First

**CRITICAL**: Before attempting any task, use the skill discovery mechanism to check if a relevant skill exists.

**When to Search for Skills:**
- At the start of any new task type you haven't encountered before
- When facing unfamiliar frameworks, tools, or technologies
- Before attempting complex operations (testing, deployment, debugging)
- When you're uncertain about the best approach for a task

**How to Discover Skills:**
1. Use the native skill search/discovery tool available in your environment
2. Search by task description, technology name, or domain
3. Load the full skill instructions once you find a relevant match
4. Follow the skill's guidelines precisely

**Available Skill Locations:**
- Project skills: `.github/skills/` or `.claude/skills/` (project-specific)
- Personal skills: `~/.claude/skills/` or `~/.copilot/skills/` (user-level)
- Global skills: `~/.config/opencode/skill/` (system-level)

**Progressive Disclosure Pattern:**
- Skills load metadata first (~100 tokens) for discovery
- Full instructions load only when activated
- Reference files load only when needed

**Example Discovery Flow:**
```
Task: "Test the login flow"
1. Search skills: "browser testing", "web testing", "playwright"
2. Found: agent-browser skill
3. Load: Read agent-browser/SKILL.md
4. Execute: Follow skill instructions
```

---

## Browser Testing with Agent Browser

### Rule #2: Use Agent Browser for All Web Application Testing

**Primary Tool**: `agent-browser` CLI tool
**Purpose**: Browser automation optimized for AI agents with minimal context usage
**Skill Location**: Check for `agent-browser` skill in your skills directory

### When to Use Agent Browser

Use `agent-browser` for:
- Testing web application functionality
- Verifying UI/UX behavior
- Debugging frontend issues
- Accessing web-based resources during development
- Automated browser-based workflows
- Screenshot capture and visual verification
- Form filling and interaction testing

### Agent Browser Skill Reference

**MANDATORY**: Before using agent-browser, read the agent-browser skill:
```bash
# Check if skill exists and read it
view ~/.claude/skills/agent-browser/SKILL.md
# Or project-level
view .claude/skills/agent-browser/SKILL.md
```

### Core Agent Browser Workflow

#### 1. Navigation
```bash
agent-browser open <url>           # Navigate to URL
agent-browser back                 # Go back
agent-browser forward              # Go forward
agent-browser reload               # Refresh page
```

#### 2. Element Discovery (CRITICAL STEP)
```bash
# Get interactive snapshot with element references
agent-browser snapshot -i

# This returns elements with @e1, @e2, @e3 references
# ALWAYS use snapshot before interacting with page elements
```

#### 3. Element Interaction (Using Refs)
```bash
agent-browser click @e1                    # Click element
agent-browser fill @e2 "text"             # Fill input field
agent-browser type @e2 "text"             # Type without clearing
agent-browser press Enter                  # Press key
agent-browser hover @e1                    # Hover element
agent-browser check @e1                    # Check checkbox
agent-browser select @e1 "value"          # Select dropdown option
```

#### 4. Information Retrieval
```bash
agent-browser get text @e1                # Get element text
agent-browser get html @e1                # Get HTML
agent-browser get value @e1               # Get input value
agent-browser get title                   # Get page title
agent-browser get url                     # Get current URL
agent-browser screenshot page.png         # Capture screenshot
```

#### 5. Waiting & Synchronization
```bash
agent-browser wait @e1                    # Wait for element
agent-browser wait 2000                   # Wait milliseconds
agent-browser wait --text "Success"       # Wait for text
agent-browser wait --url "**/dashboard"   # Wait for URL pattern
agent-browser wait --load networkidle     # Wait for network idle
```

### Best Practices for Agent Browser

1. **Always use `-i` flag with snapshot**: `agent-browser snapshot -i` for interactive elements only
2. **Use element references (@eN)**: Never rely on CSS selectors directly
3. **Wait for page changes**: After navigation or interactions, use appropriate wait commands
4. **Re-snapshot after changes**: Page state changes require new snapshots
5. **Use JSON output for parsing**: Add `--json` flag when programmatic parsing is needed
6. **Session management**: Use `--session <name>` for parallel browser instances
7. **Capture evidence**: Use screenshots to document test results

### Agent Browser Testing Pattern

```bash
# Standard testing workflow
agent-browser open http://localhost:3000
agent-browser snapshot -i                           # Get elements
agent-browser fill @e1 "test@example.com"          # Fill email
agent-browser fill @e2 "password123"               # Fill password
agent-browser click @e3                             # Click submit
agent-browser wait --text "Welcome"                 # Wait for success
agent-browser screenshot success.png                # Capture proof
```

### Advanced Features

```bash
# Debugging
agent-browser console                     # View console messages
agent-browser errors                      # View page errors
agent-browser highlight @e1               # Highlight element visually

# Recording
agent-browser record start ./test.webm    # Start video recording
agent-browser record stop                 # Stop recording

# Network & Authentication
agent-browser --proxy http://proxy:8080   # Use proxy
agent-browser --headers '{"Auth":"token"}'# Add headers
```

---

## Documentation & Debugging with DeepWiki MCP

### Rule #3: Use DeepWiki MCP for Framework Documentation & Tech Stack Research

**Primary Tool**: DeepWiki MCP Server
**Purpose**: Access GitHub repository documentation and search capabilities
**Server URL**: `https://mcp.deepwiki.com/mcp` (recommended) or `https://mcp.deepwiki.com/sse`

### When to Use DeepWiki MCP

Use DeepWiki MCP for:
- Understanding framework APIs and best practices
- Debugging issues related to specific libraries
- Researching technical implementation details
- Finding code examples from official documentation
- Understanding architecture patterns from GitHub repos
- Resolving dependency conflicts
- Learning about framework-specific features

### DeepWiki MCP Tools

#### 1. `read_wiki_structure`
**Purpose**: Get table of contents for a repository
**Use Case**: Understand documentation hierarchy before diving deep

```typescript
// Get documentation structure
{
  "tool": "read_wiki_structure",
  "repository": "facebook/react"
}

// Returns: List of documentation topics like "Hooks", "Components", "API Reference"
```

#### 2. `read_wiki_contents`
**Purpose**: Access full content of specific documentation topic
**Use Case**: Get detailed implementation guides

```typescript
// Read specific documentation
{
  "tool": "read_wiki_contents",
  "repository": "vercel/next.js",
  "topic": "routing"
}

// Returns: Complete documentation for Next.js routing
```

#### 3. `ask_question`
**Purpose**: Natural language queries about a repository
**Use Case**: Get AI-powered, context-aware answers

```typescript
// Ask repository-specific questions
{
  "tool": "ask_question",
  "repository": "microsoft/TypeScript",
  "question": "How do I configure strict null checks?"
}

// Returns: AI-generated answer based on repo documentation
```

### DeepWiki MCP Workflow

#### Standard Research Pattern

```
1. Identify the framework/library causing issues
2. Check if it's indexed on DeepWiki
3. Start with structure to understand available docs
4. Read specific sections or ask targeted questions
5. Apply findings to resolve the issue
```

#### Example: Debugging Framework Issue

```typescript
// Step 1: Get documentation structure
read_wiki_structure({ repository: "vuejs/vue" })

// Step 2: Ask specific question
ask_question({
  repository: "vuejs/vue",
  question: "Why is my computed property not updating when data changes?"
})

// Step 3: Read relevant documentation
read_wiki_contents({
  repository: "vuejs/vue",
  topic: "computed-properties"
})

// Step 4: Apply solution and test
```

### Framework Documentation Repositories

**Common Repositories to Query:**
- React: `facebook/react`
- Next.js: `vercel/next.js`
- Vue: `vuejs/vue`
- Angular: `angular/angular`
- TypeScript: `microsoft/TypeScript`
- TailwindCSS: `tailwindlabs/tailwindcss`
- Prisma: `prisma/prisma`
- Express: `expressjs/express`
- NestJS: `nestjs/nest`
- FastAPI: `tiangolo/fastapi`
- Django: `django/django`
- Rails: `rails/rails`

### DeepWiki Best Practices

1. **Start broad, then narrow**: Use structure before diving into specific topics
2. **Ask precise questions**: The more specific your question, the better the answer
3. **Include context**: Mention your specific use case in questions
4. **Verify repository availability**: Not all repos are indexed; check DeepWiki.com first
5. **Chain queries**: Use multiple tools to build comprehensive understanding
6. **Cache common queries**: Save frequently used documentation locally

### Integration with Debugging Workflow

```
Problem Identified
    ↓
Search for skill (Rule #1)
    ↓
If framework-related:
    → Query DeepWiki MCP for documentation
    → Read relevant sections
    → Get specific answers
    ↓
Apply solution
    ↓
If web-based:
    → Test with agent-browser (Rule #2)
    → Verify fix works
    → Screenshot evidence
```

---

## General Best Practices

### 4. Task Execution Priority

**Priority Order:**
1. ✅ **Discover skills first** - Check for relevant skills before starting
2. ✅ **Read skill instructions** - Follow skill guidelines precisely  
3. ✅ **Use DeepWiki MCP** - Query documentation for external frameworks
4. ✅ **Test with agent-browser** - Verify all web-based functionality
5. ✅ **Document results** - Capture screenshots, logs, and evidence

### 5. Tool Selection Matrix

| Task Type | Primary Tool | Skill to Check | Documentation Source |
|-----------|--------------|----------------|---------------------|
| Web Testing | agent-browser | agent-browser skill | N/A |
| Framework Debug | Code + DeepWiki | Framework-specific skills | DeepWiki MCP |
| API Integration | Code + DeepWiki | api-integration skills | DeepWiki MCP |
| UI/UX Verification | agent-browser | visual-testing skills | N/A |
| Performance Test | agent-browser + Code | performance skills | DeepWiki MCP |
| Database Query | Code + DeepWiki | database skills | DeepWiki MCP |

### 6. Error Handling Protocol

When encountering errors:
1. **Check skill existence**: Search for error-specific or domain-specific skills
2. **Query DeepWiki**: If framework/library error, query the specific repository
3. **Use agent-browser**: If frontend error, inspect with browser tools
4. **Document error state**: Capture screenshots, console logs, and error messages
5. **Iterate solution**: Test fixes with appropriate tools

### 7. Testing Verification Checklist

For every feature implementation:
- [ ] Skill discovery performed for task type
- [ ] DeepWiki queried for framework best practices (if applicable)
- [ ] Agent-browser tests written and executed (if web-based)
- [ ] All critical user flows tested
- [ ] Error states verified
- [ ] Screenshots captured for visual verification
- [ ] Console logs checked for errors
- [ ] Network requests verified (if applicable)

### 8. Context Management

**Minimize token usage:**
- Use agent-browser's `-i` flag for interactive elements only
- Load skills progressively (metadata → instructions → resources)
- Cache frequently accessed DeepWiki documentation
- Use snapshot compact mode when full details aren't needed

### 9. Skill Maintenance

**Keep skills updated:**
- Regularly check for skill updates in your environment
- Install new skills as they become available
- Remove obsolete or duplicate skills
- Share useful custom skills with your team

### 10. Documentation Standards

**Always document:**
- Which skills were used for the task
- DeepWiki repositories queried
- Agent-browser test scenarios executed
- Screenshots and evidence captured
- Any deviations from standard workflows

---

## Quick Reference Commands

### Skill Discovery
```bash
# Search for skills (syntax varies by agent)
/skills search "testing"
$skill-installer list
npx skills search "browser"
```

### Agent Browser Essentials
```bash
agent-browser open <url>
agent-browser snapshot -i
agent-browser click @eN
agent-browser screenshot <file>
agent-browser --help
```

### DeepWiki MCP
```typescript
// Structure
read_wiki_structure({ repository: "org/repo" })

// Content
read_wiki_contents({ repository: "org/repo", topic: "topic-name" })

// Question
ask_question({ repository: "org/repo", question: "your question" })
```

---

## Troubleshooting

### Issue: Skill not found
**Solution**: 
1. Check skill installation paths
2. Verify SKILL.md file exists with proper frontmatter
3. Restart your agent/editor
4. Search skill marketplaces for installation

### Issue: Agent-browser element not found
**Solution**:
1. Re-run `snapshot -i` after page changes
2. Wait for page load with `wait --load networkidle`
3. Use `--headed` flag to visually debug
4. Check console errors with `agent-browser console`

### Issue: DeepWiki MCP repository not indexed
**Solution**:
1. Verify repository exists on deepwiki.com
2. Check repository is public
3. Index it manually at deepwiki.com
4. Use alternative documentation sources

### Issue: Token budget exceeded
**Solution**:
1. Use compact modes (`snapshot -c`)
2. Load only necessary skill sections
3. Cache common DeepWiki queries
4. Split large tasks into smaller chunks

---

## Version & Compatibility

**Agent Browser**: Compatible with Claude Code, Codex, Cursor, GitHub Copilot, Windsurf
**DeepWiki MCP**: Compatible with all MCP-enabled AI agents
**Skills Format**: Agent Skills open standard (SKILL.md format)

**Last Updated**: January 2026
**Recommended Review Frequency**: Monthly

---

## Additional Resources

- Agent Skills Specification: https://agentskills.io/specification
- Agent Browser GitHub: https://github.com/vercel-labs/agent-browser
- DeepWiki Documentation: https://docs.devin.ai/work-with-devin/deepwiki-mcp
- Skills Marketplace: https://skillsmp.com

---

## Implementation Checklist

Copy this checklist for each new project:

```markdown
## Project Setup Checklist

### Initial Setup
- [ ] Skill directories configured (.github/skills/ or .claude/skills/)
- [ ] Agent-browser installed and accessible
- [ ] DeepWiki MCP server configured
- [ ] Core skills installed (testing, debugging, framework-specific)

### Per-Task Execution
- [ ] Searched for relevant skills before starting task
- [ ] Read and followed applicable skill instructions
- [ ] Queried DeepWiki MCP for framework documentation (if needed)
- [ ] Implemented solution following best practices
- [ ] Tested with agent-browser (if web-based)
- [ ] Captured evidence (screenshots, logs)
- [ ] Documented approach and results

### Quality Gates
- [ ] All critical paths tested with agent-browser
- [ ] Console errors addressed
- [ ] Visual verification completed (screenshots)
- [ ] DeepWiki best practices followed
- [ ] Code reviewed against framework guidelines
- [ ] Edge cases covered
```

---

**END OF RULES FILE**