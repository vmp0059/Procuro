const generatePONumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  return `PO-${timestamp}`;
};

const generateInvoiceNumber = () => {
  const timestamp = Date.now().toString().slice(-8);
  return `INV-${timestamp}`;
};

module.exports = { generatePONumber, generateInvoiceNumber };
