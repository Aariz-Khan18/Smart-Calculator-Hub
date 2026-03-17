lucide.createIcons();

let currentCurrency = '₹'; 
let isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

// Theme Logic
const htmlEl = document.documentElement;
function applyTheme() {
  if (isDark) {
    htmlEl.classList.add('dark');
    document.getElementById('themeIcon').setAttribute('data-lucide', 'sun');
  } else {
    htmlEl.classList.remove('dark');
    document.getElementById('themeIcon').setAttribute('data-lucide', 'moon');
  }
  lucide.createIcons();
}
document.getElementById('themeToggle').addEventListener('click', () => { isDark = !isDark; applyTheme(); });
applyTheme();

// Currency Toggle
document.getElementById('currencyToggle').addEventListener('click', (e) => {
  currentCurrency = currentCurrency === '₹' ? '$' : '₹';
  e.target.innerText = currentCurrency;
  document.querySelectorAll('.currency-sym').forEach(el => el.innerText = currentCurrency);
  calculateEMI(); calculateSIP(); calculateGST(); calculateDiscount();
});

function formatMoney(amount) {
  if (isNaN(amount)) return currentCurrency + '0';
  const locale = currentCurrency === '₹' ? 'en-IN' : 'en-US';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: currentCurrency === '₹' ? 'INR' : 'USD', maximumFractionDigits: 0 }).format(amount);
}

// Tab Switching Logic
function switchTab(tabId) {
  ['emi', 'sip', 'gst', 'discount', 'age', 'bmi', 'date', 'converter'].forEach(id => {
    const view = document.getElementById(`view-${id}`);
    const tab = document.getElementById(`tab-${id}`);
    if(view) view.classList.add('hidden');
    if(tab) { tab.classList.remove('active-tab'); tab.classList.add('inactive-tab'); }
  });
  
  document.getElementById(`view-${tabId}`).classList.remove('hidden');
  const activeTab = document.getElementById(`tab-${tabId}`);
  activeTab.classList.remove('inactive-tab'); 
  activeTab.classList.add('active-tab');
  
  if(tabId === 'converter' && !document.getElementById('convFrom').options.length) updateConvOptions();
}

// Toast & Copy Logic
function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMsg').innerText = msg;
    toast.classList.add('toast-show');
    setTimeout(() => toast.classList.remove('toast-show'), 2000);
}
function copyResult(elementId) {
    const text = document.getElementById(elementId).innerText;
    navigator.clipboard.writeText(text).then(() => showToast('Copied!'));
}
function copyResultValue(elementId) {
    const text = document.getElementById(elementId).value;
    navigator.clipboard.writeText(text).then(() => showToast('Copied!'));
}

// History Logic
let historyData = JSON.parse(localStorage.getItem('smartcalc_history')) || [];
function toggleHistory() { document.getElementById('historyPanel').classList.toggle('hidden'); }

function updateHistoryUI() {
    const list = document.getElementById('historyList');
    list.innerHTML = '';
    if(historyData.length === 0) {
        list.innerHTML = '<p class="text-sm text-gray-500 text-center mt-4">No saved calculations yet.</p>';
        return;
    }
    historyData.forEach(item => {
        list.innerHTML += `
            <div class="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <p class="text-xs text-primary font-bold mb-1">${item.type}</p>
                <p class="text-sm font-semibold">${item.result}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${item.detail}</p>
            </div>
        `;
    });
}
function saveToHistory(type) {
    let result = '', detail = '';
    if(type === 'EMI') {
        if(!document.getElementById('emiAmount').value) return showToast("Nothing to save!");
        result = document.getElementById('emiResult').innerText + " / month";
        detail = "Loan: " + currentCurrency + document.getElementById('emiAmount').value;
    } else if(type === 'SIP') {
        if(!document.getElementById('sipAmount').value) return showToast("Nothing to save!");
        result = "Total: " + document.getElementById('sipTotalValue').innerText;
        detail = "Inv: " + currentCurrency + document.getElementById('sipAmount').value + "/mo";
    } else if(type === 'BMI') {
        if(!document.getElementById('bmiWeight').value) return showToast("Nothing to save!");
        result = "BMI: " + document.getElementById('bmiResult').innerText;
        detail = document.getElementById('bmiStatus').innerText;
    } else if(type === 'GST') {
        if(!document.getElementById('gstAmount').value) return showToast("Nothing to save!");
        result = "Gross: " + document.getElementById('gstGross').innerText;
        detail = "Net: " + document.getElementById('gstNet').innerText;
    }
    
    historyData.unshift({ type, result, detail });
    if(historyData.length > 10) historyData.pop(); 
    localStorage.setItem('smartcalc_history', JSON.stringify(historyData));
    updateHistoryUI();
    showToast('Saved to History!');
}
function clearHistory() {
    historyData = [];
    localStorage.removeItem('smartcalc_history');
    updateHistoryUI();
}
updateHistoryUI();

// ==========================================
// CALCULATOR FUNCTIONS
// ==========================================

