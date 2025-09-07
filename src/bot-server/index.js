// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios =require('axios');
const line = require('@line/bot-sdk');

const app = express();
const port = process.env.PORT || 3001;

// --- CONFIGURATION ---
const {
  PRETIX_ORGANIZER_SLUG,
  PRETIX_EVENT_SLUG,
  PRETIX_API_KEY,
  PRETIX_ITEM_ID_MONK,
  PRETIX_ITEM_ID_VOLUNTEER,
  LINE_CHANNEL_ACCESS_TOKEN
} = process.env;

const PRETIX_API_URL = `https://pretix.eu/api/v1/organizers/${PRETIX_ORGANIZER_SLUG}/events/${PRETIX_EVENT_SLUG}/orders/`;

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

  const ticketTypeId = identity === 'monk' ? PRETIX_ITEM_ID_MONK : PRETIX_ITEM_ID_VOLUNTEER;

  const orderData = {
    email: `${userId}@line.me`,
    positions: [{ item: ticketTypeId, price: "0.00", attendee_name: name }],
    meta_data: { line_user_id: userId, organization, volunteer_group: volunteerGroup || '' }
  };

  try {
    const pretixResponse = await axios.post(PRETIX_API_URL, orderData, {
      headers: {
        'Authorization': `Token ${PRETIX_API_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    console.log('Pretix API Response:', pretixResponse.data);
    const order = pretixResponse.data;

    const ticketUrl = order.url;
    const confirmationMessage = {
      type: 'text',
      text: `報名成功！\n您的報名編號為：${order.code}\n請點擊以下連結查看您的電子票券(QR Code)，活動當天請憑此報到：\n${ticketUrl}`
    };

    await lineClient.pushMessage(userId, confirmationMessage);
    console.log(`Sent confirmation message to ${userId}`);

    res.status(201).json({
        success: true,
        message: 'Registration successful and confirmation message sent.',
        data: order
    });

  } catch (error) {
    console.error('Error creating Pretix order:', error.response ? error.response.data : error.message);
    res.status(500).json({ success: false, message: 'Failed to create Pretix order.' });
  }
});


app.post('/api/transport', async (req, res) => {
  console.log('Received transport booking data:', req.body);
  const { userId, routeId } = req.body;

  if (!userId || !routeId) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  try {
    // This logic is still placeholder as it's more complex
    console.log(`Simulating adding transport (Route: ${routeId}) for user ${userId}.`);
    const simulatedResponse = { success: true, order_code: 'ABC12' };
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
    // This logic is still placeholder
    console.log(`Simulating cancellation for user ${userId}.`);
    const simulatedResponse = { success: true, status: 'canceled' };

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
