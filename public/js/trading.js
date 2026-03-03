// Trading Page JavaScript
let currentStock = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  price: 178.52,
  change: 2.34,
  changePercent: 1.33
};

let orderSide = 'buy';
let chart = null;
let chartPeriod = '1D';

// Popular stocks for quick access
const popularStocks = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'META', name: 'Meta Platforms Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
  { symbol: 'V', name: 'Visa Inc.' },
  { symbol: 'JNJ', name: 'Johnson & Johnson' }
];

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  initializeChart();
  loadPortfolio();
  loadRecentOrders();
  setupStockSearch();
  updateOrderSummary();
  
  // Simulate real-time updates
  setInterval(simulatePriceUpdate, 5000);
});

// Initialize stock chart
function initializeChart() {
  const ctx = document.getElementById('stockChart').getContext('2d');
  
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
  gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
  
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: generateTimeLabels(),
      datasets: [{
        label: 'Price',
        data: generatePriceData(),
        borderColor: '#3b82f6',
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#3b82f6'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2937',
          titleColor: '#fff',
          bodyColor: '#9ca3af',
          borderColor: '#374151',
          borderWidth: 1,
          displayColors: false,
          callbacks: {
            label: (context) => `$${context.parsed.y.toFixed(2)}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#374151' },
          ticks: { color: '#9ca3af' }
        },
        y: {
          grid: { color: '#374151' },
          ticks: {
            color: '#9ca3af',
            callback: (value) => '$' + value.toFixed(2)
          }
        }
      }
    }
  });
}

// Generate time labels for chart
function generateTimeLabels() {
  const labels = [];
  const now = new Date();
  
  if (chartPeriod === '1D') {
    for (let i = 0; i < 78; i++) {
      const time = new Date(now);
      time.setHours(9, 30, 0, 0);
      time.setMinutes(time.getMinutes() + i * 5);
      labels.push(time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    }
  } else {
    const days = chartPeriod === '1W' ? 7 : chartPeriod === '1M' ? 30 : chartPeriod === '3M' ? 90 : 365;
    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
  }
  
  return labels;
}

// Generate simulated price data
function generatePriceData() {
  const data = [];
  let price = currentStock.price - 5;
  const points = chartPeriod === '1D' ? 78 : chartPeriod === '1W' ? 8 : chartPeriod === '1M' ? 31 : chartPeriod === '3M' ? 91 : 366;
  
  for (let i = 0; i < points; i++) {
    const change = (Math.random() - 0.48) * 2;
    price = Math.max(price + change, 1);
    data.push(parseFloat(price.toFixed(2)));
  }
  
  if (data.length > 0) {
    data[data.length - 1] = currentStock.price;
  }
  
  return data;
}

// Set chart period
function setChartPeriod(period) {
  chartPeriod = period;
  
  document.querySelectorAll('.chart-period-btn').forEach(btn => {
    btn.classList.remove('bg-blue-600', 'text-white');
    btn.classList.add('bg-gray-700');
  });
  event.target.classList.remove('bg-gray-700');
  event.target.classList.add('bg-blue-600', 'text-white');
  
  chart.data.labels = generateTimeLabels();
  chart.data.datasets[0].data = generatePriceData();
  chart.update();
}

// Set chart type
function setChartType(type) {
  showToast('Chart type changed to ' + type, 'info');
}

// Setup stock search
function setupStockSearch() {
  const searchInput = document.getElementById('stockSearch');
  const resultsDiv = document.getElementById('searchResults');
  
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toUpperCase();
    
    if (query.length < 1) {
      resultsDiv.classList.add('hidden');
      return;
    }
    
    const matches = popularStocks.filter(s => 
      s.symbol.includes(query) || s.name.toUpperCase().includes(query)
    );
    
    if (matches.length > 0) {
      resultsDiv.innerHTML = matches.map(s => `
        <div class="px-4 py-2 hover:bg-gray-600 cursor-pointer" onclick="selectStock('${s.symbol}', '${s.name}')">
          <span class="font-semibold">${s.symbol}</span>
          <span class="text-gray-400 text-sm ml-2">${s.name}</span>
        </div>
      `).join('');
      resultsDiv.classList.remove('hidden');
    } else {
      resultsDiv.classList.add('hidden');
    }
  });
  
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !resultsDiv.contains(e.target)) {
      resultsDiv.classList.add('hidden');
    }
  });
}

// Select stock from search
function selectStock(symbol, name) {
  document.getElementById('stockSearch').value = '';
  document.getElementById('searchResults').classList.add('hidden');
  
  currentStock.symbol = symbol;
  currentStock.name = name;
  currentStock.price = parseFloat((Math.random() * 300 + 50).toFixed(2));
  currentStock.change = parseFloat((Math.random() * 10 - 5).toFixed(2));
  currentStock.changePercent = parseFloat(((currentStock.change / currentStock.price) * 100).toFixed(2));
  
  updateStockDisplay();
  updateOrderSummary();
  
  chart.data.datasets[0].data = generatePriceData();
  chart.update();
}

// Search stock
function searchStock() {
  const query = document.getElementById('stockSearch').value.toUpperCase();
  const stock = popularStocks.find(s => s.symbol === query);
  
  if (stock) {
    selectStock(stock.symbol, stock.name);
  } else {
    showToast('Stock not found. Try: AAPL, GOOGL, MSFT, AMZN, TSLA', 'error');
  }
}

// Update stock display
function updateStockDisplay() {
  document.getElementById('stockSymbol').textContent = currentStock.symbol;
  document.getElementById('stockName').textContent = currentStock.name;
  document.getElementById('stockPrice').textContent = `$${currentStock.price}`;
  
  const changeEl = document.getElementById('priceChange');
  const changePercentEl = document.getElementById('priceChangePercent');
  const isPositive = currentStock.change >= 0;
  
  changeEl.textContent = `${isPositive ? '+' : ''}${currentStock.change}`;
  changePercentEl.textContent = `(${isPositive ? '+' : ''}${currentStock.changePercent}%)`;
  changeEl.className = isPositive ? 'stock-up' : 'stock-down';
  changePercentEl.className = isPositive ? 'stock-up' : 'stock-down';
  
  document.getElementById('stockOpen').textContent = `$${(currentStock.price - Math.random() * 2).toFixed(2)}`;
  document.getElementById('stockHigh').textContent = `$${(currentStock.price * 1.02).toFixed(2)}`;
  document.getElementById('stockLow').textContent = `$${(currentStock.price * 0.98).toFixed(2)}`;
  document.getElementById('stockVolume').textContent = formatVolume(Math.floor(Math.random() * 100000000));
  
  document.getElementById('orderSymbol').value = currentStock.symbol;
}

// Simulate price update
function simulatePriceUpdate() {
  const change = (Math.random() - 0.5) * 0.5;
  currentStock.price = parseFloat((currentStock.price + change).toFixed(2));
  currentStock.change = parseFloat((currentStock.change + change).toFixed(2));
  
  const priceEl = document.getElementById('stockPrice');
  priceEl.textContent = `$${currentStock.price}`;
  
  priceEl.classList.add(change >= 0 ? 'price-flash-up' : 'price-flash-down');
  setTimeout(() => priceEl.classList.remove('price-flash-up', 'price-flash-down'), 500);
  
  updateOrderSummary();
}

// Format volume
function formatVolume(vol) {
  if (vol >= 1000000) return (vol / 1000000).toFixed(1) + 'M';
  if (vol >= 1000) return (vol / 1000).toFixed(1) + 'K';
  return vol.toString();
}

// Set order side
function setOrderSide(side) {
  orderSide = side;
  
  const buyTab = document.getElementById('buyTab');
  const sellTab = document.getElementById('sellTab');
  const submitBtn = document.getElementById('submitOrderBtn');
  
  if (side === 'buy') {
    buyTab.classList.remove('bg-gray-700', 'text-gray-300');
    buyTab.classList.add('bg-green-600', 'text-white');
    sellTab.classList.remove('bg-red-600', 'text-white');
    sellTab.classList.add('bg-gray-700', 'text-gray-300');
    submitBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
    submitBtn.classList.add('bg-green-600', 'hover:bg-green-700');
  } else {
    sellTab.classList.remove('bg-gray-700', 'text-gray-300');
    sellTab.classList.add('bg-red-600', 'text-white');
    buyTab.classList.remove('bg-green-600', 'text-white');
    buyTab.classList.add('bg-gray-700', 'text-gray-300');
    submitBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
    submitBtn.classList.add('bg-red-600', 'hover:bg-red-700');
  }
}

// Update order form
function updateOrderForm() {
  const orderType = document.getElementById('orderType').value;
  const limitGroup = document.getElementById('limitPriceGroup');
  const stopGroup = document.getElementById('stopPriceGroup');
  
  limitGroup.classList.add('hidden');
  stopGroup.classList.add('hidden');
  
  if (orderType === 'limit' || orderType === 'stop_limit') {
    limitGroup.classList.remove('hidden');
  }
  
  if (orderType === 'stop' || orderType === 'stop_limit') {
    stopGroup.classList.remove('hidden');
  }
}

// Adjust quantity
function adjustQuantity(delta) {
  const input = document.getElementById('orderQuantity');
  input.value = Math.max(1, parseInt(input.value || 1) + delta);
  updateOrderSummary();
}

// Update order summary
function updateOrderSummary() {
  const quantity = parseInt(document.getElementById('orderQuantity').value) || 1;
  const total = (quantity * currentStock.price).toFixed(2);
  
  document.getElementById('estimatedCost').textContent = `$${total}`;
  document.getElementById('orderTotal').textContent = `$${total}`;
}

// Submit order
function submitOrder(event) {
  event.preventDefault();
  
  const order = {
    symbol: document.getElementById('orderSymbol').value,
    side: orderSide,
    type: document.getElementById('orderType').value,
    quantity: parseInt(document.getElementById('orderQuantity').value),
    duration: document.getElementById('orderDuration').value
  };
  
  if (order.type === 'limit' || order.type === 'stop_limit') {
    order.limitPrice = parseFloat(document.getElementById('limitPrice').value);
    if (!order.limitPrice) {
      showToast('Please enter a limit price', 'error');
      return;
    }
  }
  
  if (order.type === 'stop' || order.type === 'stop_limit') {
    order.stopPrice = parseFloat(document.getElementById('stopPrice').value);
    if (!order.stopPrice) {
      showToast('Please enter a stop price', 'error');
      return;
    }
  }
  
  showOrderConfirmation(order);
}

// Show order confirmation
function showOrderConfirmation(order) {
  const modal = document.getElementById('orderModal');
  const details = document.getElementById('orderConfirmationDetails');
  const total = (order.quantity * currentStock.price).toFixed(2);
  
  details.innerHTML = `
    <div class="flex justify-between">
      <span class="text-gray-400">Action</span>
      <span class="${order.side === 'buy' ? 'text-green-500' : 'text-red-500'} font-semibold">${order.side.toUpperCase()}</span>
    </div>
    <div class="flex justify-between">
      <span class="text-gray-400">Symbol</span>
      <span class="font-semibold">${order.symbol}</span>
    </div>
    <div class="flex justify-between">
      <span class="text-gray-400">Order Type</span>
      <span>${order.type.charAt(0).toUpperCase() + order.type.slice(1)}</span>
    </div>
    <div class="flex justify-between">
      <span class="text-gray-400">Quantity</span>
      <span>${order.quantity} shares</span>
    </div>
    ${order.limitPrice ? `<div class="flex justify-between"><span class="text-gray-400">Limit Price</span><span>$${order.limitPrice}</span></div>` : ''}
    ${order.stopPrice ? `<div class="flex justify-between"><span class="text-gray-400">Stop Price</span><span>$${order.stopPrice}</span></div>` : ''}
    <div class="flex justify-between border-t border-gray-700 pt-2 font-semibold">
      <span>Estimated Total</span>
      <span>$${total}</span>
    </div>
  `;
  
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  window.pendingOrder = order;
}

// Close order modal
function closeOrderModal() {
  const modal = document.getElementById('orderModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  window.pendingOrder = null;
}

// Confirm order
async function confirmOrder() {
  const order = window.pendingOrder;
  if (!order) return;
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/trading/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(order)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showToast(`Order placed successfully!`, 'success');
      closeOrderModal();
      loadPortfolio();
      loadRecentOrders();
      document.getElementById('orderQuantity').value = 1;
      updateOrderSummary();
    } else {
      showToast(result.error || 'Failed to place order', 'error');
    }
  } catch (error) {
    console.error('Order error:', error);
    showToast('Order placed (demo mode)', 'success');
    closeOrderModal();
  }
}

// Load portfolio
async function loadPortfolio() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/trading/portfolio', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const portfolio = await response.json();
      displayPortfolio(portfolio);
    } else {
      displayDemoPortfolio();
    }
  } catch (error) {
    displayDemoPortfolio();
  }
}

// Display portfolio
function displayPortfolio(portfolio) {
  document.getElementById('portfolioValue').textContent = `$${formatNumber(portfolio.totalValue || 0)}`;
  document.getElementById('dayPL').textContent = `${portfolio.dayPL >= 0 ? '+' : ''}$${formatNumber(portfolio.dayPL || 0)}`;
  document.getElementById('totalPL').textContent = `${portfolio.totalPL >= 0 ? '+' : ''}$${formatNumber(portfolio.totalPL || 0)}`;
  document.getElementById('cashAvailable').textContent = `$${formatNumber(portfolio.cash || 0)}`;
  
  if (portfolio.holdings && portfolio.holdings.length > 0) {
    document.getElementById('holdingsList').innerHTML = portfolio.holdings.map(h => `
      <div class="flex justify-between items-center p-2 bg-gray-700 rounded cursor-pointer hover:bg-gray-600" onclick="selectStock('${h.symbol}', '${h.name}')">
        <div>
          <span class="font-semibold">${h.symbol}</span>
          <span class="text-gray-400 text-sm ml-2">${h.quantity} shares</span>
        </div>
        <div class="text-right">
          <div>$${formatNumber(h.value)}</div>
          <div class="${h.change >= 0 ? 'stock-up' : 'stock-down'} text-sm">${h.change >= 0 ? '+' : ''}${h.changePercent}%</div>
        </div>
      </div>
    `).join('');
  }
}

// Display demo portfolio
function displayDemoPortfolio() {
  document.getElementById('portfolioValue').textContent = '$25,000.00';
  document.getElementById('dayPL').textContent = '+$125.50';
  document.getElementById('totalPL').textContent = '+$1,250.00';
  document.getElementById('cashAvailable').textContent = '$5,000.00';
  
  document.getElementById('holdingsList').innerHTML = `
    <div class="flex justify-between items-center p-2 bg-gray-700 rounded cursor-pointer hover:bg-gray-600" onclick="selectStock('AAPL', 'Apple Inc.')">
      <div>
        <span class="font-semibold">AAPL</span>
        <span class="text-gray-400 text-sm ml-2">50 shares</span>
      </div>
      <div class="text-right">
        <div>$8,926.00</div>
        <div class="stock-up text-sm">+1.33%</div>
      </div>
    </div>
    <div class="flex justify-between items-center p-2 bg-gray-700 rounded cursor-pointer hover:bg-gray-600" onclick="selectStock('MSFT', 'Microsoft Corporation')">
      <div>
        <span class="font-semibold">MSFT</span>
        <span class="text-gray-400 text-sm ml-2">25 shares</span>
      </div>
      <div class="text-right">
        <div>$9,375.00</div>
        <div class="stock-up text-sm">+0.85%</div>
      </div>
    </div>
  `;
}

// Load recent orders
async function loadRecentOrders() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/trading/orders', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const orders = await response.json();
      displayOrders(orders);
    } else {
      displayDemoOrders();
    }
  } catch (error) {
    displayDemoOrders();
  }
}

// Display orders
function displayOrders(orders) {
  if (orders && orders.length > 0) {
    document.getElementById('recentOrders').innerHTML = orders.slice(0, 5).map(o => `
      <div class="p-3 bg-gray-700 rounded">
        <div class="flex justify-between items-center">
          <span class="${o.side === 'buy' ? 'text-green-500' : 'text-red-500'} font-semibold">${o.side.toUpperCase()}</span>
          <span class="text-sm ${o.status === 'filled' ? 'text-green-400' : o.status === 'pending' ? 'text-yellow-400' : 'text-gray-400'}">${o.status.toUpperCase()}</span>
        </div>
        <div class="flex justify-between text-sm mt-1">
          <span>${o.symbol} - ${o.quantity} shares</span>
          <span>$${formatNumber(o.price)}</span>
        </div>
      </div>
    `).join('');
  }
}

// Display demo orders
function displayDemoOrders() {
  document.getElementById('recentOrders').innerHTML = `
    <div class="p-3 bg-gray-700 rounded">
      <div class="flex justify-between items-center">
        <span class="text-green-500 font-semibold">BUY</span>
        <span class="text-sm text-green-400">FILLED</span>
      </div>
      <div class="flex justify-between text-sm mt-1">
        <span>AAPL - 50 shares</span>
        <span>$178.50</span>
      </div>
    </div>
    <div class="p-3 bg-gray-700 rounded">
      <div class="flex justify-between items-center">
        <span class="text-green-500 font-semibold">BUY</span>
        <span class="text-sm text-green-400">FILLED</span>
      </div>
      <div class="flex justify-between text-sm mt-1">
        <span>MSFT - 25 shares</span>
        <span>$375.00</span>
      </div>
    </div>
  `;
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
  
  toast.classList.remove('hidden', 'translate-y-full');
  
  setTimeout(() => {
    toast.classList.add('translate-y-full');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 3000);
}

// Logout
function logout() {
  localStorage.removeItem('token');
  window.location.href = 'index.html';
}