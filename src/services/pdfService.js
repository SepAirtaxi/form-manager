// src/services/pdfService.js
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Generate a PDF from form data
 * @param {Object} form - The form template
 * @param {Object} formData - The form submission data
 * @param {Array} signatures - Available signatures
 * @returns {Blob} PDF as blob
 */
export const generatePdf = async (form, formData, signatures) => {
  // Create a new PDF document
  const doc = new jsPDF();
  
  // Set document properties
  doc.setProperties({
    title: `${form.title} - Rev ${form.revision || '1.0'}`,
    subject: 'Form Submission',
    creator: 'Copenhagen AirTaxi Form Manager',
  });
  
  // Add company header
  // This would normally come from company settings
  const companyName = 'Copenhagen AirTaxi / CAT Flyservice';
  const companyAddress = '123 Aviation Blvd, Copenhagen';
  
  // Add header
  doc.setFontSize(16);
  doc.text(companyName, 105, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text(companyAddress, 105, 20, { align: 'center' });
  doc.setFontSize(14);
  doc.text(form.title, 105, 30, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Revision: ${form.revision || '1.0'}`, 105, 35, { align: 'center' });
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 105, 40, { align: 'center' });
  
  // Add horizontal line
  doc.setLineWidth(0.5);
  doc.line(20, 45, 190, 45);
  
  // Current Y position for content
  let yPos = 55;
  
  // Add form description if available
  if (form.description) {
    doc.setFontSize(11);
    doc.text(form.description, 20, yPos);
    yPos += 10;
  }
  
  // Add form fields
  doc.setFontSize(12);
  
  form.blocks.forEach((block) => {
    // Check if we need a new page
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    
    if (block.type === 'group') {
      // Group block (section header)
      doc.setFont(undefined, 'bold');
      doc.text(block.title, 20, yPos);
      yPos += 6;
      
      if (block.description) {
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(block.description, 20, yPos);
        yPos += 6;
        doc.setFontSize(12);
      }
      
      // Add a line under the group
      doc.setLineWidth(0.3);
      doc.line(20, yPos - 2, 190, yPos - 2);
      
    } else if (block.type === 'field') {
      // Regular field
      doc.setFont(undefined, 'bold');
      doc.text(`${block.title}:`, 20, yPos);
      doc.setFont(undefined, 'normal');
      
      // Format the value based on field type
      let value = formData[block.title] || '';
      
      if (block.fieldType === 'checkbox') {
        value = value ? 'Yes' : 'No';
      }
      
      // Handle long text with word wrapping
      if (value.length > 80 || block.fieldType === 'long_text') {
        const textLines = doc.splitTextToSize(value, 150);
        doc.text(textLines, 40, yPos);
        yPos += 6 * textLines.length;
      } else {
        doc.text(String(value), 40, yPos);
        yPos += 6;
      }
      
    } else if (block.type === 'signature') {
      // Signature block
      doc.setFont(undefined, 'bold');
      doc.text(block.title, 20, yPos);
      yPos += 6;
      
      const signatureId = formData[block.title];
      const selectedSignature = signatures.find(sig => sig.id === signatureId);
      
      if (selectedSignature) {
        doc.setFont(undefined, 'normal');
        doc.text(`Signatory: ${selectedSignature.name} - ${selectedSignature.title}`, 20, yPos);
        yPos += 6;
        
        // Add signature image if available
        // In a real implementation, you'd load the image from the URL
        // For this example, we'll just add a placeholder text
        doc.text('[Signature Image]', 20, yPos);
        yPos += 6;
        
        // Add date
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPos);
        yPos += 10;
      }
    }
    
    // Add some spacing between blocks
    yPos += 4;
  });
  
  // Add footer
  const pageCount = doc.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(
      `Page ${i} of ${pageCount}`,
      105,
      285,
      { align: 'center' }
    );
  }
  
  // Return the PDF as a blob
  return doc.output('blob');
};