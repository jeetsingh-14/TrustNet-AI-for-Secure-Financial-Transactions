# Utility Functions

This directory contains utility functions and configuration objects used throughout the TrustNet AI application.

## Chart Configuration Utilities

The `chartConfig.js` file provides standardized chart options and helper functions for creating consistent chart styles across the application.

### Available Exports

#### Chart Options

```jsx
import { 
  defaultChartOptions, 
  barChartOptions, 
  pieChartOptions, 
  lineChartOptions,
  getChartOptions
} from '../utils';

// Get default options for any chart
const options = defaultChartOptions;

// Get options specific to chart type
const barOptions = barChartOptions;
const pieOptions = pieChartOptions;
const lineOptions = lineChartOptions;

// Get options with helper function (recommended approach)
const options = getChartOptions('bar');
const optionsWithCustom = getChartOptions('bar', { 
  plugins: { 
    title: { 
      display: true, 
      text: 'Custom Title' 
    } 
  } 
});
```

#### Color Palettes

```jsx
import { colorPalettes } from '../utils';

// Access color palettes
const primaryColors = colorPalettes.primary;
const pastelColors = colorPalettes.pastel;
```

#### Dataset Creation

```jsx
import { createDataset } from '../utils';

// Create a bar chart dataset
const barDataset = createDataset('My Dataset', [1, 2, 3, 4, 5], 'bar', 0);

// Create a pie chart dataset
const pieDataset = createDataset('', [10, 20, 30, 40], 'pie');
```

### Complete Example

```jsx
import { Bar } from 'react-chartjs-2';
import { getChartOptions, createDataset } from '../utils';
import { ChartContainer } from '../components/common';

// Create chart data
const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
const data = [10, 20, 15, 30, 25];

const chartData = {
  labels,
  datasets: [createDataset('Monthly Sales', data, 'bar')]
};

// Render chart with standardized options
const MyChart = () => (
  <ChartContainer title="Monthly Sales">
    <Bar 
      data={chartData} 
      options={getChartOptions('bar')}
    />
  </ChartContainer>
);
```

## Usage Guidelines

1. Always use these utility functions instead of creating one-off chart configurations
2. Maintain consistent styling by using the provided options and color palettes
3. If you need to extend these utilities, consider adding the new functionality to the existing files rather than creating duplicates
4. For charts, always use the `getChartOptions` helper function to get the appropriate options for your chart type