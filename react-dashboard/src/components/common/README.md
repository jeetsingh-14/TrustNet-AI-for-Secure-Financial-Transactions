# Common Components

This directory contains reusable UI components designed to maintain consistent styling and behavior across the TrustNet AI application.

## Available Components

### Button

A standardized button component with consistent styling and icon support.

```jsx
import { Button } from '../components/common';

// Basic usage
<Button>Click Me</Button>

// With variant
<Button variant="primary">Primary Button</Button>
<Button variant="secondary">Secondary Button</Button>
<Button variant="success">Success Button</Button>
<Button variant="danger">Danger Button</Button>
<Button variant="warning">Warning Button</Button>
<Button variant="outline-primary">Outline Button</Button>

// With icon
<Button icon={<FaSearch />}>Search</Button>

// With size
<Button size="sm">Small Button</Button>
<Button size="lg">Large Button</Button>
```

### Card

A standardized card component with consistent styling and header support.

```jsx
import { Card } from '../components/common';

// Basic usage
<Card>
  Card content goes here
</Card>

// With title
<Card title="Card Title">
  Card content goes here
</Card>

// With variant
<Card title="Primary Card" variant="primary">
  Card content goes here
</Card>
```

### Pagination

A standardized pagination component with consistent styling.

```jsx
import { Pagination } from '../components/common';

// Basic usage
<Pagination 
  currentPage={currentPage}
  totalPages={totalPages}
  onPageChange={handlePageChange}
/>
```

### ChartContainer

A standardized container for charts with consistent styling.

```jsx
import { ChartContainer } from '../components/common';
import { Bar } from 'react-chartjs-2';
import { getChartOptions, createDataset } from '../utils';

// Basic usage
<ChartContainer title="Chart Title">
  <Bar 
    data={chartData} 
    options={getChartOptions('bar')}
  />
</ChartContainer>

// With custom height
<ChartContainer title="Chart Title" height={400}>
  <Bar 
    data={chartData} 
    options={getChartOptions('bar')}
  />
</ChartContainer>
```

## Usage Guidelines

1. Always use these common components instead of directly using React Bootstrap components
2. Maintain consistent styling by using the provided variants
3. For charts, use the ChartContainer component and the chart utility functions from `../utils`
4. If you need to extend these components, consider adding the new functionality to the common component rather than creating a one-off solution