// Documents Page JavaScript
let allDocuments = [];
let currentFilter = 'all';
let currentDocument = null;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  loadDocuments();
  loadStatements();
  loadTaxDocuments();
  
  // Search handler
  document.getElementById('searchDocuments').addEventListener('input', applyFilters);
});

// Load documents
async function loadDocuments() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/documents', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      allDocuments = await response.json();
      displayDocuments(allDocuments);
    } else {
      displayDemoDocuments();
    }
  } catch (error) {
    console.error('Error loading documents:', error);
    displayDemoDocuments();
  }
}

// Display documents
function displayDocuments(documents) {
  if (!documents || documents.length === 0) {
    displayDemoDocuments();
    return;
  }
  
  const container = document.getElementById('documentsList');
  container.innerHTML = documents.slice(0, 10).map(doc => createDocumentRow(doc)).join('');
}

// Display demo documents
function displayDemoDocuments() {
  allDocuments = [
    { id: 1, name: 'Monthly Statement - January 2026', type: 'statement', date: '2026-01-31', size: '245 KB' },
    { id: 2, name: 'Trade Confirmation - AAPL Buy', type: 'trade', date: '2026-01-28', size: '56 KB' },
    { id: 3, name: 'Wire Transfer Confirmation', type: 'trade', date: '2026-01-25', size: '78 KB' },
    { id: 4, name: 'Account Agreement', type: 'legal', date: '2025-12-15', size: '1.2 MB' },
    { id: 5, name: 'Form 1099-INT 2025', type: 'tax', date: '2026-01-15', size: '134 KB' },
    { id: 6, name: 'Monthly Statement - December 2025', type: 'statement', date: '2025-12-31', size: '238 KB' }
  ];
  
  const container = document.getElementById('documentsList');
  container.innerHTML = allDocuments.map(doc => createDocumentRow(doc)).join('');
}

// Create document row
function createDocumentRow(doc) {
  const icon = getDocumentIcon(doc.type);
  return `
    <div class="p-3 bg-gray-700 rounded-lg flex items-center justify-between hover:bg-gray-600 transition cursor-pointer" onclick="previewDocument(${doc.id})">
      <div class="flex items-center space-x-3">
        <i class="${icon} text-2xl"></i>
        <div>
          <span class="font-semibold">${doc.name}</span>
          <div class="text-sm text-gray-400">
            <span>${new Date(doc.date).toLocaleDateString()}</span>
            <span class="mx-2">•</span>
            <span>${doc.size}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center space-x-2">
        <button onclick="event.stopPropagation(); downloadDocument(${doc.id})" class="p-2 hover:bg-gray-500 rounded" title="Download">
          <i class="fas fa-download text-gray-400"></i>
        </button>
        <button onclick="event.stopPropagation(); deleteDocument(${doc.id})" class="p-2 hover:bg-gray-500 rounded" title="Delete">
          <i class="fas fa-trash text-gray-400"></i>
        </button>
      </div>
    </div>
  `;
}

// Get document icon
function getDocumentIcon(type) {
  switch (type) {
    case 'statement': return 'fas fa-file-alt text-blue-400';
    case 'tax': return 'fas fa-file-invoice-dollar text-green-400';
    case 'trade': return 'fas fa-chart-line text-yellow-400';
    case 'legal': return 'fas fa-gavel text-purple-400';
    default: return 'fas fa-file text-gray-400';
  }
}

// Load statements
function loadStatements() {
  const months = [];
  const now = new Date();
  
  for (let i = 0; i < 6; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      id: `stmt-${i}`,
      month: date.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      date: date.toISOString().split('T')[0]
    });
  }
  
  const container = document.getElementById('statementsList');
  container.innerHTML = months.map(m => `
    <div class="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition cursor-pointer" onclick="downloadStatement('${m.month}')">
      <div class="flex items-center space-x-3">
        <i class="fas fa-file-pdf text-red-400 text-2xl"></i>
        <div>
          <span class="font-semibold">${m.month}</span>
          <span class="text-gray-400 text-sm block">Monthly Statement</span>
        </div>
      </div>
    </div>
  `).join('');
}

// Load tax documents
function loadTaxDocuments() {
  const taxDocs = [
    { id: 'tax-1', name: 'Form 1099-INT', year: 2025, description: 'Interest Income' },
    { id: 'tax-2', name: 'Form 1099-DIV', year: 2025, description: 'Dividend Income' },
    { id: 'tax-3', name: 'Form 1099-B', year: 2025, description: 'Proceeds from Broker Transactions' }
  ];
  
  const container = document.getElementById('taxDocumentsList');
  container.innerHTML = taxDocs.map(doc => `
    <div class="p-3 bg-gray-700 rounded-lg flex items-center justify-between hover:bg-gray-600 transition cursor-pointer" onclick="downloadTaxDocument('${doc.id}')">
      <div class="flex items-center space-x-3">
        <i class="fas fa-file-invoice-dollar text-green-400 text-2xl"></i>
        <div>
          <span class="font-semibold">${doc.name} - ${doc.year}</span>
          <span class="text-gray-400 text-sm block">${doc.description}</span>
        </div>
      </div>
      <i class="fas fa-download text-gray-400"></i>
    </div>
  `).join('');
}

// Filter documents
function filterDocuments(type) {
  currentFilter = type;
  
  // Update filter buttons
  document.querySelectorAll('[id^="filter-"]').forEach(btn => {
    btn.classList.remove('bg-blue-600', 'text-white');
    btn.classList.add('text-gray-300', 'hover:bg-gray-700');
  });
  
  const activeBtn = document.getElementById(`filter-${type}`);
  activeBtn.classList.remove('text-gray-300', 'hover:bg-gray-700');
  activeBtn.classList.add('bg-blue-600', 'text-white');
  
  applyFilters();
}

