import Head from 'next/head';
import { useState, useEffect } from 'react';

export default function Home(props) {
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [identity, setIdentity] = useState('monk');
  const [volunteerGroup, setVolunteerGroup] = useState('');
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
    setMessage('報名資料送出中...');

    const formData = {
      userId,
      name,
      organization,
      identity,
      volunteerGroup: identity === 'volunteer' ? volunteerGroup : '',
    };

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      const response = await fetch(`${apiBaseUrl}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMessage('報名成功！感謝您的參與，稍後您將會收到一封來自官方帳號的確認訊息。');
        setIsSuccess(true);
      } else {
        throw new Error(result.message || '發生未知的錯誤');
      }
    } catch (error) {
      setMessage(`報名失敗：${error.message}`);
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="container">
        <h1>報名成功</h1>
        <p>{message}</p>
        <p>您可以關閉此頁面了。</p>
      </div>
    );
  }

  return (
    <div>
      <Head>
        <title>佛齋僧大會報名</title>
      </Head>
      <div className="container">
        <h1>中部全國供佛齋僧大會</h1>
        <h2>LINE 報名系統</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">姓名</label>
            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required disabled={isSubmitting} />
          </div>

          <div className="form-group">
            <label htmlFor="organization">寺廟 / 單位</label>
            <input type="text" id="organization" value={organization} onChange={(e) => setOrganization(e.target.value)} required disabled={isSubmitting} />
          </div>

          <div className="form-group">
            <label>身份</label>
            <div>
              <input type="radio" id="monk" name="identity" value="monk" checked={identity === 'monk'} onChange={(e) => setIdentity(e.target.value)} disabled={isSubmitting} />
              <label htmlFor="monk">法師</label>
            </div>
            <div>
              <input type="radio" id="volunteer" name="identity" value="volunteer" checked={identity === 'volunteer'} onChange={(e) => setIdentity(e.target.value)} disabled={isSubmitting} />
              <label htmlFor="volunteer">義工</label>
            </div>
          </div>

          {identity === 'volunteer' && (
            <div className="form-group">
              <label htmlFor="volunteerGroup">義工組別</label>
              <input type="text" id="volunteerGroup" value={volunteerGroup} onChange={(e) => setVolunteerGroup(e.target.value)} placeholder="例如：交通組、餐飲組" disabled={isSubmitting} />
            </div>
          )}

          <button type="submit" className="button--primary" disabled={isSubmitting}>
            {isSubmitting ? '處理中...' : '送出報名'}
          </button>
        </form>

        {message && <p className="message">{message}</p>}
        {liffError && <p className="error">LIFF Error: {liffError}</p>}
      </div>
    </div>
  );
}
