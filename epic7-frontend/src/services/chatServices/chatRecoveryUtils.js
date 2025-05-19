/**
 * Utility functions for recovering from chat-related errors
 */

// Track recovery attempts for Hibernate errors
let hibernateRecoveryAttempts = 0;
const maxRecoveryAttempts = 3;

/**
 * Attempt to recover from a Hibernate lazy loading error
 * @param {function} retryOperation - The operation to retry
 * @param {Object} params - Parameters for the operation
 * @returns {Promise} - Result of the retry operation
 */
export const recoverFromHibernateError = async (retryOperation, params = {}) => {
  // Increment recovery attempts
  hibernateRecoveryAttempts++;
  
  if (hibernateRecoveryAttempts > maxRecoveryAttempts) {
    // We've tried too many times, give up
    console.error(`Max recovery attempts (${maxRecoveryAttempts}) reached for Hibernate error`);
    throw new Error('Unable to recover from database error after multiple attempts');
  }
  
  console.log(`Attempting Hibernate error recovery (attempt ${hibernateRecoveryAttempts}/${maxRecoveryAttempts})`);
  
  // Wait for a delay calculated based on retry count
  const delay = getRecoveryDelay(hibernateRecoveryAttempts);
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // Try the operation again
  try {
    const result = await retryOperation(params);
    
    // If we get here, the operation succeeded
    console.log('Successfully recovered from Hibernate error');
    
    // Reset recovery attempts on success
    hibernateRecoveryAttempts = 0;
    
    return result;
  } catch (error) {
    // If it's still failing after maxRecoveryAttempts, throw with a clear message
    if (hibernateRecoveryAttempts >= maxRecoveryAttempts) {
      console.error('Recovery failed after maximum attempts', error);
      hibernateRecoveryAttempts = 0; // Reset for next time
      throw new Error('Database error: Please reload the application');
    }
    
    // Otherwise, propagate the error
    throw error;
  }
};

/**
 * Calculate delay time for recovery attempts using exponential backoff
 * @param {number} attempt - The current attempt number
 * @returns {number} - Delay in milliseconds
 */
export const getRecoveryDelay = (attempt) => {
  // Base delay of 1000ms with exponential backoff
  // 1st attempt: 1000ms, 2nd: 2000ms, 3rd: 4000ms, etc.
  const baseDelay = 1000;
  const calculatedDelay = baseDelay * Math.pow(2, attempt - 1);
  
  // Add a small random factor to avoid synchronized retries
  const jitter = Math.random() * 300;
  
  // Cap at 10 seconds maximum
  return Math.min(calculatedDelay + jitter, 10000);
};

/**
 * Reset recovery attempt counters
 */
export const resetRecoveryAttempts = () => {
  hibernateRecoveryAttempts = 0;
};
