# Project Structure

Overview of the codebase organization.

```text
/src
  /app           # Next.js App Router pages and layouts
  /components    # Reusable React components
  /lib           # Utility functions and shared logic
  /hooks         # Custom React hooks
  /styles        # Global styles and CSS modules
/public          # Static assets (images, fonts)
/docs            # Documentation (You are here)
```

## Key Directories

### `src/app`
Contains the route definitions. Each folder represents a route segment.
*   `page.tsx`: The UI for the route.
*   `layout.tsx`: Shared UI for the route and its children.

### `src/components`
UI building blocks.
*   `Navbar.tsx`: Top navigation bar.
*   `GameTerminal.tsx`: The terminal interface component.
