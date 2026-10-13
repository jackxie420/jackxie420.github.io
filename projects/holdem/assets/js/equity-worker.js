import { calculateEquity } from './poker.js?v=b9fee785a9b1';
self.onmessage = ({ data }) => {
  try {
    const result = calculateEquity(data, fraction => self.postMessage({ type: 'progress', fraction }));
    self.postMessage({ type: 'result', result });
  } catch (error) { self.postMessage({ type: 'error', message: error.message }); }
};
