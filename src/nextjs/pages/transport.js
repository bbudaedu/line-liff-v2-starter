import Head from 'next/head';
import { useState, useEffect } from 'react';

const availableRoutes = [
  { id: 'route_a', name: '路線A：台北車站' },
  { id: 'route_b', name: '路線B：台中高鐵站' },
  { id: 'route_c', name: '路線C：高雄左營站' },
];

export default function Transport(props) {
  const [selectedRoute, setSelectedRoute] = useState(availableRoutes[0].id);
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { liff, liffError } = props;

  useEffect(() => {
    if (liff && liff.isLoggedIn()) {
      const context = liff.getContext();
      setUserId(context.userId);
    }
  }, [liff]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || isSuccess) return;

    setIsSubmitting(true);
    setMessage('登記中...');

    const bookingData = { userId, routeId: selectedRoute };

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      const response = await fetch(`${apiBaseUrl}/api/transport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setMessage('交通車登記成功！');
        setIsSuccess(true);
      } else {
        throw new Error(result.message || '發生未知的錯誤');
      }
    } catch (error) {
      setMessage(`登記失敗：${error.message}`);
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="container">
        <h1>登記成功</h1>
        <p>{message}</p>
        <p>您可以關閉此頁面了。</p>
      </div>
    );
  }

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
            <select id="route-select" value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)} disabled={isSubmitting}>
              {availableRoutes.map(route => (
                <option key={route.id} value={route.id}>
                  {route.name}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="button--primary" disabled={isSubmitting}>
            {isSubmitting ? '處理中...' : '登記交通車'}
          </button>
        </form>

        {message && <p className="message">{message}</p>}
        {liffError && <p className="error">LIFF Error: {liffError}</p>}
      </div>
    </div>
  );
}
