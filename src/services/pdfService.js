// src/services/pdfService.js
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { serverTimestamp } from 'firebase/firestore';

/**
 * Enhanced PDF generator for form submissions
 * @param {Object} form - The form template
 * @param {Object} formData - The form submission data
 * @param {Array} signatures - Available signatures
 * @param {Object} companySettings - Company information from settings
 * @returns {Promise<Blob>} PDF as blob
 */
export const generatePdf = async (form, formData, signatures, companySettings = null) => {
  // Create a new PDF document (A4 size)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Set document properties
  doc.setProperties({
    title: `${form.title} - Rev ${form.revision || '1.0'}`,
    subject: 'Form Submission',
    creator: 'Form Manager',
  });

  // Document dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15; // Margin in mm
  const contentWidth = pageWidth - (margin * 2);
  
  // Font sizes
  const fontSizes = {
    title: 16,
    subtitle: 12,
    heading: 12,
    normal: 10,
    small: 8
  };

  // Setup colors
  const colors = {
    primary: [0, 100, 178], // #0064B2 in RGB
    lightGray: [240, 240, 240],
    mediumGray: [180, 180, 180],
    darkGray: [80, 80, 80],
    black: [0, 0, 0]
  };

  // Track current y-position
  let yPos = margin;
  let currentPage = 1;
  const totalPages = []; // Will be updated after we know how many pages

  // Add header with company information if available
  const addHeader = () => {
    if (companySettings) {
      // Company logo if available
      if (companySettings.logoBase64) {
        try {
          doc.addImage(
            companySettings.logoBase64,
            'PNG',
            margin,
            margin,
            40,
            15,
            '',
            'FAST'
          );
        } catch (e) {
          console.error('Error adding logo to PDF:', e);
        }
      }

      // Company name and details on the right side
      doc.setFontSize(fontSizes.subtitle);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      
      const companyName = companySettings.name || 'Company Name';
      doc.text(companyName, pageWidth - margin, margin + 5, { align: 'right' });
      
      doc.setFontSize(fontSizes.small);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.darkGray);
      
      let contactY = margin + 10;
      
      if (companySettings.address) {
        doc.text(companySettings.address, pageWidth - margin, contactY, { align: 'right' });
        contactY += 4;
      }
      
      let contactLine = '';
      if (companySettings.phone) contactLine += `Tel: ${companySettings.phone} `;
      if (companySettings.email) contactLine += `Email: ${companySettings.email}`;
      
      if (contactLine.trim()) {
        doc.text(contactLine, pageWidth - margin, contactY, { align: 'right' });
        contactY += 4;
      }
      
      if (companySettings.vatEori) {
        doc.text(`VAT/EORI: ${companySettings.vatEori}`, pageWidth - margin, contactY, { align: 'right' });
        contactY += 4;
      }
      
      if (companySettings.easaApprovalNo) {
        doc.text(`EASA Approval: ${companySettings.easaApprovalNo}`, pageWidth - margin, contactY, { align: 'right' });
      }
      
      yPos = Math.max(yPos, contactY + 8);
    }
  };

  // Add form title and information
  const addFormTitle = () => {
    // Add divider line after header
    doc.setDrawColor(...colors.mediumGray);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;
    
    // Form title
    doc.setFontSize(fontSizes.title);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.primary);
    doc.text(form.title, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    
    // Revision and date
    doc.setFontSize(fontSizes.normal);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.darkGray);
    
    const revisionText = `Revision: ${form.revision || '1.0'}`;
    doc.text(revisionText, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    
    const dateText = `Date: ${new Date().toLocaleDateString()}`;
    doc.text(dateText, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
    
    // Form description if available
    if (form.description) {
      doc.setFontSize(fontSizes.normal);
      doc.setTextColor(...colors.black);
      
      // Word wrap the description
      const splitDescription = doc.splitTextToSize(form.description, contentWidth);
      doc.text(splitDescription, margin, yPos);
      yPos += splitDescription.length * 5 + 5;
    }
    
    // Add divider line
    doc.setDrawColor(...colors.mediumGray);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;
  };

  // Add footer with page number and form info
  const addFooter = () => {
    // Set text appearance
    doc.setFontSize(fontSizes.small);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.darkGray);
    
    // Add form info at the bottom
    const formInfo = `${form.title} - Rev ${form.revision || '1.0'}`;
    doc.text(formInfo, margin, pageHeight - 10);
    
    // Add page number (will be updated after we know the total)
    const pageText = `Page ${currentPage} of ${totalPages.length}`;
    doc.text(pageText, pageWidth - margin, pageHeight - 10, { align: 'right' });
    
    // Add line above footer
    doc.setDrawColor(...colors.mediumGray);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    
    // Add legal text if available
    if (companySettings && companySettings.legalText) {
      const legalTextSize = 6;
      doc.setFontSize(legalTextSize);
      
      // Word wrap the legal text
      const splitLegalText = doc.splitTextToSize(companySettings.legalText, contentWidth);
      // Position it right above the footer line
      const legalY = pageHeight - 15 - (splitLegalText.length * 3) - 2;
      
      doc.text(splitLegalText, margin, legalY);
    }
  };

  // Function to check if we need a new page
  const checkForNewPage = (requiredSpace = 20) => {
    // Calculate space left on current page (accounting for footer)
    const spaceLeft = pageHeight - yPos - 20;
    
    if (spaceLeft < requiredSpace) {
      // Add footer to current page
      addFooter();
      
      // Add new page
      doc.addPage();
      currentPage++;
      totalPages.push(currentPage);
      
      // Reset y-position and add header
      yPos = margin;
      addHeader();
      yPos += 5;
      
      return true;
    }
    
    return false;
  };

  // Function to render a field
  const renderField = (block, value) => {
    // Skip page if needed
    checkForNewPage(15);
    
    // Field title/label
    doc.setFontSize(fontSizes.normal);
    doc.setFont('helvetica', 'bold');
    doc.text(`${block.title}:`, margin, yPos);
    
    doc.setFont('helvetica', 'normal');
    let displayValue = '';
    
    // Format the value based on field type
    switch (block.fieldType) {
      case 'checkbox':
        displayValue = value ? 'Yes' : 'No';
        break;
      
      case 'multi_choice':
        if (typeof value === 'object' && value !== null) {
          const selectedOptions = Object.entries(value)
            .filter(([_, selected]) => selected)
            .map(([option, _]) => option);
          
          displayValue = selectedOptions.join(', ');
        } else {
          displayValue = 'None selected';
        }
        break;
      
      case 'radio':
      case 'dropdown':
        displayValue = value || 'Not selected';
        break;
      
      case 'date':
        // Format date nicely if it's a valid date
        if (value) {
          try {
            const dateObj = new Date(value);
            if (!isNaN(dateObj)) {
              displayValue = dateObj.toLocaleDateString();
            } else {
              displayValue = value;
            }
          } catch (e) {
            displayValue = value;
          }
        } else {
          displayValue = 'Not specified';
        }
        break;
      
      default:
        displayValue = value ? String(value) : '';
        break;
    }
    
    // Handle long text with word wrapping
    if (displayValue.length > 40 || block.fieldType === 'long_text') {
      const x = margin + 40; // Indented from label
      const maxWidth = contentWidth - 40;
      
      const textLines = doc.splitTextToSize(displayValue, maxWidth);
      doc.text(textLines, x, yPos);
      yPos += textLines.length * 5 + 2;
    } else {
      doc.text(displayValue, margin + 40, yPos);
      yPos += 6;
    }
  };

  // Function to render a signature block
  const renderSignature = (block, signatureId) => {
    // Skip page if needed
    checkForNewPage(30);
    
    // Signature title
    doc.setFontSize(fontSizes.normal);
    doc.setFont('helvetica', 'bold');
    doc.text(block.title, margin, yPos);
    yPos += 6;
    
    const selectedSignature = signatures.find(sig => sig.id === signatureId);
    
    if (selectedSignature) {
      doc.setFont('helvetica', 'normal');
      doc.text(`Signatory: ${selectedSignature.name} - ${selectedSignature.title}`, margin, yPos);
      yPos += 6;
      
      // Add signature image if available
      if (selectedSignature.signatureBase64) {
        try {
          // Calculate signature image dimensions (max width and proportional height)
          const maxWidth = 60;
          const signatureImg = new Image();
          signatureImg.src = selectedSignature.signatureBase64;
          
          // Set a reasonable default ratio if we can't compute it
          let ratio = 0.4;
          
          // Try to compute the actual ratio if the image loads
          if (signatureImg.width && signatureImg.height) {
            ratio = signatureImg.height / signatureImg.width;
          }
          
          const imgWidth = maxWidth;
          const imgHeight = imgWidth * ratio;
          
          doc.addImage(
            selectedSignature.signatureBase64,
            'PNG',
            margin,
            yPos,
            imgWidth,
            imgHeight,
            undefined,
            'FAST'
          );
          
          yPos += imgHeight + 5;
        } catch (e) {
          console.error('Error adding signature image:', e);
          doc.text('[Signature Image]', margin, yPos);
          yPos += 6;
        }
      } else {
        doc.text('[Signature]', margin, yPos);
        yPos += 6;
      }
      
      // Add date
      doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, yPos);
      yPos += 10;
    } else {
      doc.setFont('helvetica', 'italic');
      doc.text('Not signed', margin, yPos);
      yPos += 10;
    }
  };

  // Function to render a group/section with all its child blocks
  const renderGroup = (group, data, sectionPrefix = '') => {
  // Skip page if needed
  checkForNewPage(20);
  
  // Calculate required space for title and description
  let requiredSpace = 15;
  if (group.description) {
    const descLines = doc.splitTextToSize(group.description, contentWidth);
    requiredSpace += descLines.length * 5;
  }
  
  // Determine the level based on the section prefix depth
  const level = sectionPrefix.split('.').filter(s => s).length;
  
  // Section header
  const sectionNumber = sectionPrefix ? `${sectionPrefix}` : '';
  const sectionTitle = sectionNumber ? `${sectionNumber} ${group.title}` : group.title;
  
  // Style based on section level
  let bgColor, fontSize, fontStyle;
  
  if (level === 0) {
    // Level 1 (top level) - Blue background, white text
    bgColor = [...colors.primary]; // Main theme color
    fontSize = fontSizes.heading;
    fontStyle = 'bold';
    doc.setTextColor(255, 255, 255); // White text
  } else if (level === 1) {
    // Level 2 (subsection) - Light gray background, main color text
    bgColor = [...colors.lightGray];
    fontSize = fontSizes.heading;
    fontStyle = 'bold';
    doc.setTextColor(...colors.primary);
  } else {
    // Level 3 (sub-subsection) - Very light background, dark text
    bgColor = [245, 245, 250]; // Very light blue/gray
    fontSize = fontSizes.normal;
    fontStyle = 'bold';
    doc.setTextColor(...colors.black);
  }
  
  // Create appropriate background for the section title
  const headerHeight = level < 2 ? 10 : 8;
  doc.setFillColor(...bgColor);
  doc.rect(margin, yPos - 5, contentWidth, headerHeight, 'F');
  
  // Add section title
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', fontStyle);
  doc.text(sectionTitle, margin + 2, yPos);
  yPos += 8;
  
  // Reset text color for description
  doc.setTextColor(...colors.black);
  
  // Add section description if available
  if (group.description) {
    doc.setFontSize(fontSizes.normal);
    doc.setFont('helvetica', 'normal');
    
    const splitDescription = doc.splitTextToSize(group.description, contentWidth);
    doc.text(splitDescription, margin, yPos);
    yPos += splitDescription.length * 5 + 3;
  }
  
  // Process child blocks
  if (group.children && group.children.length > 0) {
    // Track if this is the first field in a subsection for proper spacing
    let isFirstField = true;
    
    group.children.forEach((block, index) => {
      const blockNumber = `${sectionPrefix ? sectionPrefix : ''}${index + 1}`;
      
      if (block.type === 'group') {
        // Render sub-group with proper numbering
        renderGroup(block, data, blockNumber + '.');
        isFirstField = true; // Reset after a subgroup
      } else if (block.type === 'field') {
        // Add extra spacing before the first field
        if (isFirstField && level > 0) {
          yPos += 2;
          isFirstField = false;
        }
        
        // Render field
        renderField(block, data[block.title]);
      } else if (block.type === 'signature') {
        // Add extra spacing before the first signature
        if (isFirstField && level > 0) {
          yPos += 2;
          isFirstField = false;
        }
        
        // Render signature block
        renderSignature(block, data[block.title]);
      }
    });
  }
  
    // Add some spacing after the group
    yPos += 5;
  };

  // Start PDF generation
  // Initialize tracking variables
  totalPages.push(currentPage);
  
  // Add header with company info
  addHeader();
  
  // Add form title and information
  addFormTitle();
  
  // Process form blocks
  if (form.blocks && form.blocks.length > 0) {
    form.blocks.forEach((block, index) => {
      if (block.type === 'group') {
        // Render the group and its children
        renderGroup(block, formData, `${index + 1}`);
      } else if (block.type === 'field') {
        renderField(block, formData[block.title]);
      } else if (block.type === 'signature') {
        renderSignature(block, formData[block.title]);
      }
    });
  }
  
  // Add footer to last page
  addFooter();
  
  // Update page numbers on all pages
  for (let i = 1; i <= totalPages.length; i++) {
    doc.setPage(i);
    
    // Update page text
    doc.setFontSize(fontSizes.small);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.darkGray);
    
    const pageText = `Page ${i} of ${totalPages.length}`;
    doc.text(pageText, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }
  
  // Return the PDF as a blob
  return doc.output('blob');
};

