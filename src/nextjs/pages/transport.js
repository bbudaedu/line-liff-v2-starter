import Head from 'next/head';
import { useState, useEffect } from 'react';

// Dummy data for available routes. In a real app, this would be fetched from an API.
const availableRoutes = [
  { id: 'route_a', name: '路線A：台北車站' },
  { id: 'route_b', name: '路線B：台中高鐵站' },
  { id: 'route_c', name: '路線C：高雄左營站' },
];

export default function Transport(props) {
  const [selectedRoute, setSelectedRoute] = useState(availableRoutes[0].id);
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState('');
  const { liff, liffError } = props;

  useEffect(() => {
    if (liff && liff.isLoggedIn()) {
      const context = liff.getContext();
      setUserId(context.userId);
    }
  }, [liff]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('登記中...');

    // In the next step, we'll send this to the backend.
    const bookingData = {
      userId,
      routeId: selectedRoute,
    };

    console.log('Booking Data:', bookingData);
    setMessage(`交通車登記成功 (路線ID: ${selectedRoute}) - 此為模擬回應`);

    // Placeholder for API call to backend
    // const response = await fetch('/api/transport', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(bookingData),
    // });
    // const result = await response.json();
    // if (result.success) {
    //   setMessage('交通車登記成功！');
    // } else {
    //   setMessage(`錯誤：${result.message}`);
    // }
  };

  return (
    <div>
      <Head>
        <title>交通車登記</title>
      </Head>
      <div className="container">
        <h1>交通車登記</h1>
        <p>請選擇您的上車地點。</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="route-select">選擇路線</label>
            <select
              id="route-select"
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
            >
              {availableRoutes.map(route => (
                <option key={route.id} value={route.id}>
                  {route.name}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="button--primary">登記交通車</button>
        </form>

        {message && <p className="message">{message}</p>}

        {liffError && (
          <div className="error">
            <p>LIFF 初始化失敗。</p>
            <p><code>{liffError}</code></p>
          </div>
        )}
      </div>
    </div>
  );
}