// Apply filters
function applyFilters() {
  const searchTerm = document.getElementById('searchDocuments').value.toLowerCase();
  const dateFilter = document.getElementById('dateFilter').value;
  
  let filtered = [...allDocuments];
  
  // Filter by type
  if (currentFilter !== 'all') {
    const typeMap = {
      'statements': 'statement',
      'tax': 'tax',
      'trade': 'trade',
      'legal': 'legal'
    };
    filtered = filtered.filter(doc => doc.type === typeMap[currentFilter]);
  }
  
  // Filter by search term
  if (searchTerm) {
    filtered = filtered.filter(doc => doc.name.toLowerCase().includes(searchTerm));
  }
  
  // Filter by date
  if (dateFilter !== 'all') {
    const days = parseInt(dateFilter);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    filtered = filtered.filter(doc => new Date(doc.date) >= cutoff);
  }
  
  // Display filtered results
  const container = document.getElementById('documentsList');
  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-sm">No documents found</p>';
  } else {
    container.innerHTML = filtered.map(doc => createDocumentRow(doc)).join('');
  }
}

// Upload document
function uploadDocument() {
  const modal = document.getElementById('uploadModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

// Close upload modal
function closeUploadModal() {
  const modal = document.getElementById('uploadModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.getElementById('uploadForm').reset();
}

// Submit upload
async function submitUpload(event) {
  event.preventDefault();
  
  const type = document.getElementById('uploadType').value;
  const file = document.getElementById('uploadFile').files[0];
  const description = document.getElementById('uploadDescription').value;
  
  if (!file) {
    showToast('Please select a file', 'error');
    return;
  }
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  formData.append('description', description);
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showToast('Document uploaded successfully', 'success');
      closeUploadModal();
      loadDocuments();
    } else {
      showToast(result.error || 'Upload failed', 'error');
    }
  } catch (error) {
    console.error('Upload error:', error);
    showToast('Document uploaded (demo mode)', 'success');
    closeUploadModal();
    
    // Add to local list
    const newDoc = {
      id: allDocuments.length + 1,
      name: file.name,
      type: type,
      date: new Date().toISOString().split('T')[0],
      size: `${(file.size / 1024).toFixed(0)} KB`
    };
    allDocuments.unshift(newDoc);
    displayDocuments(allDocuments);
  }
}

// Preview document
function previewDocument(docId) {
  const doc = allDocuments.find(d => d.id === docId);
  if (!doc) return;
  
  currentDocument = doc;
  document.getElementById('previewTitle').textContent = doc.name;
  
  const previewContent = document.getElementById('previewContent');
  previewContent.innerHTML = `
    <div class="text-center py-16">
      <i class="${getDocumentIcon(doc.type)} text-6xl mb-4"></i>
      <h4 class="text-xl font-semibold mb-2">${doc.name}</h4>
      <p class="text-gray-400">Type: ${doc.type}</p>
      <p class="text-gray-400">Date: ${new Date(doc.date).toLocaleDateString()}</p>
      <p class="text-gray-400">Size: ${doc.size}</p>
      <div class="mt-6">
        <button onclick="downloadDocument(${doc.id})" class="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700">
          <i class="fas fa-download mr-2"></i>Download PDF
        </button>
      </div>
    </div>
  `;
  
  const modal = document.getElementById('previewModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

// Close preview modal
function closePreviewModal() {
  const modal = document.getElementById('previewModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  currentDocument = null;
}

// Download document
async function downloadDocument(docId) {
  const doc = allDocuments.find(d => d.id === docId);
  if (!doc) {
    showToast('Document not found', 'error');
    return;
  }
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/documents/${docId}/download`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Download started', 'success');
    } else {
      showToast('Download failed', 'error');
    }
  } catch (error) {
    console.error('Download error:', error);
    showToast('Download started (demo mode)', 'success');
  }
}

// Download current document
function downloadCurrentDocument() {
  if (currentDocument) {
    downloadDocument(currentDocument.id);
  }
}

// Delete document
async function deleteDocument(docId) {
  if (!confirm('Are you sure you want to delete this document?')) {
    return;
  }
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/documents/${docId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      showToast('Document deleted', 'success');
      allDocuments = allDocuments.filter(d => d.id !== docId);
      displayDocuments(allDocuments);
    } else {
      showToast('Delete failed', 'error');
    }
  } catch (error) {
    console.error('Delete error:', error);
    showToast('Document deleted (demo mode)', 'success');
    allDocuments = allDocuments.filter(d => d.id !== docId);
    displayDocuments(allDocuments);
  }
}

// Download statement
function downloadStatement(month) {
  showToast(`Downloading statement for ${month}`, 'success');
}

// Download tax document
function downloadTaxDocument(docId) {
  showToast('Downloading tax document', 'success');
}

// Request statement
function requestStatement() {
  showToast('Statement request submitted. You will receive it within 24 hours.', 'success');
}

// Download all
function downloadAll() {
  showToast('Preparing download of all documents...', 'info');
}

// Print document
function printDocument() {
  if (currentDocument) {
    showToast('Preparing document for printing...', 'info');
    window.print();
  }
}

// Format number
function formatNumber(num) {
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Show toast notification
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  const toastIcon = document.getElementById('toastIcon');
  
  toastMessage.textContent = message;
  toastIcon.className = type === 'success' ? 'fas fa-check-circle text-green-500' :
                        type === 'error' ? 'fas fa-exclamation-circle text-red-500' :
                        'fas fa-info-circle text-blue-500';
  
  toast.classList.remove('hidden');
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

// Logout
function logout() {
  localStorage.removeItem('token');
  window.location.href = 'index.html';
}