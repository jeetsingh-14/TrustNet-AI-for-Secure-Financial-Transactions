# TrustNet AI Dashboard

This is the frontend application for the TrustNet AI Secure Financial Transactions system. It provides a user interface for monitoring and analyzing financial transactions, detecting fraud, and managing alerts.

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── common/          # Standardized UI components with consistent styling
│   └── ...              # Other component categories
├── pages/               # Page components that correspond to routes
├── services/            # API services and data fetching logic
├── utils/               # Utility functions and helpers
├── App.js               # Main application component with routing
└── index.js             # Application entry point
```

## Coding Standards

### Component Organization

1. **Common Components**: Use standardized components from `components/common` for consistent UI
2. **Page Components**: Keep page components focused on layout and data fetching
3. **Component Size**: Break down large components into smaller, focused components
4. **Props**: Use prop types for all components

### Styling

1. **CSS Organization**: Each component should have its own CSS file
2. **Variables**: Use CSS variables defined in App.css for colors, spacing, etc.
3. **Responsive Design**: All components should be responsive and work on mobile devices
4. **Consistency**: Use the standardized components to maintain consistent styling

### State Management

1. **Component State**: Use React hooks (useState, useEffect) for component state
2. **API Calls**: Use the services directory for API calls
3. **Error Handling**: Implement proper error handling for all API calls

## Common Components

The application includes several standardized components to ensure consistent styling and behavior:

- **Button**: Standardized button component with consistent styling and icon support
- **Card**: Standardized card component with consistent styling and header support
- **Pagination**: Standardized pagination component with consistent styling
- **ChartContainer**: Standardized container for charts with consistent styling

See the [components/common/README.md](./components/common/README.md) for detailed usage instructions.

## Utility Functions

The application includes utility functions for common tasks:

- **Chart Configuration**: Standardized chart options and helper functions

See the [utils/README.md](./utils/README.md) for detailed usage instructions.

## Best Practices

1. **Component Separation**: Break down large components into smaller, focused components
2. **Code Reuse**: Use common components and utility functions instead of duplicating code
3. **Consistent Styling**: Use the standardized components and CSS variables for consistent styling
4. **Documentation**: Document complex logic and component usage
5. **Error Handling**: Implement proper error handling for all API calls
6. **Responsive Design**: Ensure all components work on mobile devices
7. **Performance**: Optimize rendering and avoid unnecessary re-renders