function clearInputs(type) {
    document.querySelectorAll(`#view-${type} input[type="number"], #view-${type} input[type="date"]`).forEach(input => input.value = '');
    
    // Reset specific elements visually
    if(type === 'emi') calculateEMI();
    if(type === 'sip') calculateSIP();
    if(type === 'gst') calculateGST();
    if(type === 'discount') calculateDiscount();
    if(type === 'age') calculateAge();
    if(type === 'date') calculateDateDiff();
    if(type === 'bmi') {
        document.getElementById('bmiResult').innerText = "0.0";
        document.getElementById('bmiStatus').innerText = "Enter Details";
        document.getElementById('bmiStatus').className = "mt-4 px-4 py-1.5 rounded-full text-sm font-bold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300";
    }
}

// 1. EMI
function calculateEMI() {
  const p = parseFloat(document.getElementById('emiAmount').value) || 0;
  const r_annual = parseFloat(document.getElementById('emiRate').value) || 0;
  const tenure = parseFloat(document.getElementById('emiTenure').value) || 0;
  const tenureType = document.getElementById('emiTenureType').value;

  if (p===0 || r_annual===0 || tenure===0) {
      document.getElementById('emiResult').innerText = formatMoney(0);
      document.getElementById('emiTotalInterest').innerText = formatMoney(0);
      document.getElementById('emiTotalAmount').innerText = formatMoney(0);
      return;
  }

  const r = r_annual / 12 / 100; 
  const n = tenureType === 'years' ? tenure * 12 : tenure; 
  const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const totalAmount = emi * n;
  
  document.getElementById('emiResult').innerText = formatMoney(emi);
  document.getElementById('emiTotalInterest').innerText = formatMoney(totalAmount - p);
  document.getElementById('emiTotalAmount').innerText = formatMoney(totalAmount);
}

// 2. SIP
function calculateSIP() {
  const p = parseFloat(document.getElementById('sipAmount').value) || 0;
  const r_annual = parseFloat(document.getElementById('sipRate').value) || 0;
  const years = parseFloat(document.getElementById('sipYears').value) || 0;

  if (p===0 || r_annual===0 || years===0) {
      document.getElementById('sipTotalValue').innerText = formatMoney(0);
      document.getElementById('sipInvested').innerText = formatMoney(0);
      document.getElementById('sipReturns').innerText = formatMoney(0);
      return;
  }

  const i = r_annual / 12 / 100; 
  const n = years * 12; 
  const totalValue = p * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
  const investedAmount = p * n;
  
  document.getElementById('sipTotalValue').innerText = formatMoney(totalValue);
  document.getElementById('sipInvested').innerText = formatMoney(investedAmount);
  document.getElementById('sipReturns').innerText = formatMoney(totalValue - investedAmount);
}

// 3. GST
function calculateGST() {
    const amount = parseFloat(document.getElementById('gstAmount').value) || 0;
    const rate = parseFloat(document.querySelector('input[name="gstRate"]:checked').value);
    const mode = document.querySelector('input[name="gstMode"]:checked').value;
    
    if(amount===0) {
        document.getElementById('gstNet').innerText = formatMoney(0);
        document.getElementById('gstTax').innerText = formatMoney(0);
        document.getElementById('gstGross').innerText = formatMoney(0);
        return;
    }

    let net, tax, gross;
    if (mode === 'add') { 
        net = amount; tax = amount * (rate / 100); gross = amount + tax; 
    } else { 
        gross = amount; net = amount / (1 + (rate / 100)); tax = gross - net; 
    }
    document.getElementById('gstNet').innerText = formatMoney(net);
    document.getElementById('gstTax').innerText = formatMoney(tax);
    document.getElementById('gstGross').innerText = formatMoney(gross);
}

// 4. Discount
function calculateDiscount() {
    const price = parseFloat(document.getElementById('discPrice').value) || 0;
    const discount = parseFloat(document.getElementById('discPercent').value) || 0;
    
    if(price===0) {
        document.getElementById('discSaved').innerText = formatMoney(0);
        document.getElementById('discFinal').innerText = formatMoney(0);
        return;
    }
    const safeDiscount = Math.min(Math.max(discount, 0), 100); 
    const savedAmount = price * (safeDiscount / 100);
    
    document.getElementById('discSaved').innerText = formatMoney(savedAmount);
    document.getElementById('discFinal').innerText = formatMoney(price - savedAmount);
}

