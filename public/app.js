/* global document, alert, fetch */
const API_URL = 'http://localhost:3000/api';

async function loadNetworks() {
  const select = document.getElementById('chain');
  if (!select) return;

  try {
    const res = await fetch(`${API_URL}/networks`);

    if (!res.ok) {
      select.innerHTML = '<option value="" disabled selected>Failed to load networks (server error)</option>';
      return;
    }

    const networks = await res.json();
    const keys = Object.keys(networks);

    if (keys.length === 0) {
      select.innerHTML = '<option value="" disabled selected>No networks configured yet</option>';
      return;
    }

    select.innerHTML = '<option value="" disabled selected>-- Select a network --</option>';
    keys.forEach((key) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.innerText = `${key} (${networks[key].type})`;
      select.appendChild(opt);
    });
  } catch (e) {
    select.innerHTML = '<option value="" disabled selected>Could not reach the server</option>';
    console.error('Failed to load networks:', e);
  }
}

async function validate() {
  const btn = document.getElementById('btn-val');
  const output = document.getElementById('result');
  const chain = document.getElementById('chain').value;
  const hash = document.getElementById('val-hash').value.trim();

  if (!chain && !hash) {
    alert('Please select a network and enter a transaction hash.');
    return;
  }
  if (!chain) {
    alert('Please select a network.');
    return;
  }
  if (!hash) {
    alert('Please enter a transaction hash.');
    return;
  }
  if (!/^0x[a-fA-F0-9]{64}$/.test(hash)) {
    alert('That doesn\'t look like a valid transaction hash. It should start with "0x" followed by 64 hex characters.');
    return;
  }

  btn.disabled = true;
  btn.innerText = 'Validating...';
  showLoading(output, 'Checking transaction on the blockchain...');

  try {
    const res = await fetch(`${API_URL}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chain, hash }),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      showError(output, 'The server returned an unexpected response (not valid JSON). Please try again.');
      return;
    }

    if (!res.ok) {
      showError(output, data.error || `The server returned an error (HTTP ${res.status}).`);
      return;
    }

    if (data.valid) {
      showSuccess(output, `
        <div class="result-title">Valid Transaction</div>
        <div class="result-data">
          ${formatTransactionData(data.data, chain)}
        </div>
      `);
    } else {
      showError(output, data.error || 'Transaction could not be validated.');
    }
  } catch (e) {
    showError(output, 'Could not reach the server. Check your connection and that the API is running.');
  }

  btn.disabled = false;
  btn.innerText = 'Validate Transaction';
}

function showLoading(element, message) {
  element.style.display = 'block';
  element.className = 'result';
  element.innerHTML = `<div class="loading">${message}</div>`;
}

function showSuccess(element, message) {
  element.style.display = 'block';
  element.className = 'result success';
  element.innerHTML = message;
}

function showError(element, message) {
  element.style.display = 'block';
  element.className = 'result error';
  element.innerHTML = `<div class="result-title">Error</div><div class="result-data">${message}</div>`;
}

function formatTransactionData(data, chainName) {
  const events = data.events || [];

  const destCheck = data.bridge_destination_check || {};
  const hasBridgeCheck = Object.keys(destCheck).length > 0;
  const status = destCheck.status || 'NOT APPLICABLE';
  const isConfirmed = status.toUpperCase() === 'CONFIRMED';
  const details = hasBridgeCheck
    ? destCheck.details || 'The backend did not return further details for this bridge check.'
    : 'No Polygon bridge event was detected in this transaction, so there is nothing to track on the destination chain.';

  const bridgeEvent = events.length > 0 ? events[0] : null;
  const tokenAmount = bridgeEvent?.value ?? 'Amount not found in the transaction logs';
  const destinationAddress = destCheck.receiver || bridgeEvent?.to_polygon_user || 'Address not found in the transaction logs';

  return `
    <div class="timeline-container">
        <h3 class="timeline-title">Cross-Chain Status</h3>
        <div class="timeline">

            <div class="timeline-step completed">
                <div class="step-icon">1</div>
                <div class="step-content">
                    <h4>Locked on Source Chain (${chainName ? chainName.toUpperCase() : 'ETHEREUM'})</h4>
                    <p>Hash: <code>${data.hash}</code></p>
                    <p>From: <code>${data.from}</code></p>
                    <p>Tokens locked: <strong>${tokenAmount}</strong></p>
                    <p>Block: <strong>${data.block}</strong> &nbsp;|&nbsp; Gas used: <strong>${data.gas_used}</strong></p>
                    <span class="status-badge success">Confirmed</span>
                </div>
            </div>

            <div class="timeline-step completed">
                <div class="step-icon">2</div>
                <div class="step-content">
                    <h4>Events Found in Transaction</h4>
                    <p>Total events: <strong>${events.length}</strong></p>
                    ${events.map((e) => `<p style="font-size:0.85em; color:#aaa;">${e.type}${e.value ? ' — ' + e.value : ''}</p>`).join('')}
                    <span class="status-badge success">Processed</span>
                </div>
            </div>

            <div class="timeline-step ${isConfirmed ? 'completed' : 'processing'}">
                <div class="step-icon">3</div>
                <div class="step-content">
                    <h4>Arrival on Destination (Polygon)</h4>
                    <p>Recipient: <code>${destinationAddress}</code></p>
                    ${destCheck.polygon_token ? `<p>Token on Polygon: <code>${destCheck.polygon_token}</code></p>` : ''}
                    ${destCheck.mint_tx ? `<p>Mint hash: <code>${destCheck.mint_tx}</code></p>` : ''}
                    ${destCheck.mint_block ? `<p>Mint block: <strong>${destCheck.mint_block}</strong></p>` : ''}
                    <p style="margin-top: 5px; color: ${isConfirmed ? '#00ffcc' : '#ffcc00'};">
                        ${details}
                    </p>
                    <span class="status-badge ${isConfirmed ? 'success' : 'pending'}">
                        ${status}
                    </span>
                </div>
            </div>

        </div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', loadNetworks);
