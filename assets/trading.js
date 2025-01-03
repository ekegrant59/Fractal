        // DOM Elements
        const cryptoSelect = document.getElementById("crypto-select");
        const cryptoName = document.getElementById("crypto-name");
        const cryptoPrice = document.getElementById("crypto-price");
        const priceChart = document.getElementById("price-chart");

        let chart; // Chart.js instance

        /**
         * Fetch cryptocurrency data
         * @param {string} cryptoId - The ID of the selected cryptocurrency
         * @returns {object} - Contains the price and chart data
         */
        async function fetchCryptoData(cryptoId) {
            const [priceResponse] = await Promise.all([
                fetch(`/api/price/${cryptoId}`).then((res) => res.json())
            ]);

            return {
                price: priceResponse.price
            };
        }

        let isFullscreen = false;

        function updateChart(symbol) {
// Select the main container
const container = document.querySelector('#tradingview-container');

// Remove the old widget container
while (container.firstChild) {
  container.removeChild(container.firstChild); // Remove all children
}

// Create a new widget container
const widgetContainer = document.createElement('div');
widgetContainer.className = 'tradingview-widget-container';
widgetContainer.style.height = '100%';
widgetContainer.style.width = '100%';

const widget = document.createElement('div');
widget.className = 'tradingview-widget-container__widget';
widget.style.height = '100%';
widget.style.width = '100%';
widgetContainer.appendChild(widget);

const copyright = document.createElement('div');
copyright.className = 'tradingview-widget-copyright';
const link = document.createElement('a');
link.href = 'https://www.tradingview.com/';
link.rel = 'noopener nofollow';
link.target = '_blank';
copyright.appendChild(link);
widgetContainer.appendChild(copyright);

container.appendChild(widgetContainer);

// Create a new script element with updated symbol
const script = document.createElement('script');
script.type = 'text/javascript';
script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
script.async = true;

// Configure the widget options dynamically
const widgetConfig = {
  autosize: true,
  symbol: symbol, // Dynamic symbol passed as argument
  interval: 'D',
  timezone: 'Etc/UTC',
  theme: 'dark',
  style: '1',
  locale: 'en',
  enable_publishing: false,
  allow_symbol_change: true,
  support_host: 'https://www.tradingview.com',
};

script.innerHTML = JSON.stringify(widgetConfig);

// Append the script to the new widget container
widgetContainer.appendChild(script);
        }

        function toggleFullscreen() {
    const container = document.querySelector('#tradingview-container');
    const toggleButton = document.querySelector('#fullscreen-toggle');

    if (!isFullscreen) {
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100vw';
      container.style.height = '100vh';
      container.style.zIndex = '1000';

      toggleButton.style.position = 'fixed';
      toggleButton.style.top = '10px';
      toggleButton.style.right = '10px';
      toggleButton.style.zIndex = '9999';
      toggleButton.innerHTML = '<i class="fa-solid fa-xmark"></i>';

      // Add keydown event listener for Escape key
      document.addEventListener('keydown', handleEscapeKey);

    } else {
      container.style.position = 'relative';
      container.style.width = '100%';
      container.style.height = '100%';

      toggleButton.style.position = 'absolute';
      toggleButton.style.top = '10px';
      toggleButton.style.right = '10px';
      toggleButton.style.zIndex = '9999';
      toggleButton.innerHTML = '<i class="fa-solid fa-expand"></i>';

      // Remove keydown event listener for Escape key
      document.removeEventListener('keydown', handleEscapeKey);
    }

    isFullscreen = !isFullscreen;
  }

  function handleEscapeKey(event) {
    if (event.key === 'Escape' && isFullscreen) {
      toggleFullscreen();
    }
  }

  document.querySelector('#fullscreen-toggle').addEventListener('click', toggleFullscreen);


        async function updateCryptoData(cryptoId) {
            const data = await fetchCryptoData(cryptoId); // Fetch data
            cryptoPrice.value = `$${data.price}`; // Update price
            cryptoName.textContent = cryptoId
            document.getElementById('crypto-name-hidden').value = cryptoId;
        }

        // Event Listener: Handle dropdown selection
        cryptoSelect.addEventListener("change", async (event) => {
            const selectedCrypto = event.target.value; // Selected cryptocurrency ID

            if (selectedCrypto) {
                updateChart(selectedCrypto); // Update chart
                await updateCryptoData(selectedCrypto);
            }
        });

        // Real-Time Updates: Refresh data every 10 seconds
        setInterval(async () => {
            const selectedCrypto = cryptoSelect.value || "BTCUSDT"; // Default to Bitcoin
            await updateCryptoData(selectedCrypto);
        }, 10000); // Update every 10 seconds

        // Initialize: Load default data for Bitcoin
        document.addEventListener("DOMContentLoaded", async () => {
            const userId = document.getElementById('userEmail').textContent
            const defaultCryptoId = "BTCUSDT";
            updateChart(defaultCryptoId);
            await updateCryptoData(defaultCryptoId);
            fetchAndDisplayTrades(userId)
        });

        // Function to fetch the current price of a cryptocurrency
        async function fetchCurrentPrice(symbol) {
          const apiUrl = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`;
          try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
              throw new Error(`Failed to fetch price for ${symbol}`);
            }
            const data = await response.json();
            return parseFloat(data.price); // Return the current price as a number
          } catch (error) {
            console.error(`Error fetching current price: ${error.message}`);
            return null;
          }
        }
        
        // Function to calculate PNL
        function calculatePNL(entryPrice, currentPrice, amount, type, leverage) {
          entryPrice = parseFloat(entryPrice);
          const profitPerUnit = type === "buy" ? currentPrice - entryPrice : entryPrice - currentPrice;
          return profitPerUnit * amount/entryPrice * leverage; // Total PNL considering leverage
        }
        
        // Function to populate the table with trades
        async function populateTradesTable(trades) {
          const tableBody = document.querySelector("#tradesTable tbody");
          tableBody.innerHTML = ""; // Clear existing rows
        
          for (const trade of trades) {
            const { symbol, amount, entryPrice, date, type, leverage, _id } = trade;
        
            // Create a new table row
            const row = document.createElement("tr");
            row.setAttribute("data-symbol", symbol);
            row.setAttribute("data-entry-price", entryPrice);
            row.setAttribute("data-amount", amount);
            row.setAttribute("data-type", type);
            row.setAttribute("data-leverage", leverage);
        
            row.innerHTML = `
              <td>${symbol}</td>
              <td>${amount}</td>
              <td>${entryPrice}</td>
              <td class="current-price-cell">Loading...</td> <!-- Current Price Column -->
              <td>${date}</td>
              <td>${leverage}x</td>
              <td>${type.charAt(0).toUpperCase() + type.slice(1)}</td>
              <td class="pnl-cell">0</td>
              <td><button class="btn btn-danger btn-sm close-btn" data-id="${_id}">Close Trade</button></td>
            `;
        
            // Append the row to the table body
            tableBody.appendChild(row);
          }
        
          // Update PNLs for the initial population
          updatePNLsAndTotals();
        }
        
        // Function to update the PNLs of all trades in the table
       // Function to update the PNLs of all trades and total margin/PNL
async function updatePNLsAndTotals() {
    const rows = document.querySelectorAll("#tradesTable tbody tr");
  
    let totalMargin = 0;
    let totalPNL = 0;
  
    for (const row of rows) {
      const symbol = row.getAttribute("data-symbol");
      const entryPrice = row.getAttribute("data-entry-price");
      const amount = row.getAttribute("data-amount");
      const type = row.getAttribute("data-type");
      const leverage = row.getAttribute("data-leverage");
  
      // Fetch the current price for the trade's symbol
      const currentPrice = await fetchCurrentPrice(symbol);
  
      // Calculate the PNL
      if (currentPrice !== null) {
        const currentPriceCell = row.querySelector(".current-price-cell");
        currentPriceCell.textContent = currentPrice.toFixed(2);
        const calculatedPNL = calculatePNL(entryPrice, currentPrice, amount, type, leverage);
  
        // Update the PNL cell in the row
        const pnlCell = row.querySelector(".pnl-cell");
        pnlCell.textContent = calculatedPNL.toFixed(2);
  
        // Apply color based on PNL value
        if (calculatedPNL > 0) {
          pnlCell.classList.remove("text-danger"); // Remove red class if present
          pnlCell.classList.add("text-success");  // Add green class for positive PNL
        } else if (calculatedPNL < 0) {
          pnlCell.classList.remove("text-success"); // Remove green class if present
          pnlCell.classList.add("text-danger");    // Add red class for negative PNL
        } else {
          pnlCell.classList.remove("text-success", "text-danger"); // Remove any color for zero PNL
        }
  
        // Add the trade's amount to total margin
        totalMargin += parseFloat(amount);
  
        // Add the calculated PNL to total PNL
        totalPNL += calculatedPNL;
        const totalPNLcell = document.getElementById("totalPNL")
        if (totalPNL > 0) {
            totalPNLcell.classList.remove("text-danger"); // Remove red class if present
            totalPNLcell.classList.add("text-success");  // Add green class for positive PNL
          } else if (totalPNL < 0) {
            totalPNLcell.classList.remove("text-success"); // Remove green class if present
            totalPNLcell.classList.add("text-danger");    // Add red class for negative PNL
          } else {
            totalPNLcell.classList.remove("text-success", "text-danger"); // Remove any color for zero PNL
          }
      }
    }
  
    // Update total margin and total PNL on the frontend
    document.getElementById("totalMargin").textContent = totalMargin.toFixed(2);
    document.getElementById("totalPNL").textContent = totalPNL.toFixed(2);
  }

  async function fetchAndDisplayTrades(userID) {
    try {
      const response = await fetch(`/api/trades/${userID}`); // Replace with your API endpoint
      if (!response.ok) {
        throw new Error("Failed to fetch trades");
      }
      const trades = await response.json();
    await populateTradesTable(trades);

    // Set interval to update PNLs and totals every 15 seconds
    setInterval(updatePNLsAndTotals, 15000);
  } catch (error) {
    console.error("Error fetching trades:", error.message);
  }
}

        function removeCommas(str) {
            return str.replace(/,/g, '');
        }

        function validateAmount() {
            const amountInput = document.getElementById("amount");
            const availableBalance = removeCommas(document.getElementById("availableBalance").textContent);
            const buyButton = document.getElementById("buyButton");
            const sellButton = document.getElementById("sellButton");
            const amountError = document.getElementById("amountError");
            const enteredAmount = parseFloat(amountInput.value);
    
            if (enteredAmount > availableBalance) {
                // Show error message and disable buttons
                amountError.style.display = "block";
                buyButton.disabled = true;
                sellButton.disabled = true;1
            } else {
                // Hide error message and enable buttons
                amountError.style.display = "none";
                buyButton.disabled = false;
                sellButton.disabled = false;
            }
        }

        // Function to handle closing a trade
async function closeTrade(tradeId) {
    try {
      // Send a request to the server to close the trade
      const response = await fetch(`/api/closeTrade/${tradeId}`, {
        method: 'PATCH', // You can use PUT/PATCH depending on your route
        headers: {
          'Content-Type': 'application/json'
        }
      });
  
      // If the request was successful
      if (response.ok) {
        // Remove the trade from the table
        const tradeRow = document.querySelector(`button[data-id="${tradeId}"]`).closest('tr');
        tradeRow.remove();  // Remove the row from the table
        console.log(`Trade with ID ${tradeId} has been closed successfully`);
        window.location.reload();
      } else {
        // Handle the error if something goes wrong
        console.error('Error closing the trade');
      }
    } catch (error) {
      console.error('Error closing the trade:', error);
    }
  }
  
  // Event listener for closing trades when the "Close" button is clicked
  document.querySelector("#tradesTable").addEventListener("click", function(event) {
    if (event.target && event.target.classList.contains("close-btn")) {
      const tradeId = event.target.getAttribute("data-id"); // Get the trade ID from the data-id attribute
      closeTrade(tradeId);  // Close the trade by calling the function
      event.target.textContent = 'Loading...'
    }
  });
  
  function formatNumber(num) {
    if (Number.isInteger(num)) {
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
        return num.toLocaleString('en-US');
    }
}