// 5. Age
function calculateAge() {
    const dobInput = document.getElementById('ageDob').value;
    const targetInput = document.getElementById('ageTarget').value;
    const yEl = document.getElementById('ageYears'); const mEl = document.getElementById('ageMonths');
    const dEl = document.getElementById('ageDays'); const txtEl = document.getElementById('ageResultText');
    const tDaysEl = document.getElementById('ageTotalDays');

    if (!dobInput || !targetInput) {
      yEl.innerText = '0'; mEl.innerText = '0'; dEl.innerText = '0';
      txtEl.innerText = '-'; tDaysEl.innerText = '0 Days'; return;
    }

    const dob = new Date(dobInput); const target = new Date(targetInput);
    if (target < dob) { txtEl.innerText = 'DOB cannot be after target!'; return; }

    const diffTime = Math.abs(target - dob);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let years = target.getFullYear() - dob.getFullYear();
    let months = target.getMonth() - dob.getMonth();
    let days = target.getDate() - dob.getDate();

    if (days < 0) {
      months--; const prevMonth = new Date(target.getFullYear(), target.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) { years--; months += 12; }

    yEl.innerText = years; mEl.innerText = months; dEl.innerText = days;
    txtEl.innerText = `${years} Years, ${months} Months, ${days} Days`;
    tDaysEl.innerText = diffDays.toLocaleString('en-IN') + ' Days';
}

// 6. BMI
function calculateBMI() {
    const weight = parseFloat(document.getElementById('bmiWeight').value);
    const heightCm = parseFloat(document.getElementById('bmiHeight').value);
    
    if(!weight || !heightCm) return;
    
    const heightM = heightCm / 100;
    const bmi = (weight / (heightM * heightM)).toFixed(1);
    
    document.getElementById('bmiResult').innerText = bmi;
    const statusEl = document.getElementById('bmiStatus');
    statusEl.className = "mt-4 px-4 py-1.5 rounded-full text-sm font-bold";
    
    if(bmi < 18.5) { statusEl.innerText = "Underweight"; statusEl.classList.add("bmi-under"); }
    else if(bmi >= 18.5 && bmi <= 24.9) { statusEl.innerText = "Normal Weight"; statusEl.classList.add("bmi-normal"); }
    else if(bmi >= 25 && bmi <= 29.9) { statusEl.innerText = "Overweight"; statusEl.classList.add("bmi-over"); }
    else { statusEl.innerText = "Obese"; statusEl.classList.add("bmi-obese"); }
}

// 7. Date
function calculateDateDiff() {
    const startInput = document.getElementById('dateStart').value;
    const endInput = document.getElementById('dateEnd').value;
    const warningEl = document.getElementById('dateWarning');

    if (!startInput || !endInput) {
      document.getElementById('dateDiffDays').innerText = '0';
      document.getElementById('dateDiffWeeks').innerText = '0';
      document.getElementById('dateDiffMonths').innerText = '0';
      warningEl.classList.add('hidden'); return;
    }

    const start = new Date(startInput); const end = new Date(endInput);
    (end < start) ? warningEl.classList.remove('hidden') : warningEl.classList.add('hidden');

    const diffDays = Math.floor(Math.abs(end - start) / (1000 * 60 * 60 * 24));
    document.getElementById('dateDiffDays').innerText = diffDays.toLocaleString('en-IN');
    document.getElementById('dateDiffWeeks').innerText = (diffDays / 7).toFixed(1);
    document.getElementById('dateDiffMonths').innerText = (diffDays / 30.416).toFixed(1); 
}

// 8. Converter
const units = {
  length: { Meter: 1, Kilometer: 1000, Centimeter: 0.01, Millimeter: 0.001, Mile: 1609.34, Foot: 0.3048, Inch: 0.0254 },
  weight: { Kilogram: 1, Gram: 0.001, MetricTon: 1000, Pound: 0.453592, Ounce: 0.0283495 },
  temp: { Celsius: 'c', Fahrenheit: 'f', Kelvin: 'k' },
  data: { Byte: 1, Kilobyte: 1024, Megabyte: 1048576, Gigabyte: 1073741824, Terabyte: 1099511627776, Bit: 0.125 }
};

function updateConvOptions() {
  const type = document.getElementById('convType').value;
  const selFrom = document.getElementById('convFrom');
  const selTo = document.getElementById('convTo');
  selFrom.innerHTML = ''; selTo.innerHTML = '';
  Object.keys(units[type]).forEach(unit => {
    selFrom.add(new Option(unit, unit));
    selTo.add(new Option(unit, unit));
  });
  if(selTo.options.length > 1) selTo.selectedIndex = 1;
  calculateConversion();
}
function swapUnits() {
  const selFrom = document.getElementById('convFrom');
  const selTo = document.getElementById('convTo');
  const temp = selFrom.value; selFrom.value = selTo.value; selTo.value = temp;
  calculateConversion();
}
function calculateConversion() {
  const type = document.getElementById('convType').value;
  const val = parseFloat(document.getElementById('convInput').value);
  const from = document.getElementById('convFrom').value;
  const to = document.getElementById('convTo').value;
  const outEl = document.getElementById('convOutput');

  if (isNaN(val)) { outEl.value = ''; return; }

  if (type === 'temp') {
    let c;
    if (from === 'Celsius') c = val;
    else if (from === 'Fahrenheit') c = (val - 32) * 5/9;
    else if (from === 'Kelvin') c = val - 273.15;
    let res;
    if (to === 'Celsius') res = c;
    else if (to === 'Fahrenheit') res = (c * 9/5) + 32;
    else if (to === 'Kelvin') res = c + 273.15;
    outEl.value = Number(res.toFixed(4)).toString();
  } else {
    outEl.value = parseFloat(((val * units[type][from]) / units[type][to]).toPrecision(10)).toString(); 
  }
}

