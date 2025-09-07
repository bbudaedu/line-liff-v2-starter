import Head from 'next/head';
import { useState, useEffect } from 'react';

export default function Cancel(props) {
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

  const handleCancel = async () => {
    if (isSubmitting || isSuccess) return;

    if (!window.confirm('您確定要取消您的報名嗎？此操作無法復原。')) {
      return;
    }

    setIsSubmitting(true);
    setMessage('處理中...');

    const cancelData = { userId };

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      const response = await fetch(`${apiBaseUrl}/api/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cancelData),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setMessage('您的報名已成功取消。稍後您將會收到一封來自官方帳號的確認訊息。');
        setIsSuccess(true);
      } else {
        throw new Error(result.message || '發生未知的錯誤');
      }
    } catch (error) {
      setMessage(`處理失敗：${error.message}`);
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Head>
        <title>取消報名</title>
      </Head>
      <div className="container">
        <h1>取消報名</h1>

        {!isSuccess ? (
          <div>
            <p>請注意，取消報名後，您的票券與交通車登記（如有）將會一併失效。</p>
            <button onClick={handleCancel} className="button--danger" disabled={isSubmitting}>
              {isSubmitting ? '處理中...' : '確定要取消報名'}
            </button>
          </div>
        ) : (
          <p>您的取消請求已處理完畢。</p>
        )}

        {message && <p className="message">{message}</p>}
        {liffError && <p className="error">LIFF Error: {liffError}</p>}
      </div>
    </div>
  );
}
