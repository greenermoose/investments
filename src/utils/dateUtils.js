// utils/dateUtils.js
/**
 * Parses a filename with embedded date (format: nameYYYYMMDDHHMMSS.csv)
 * @param {string} filename - The filename to parse
 * @returns {Date|null} The extracted date or null if not found
 */
export const parseDateFromFilename = (filename) => {
  const dateMatch = filename.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (dateMatch) {
    const [_, year, month, day, hours, minutes, seconds] = dateMatch;
    return new Date(year, month-1, day, hours, minutes, seconds);
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
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Extracts date from account info text
 * @param {string} accountInfo - The account info text
 * @returns {Date|null} The extracted date or null
 */
export const extractDateFromAccountInfo = (accountInfo) => {
  const dateMatch = accountInfo.match(/as of (\d+:\d+ [AP]M) ET, (\d{4})\/(\d{2})\/(\d{2})/);
  if (dateMatch) {
    const [_, timeStr, year, month, day] = dateMatch;
    // Parse time (convert from 12-hour to 24-hour format)
    const [hourMin, ampm] = timeStr.split(' ');
    let [hours, minutes] = hourMin.split(':').map(Number);
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    
    return new Date(year, month - 1, day, hours, minutes);
  }
  return null;
};
