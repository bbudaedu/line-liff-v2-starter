const express = require('express');
const cors = require('cors');
const axios = require('axios');
const line = require('@line/bot-sdk');

const app = express();
const port = process.env.PORT || 3001;

// --- CONFIGURATION ---
// These values will need to be securely stored, e.g., in environment variables.
// The user will need to provide these.
const PRETIX_API_URL = 'https://pretix.eu/api/v1/organizers/{organizer}/events/{event}/orders/'; // Placeholder URL
const PRETIX_API_KEY = 'YOUR_PRETIX_API_KEY'; // Placeholder API Key
const LINE_CHANNEL_ACCESS_TOKEN = 'YOUR_LINE_CHANNEL_ACCESS_TOKEN'; // Placeholder Token

// --- LINE SDK CLIENT ---
const lineClient = new line.Client({
  channelAccessToken: LINE_CHANNEL_ACCESS_TOKEN
});

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());


// --- ROUTES ---
app.get('/', (req, res) => {
  res.send('Hello from the Bot Server!');
});

app.post('/api/register', async (req, res) => {
  console.log('Received registration data:', req.body);
  const { userId, name, organization, identity, volunteerGroup } = req.body;

  if (!userId || !name || !organization || !identity) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  // TODO: The user needs to provide the correct item IDs for "僧眾席" and "義工"
  const ticketTypeId = identity === 'monk' ? 'TICKET_TYPE_MONK' : 'TICKET_TYPE_VOLUNTEER';

  const orderData = {
    email: `${userId}@line.me`,
    positions: [{ item: ticketTypeId, price: "0.00", attendee_name: name }],
    meta_data: { line_user_id: userId, organization, volunteer_group: volunteerGroup || '' }
  };

  try {
    // This part is currently a placeholder.
    // const pretixResponse = await axios.post(PRETIX_API_URL, orderData, { ... });
    const simulatedPretixResponse = {
        data: {
            code: 'ABC12',
            status: 'p', // pending
            url: 'https://pretix.eu/demo/demoevent/order/ABC12/' // Simulated ticket URL
        }
    };
    console.log('Pretix order created (simulated):', simulatedPretixResponse.data.code);

    // --- Send LINE Confirmation Message ---
    const ticketUrl = simulatedPretixResponse.data.url;
    const confirmationMessage = {
      type: 'text',
      text: `報名成功！\n您的報名編號為：${simulatedPretixResponse.data.code}\n請點擊以下連結查看您的電子票券(QR Code)，活動當天請憑此報到：\n${ticketUrl}`
    };

    await lineClient.pushMessage(userId, confirmationMessage);
    console.log(`Sent confirmation message to ${userId}`);

    res.status(201).json({
        success: true,
        message: 'Registration successful and confirmation message sent.',
        data: simulatedPretixResponse.data
    });

  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error('Error in registration process:', errorMessage);
    if (error.originalError && error.originalError.response) { // From LINE SDK
        console.error('LINE API Error:', JSON.stringify(error.originalError.response.data));
    }
    res.status(500).json({ success: false, message: 'An error occurred during registration.' });
  }
});


app.post('/api/transport', async (req, res) => {
  console.log('Received transport booking data:', req.body);
  const { userId, routeId } = req.body;

  if (!userId || !routeId) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  try {
    // --- Pretix Logic (Placeholder) ---
    // To implement this, we would need to:
    // 1. Find the user's order code. This likely requires a GET request to the Pretix orders endpoint,
    //    filtering by the `meta_data.line_user_id` which we stored during registration.
    //    e.g., GET /api/v1/organizers/{org}/events/{ev}/orders/?meta_data__line_user_id={userId}
    // 2. Once we have the order code (e.g., 'ABC12'), we need to modify the order.
    //    This usually involves adding a new position to the order with the transportation add-on product ID.
    //    e.g., POST /api/v1/organizers/{org}/events/{ev}/orders/{code}/positions/
    // 3. The specific product ID for the selected route would need to be mapped here.

    console.log(`Simulating adding transport (Route: ${routeId}) for user ${userId}.`);

    // Simulate success
    const simulatedResponse = { success: true, order_code: 'ABC12' };

    // You could also send a LINE message here to confirm the transport booking.

    res.status(200).json({
      success: true,
      message: 'Transportation booking successful (simulated).',
      data: simulatedResponse
    });

  } catch (error) {
    console.error('Error in transport booking process:', error.message);
    res.status(500).json({ success: false, message: 'An error occurred during transport booking.' });
  }
});


app.post('/api/cancel', async (req, res) => {
  console.log('Received cancellation request for user:', req.body.userId);
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, message: 'User ID is required.' });
  }

  try {
    // --- Pretix Logic (Placeholder) ---
    // 1. Find the user's order code by searching for their line_user_id in the order metadata.
    //    e.g., GET /api/v1/organizers/{org}/events/{ev}/orders/?meta_data__line_user_id={userId}
    // 2. Assuming one order is found, get its code (e.g., 'ABC12').
    // 3. Make a POST request to the order's cancel endpoint.
    //    e.g., POST /api/v1/organizers/{org}/events/{ev}/orders/{code}/cancel/

    console.log(`Simulating cancellation for user ${userId}.`);
    const simulatedResponse = { success: true, status: 'canceled' };

    // --- Send LINE Confirmation Message ---
    const confirmationMessage = {
      type: 'text',
      text: `您的報名已確認取消。如果您有任何問題，請隨時與我們聯繫。`
    };
    await lineClient.pushMessage(userId, confirmationMessage);
    console.log(`Sent cancellation confirmation to ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Cancellation successful (simulated).',
      data: simulatedResponse
    });

  } catch (error) {
    console.error('Error in cancellation process:', error.message);
    res.status(500).json({ success: false, message: 'An error occurred during cancellation.' });
  }
});


// --- SERVER START ---
app.listen(port, () => {
  console.log(`Bot server listening at http://localhost:${port}`);
});
