/**
 * Chart configuration utilities for TrustNet AI
 * Provides standardized chart options and themes
 */

// Default chart options for all chart types
export const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        font: {
          family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          size: 12
        },
        padding: 20,
        usePointStyle: true,
        boxWidth: 6
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      titleFont: {
        family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        size: 14,
        weight: 'bold'
      },
      bodyFont: {
        family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        size: 13
      },
      padding: 12,
      cornerRadius: 4,
      displayColors: true
    }
  }
};

// Bar chart specific options
export const barChartOptions = {
  ...defaultChartOptions,
  scales: {
    x: {
      grid: {
        display: false
      },
      ticks: {
        font: {
          family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          size: 11
        }
      }
    },
    y: {
      beginAtZero: true,
      ticks: {
        font: {
          family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          size: 11
        }
      }
    }
  }
};

// Pie chart specific options
export const pieChartOptions = {
  ...defaultChartOptions,
  cutout: '0%',
  radius: '90%'
};

// Line chart specific options
export const lineChartOptions = {
  ...defaultChartOptions,
  scales: {
    x: {
      grid: {
        display: false
      },
      ticks: {
        font: {
          family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          size: 11
        }
      }
    },
    y: {
      beginAtZero: true,
      ticks: {
        font: {
          family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          size: 11
        }
      }
    }
  }
};

// Standard color palettes
export const colorPalettes = {
  primary: [
    'rgba(44, 62, 80, 0.8)',
    'rgba(52, 152, 219, 0.8)',
    'rgba(46, 204, 113, 0.8)',
    'rgba(231, 76, 60, 0.8)',
    'rgba(243, 156, 18, 0.8)',
    'rgba(155, 89, 182, 0.8)',
    'rgba(26, 188, 156, 0.8)',
    'rgba(211, 84, 0, 0.8)'
  ],
  pastel: [
    'rgba(44, 62, 80, 0.6)',
    'rgba(52, 152, 219, 0.6)',
    'rgba(46, 204, 113, 0.6)',
    'rgba(231, 76, 60, 0.6)',
    'rgba(243, 156, 18, 0.6)',
    'rgba(155, 89, 182, 0.6)',
    'rgba(26, 188, 156, 0.6)',
    'rgba(211, 84, 0, 0.6)'
  ]
};

// Helper function to get chart options by type
export const getChartOptions = (type, customOptions = {}) => {
  switch (type) {
    case 'bar':
      return { ...barChartOptions, ...customOptions };
    case 'pie':
    case 'doughnut':
      return { ...pieChartOptions, ...customOptions };
    case 'line':
      return { ...lineChartOptions, ...customOptions };
    default:
      return { ...defaultChartOptions, ...customOptions };
  }
};

// Helper function to create dataset with standard colors
export const createDataset = (label, data, type = 'bar', colorIndex = 0) => {
  const colors = colorPalettes.primary;
  
  if (type === 'pie' || type === 'doughnut') {
    return {
      data,
      backgroundColor: colors,
      borderColor: colors.map(color => color.replace(', 0.8)', ', 1)')),
      borderWidth: 1
    };
  }
  
  return {
    label,
    data,
    backgroundColor: colors[colorIndex % colors.length],
    borderColor: colors[colorIndex % colors.length].replace(', 0.8)', ', 1)'),
    borderWidth: 1
  };
};