/**
 * Extract time series data from FIT record messages
 */
export function extractTimeSeries(records: any[], field: string): number[] {
  // Helper function to unwrap FIT SDK values
  const unwrapValue = (obj: any) => {
    if (obj && typeof obj === 'object' && 'value' in obj) {
      return obj.value !== 'undefined' ? obj.value : undefined;
    }
    return obj;
  };

  const timeSeries: number[] = [];
  
  records.forEach(record => {
    const value = unwrapValue(record[field]);
    // Add value or 0 for missing data points to maintain time alignment
    timeSeries.push(value !== undefined && value !== null ? value : 0);
  });
  
  return timeSeries;
}

/**
 * Handle CP test activity processing
 */
export function handleImportCPTest(
  powerData: number[],
  protocol: string,
  targetDuration?: number
): {
  efforts: any[];
  cpResult: any | null;
} {
  // Import CP detection functions
  const { processCPTestActivity } = require('./cp-detection');
  
  return processCPTestActivity(powerData, protocol, targetDuration);
}

/**
 * Add time series extraction to fitParser
 */
export { extractTimeSeries as extractTimeSeriesFromFIT };