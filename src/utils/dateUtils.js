// utils/dateUtils.js
/**
 * Parses a filename with embedded date (format: nameYYYYMMDDHHMMSS.csv)
 * @param {string} filename - The filename to parse
 * @returns {Date|null} The extracted date or null if not found
 */
export const parseDateFromFilename = (filename) => {
  if (!filename) return null;
  
  const dateMatch = filename.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (dateMatch) {
    const [_, year, month, day, hours, minutes, seconds] = dateMatch;
    const date = new Date(year, month-1, day, hours, minutes, seconds);
    
    // Validate the date
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date parsed from filename: ${filename}`);
      return null;
    }
    
    return date;
  }
  return null;
};

/**
 * Formats a date for display
 * @param {Date} date - The date to format
 * @returns {string} The formatted date string
 */
export const formatDate = (date) => {
  if (!date) return '';
  
  try {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return date.toString();
  }
};

/**
 * Extracts date from account info text
 * @param {string} accountInfo - The account info text
 * @returns {Date|null} The extracted date or null
 */
export const extractDateFromAccountInfo = (accountInfo) => {
  if (!accountInfo) return null;
  
  const dateMatch = accountInfo.match(/as of (\d+:\d+ [AP]M) ET, (\d{4})\/(\d{2})\/(\d{2})/);
  if (dateMatch) {
    const [_, timeStr, year, month, day] = dateMatch;
    // Parse time (convert from 12-hour to 24-hour format)
    const [hourMin, ampm] = timeStr.split(' ');
    let [hours, minutes] = hourMin.split(':').map(Number);
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    
    const date = new Date(year, month - 1, day, hours, minutes);
    
    // Validate the date
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date parsed from account info: ${accountInfo}`);
      return null;
    }
    
    return date;
  }
  return null;
};

/**
 * Gets current date as fallback
 * @returns {Date} Current date
 */
export const getCurrentDate = () => {
  return new Date();
};

/**
 * Creates a safe date object from various inputs
 * @param {string|Date|null} input - The input to convert to date
 * @returns {Date} A valid date object
 */
export const createSafeDate = (input) => {
  if (input instanceof Date && !isNaN(input.getTime())) {
    return input;
  }
  
  if (typeof input === 'string') {
    const date = new Date(input);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  console.warn('Could not parse date, using current date as fallback');
  return new Date();
};