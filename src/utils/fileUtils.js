// utils/fileUtils.js
/**
 * Generates CSV data for export
 * @param {Array} data - The data to export
 * @param {Array} headers - Column headers
 * @param {string} filename - Output filename
 */
export const generateAndDownloadCSV = (data, headers, filename) => {
  const csvData = data.map(position => 
    headers.map(header => position[header])
  );
  
  const csv = [
    headers.join(','),
    ...csvData.map(row => row.map(cell => 
      typeof cell === 'string' && cell.includes(',') 
        ? `"${cell}"`
        : cell
    ).join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