/**
 * Generate a test PDF with sample data
 * @returns {Promise<Blob>} PDF as blob
 */
export const generateTestPdf = async (companySettings = null) => {
  // Create a test form with 6 sections
  const testForm = {
    title: 'Test Form',
    description: 'This is a test form generated automatically to test PDF output and layout.',
    revision: '1.0',
    blocks: [
      // Section 1 - Basic Information
      {
        type: 'group',
        title: 'Basic Information',
        description: 'This section contains basic identification information.',
        children: [
          {
            type: 'field',
            title: 'Aircraft Registration',
            fieldType: 'short_text',
            required: true
          },
          {
            type: 'field',
            title: 'Aircraft Type',
            fieldType: 'short_text',
            required: true
          },
          {
            type: 'field',
            title: 'Serial Number',
            fieldType: 'short_text',
            required: true
          },
          {
            type: 'field',
            title: 'Date of Inspection',
            fieldType: 'date',
            required: true
          }
        ]
      },
      
      // Section 2 - Technical Details
      {
        type: 'group',
        title: 'Technical Details',
        description: 'Information about technical specifications and conditions.',
        children: [
          {
            type: 'field',
            title: 'Engine Type',
            fieldType: 'short_text',
            required: true
          },
          {
            type: 'field',
            title: 'Engine Hours',
            fieldType: 'number',
            required: true
          },
          {
            type: 'field',
            title: 'Last Overhaul Date',
            fieldType: 'date',
            required: false
          },
          {
            type: 'field',
            title: 'Hours Since Overhaul',
            fieldType: 'number',
            required: false
          },
          {
            type: 'field',
            title: 'Condition Notes',
            fieldType: 'long_text',
            required: false
          }
        ]
      },
      
      // Section 3 - Inspection Checklist
      {
        type: 'group',
        title: 'Inspection Checklist',
        description: 'Items to be inspected during the maintenance check.',
        children: [
          {
            type: 'field',
            title: 'Airframe Exterior',
            fieldType: 'checkbox',
            required: true
          },
          {
            type: 'field',
            title: 'Flight Controls',
            fieldType: 'checkbox',
            required: true
          },
          {
            type: 'field',
            title: 'Landing Gear',
            fieldType: 'checkbox',
            required: true
          },
          {
            type: 'field',
            title: 'Avionics',
            fieldType: 'checkbox',
            required: true
          },
          {
            type: 'field',
            title: 'Notes',
            fieldType: 'long_text',
            required: false
          }
        ]
      },
      
      // Section 4 - Systems Status
      {
        type: 'group',
        title: 'Systems Status',
        description: 'Operational status of aircraft systems.',
        children: [
          {
            type: 'field',
            title: 'Electrical System',
            fieldType: 'radio',
            options: ['Operational', 'Requires Attention', 'Not Operational'],
            required: true
          },
          {
            type: 'field',
            title: 'Hydraulic System',
            fieldType: 'radio',
            options: ['Operational', 'Requires Attention', 'Not Operational'],
            required: true
          },
          {
            type: 'field',
            title: 'Fuel System',
            fieldType: 'radio',
            options: ['Operational', 'Requires Attention', 'Not Operational'],
            required: true
          },
          {
            type: 'field',
            title: 'Additional Comments',
            fieldType: 'long_text',
            required: false
          }
        ]
      },
      
      // Section 5 - Maintenance Actions
      {
        type: 'group',
        title: 'Maintenance Actions',
        description: 'Actions performed during this maintenance check.',
        children: [
          {
            type: 'field',
            title: 'Actions Performed',
            fieldType: 'multi_choice',
            options: ['Oil Change', 'Filter Replacement', 'Parts Replacement', 'Software Update', 'Calibration'],
            required: true
          },
          {
            type: 'field',
            title: 'Parts Replaced',
            fieldType: 'long_text',
            required: false
          },
          {
            type: 'field',
            title: 'Next Maintenance Due',
            fieldType: 'date',
            required: true
          }
        ]
      },
      
      // Section 6 - Certification
      {
        type: 'group',
        title: 'Certification',
        description: 'Certification of the maintenance performed.',
        children: [
          {
            type: 'field',
            title: 'Inspector Notes',
            fieldType: 'long_text',
            required: false
          },
          {
            type: 'signature',
            title: 'Inspector Signature',
            required: true
          }
        ]
      }
    ]
  };
  
  // Create test data
  const testData = {
    'Aircraft Registration': 'OY-CAT',
    'Aircraft Type': 'Cessna 172',
    'Serial Number': 'C172-12345',
    'Date of Inspection': '2025-04-01',
    
    'Engine Type': 'Lycoming IO-360',
    'Engine Hours': '1250',
    'Last Overhaul Date': '2024-01-15',
    'Hours Since Overhaul': '350',
    'Condition Notes': 'Engine in good condition. Minor oil seepage noted at cylinder base, within acceptable limits. Recommend monitoring at next inspection.',
    
    'Airframe Exterior': true,
    'Flight Controls': true,
    'Landing Gear': true,
    'Avionics': true,
    'Notes': 'All inspected items in satisfactory condition. Minor corrosion noted on right wing strut attachment - cleaned and treated.',
    
    'Electrical System': 'Operational',
    'Hydraulic System': 'Requires Attention',
    'Fuel System': 'Operational',
    'Additional Comments': 'Hydraulic system pressure slightly below optimal. Topped up fluid and system now functions within parameters, but should be monitored for potential leaks.',
    
    'Actions Performed': {
      'Oil Change': true,
      'Filter Replacement': true,
      'Parts Replacement': false,
      'Software Update': true,
      'Calibration': false
    },
    'Parts Replaced': 'Oil filter (P/N 6812-1), Air filter (P/N AF-2156)',
    'Next Maintenance Due': '2025-10-01',
    
    'Inspector Notes': 'Aircraft is airworthy and released to service. All maintenance performed in accordance with applicable regulations.',
    'Inspector Signature': 'signature1' // This would be replaced with an actual signature ID
  };
  
  // Create test signatures
  const testSignatures = [
    {
      id: 'signature1',
      name: 'John Doe',
      title: 'Aircraft Inspector',
      signatureBase64: 'data:image/png;base64,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'
    }
  ];
  
  // Generate the PDF using the same function as for regular forms
  return generatePdf(testForm, testData, testSignatures, companySettings);
};