import Head from 'next/head';
import { useState, useEffect } from 'react';

export default function Home(props) {
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [identity, setIdentity] = useState('monk'); // 'monk' or 'volunteer'
  const [volunteerGroup, setVolunteerGroup] = useState('');
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
    setMessage('處理中...');

    // In a future step, we will send this data to our bot server.
    const formData = {
      userId,
      name,
      organization,
      identity,
      volunteerGroup: identity === 'volunteer' ? volunteerGroup : '',
    };

    // For now, just display the data.
    console.log('Form Data:', formData);
    setMessage(`報名資料已記錄 (使用者ID: ${userId})`);
  };

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
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="organization">寺廟 / 單位</label>
            <input
              type="text"
              id="organization"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>身份</label>
            <div>
              <input
                type="radio"
                id="monk"
                name="identity"
                value="monk"
                checked={identity === 'monk'}
                onChange={(e) => setIdentity(e.target.value)}
              />
              <label htmlFor="monk">法師</label>
            </div>
            <div>
              <input
                type="radio"
                id="volunteer"
                name="identity"
                value="volunteer"
                checked={identity === 'volunteer'}
                onChange={(e) => setIdentity(e.target.value)}
              />
              <label htmlFor="volunteer">義工</label>
            </div>
          </div>

          {identity === 'volunteer' && (
            <div className="form-group">
              <label htmlFor="volunteerGroup">義工組別</label>
              <input
                type="text"
                id="volunteerGroup"
                value={volunteerGroup}
                placeholder="例如：交通組、餐飲組"
                onChange={(e) => setVolunteerGroup(e.target.value)}
              />
            </div>
          )}

          <button type="submit" className="button--primary">送出報名</button>
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
