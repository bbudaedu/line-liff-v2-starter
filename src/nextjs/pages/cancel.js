import Head from 'next/head';
import { useState, useEffect } from 'react';

export default function Cancel(props) {
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState('');
  const [isCancelled, setIsCancelled] = useState(false);
  const { liff, liffError } = props;

  useEffect(() => {
    if (liff && liff.isLoggedIn()) {
      const context = liff.getContext();
      setUserId(context.userId);
    }
  }, [liff]);

  const handleCancel = async () => {
    if (!window.confirm('您確定要取消您的報名嗎？此操作無法復原。')) {
      return;
    }

    setMessage('處理中...');

    // In the next step, we'll send this to the backend.
    const cancelData = { userId };

    console.log('Cancellation Data:', cancelData);

    // Placeholder for API call to backend
    // const response = await fetch('/api/cancel', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(cancelData),
    // });
    // const result = await response.json();
    // if (result.success) {
    //   setMessage('您的報名已成功取消。');
    //   setIsCancelled(true);
    // } else {
    //   setMessage(`錯誤：${result.message}`);
    // }

    // Simulate success
    setMessage('您的報名已成功取消。');
    setIsCancelled(true);
  };

  return (
    <div>
      <Head>
        <title>取消報名</title>
      </Head>
      <div className="container">
        <h1>取消報名</h1>

        {!isCancelled ? (
          <div>
            <p>請注意，取消報名後，您的票券與交通車登記（如有）將會一併失效。</p>
            <button onClick={handleCancel} className="button--danger">
              確定要取消報名
            </button>
          </div>
        ) : (
          <p>您的取消請求已處理完畢。</p>
        )}

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
