/**
 * Standalone script to send event reminders to all registered attendees.
 *
 * HOW TO RUN:
 * This script is intended to be run on a schedule (e.g., once a day, or the day before the event).
 * You would set up a "cron job" on your server to execute it.
 *
 * Example Cron Job (runs at 8:00 AM every day):
 * 0 8 * * * /usr/bin/node /path/to/your/project/src/bot-server/send-reminders.js
 *
 * Make sure to replace the paths with the correct ones for your environment.
 * You also need to have Node.js installed on the server.
 */

const axios = require('axios');
const line = require('@line/bot-sdk');

// --- CONFIGURATION ---
// These should be stored securely, e.g., in environment variables.
const PRETIX_API_URL = 'https://pretix.eu/api/v1/organizers/{organizer}/events/{event}/orders/';
const PRETIX_API_KEY = 'YOUR_PRETIX_API_KEY';
const LINE_CHANNEL_ACCESS_TOKEN = 'YOUR_LINE_CHANNEL_ACCESS_TOKEN';

// --- LINE SDK CLIENT ---
const lineClient = new line.Client({
  channelAccessToken: LINE_CHANNEL_ACCESS_TOKEN
});

// --- MAIN LOGIC ---

/**
 * Fetches all attendees' LINE User IDs from Pretix.
 * In a real application, this function would handle pagination from the Pretix API.
 */
async function getAllAttendeeIds() {
  console.log('Fetching attendees from Pretix...');
  // In a real scenario, you would make a GET request to the PRETIX_API_URL
  // and loop through the pages of results.
  // const response = await axios.get(PRETIX_API_URL, { headers: { ... } });
  // const orders = response.data.results;
  // const userIds = orders.map(order => order.meta_data.line_user_id).filter(id => id);

  // For this example, we'll use a simulated list of user IDs.
  const simulatedUserIds = [
    'U_USER_ID_1',
    'U_USER_ID_2',
    'U_USER_ID_3',
    // ... up to 500 user IDs per multicast call
  ];
  console.log(`Found ${simulatedUserIds.length} attendees (simulated).`);
  return simulatedUserIds;
}

/**
 * Sends the reminder message to a list of user IDs.
 * @param {string[]} userIds - An array of LINE User IDs.
 */
async function sendReminder(userIds) {
  if (userIds.length === 0) {
    console.log('No users to send reminders to.');
    return;
  }

  console.log(`Sending reminder to ${userIds.length} users...`);

  const reminderMessage = {
    type: 'text',
    text: '【活動提醒】中部全國供佛齋僧大會\n\n明天就是活動日了！提醒您：\n- 時間：上午 8:00 開始報到\n- 地點：[活動地點]\n- 天氣：[天氣預報]\n- 提醒您攜帶：[個人物品]\n\n我們明天見！'
  };

  try {
    // The multicast function can send a message to up to 500 users at once.
    // If you have more, you'll need to batch them.
    await lineClient.multicast(userIds, [reminderMessage]);
    console.log('Successfully sent reminders.');
  } catch (error) {
    console.error('Failed to send reminders:');
    if (error.originalError && error.originalError.response) {
        console.error(JSON.stringify(error.originalError.response.data));
    } else {
        console.error(error.message);
    }
  }
}

// --- EXECUTION ---
async function main() {
  console.log('Starting reminder script...');
  try {
    const userIds = await getAllAttendeeIds();
    // The multicast API has a limit of 500 users per call.
    // For larger lists, you would need to chunk the userIds array into groups of 500.
    const batchSize = 500;
    for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        await sendReminder(batch);
    }
  } catch (error) {
    console.error('An error occurred in the main script execution:', error.message);
  }
  console.log('Reminder script finished.');
}

// Run the main function
main();
